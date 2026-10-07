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

def _rejected(detail, status=409):
    return {"type": "action_rejected", "payload": {"action": "apply_advancement", "status": status, "detail": detail}}


def test_apply_advancement_add_action(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2)
    support.update(Character, ch["id"], advancement_picks=2)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("apply_advancement", choice="add_action", detail="move")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["move"] == 3
        assert (msgs[0]["payload"]["advancement_picks"], msgs[0]["payload"]["advancement_taken"]) == (1, ["add_action"])
        assert msgs[1]["payload"]["message"] == f"{ch['name']} has advanced {EM} gained +1 move."
        assert support.types(gm.drain()) == ["activity_log"]
        ws.send("apply_advancement", choice="add_action", detail="sense")  # the same option twice
        ws.send("apply_advancement", choice="mystery", detail="x")
        ws.send("apply_advancement", detail="move")  # no choice: ignored
        assert ws.sync() == [
            _rejected("Choose a different option for your other advancement."),
            _rejected("Unknown advancement choice: mystery", 422),
        ]
    row = support.fetch(Character, ch["id"])
    assert (row.move, row.sense, row.advancement_picks) == (3, 0, 1)


def test_apply_advancement_other_choices(client):
    ch = support.forge(client, nerve_max=3, nerve_current=1, specialty_ability="Dissection")
    support.update(Character, ch["id"], advancement_picks=3)
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
        ws.send("apply_advancement", choice="add_action", detail="move")  # no pick left
        assert ws.sync() == [_rejected("No advancement is waiting to be chosen.")]
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_max, row.nerve_current) == (5, 3)
    # Still one string, but every ability check splits it (vtt/abilities.py, QUIRKS D12)
    assert row.specialty_ability == "Dissection; Steel Mind"
    assert row.gilded_sense is True


@pytest.mark.parametrize("choice,detail,fields,error,status", [
    ("add_drive", "charm", {}, "Choose one drive for both points, or two drives for one each.", 422),
    ("add_drive", "nerve,cunning,intuition", {}, "Choose one drive for both points, or two drives for one each.", 422),
    ("add_drive", "nerve", {"nerve_max": 8}, "Nerve is at most 9.", 409),
    ("new_ability", "   ", {}, "Choose an ability.", 422),
    ("new_ability", "Dissection", {"specialty_ability": "Dissection"},
     "Dissection is already one of this investigator's abilities.", 409),
    ("gild_action", "charm", {}, "Unknown action: charm", 422),
    ("gild_action", "sense", {"gilded_sense": True}, "sense is already gilded.", 409),
    ("add_action", "move", {"move": 3}, "move is already at maximum (3)", 409),
])
def test_apply_advancement_refusals(client, choice, detail, fields, error, status):
    """Fixed (RULES_CHECK 14): each pick is checked; a refused one changes nothing."""
    ch = support.forge(client, **fields)
    support.update(Character, ch["id"], advancement_picks=2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice=choice, detail=detail)
        assert ws.sync() == [_rejected(error, status)]
    assert support.fetch(Character, ch["id"]).advancement_picks == 2


def test_a_new_ability_comes_from_the_role_or_specialty(client):
    """A new ability is one of the investigator's role or specialty (it took any text)."""
    ch = support.forge(client, role="Scholar", specialty="Doctor", role_ability="Well-Read",
                       specialty_ability="Dissection")
    support.update(Character, ch["id"], advancement_picks=2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="new_ability", detail="Steel Mind")
        ws.send("apply_advancement", choice="new_ability", detail="Godmode")
        assert ws.sync() == [_rejected("Choose an ability of the Scholar role or the Doctor specialty."),
                             _rejected("Godmode is not a role or specialty ability.")]
        ws.send("apply_advancement", choice="new_ability", detail="Meticulous Notes")
        assert ws.sync()[0]["payload"]["specialty_ability"] == "Dissection; Meticulous Notes"


def test_interdisciplinary_gives_one_ability_from_outside(client):
    """With the circle's Interdisciplinary (p. 41), once per campaign, a new ability may
    come from another role or specialty."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role="Scholar", specialty="Doctor", role_ability="Well-Read",
                               specialty_ability="Dissection")
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp["id"])).json()["circle_id"]
    support.update(Circle, cid, circle_ability="Interdisciplinary")
    support.update(Character, ch["id"], advancement_picks=4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="new_ability", detail="Steel Mind")
        assert ws.sync()[0]["payload"]["specialty_ability"] == "Dissection; Steel Mind"
        ws.send("apply_advancement", choice="add_action", detail="move")
        ws.sync()
        ws.send("apply_advancement", choice="new_ability", detail="Hardened")  # a second outside one
        assert ws.sync() == [_rejected(
            "Interdisciplinary gives one ability from another role or specialty a campaign, and it is taken.")]
        ws.send("apply_advancement", choice="new_ability", detail="Patch Up")  # its own still works
        assert ws.sync()[0]["payload"]["specialty_ability"] == "Dissection; Steel Mind; Patch Up"


def test_apply_advancement_splits_drive_points(client):
    ch = support.forge(client, nerve_max=3, nerve_current=3, cunning_max=8, cunning_current=2)
    support.update(Character, ch["id"], advancement_picks=2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="add_drive", detail="nerve,cunning")
        p = ws.sync()[0]["payload"]
        assert (p["nerve_max"], p["nerve_current"], p["cunning_max"], p["cunning_current"]) == (4, 4, 9, 3)


def test_apply_advancement_new_ability_replaces_none(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], advancement_picks=2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="new_ability", detail="Flourish")
        ws.sync()
    assert support.fetch(Character, ch["id"]).specialty_ability == "Flourish"


def test_apply_advancement_needs_a_circle_advance(client):
    """Fixed (RULES_CHECK 14): a player could advance any number of times. Picks come
    from the Lightkeeper's circle advance, two at a time."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_advancement", choice="add_action", detail="read")
        assert ws.sync() == [_rejected("No advancement is waiting to be chosen.")]
    assert support.fetch(Character, ch["id"]).read == 0


def test_an_advanced_ability_still_works(client, dice):
    """Fixed (QUIRKS D12): an ability appended by an advancement, and the specialty's own
    before it, both pass the exact-name checks (here a roll mod and a soak)."""
    ch = support.forge(client, read=1, cunning_max=6, cunning_current=6, nerve_max=3,
                       specialty_ability="Dissection; Meticulous Notes; Compartmentalization")
    dice(3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=0, ability_mods=["Dissection", "Meticulous Notes"])
        roll = ws.sync()[0]["payload"]["roll"]
        assert (len(roll["dice"]), roll["dice"][0]["is_gilded"]) == (2, True)
        ws.send("resolve_gilded", action="read", chosen_type="regular")
        ws.sync()
        ws.send("take_mark", mark_type="brain")
        assert ws.sync()[0]["payload"]["ability"] == "Compartmentalization"


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


def test_two_train_spends_give_two_dice(client, dice):
    """Fixed: a second Train took a circle point and one of the player's two spends but
    gave no second die, because Train was a flag. Each Train is a die (rulebook p. 41),
    used one per roll."""
    camp, member, cid = _resource_setup(client, move=1)
    with support.ws_connect(client, member["id"]) as ws:
        ws.send("spend_resource", resource_type="train")
        ws.send("spend_resource", resource_type="train")
        updates = [m["payload"] for m in ws.sync() if m["type"] == "character_update"]
        assert updates[-1]["train_dice"] == 2
        for left in (1, 0):
            dice(3, 4)
            ws.send("roll", action="move", drive_spent=0, ability_mods=["Train"])
            msgs = ws.sync()
            assert len(msgs[0]["payload"]["roll"]["dice"]) == 2
            assert msgs[0]["payload"]["character"]["train_dice"] == left
        dice(5)
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Train"])  # none left
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
    assert support.fetch(Circle, cid).train == 0


def test_a_train_flag_saved_before_the_count_is_one_die(client, dice):
    ch = support.forge(client, move=1)
    support.update(Character, ch["id"], train_bonus=True, train_dice=0)
    dice(3, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["train_dice"] == 1
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Train"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 2
    row = support.fetch(Character, ch["id"])
    assert (row.train_bonus, row.train_dice) == (False, 0)


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
        # Refresh leaves once-per-assignment uses to the end of the assignment (RULES_CHECK 18)
        assert p["ability_uses"] == {"Steel Mind": 1}
        ws.send("spend_resource", resource_type="train")
        msgs = ws.sync()
        assert msgs[0]["payload"]["train_bonus"] is True
        assert msgs[2]["payload"]["message"] == f"{member['name']} used Train {EM} a Train d6 for a roll of their choice this assignment."
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


def test_spend_sees_the_gm_opening_spending(client):
    """Fixed: the socket kept the circle it loaded on connect, so a spend after the GM
    opened spending was silently ignored until the player's session committed
    something. Each message now reads the rows fresh (vtt/ws/endpoint.py)."""
    camp, member, cid = _resource_setup(client, editable=False)
    with support.ws_connect(client, member["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_toggle_resource_edit", role="GM")
        assert gm.sync()[0]["payload"]["resources_editable"] is True
        assert support.types(ws.drain()) == ["circle_update"]
        ws.send("spend_resource", resource_type="stitch")
        assert support.types(ws.sync()) == ["character_update", "circle_update", "activity_log"]
