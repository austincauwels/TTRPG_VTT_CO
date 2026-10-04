"""In-memory registry of open WebSockets, keyed by channel.

A character channel's key is the character id as a string (character_key). A
campaign (GM) channel's key is "campaign:" followed by the campaign code
(campaign_key). Campaign codes cannot contain a colon, so the two kinds never share
a key, even for an all-digit code that equals a character id (QUIRK D13 used to let
one user take over the other's channel that way).

There is one module-level instance, manager. It only works with a single worker
process, which is how candela.service runs uvicorn.
"""
from typing import List

from fastapi import WebSocket

from models import Character


CAMPAIGN_KEY_PREFIX = "campaign:"


def character_key(character_id) -> str:
    """The channel key of a character's socket."""
    return str(character_id)


def campaign_key(campaign_code: str) -> str:
    """The channel key of a campaign's GM socket."""
    return CAMPAIGN_KEY_PREFIX + campaign_code


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, key: str, websocket: WebSocket):
        await websocket.accept()
        for old_conn in self.active_connections.get(key, []):
            try:
                await old_conn.close(code=1001)
            except Exception:
                pass
        self.active_connections[key] = [websocket]

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
