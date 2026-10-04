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

Closing a socket the manager lets go of (replaced, or its user's password changed)
never holds anything up: the close runs on its own (close_later). Closing waits for the
other end to answer, and a socket whose other end went away without a word, which is
what a phone that slept or changed networks leaves behind until the pings time out,
never answers: the wait lasts uvicorn's close timeout, 10 seconds. connect used to wait
for that before it registered the new socket, so the new socket was deaf for those 10
seconds, and a second socket opened meanwhile was registered first and then pushed
out by the first one when its wait ended: the channel's messages (a roll's result
among them) went to a socket nobody listened on (beta, 2026-10-04).
"""
import asyncio
import json
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


def encode(message: dict) -> str:
    """A message as the text frame WebSocket.send_json would send (the same JSON
    settings), so that a broadcast serializes it once, not once per socket."""
    return json.dumps(message, separators=(",", ":"), ensure_ascii=False)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}
        # Sockets are numbered in the order they arrive at connect, so that the last
        # to arrive keeps its channel even when an earlier accept finishes later.
        self._arrivals = 0
        # Closes running on their own (close_later), kept so they are not collected
        self._closing: set = set()

    async def connect(self, key: str, websocket: WebSocket, user_id: Optional[int] = None) -> bool:
        """Accepts the socket and makes it the channel's only one: the last connection
        wins, and the sockets it replaces are closed with 1001 without waiting. Returns
        False, after closing it with 1001, for a socket that a newer one on the channel
        overtook while it was being accepted (its caller must not serve it)."""
        self._arrivals += 1
        number = self._arrivals
        websocket.state.candela_arrival = number
        await websocket.accept()
        if user_id is not None:
            websocket.state.candela_user_id = user_id
        current = self.active_connections.get(key, [])
        if any(self._arrival_of(c) > number for c in current):
            await self._close_quietly(websocket, 1001)
            return False
        # Registered before anything else is awaited, so no other connect can come between
        self.active_connections[key] = [websocket]
        for old_conn in current:
            if old_conn is not websocket:
                self.close_later(old_conn, 1001)
        return True

    @staticmethod
    def _arrival_of(websocket) -> int:
        state = getattr(websocket, "state", None)
        return getattr(state, "candela_arrival", 0) if state is not None else 0

    @staticmethod
    async def _close_quietly(websocket, code: int):
        try:
            await websocket.close(code=code)
        except Exception:
            pass

    def close_later(self, websocket, code: int):
        """Closes the socket with code on its own, without waiting for the other end to
        answer (see the module docstring). Must be called on the server's event loop."""
        task = asyncio.get_running_loop().create_task(self._close_quietly(websocket, code))
        self._closing.add(task)
        task.add_done_callback(self._closing.discard)

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
        connects, so it would otherwise stay open. Returns how many it closed. The
        closes run on their own, so a stale socket does not hold up the route."""
        closed = 0
        for key, connections in list(self.active_connections.items()):
            theirs = [c for c in connections if self.user_of(c) == user_id]
            if not theirs:
                continue
            self.active_connections[key] = [c for c in connections if not any(c is t for t in theirs)]
            for conn in theirs:
                self.close_later(conn, code)
                closed += 1
        return closed

    def close_channel(self, key: str, code: int) -> int:
        """Closes every socket on the channel with code and forgets them. Used when what
        the channel belongs to is deleted (a character, or a campaign for its GM's
        channel). Returns how many it closed. Like close_user, the closes run on their own."""
        connections = self.active_connections.pop(key, [])
        for conn in connections:
            self.close_later(conn, code)
        return len(connections)

    def disconnect(self, key: str, websocket: WebSocket):
        if key in self.active_connections:
            try:
                self.active_connections[key].remove(websocket)
            except ValueError:
                pass

    async def _send_text(self, key: str, text: str):
        """Sends an already serialized message to every socket on the key, and drops
        the sockets that fail."""
        if key not in self.active_connections:
            return
        dead = []
        for connection in list(self.active_connections[key]):
            try:
                await connection.send_text(text)
            except Exception:
                dead.append(connection)
        for conn in dead:
            try:
                self.active_connections[key].remove(conn)
            except ValueError:
                pass

    async def broadcast(self, key: str, message: dict):
        if key not in self.active_connections:
            return
        await self._send_text(key, encode(message))

    async def broadcast_users(self, user_ids, message: dict) -> int:
        """Sends the message to every open socket of these users, whatever channel it is
        on (the user each socket was opened by, as for close_user). Used when something
        changes a user's own lists, such as a campaign restored, rather than one
        channel. Returns how many sockets it reached."""
        wanted = {u for u in user_ids if u is not None}
        if not wanted:
            return 0
        text = encode(message)
        sent = 0
        for key, connections in list(self.active_connections.items()):
            dead = []
            for conn in list(connections):
                if self.user_of(conn) not in wanted:
                    continue
                try:
                    await conn.send_text(text)
                    sent += 1
                except Exception:
                    dead.append(conn)
            for conn in dead:
                self.disconnect(key, conn)
        return sent

    async def broadcast_all(self, message: dict):
        text = encode(message)
        for key in list(self.active_connections):
            await self._send_text(key, text)

    async def broadcast_campaign(self, campaign_code: str, campaign_id, message: dict, db,
                                 exclude: Optional[str] = None):
        """Broadcast to the campaign's GM channel and its active members' channels,
        except the channel key exclude (the sender's, for a message it has had its own
        way).

        Without a campaign_id, campaign_code is taken as a channel key and only that
        channel gets the message. A WebSocket with no campaign passes its own key
        here (WSContext.camp_code), so its campaign messages come back to itself.

        The members are read as ids only (a full Character row carries its
        portrait), and the message is serialized once for every socket."""
        if not campaign_id:
            if campaign_code != exclude:
                await self.broadcast(campaign_code, message)
            return
        member_ids = db.query(Character.id).filter(
            Character.campaign_id == campaign_id,
            Character.status == "active",
        ).all()
        keys = {campaign_key(campaign_code)} | {character_key(row.id) for row in member_ids}
        keys.discard(exclude)
        text = encode(message)
        for key in keys:
            await self._send_text(key, text)

manager = ConnectionManager()
