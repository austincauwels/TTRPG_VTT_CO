"""In-memory registry of open WebSockets, keyed by channel (a character id or a campaign code).

There is one module-level instance, manager. It only works with a single worker
process, which is how candela.service runs uvicorn.
"""
from typing import List

from fastapi import WebSocket

from models import Character


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        for old_conn in self.active_connections.get(game_id, []):
            try:
                await old_conn.close(code=1001)
            except Exception:
                pass
        self.active_connections[game_id] = [websocket]

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_connections:
            try:
                self.active_connections[game_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[game_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            try:
                self.active_connections[game_id].remove(conn)
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
        """Broadcast to all active connections belonging to a campaign.
        Falls back to broadcasting only to campaign_code if campaign_id is unknown."""
        if not campaign_id:
            await self.broadcast(campaign_code, message)
            return
        chars = db.query(Character).filter(
            Character.campaign_id == campaign_id,
            Character.status == "active",
        ).all()
        ids = {campaign_code}
        for c in chars:
            ids.add(str(c.id))
        for gid in ids:
            await self.broadcast(gid, message)

manager = ConnectionManager()
