"""In-memory registry of open WebSockets, keyed by channel.

A character channel's key is the character id as a string (character_key). A
campaign (GM) channel's key is "campaign:" followed by the campaign code
(campaign_key). Campaign codes cannot contain a colon, so the two kinds never share
a key, even for an all-digit code that equals a character id (QUIRK D13 used to let
one user take over the other's channel that way).

There is one module-level instance, manager. It only works with a single worker
process, which is how candela.service runs uvicorn.

Each socket also remembers the user whose login token opened it (connect's user_id,
kept in the socket's state), so that close_user can end every socket of a user whose
password has just changed.
"""
from typing import List, Optional

from fastapi import WebSocket

from models import Character

CAMPAIGN_KEY_PREFIX = "campaign:"
# The close code for a socket whose login token no longer works (the same code the
# endpoint refuses such a token with; the browser then logs the user out).
CLOSE_TOKEN_ENDED = 4401


def character_key(character_id) -> str:
    """The channel key of a character's socket."""
    return str(character_id)


def campaign_key(campaign_code: str) -> str:
    """The channel key of a campaign's GM socket."""
    return CAMPAIGN_KEY_PREFIX + campaign_code


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, key: str, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        if user_id is not None:
            websocket.state.candela_user_id = user_id
        for old_conn in self.active_connections.get(key, []):
            try:
                await old_conn.close(code=1001)
            except Exception:
                pass
        self.active_connections[key] = [websocket]

    @staticmethod
    def user_of(websocket) -> Optional[int]:
        """The user whose token opened this socket, or None when connect was not told."""
        state = getattr(websocket, "state", None)
        return getattr(state, "candela_user_id", None) if state is not None else None

    async def close_user(self, user_id: int, code: int = CLOSE_TOKEN_ENDED) -> int:
        """Closes every open socket of the user with code (4401: the token it was opened
        with no longer works) and forgets them, wherever they are. Called when the
        user's password changes (a reset, or Sign in with Google replacing it), which
        ends every earlier login token; a socket only checks its token when it
        connects, so it would otherwise stay open. Returns how many it closed."""
        closed = 0
        for key, connections in list(self.active_connections.items()):
            theirs = [c for c in connections if self.user_of(c) == user_id]
            if not theirs:
                continue
            self.active_connections[key] = [c for c in connections if not any(c is t for t in theirs)]
            for conn in theirs:
                try:
                    await conn.close(code=code)
                except Exception:
                    pass
                closed += 1
        return closed

    def disconnect(self, key: str, websocket: WebSocket):
        if key in self.active_connections:
            try:
                self.active_connections[key].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, key: str, message: dict):
        if key not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[key]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            try:
                self.active_connections[key].remove(conn)
            except ValueError:
                pass

    async def broadcast_all(self, message: dict):
        dead = []
        for gid, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append((gid, connection))
        for gid, conn in dead:
            try:
                self.active_connections[gid].remove(conn)
            except ValueError:
                pass

    async def broadcast_campaign(self, campaign_code: str, campaign_id, message: dict, db):
        """Broadcast to the campaign's GM channel and its active members' channels.

        Without a campaign_id, campaign_code is taken as a channel key and only that
        channel gets the message. A WebSocket with no campaign passes its own key
        here (WSContext.camp_code), so its campaign messages come back to itself."""
        if not campaign_id:
            await self.broadcast(campaign_code, message)
            return
        chars = db.query(Character).filter(
            Character.campaign_id == campaign_id,
            Character.status == "active",
        ).all()
        ids = {campaign_key(campaign_code)}
        for c in chars:
            ids.add(character_key(c.id))
        for gid in ids:
            await self.broadcast(gid, message)

manager = ConnectionManager()
