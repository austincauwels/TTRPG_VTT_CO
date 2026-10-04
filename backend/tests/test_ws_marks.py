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
    ch = support.forge(client, body_marks=1, brain_marks=2, bleed_marks=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="soul")
        [msg] = ws.sync()
        assert msg["type"] == "character_update"
        p = msg["payload"]
        assert set(p) == support.CHAR_DICT_KEYS
        assert (p["body_marks"], p["brain_marks"], p["bleed_marks"], p["incapacitated"]) == (1, 2, 0, False)
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.brain_marks, row.bleed_marks, row.incapacitated) == (1, 2, 0, False)


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
        msgs = ws.sync()
        assert support.types(msgs) == ["trigger_scar", "activity_log"]
        assert msgs[0]["payload"]["character"]["incapacitated"] is True
        assert msgs[1]["payload"]["message"] == f"{ch['name']} has been incapacitated!"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.incapacitated) == (0, True)


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


def _allies(client, target_fields, guard_fields):
    """A target and an interceptor in the same campaign (intercepts need that now)."""
    camp = support.new_campaign(client)
    return support.active_member(client, camp, **target_fields), support.active_member(client, camp, **guard_fields)


def test_intercept_behind_me_needs_nerve(client):
    target, guard = _allies(client, dict(body_marks=2), dict(nerve_current=0, role_ability="Behind Me"))
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        assert wg.sync() == []
    assert support.fetch(Character, target["id"]).body_marks == 2


def test_intercept_target_must_be_in_the_same_campaign(client):
    """Before tokens the target was looked up by id with no campaign check, so an
    intercept could change a character in any campaign."""
    camp_a = support.new_campaign(client)
    camp_b = support.new_campaign(client)
    guard = support.active_member(client, camp_a, nerve_current=1, role_ability="Behind Me")
    far_away = support.active_member(client, camp_b, brain_marks=1)
    loner = support.forge(client, brain_marks=1)
    with support.ws_connect(client, guard["id"]) as wg:
        for target in (far_away, loner):
            wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="brain")
            assert wg.sync() == [{"type": "action_rejected", "payload": {
                "action": "intercept_mark", "status": 403, "detail": "Not allowed."}}]
    assert support.fetch(Character, far_away["id"]).brain_marks == 1
    assert support.fetch(Character, loner["id"]).brain_marks == 1
    assert support.fetch(Character, guard["id"]).nerve_current == 1


def test_intercept_can_incapacitate_interceptor(client):
    target, guard = _allies(client, dict(bleed_marks=1),
                            dict(nerve_current=1, bleed_marks=3, role_ability="Behind Me"))
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="bleed")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "trigger_scar", "activity_log"]
        assert msgs[1]["payload"]["character_id"] == guard["id"]
    row = support.fetch(Character, guard["id"])
    assert (row.bleed_marks, row.incapacitated) == (0, True)


def test_intercept_premonitions_does_not_remove_target_mark(client):
    """QUIRK (bug D6): Premonitions spends the seer's resistance but the target keeps the mark."""
    target, seer = _allies(client, dict(body_marks=2), dict(intuition_max=3, specialty_ability="Premonitions"))
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


@pytest.mark.parametrize("down, up", [
    ("nerve_max", "body_marks"), ("campaign_id", "scars_count"), ("id", "move"), ("move", "user_id"),
])
def test_apply_scar_shifts_only_action_ratings(client, down, up):
    """QUIRK D14 fixed: shift names used to reach any numeric column, which let a player
    walk its character's campaign_id into another campaign. Now anything but the nine
    actions is rejected and nothing is stored."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, nerve_max=3, body_marks=0, move=2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="", shift_down=down, shift_up=up)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "apply_scar", "status": 403, "detail": "Not allowed."}}]
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_max, row.body_marks, row.move, row.campaign_id, row.id, row.scars_count) == \
        (3, 0, 2, camp["id"], ch["id"], 0)
    assert row.user_id == support.owner_id(ch["id"])


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


# --- the three soak maps: take_mark, resolve_ability_mark, intercept_mark ------

@pytest.mark.parametrize("ability,fields,spent_field", [
    ("Compartmentalization", dict(nerve_max=3), "nerve_resistance_spent"),
    ("Steel Mind", dict(intuition_max=3), "intuition_resistance_spent"),
    ("In the Trenches", dict(cunning_max=3), "cunning_resistance_spent"),
])
def test_resolve_soak_spends_the_matching_resistance(client, ability, fields, spent_field):
    ch = support.forge(client, **fields, specialty_ability=ability)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability=ability)
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        p = msgs[0]["payload"]
        spent = {k: p[k] for k in ("nerve_resistance_spent", "cunning_resistance_spent", "intuition_resistance_spent")}
        assert spent == {k: (1 if k == spent_field else 0) for k in spent}
        assert p["ability_uses"] == {ability: 1}
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used {ability} {EM} soaked the mark."
    row = support.fetch(Character, ch["id"])
    assert getattr(row, spent_field) == 1
    assert row.ability_uses == {ability: 1}


@pytest.mark.parametrize("ability,fields,uses", [
    ("Compartmentalization", dict(nerve_max=3), {"Compartmentalization": 1}),
    ("Compartmentalization", dict(nerve_max=2), {}),
    ("Compartmentalization", dict(nerve_max=3, nerve_resistance_spent=1), {}),
    ("Steel Mind", dict(intuition_max=3), {"Steel Mind": 1}),
    ("Steel Mind", dict(intuition_max=2), {}),
    ("Steel Mind", dict(intuition_max=3, intuition_resistance_spent=1), {}),
])
def test_brain_soak_skipped_when_used_or_out_of_resistance(client, ability, fields, uses):
    ch = support.forge(client, **fields, specialty_ability=ability)
    if uses:
        support.update(Character, ch["id"], ability_uses=uses)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="brain")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update"]
        assert msgs[0]["payload"]["brain_marks"] == 1
    assert support.fetch(Character, ch["id"]).brain_marks == 1


def test_brain_soak_offers_what_is_left(client):
    ch = support.forge(client, nerve_max=3, intuition_max=3,
                       role_ability="Compartmentalization", specialty_ability="Steel Mind")
    support.update(Character, ch["id"], ability_uses={"Compartmentalization": 1})
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="brain")
        assert ws.sync() == [{"type": "ability_mark_offer", "payload": {
            "ability": "Steel Mind", "mark_type": "brain", "character_id": ch["id"],
            "options": [{"ability": "Steel Mind", "resist_key": "intuition"}], "action": "soak"}}]


def test_body_soak_ignores_brain_abilities_and_brain_ignores_body(client):
    ch = support.forge(client, nerve_max=3, cunning_max=3,
                       role_ability="Compartmentalization", specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed")
        assert support.types(ws.sync()) == ["character_update"]
        ws.send("take_mark", mark_type="body")
        assert ws.sync()[0]["payload"]["options"] == [{"ability": "In the Trenches", "resist_key": "cunning"}]
        ws.send("take_mark", mark_type="brain")
        assert ws.sync()[0]["payload"]["options"] == [{"ability": "Compartmentalization", "resist_key": "nerve"}]


# --- intercept_mark: what happens to the interceptor --------------------------

@pytest.mark.parametrize("soak,mark_type,fields", [
    ("In the Trenches", "body", dict(cunning_max=3)),
    ("Compartmentalization", "brain", dict(nerve_max=3)),
    ("Steel Mind", "brain", dict(intuition_max=3)),
])
def test_intercept_offers_interceptor_a_soak_and_does_not_mark_them(client, soak, mark_type, fields):
    """QUIRK: the interceptor's soak offer has no 'options' key and uses the
    interceptor's own id. The mark is not applied to the interceptor, but the nerve
    spend and the target's mark removal are already committed."""
    target, guard = _allies(client, {f"{mark_type}_marks": 2},
                            dict(nerve_current=2, role_ability="Behind Me", specialty_ability=soak,
                                 **{"nerve_max": 3, **fields}))
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type=mark_type)
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "ability_mark_offer"]
        assert msgs[0]["payload"]["message"] == f"{guard['name']} used Behind Me to intercept a mark for {target['name']}!"
        assert msgs[1]["payload"] == {"ability": soak, "mark_type": mark_type,
                                      "character_id": guard["id"], "action": "soak"}
    g = support.fetch(Character, guard["id"])
    assert (g.nerve_current, getattr(g, f"{mark_type}_marks")) == (1, 0)
    assert getattr(support.fetch(Character, target["id"]), f"{mark_type}_marks") == 1


def test_intercept_soak_skipped_when_used(client):
    target, guard = _allies(client, dict(body_marks=2),
                            dict(nerve_current=2, cunning_max=3, role_ability="Behind Me",
                                 specialty_ability="In the Trenches"))
    support.update(Character, guard["id"], ability_uses={"In the Trenches": 1})
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update"]
        assert msgs[1]["payload"]["body_marks"] == 1


def test_intercept_back_against_the_wall_does_not_block_the_mark(client):
    """Unlike take_mark, the interceptor's soak map has no Back Against the Wall, so the brain mark lands."""
    target, guard = _allies(client, dict(brain_marks=1),
                            dict(nerve_current=1, role_ability="Behind Me", specialty_ability="Back Against the Wall"))
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="brain")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update"]
        assert msgs[1]["payload"]["brain_marks"] == 1
    assert support.fetch(Character, guard["id"]).brain_marks == 1
    assert support.fetch(Character, target["id"]).brain_marks == 0


def test_intercept_unknown_target_is_rejected(client):
    """Before tokens an unknown target still cost the interceptor a nerve and a mark
    ("intercept a mark for an ally!"); an unknown id is 404 now."""
    camp = support.new_campaign(client)
    guard = support.active_member(client, camp, nerve_current=2, role_ability="Behind Me")
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=987654321, mark_type="bleed")
        assert wg.sync() == [{"type": "action_rejected", "payload": {
            "action": "intercept_mark", "status": 404, "detail": "Character not found"}}]
    row = support.fetch(Character, guard["id"])
    assert (row.nerve_current, row.bleed_marks) == (2, 0)


def test_intercept_without_mark_type_does_nothing(client):
    target, guard = _allies(client, dict(body_marks=2), dict(nerve_current=2, role_ability="Behind Me"))
    with support.ws_connect(client, guard["id"]) as wg:
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"])
        assert wg.sync() == []
    assert support.fetch(Character, guard["id"]).nerve_current == 2
    assert support.fetch(Character, target["id"]).body_marks == 2


# --- who receives post-roll, resolve and intercept results in a campaign --------

ACTOR_CASES = [
    ("Flourish", dict(cunning_max=3, cunning_current=3),
     "use_post_roll_ability", dict(ability="Flourish")),
    ("Learn from My Mistakes", dict(nerve_max=3, nerve_current=1),
     "use_post_roll_ability", dict(ability="Learn from My Mistakes", drive="nerve")),
    ("Bending Spoons", dict(),
     "use_post_roll_ability", dict(ability="Bending Spoons")),
    ("Adrenaline Rush", dict(nerve_max=3, nerve_current=1),
     "resolve_ability_mark", dict(ability="Adrenaline Rush", choice="nerve")),
    ("In the Trenches", dict(cunning_max=3), "resolve_ability_mark", dict(ability="In the Trenches")),
    ("Compartmentalization", dict(nerve_max=3), "resolve_ability_mark", dict(ability="Compartmentalization")),
    ("Steel Mind", dict(intuition_max=3), "resolve_ability_mark", dict(ability="Steel Mind")),
    ("Death Defy", dict(), "resolve_ability_mark", dict(ability="Death Defy")),
    ("Premonitions", dict(intuition_max=3),
     "intercept_mark", dict(ability="Premonitions", mark_type="body")),
]


@pytest.mark.parametrize("ability,fields,action,payload", ACTOR_CASES, ids=[c[0] for c in ACTOR_CASES])
def test_ability_results_reach_campaign_log_but_sheet_stays_private(client, ability, fields, action, payload):
    """The activity_log goes to the GM and every active member; the character_update
    goes only to the acting character's own channel."""
    camp = support.new_campaign(client)
    actor = support.active_member(client, camp, specialty_ability=ability, **fields)
    other = support.active_member(client, camp)
    if action == "intercept_mark":
        payload = dict(payload, target_character_id=other["id"])
    with support.ws_connect(client, actor["id"]) as wa, support.ws_connect(client, other["id"]) as wo, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send(action, **payload)
        msgs = wa.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["id"] == actor["id"]
        log = msgs[1]
        assert log["payload"]["ink_color"] == engine.INK_COLORS[0]
        assert log["payload"]["message"].startswith(f"{actor['name']} used {ability} {EM} ")
        assert wo.drain() == [log]
        assert gm.drain() == [log]
