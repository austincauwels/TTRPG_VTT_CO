"""WebSocket dice: roll, resolve_gilded, burn_resistance, use_post_roll_ability.
The dice fixture fixes the faces engine.roll_dice will produce."""
import pytest

import engine
import support
from models import Character

EM, DOT = support.EM, support.DOT


def _d(*values, gilded_first=False):
    return [{"value": v, "is_gilded": gilded_first and i == 0} for i, v in enumerate(values)]


def test_roll_basic(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, nerve_max=3, nerve_current=3)
    other = support.active_member(client, camp)
    dice(5, 3, 2)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, other["id"]) as wo, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=1)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "activity_log"]
        result = msgs[0]["payload"]
        assert set(result) == {"character_id", "action", "roll", "character"}
        assert result["character_id"] == ch["id"]
        assert result["action"] == "move"
        assert result["roll"] == {"type": "standard", "dice": _d(5, 3, 2), "result": 5,
                                  "outcome": "mixed_success", "needs_gilded_choice": False,
                                  "drive_spent_key": "nerve", "action": "move"}
        assert result["character"]["nerve_current"] == 2
        assert msgs[1]["payload"] == {"message": f"{ch['name']} rolled move {EM} 5 {DOT} Mixed Success.",
                                      "log_type": "roll", "ink_color": engine.INK_COLORS[0]}
        assert support.types(wo.drain()) == ["activity_log"]
        assert support.types(gm.drain()) == ["activity_log"]
    assert support.fetch(Character, ch["id"]).nerve_current == 2


@pytest.mark.parametrize("action,drive", [("strike", "nerve"), ("control", "nerve"), ("hide", "cunning"),
                                          ("sneak", "cunning"), ("sway", "cunning"), ("survey", "intuition"),
                                          ("read", "intuition"), ("sense", "intuition")])
def test_roll_drive_category(client, dice, action, drive):
    ch = support.forge(client, **{action: 1, f"{drive}_max": 3, f"{drive}_current": 3})
    dice(6, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action=action, drive_spent=1)
        msgs = ws.sync()
        assert len(msgs[0]["payload"]["roll"]["dice"]) == 2  # rating 1 + 1 spent
        assert msgs[0]["payload"]["roll"]["drive_spent_key"] == drive
        assert msgs[0]["payload"]["roll"]["outcome"] == "full_success"
        assert msgs[0]["payload"]["character"][f"{drive}_current"] == 2


def test_roll_pool_capped_at_six(client, dice):
    ch = support.forge(client, move=3, nerve_max=9, nerve_current=9)
    dice(1, 1, 1, 1, 1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=5)
        roll = ws.sync()[0]["payload"]["roll"]
        assert len(roll["dice"]) == 6
    assert support.fetch(Character, ch["id"]).nerve_current == 4


def test_secret_roll_is_not_logged(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=1)
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=0, is_secret=True)
        assert support.types(ws.sync()) == ["roll_result"]
        assert gm.drain() == []


def test_zero_dice_roll_keeps_lower(client, dice):
    ch = support.forge(client)
    dice(2, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        roll = ws.sync()[0]["payload"]["roll"]
        assert roll == {"type": "zero", "dice": _d(2, 5), "result": 2, "outcome": "failure",
                        "needs_gilded_choice": False, "drive_spent_key": "nerve", "action": "move"}


def test_zero_dice_double_six_is_critical(client, dice):
    """QUIRK: on a zero-dice roll the lower die is the result, but two sixes still count as critical."""
    ch = support.forge(client)
    dice(6, 6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        assert ws.sync()[0]["payload"]["roll"]["outcome"] == "critical_success"


def test_two_sixes_critical(client, dice):
    ch = support.forge(client, move=2)
    dice(6, 6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        msgs = ws.sync()
        assert msgs[0]["payload"]["roll"]["outcome"] == "critical_success"
        assert msgs[1]["payload"]["message"] == f"{ch['name']} rolled move {EM} 6 {DOT} Critical Success."


def test_gilded_pool_needs_choice_then_resolve(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, nerve_max=3, nerve_current=2)
    dice(3, 5)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=0)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result"]
        assert msgs[0]["payload"]["roll"] == {
            "type": "standard", "dice": _d(3, 5, gilded_first=True), "needs_gilded_choice": True,
            "gilded_idx": 0, "gilded_value": 3, "highest_regular_idx": 1, "highest_regular_value": 5,
            "drive_spent_key": "nerve", "action": "move"}
        assert gm.drain() == []

        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=3)
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log", "character_update"]
        assert msgs[0]["payload"] == {
            "message": f"{ch['name']} rolled move {EM} 3 {DOT} Failure. [gilded {EM} nerve Drive refreshed]",
            "log_type": "roll", "ink_color": engine.INK_COLORS[0]}
        assert msgs[1]["payload"]["nerve_current"] == 3
        assert support.types(gm.drain()) == ["activity_log"]


def test_resolve_gilded_trusts_client_value_and_can_be_replayed(client):
    """QUIRK: no pending roll is stored; any value can be claimed at any time, and a
    6 is a full success, never critical."""
    ch = support.forge(client, nerve_max=3, nerve_current=0)
    with support.ws_connect(client, ch["id"]) as ws:
        for _ in range(2):
            ws.send("resolve_gilded", action="strike", chosen_type="gilded", chosen_value=6)
            msgs = ws.sync()
            assert msgs[0]["payload"]["message"].startswith(f"{ch['name']} rolled strike {EM} 6 {DOT} Full Success.")
        ws.send("resolve_gilded", action="strike", chosen_type="regular", chosen_value="5")
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log"]
        assert msgs[0]["payload"]["message"] == f"{ch['name']} rolled strike {EM} 5 {DOT} Mixed Success."
    assert support.fetch(Character, ch["id"]).nerve_current == 2


def test_resolve_gilded_bad_value_closes_socket(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value="six")
        assert support.wait_server_dropped(ch["id"])


def test_single_gilded_die_refreshes_drive(client, dice):
    ch = support.forge(client, move=1, gilded_move=True, nerve_max=3, nerve_current=1)
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "character_update", "activity_log"]
        roll = msgs[0]["payload"]["roll"]
        assert roll["auto_gilded_refresh"] is True
        assert roll["dice"] == _d(4, gilded_first=True)
        assert msgs[0]["payload"]["character"]["nerve_current"] == 1
        assert msgs[1]["payload"]["nerve_current"] == 2
        assert msgs[2]["payload"]["message"] == (
            f"{ch['name']} rolled move {EM} 4 {DOT} Mixed Success. [gilded {EM} nerve Drive refreshed]")


def test_secret_single_gilded_die_does_not_refresh(client, dice):
    ch = support.forge(client, move=1, gilded_move=True, nerve_max=3, nerve_current=1)
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0, is_secret=True)
        assert support.types(ws.sync()) == ["roll_result"]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_lightkeeper_roll_on_gm_socket(client, dice):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    dice(1, 4)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("roll", action="lk", drive_spent=2)
        msgs = gm.sync()
        assert support.types(msgs) == ["roll_result", "activity_log"]
        assert msgs[0]["payload"] == {"character_id": None, "action": "lk", "character": None, "roll": {
            "type": "standard", "dice": _d(1, 4), "result": 4, "outcome": "mixed_success",
            "needs_gilded_choice": False, "drive_spent_key": None, "action": "lk"}}
        assert msgs[1]["payload"] == {"message": f"Lightkeeper rolled {EM} 4 {DOT} Mixed Success.",
                                      "log_type": "roll", "ink_color": ""}
        assert support.types(wm.drain()) == ["activity_log"]


def test_roll_without_action_sends_roll_error(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", drive_spent=1)
        assert ws.sync() == [{"type": "roll_error", "payload": {"message": "roll action missing 'action' field"}}]


def test_negative_drive_spent_inflates_drive_then_errors(client):
    """QUIRK: a negative spend raises the drive above its max and is committed before
    the empty dice pool fails."""
    ch = support.forge(client, move=1, nerve_max=3, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=-3)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_error"]
        assert "max()" in msgs[0]["payload"]["message"]
    assert support.fetch(Character, ch["id"]).nerve_current == 4


def test_roll_bad_drive_spent_is_roll_error(client):
    ch = support.forge(client, move=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent="lots")
        assert support.types(ws.sync()) == ["roll_error"]


def test_roll_action_is_not_validated(client, dice):
    """QUIRK: any attribute name works as the action; nerve_max feeds the pool here."""
    ch = support.forge(client, nerve_max=3, nerve_current=3, intuition_max=3, intuition_current=3)
    dice(1, 2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="nerve_max", drive_spent=0)
        roll = ws.sync()[0]["payload"]["roll"]
        assert len(roll["dice"]) == 3
        assert roll["drive_spent_key"] == "intuition"


def test_roll_for_another_character_is_rejected(client):
    """Before tokens a socket could roll (and spend drive) for any character id. Not
    even the campaign's GM may roll for a player's character."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp)
    b = support.active_member(client, camp, move=1, nerve_max=3, nerve_current=3)
    rejected = {"type": "action_rejected", "payload": {"action": "roll", "status": 403, "detail": "Not allowed."}}
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("roll", action="move", drive_spent=1, character_id=b["id"])
        assert wa.sync() == [rejected]
        gm.send("roll", action="move", drive_spent=1, character_id=b["id"])
        assert gm.sync() == [rejected]
    assert support.fetch(Character, b["id"]).nerve_current == 3


def test_train_bonus_adds_a_die_once(client, dice):
    ch = support.forge(client, move=1)
    support.update(Character, ch["id"], train_bonus=True)
    dice(2, 6, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        roll = ws.sync()[0]["payload"]["roll"]
        assert len(roll["dice"]) == 2 and roll["result"] == 6
        ws.send("roll", action="move", drive_spent=0)
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
    assert support.fetch(Character, ch["id"]).train_bonus is False


def test_ability_mod_sharpshooter(client, dice):
    ch = support.forge(client, strike=1, nerve_max=3, nerve_current=3, specialty_ability="Sharpshooter")
    dice(1, 2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Sharpshooter"])
        msg = ws.sync()[0]["payload"]
        assert len(msg["roll"]["dice"]) == 3
        assert msg["character"]["nerve_current"] == 2


def test_ability_mod_must_be_owned_and_match_action(client, dice):
    ch = support.forge(client, strike=1, move=1, specialty_ability="Sharpshooter")
    dice(1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Sharpshooter"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Misdirection", "Unknown"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1


def test_ability_mod_gild_and_brain_cost(client, dice):
    ch = support.forge(client, read=2, role_ability="Back Against the Wall", specialty_ability="Dissection")
    dice(2, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=0, ability_mods=["Dissection", "Back Against the Wall"])
        msg = ws.sync()[0]["payload"]
        assert msg["roll"]["needs_gilded_choice"] is True
        assert msg["character"]["brain_marks"] == 1


def test_ability_mod_drive_substitution(client, dice):
    ch = support.forge(client, move=1, nerve_max=3, nerve_current=3, cunning_max=3, cunning_current=3,
                       role_ability="Cool Under Pressure")
    dice(3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=1, ability_mods=["Cool Under Pressure"])
        msg = ws.sync()[0]["payload"]
        assert len(msg["roll"]["dice"]) == 2
        assert msg["roll"]["drive_spent_key"] == "cunning"
        assert (msg["character"]["nerve_current"], msg["character"]["cunning_current"]) == (3, 2)


def test_ability_use_counter_never_counts(client, dice):
    """QUIRK: the per-roll use counter only tracks names that are not roll mods, so it never changes."""
    ch = support.forge(client, sense=1, intuition_max=3, specialty_ability="Extend Your Senses")
    dice(3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="sense", drive_spent=0, ability_mods=["Extend Your Senses"])
        msg = ws.sync()[0]["payload"]
        assert len(msg["roll"]["dice"]) == 2  # the mod applied: 1 rating + 1 resistance pip left
        assert msg["character"]["ability_uses"] == {}


def test_well_read_refunds_intuition_on_failure(client, dice):
    ch = support.forge(client, survey=0, intuition_max=3, intuition_current=3, role_ability="Well-Read")
    dice(2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="survey", drive_spent=1)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "character_update", "activity_log"]
        assert msgs[1]["payload"]["intuition_current"] == 3
        assert msgs[2]["payload"]["message"] == (
            f"{ch['name']} rolled survey {EM} 2 {DOT} Failure. [Well-Read {EM} 1 Intuition refunded]")


def test_burn_resistance(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, nerve_max=3, nerve_current=0)
    dice(6, 6)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("burn_resistance", action="move", drive_key="nerve")
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "activity_log"]
        assert msgs[0]["payload"]["roll"] == {
            "type": "standard", "dice": _d(6, 6), "result": 6, "outcome": "critical_success",
            "needs_gilded_choice": False, "action": "move", "is_resistance_roll": True}
        assert msgs[0]["payload"]["character"]["nerve_resistance_spent"] == 1
        assert msgs[1]["payload"]["message"] == f"{ch['name']} burned resistance on move {EM} 6 {DOT} Critical Success."
        assert support.types(gm.drain()) == ["activity_log"]
        ws.send("burn_resistance", action="move", drive_key="nerve")  # no pips left
        ws.send("burn_resistance", action="move")
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).nerve_resistance_spent == 1


def test_burn_resistance_gilded_choice_logs_question_mark(client, dice):
    ch = support.forge(client, sense=2, gilded_sense=True, intuition_max=3)
    dice(2, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("burn_resistance", action="sense", drive_key="intuition")
        msgs = ws.sync()
        assert msgs[0]["payload"]["roll"]["needs_gilded_choice"] is True
        assert msgs[1]["payload"]["message"] == f"{ch['name']} burned resistance on sense {EM} ? {DOT} ."


def test_post_roll_abilities(client):
    flourish = support.forge(client, cunning_max=3, cunning_current=3, role_ability="Flourish")
    with support.ws_connect(client, flourish["id"]) as ws:
        ws.send("use_post_roll_ability", ability="Flourish")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["cunning_current"] == 1
        assert msgs[1]["payload"]["message"] == f"{flourish['name']} used Flourish {EM} result pushed up one tier."
        ws.send("use_post_roll_ability", ability="Flourish")  # repeatable, floors at 0
        assert ws.sync()[0]["payload"]["cunning_current"] == 0
        ws.send("use_post_roll_ability", ability="Bending Spoons")  # not owned
        assert ws.sync() == []

    lfmm = support.forge(client, nerve_max=3, nerve_current=2, specialty_ability="Learn from My Mistakes")
    with support.ws_connect(client, lfmm["id"]) as ws:
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="nerve")
        msgs = ws.sync()
        assert msgs[0]["payload"]["nerve_current"] == 3
        assert msgs[1]["payload"]["message"] == f"{lfmm['name']} used Learn from My Mistakes {EM} refreshed 1 Nerve."
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="nerve")
        assert ws.sync()[0]["payload"]["nerve_current"] == 3  # capped
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="luck")
        assert ws.sync() == []

    spoons = support.forge(client, bleed_marks=2, role_ability="Bending Spoons")
    with support.ws_connect(client, spoons["id"]) as ws:
        for expected in (3, 3):
            ws.send("use_post_roll_ability", ability="Bending Spoons")
            msgs = ws.sync()
            assert msgs[0]["payload"]["bleed_marks"] == expected
            assert msgs[0]["payload"]["incapacitated"] is False
        assert msgs[1]["payload"]["message"] == (
            f"{spoons['name']} used Bending Spoons {EM} took 1 Bleed mark to upgrade the result.")


# --- every ABILITY_MOD_DEFS entry ---------------------------------------------
#
# Each case rolls with drive_spent=1 and a rating of 1 in the action, so the base
# pool is 2 dice. The drives have different sizes so a lambda that reads the wrong
# drive changes the count: nerve 3/3 (1 resistance pip), cunning 6/6 (2 pips),
# intuition 9/9 (3 pips). Rolls are secret, so only roll_result comes back.
# Columns: ability, action, dice in the pool, first die gilded, drive the spend
# came from, (nerve, cunning, intuition) currents afterwards, brain marks afterwards.

N3_C6_I9 = dict(nerve_max=3, nerve_current=3, cunning_max=6, cunning_current=6,
                intuition_max=9, intuition_current=9)

MOD_CASES = [
    ("Sweet Talk", "sneak", 3, True, "cunning", (3, 5, 9), 0),
    ("Open Book", "sway", 4, False, "cunning", (3, 5, 9), 0),
    ("Lie Detector", "sneak", 2, True, "cunning", (3, 5, 9), 0),
    ("Misdirection", "hide", 3, False, "cunning", (3, 5, 9), 0),
    ("Interrogation", "sneak", 4, False, "cunning", (3, 5, 9), 0),
    ("Inspection", "survey", 2, True, "intuition", (3, 6, 8), 0),
    ("Basic Training", "survey", 3, False, "intuition", (3, 6, 8), 0),
    ("Better Part of Valor", "control", 2, True, "nerve", (2, 6, 9), 0),
    ("Better Part of Valor", "move", 2, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "move", 2, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "strike", 2, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "control", 2, True, "nerve", (2, 6, 9), 0),
    ("Extend Your Senses", "sense", 5, False, "intuition", (3, 6, 8), 0),
    ("Meticulous Notes", "read", 3, False, "intuition", (3, 6, 8), 0),
    ("Sharpshooter", "strike", 4, False, "nerve", (1, 6, 9), 0),
    ("Dissection", "read", 2, True, "intuition", (3, 6, 8), 0),
    ("Born in the Shadows", "hide", 2, True, "cunning", (3, 5, 9), 0),
    ("Cool Under Pressure", "move", 2, False, "cunning", (3, 5, 9), 0),
    ("Cool Under Pressure", "read", 2, False, "cunning", (3, 5, 9), 0),
    ("Practiced Patter", "sway", 2, False, "intuition", (3, 6, 8), 0),
    ("Practiced Patter", "hide", 2, False, "intuition", (3, 6, 8), 0),
    ("Street Smarts", "survey", 2, False, "intuition", (3, 6, 8), 0),
    ("Back Against the Wall", "strike", 2, False, "nerve", (2, 6, 9), 1),
    ("Back Against the Wall", "sense", 2, False, "intuition", (3, 6, 8), 1),
]

# The same abilities on an action outside their list change nothing.
MOD_WRONG_ACTION = [
    ("Sweet Talk", "sway", "cunning"), ("Open Book", "sneak", "cunning"),
    ("Lie Detector", "hide", "cunning"), ("Misdirection", "sneak", "cunning"),
    ("Interrogation", "sway", "cunning"), ("Inspection", "read", "intuition"),
    ("Basic Training", "sense", "intuition"), ("Better Part of Valor", "strike", "nerve"),
    ("Tenacious", "hide", "cunning"), ("Extend Your Senses", "survey", "intuition"),
    ("Meticulous Notes", "survey", "intuition"), ("Sharpshooter", "move", "nerve"),
    ("Dissection", "sense", "intuition"), ("Born in the Shadows", "sneak", "cunning"),
    ("Practiced Patter", "sneak", "cunning"), ("Street Smarts", "read", "intuition"),
]

_AFTER_PLAIN_SPEND = {"nerve": (2, 6, 9), "cunning": (3, 5, 9), "intuition": (3, 6, 8)}


def _mod_roll(client, dice, ability, action, n_dice, **extra):
    ch = support.forge(client, **{action: 1, **N3_C6_I9, **extra}, specialty_ability=ability)
    dice(*([3] * n_dice))
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action=action, drive_spent=1, is_secret=True, ability_mods=[ability])
        msgs = ws.sync()
    assert support.types(msgs) == ["roll_result"]
    return msgs[0]["payload"]


@pytest.mark.parametrize("ability,action,n_dice,gilded,drive,currents,brain", MOD_CASES,
                         ids=[f"{c[0]}-{c[1]}" for c in MOD_CASES])
def test_every_ability_roll_mod(client, dice, ability, action, n_dice, gilded, drive, currents, brain):
    p = _mod_roll(client, dice, ability, action, n_dice)
    roll = p["roll"]
    assert len(roll["dice"]) == n_dice
    assert roll["dice"][0]["is_gilded"] is gilded
    assert roll["needs_gilded_choice"] is (gilded and n_dice > 1)
    assert roll.get("auto_gilded_refresh", False) is (gilded and n_dice == 1)
    assert roll["drive_spent_key"] == drive
    c = p["character"]
    assert (c["nerve_current"], c["cunning_current"], c["intuition_current"]) == currents
    assert c["brain_marks"] == brain
    assert c["ability_uses"] == {}


@pytest.mark.parametrize("ability,action,drive", MOD_WRONG_ACTION, ids=[c[0] for c in MOD_WRONG_ACTION])
def test_ability_roll_mod_ignored_for_other_actions(client, dice, ability, action, drive):
    p = _mod_roll(client, dice, ability, action, 2)
    assert [d["is_gilded"] for d in p["roll"]["dice"]] == [False, False]
    assert p["roll"]["drive_spent_key"] == drive
    c = p["character"]
    assert (c["nerve_current"], c["cunning_current"], c["intuition_current"]) == _AFTER_PLAIN_SPEND[drive]
    assert c["brain_marks"] == 0


@pytest.mark.parametrize("ability,action,spent,n_dice,gilded", [
    ("Sweet Talk", "sneak", 1, 3, False),    # one cunning pip left: the extra die stays, the gild goes
    ("Open Book", "sway", 1, 3, False),      # extra dice = cunning pips left
    ("Open Book", "sway", 2, 2, False),      # no pips left, no extra dice
    ("Open Book", "sway", 5, 2, False),      # overspent pips never take dice away
    ("Interrogation", "sneak", 2, 2, False),
])
def test_resistance_based_roll_mods_follow_pips_left(client, dice, ability, action, spent, n_dice, gilded):
    p = _mod_roll(client, dice, ability, action, n_dice, cunning_resistance_spent=spent)
    assert len(p["roll"]["dice"]) == n_dice
    assert p["roll"]["dice"][0]["is_gilded"] is gilded


def test_basic_training_and_extend_your_senses_read_their_own_drive(client, dice):
    p = _mod_roll(client, dice, "Basic Training", "survey", 2, nerve_resistance_spent=1)
    assert len(p["roll"]["dice"]) == 2
    p = _mod_roll(client, dice, "Extend Your Senses", "sense", 4, intuition_resistance_spent=1)
    assert len(p["roll"]["dice"]) == 4


def test_mods_stack_and_repeat(client, dice):
    """QUIRK: a mod listed twice is applied twice."""
    ch = support.forge(client, read=1, **N3_C6_I9, role_ability="Meticulous Notes", specialty_ability="Dissection")
    dice(3, 3, 3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=1, is_secret=True,
                ability_mods=["Meticulous Notes", "Dissection", "Meticulous Notes"])
        roll = ws.sync()[0]["payload"]["roll"]
    assert len(roll["dice"]) == 4  # 1 rating + 1 spent + 2 Meticulous Notes
    assert roll["needs_gilded_choice"] is True


# --- pool and drive arithmetic --------------------------------------------------

def test_overspent_drive_floors_at_zero_but_pool_counts_full_spend(client, dice):
    """QUIRK: spending more drive than the character has still adds the whole spend to the pool."""
    ch = support.forge(client, move=1, nerve_max=3, nerve_current=1)
    dice(1, 2, 3, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=3)
        p = ws.sync()[0]["payload"]
        assert len(p["roll"]["dice"]) == 4
        assert p["character"]["nerve_current"] == 0
    assert support.fetch(Character, ch["id"]).nerve_current == 0


def test_back_against_the_wall_brain_mark_capped_at_three(client, dice):
    ch = support.forge(client, strike=1, brain_marks=3, role_ability="Back Against the Wall")
    dice(2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Back Against the Wall"])
        p = ws.sync()[0]["payload"]
        assert p["character"]["brain_marks"] == 3
        assert p["character"]["incapacitated"] is False
    assert support.fetch(Character, ch["id"]).brain_marks == 3


def test_train_bonus_and_mod_dice_cap_at_six(client, dice):
    ch = support.forge(client, strike=3, nerve_max=9, nerve_current=9, specialty_ability="Sharpshooter")
    support.update(Character, ch["id"], train_bonus=True)
    dice(1, 1, 1, 1, 1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=3, ability_mods=["Sharpshooter"])
        p = ws.sync()[0]["payload"]
        assert len(p["roll"]["dice"]) == 6
        assert p["character"]["nerve_current"] == 5  # 1 for Sharpshooter, 3 spent
        assert p["character"]["train_bonus"] is False
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.train_bonus) == (5, False)


# --- which character a frame acts on ------------------------------------------

def test_character_id_zero_on_a_player_socket_is_rejected(client):
    """0 is not None, so there is no fallback to the socket's character, and then 0 is
    falsy, so no character is looked up. Before tokens that made a player's roll a
    Lightkeeper roll; now a character_id that names no character is 404."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=2, character_id=0)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 404, "detail": "Character not found"}}]
        assert gm.drain() == []
    assert support.fetch(Character, ch["id"]).nerve_current == 3
