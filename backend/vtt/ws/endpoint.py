"""The /ws/{game_id} endpoint: connection setup and the message loop.

A numeric game_id is a character's channel, anything else a campaign code (the GM
channel). The browser sends its login token as the query parameter "token", because
it cannot set headers on a WebSocket. Without a valid token the socket is closed
with 4401 before any message is read; a channel the user may not open is closed
with 4403, and an unknown one with 4404 (see vtt.ws.access). The token is never
logged.

Each message is passed to its handler from vtt.ws.handlers.HANDLERS after the
access checks in vtt.ws.access; a rejected message gets an action_rejected frame
back and nothing else happens. See docs/refactor/WEBSOCKET.md for every message
type and docs/refactor/AUTH.md for who may send it.

The token's password stamp is checked again before every message that names a
handler: once the user's password has changed (a reset, Sign in with Google replacing
it, a hash set in the database), the socket is closed with 4401 and the message is not
handled. The routes that change a password also close the user's sockets at once
(manager.close_user), so a socket that only listens ends too.

An exception from a handler (other than inside roll, which catches its own) leaves
the loop, is logged as "WebSocket fatal error" and ends the connection.
"""
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models import Character, Circle
from vtt import db as _db
from vtt.auth import MEMBER_STATUSES, stamp_still_valid, user_for_token
from vtt.security import password_stamp
from vtt.circle_queries import get_or_create_campaign_circle
from vtt.config import logger
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.access import CLOSE_UNAUTHENTICATED, Rejected, check_message, check_target, resolve_channel
from vtt.ws.context import WSContext
from vtt.ws.handlers import HANDLERS
from vtt.ws.manager import campaign_key, character_key, manager

router = APIRouter()


async def _reject(websocket: WebSocket, action: str, status: int, detail: str):
    await websocket.send_json({"type": "action_rejected", "payload": {
        "action": action, "status": status, "detail": detail}})


async def _refuse(websocket: WebSocket, game_id: str, code: int):
    logger.info("WebSocket refused: game_id=%s code=%s", game_id, code)
    await websocket.accept()
    await websocket.close(code=code)


@router.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    db = _db.SessionLocal()
    try:
        user = user_for_token(db, websocket.query_params.get("token"))
        if user is None:
            await _refuse(websocket, game_id, CLOSE_UNAUTHENTICATED)
            return
        channel = resolve_channel(db, user.id, game_id)
        if isinstance(channel, int):
            await _refuse(websocket, game_id, channel)
            return
        # The stamp the token carries (user_for_token checked that it matches).
        await _serve(websocket, db, game_id, user.id, password_stamp(user.hashed_password), *channel)
    finally:
        db.close()


def _shared_circle(db):
    """Circle 1, the legacy circle shared by every character without a campaign
    (created again if it is missing)."""
    circle = db.query(Circle).filter(Circle.id == 1).first()
    if not circle:
        circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
        db.add(circle)
        db.commit()
    return circle


async def _serve(websocket: WebSocket, db, game_id: str, user_id: int, stamp: str, character, campaign,
                 is_gm: bool):
    logger.info("WebSocket connected: game_id=%s user_id=%s", game_id, user_id)
    own_char_id = character.id if character is not None else None
    # The manager key: a character channel and a campaign channel never share one,
    # even when an all-digit campaign code equals a character id (QUIRK D13).
    channel = character_key(own_char_id) if character is not None else campaign_key(campaign.campaign_code)
    await manager.connect(channel, websocket, user_id=user_id)

    # Load this campaign's circle (create one if this campaign has none yet)
    circle = None
    if campaign:
        circle = get_or_create_campaign_circle(db, campaign.id)
    if not circle:
        circle = _shared_circle(db)

    # Camp context for this connection. It is fixed for the life of the socket, not re-resolved per message.
    # Without a campaign, camp_code is the socket's own channel key, so broadcast_campaign
    # sends campaign messages back to this socket only.
    camp_code = campaign.campaign_code if campaign else channel
    camp_id = campaign.id if campaign else None

    # A pending or retired character's socket keeps its campaign (an approval while
    # connected makes it a member at once), but only the GM and members see the
    # campaign's circle. The others get the shared circle 1, like an unaffiliated one.
    shown_circle = circle
    if character is not None and campaign is not None and character.status not in MEMBER_STATUSES:
        shown_circle = _shared_circle(db)

    if character:
        await websocket.send_json({"type": "character_update", "payload": get_char_dict(character)})
    await websocket.send_json({"type": "circle_update", "payload": get_circle_dict(shown_circle)})

    ctx = WSContext(game_id=game_id, db=db, circle=circle, camp_code=camp_code, camp_id=camp_id,
                    user_id=user_id, is_gm=is_gm, own_char_id=own_char_id, channel=channel)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue
            # Valid JSON that is not an object names no action, so it is ignored like
            # invalid JSON. It used to raise here and end the connection.
            if not isinstance(message, dict):
                continue
            action = message.get("type")
            payload = message.get("payload")
            if payload is None:
                payload = {}
            if not isinstance(payload, dict):
                if isinstance(action, str) and action in HANDLERS:
                    await _reject(websocket, action, 422, "The payload must be an object.")
                continue

            # The character this message acts on: payload.character_id, else the
            # player channel's own character (a GM channel has none).
            target_char_id = payload.get("character_id")
            named_in_payload = target_char_id is not None
            if target_char_id is None:
                target_char_id = own_char_id

            try:
                character = db.query(Character).filter(Character.id == target_char_id).first() if target_char_id else None

                # camp_id and camp_code are resolved once at connection time and reused — characters
                # do not change campaigns mid-session, so no re-query is needed per message.
            except Exception as exc:
                logger.error("WS context resolution error: action=%s error=%s", action, exc)
                db.rollback()
                continue

            # Only string types can match a handler; any other value was never handled.
            entry = HANDLERS.get(action) if isinstance(action, str) else None
            if entry is None:
                continue
            handler, needs_character = entry
            # The token this socket was opened with ends when the password changes.
            try:
                token_still_good = stamp_still_valid(db, user_id, stamp)
            except Exception as exc:
                logger.error("WS token check error: action=%s error=%s", action, exc)
                db.rollback()
                continue
            if not token_still_good:
                logger.info("WebSocket closed, the login token no longer works: game_id=%s user_id=%s",
                            game_id, user_id)
                manager.disconnect(channel, websocket)
                await websocket.close(code=CLOSE_UNAUTHENTICATED)
                return
            try:
                check_target(ctx, action, character, named_in_payload)
                if needs_character and not character:
                    continue
                check_message(ctx, action, payload, character)
            except Rejected as rejected:
                await _reject(websocket, action, rejected.status, rejected.detail)
                continue
            ctx.payload = payload
            ctx.character = character
            ctx.target_char_id = target_char_id
            await handler(ctx)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: game_id=%s", game_id)
        manager.disconnect(channel, websocket)
    except Exception as exc:
        logger.error("WebSocket fatal error: game_id=%s error=%s", game_id, exc, exc_info=True)
        manager.disconnect(channel, websocket)
