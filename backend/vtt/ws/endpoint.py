"""The /ws/{game_id} endpoint: connection setup and the message loop.

A numeric game_id is a character's channel, anything else a campaign code (the GM
channel). Each message is passed to its handler from vtt.ws.handlers.HANDLERS. See
docs/refactor/WEBSOCKET.md for every message type.

An exception from a handler (other than inside roll, which catches its own) leaves
the loop, is logged as "WebSocket fatal error" and ends the connection.
"""
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models import Campaign, Character, Circle
from vtt import db as _db
from vtt.circle_queries import get_or_create_campaign_circle
from vtt.config import logger
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.context import WSContext
from vtt.ws.handlers import HANDLERS
from vtt.ws.manager import manager

router = APIRouter()

@router.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    logger.info("WebSocket connected: game_id=%s", game_id)
    await manager.connect(game_id, websocket)
    db = _db.SessionLocal()

    # Resolve character from game_id (numeric = character id, string = GM campaign code)
    character = None
    try:
        parsed_char_id = int(game_id)
        character = db.query(Character).filter(Character.id == parsed_char_id).first()
    except ValueError:
        pass  # GM connection via campaign code

    # Resolve the campaign for this connection
    campaign = None
    if character and character.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == character.campaign_id).first()
    if campaign is None:
        campaign = db.query(Campaign).filter(Campaign.campaign_code == game_id).first()

    # Load this campaign's circle (create one if this campaign has none yet)
    circle = None
    if campaign:
        circle = get_or_create_campaign_circle(db, campaign.id)
    if not circle:
        circle = db.query(Circle).filter(Circle.id == 1).first()
    if not circle:
        circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
        db.add(circle)
        db.commit()

    # Camp context for this connection. It is fixed for the life of the socket, not re-resolved per message.
    camp_code = campaign.campaign_code if campaign else game_id
    camp_id = campaign.id if campaign else None

    if character:
        await websocket.send_json({"type": "character_update", "payload": get_char_dict(character)})
    await websocket.send_json({"type": "circle_update", "payload": get_circle_dict(circle)})

    ctx = WSContext(game_id=game_id, db=db, circle=circle, camp_code=camp_code, camp_id=camp_id)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue
            action = message.get("type")
            payload = message.get("payload", {})

            target_char_id = payload.get("character_id")
            if target_char_id is None:
                try: target_char_id = int(game_id)
                except ValueError: target_char_id = None

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
            if needs_character and not character:
                continue
            ctx.payload = payload
            ctx.character = character
            ctx.target_char_id = target_char_id
            await handler(ctx)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: game_id=%s", game_id)
        manager.disconnect(game_id, websocket)
    except Exception as exc:
        logger.error("WebSocket fatal error: game_id=%s error=%s", game_id, exc, exc_info=True)
        manager.disconnect(game_id, websocket)
    finally:
        db.close()
