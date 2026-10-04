"""The state a WebSocket message handler works with."""
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class WSContext:
    """One socket's state plus the message being handled.

    game_id, db, circle, camp_code and camp_id are set once when the socket
    connects and are not refreshed while it stays open: db is the one session the
    socket uses for its whole life, and circle is the circle loaded at connect
    time. user_id is the user the login token named, is_gm is True on a campaign
    channel (only its GM may open one), and own_char_id is the character of a
    player channel (None on a GM channel). payload, character and target_char_id
    are set for every message. character is the row for target_char_id
    (payload.character_id, or the player channel's own character), or None.
    """
    game_id: str
    db: Any
    circle: Any
    camp_code: str
    camp_id: Optional[int]
    user_id: Optional[int] = None
    is_gm: bool = False
    own_char_id: Optional[int] = None
    payload: Any = None
    character: Any = None
    target_char_id: Any = None
