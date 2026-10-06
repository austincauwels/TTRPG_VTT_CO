"""/ws/{game_id}: connecting, channel naming, the connection manager, malformed frames."""
import asyncio
import json
import time
import types

import pytest
from starlette.websockets import WebSocketDisconnect

import main
import support
from models import Campaign, Character, Circle, User
from vtt.ws import endpoint
from vtt.ws.manager import campaign_key


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


@pytest.mark.parametrize("status", ["pending", "retired"])
def test_a_non_member_does_not_get_the_campaign_circle_on_connect(client, status):
    """A character's socket keeps the campaign the character is tagged with, so that an
    approval while connected makes it a member at once. The circle_update sent on
    connect was that campaign's circle whatever the character's status, so anyone with
    the campaign code could join and read the circle's name, scene, chapter house,
    backstory answers and assignment reports. A pending or retired character now gets
    the shared circle 1 on connect, as an unaffiliated one does."""
    secret = f"Secret mill {support.uid()}"
    camp = support.new_campaign(client)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()["circle_id"]
    support.update(Circle, cid, location=secret, backstory_answers={"chapter_house": secret})
    if status == "pending":
        ch = support.pending_member(client, camp)
    else:
        ch = support.active_member(client, camp)
        support.update(Character, ch["id"], status="retired")
    with support.ws_connect(client, ch["id"]) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert ws.initial[1]["payload"]["id"] == 1
        assert secret not in json.dumps(ws.initial)
    member = support.active_member(client, camp)
    with support.ws_connect(client, member["id"]) as ws:
        assert ws.initial[1]["payload"]["id"] == cid
        assert ws.initial[1]["payload"]["location"] == secret


def test_unknown_numeric_and_text_keys_are_closed_with_4404(client):
    """Before tokens these opened a socket on circle 1 with no campaign. The
    frontend's 'gm' fallback channel is one of them."""
    for key in ("987654321", f"nothing-{support.uid()}", "gm"):
        assert support.ws_close_code(client, key) == 4404
        assert not support.server_sockets(key)


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


def test_only_the_owner_can_open_a_characters_channel(client):
    """Before tokens the path segment was the whole identity: anyone could open any
    character's channel (and kick the owner off with the 1001 close)."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, user_id=support.make_user().id, nerve_current=1)
    fellow = support.active_member(client, camp)
    with support.ws_connect(client, ch["id"]) as owner:
        for user_id in (support.owner_id(fellow["id"]), support.gm_id(camp), support.make_user().id):
            assert support.ws_close_code(client, ch["id"], token=support.token_for(user_id)) == 4403
        assert len(support.server_sockets(ch["id"])) == 1  # the owner was not kicked off
        owner.send("update_drive", pool="nerve", value=0)
        assert owner.recv()["payload"]["nerve_current"] == 0


def test_only_the_gm_can_open_a_campaign_channel(client):
    """Before tokens anyone could open a GM channel and use GM powers."""
    camp = support.new_campaign(client, gm_user_id=support.make_user().id)
    member = support.active_member(client, camp)
    for user_id in (support.owner_id(member["id"]), support.gm_id(support.new_campaign(client))):
        assert support.ws_close_code(client, camp["campaign_code"], token=support.token_for(user_id)) == 4403
    with support.ws_connect(client, camp["campaign_code"]) as ws:
        ws.send("gm_toggle_reports")
        assert ws.recv()["payload"]["reports_open"] is True


@pytest.mark.parametrize("token", [None, "", "not-a-token", "expired", "deleted user", "other key"])
def test_socket_without_a_valid_token_is_closed_with_4401(client, token):
    """The socket is accepted and closed at once with 4401; no frame is sent and the
    channel's real socket is left alone."""
    import time
    import jwt
    from vtt import config, security
    now = int(time.time())
    token = {
        "expired": jwt.encode({"sub": "1", "iat": now - 120, "exp": now - 60}, config.SECRET_KEY, algorithm="HS256"),
        "deleted user": security.create_access_token(987654321, "x"),
        "other key": jwt.encode({"sub": "1", "iat": now, "exp": now + 60}, "not-the-key", algorithm="HS256"),
    }.get(token, token)
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    with support.ws_connect(client, ch["id"]) as owner, support.ws_connect(client, camp["campaign_code"]):
        for key in (ch["id"], camp["campaign_code"]):
            assert support.ws_close_code(client, key, token=token) == 4401
        assert len(support.server_sockets(ch["id"])) == 1
        assert len(support.server_sockets(camp["campaign_code"])) == 1
        owner.send("update_pen_font", pen_font="Kalam")
        assert owner.recv()["type"] == "character_update"


def test_token_in_the_query_string_is_not_logged(client, caplog):
    import logging
    ch = support.forge(client)
    token = support.token_for(support.owner_id(ch["id"]))
    with caplog.at_level(logging.INFO):
        with support.ws_connect(client, ch["id"]):
            pass
        support.ws_close_code(client, f"nothing-{support.uid()}", token=token)
    assert caplog.records
    assert not any(token in r.getMessage() for r in caplog.records)


def _numeric_character(owner_id):
    """A character with a large explicit id, so that a campaign code can equal it
    (codes need 3+ characters; the id is far above anything the sequence hands out
    during a test run)."""
    char_id = 900_000_000 + int(support.uid(6), 16) % 90_000_000
    with main.SessionLocal() as s:
        s.add(Character(id=char_id, name=f"Num {support.uid()}", user_id=owner_id, circle_id=1))
        s.commit()
    return char_id


def _numeric_campaign(client, code):
    """A campaign with an all-digit code, as older data may hold (create refuses
    such codes now)."""
    camp = support.new_campaign(client)
    support.update(Campaign, camp["id"], campaign_code=code)
    return {**camp, "campaign_code": code}


def test_numeric_campaign_code_and_character_id_channels(client):
    """A campaign whose all-digit code equals a character id: before tokens the
    character's socket resolved to that campaign when the character had none of its
    own. Now the character's owner gets the character channel with no campaign, and
    the campaign's GM gets the campaign channel. QUIRK D13 fixed: the two used to
    share the manager key, so the last one to connect closed the other with 1001.
    Now both stay open."""
    owner = support.make_user()
    char_id = _numeric_character(owner.id)
    camp = _numeric_campaign(client, str(char_id))
    with support.ws_connect(client, char_id, token=support.token_for(owner.id), wait_disconnect=False) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert ws.initial[1]["payload"]["id"] == 1
        with support.ws_connect(client, char_id, token=support.token_for(camp["gm_user_id"]),
                                wait_disconnect=False) as gm:
            assert support.types(gm.initial) == ["circle_update"]
            assert gm.initial[0]["payload"]["id"] == support.campaign_circle(camp["id"]).id
            assert len(support.server_sockets(char_id)) == 2
            ws.send("update_pen_font", pen_font="Kalam")
            assert support.types(ws.sync()) == ["character_update"]
            gm.send("gm_toggle_reports")
            assert support.types(gm.sync()) == ["circle_update"]
            assert ws.drain() == [] and gm.drain() == []
    assert support.ws_close_code(client, char_id, token=support.as_stranger()["Authorization"][7:]) == 4403


def test_all_digit_campaign_code_cannot_take_over_a_players_channel(client):
    """Reviewer probe for D13: a GM whose campaign code is a member's character id
    used to close the member's socket (1001) and receive the member's frames."""
    real = support.new_campaign(client)
    victim_owner = support.make_user()
    char_id = _numeric_character(victim_owner.id)
    assert support.join(client, char_id, real["campaign_code"]).status_code == 200
    assert support.approve(client, char_id).status_code == 200
    rogue = _numeric_campaign(client, str(char_id))
    with support.ws_connect(client, char_id, token=support.token_for(victim_owner.id)) as victim, \
            support.ws_connect(client, real["campaign_code"]) as real_gm:
        with support.ws_connect(client, char_id, token=support.token_for(rogue["gm_user_id"])) as attacker:
            assert support.types(attacker.initial) == ["circle_update"]
            real_gm.send("gm_reset_character", character_id=char_id)
            real_gm.sync()
            assert "character_update" in support.types(victim.sync())
            assert attacker.sync() == []
        victim.send("update_pen_font", pen_font="Kalam")
        assert support.types(victim.sync()) == ["character_update"]


def test_character_id_equal_to_a_campaign_code_cannot_take_over_the_gm_channel(client):
    """Reviewer probe for D13, the other way round: the owner of a character whose id
    equals an all-digit campaign code used to kick the GM off and get its frames."""
    attacker = support.make_user()
    char_id = _numeric_character(attacker.id)
    camp = _numeric_campaign(client, str(char_id))
    member = support.active_member(client, camp)
    gm_token = support.token_for(camp["gm_user_id"])
    with support.ws_connect(client, camp["campaign_code"], token=gm_token) as gm, \
            support.ws_connect(client, member["id"]) as wm:
        assert support.types(gm.initial) == ["circle_update"]
        with support.ws_connect(client, char_id, token=support.token_for(attacker.id)) as rogue:
            assert support.types(rogue.initial) == ["character_update", "circle_update"]
            wm.send("chat_message", message="for the GM only", target="@Lightkeeper")
            wm.sync()
            [whisper] = support.of_type(gm.sync(), "activity_log")
            assert whisper["payload"]["message"].endswith(": for the GM only")
            assert rogue.sync() == []
        gm.send("gm_toggle_reports")
        assert support.types(gm.sync()) == ["circle_update"]


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


@pytest.mark.parametrize("frame", ['[1, 2]', '"text"', '7', 'null', '{"type": "no_such_action", "payload": [1]}'])
def test_non_object_frame_is_ignored(client, frame):
    """Fixed: frames that are valid JSON but not objects raised outside any handler and
    ended the connection without a close frame. They are ignored now, like invalid
    JSON, and the socket keeps working."""
    ch = support.forge(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(frame)
        assert ws.sync() == []
        ws.send("update_drive", pool="nerve", value=2)
        assert ws.sync()[0]["payload"]["nerve_current"] == 2
    assert support.fetch(Character, ch["id"]).nerve_current == 2


@pytest.mark.parametrize("payload", [[1], "text", 7, True])
def test_non_object_payload_is_rejected(client, payload):
    """Fixed: a payload that is not an object ended the connection. It now gets an
    action_rejected frame (422) and nothing happens."""
    ch = support.forge(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(json.dumps({"type": "update_drive", "payload": payload}))
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "update_drive", "status": 422, "detail": "The payload must be an object."}}]
        ws.send("update_drive", pool="nerve", value=1)
        assert ws.sync()[0]["payload"]["nerve_current"] == 1


def test_null_payload_is_an_empty_one(client):
    ch = support.forge(client, body_marks=2, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(json.dumps({"type": "revive_character", "payload": None}))
        assert ws.recv()["payload"]["incapacitated"] is False


def test_disconnect_removes_socket_but_keeps_key(client):
    ch = support.forge(client)
    key = str(ch["id"])
    with support.ws_connect(client, key):
        assert len(support.server_sockets(key)) == 1
    assert support.wait_server_dropped(key)
    assert key in main.manager.active_connections  # the empty list stays


def test_connect_with_campaign_that_has_circle_reuses_it(client):
    camp = support.new_campaign(client)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
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

@pytest.mark.parametrize("bad", ["abc", {"a": 1}, [1], True], ids=["text", "object", "list", "bool"])
def test_non_integer_character_id_drops_the_frame(client, bad):
    """The lookup raises on PostgreSQL; the handler rolls back and skips the frame,
    even for actions that need no character. The socket stays open."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("chat_message", message="hi", character_id=bad)
        ws.send("update_drive", pool="nerve", value=0, character_id=bad)
        assert ws.sync() == []
        assert len(support.server_sockets(ch["id"])) == 1
        ws.send("chat_message", message="still here")
        assert support.types(ws.sync()) == ["activity_log"]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_fractional_character_id_is_an_unknown_character(client):
    """1.5 is a valid SQL comparison that matches nothing. Before tokens the frame then
    ran as if no character were connected (a member's chat went to its own channel
    with no ink); now a character_id that matches no character is rejected with 404."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, nerve_current=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", message="hi", character_id=1.5)
        wa.send("update_drive", pool="nerve", value=0, character_id=1.5)
        assert wa.sync() == [
            {"type": "action_rejected", "payload": {"action": "chat_message", "status": 404, "detail": "Character not found"}},
            {"type": "action_rejected", "payload": {"action": "update_drive", "status": 404, "detail": "Character not found"}},
        ]
        assert gm.drain() == []
    assert support.fetch(Character, a["id"]).nerve_current == 1


def test_failed_lookup_rollback_reloads_the_stale_circle(client):
    """The rollback after a failed lookup expires the session's objects the same way
    a commit does, so the connect-time circle is read fresh on the next frame."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
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
    then the session keeps the character it loaded at connect. (The access checks
    read the character fresh, so the member may chat; the chat handler itself still
    uses the stale copy.)"""
    camp = support.new_campaign(client)
    guard = support.active_member(client, camp, role_ability="Behind Me", nerve_current=1)
    late = support.forge(client, user_id=support.make_user().id)
    with support.ws_connect(client, late["id"]) as wl, support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, guard["id"]) as wg:
        assert wl.initial[1]["payload"]["id"] == 1
        # an unaffiliated character may not chat at all
        wl.send("chat_message", message="zero")
        assert support.types(wl.sync()) == ["action_rejected"]
        assert support.join(client, late["id"], camp["campaign_code"]).status_code == 200
        assert support.approve(client, late["id"]).status_code == 200
        gm.drain(), wg.drain(), wl.drain()

        # before anything on this socket commits, the character still has no campaign
        wl.send("chat_message", message="one")
        assert support.types(wl.sync()) == ["activity_log"]
        assert gm.drain() == [] and wg.drain() == []

        wl.send("update_pen_font", pen_font="Kalam")  # a commit expires the stale objects
        assert support.types(wl.sync()) == ["character_update"]

        dice(3, 4)
        wl.send("roll", action="move", drive_spent=0)
        assert support.types(wl.sync()) == ["roll_result", "activity_log"]
        assert gm.drain() == [] and wg.drain() == []

        wl.send("chat_message", message="two")
        msgs = wl.sync()
        assert [m["payload"]["message"] for m in msgs] == [f"{late['name']}: two"]
        assert gm.drain() == msgs and wg.drain() == msgs

        # intercept candidates are looked up with campaign_id IS NULL
        wl.send("take_mark", mark_type="body")
        assert support.types(wl.sync()) == ["character_update"]
        assert wg.drain() == []

        # before tokens a player's update_circle edited the connect-time circle 1;
        # update_circle is GM only now
        wl.send("update_circle")
        assert support.types(wl.sync()) == ["action_rejected"]
        assert gm.drain() == []


# --- a changed password ends open sockets -------------------------------------------

def test_a_socket_closes_on_its_next_message_once_the_password_changed(client):
    """The routes that change a password close the user's sockets themselves; this
    covers every other way (a hash set in the database). The message is not handled."""
    ch = support.forge(client)
    user_id = support.owner_id(ch["id"])
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_pen_font", pen_font="Kalam")
        assert ws.recv()["payload"]["pen_font"] == "Kalam"
        support.update(User, user_id, hashed_password=support.cheap_hash("changed-in-the-database"))
        ws.send("not_a_type")  # a frame that names no handler is ignored as before
        ws.send("update_pen_font", pen_font="Rock Salt")
        with pytest.raises(support.Closed) as closed:
            ws.recv()
        assert closed.value.code == 4401
        assert support.server_sockets(ch["id"]) == []
    assert support.fetch(Character, ch["id"]).pen_font == "Kalam"


def test_a_deleted_users_socket_closes_on_its_next_message(client):
    camp = support.new_campaign(client)
    gm_id = support.gm_id(camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.sync()
        support.update(Campaign, camp["id"], gm_user_id=None)
        with main.SessionLocal() as s:
            s.query(User).filter(User.id == gm_id).delete()
            s.commit()
        gm.send("gm_transition_scene", scene_name="after")
        with pytest.raises(support.Closed) as closed:
            gm.recv()
        assert closed.value.code == 4401


def test_close_user_closes_only_that_users_sockets(client):
    a, b = support.forge(client), support.forge(client)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        # on the event loop that runs the sockets, as a route would
        assert wa.session.portal.call(main.manager.close_user, support.owner_id(a["id"])) == 1
        with pytest.raises(support.Closed) as closed:
            wa.recv()
        assert closed.value.code == 4401
        assert support.server_sockets(a["id"]) == []
        wb.send("update_pen_font", pen_font="Kalam")
        assert wb.recv()["payload"]["pen_font"] == "Kalam"
        assert wb.session.portal.call(main.manager.close_user, support.owner_id(a["id"])) == 0


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
    gm_key = campaign_key(code)
    mgr.active_connections = {gm_key: [gm_dead, gm_ok], str(a["id"]): [a_dead],
                              str(b["id"]): [b_ok], str(p["id"]): [p_ok]}
    msg = {"type": "activity_log", "payload": {"message": "m"}}
    with main.SessionLocal() as db:
        asyncio.run(mgr.broadcast_campaign(code, camp["id"], msg, db))
    assert gm_ok.sent == [msg] and b_ok.sent == [msg]
    assert p_ok.sent == []  # pending members are not part of the campaign broadcast
    assert mgr.active_connections == {gm_key: [gm_ok], str(a["id"]): [],
                                      str(b["id"]): [b_ok], str(p["id"]): [p_ok]}


def test_broadcast_all_drops_dead_sockets(client):
    mgr = main.ConnectionManager()
    ok, dead, ok2 = support.FakeSocket(), support.FakeSocket(fail=True), support.FakeSocket()
    mgr.active_connections = {"a": [dead, ok], "b": [ok2]}
    asyncio.run(mgr.broadcast_all({"type": "x"}))
    assert ok.sent == [{"type": "x"}] and ok2.sent == [{"type": "x"}]
    assert mgr.active_connections == {"a": [ok], "b": [ok2]}


# --- a socket left behind by a phone that slept ------------------------------------
# A phone that sleeps or changes networks leaves its socket open on the server until the
# pings time out (up to 40 seconds): the server cannot tell it is gone, and closing it
# waits for an answer that never comes (support.StaleSocket). The phone's next socket on
# the channel must not wait for that close, and must stay the socket the channel's
# messages go to.

def test_a_stale_socket_on_the_channel_does_not_hold_up_the_new_one(client, dice):
    """It did: connect closed the older socket first, so the new one got its first
    frames and had its messages read only once that close gave up (10 seconds live). A
    roll sent at once came back after the tray had given up on it."""
    ch = support.forge(client, sway=1)
    key = str(ch["id"])
    stale = support.StaleSocket(hang=6.0)
    main.manager.active_connections[key] = [stale]
    started = time.monotonic()
    with support.ws_connect(client, key) as ws:
        assert time.monotonic() - started < 2.0
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert stale not in support.server_sockets(key)
        assert len(support.server_sockets(key)) == 1
        dice(4)
        ws.send("roll", action="sway", drive_spent=0)
        assert ws.recv_type("roll_result", timeout=2.0)["payload"]["roll"]["result"] == 4
        assert support.wait_until(lambda: stale.close_codes == [1001])


def test_a_socket_that_opens_while_an_older_one_waits_keeps_the_channel(client, dice):
    """The owner's phone on beta (2026-10-04): with a stale socket on the channel, socket
    A opened and waited for that socket's close; meanwhile the page opened B, which got
    the channel at once (the close was already under way). When A's wait ended, A put
    itself back as the channel's only socket. B's rolls were rolled, but their results
    went to A, and B's tray said "Rolling..." and then nothing."""
    ch = support.forge(client, sway=1)
    key = str(ch["id"])
    stale = support.StaleSocket(hang=2.0)
    main.manager.active_connections[key] = [stale]
    with client.websocket_connect(support.ws_url(key)):  # A: opened, never read
        with support.ws_connect(client, key) as ws:      # B
            time.sleep(2.5)  # the stale socket's close has run out by now
            dice(4)
            ws.send("roll", action="sway", drive_spent=0)
            assert ws.recv_type("roll_result", timeout=3.0)["payload"]["roll"]["result"] == 4
            assert len(support.server_sockets(key)) == 1


def test_connects_that_finish_out_of_order_keep_the_socket_that_arrived_last(client):
    """Two sockets on one channel whose accepts finish out of order: the one that
    arrived last keeps the channel, and the other is closed with 1001 (replaced)."""
    mgr = main.ConnectionManager()

    class Sock:
        def __init__(self, gate=None):
            self.state = types.SimpleNamespace()
            self.gate = gate
            self.close_codes = []

        async def accept(self):
            if self.gate is not None:
                await self.gate.wait()

        async def close(self, code=1000):
            self.close_codes.append(code)

    async def scenario():
        gate = asyncio.Event()
        first, second = Sock(gate), Sock()
        first_connect = asyncio.create_task(mgr.connect("k", first, user_id=1))
        await asyncio.sleep(0)  # first has arrived and waits in accept
        assert await mgr.connect("k", second, user_id=1) is True
        gate.set()
        assert await first_connect is False
        for _ in range(3):
            await asyncio.sleep(0)
        return first, second

    first, second = asyncio.run(scenario())
    assert mgr.active_connections == {"k": [second]}
    assert first.close_codes == [1001]
    assert second.close_codes == []


@pytest.mark.parametrize("failure", [WebSocketDisconnect(code=1006), RuntimeError("the database went away")])
def test_a_socket_that_fails_while_it_starts_leaves_the_channel(client, monkeypatch, failure):
    """A socket whose first frames could not be sent (its page had already closed it,
    as A in the test above) or whose setup failed stayed on its channel, dead, and the
    channel's messages went to it."""
    ch = support.forge(client)
    key = str(ch["id"])

    def fail(*args, **kwargs):
        raise failure

    monkeypatch.setattr(endpoint, "get_char_dict", fail)
    with client.websocket_connect(support.ws_url(key)):
        assert support.wait_server_dropped(key)


def test_close_user_does_not_wait_for_a_stale_socket(client):
    """The routes that change a password close the user's sockets; a stale one held
    the route up until its close gave up."""
    ch = support.forge(client)
    key = str(ch["id"])
    user_id = support.owner_id(ch["id"])
    stale = support.StaleSocket(hang=6.0, user_id=user_id)
    main.manager.active_connections[key] = [stale]
    other = support.forge(client)
    with support.ws_connect(client, other["id"]) as wo:  # for the server's event loop
        started = time.monotonic()
        assert wo.session.portal.call(main.manager.close_user, user_id) == 1
        assert time.monotonic() - started < 2.0
        assert support.server_sockets(key) == []
        assert support.wait_until(lambda: stale.close_codes == [4401])
