"""/ws/{game_id}: connecting, channel naming, the connection manager, malformed frames."""
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
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(json.dumps({"type": "revive_character"}))
        assert ws.recv()["type"] == "character_update"


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
