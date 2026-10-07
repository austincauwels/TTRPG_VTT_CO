"""WebSocket dice: roll, resolve_gilded, burn_resistance, use_post_roll_ability.
The dice fixture fixes the faces engine.roll_dice will produce. The rest of the table
gets dice_thrown when the dice start tumbling on the roller's felt (vtt/ws/handlers/rolls.py)."""
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
        # The rest of the table: the dice as they start tumbling, then the line
        for other_socket in (wo, gm):
            seen = other_socket.drain()
            assert support.types(seen) == ["dice_thrown", "activity_log"]
            assert seen[0]["payload"] == {
                "character_id": ch["id"], "campaign_id": camp["id"], "name": ch["name"],
                "ink_color": engine.INK_COLORS[0], "action": "move", "rating": 2,
                "roll": result["roll"], "kept": None}
            assert seen[1] == msgs[1]
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
    """Fixed (RULES_CHECK 5): drive past the sixth die is not taken (the Rule of Six)."""
    ch = support.forge(client, move=3, nerve_max=9, nerve_current=9)
    dice(1, 1, 1, 1, 1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=5)
        roll = ws.sync()[0]["payload"]["roll"]
        assert len(roll["dice"]) == 6
    assert support.fetch(Character, ch["id"]).nerve_current == 6


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


def test_zero_dice_double_six_is_a_full_success(client, dice):
    """Fixed (RULES_CHECK 1): a zero-rating roll takes the lower die and can never be a
    critical success, even on two sixes (rulebook p. 11)."""
    ch = support.forge(client)
    dice(6, 6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        assert ws.sync()[0]["payload"]["roll"]["outcome"] == "full_success"


@pytest.mark.parametrize("faces,refreshed", [((2, 5), True), ((3, 3), True), ((5, 2), False)])
def test_zero_dice_gilded_die_refreshes_when_it_is_the_result(client, dice, faces, refreshed):
    """Fixed (RULES_CHECK 2): on a zero-rating gilded action the gilded die cannot be
    chosen, but when it is the lower die (the result) it still earns back drive (p. 11)."""
    ch = support.forge(client, gilded_move=True, nerve_max=3, nerve_current=1)
    dice(*faces)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        msgs = ws.sync()
        roll = msgs[0]["payload"]["roll"]
        assert roll["type"] == "zero" and roll["result"] == min(faces)
        assert roll["dice"][0]["is_gilded"] is True and roll["needs_gilded_choice"] is False
        assert roll.get("auto_gilded_refresh", False) is refreshed
        assert support.types(msgs) == (["roll_result", "character_update", "activity_log"] if refreshed
                                       else ["roll_result", "activity_log"])
    assert support.fetch(Character, ch["id"]).nerve_current == (2 if refreshed else 1)


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
        assert support.types(msgs) == ["roll_kept", "activity_log", "character_update"]
        # The roller's desk is told the kept die's result (its slip and post-roll prompts)
        assert msgs[0]["payload"] == {"character_id": ch["id"], "action": "move", "index": 0,
                                      "is_gilded": True, "value": 3, "outcome": "failure"}
        assert msgs[1]["payload"] == {
            "message": f"{ch['name']} rolled move {EM} 3 {DOT} Failure. [gilded {EM} nerve Drive refreshed]",
            "log_type": "roll", "ink_color": engine.INK_COLORS[0]}
        assert msgs[2]["payload"]["nerve_current"] == 3
        # The kept die starts the tumble: the GM's tray is shown the dice and which counts
        seen = gm.drain()
        assert support.types(seen) == ["dice_thrown", "activity_log"]
        thrown = seen[0]["payload"]
        assert thrown["kept"] == {"index": 0, "is_gilded": True, "value": 3}
        assert thrown["rating"] == 2
        assert thrown["roll"]["dice"] == _d(3, 5, gilded_first=True)
        assert (thrown["roll"]["needs_gilded_choice"], thrown["roll"]["result"], thrown["roll"]["outcome"]) == (
            False, 3, "failure")


def test_keeping_the_regular_die_names_it(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, sneak=3, gilded_sneak=True, cunning_max=3, cunning_current=1)
    dice(2, 4, 6)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="sneak", drive_spent=0)
        ws.sync()
        assert gm.drain() == []
        ws.send("resolve_gilded", action="sneak", chosen_type="regular", chosen_value=6)
        ws.sync()
        [thrown, line] = gm.drain()
        assert (thrown["type"], line["type"]) == ("dice_thrown", "activity_log")
        assert thrown["payload"]["kept"] == {"index": 2, "is_gilded": False, "value": 6}
        assert thrown["payload"]["roll"]["outcome"] == "full_success"


def test_a_kept_die_shows_dice_once(client, dice):
    """The held dice are the roll's: a second resolve, or a resolve after a newer roll,
    is refused (no roll is waiting) and tells the table nothing."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, strike=1, nerve_max=3)
    dice(3, 5)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=0)
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=3)
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=3)
        assert support.types(ws.sync()) == ["roll_result", "roll_kept", "activity_log", "character_update", "action_rejected"]
        assert support.types(gm.drain()) == ["dice_thrown", "activity_log"]
        dice(3, 5)
        ws.send("roll", action="move", drive_spent=0)
        dice(2)
        ws.send("roll", action="strike", drive_spent=0)
        ws.send("resolve_gilded", action="move", chosen_type="regular", chosen_value=5)
        assert support.types(ws.sync())[-1] == "action_rejected"
        assert support.types(gm.drain()) == ["dice_thrown", "activity_log"]


def test_a_secret_roll_shows_no_dice(client, dice):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, strike=2, nerve_max=3)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        dice(4, 2)
        ws.send("roll", action="strike", drive_spent=0, is_secret=True)
        dice(3, 5)
        ws.send("roll", action="move", drive_spent=0, is_secret=True)
        ws.send("resolve_gilded", action="move", chosen_type="regular", chosen_value=5)
        # the roller's own desk is told the kept die's result
        assert support.types(ws.sync()) == ["roll_result", "roll_result", "roll_kept"]
        # Fixed: a secret roll's choice is told to no one else, neither dice nor a line
        assert gm.drain() == []


def test_resolve_gilded_reads_the_held_dice_and_cannot_be_replayed(client, dice):
    """Fixed (QUIRKS D8): the kept die's value comes from the dice the server rolled, not
    from chosen_value, and a choice with no roll waiting is refused (409) and changes nothing."""
    ch = support.forge(client, move=2, gilded_move=True, nerve_max=3, nerve_current=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_gilded", action="strike", chosen_type="gilded", chosen_value=6)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_gilded", "status": 409, "detail": "No roll is waiting for a die to be kept. Roll again."}}]
        dice(2, 4)
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
        ws.send("resolve_gilded", action="strike", chosen_type="regular", chosen_value=6)  # not the roll waiting
        assert support.types(ws.sync()) == ["action_rejected"]
        ws.send("resolve_gilded", action="move", chosen_type="regular", chosen_value=6)
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_kept", "activity_log"]
        assert msgs[1]["payload"]["message"] == f"{ch['name']} rolled move {EM} 4 {DOT} Mixed Success."
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=6)
        assert support.types(ws.sync()) == ["action_rejected"]
    assert support.fetch(Character, ch["id"]).nerve_current == 0


def test_resolve_gilded_ignores_a_value_that_is_not_a_number(client, dice):
    """Fixed: a chosen_value that is not a number used to end the socket; it is ignored."""
    ch = support.forge(client, move=2, gilded_move=True)
    dice(5, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value="six")
        assert ws.sync()[1]["payload"]["message"].startswith(f"{ch['name']} rolled move {EM} 5 {DOT} Mixed Success.")
        assert support.server_sockets(ch["id"])


@pytest.mark.parametrize("chosen_type,faces,outcome", [
    ("gilded", (6, 6, 2), "critical_success"),
    ("regular", (2, 6, 6), "critical_success"),
    ("regular", (6, 5, 4), "mixed_success"),
    ("gilded", (3, 6, 6), "failure"),          # a kept 3 is a 3, whatever else was rolled
])
def test_resolve_gilded_counts_the_held_dice_for_a_critical(client, dice, chosen_type, faces, outcome):
    """Fixed (RULES_CHECK 3): two or more 6s with a 6 kept is a critical success (p. 10)."""
    ch = support.forge(client, move=3, gilded_move=True)
    dice(*faces)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
        ws.send("resolve_gilded", action="move", chosen_type=chosen_type)
        label = engine.OUTCOME_LABELS[outcome]
        kept, line = ws.sync()[:2]
        assert kept["payload"]["outcome"] == outcome
        assert f" {DOT} {label}." in line["payload"]["message"]


def test_two_gilds_roll_two_gilded_dice(client, dice):
    """Fixed (RULES_CHECK 4): a gilded action with a gilding ability (Born in the Shadows
    on Hide) rolls two gilded dice; the choice offers the better of them."""
    ch = support.forge(client, hide=3, gilded_hide=True, specialty_ability="Born in the Shadows",
                       cunning_max=3, cunning_current=1)
    dice(2, 5, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="hide", drive_spent=0, ability_mods=["Born in the Shadows"])
        roll = ws.sync()[0]["payload"]["roll"]
        assert [d["is_gilded"] for d in roll["dice"]] == [True, True, False]
        assert (roll["gilded_idx"], roll["gilded_value"], roll["highest_regular_idx"], roll["highest_regular_value"]) == (1, 5, 2, 4)
        ws.send("resolve_gilded", action="hide", chosen_type="gilded")
        msgs = ws.sync()
        assert msgs[1]["payload"]["message"] == (
            f"{ch['name']} rolled hide {EM} 5 {DOT} Mixed Success. [gilded {EM} cunning Drive refreshed]")
        assert msgs[2]["payload"]["cunning_current"] == 2


def test_every_die_gilded_takes_the_best_and_refreshes(client, dice):
    ch = support.forge(client, hide=1, gilded_hide=True, specialty_ability="Born in the Shadows",
                       cunning_max=3, cunning_current=1)
    dice(2, 6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="hide", drive_spent=1, ability_mods=["Born in the Shadows"])
        roll = ws.sync()[0]["payload"]["roll"]
    assert roll["dice"] == [{"value": 2, "is_gilded": True}, {"value": 6, "is_gilded": True}]
    assert (roll["needs_gilded_choice"], roll["result"], roll.get("auto_gilded_refresh")) == (False, 6, True)
    assert support.fetch(Character, ch["id"]).cunning_current == 1  # 1 spent, 1 earned back


def test_well_read_refunds_on_a_kept_die_of_three_or_less(client, dice):
    """Fixed (RULES_CHECK 6): Well-Read is checked on a gilded choice as on any roll."""
    ch = support.forge(client, read=1, gilded_read=True, specialty_ability="Well-Read",
                       intuition_max=6, intuition_current=4)
    dice(2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=1)
        ws.sync()
        ws.send("resolve_gilded", action="read", chosen_type="regular")
        msgs = ws.sync()
        assert msgs[1]["payload"]["message"].endswith("[Well-Read " + EM + " 1 Intuition refunded]")
        assert msgs[2]["payload"]["intuition_current"] == 4


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


def test_secret_single_gilded_die_refreshes_without_a_line(client, dice):
    """Fixed (RULES_CHECK 6): the gilded refresh follows the dice, secret or not; a
    secret roll still sends no log line."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=1, gilded_move=True, nerve_max=3, nerve_current=1)
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=0, is_secret=True)
        assert support.types(ws.sync()) == ["roll_result", "character_update"]
        assert gm.drain() == []
    assert support.fetch(Character, ch["id"]).nerve_current == 2


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
        seen = wm.drain()
        assert support.types(seen) == ["dice_thrown", "activity_log"]
        assert seen[0]["payload"] == {
            "character_id": None, "campaign_id": camp["id"], "name": "Lightkeeper", "ink_color": "",
            "action": "lk", "rating": None, "roll": msgs[0]["payload"]["roll"], "kept": None}


def test_roll_without_action_sends_roll_error(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", drive_spent=1)
        assert ws.sync() == [{"type": "roll_error", "payload": {"message": "roll action missing 'action' field"}}]


def test_a_roll_reads_the_drive_the_gm_just_set(client, dice):
    """Fixed: the player's socket kept the character it had loaded, so after the GM
    raised a drive the player's spend was refused, or a roll wrote the old value back."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=1, nerve_max=6, nerve_current=0)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("update_pen_font", pen_font="Kalam")  # the player's socket has loaded its row
        ws.sync()
        gm.send("update_drive", pool="nerve", value=4, character_id=ch["id"])
        gm.sync()
        ws.drain()
        dice(2, 3)
        ws.send("roll", action="move", drive_spent=1)
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 2
    assert support.fetch(Character, ch["id"]).nerve_current == 3


@pytest.mark.parametrize("spent", [-3, "-1", -1.5])
def test_negative_drive_spent_is_rejected(client, dice, spent):
    """Fixed (D15): a negative spend raised the drive above its max and was committed
    before the empty dice pool failed. It is now refused before anything changes, and
    the socket stays open for the next roll."""
    ch = support.forge(client, move=1, nerve_max=3, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=spent)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 422, "detail": "Drive spent cannot be negative."}}]
        assert support.fetch(Character, ch["id"]).nerve_current == 1
        dice(4, 2)
        ws.send("roll", action="move", drive_spent=1)
        assert support.types(ws.sync()) == ["roll_result", "activity_log"]
    assert support.fetch(Character, ch["id"]).nerve_current == 0


def test_negative_lightkeeper_roll_is_rejected(client):
    """The Lightkeeper's roll takes drive_spent as its pool, so a negative one is refused too."""
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("roll", action="Lightkeeper", drive_spent=-2)
        assert gm.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 422, "detail": "Drive spent cannot be negative."}}]


@pytest.mark.parametrize("raw", ['"lots"', "null", "Infinity", "-Infinity", "NaN"])
def test_roll_bad_drive_spent_is_roll_error(client, raw):
    """A drive_spent that is not a whole number gets roll_error and the socket stays open,
    including JSON's Infinity, which the negative-spend check must let through to the handler."""
    ch = support.forge(client, move=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text('{"type": "roll", "payload": {"action": "move", "drive_spent": %s}}' % raw)
        assert support.types(ws.sync()) == ["roll_error"]
        assert support.server_sockets(ch["id"])


def test_roll_action_must_be_an_action(client):
    """Fixed: any attribute name worked as the action (nerve_max fed the pool). A
    player's roll names one of the nine actions now; anything else is 422."""
    ch = support.forge(client, nerve_max=3, nerve_current=3, intuition_max=3, intuition_current=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="nerve_max", drive_spent=0)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 422, "detail": "Unknown action."}}]


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


def test_train_bonus_waits_for_the_roll_the_player_picks(client, dice):
    """Fixed (RULES_CHECK 17): Train went on the very next roll. The player picks the roll
    (the Train chip, "Train" in ability_mods), and it adds a die once."""
    ch = support.forge(client, move=1)
    support.update(Character, ch["id"], train_bonus=True)
    dice(3, 2, 6, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
        assert support.fetch(Character, ch["id"]).train_bonus is True
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Train"])
        roll = ws.sync()[0]["payload"]["roll"]
        assert len(roll["dice"]) == 2 and roll["result"] == 6
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Train"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
    assert support.fetch(Character, ch["id"]).train_bonus is False


def test_ability_mod_sharpshooter(client, dice):
    ch = support.forge(client, strike=1, control=1, nerve_max=3, nerve_current=1, specialty_ability="Sharpshooter")
    dice(1, 2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Sharpshooter"])
        msg = ws.sync()[0]["payload"]
        assert len(msg["roll"]["dice"]) == 3
        assert msg["character"]["nerve_current"] == 0
        # Fixed (RULES_CHECK 25): with no Nerve to pay, Sharpshooter does nothing
        dice(4)
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Sharpshooter"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1


def test_sharpshooter_works_on_control(client, dice):
    """Fixed (RULES_CHECK 25): shooting is a Control roll in the rulebook (p. 50)."""
    ch = support.forge(client, control=1, nerve_max=3, nerve_current=2, specialty_ability="Sharpshooter")
    dice(1, 2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="control", drive_spent=0, ability_mods=["Sharpshooter"])
        msg = ws.sync()[0]["payload"]
        assert len(msg["roll"]["dice"]) == 3
        assert msg["character"]["nerve_current"] == 1


def test_sharpshooter_and_spend_cannot_overdraw_nerve(client):
    ch = support.forge(client, strike=1, nerve_max=3, nerve_current=1, specialty_ability="Sharpshooter")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=1, ability_mods=["Sharpshooter"])
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 422, "detail": "Not enough Nerve for that roll."}}]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_ability_mod_must_be_owned_and_match_action(client, dice):
    ch = support.forge(client, strike=1, move=1, specialty_ability="Sharpshooter")
    dice(1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Sharpshooter"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Misdirection", "Unknown"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1


def test_ability_mod_gild_and_back_against_the_wall_without_nerve(client, dice):
    """Fixed (RULES_CHECK 21): Back Against the Wall only does something when Nerve is
    spent, so on a Focus roll it costs no Brain mark."""
    ch = support.forge(client, read=2, role_ability="Back Against the Wall", specialty_ability="Dissection")
    dice(2, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=0, ability_mods=["Dissection", "Back Against the Wall"])
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result"]
        assert msgs[0]["payload"]["roll"]["needs_gilded_choice"] is True
        assert msgs[0]["payload"]["character"]["brain_marks"] == 0


def test_back_against_the_wall_doubles_nerve_for_a_brain_mark(client, dice):
    """Fixed (RULES_CHECK 21): each Nerve spent is worth +2d, and the Brain mark is taken
    as any mark is: a fourth one incapacitates (it used to be capped at 3)."""
    ch = support.forge(client, strike=1, nerve_max=3, nerve_current=2, brain_marks=3,
                       role_ability="Back Against the Wall")
    dice(1, 2, 3, 4, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=2, ability_mods=["Back Against the Wall"])
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "activity_log", "trigger_scar", "activity_log"]
        assert len(msgs[0]["payload"]["roll"]["dice"]) == 5
        assert msgs[2]["payload"]["mark_type"] == "brain"
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.brain_marks, row.incapacitated) == (0, 0, True)


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


def test_roll_mods_record_no_uses(client, dice):
    """None of the roll abilities is limited per assignment, so a roll records no uses."""
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
        support.last_roll(ch["id"], "move")  # a burn answers a roll (p. 13)
        ws.send("burn_resistance", action="move", drive_key="nerve")
        msgs = ws.sync()
        assert support.types(msgs) == ["roll_result", "activity_log"]
        assert msgs[0]["payload"]["roll"] == {
            "type": "standard", "dice": _d(6, 6), "result": 6, "outcome": "critical_success",
            "needs_gilded_choice": False, "action": "move", "is_resistance_roll": True, "drive_spent_key": "nerve"}
        assert msgs[0]["payload"]["character"]["nerve_resistance_spent"] == 1
        assert msgs[1]["payload"]["message"] == f"{ch['name']} burned resistance on move {EM} 6 {DOT} Critical Success."
        seen = gm.drain()
        assert support.types(seen) == ["dice_thrown", "activity_log"]
        assert seen[0]["payload"]["roll"] == msgs[0]["payload"]["roll"]
        ws.send("burn_resistance", action="move", drive_key="nerve")  # no pips left
        ws.send("burn_resistance", action="move")
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).nerve_resistance_spent == 1


def test_burn_resistance_uses_the_actions_own_drive(client, dice):
    """Fixed (RULES_CHECK 8): the resistance burned is the action's drive's, whatever
    drive_key the client names; an unknown action is refused."""
    ch = support.forge(client, sway=1, cunning_max=3, nerve_max=3)
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws:
        support.last_roll(ch["id"], "sway")  # a burn answers a roll (p. 13)
        ws.send("burn_resistance", action="sway", drive_key="nerve")
        assert support.types(ws.sync()) == ["roll_result", "activity_log"]
        ws.send("burn_resistance", action="nerve_max")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "burn_resistance", "status": 422, "detail": "Unknown action."}}]
    fetched = support.fetch(Character, ch["id"])
    assert (fetched.cunning_resistance_spent, fetched.nerve_resistance_spent) == (1, 0)


@pytest.mark.parametrize("ability,action,fields,count", [
    ("Narrow Escape", "move", dict(move=1), 2),               # +1d (p. 29)
    ("Leverage", "sway", dict(sway=1, cunning_max=6), 3),     # + current Cunning resistance (p. 31)
    ("Press Conference", "sway", dict(sway=1), 2),            # +1d on Cunning rolls (p. 28)
    ("Press Conference", "sneak", dict(sneak=1), 2),          # Read is a Cunning action
    ("Press Conference", "hide", dict(hide=1), 2),
    ("Press Conference", "move", dict(move=1), 1),            # not a Cunning action: no die
])
def test_narrow_escape_and_leverage_add_their_dice(client, dice, ability, action, fields, count):
    ch = support.forge(client, specialty_ability=ability, **fields)
    dice(*([2] * count))
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action=action, drive_spent=0, ability_mods=[ability])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == count


def test_a_burn_answers_a_roll_of_that_action(client, dice):
    """Rulebook p. 13: "Any time you don't like the result of your roll, you may choose to
    burn 1 resistance point". A burn with no roll, or after a roll of another action, is
    refused and spends nothing (it used to reroll any action at any time)."""
    ch = support.forge(client, move=1, strike=1, nerve_max=6)
    refused = [{"type": "action_rejected", "payload": {
        "action": "burn_resistance", "status": 409, "detail": "Burn a resistance after a roll of that action."}}]
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("burn_resistance", action="move")
        assert ws.sync() == refused
        dice(2)
        ws.send("roll", action="strike", drive_spent=0)
        ws.sync()
        ws.send("burn_resistance", action="move")
        assert ws.sync() == refused
        dice(3)
        ws.send("burn_resistance", action="strike")
        assert ws.sync()[0]["payload"]["roll"]["is_resistance_roll"] is True
    assert support.fetch(Character, ch["id"]).nerve_resistance_spent == 1


def test_a_burn_answers_only_the_newest_roll(client, dice):
    """A roll waiting for its gilded die to be kept replaces the last one: a burn for an
    older roll's action is refused and the waiting choice is kept (it used to reroll the
    older roll and drop the choice). Once the die is kept, the burn answers it."""
    ch = support.forge(client, strike=1, move=2, gilded_move=True, nerve_max=6)
    refused = [{"type": "action_rejected", "payload": {
        "action": "burn_resistance", "status": 409, "detail": "Burn a resistance after a roll of that action."}}]
    with support.ws_connect(client, ch["id"]) as ws:
        dice(2)
        ws.send("roll", action="strike", drive_spent=0)
        ws.sync()
        dice(3, 5)
        ws.send("roll", action="move", drive_spent=0)
        assert ws.sync()[0]["payload"]["roll"]["needs_gilded_choice"] is True
        ws.send("burn_resistance", action="strike")
        assert ws.sync() == refused
        ws.send("resolve_gilded", action="move", chosen_type="regular")
        assert support.types(ws.sync())[0] == "roll_kept"
        dice(4, 6)
        ws.send("burn_resistance", action="move")
        assert ws.sync()[0]["payload"]["roll"]["is_resistance_roll"] is True
    assert support.fetch(Character, ch["id"]).nerve_resistance_spent == 1


def test_flourish_follows_a_cunning_action_paid_in_intuition(client, dice):
    """Flourish works "on a roll where you could spend Cunning" (p. 28). A Hide roll paid
    in Intuition with Practiced Patter is still a Cunning action, so it counts (the
    server used to read only the drive the roll spent)."""
    ch = support.forge(client, hide=1, cunning_max=3, cunning_current=3, intuition_max=3, intuition_current=3,
                       role_ability="Flourish", specialty_ability="Practiced Patter")
    dice(2, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="hide", drive_spent=1, ability_mods=["Practiced Patter"])
        assert ws.sync()[0]["payload"]["roll"]["outcome"] == "failure"
        ws.send("use_post_roll_ability", ability="Flourish")
        assert ws.sync()[-1]["payload"]["message"].endswith("to Mixed Success.")
    row = support.fetch(Character, ch["id"])
    assert (row.intuition_current, row.cunning_current) == (2, 1)


def test_a_zero_roll_with_two_gilds_gilds_both_dice(client, dice):
    """Rulebook p. 11: on a zero rating, "if any of your dice are gilded" and the gilded
    die is the lowest, drive comes back. A gilded Survey with Inspection gilds both dice,
    so the lower one always refreshes (only the first die could be gilded before)."""
    ch = support.forge(client, survey=0, gilded_survey=True, specialty_ability="Inspection",
                       intuition_max=3, intuition_current=1)
    dice(5, 2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="survey", drive_spent=0, ability_mods=["Inspection"])
        roll = ws.sync()[0]["payload"]["roll"]
        assert [(d["value"], d["is_gilded"]) for d in roll["dice"]] == [(5, True), (2, True)]
        assert (roll["type"], roll["result"], roll.get("auto_gilded_refresh")) == ("zero", 2, True)
    assert support.fetch(Character, ch["id"]).intuition_current == 2


def test_a_gilded_die_refreshes_the_actions_own_drive(client, dice):
    """Rulebook p. 8: taking the gilded result refreshes "the drive that encompasses that
    action". A gilded Move roll paid in Cunning (Cool Under Pressure) refreshes Nerve; it
    used to refresh the drive the roll spent."""
    ch = support.forge(client, move=2, gilded_move=True, nerve_max=3, nerve_current=1,
                       cunning_max=3, cunning_current=3, role_ability="Cool Under Pressure")
    dice(3, 5, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=1, ability_mods=["Cool Under Pressure"])
        ws.sync()
        ws.send("resolve_gilded", action="move", chosen_type="gilded")
        msgs = ws.sync()
        assert msgs[1]["payload"]["message"].endswith(f"[gilded {EM} nerve Drive refreshed]")
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.cunning_current) == (2, 2)


def test_a_gilded_reroll_earns_back_drive(client, dice):
    """Fixed: a resistance reroll ignored the gilded die's refresh (rulebook p. 8). On a
    gilded action rated 0 the reroll is two dice taking the lower (p. 13); when the gilded
    die is that lower one, 1 drive comes back, as on any roll."""
    ch = support.forge(client, move=0, gilded_move=True, nerve_max=3, nerve_current=1)
    dice(2, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        support.last_roll(ch["id"], "move")  # a burn answers a roll (p. 13)
        ws.send("burn_resistance", action="move")
        msgs = ws.sync()
        roll = msgs[0]["payload"]["roll"]
        assert (roll["type"], roll["result"], roll["drive_spent_key"]) == ("zero", 2, "nerve")
        assert msgs[0]["payload"]["character"]["nerve_current"] == 2
        assert msgs[1]["payload"]["message"].endswith(f"[gilded {EM} nerve Drive refreshed]")
    assert support.fetch(Character, ch["id"]).nerve_current == 2


def test_burn_resistance_gilded_choice_logs_the_kept_die(client, dice):
    """Fixed: a resistance reroll that waits for a choice says only that resistance was
    burned; the kept die's line follows from resolve_gilded."""
    ch = support.forge(client, sense=2, gilded_sense=True, intuition_max=3)
    dice(2, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        support.last_roll(ch["id"], "sense")  # a burn answers a roll (p. 13)
        ws.send("burn_resistance", action="sense", drive_key="intuition")
        msgs = ws.sync()
        assert msgs[0]["payload"]["roll"]["needs_gilded_choice"] is True
        assert msgs[1]["payload"]["message"] == f"{ch['name']} burned resistance on sense."
        ws.send("resolve_gilded", action="sense", chosen_type="regular")
        assert ws.sync()[1]["payload"]["message"] == f"{ch['name']} rolled sense {EM} 4 {DOT} Mixed Success."


def test_post_roll_abilities_check_the_last_roll(client, dice):
    """Fixed (RULES_CHECK 28): each post-roll ability is checked against the last roll
    and works once on it."""
    flourish = support.forge(client, sneak=1, cunning_max=6, cunning_current=6, role_ability="Flourish")
    with support.ws_connect(client, flourish["id"]) as ws:
        ws.send("use_post_roll_ability", ability="Flourish")  # no roll yet
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "use_post_roll_ability", "status": 409,
            "detail": "Flourish needs a failed or mixed roll that could take Cunning, and 2 Cunning to spend."}}]
        dice(2)
        ws.send("roll", action="sneak", drive_spent=0)
        ws.sync()
        ws.send("use_post_roll_ability", ability="Flourish")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["cunning_current"] == 4
        assert msgs[1]["payload"]["message"] == (
            f"{flourish['name']} used Flourish {EM} result pushed up one tier, to Mixed Success.")
        ws.send("use_post_roll_ability", ability="Flourish")  # once per roll
        assert support.types(ws.sync()) == ["action_rejected"]
        ws.send("use_post_roll_ability", ability="Bending Spoons")  # not owned
        assert ws.sync() == []

    lfmm = support.forge(client, move=1, nerve_max=3, nerve_current=2, specialty_ability="Learn from My Mistakes")
    with support.ws_connect(client, lfmm["id"]) as ws:
        dice(5)
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="nerve")
        assert ws.sync()[0]["payload"]["detail"] == "Learn from My Mistakes needs a roll of 3 or less."
        dice(3)
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="luck")
        assert ws.sync() == []
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="nerve")
        msgs = ws.sync()
        assert msgs[0]["payload"]["nerve_current"] == 3
        assert msgs[1]["payload"]["message"] == f"{lfmm['name']} used Learn from My Mistakes {EM} refreshed 1 Nerve."
        ws.send("use_post_roll_ability", ability="Learn from My Mistakes", drive="nerve")
        assert support.types(ws.sync()) == ["action_rejected"]

    spoons = support.forge(client, sense=1, move=1, bleed_marks=2, role_ability="Bending Spoons")
    with support.ws_connect(client, spoons["id"]) as ws:
        dice(4)
        ws.send("roll", action="move", drive_spent=0)  # not a Sense roll
        ws.sync()
        ws.send("use_post_roll_ability", ability="Bending Spoons")
        assert support.types(ws.sync()) == ["action_rejected"]
        dice(5)
        ws.send("roll", action="sense", drive_spent=0)
        ws.sync()
        ws.send("use_post_roll_ability", ability="Bending Spoons")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert (msgs[0]["payload"]["bleed_marks"], msgs[0]["payload"]["incapacitated"]) == (3, False)
        assert msgs[1]["payload"]["message"] == (
            f"{spoons['name']} used Bending Spoons {EM} took 1 Bleed mark to upgrade the result.")


def test_bending_spoons_fourth_mark_incapacitates(client, dice):
    """Fixed (RULES_CHECK 10): the Bleed mark used to be capped at 3."""
    ch = support.forge(client, sense=1, bleed_marks=3, role_ability="Bending Spoons")
    dice(4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="sense", drive_spent=0)
        ws.sync()
        ws.send("use_post_roll_ability", ability="Bending Spoons")
        assert support.types(ws.sync()) == ["trigger_scar", "activity_log", "activity_log"]
    assert support.fetch(Character, ch["id"]).incapacitated is True


def test_flourish_after_a_kept_die(client, dice):
    """The last roll is the kept die's result when a gilded roll waited for a choice."""
    ch = support.forge(client, hide=2, gilded_hide=True, cunning_max=3, cunning_current=3, role_ability="Flourish")
    dice(2, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="hide", drive_spent=0)
        ws.sync()
        ws.send("resolve_gilded", action="hide", chosen_type="regular")
        ws.sync()
        ws.send("use_post_roll_ability", ability="Flourish")
        assert ws.sync()[1]["payload"]["message"].endswith("to Full Success.")


def test_first_drive_point_worth_two_dice(client, dice):
    """Fixed (RULES_CHECK 26): Misdirection's +1d needs Cunning spent; Lie Detector and
    Better Part of Valor add it too, with their gild."""
    ch = support.forge(client, hide=1, cunning_max=6, cunning_current=6, specialty_ability="Misdirection")
    dice(3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="hide", drive_spent=0, ability_mods=["Misdirection"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
        dice(3, 3, 3)
        ws.send("roll", action="hide", drive_spent=1, ability_mods=["Misdirection"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 3


def test_ability_conditions_are_checked(client, dice):
    """Fixed (RULES_CHECK 25): Meticulous Notes needs 2 Cunning resistance left, and
    Tenacious needs a Bleed mark."""
    notes = support.forge(client, read=1, cunning_max=3, specialty_ability="Meticulous Notes")
    dice(3)
    with support.ws_connect(client, notes["id"]) as ws:
        ws.send("roll", action="read", drive_spent=0, ability_mods=["Meticulous Notes"])
        assert len(ws.sync()[0]["payload"]["roll"]["dice"]) == 1
    tough = support.forge(client, move=2, bleed_marks=0, specialty_ability="Tenacious")
    dice(3, 3)
    with support.ws_connect(client, tough["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Tenacious"])
        roll = ws.sync()[0]["payload"]["roll"]
        assert [d["is_gilded"] for d in roll["dice"]] == [False, False]


def test_street_smarts_spends_the_drive_named(client, dice):
    """Fixed (RULES_CHECK 27): Street Smarts lets a Survey roll spend any drive, named
    in the roll's "drive"."""
    ch = support.forge(client, survey=1, nerve_max=3, nerve_current=3, intuition_max=3, intuition_current=3,
                       specialty_ability="Street Smarts")
    dice(3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="survey", drive_spent=1, drive="nerve", ability_mods=["Street Smarts"])
        p = ws.sync()[0]["payload"]
        assert p["roll"]["drive_spent_key"] == "nerve"
        assert (p["character"]["nerve_current"], p["character"]["intuition_current"]) == (2, 3)


def test_overspending_drive_is_refused(client):
    """Fixed (RULES_CHECK 5): a spend larger than the drive holds is refused, not floored."""
    ch = support.forge(client, move=1, nerve_max=3, nerve_current=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=3)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 422, "detail": "Not enough Nerve for that roll."}}]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


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
    ("Lie Detector", "sneak", 3, True, "cunning", (3, 5, 9), 0),       # first Cunning +2d (RULES_CHECK 26)
    ("Misdirection", "hide", 3, False, "cunning", (3, 5, 9), 0),
    ("Interrogation", "sneak", 4, False, "cunning", (3, 5, 9), 0),
    ("Inspection", "survey", 2, True, "intuition", (3, 6, 8), 0),
    ("Basic Training", "survey", 3, False, "intuition", (3, 6, 8), 0),
    ("Better Part of Valor", "control", 3, True, "nerve", (2, 6, 9), 0),  # first Nerve +2d
    ("Better Part of Valor", "move", 3, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "move", 2, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "strike", 2, True, "nerve", (2, 6, 9), 0),
    ("Tenacious", "control", 2, True, "nerve", (2, 6, 9), 0),
    ("Extend Your Senses", "sense", 5, False, "intuition", (3, 6, 8), 0),
    ("Meticulous Notes", "read", 3, False, "intuition", (3, 6, 8), 0),
    ("Sharpshooter", "strike", 4, False, "nerve", (1, 6, 9), 0),
    ("Sharpshooter", "control", 4, False, "nerve", (1, 6, 9), 0),         # shooting is Control (p. 50)
    ("Dissection", "read", 2, True, "intuition", (3, 6, 8), 0),
    ("Born in the Shadows", "hide", 2, True, "cunning", (3, 5, 9), 0),
    ("Cool Under Pressure", "move", 2, False, "cunning", (3, 5, 9), 0),
    ("Cool Under Pressure", "read", 2, False, "cunning", (3, 5, 9), 0),
    ("Practiced Patter", "sway", 2, False, "intuition", (3, 6, 8), 0),
    ("Practiced Patter", "hide", 2, False, "intuition", (3, 6, 8), 0),
    ("Street Smarts", "survey", 2, False, "intuition", (3, 6, 8), 0),
    ("Back Against the Wall", "strike", 3, False, "nerve", (2, 6, 9), 1),  # Nerve worth +2d, a Brain mark
    ("Back Against the Wall", "sense", 2, False, "intuition", (3, 6, 8), 0),  # no Nerve spent: nothing
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


# What an ability needs on the sheet to apply (RULES_CHECK 25): Tenacious a Bleed mark
MOD_FIELDS = {"Tenacious": {"bleed_marks": 1}}


def _mod_roll(client, dice, ability, action, n_dice, **extra):
    fields = {action: 1, **N3_C6_I9, **MOD_FIELDS.get(ability, {}), **extra}
    ch = support.forge(client, **fields, specialty_ability=ability)
    dice(*([3] * n_dice))
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action=action, drive_spent=1, is_secret=True, ability_mods=[ability])
        msgs = ws.sync()
    # A secret roll answers with its result alone; Back Against the Wall's mark follows it
    assert support.types(msgs)[0] == "roll_result"
    assert all(t == "character_update" for t in support.types(msgs)[1:])
    payload = dict(msgs[0]["payload"])
    if len(msgs) > 1:
        payload["character"] = msgs[-1]["payload"]
    return payload


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


def test_mods_stack_but_do_not_repeat(client, dice):
    """Fixed (RULES_CHECK 29): a mod listed twice is applied once."""
    ch = support.forge(client, read=1, **N3_C6_I9, role_ability="Meticulous Notes", specialty_ability="Dissection")
    dice(3, 3, 3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=1, is_secret=True,
                ability_mods=["Meticulous Notes", "Dissection", "Meticulous Notes"])
        roll = ws.sync()[0]["payload"]["roll"]
    assert len(roll["dice"]) == 3  # 1 rating + 1 spent + 1 Meticulous Notes
    assert roll["needs_gilded_choice"] is True


# --- pool and drive arithmetic --------------------------------------------------

def test_train_bonus_and_mod_dice_cap_at_six(client, dice):
    """Free dice fill the pool first, and drive past the sixth die is not taken: rating 3,
    Sharpshooter +2 and Train +1 make six, so the 3 Nerve offered are not spent."""
    ch = support.forge(client, strike=3, nerve_max=9, nerve_current=9, specialty_ability="Sharpshooter")
    support.update(Character, ch["id"], train_bonus=True)
    dice(1, 1, 1, 1, 1, 1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=3, ability_mods=["Sharpshooter", "Train"])
        p = ws.sync()[0]["payload"]
        assert len(p["roll"]["dice"]) == 6
        assert p["character"]["nerve_current"] == 8  # 1 for Sharpshooter, none spent
        assert p["character"]["train_bonus"] is False
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.train_bonus) == (8, False)


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


def test_back_against_the_wall_without_a_spend_takes_no_mark(client, dice):
    ch = support.forge(client, strike=1, brain_marks=3, role_ability="Back Against the Wall")
    dice(2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="strike", drive_spent=0, ability_mods=["Back Against the Wall"])
        p = ws.sync()[0]["payload"]
        assert (p["character"]["brain_marks"], p["character"]["incapacitated"]) == (3, False)
    assert support.fetch(Character, ch["id"]).brain_marks == 3
