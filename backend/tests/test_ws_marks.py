"""WebSocket harm: take_mark, resolve_ability_mark, intercept_mark, apply_scar, revive_character."""
import pytest

import engine
import support
from models import Character

EM = support.EM


def test_take_mark_plain(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=1)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("take_mark", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update"]
        assert msgs[0]["payload"]["body_marks"] == 2
        assert gm.drain() == []
    assert support.fetch(Character, ch["id"]).body_marks == 2


def test_take_mark_without_type_is_ignored(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark")
        assert ws.sync() == []


def test_take_mark_unknown_type_creates_nothing(client):
    """QUIRK: mark_type is not validated; an unknown track is set on the object only."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="soul")
        assert support.types(ws.sync()) == ["character_update"]


def test_fourth_mark_incapacitates(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, brain_marks=3)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("take_mark", mark_type="brain")
        msgs = ws.sync()
        assert support.types(msgs) == ["trigger_scar", "activity_log"]
        assert msgs[0]["payload"]["character_id"] == ch["id"]
        assert msgs[0]["payload"]["mark_type"] == "brain"
        assert msgs[0]["payload"]["character"]["brain_marks"] == 0
        assert msgs[0]["payload"]["character"]["incapacitated"] is True
        assert msgs[1]["payload"] == {"message": f"{ch['name']} has been incapacitated!",
                                      "log_type": "danger", "ink_color": engine.INK_COLORS[0]}
        assert support.types(gm.drain()) == ["activity_log"]
    row = support.fetch(Character, ch["id"])
    assert (row.brain_marks, row.incapacitated) == (0, True)


def test_soak_offer_stops_the_mark(client):
    """QUIRK: with a soak ability available the mark is not applied; it only lands if the
    player accepts the soak (which does not apply it either), so declining loses it."""
    ch = support.forge(client, body_marks=1, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        assert ws.sync() == [{"type": "ability_mark_offer", "payload": {
            "ability": "In the Trenches", "mark_type": "body", "character_id": ch["id"],
            "options": [{"ability": "In the Trenches", "resist_key": "cunning"}], "action": "soak"}}]
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_soak_skipped_without_resistance_or_after_use(client):
    no_pips = support.forge(client, cunning_max=2, specialty_ability="In the Trenches")
    used = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    support.update(Character, used["id"], ability_uses={"In the Trenches": 1})
    for ch in (no_pips, used):
        with support.ws_connect(client, ch["id"]) as ws:
            ws.send("take_mark", mark_type="body")
            assert support.types(ws.sync()) == ["character_update"]


def test_brain_soak_offers_list_every_option(client):
    ch = support.forge(client, nerve_max=3, intuition_max=3,
                       role_ability="Compartmentalization", specialty_ability="Steel Mind")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="brain")
        [msg] = ws.sync()
        assert msg["payload"]["ability"] == "Compartmentalization"
        assert msg["payload"]["options"] == [{"ability": "Compartmentalization", "resist_key": "nerve"},
                                             {"ability": "Steel Mind", "resist_key": "intuition"}]


def test_back_against_the_wall_always_blocks_brain_marks(client):
    """QUIRK: Back Against the Wall is always offered as a soak, has no handler, and so a
    character with it never takes a brain mark."""
    ch = support.forge(client, role_ability="Back Against the Wall")
    with support.ws_connect(client, ch["id"]) as ws:
        for _ in range(2):
            ws.send("take_mark", mark_type="brain")
            [msg] = ws.sync()
            assert msg["payload"]["options"] == [{"ability": "Back Against the Wall", "resist_key": None}]
        ws.send("resolve_ability_mark", ability="Back Against the Wall", choice="soak")
        assert ws.sync() == []
    assert support.fetch(Character, ch["id"]).brain_marks == 0


def test_death_defy_offer_only_from_enemy(client):
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed", is_from_enemy=True)
        assert ws.sync() == [{"type": "ability_mark_offer", "payload": {
            "ability": "Death Defy", "mark_type": "bleed", "character_id": ch["id"], "action": "escape"}}]
        ws.send("take_mark", mark_type="bleed")
        assert ws.sync()[0]["payload"]["bleed_marks"] == 1


def test_endurance_crashes_on_missing_import(client):
    """QUIRK (bug D1): the Endurance branch calls secrets.randbelow but main.py never
    imports secrets; the NameError ends the socket and the mark is not applied."""
    ch = support.forge(client, body_marks=3, nerve_max=3, specialty_ability="Endurance")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        assert support.wait_server_dropped(ch["id"])
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.incapacitated) == (3, False)


def test_endurance_without_resistance_just_incapacitates(client):
    ch = support.forge(client, body_marks=3, nerve_max=2, specialty_ability="Endurance")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        assert support.types(ws.sync()) == ["trigger_scar", "activity_log"]


def test_let_them_in_and_adrenaline_rush_offers(client):
    ch = support.forge(client, role_ability="Let Them In", specialty_ability="Adrenaline Rush")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "ability_mark_offer", "ability_mark_offer"]
        assert msgs[1]["payload"] == {"ability": "Let Them In", "mark_type": "bleed",
                                      "character_id": ch["id"], "action": "info"}
        assert msgs[2]["payload"] == {"ability": "Adrenaline Rush", "mark_type": "bleed",
                                      "character_id": ch["id"], "action": "drive_refresh"}


def test_intercept_offers_go_to_eligible_campaign_members(client):
    camp = support.new_campaign(client)
    hurt = support.active_member(client, camp)
    guard = support.active_member(client, camp, nerve_current=1, role_ability="Behind Me")
    tired_guard = support.active_member(client, camp, nerve_current=0, role_ability="Behind Me")
    seer = support.active_member(client, camp, intuition_max=3, specialty_ability="Premonitions")
    outsider = support.forge(client, nerve_current=1, role_ability="Behind Me")
    with support.ws_connect(client, hurt["id"]) as wh, support.ws_connect(client, guard["id"]) as wg, \
            support.ws_connect(client, tired_guard["id"]) as wt, support.ws_connect(client, seer["id"]) as wsr, \
            support.ws_connect(client, outsider["id"]) as wo:
        wh.send("take_mark", mark_type="body")
        wh.sync()
        assert wg.drain() == [{"type": "ability_intercept_offer", "payload": {
            "ability": "Behind Me", "mark_type": "body", "character_id": hurt["id"],
            "character_name": hurt["name"], "action": "intercept"}}]
        assert wsr.drain() == [{"type": "ability_intercept_offer", "payload": {
            "ability": "Premonitions", "mark_type": "body", "character_id": hurt["id"],
            "character_name": hurt["name"], "action": "soak"}}]
        assert wt.drain() == [] and wo.drain() == []


def test_resolve_adrenaline_rush_is_replayable(client):
    """QUIRK: no pending offer is stored, so the refresh can be claimed repeatedly."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, nerve_max=3, nerve_current=0, role_ability="Adrenaline Rush")
    with support.ws_connect(client, ch["id"]) as ws:
        for expected in (1, 2, 3, 3):
            ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="nerve")
            msgs = ws.sync()
            assert support.types(msgs) == ["character_update", "activity_log"]
            assert msgs[0]["payload"]["nerve_current"] == expected
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Adrenaline Rush {EM} refreshed 1 Nerve."
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="luck")
        ws.send("resolve_ability_mark", ability="Steel Mind")  # not owned
        assert ws.sync() == []


def test_resolve_soak_spends_resistance_and_counts_use(client):
    ch = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="In the Trenches")
        msgs = ws.sync()
        assert msgs[0]["payload"]["cunning_resistance_spent"] == 1
        assert msgs[0]["payload"]["ability_uses"] == {"In the Trenches": 1}
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used In the Trenches {EM} soaked the mark."
        ws.send("resolve_ability_mark", ability="In the Trenches")  # no pip check here
        assert ws.sync()[0]["payload"]["cunning_resistance_spent"] == 2


def test_resolve_death_defy(client):
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="Death Defy")
        msgs = ws.sync()
        assert msgs[0]["payload"]["ability_uses"] == {"Death Defy": 1}
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Death Defy {EM} escaped unscathed!"
        ws.send("take_mark", mark_type="body", is_from_enemy=True)  # used up: mark lands
        assert support.types(ws.sync()) == ["character_update"]


def test_intercept_behind_me(client):
    camp = support.new_campaign(client)
    target = support.active_member(client, camp, body_marks=2)
    guard = support.active_member(client, camp, nerve_current=2, body_marks=0,
                                  role_ability="Behind Me", specialty_ability="Adrenaline Rush")
    with support.ws_connect(client, guard["id"]) as wg, support.ws_connect(client, target["id"]) as wt, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update", "ability_mark_offer"]
        assert msgs[0]["payload"]["message"] == f"{guard['name']} used Behind Me to intercept a mark for {target['name']}!"
        assert msgs[1]["payload"]["body_marks"] == 1
        assert msgs[1]["payload"]["nerve_current"] == 1
        assert msgs[2]["payload"] == {"ability": "Adrenaline Rush", "mark_type": "body",
                                      "character_id": guard["id"], "action": "drive_refresh"}
        target_msgs = wt.drain()
        assert support.types(target_msgs) == ["character_update", "activity_log"]
        assert target_msgs[0]["payload"]["body_marks"] == 1
        assert support.types(gm.drain()) == ["activity_log"]
    assert support.fetch(Character, target["id"]).body_marks == 1
    assert support.fetch(Character, guard["id"]).body_marks == 1


def test_intercept_behind_me_needs_nerve(client):
    target = support.forge(client, body_marks=2)
    guard = support.forge(client, nerve_current=0, role_ability="Behind Me")
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        assert wg.sync() == []
    assert support.fetch(Character, target["id"]).body_marks == 2


@pytest.mark.legacy_trust
def test_intercept_target_in_any_campaign(client):
    """The target is looked up by id with no campaign check."""
    camp_a = support.new_campaign(client)
    camp_b = support.new_campaign(client)
    guard = support.active_member(client, camp_a, nerve_current=1, role_ability="Behind Me")
    far_away = support.active_member(client, camp_b, brain_marks=1)
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=far_away["id"], mark_type="brain")
        wg.sync()
    assert support.fetch(Character, far_away["id"]).brain_marks == 0


def test_intercept_can_incapacitate_interceptor(client):
    target = support.forge(client, bleed_marks=1)
    guard = support.forge(client, nerve_current=1, bleed_marks=3, role_ability="Behind Me")
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="bleed")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "trigger_scar", "activity_log"]
        assert msgs[1]["payload"]["character_id"] == guard["id"]
    row = support.fetch(Character, guard["id"])
    assert (row.bleed_marks, row.incapacitated) == (0, True)


def test_intercept_premonitions_does_not_remove_target_mark(client):
    """QUIRK (bug D6): Premonitions spends the seer's resistance but the target keeps the mark."""
    target = support.forge(client, body_marks=2)
    seer = support.forge(client, intuition_max=3, specialty_ability="Premonitions")
    with support.ws_connect(client, seer["id"]) as wsr:
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        msgs = wsr.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["intuition_resistance_spent"] == 1
        assert msgs[1]["payload"]["message"] == f"{seer['name']} used Premonitions {EM} soaked the mark!"
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        assert wsr.sync() == []  # no resistance left
    assert support.fetch(Character, target["id"]).body_marks == 2


def test_apply_scar_with_shift(client):
    ch = support.forge(client, move=2, sense=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="Burned hand", shift_down="move", shift_up="sense")
        p = ws.sync()[0]["payload"]
        assert p["scars_list"] == ["Burned hand"]
        assert p["scars_count"] == 1
        assert (p["move"], p["sense"]) == (1, 1)
        ws.send("apply_scar", scar_text="Limp", shift_down="move", shift_up="sense", skip_shifts=True)
        p = ws.sync()[0]["payload"]
        assert (p["move"], p["sense"], p["scars_count"]) == (1, 1, 2)
        ws.send("apply_scar", scar_text="", shift_down="sense", shift_up="move")
        p = ws.sync()[0]["payload"]
        assert (p["move"], p["sense"], p["scars_count"]) == (2, 0, 2)


def test_apply_scar_shift_limits(client):
    ch = support.forge(client, move=0, sense=3, read=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="a", shift_down="move", shift_up="read")  # move is 0
        ws.send("apply_scar", scar_text="b", shift_down="read", shift_up="sense")  # sense is 3
        ws.sync()
    row = support.fetch(Character, ch["id"])
    assert (row.move, row.read, row.sense) == (0, 1, 3)


def test_apply_scar_shifts_any_attribute(client):
    """QUIRK: shift names are not limited to the nine actions."""
    ch = support.forge(client, nerve_max=3, body_marks=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="odd", shift_down="nerve_max", shift_up="body_marks")
        ws.sync()
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_max, row.body_marks) == (2, 1)


def test_fourth_scar_kills(client):
    ch = support.forge(client, scars_count=3, scars_list=["a", "b", "c"])
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="d")
        p = ws.sync()[0]["payload"]
        assert (p["scars_count"], p["is_dead"], p["incapacitated"]) == (4, True, True)
    assert support.fetch(Character, ch["id"]).scars_list == ["a", "b", "c", "d"]


def test_revive_character(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=2, brain_marks=1, bleed_marks=3, incapacitated=True)
    support.update(Character, ch["id"], is_dead=True)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("revive_character")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        p = msgs[0]["payload"]
        assert (p["body_marks"], p["brain_marks"], p["bleed_marks"], p["incapacitated"]) == (0, 0, 0, False)
        assert p["is_dead"] is True  # untouched
        assert msgs[1]["payload"] == {"message": f"{ch['name']} has been revived and is operational.",
                                      "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        assert support.types(gm.drain()) == ["activity_log"]
