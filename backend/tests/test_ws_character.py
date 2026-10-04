"""WebSocket character actions: update_drive, update_pen_font, update_gear,
apply_advancement, spend_resource."""
import pytest

import engine
import main
import support
from models import Character, Circle

EM = support.EM


def _member_pair(client, **fields):
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, **fields)
    b = support.active_member(client, camp)
    return camp, a, b


# --- update_drive -----------------------------------------------------------

def test_update_drive_sets_value_and_tells_only_the_sender(client):
    camp, a, b = _member_pair(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("update_drive", pool="nerve", value=1)
        msg = wa.recv()
        assert msg["type"] == "character_update"
        assert msg["payload"]["id"] == a["id"]
        assert msg["payload"]["nerve_current"] == 1
        wa.sync()
        assert wb.drain() == [] and gm.drain() == []
    assert support.fetch(Character, a["id"]).nerve_current == 1


def test_update_drive_has_no_bounds(client):
    """QUIRK: any value is stored; the character dict clamps negatives to 0 on the way out."""
    ch = support.forge(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_drive", pool="nerve", value=99)
        assert ws.recv()["payload"]["nerve_current"] == 99
        ws.send("update_drive", pool="cunning", value=-5)
        assert ws.recv()["payload"]["cunning_current"] == 0
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.cunning_current) == (99, -5)


def test_update_drive_unknown_pool_or_missing_value(client):
    ch = support.forge(client, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_drive", pool="bogus", value=2)
        assert ws.recv()["type"] == "character_update"  # sent, nothing stored
        ws.send("update_drive", pool="nerve")
        ws.send("update_drive", value=3)
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_update_drive_on_gm_socket_without_character_is_ignored(client):
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_drive", pool="nerve", value=2)
        assert gm.sync() == []


def test_payload_character_id_of_someone_else_is_rejected(client):
    """Before tokens any socket could act on any character by sending its id. A player
    socket may now only act for its own character; anything else gets action_rejected."""
    camp, a, b = _member_pair(client)
    victim = support.forge(client, user_id=support.make_user().id, nerve_current=1)
    support.update(Character, b["id"], nerve_current=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, victim["id"]) as wv:
        for target in (victim["id"], b["id"]):
            wa.send("update_drive", pool="nerve", value=0, character_id=target)
            assert wa.sync() == [{"type": "action_rejected", "payload": {
                "action": "update_drive", "status": 403, "detail": "Not allowed."}}]
        assert wv.drain() == []
        wa.send("update_drive", pool="nerve", value=0, character_id=a["id"])  # its own id is fine
        assert support.types(wa.sync()) == ["character_update"]
    assert support.fetch(Character, victim["id"]).nerve_current == 1
    assert support.fetch(Character, b["id"]).nerve_current == 1


def test_gm_may_set_a_members_drive_but_not_an_outsiders(client):
    """update_drive is "owner (GM optional)": a GM socket may name a member of its
    campaign; the character_update goes to the GM's own channel, as it always has."""
    camp, a, b = _member_pair(client, nerve_current=2)
    outsider = support.active_member(client, support.new_campaign(client), nerve_current=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("update_drive", pool="nerve", value=1, character_id=a["id"])
        [msg] = gm.sync()
        assert (msg["type"], msg["payload"]["id"], msg["payload"]["nerve_current"]) == ("character_update", a["id"], 1)
        assert wa.drain() == []
        gm.send("update_drive", pool="nerve", value=0, character_id=outsider["id"])
        assert support.types(gm.sync()) == ["action_rejected"]
    assert support.fetch(Character, outsider["id"]).nerve_current == 2


def test_gm_may_not_target_a_retired_character_of_its_campaign(client):
    """Reviewer probe: the GM check compared only campaign_id, so a GM could still
    change a retired character tagged with its campaign."""
    camp, a, b = _member_pair(client, nerve_current=2)
    support.update(Character, a["id"], status="retired")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        for msg_type in ("update_drive", "take_mark", "revive_character", "update_gear", "gm_reset_character"):
            gm.send(msg_type, character_id=a["id"], pool="nerve", value=0, mark_type="body", gear=["x"])
            assert support.types(gm.sync()) == ["action_rejected"], msg_type
        gm.send("update_drive", pool="nerve", value=1, character_id=b["id"])
        assert support.types(gm.sync()) == ["character_update"]
    row = support.fetch(Character, a["id"])
    assert (row.nerve_current, row.body_marks, row.gear) == (2, 0, [])


# --- update_pen_font --------------------------------------------------------

def test_update_pen_font(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_pen_font", pen_font="Rock Salt")
        assert ws.recv()["payload"]["pen_font"] == "Rock Salt"
        ws.send("update_pen_font", pen_font="Papyrus")
        ws.send("update_pen_font")
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).pen_font == "Rock Salt"


# --- update_gear ------------------------------------------------------------

def test_update_gear(client):
    camp, a, b = _member_pair(client)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("update_gear", gear=["lamp", "rope"])
        msgs = wa.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["gear"] == ["lamp", "rope"]
        assert msgs[1]["payload"] == {"message": f"{a['name']} updated their equipment: lamp, rope.",
                                      "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        assert support.types(wb.drain()) == ["activity_log"]
        wa.send("update_gear", gear=[])
        msgs = wa.sync()
        assert msgs[1]["payload"]["message"] == f"{a['name']} updated their equipment: nothing."
        wa.send("update_gear", gear="not a list")
        assert wa.sync() == []
    assert support.fetch(Character, a["id"]).gear == []


def test_update_gear_unaffiliated_logs_to_own_channel(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_gear", gear=["map"])
        assert support.types(ws.sync()) == ["character_update", "activity_log"]


@pytest.mark.parametrize("gear", [["map", 7], [None], [["nested"]], [{"name": "lamp"}]])
def test_update_gear_non_string_item_is_rejected(client, gear):
    """Fixed: the gear was committed, then building the log line raised and the socket
    ended. A list with an item that is not text is now refused before anything is saved."""
    ch = support.forge(client, gear=["lamp"])
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("update_gear", gear=gear)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "update_gear", "status": 422, "detail": "Gear items must be text."}}]
        ws.send("update_gear", gear=["map"])
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
    assert support.fetch(Character, ch["id"]).gear == ["map"]


# --- apply_advancement ------------------------------------------------------

def test_apply_advancement_add_action(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("apply_advancement", choice="add_action", detail="move")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["move"] == 3
        assert msgs[1]["payload"]["message"] == f"{ch['name']} has advanced {EM} gained +1 move."
        assert support.types(gm.drain()) == ["activity_log"]
        ws.send("apply_advancement", choice="add_action", detail="move")  # already 3
        ws.send("apply_advancement", choice="add_action", detail="dance")
        ws.send("apply_advancement", choice="mystery", detail="x")
        ws.send("apply_advancement", detail="move")
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).move == 3


def test_apply_advancement_other_choices(client):
    ch = support.forge(client, nerve_max=3, nerve_current=1, specialty_ability="Dissection")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="add_drive", detail="nerve")
        msgs = ws.sync()
        assert msgs[-1]["payload"]["message"] == f"{ch['name']} has advanced {EM} gained +2 nerve drive."
        ws.send("apply_advancement", choice="new_ability", detail="  Steel Mind ")
        msgs = ws.sync()
        assert msgs[-1]["payload"]["message"] == f"{ch['name']} has advanced {EM} learned a new ability:   Steel Mind ."
        ws.send("apply_advancement", choice="gild_action", detail="sense")
        msgs = ws.sync()
        assert msgs[-1]["payload"]["message"] == f"{ch['name']} has advanced {EM} gilded their sense action."
        ws.send("apply_advancement", choice="new_ability", detail="   ")
        ws.send("apply_advancement", choice="add_drive", detail="charm")
        ws.send("apply_advancement", choice="gild_action", detail="charm")
        assert ws.sync() == []
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_max, row.nerve_current) == (5, 3)
    # QUIRK: abilities are joined into one string, which breaks exact-name ability checks.
    assert row.specialty_ability == "Dissection; Steel Mind"
    assert row.gilded_sense is True


def test_apply_advancement_new_ability_replaces_none(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="new_ability", detail="Flourish")
        ws.sync()
    assert support.fetch(Character, ch["id"]).specialty_ability == "Flourish"


def test_apply_advancement_has_no_gate(client):
    """QUIRK: a player can advance any number of times without a circle advancement."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        for _ in range(3):
            ws.send("apply_advancement", choice="add_action", detail="read")
        ws.sync()
    assert support.fetch(Character, ch["id"]).read == 3


# --- spend_resource ---------------------------------------------------------

def _resource_setup(client, editable=True, **char_fields):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp, **char_fields)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    support.update(Circle, cid, resources_editable=editable, stitch=2, refresh=2, train=2)
    return camp, member, cid


def test_spend_stitch(client):
    camp, member, cid = _resource_setup(client, body_marks=2, brain_marks=1, bleed_marks=3)
    with support.ws_connect(client, member["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("spend_resource", resource_type="stitch")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "circle_update", "activity_log"]
        p = msgs[0]["payload"]
        assert (p["body_marks"], p["brain_marks"], p["bleed_marks"]) == (0, 0, 0)
        assert p["resources_spent_assignment"] == 1
        assert msgs[1]["payload"]["stitch"] == 1
        assert msgs[2]["payload"]["message"] == f"{member['name']} used Stitch {EM} all marks cleared."
        assert support.types(gm.drain()) == ["circle_update", "activity_log"]
    assert support.fetch(Circle, cid).stitch == 1
    assert support.fetch(Character, member["id"]).resources_spent_assignment == 1


def test_spend_refresh_and_train(client):
    camp, member, cid = _resource_setup(
        client, nerve_max=3, nerve_current=0, cunning_max=6, cunning_current=1,
        intuition_max=3, intuition_current=2, nerve_resistance_spent=1)
    support.update(Character, member["id"], ability_uses={"Steel Mind": 1})
    with support.ws_connect(client, member["id"]) as ws:
        ws.send("spend_resource", resource_type="refresh")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "circle_update", "activity_log"]
        assert (msgs[1]["payload"]["id"], msgs[1]["payload"]["refresh"]) == (cid, 1)
        assert msgs[2]["payload"] == {"message": f"{member['name']} used Refresh {EM} drives & resistances restored.",
                                      "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        p = msgs[0]["payload"]
        assert (p["nerve_current"], p["cunning_current"], p["intuition_current"]) == (3, 6, 3)
        assert p["nerve_resistance_spent"] == 0
        assert p["ability_uses"] == {}
        ws.send("spend_resource", resource_type="train")
        msgs = ws.sync()
        assert msgs[0]["payload"]["train_bonus"] is True
        assert msgs[2]["payload"]["message"] == f"{member['name']} used Train {EM} Train d6 bonus active for next roll."
        # at most two spends per assignment
        ws.send("spend_resource", resource_type="stitch")
        assert ws.sync() == []
    c = support.fetch(Circle, cid)
    assert (c.stitch, c.refresh, c.train) == (2, 1, 1)


def test_spend_rejections_are_silent(client):
    camp, member, cid = _resource_setup(client, editable=False)
    with support.ws_connect(client, member["id"]) as ws:
        ws.send("spend_resource", resource_type="stitch")
        ws.send("spend_resource", resource_type="gold")
        assert ws.sync() == []
    camp, member, cid = _resource_setup(client)
    support.update(Circle, cid, stitch=0)
    with support.ws_connect(client, member["id"]) as ws:
        ws.send("spend_resource", resource_type="stitch")
        assert ws.sync() == []


def test_spend_resource_needs_a_character(client):
    camp, member, cid = _resource_setup(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("spend_resource", resource_type="stitch")
        assert gm.sync() == []


def test_spend_uses_stale_connect_time_circle(client):
    """QUIRK: the socket keeps the circle it loaded on connect. When the GM opens
    spending after the player connected, the player's spend is silently ignored
    until the player's session commits something and reloads its objects."""
    camp, member, cid = _resource_setup(client, editable=False)
    with support.ws_connect(client, member["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_toggle_resource_edit", role="GM")
        assert gm.sync()[0]["payload"]["resources_editable"] is True
        assert support.types(ws.drain()) == ["circle_update"]
        ws.send("spend_resource", resource_type="stitch")
        assert support.types(ws.sync()) == []
        ws.send("update_pen_font", pen_font="Kalam")  # any commit expires the stale circle
        ws.send("spend_resource", resource_type="stitch")
        assert support.types(ws.sync()) == ["character_update", "character_update", "circle_update", "activity_log"]
