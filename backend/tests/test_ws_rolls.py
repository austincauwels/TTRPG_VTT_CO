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


@pytest.mark.legacy_trust
def test_roll_for_another_character(client, dice):
    a = support.forge(client)
    b = support.forge(client, user_id=support.make_user().id, move=1, nerve_max=3, nerve_current=3)
    dice(2, 2)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("roll", action="move", drive_spent=1, character_id=b["id"])
        msg = wa.sync()[0]
        assert msg["payload"]["character_id"] == b["id"]
        assert msg["payload"]["character"]["id"] == b["id"]
    assert support.fetch(Character, b["id"]).nerve_current == 2


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
        assert msg["roll"]["drive_spent_key"] == "cunning"
        assert (msg["character"]["nerve_current"], msg["character"]["cunning_current"]) == (3, 2)


def test_ability_use_counter_never_counts(client, dice):
    """QUIRK: the per-roll use counter only tracks names that are not roll mods, so it never changes."""
    ch = support.forge(client, sense=1, specialty_ability="Extend Your Senses")
    dice(3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="sense", drive_spent=0, ability_mods=["Extend Your Senses"])
        assert ws.sync()[0]["payload"]["character"]["ability_uses"] == {}


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
