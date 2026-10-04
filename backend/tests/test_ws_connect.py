"""/ws/{game_id}: connecting, channel naming, the connection manager, malformed frames."""
import asyncio
import json

import pytest

import main
import support
from models import Character, Circle


def test_player_socket_gets_character_then_circle(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    assert support.campaign_circle(camp["id"]) is None
    with support.ws_connect(client, ch["id"]) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        char = ws.initial[0]["payload"]
        assert set(char) == support.CHAR_DICT_KEYS
        assert char["id"] == ch["id"]
        assert char["status"] == "active"
        circle = ws.initial[1]["payload"]
        assert set(circle) == support.CIRCLE_DICT_KEYS
        created = support.campaign_circle(camp["id"])
        assert created is not None  # connecting created the campaign circle
        assert circle["id"] == created.id
        assert circle["name"] == "Unnamed Circle"
        assert support.server_sockets(ch["id"])
    assert support.wait_server_dropped(ch["id"])


def test_gm_socket_by_campaign_code(client):
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as ws:
        assert support.types(ws.initial) == ["circle_update"]
        assert ws.initial[0]["payload"]["id"] == support.campaign_circle(camp["id"]).id


def test_unaffiliated_character_falls_back_to_circle_one(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert ws.initial[1]["payload"]["id"] == 1
        assert ws.initial[1]["payload"]["name"] == "The Order of Light"


def test_unknown_numeric_and_text_keys_get_circle_one(client):
    for key in ("987654321", f"nothing-{support.uid()}"):
        with support.ws_connect(client, key) as ws:
            assert support.types(ws.initial) == ["circle_update"]
            assert ws.initial[0]["payload"]["id"] == 1


def test_last_connection_wins(client):
    ch = support.forge(client)
    key = str(ch["id"])
    with support.ws_connect(client, key, wait_disconnect=False) as first:
        with support.ws_connect(client, key) as second:
            with pytest.raises(support.Closed) as closed:
                first.recv()
            assert closed.value.code == 1001
            assert len(support.server_sockets(key)) == 1
            second.send("update_drive", pool="nerve", value=0)
            assert second.recv()["type"] == "character_update"


@pytest.mark.legacy_trust
def test_anyone_can_open_any_characters_channel(client):
    """The path segment is the whole identity: no login is needed to act as a character."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, user_id=support.make_user().id)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_drive", pool="nerve", value=0)
        assert ws.recv()["payload"]["nerve_current"] == 0


@pytest.mark.legacy_trust
def test_anyone_can_open_a_gm_channel(client):
    camp = support.new_campaign(client, gm_user_id=support.make_user().id)
    with support.ws_connect(client, camp["campaign_code"]) as ws:
        ws.send("gm_toggle_reports", role="GM")
        assert ws.recv()["payload"]["reports_open"] is True


def test_numeric_campaign_code_shares_a_character_channel(client):
    """QUIRK: a campaign whose code equals a character id makes that character's
    socket resolve to the campaign (when the character has none of its own)."""
    # Codes need 3+ characters, so give the character a large explicit id
    # (far above anything the sequence hands out during a test run).
    char_id = 900_000_000 + int(support.uid(6), 16) % 90_000_000
    with main.SessionLocal() as s:
        s.add(Character(id=char_id, name=f"Num {support.uid()}", user_id=1, circle_id=1))
        s.commit()
    camp = support.new_campaign(client, code=str(char_id))
    with support.ws_connect(client, char_id) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert ws.initial[1]["payload"]["id"] == support.campaign_circle(camp["id"]).id


def test_bad_json_and_unknown_types_are_ignored(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text("{not json")
        ws.send("no_such_action", x=1)
        ws.send_text(json.dumps({"payload": {}}))
        assert ws.sync() == []


def test_frame_without_payload_works(client):
    ch = support.forge(client, body_marks=2, bleed_marks=1, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(json.dumps({"type": "revive_character"}))
        msg = ws.recv()
        assert msg["type"] == "character_update"
        p = msg["payload"]
        assert (p["id"], p["body_marks"], p["bleed_marks"], p["incapacitated"]) == (ch["id"], 0, 0, False)
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.bleed_marks, row.incapacitated) == (0, 0, False)


@pytest.mark.parametrize("frame", ['[1, 2]', '"text"', '{"type": "update_drive", "payload": [1]}'])
def test_non_object_frame_closes_the_connection(client, frame):
    """QUIRK: frames that are valid JSON but not objects raise outside any handler
    and end the connection without a close frame."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(frame)
        assert support.wait_server_dropped(ch["id"])


def test_disconnect_removes_socket_but_keeps_key(client):
    ch = support.forge(client)
    key = str(ch["id"])
    with support.ws_connect(client, key):
        assert len(support.server_sockets(key)) == 1
    assert support.wait_server_dropped(key)
    assert key in main.manager.active_connections  # the empty list stays


def test_connect_with_campaign_that_has_circle_reuses_it(client):
    camp = support.new_campaign(client)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]
    with support.ws_connect(client, camp["campaign_code"]) as ws:
        assert ws.initial[0]["payload"]["id"] == cid
    assert len(support.fetch_all(Circle, campaign_id=camp["id"])) == 1


# --- dispatcher: actions that need a character, sent on a GM code socket --------

NEEDS_CHARACTER = [
    ("update_drive", dict(pool="nerve", value=2)),
    ("resolve_gilded", dict(action="move", chosen_type="gilded", chosen_value=3)),
    ("use_post_roll_ability", dict(ability="Flourish")),
    ("update_pen_font", dict(pen_font="Kalam")),
    ("take_mark", dict(mark_type="body")),
    ("resolve_ability_mark", dict(ability="Adrenaline Rush", choice="nerve")),
    ("intercept_mark", dict(ability="Behind Me", target_character_id=987654321, mark_type="body")),
    ("apply_scar", dict(scar_text="x", shift_down="move", shift_up="sense")),
    ("revive_character", dict()),
    ("burn_resistance", dict(action="move", drive_key="nerve")),
    ("update_gear", dict(gear=["lamp"])),
    ("spend_resource", dict(resource_type="stitch")),
    ("apply_advancement", dict(choice="add_action", detail="move")),
    ("gm_update_tension", dict(role="GM", mark_type="body", value=1)),
]


@pytest.mark.parametrize("action,payload", NEEDS_CHARACTER, ids=[a for a, _ in NEEDS_CHARACTER])
def test_character_actions_on_a_gm_socket_are_ignored(client, action, payload):
    """A campaign-code socket has no character, so these actions are skipped and the
    GM's socket stays open."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send(action, **payload)
        assert gm.sync() == []
        assert len(support.server_sockets(camp["campaign_code"])) == 1
        assert wm.drain() == []


# --- the per-message character lookup --------------------------------------------

@pytest.mark.legacy_trust
@pytest.mark.parametrize("bad", ["abc", {"a": 1}, [1], True], ids=["text", "object", "list", "bool"])
def test_non_integer_character_id_drops_the_frame(client, bad):
    """The lookup raises on PostgreSQL; the handler rolls back and skips the frame,
    even for actions that need no character. The socket stays open."""
    ch = support.forge(client, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("chat_message", message="hi", character_id=bad)
        ws.send("update_drive", pool="nerve", value=0, character_id=bad)
        assert ws.sync() == []
        assert len(support.server_sockets(ch["id"])) == 1
        ws.send("chat_message", message="still here")
        assert support.types(ws.sync()) == ["activity_log"]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


@pytest.mark.legacy_trust
def test_fractional_character_id_finds_no_character(client):
    """QUIRK: 1.5 is a valid SQL comparison that matches nothing, so the frame runs as
    if no character were connected. A campaign member's chat then goes only to the
    member's own channel, with no ink."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, nerve_current=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="Ada", message="hi", character_id=1.5)
        assert wa.sync() == [{"type": "activity_log", "payload": {
            "message": "Ada: hi", "log_type": "chat", "target": "@Circle", "ink_color": ""}}]
        assert gm.drain() == []
        wa.send("update_drive", pool="nerve", value=0, character_id=1.5)
        assert wa.sync() == []
    assert support.fetch(Character, a["id"]).nerve_current == 1


@pytest.mark.legacy_trust
def test_failed_lookup_rollback_reloads_the_stale_circle(client):
    """The rollback after a failed lookup expires the session's objects the same way
    a commit does, so the connect-time circle is read fresh on the next frame."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]
    support.update(Circle, cid, resources_editable=False, stitch=2, refresh=2, train=2)
    with support.ws_connect(client, member["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_toggle_resource_edit", role="GM")
        gm.sync()
        ws.drain()
        ws.send("spend_resource", resource_type="stitch")
        assert ws.sync() == []
        ws.send("update_drive", pool="nerve", value=0, character_id="abc")
        ws.send("spend_resource", resource_type="stitch")
        assert support.types(ws.sync()) == ["character_update", "circle_update", "activity_log"]
    assert support.fetch(Circle, cid).stitch == 1


def test_null_character_id_falls_back_to_the_socket_character(client):
    ch = support.forge(client, move=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="add_action", detail="move", character_id=None)
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert (msgs[0]["payload"]["id"], msgs[0]["payload"]["move"]) == (ch["id"], 2)
    assert support.fetch(Character, ch["id"]).move == 2


# --- campaign context is fixed at connect time -----------------------------------

def test_campaign_context_is_fixed_when_the_socket_connects(client, dice):
    """QUIRK: the comment in websocket_endpoint says the context is re-resolved per
    message, but camp_id, camp_code and the circle are set once at connect. A socket
    opened while its character was unaffiliated keeps logging to its own channel
    after the character joins and is approved, and keeps using circle 1. Only
    chat_message looks the campaign up again from character.campaign_id, and even
    that sees the join only after something on the socket commits, because until
    then the session keeps the character it loaded at connect."""
    camp = support.new_campaign(client)
    guard = support.active_member(client, camp, role_ability="Behind Me", nerve_current=1)
    late = support.forge(client, user_id=support.make_user().id)
    with support.ws_connect(client, late["id"]) as wl, support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, guard["id"]) as wg:
        assert wl.initial[1]["payload"]["id"] == 1
        assert support.join(client, late["id"], camp["campaign_code"]).status_code == 200
        assert support.approve(client, late["id"]).status_code == 200
        gm.drain(), wg.drain(), wl.drain()

        # before anything on this socket commits, the character still has no campaign
        wl.send("chat_message", sender_name="Late", message="one")
        assert support.types(wl.sync()) == ["activity_log"]
        assert gm.drain() == [] and wg.drain() == []

        wl.send("update_pen_font", pen_font="Kalam")  # a commit expires the stale objects
        assert support.types(wl.sync()) == ["character_update"]

        dice(3, 4)
        wl.send("roll", action="move", drive_spent=0)
        assert support.types(wl.sync()) == ["roll_result", "activity_log"]
        assert gm.drain() == [] and wg.drain() == []

        wl.send("chat_message", sender_name="Late", message="two")
        msgs = wl.sync()
        assert [m["payload"]["message"] for m in msgs] == ["Late: two"]
        assert gm.drain() == msgs and wg.drain() == msgs

        # intercept candidates are looked up with campaign_id IS NULL
        wl.send("take_mark", mark_type="body")
        assert support.types(wl.sync()) == ["character_update"]
        assert wg.drain() == []

        wl.send("update_circle")
        [msg] = wl.sync()
        assert (msg["type"], msg["payload"]["id"]) == ("circle_update", 1)
        assert gm.drain() == []


# --- ConnectionManager with sockets that fail ------------------------------------

def test_broadcast_drops_dead_sockets_and_keeps_sending(client):
    mgr = main.ConnectionManager()
    ok1, dead, ok2, elsewhere = (support.FakeSocket(), support.FakeSocket(fail=True),
                                 support.FakeSocket(), support.FakeSocket())
    mgr.active_connections = {"k": [ok1, dead, ok2], "other": [elsewhere]}
    asyncio.run(mgr.broadcast("k", {"type": "x"}))
    assert ok1.sent == [{"type": "x"}] and ok2.sent == [{"type": "x"}]
    assert elsewhere.sent == []
    assert mgr.active_connections == {"k": [ok1, ok2], "other": [elsewhere]}
    asyncio.run(mgr.broadcast("missing", {"type": "x"}))
    assert "missing" not in mgr.active_connections


def test_broadcast_campaign_survives_a_dead_socket(client):
    camp = support.new_campaign(client)
    a = support.active_member(client, camp)
    b = support.active_member(client, camp)
    p = support.pending_member(client, camp)
    gm_dead, gm_ok, a_dead, b_ok, p_ok = (support.FakeSocket(fail=True), support.FakeSocket(),
                                          support.FakeSocket(fail=True), support.FakeSocket(), support.FakeSocket())
    code = camp["campaign_code"]
    mgr = main.ConnectionManager()
    mgr.active_connections = {code: [gm_dead, gm_ok], str(a["id"]): [a_dead],
                              str(b["id"]): [b_ok], str(p["id"]): [p_ok]}
    msg = {"type": "activity_log", "payload": {"message": "m"}}
    with main.SessionLocal() as db:
        asyncio.run(mgr.broadcast_campaign(code, camp["id"], msg, db))
    assert gm_ok.sent == [msg] and b_ok.sent == [msg]
    assert p_ok.sent == []  # pending members are not part of the campaign broadcast
    assert mgr.active_connections == {code: [gm_ok], str(a["id"]): [],
                                      str(b["id"]): [b_ok], str(p["id"]): [p_ok]}


def test_broadcast_all_drops_dead_sockets(client):
    mgr = main.ConnectionManager()
    ok, dead, ok2 = support.FakeSocket(), support.FakeSocket(fail=True), support.FakeSocket()
    mgr.active_connections = {"a": [dead, ok], "b": [ok2]}
    asyncio.run(mgr.broadcast_all({"type": "x"}))
    assert ok.sent == [{"type": "x"}] and ok2.sent == [{"type": "x"}]
    assert mgr.active_connections == {"a": [ok], "b": [ok2]}
