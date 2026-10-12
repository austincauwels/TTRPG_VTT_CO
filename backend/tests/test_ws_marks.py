"""WebSocket harm: take_mark, resolve_ability_mark, intercept_mark, apply_scar, revive_character."""
from unittest.mock import ANY

import pytest

import engine
import support
from vtt.ws.handlers import marks
from models import Character
from vtt.ws.handlers import rolls

EM = support.EM


def test_take_mark_plain(client):
    """Fixed (playtest, self-mark-no-log): a mark taken on the player's own sheet left no
    line in the Activity Log, and the Lightkeeper's roster shows no marks, so nobody else
    at the table knew. The table's log says it now, with the track's count."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=1)
    other = support.active_member(client, camp)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, other["id"]) as wo:
        ws.send("take_mark", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["body_marks"] == 2
        assert msgs[1]["payload"] == {"message": f"{ch['name']} took a Body mark (2 of 3).",
                                      "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        assert gm.drain() == [{"type": "member_update", "payload": msgs[0]["payload"]}, msgs[1]]
        assert wo.drain() == [msgs[1]]
    assert support.fetch(Character, ch["id"]).body_marks == 2


def test_a_mark_sent_again_with_its_id_is_taken_once(client):
    """Fixed (playtest 2, silent-socket-loses-mark): a desk whose socket went silent let
    the mark it had sent go, and it was lost. The desk sends it again on its next socket
    with the same mark_id; the server takes a mark once, and answers a repeat with the
    sheet. An id that is not short text is no id."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", mark_id="m-1")
        assert ws.sync()[0]["payload"]["body_marks"] == 1
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", mark_id="m-1")
        msgs = [m for m in ws.sync() if m["type"] != "activity_history"]
        assert support.types(msgs) == ["character_update"]
        assert msgs[0]["payload"]["body_marks"] == 1
        ws.send("take_mark", mark_type="body", mark_id="m-2")
        assert ws.sync()[0]["payload"]["body_marks"] == 2
        ws.send("take_mark", mark_type="brain", mark_id=["m-2"])
        ws.send("take_mark", mark_type="brain", mark_id=["m-2"])
        assert [m["payload"]["brain_marks"] for m in ws.sync() if m["type"] == "character_update"] == [1, 2]
    assert support.fetch(Character, ch["id"]).body_marks == 2


def test_take_mark_without_type_is_ignored(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark")
        assert ws.sync() == []


def test_take_mark_unknown_type_is_rejected(client):
    """Fixed: an unknown track used to be set on the loaded object and sent back as a
    character_update; it is refused (422) now."""
    ch = support.forge(client, body_marks=1, brain_marks=2, bleed_marks=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="soul")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "take_mark", "status": 422, "detail": "Unknown mark type."}}]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.brain_marks, row.bleed_marks, row.incapacitated) == (1, 2, 0, False)


def test_fourth_mark_incapacitates(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, brain_marks=3)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("take_mark", mark_type="brain")
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log", "trigger_scar", "activity_log", "member_status"]
        assert msgs[0]["payload"]["message"] == f"{ch['name']} took a fourth Brain mark."
        assert msgs[1]["payload"]["character_id"] == ch["id"]
        assert msgs[1]["payload"]["mark_type"] == "brain"
        assert msgs[1]["payload"]["character"]["brain_marks"] == 0
        assert msgs[1]["payload"]["character"]["incapacitated"] is True
        # The sheet says a scar is owed until it is recorded
        assert msgs[1]["payload"]["character"]["scar_pending"] is True
        assert msgs[2]["payload"] == {"message": f"{ch['name']} has been incapacitated!",
                                      "log_type": "danger", "ink_color": engine.INK_COLORS[0]}
        # The players' circle cards follow who is down
        assert msgs[3]["payload"] == {"character_id": ch["id"], "campaign_id": camp["id"], "is_dead": False,
                                      "incapacitated": True, "scars_count": 0}
        # The GM gets the sheet trigger_scar carries, and not member_status
        assert gm.drain() == [msgs[0], {"type": "member_update", "payload": msgs[1]["payload"]["character"]}, msgs[2]]
    row = support.fetch(Character, ch["id"])
    assert (row.brain_marks, row.incapacitated) == (0, True)


def test_soak_offer_holds_the_mark_until_it_is_answered(client):
    """With a soak available the mark waits for the player's answer."""
    ch = support.forge(client, body_marks=1, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        assert ws.sync() == [{"type": "ability_mark_offer", "payload": {
            "ability": "In the Trenches", "mark_type": "body", "character_id": ch["id"],
            "options": [{"ability": "In the Trenches", "resist_key": "cunning"}], "action": "soak",
            "offer_id": ANY}}]
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_declining_a_soak_lands_the_mark(client):
    """Fixed (RULES_CHECK 11): declining the soak (the desk's "Take the mark", or its
    countdown) used to lose the mark; it lands now, and nothing is spent."""
    ch = support.forge(client, body_marks=1, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        ws.sync()
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["body_marks"] == 2
        # The log says what the player passed on (playtest, self-mark-no-log)
        assert msgs[1]["payload"]["message"] == f"{ch['name']} passed on In the Trenches and took a Body mark (2 of 3)."
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.cunning_resistance_spent, row.ability_uses) == (2, 0, {})


def test_an_offer_whose_countdown_runs_out_is_logged_as_run_out(client):
    """The card's countdown sends the decline with timed_out: the log says the offer ran
    out, not that the player passed it on, since the countdown chose (playtest,
    mark-undo-then-death-defy: "the second decides for you if it runs out")."""
    ch = support.forge(client, cunning_max=3, role_ability="Death Defy", specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=False)
        [soak] = ws.sync()
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body",
                offer_id=soak["payload"]["offer_id"], timed_out=True)
        assert [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"] == [
            f"{ch['name']} let In the Trenches run out and took a Body mark (1 of 3)."]
        ws.send("take_mark", mark_type="bleed", is_from_enemy=True)
        [defy] = ws.sync()
        ws.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="bleed",
                offer_id=defy["payload"]["offer_id"], timed_out=True)
        assert [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"] == [
            f"{ch['name']} let Death Defy run out and took a Bleed mark (1 of 3)."]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.bleed_marks, row.ability_uses) == (1, 1, {})


def test_accepting_a_soak_keeps_the_mark_off(client):
    ch = support.forge(client, body_marks=1, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        ws.sync()
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="soak")
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.cunning_resistance_spent) == (1, 1)


def test_a_declined_soak_still_offers_death_defy_for_an_enemys_mark(client):
    ch = support.forge(client, body_marks=0, cunning_max=3, role_ability="In the Trenches",
                       specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        assert ws.sync()[0]["payload"]["action"] == "soak"
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body")
        assert ws.sync() == [{"type": "ability_mark_offer", "payload": {
            "ability": "Death Defy", "mark_type": "body", "character_id": ch["id"], "action": "escape", "count": 1,
            "mark_types": ["body"], "offer_id": ANY}}]
        ws.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body")
        msgs = ws.sync()
        assert msgs[0]["payload"]["body_marks"] == 1
        # The last offer passed on is the one the log names
        assert msgs[1]["payload"]["message"] == f"{ch['name']} passed on Death Defy and took a Body mark (1 of 3)."


def test_soak_skipped_without_resistance_or_after_use(client):
    no_pips = support.forge(client, cunning_max=2, specialty_ability="In the Trenches")
    used = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    support.update(Character, used["id"], ability_uses={"In the Trenches": 1})
    for ch in (no_pips, used):
        with support.ws_connect(client, ch["id"]) as ws:
            ws.send("take_mark", mark_type="body")
            assert support.types(ws.sync()) == ["character_update", "activity_log"]


def test_brain_soak_offers_list_every_option(client):
    ch = support.forge(client, nerve_max=3, intuition_max=3,
                       role_ability="Compartmentalization", specialty_ability="Steel Mind")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="brain")
        [msg] = ws.sync()
        assert msg["payload"]["ability"] == "Compartmentalization"
        assert msg["payload"]["options"] == [{"ability": "Compartmentalization", "resist_key": "nerve"},
                                             {"ability": "Steel Mind", "resist_key": "intuition"}]


def test_back_against_the_wall_is_not_a_soak(client):
    """Fixed (RULES_CHECK 21): Back Against the Wall was offered as a brain soak with no
    handler, so such a character never took a brain mark. It is a roll cost, not a soak."""
    ch = support.forge(client, role_ability="Back Against the Wall")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="brain")
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
    assert support.fetch(Character, ch["id"]).brain_marks == 1


def test_death_defy_offer_unless_not_from_an_enemy(client):
    """Fixed (RULES_CHECK 24): Death Defy needed is_from_enemy, which the desk never sends,
    so it was never offered. It is offered unless the payload says the mark is not from an
    enemy; the player judges whether an enemy dealt it."""
    ch = support.forge(client, specialty_ability="Death Defy")
    offer = [{"type": "ability_mark_offer", "payload": {
        "ability": "Death Defy", "mark_type": "bleed", "character_id": ch["id"], "action": "escape", "count": 1,
        "mark_types": ["bleed"], "offer_id": ANY}}]
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed", is_from_enemy=True)
        assert ws.sync() == offer
        # as the desk sends it: another enemy mark while the offer is open is the same harm,
        # and waits with the first (test_death_defy_escapes_every_mark_of_one_harm)
        ws.send("take_mark", mark_type="bleed")
        assert ws.sync() == [{**offer[0], "payload": {**offer[0]["payload"], "count": 2,
                                                      "mark_types": ["bleed", "bleed"]}}]
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)  # the held two, then this one
        updates = [m["payload"]["bleed_marks"] for m in ws.sync() if m["type"] == "character_update"]
        assert updates == [1, 2, 3]
    assert support.fetch(Character, ch["id"]).bleed_marks == 3


def test_a_death_defy_offer_names_every_mark_it_holds(client):
    """The offer says which marks the harm holds (mark_types), so the desk draws each one
    held in its own track while the offer is open (playtest, mark-undo-then-death-defy)."""
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        ws.send("take_mark", mark_type="bleed", is_from_enemy=True)
        assert [m["payload"]["mark_types"] for m in ws.sync()] == [["body"], ["body", "bleed"]]


def test_a_desk_that_opens_again_is_offered_the_held_mark(client):
    """Fixed (playtest, mark-undo-then-death-defy): a desk reloaded, or a connection lost,
    while an offer held the mark forgot the offer. The mark waited unseen, with no
    countdown to land it, until the character's next mark. A desk that opens on the
    channel is sent the offer again, after the circle, and its answer lands the mark once."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, cunning_max=3, role_ability="Death Defy",
                               specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        [soak] = ws.sync()
        assert soak["payload"]["action"] == "soak"
    with support.ws_connect(client, ch["id"]) as again:
        assert support.types(again.initial) == ["character_update", "circle_update"]
        assert again.recv() == soak
        again.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body")
        [defy] = again.sync()
        assert defy["payload"] == {"ability": "Death Defy", "mark_type": "body", "character_id": ch["id"],
                                   "action": "escape", "count": 1, "mark_types": ["body"], "offer_id": ANY}
    with support.ws_connect(client, ch["id"]) as third:
        assert third.recv() == defy   # the offer open now, not the soak answered before
        third.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body")
        assert support.of_type(third.sync(), "character_update")[0]["payload"]["body_marks"] == 1
    # Answered: a desk opening now has nothing waiting for it (only the log's lines)
    with support.ws_connect(client, ch["id"]) as fourth:
        assert support.types(fourth.sync()) == ["activity_history"]
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_a_held_mark_that_lands_early_closes_its_offer(client):
    """A mark an open offer holds lands first when another mark comes. The desk's card for
    it stayed up, and its countdown then sent "Take the mark", which (with nothing held,
    as after a restart) landed the mark a second time. The desk is told the offer is
    closed (mark_offer_closed) before the mark lands."""
    ch = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=False)
        [offer] = ws.sync()
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)
        msgs = ws.sync()
        assert support.types(msgs) == ["mark_offer_closed", "character_update", "activity_log",
                                       "character_update", "activity_log"]
        assert msgs[0]["payload"] == {"character_id": ch["id"], "ability": "In the Trenches", "mark_type": "body"}
        assert (msgs[1]["payload"]["body_marks"], msgs[3]["payload"]["bleed_marks"]) == (1, 1)
        # A card that answers anyway (the closing came too late) names a closed offer
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body",
                offer_id=offer["payload"]["offer_id"])
        assert ws.sync() == []
        # Answered or not, a closed offer is not offered again
    with support.ws_connect(client, ch["id"]) as again:
        assert support.types(again.sync()) == ["activity_history"]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.bleed_marks) == (1, 1)


def test_an_answer_to_a_closed_offer_is_ignored(client):
    """Fixed (review of mark-undo-then-death-defy): mark_offer_closed helps only a desk that
    reads it before it answers. A "Take the mark" already on its way when the offer closed
    answered the next held mark: it landed the Brain mark the soak held, as "passed on
    Death Defy", and the soak's own card then landed it again by the restart rule. Each
    offer has an id, and an answer to one the server no longer holds is ignored."""
    ch = support.forge(client, nerve_max=3, role_ability="Death Defy", specialty_ability="Compartmentalization")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        [defy] = ws.sync()
        assert defy["payload"]["ability"] == "Death Defy"
        assert defy["payload"]["offer_id"].startswith(f"{marks._BOOT}.")
        # The Lightkeeper deals a Brain mark, not an enemy's: the held Body mark lands first
        ws.send("take_mark", mark_type="brain", is_from_enemy=False)
        msgs = ws.sync()
        assert support.types(msgs) == ["mark_offer_closed", "character_update", "activity_log", "ability_mark_offer"]
        soak = msgs[-1]["payload"]
        assert (soak["ability"], soak["action"]) == ("Compartmentalization", "soak")
        assert soak["offer_id"] != defy["payload"]["offer_id"]
        # The player's answers to the Death Defy card, sent before the closing reached them
        ws.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body",
                offer_id=defy["payload"]["offer_id"])
        ws.send("resolve_ability_mark", ability="Death Defy", choice="escape", offer_id=defy["payload"]["offer_id"])
        assert ws.sync() == []
        # The soak's own card answers it: the Brain mark lands once
        ws.send("resolve_ability_mark", ability="Compartmentalization", choice="decline", mark_type="brain",
                offer_id=soak["offer_id"])
        assert [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"] == [
            f"{ch['name']} passed on Compartmentalization and took a Brain mark (1 of 3)."]
        # A second desk's card for it, answered after the first: nothing is held now
        ws.send("resolve_ability_mark", ability="Compartmentalization", choice="decline", mark_type="brain",
                offer_id=soak["offer_id"])
        assert ws.sync() == []
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.brain_marks, row.nerve_resistance_spent, row.ability_uses) == (1, 1, 0, {})


def test_an_answer_to_a_death_defy_offer_counted_again_is_ignored(client):
    """A Death Defy offer that counts another mark of the harm is a new offer: an answer to
    the one before it (the player passed on one mark, not two) waits for the new card."""
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        ws.send("take_mark", mark_type="bleed", is_from_enemy=True)
        first, second = [m["payload"] for m in ws.sync()]
        assert (first["count"], second["count"]) == (1, 2) and first["offer_id"] != second["offer_id"]
        ws.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body",
                offer_id=first["offer_id"])
        assert ws.sync() == []
        ws.send("resolve_ability_mark", ability="Death Defy", choice="escape", offer_id=second["offer_id"])
        assert ws.sync()[1]["payload"]["message"] == f"{ch['name']} used Death Defy {EM} escaped 2 marks unscathed!"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.bleed_marks, row.ability_uses) == (0, 0, {"Death Defy": 1})


def test_an_answer_from_before_a_restart_still_lands_its_mark(client):
    """The restart rule stays: with nothing held, an answer whose offer_id is not this
    process's (the server restarted with the card open) lands the mark it names."""
    ch = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="decline", mark_type="body",
                offer_id="0000ffff.7")
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_endurance_six_keeps_the_character_standing(client, dice):
    """Fixed bug D1: the Endurance branch called secrets.randbelow without importing
    secrets, so the NameError ended the socket and the mark was not applied. It rolls
    one die per Nerve resistance pip left; a 6 keeps the marks at 3."""
    ch = support.forge(client, body_marks=3, nerve_max=6, specialty_ability="Endurance")
    dice(2, 6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log", "character_update", "activity_log"]
        assert msgs[0]["payload"]["message"] == f"{ch['name']} took a fourth Body mark."
        assert msgs[1]["payload"]["body_marks"] == 3
        assert msgs[2]["payload"]["message"] == (
            f"{ch['name']} used Endurance! Rolled [2, 6] {support.EM} a 6 saves them from incapacitation!")
        assert msgs[2]["payload"]["log_type"] == "field"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.incapacitated) == (3, False)


def test_endurance_without_a_six_incapacitates(client, dice):
    ch = support.forge(client, body_marks=3, nerve_max=3, specialty_ability="Endurance")
    dice(5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log", "activity_log", "trigger_scar", "activity_log"]
        assert msgs[0]["payload"]["message"] == f"{ch['name']} took a fourth Body mark."
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Endurance {support.EM} rolled [5], no 6. Incapacitated."
        assert msgs[2]["payload"]["character"]["incapacitated"] is True
        assert msgs[3]["payload"]["message"] == f"{ch['name']} has been incapacitated!"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.incapacitated) == (0, True)


def test_endurance_without_resistance_just_incapacitates(client):
    ch = support.forge(client, body_marks=3, nerve_max=2, specialty_ability="Endurance")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        msgs = ws.sync()
        assert support.types(msgs) == ["activity_log", "trigger_scar", "activity_log"]
        assert msgs[1]["payload"]["character"]["incapacitated"] is True
        assert msgs[2]["payload"]["message"] == f"{ch['name']} has been incapacitated!"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.incapacitated) == (0, True)


def test_let_them_in_and_adrenaline_rush_offers(client):
    ch = support.forge(client, role_ability="Let Them In", specialty_ability="Adrenaline Rush")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log", "ability_mark_offer", "ability_mark_offer"]
        assert msgs[2]["payload"] == {"ability": "Let Them In", "mark_type": "bleed",
                                      "character_id": ch["id"], "action": "info"}
        assert msgs[3]["payload"] == {"ability": "Adrenaline Rush", "mark_type": "bleed",
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
        line = wh.sync()[1]   # the hurt's mark, in every member's log
        # and, in each offered ally's own log, the offer (test_an_ally_offer_is_logged_...)
        assert wg.drain() == [line, {"type": "ability_intercept_offer", "payload": {
            "ability": "Behind Me", "mark_type": "body", "character_id": hurt["id"],
            "character_name": hurt["name"], "action": "intercept", "expires_in": 120}}, _offered(guard, "Behind Me", hurt)]
        assert wsr.drain() == [line, {"type": "ability_intercept_offer", "payload": {
            "ability": "Premonitions", "mark_type": "body", "character_id": hurt["id"],
            "character_name": hurt["name"], "action": "soak", "expires_in": 120}}, _offered(seer, "Premonitions", hurt)]
        assert wt.drain() == [line] and wo.drain() == []


def _offered(ally, abilities, target, mark="Body"):
    """The line the Lightkeeper's log and the ally's own get when a mark is offered to them."""
    return {"type": "activity_log", "payload": {
        "message": f"{ally['name']} is offered {abilities} for {target['name']}'s {mark} mark (2 minutes).",
        "log_type": "field"}}


def test_an_ally_offer_is_logged_for_the_lightkeeper_and_that_ally_and_its_lapse_too(client, monkeypatch):
    """Robert's decision 6 (playtest 3, behind-me-offer-unseen): an ally's Behind Me offer
    opened and lapsed unseen; the Lightkeeper was not told who was offered, and the ally's
    desk kept no trace. The two-minute window stays. The Activity Log of the Lightkeeper
    and of each ally offered says who was offered what, and when the window runs out with
    the offer not used, that it lapsed. The target and the other members get neither line, and an
    answered offer logs no lapse."""
    camp = support.new_campaign(client)
    hurt = support.active_member(client, camp)
    guard = support.active_member(client, camp, nerve_current=1, role_ability="Behind Me",
                                  intuition_max=3, specialty_ability="Premonitions")
    bystander = support.active_member(client, camp)
    with support.ws_connect(client, hurt["id"]) as wh, support.ws_connect(client, guard["id"]) as wg, \
            support.ws_connect(client, bystander["id"]) as wb, support.ws_connect(client, camp["campaign_code"]) as gm:
        wh.send("take_mark", mark_type="brain")
        line = wh.sync()[1]
        offered = _offered(guard, "Behind Me or Premonitions", hurt, "Brain")
        assert support.of_type(gm.drain(), "activity_log") == [line, offered]
        assert support.of_type(wg.drain(), "activity_log") == [line, offered]
        assert wb.drain() == [line]

        monkeypatch.setattr(marks, "INTERCEPT_WINDOW", 0.3)
        wh.send("take_mark", mark_type="body")
        wh.sync()
        offered = {"type": "activity_log", "payload": {
            "message": f"{guard['name']} is offered Behind Me or Premonitions for {hurt['name']}'s Body mark (0.3 seconds).",
            "log_type": "field"}}
        assert support.of_type(gm.drain(), "activity_log")[1:] == [offered]
        assert support.of_type(wg.drain(), "activity_log")[1:] == [offered]
        lapsed = {"type": "activity_log", "payload": {
            "message": f"{guard['name']}'s Behind Me or Premonitions offer for {hurt['name']}'s Body mark lapsed unused.",
            "log_type": "field"}}
        assert gm.recv_type("activity_log", timeout=3) == lapsed
        assert wg.recv_type("activity_log", timeout=3) == lapsed
        assert wh.drain(0.3) == []
        assert [m["payload"]["message"] for m in wb.drain()] == [f"{hurt['name']} took a Body mark (1 of 3)."]

        # Answered in time: no lapse
        monkeypatch.setattr(marks, "INTERCEPT_WINDOW", 1.5)
        wh.send("take_mark", mark_type="bleed")
        wh.sync()
        wg.drain()
        wg.send("intercept_mark", ability="Behind Me", target_character_id=hurt["id"], mark_type="bleed")
        wg.sync()
        gm.drain()
        assert all("lapsed" not in m["payload"]["message"]
                   for m in support.of_type(gm.drain(1.8) + wg.drain(), "activity_log"))
    assert support.fetch(Character, hurt["id"]).bleed_marks == 0


def test_resolve_adrenaline_rush_once_per_offer(client):
    """Fixed: no offer was stored, so the refresh could be claimed at will. Each mark's
    offer can be used once."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, nerve_max=3, nerve_current=0, role_ability="Adrenaline Rush")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="nerve")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_ability_mark", "status": 409, "detail": "No Adrenaline Rush is waiting to be used."}}]
        ws.send("take_mark", mark_type="body")
        assert support.types(ws.sync()) == ["character_update", "activity_log", "ability_mark_offer"]
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="luck")
        ws.send("resolve_ability_mark", ability="Steel Mind")  # not owned
        assert ws.sync() == []
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="nerve")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["nerve_current"] == 1
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Adrenaline Rush {EM} refreshed 1 Nerve."
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="nerve")
        assert support.types(ws.sync()) == ["action_rejected"]
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_resolve_soak_spends_resistance_and_counts_use(client):
    ch = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="In the Trenches")
        msgs = ws.sync()
        assert msgs[0]["payload"]["cunning_resistance_spent"] == 1
        assert msgs[0]["payload"]["ability_uses"] == {"In the Trenches": 1}
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used In the Trenches {EM} soaked the mark."
        # Fixed (RULES_CHECK 11): used for this assignment, and no resistance left
        ws.send("resolve_ability_mark", ability="In the Trenches")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_ability_mark", "status": 409,
            "detail": "In the Trenches cannot soak this mark: it is used for this assignment or no Cunning resistance is left."}}]
    assert support.fetch(Character, ch["id"]).cunning_resistance_spent == 1


def test_resolve_death_defy(client):
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="Death Defy")
        msgs = ws.sync()
        assert msgs[0]["payload"]["ability_uses"] == {"Death Defy": 1}
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Death Defy {EM} escaped unscathed!"
        ws.send("take_mark", mark_type="body", is_from_enemy=True)  # used up: mark lands
        assert support.types(ws.sync()) == ["character_update", "activity_log"]


def test_death_defy_escapes_every_mark_of_one_harm(client):
    """Death Defy (p. 27): "when you should take 1 or more marks from an enemy, you instead
    escape unscathed". Enemy marks that arrive while it is offered belong to the same
    harm: the offer counts them, and one use escapes them all (the second used to land
    the first and open a new offer)."""
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        offers = ws.sync()
        assert [m["payload"]["count"] for m in offers] == [1, 2]
        ws.send("resolve_ability_mark", ability="Death Defy")
        msgs = ws.sync()
        assert msgs[1]["payload"]["message"] == f"{ch['name']} used Death Defy {EM} escaped 2 marks unscathed!"
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.ability_uses) == (0, {"Death Defy": 1})


def test_declining_death_defy_lands_every_held_mark(client):
    ch = support.forge(client, specialty_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        ws.send("take_mark", mark_type="brain", is_from_enemy=True)
        ws.sync()
        ws.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body")
        # Each lands with its line; the first names the offer passed on
        assert [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"] == [
            f"{ch['name']} passed on Death Defy and took a Body mark (1 of 3).",
            f"{ch['name']} took a Brain mark (1 of 3)."]
        # A mark that is not an enemy's is not part of the harm: the held ones land first
        ws.send("take_mark", mark_type="body", is_from_enemy=True)
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)
        assert support.types(ws.sync()) == ["ability_mark_offer", "mark_offer_closed", "character_update",
                                            "activity_log", "character_update", "activity_log"]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.brain_marks, row.bleed_marks) == (2, 1, 1)


def test_circle_of_protection_soaks_one_body_mark(client):
    """Ritual's Circle of Protection (p. 27) "soaks 1 Body mark for the person within". The
    ward is set on the ally, offered as a soak on their next Body mark, and gone once it
    soaks one. It never soaked anything."""
    camp = support.new_campaign(client)
    weird = support.active_member(client, camp, specialty_ability="Ritual")
    ally = support.active_member(client, camp, body_marks=1)
    with support.ws_connect(client, weird["id"]) as ws, support.ws_connect(client, ally["id"]) as wa:
        ws.send("use_ability", ability="Ritual", option="Circle of Protection", target_character_id=ally["id"])
        ws.sync()
        assert wa.drain()[0]["payload"]["ability_uses"] == {"Circle of Protection ward": 1}
        wa.send("take_mark", mark_type="brain", is_from_enemy=False)   # a Brain mark: no offer
        assert support.types(wa.sync()) == ["character_update", "activity_log"]
        wa.send("take_mark", mark_type="body", is_from_enemy=False)
        offer = wa.sync()[0]["payload"]
        assert (offer["ability"], offer["action"]) == ("Circle of Protection", "soak")
        wa.send("resolve_ability_mark", ability="Circle of Protection", choice="soak")
        msgs = wa.sync()
        assert msgs[0]["payload"]["ability_uses"] == {}
        assert msgs[1]["payload"]["message"] == f"{ally['name']}'s Circle of Protection soaked the Body mark."
        wa.send("take_mark", mark_type="body", is_from_enemy=False)   # the ward is spent
        assert support.types(wa.sync()) == ["character_update", "activity_log"]
        wa.send("resolve_ability_mark", ability="Circle of Protection", choice="soak")
        assert wa.sync()[0]["payload"]["status"] == 409
    row = support.fetch(Character, ally["id"])
    assert (row.body_marks, row.brain_marks) == (2, 1)


def test_non_combatant_lets_each_ally_recover_a_drive_point(client):
    """Non-Combatant (p. 30): when the Doctor takes a mark, "each of your allies in the
    scene can recover 1 drive point of their choice". Each active member of the campaign
    is offered one per mark, and can take it once. Nothing happened before."""
    camp = support.new_campaign(client)
    doctor = support.active_member(client, camp, specialty_ability="Non-Combatant", body_marks=3)
    ally = support.active_member(client, camp, nerve_max=3, nerve_current=1)
    other = support.active_member(client, camp, cunning_max=3, cunning_current=3)
    stranger = support.active_member(client, support.new_campaign(client))
    with support.ws_connect(client, doctor["id"]) as wd, support.ws_connect(client, ally["id"]) as wa, \
            support.ws_connect(client, other["id"]) as wo, support.ws_connect(client, stranger["id"]) as wx:
        wd.send("take_mark", mark_type="brain", is_from_enemy=False)
        wd.sync()
        offer = next(m for m in wa.drain(0.5) if m["type"] == "ability_mark_offer")["payload"]
        assert offer == {"ability": "Non-Combatant", "mark_type": "brain", "character_id": doctor["id"],
                         "character_name": doctor["name"], "action": "drive_refresh", "expires_in": 120}
        assert any(m["type"] == "ability_mark_offer" for m in wo.drain(0.5))
        assert not any(m["type"] == "ability_mark_offer" for m in wx.drain(0.5))
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")
        msgs = wa.sync()
        assert msgs[0]["payload"]["nerve_current"] == 2
        assert msgs[1]["payload"]["message"] == f"{ally['name']} recovered 1 Nerve (Non-Combatant)."
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")   # one per mark
        assert wa.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_ability_mark", "status": 409, "detail": "No Non-Combatant drive point is waiting."}}]
        wo.drain()
        wo.send("resolve_ability_mark", ability="Non-Combatant", choice="cunning")   # capped at the maximum
        assert wo.sync()[0]["payload"]["cunning_current"] == 3
        # The fourth mark, which incapacitates, is answered too
        wd.send("take_mark", mark_type="body", is_from_enemy=False)
        wd.sync()
        assert any(m["type"] == "ability_mark_offer" for m in wa.drain(0.5))
    assert support.fetch(Character, ally["id"]).nerve_current == 2


def test_a_non_combatant_point_is_logged_for_the_lightkeeper_and_that_ally_and_its_lapse_too(client, monkeypatch):
    """Robert's decision 6 covers "other ally offers" too: Non-Combatant's drive point goes
    to every ally for the same two minutes, and opened and lapsed unseen. The Lightkeeper's
    log and each ally's say who was offered it, and that it lapsed if it was not taken; the
    Doctor's log gets neither line, and a point taken logs no lapse."""
    camp = support.new_campaign(client)
    doctor = support.active_member(client, camp, specialty_ability="Non-Combatant")
    ally = support.active_member(client, camp, nerve_max=3, nerve_current=1)
    other = support.active_member(client, camp)
    monkeypatch.setattr(marks, "INTERCEPT_WINDOW", 1.5)
    with support.ws_connect(client, doctor["id"]) as wd, support.ws_connect(client, ally["id"]) as wa, \
            support.ws_connect(client, other["id"]) as wo, support.ws_connect(client, camp["campaign_code"]) as gm:
        wd.send("take_mark", mark_type="brain", is_from_enemy=False)
        line = wd.sync()[1]

        def said(member, how):
            return {"type": "activity_log", "payload": {
                "message": f"{member['name']}{how} Non-Combatant drive point from {doctor['name']}'s Brain mark"
                           + (" (1.5 seconds)." if how == " is offered a" else " lapsed unused."),
                "log_type": "field"}}
        assert support.of_type(gm.drain(), "activity_log") == [line, said(ally, " is offered a"),
                                                               said(other, " is offered a")]
        assert support.of_type(wa.drain(), "activity_log") == [line, said(ally, " is offered a")]
        assert support.of_type(wo.drain(), "activity_log") == [line, said(other, " is offered a")]
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")
        assert wa.sync()[1]["payload"]["message"] == f"{ally['name']} recovered 1 Nerve (Non-Combatant)."
        gm.drain()
        wo.drain()
        wd.drain()
        # Only the point not taken lapses, and only for the Lightkeeper and that ally
        assert gm.recv_type("activity_log", timeout=3) == said(other, "'s")
        assert wo.recv_type("activity_log", timeout=3) == said(other, "'s")
        assert support.of_type(gm.drain(0.5) + wa.drain() + wd.drain(), "activity_log") == []
    assert support.fetch(Character, ally["id"]).nerve_current == 2


def test_intercept_behind_me(client):
    camp = support.new_campaign(client)
    target = support.active_member(client, camp, body_marks=2)
    guard = support.active_member(client, camp, nerve_current=2, body_marks=0,
                                  role_ability="Behind Me", specialty_ability="Adrenaline Rush")
    with support.ws_connect(client, guard["id"]) as wg, support.ws_connect(client, target["id"]) as wt, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        support.offer_intercept(target["id"], "body")
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update", "activity_log", "ability_mark_offer"]
        assert msgs[0]["payload"]["message"] == f"{guard['name']} used Behind Me to intercept a mark for {target['name']}!"
        assert msgs[1]["payload"]["body_marks"] == 1
        assert msgs[1]["payload"]["nerve_current"] == 1
        # The guard's mark lands as any mark does, with its line
        assert msgs[2]["payload"]["message"] == f"{guard['name']} took a Body mark (1 of 3)."
        assert msgs[3]["payload"] == {"ability": "Adrenaline Rush", "mark_type": "body",
                                      "character_id": guard["id"], "action": "drive_refresh"}
        target_msgs = wt.drain()
        assert support.types(target_msgs) == ["character_update", "activity_log", "activity_log"]
        assert target_msgs[0]["payload"]["body_marks"] == 1
        # Both sheets reach the GM (member_update): the target's, then the guard's
        gm_msgs = gm.drain()
        assert gm_msgs == [{"type": "member_update", "payload": target_msgs[0]["payload"]}, msgs[0],
                           {"type": "member_update", "payload": msgs[1]["payload"]}, msgs[2]]
    assert support.fetch(Character, target["id"]).body_marks == 1
    assert support.fetch(Character, guard["id"]).body_marks == 1


def _allies(client, target_fields, guard_fields):
    """A target and an interceptor in the same campaign (intercepts need that now)."""
    camp = support.new_campaign(client)
    return support.active_member(client, camp, **target_fields), support.active_member(client, camp, **guard_fields)


def test_intercept_behind_me_needs_nerve(client):
    target, guard = _allies(client, dict(body_marks=2), dict(nerve_current=0, role_ability="Behind Me"))
    with support.ws_connect(client, guard["id"]) as wg:
        support.offer_intercept(target["id"], "body")
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
            support.offer_intercept(target["id"], "brain")
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
        support.offer_intercept(target["id"], "bleed")
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="bleed")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "activity_log", "trigger_scar", "activity_log", "member_status"]
        assert msgs[1]["payload"]["message"] == f"{guard['name']} took a fourth Bleed mark."
        assert msgs[2]["payload"]["character_id"] == guard["id"]
    row = support.fetch(Character, guard["id"])
    assert (row.bleed_marks, row.incapacitated) == (0, True)


def test_intercept_premonitions_soaks_the_targets_mark(client):
    """Fixed (bug D6, RULES_CHECK 23): Premonitions spent the seer's resistance but the
    target kept the mark. The ally soaks one mark of that track now."""
    target, seer = _allies(client, dict(body_marks=2), dict(intuition_max=3, specialty_ability="Premonitions"))
    with support.ws_connect(client, seer["id"]) as wsr, support.ws_connect(client, target["id"]) as wt:
        support.offer_intercept(target["id"], "body")
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        msgs = wsr.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["intuition_resistance_spent"] == 1
        assert msgs[1]["payload"]["message"] == f"{seer['name']} used Premonitions {EM} soaked the mark!"
        seen = wt.drain()
        assert support.types(seen) == ["character_update", "activity_log"]
        assert seen[0]["payload"]["body_marks"] == 1
        support.offer_intercept(target["id"], "body")
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        assert wsr.sync() == []  # no resistance left
    assert support.fetch(Character, target["id"]).body_marks == 1


def test_a_fourth_bleed_mark_still_brings_let_them_in_and_adrenaline_rush(client):
    """The fourth mark is taken as a scar (p. 14), so Let Them In ("Whenever you take 1 or
    more Bleed marks") and Adrenaline Rush ("For each mark you take", p. 27) answer it
    too. Neither was offered for the mark that incapacitates."""
    ch = support.forge(client, bleed_marks=3, nerve_max=3, nerve_current=1,
                       role_ability="Adrenaline Rush", specialty_ability="Let Them In")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)
        msgs = ws.sync()
        assert support.types(msgs)[:2] == ["activity_log", "trigger_scar"]
        offers = [m["payload"]["ability"] for m in msgs if m["type"] == "ability_mark_offer"]
        assert offers == ["Let Them In", "Adrenaline Rush"]


def test_an_endurance_save_on_a_bleed_mark_still_brings_let_them_in(client, dice):
    """Endurance keeps the character standing, but the Bleed mark is still taken: Let Them
    In ("Whenever you take 1 or more Bleed marks", p. 27) answers it, before Adrenaline
    Rush. Only Adrenaline Rush was offered."""
    ch = support.forge(client, bleed_marks=3, nerve_max=3, specialty_ability="Endurance; Let Them In",
                       role_ability="Adrenaline Rush")
    dice(6)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)
        msgs = ws.sync()
        assert support.of_type(msgs, "character_update")[0]["payload"]["bleed_marks"] == 3
        offers = [m["payload"]["ability"] for m in msgs if m["type"] == "ability_mark_offer"]
        assert offers == ["Let Them In", "Adrenaline Rush"]
    assert support.fetch(Character, ch["id"]).incapacitated is False


def test_one_mark_is_answered_by_one_ally(client):
    """Fixed: Premonitions and Behind Me (both "when an ally is about to take" a mark,
    pp. 27 and 32) could both answer the same mark and remove two. The first answer takes
    the offered mark; a second, or an answer with no mark offered, is refused."""
    camp = support.new_campaign(client)
    target = support.active_member(client, camp, body_marks=1)
    seer = support.active_member(client, camp, intuition_max=6, specialty_ability="Premonitions")
    guard = support.active_member(client, camp, nerve_current=2, role_ability="Behind Me")
    refused = [{"type": "action_rejected", "payload": {
        "action": "intercept_mark", "status": 409, "detail": marks.NO_MARK_TO_ANSWER}}]
    with support.ws_connect(client, target["id"]) as wt, support.ws_connect(client, seer["id"]) as wsr, \
            support.ws_connect(client, guard["id"]) as wg:
        # no mark offered yet: refused, nothing spent
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        assert wsr.sync() == refused
        wt.send("take_mark", mark_type="body")
        wt.sync()
        assert support.types(wsr.drain()) == ["activity_log", "ability_intercept_offer", "activity_log"]
        assert support.types(wg.drain()) == ["activity_log", "ability_intercept_offer", "activity_log"]
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        assert support.types(wsr.sync()) == ["character_update", "activity_log"]
        wg.drain()  # the seer's log line
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        assert wg.sync() == refused
    assert support.fetch(Character, target["id"]).body_marks == 1
    assert support.fetch(Character, guard["id"]).nerve_current == 2


def test_an_answered_mark_closes_the_other_allies_offers(client):
    """Fixed (playtest 2, ally-offer-cards-lost-or-stale): once one ally answered a mark,
    the other allies' cards for it stayed up for the rest of the window, and their answer
    was refused as "There is no such mark to soak." They are told the mark is answered
    now (intercept_offer_closed), and a late answer is refused for that reason."""
    camp = support.new_campaign(client)
    target = support.active_member(client, camp)
    seer = support.active_member(client, camp, intuition_max=6, specialty_ability="Premonitions")
    guard = support.active_member(client, camp, nerve_current=2, role_ability="Behind Me")
    with support.ws_connect(client, target["id"]) as wt, support.ws_connect(client, seer["id"]) as wsr, \
            support.ws_connect(client, guard["id"]) as wg:
        wt.send("take_mark", mark_type="body")
        wt.sync()
        wsr.drain()
        wg.drain()
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        wg.sync()
        assert [m for m in wsr.drain() if m["type"] == "intercept_offer_closed"] == [
            {"type": "intercept_offer_closed", "payload": {"character_id": target["id"], "mark_type": "body"}}]
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        assert wsr.sync() == [{"type": "action_rejected", "payload": {
            "action": "intercept_mark", "status": 409, "detail": marks.NO_MARK_TO_ANSWER}}]
    assert support.fetch(Character, seer["id"]).intuition_resistance_spent == 0


def test_an_allys_desk_that_opens_gets_an_open_offer_again(client):
    """Fixed (playtest 2, ally-offer-cards-lost-or-stale): a reload lost an ally's Behind
    Me card while the server still took the answer. A desk that opens while the mark can
    be answered gets the offer again with the seconds left; once it is answered, not."""
    camp = support.new_campaign(client)
    target = support.active_member(client, camp)
    guard = support.active_member(client, camp, nerve_current=2, role_ability="Behind Me")
    with support.ws_connect(client, target["id"]) as wt:
        wt.send("take_mark", mark_type="body")
        wt.sync()
        with support.ws_connect(client, guard["id"]) as wg:
            msgs = wg.sync()
            assert support.types(msgs) == ["ability_intercept_offer", "activity_history"]
            offer = msgs[0]["payload"]
            assert offer == {"ability": "Behind Me", "mark_type": "body", "character_id": target["id"],
                             "character_name": target["name"], "action": "intercept", "expires_in": ANY}
            assert 110 <= offer["expires_in"] <= 120
            wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
            wg.sync()
        with support.ws_connect(client, guard["id"]) as wg:
            assert "ability_intercept_offer" not in support.types(wg.sync())
    assert support.fetch(Character, guard["id"]).body_marks == 1


def test_behind_me_lands_the_guards_own_held_mark_first(client):
    """Fixed: with their own soak offer open (the mark held), a guard who used Behind Me
    had the held mark replaced by the intercepted one, and lost. It lands first now."""
    target, guard = _allies(client, dict(), dict(nerve_current=2, cunning_max=3,
                                                    role_ability="Behind Me", specialty_ability="In the Trenches"))
    with support.ws_connect(client, guard["id"]) as wg, support.ws_connect(client, target["id"]) as wt:
        wg.send("take_mark", mark_type="body", is_from_enemy=False)
        assert wg.sync()[0]["payload"]["action"] == "soak"  # the guard's own mark is held
        wt.send("take_mark", mark_type="body", is_from_enemy=False)
        wt.sync()
        wg.drain()
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        msgs = wg.sync()
        # the held mark lands, then the intercepted one is offered to the guard's soak
        assert [m["payload"]["body_marks"] for m in msgs if m["type"] == "character_update"][-1] == 1
        assert msgs[-1]["type"] == "ability_mark_offer"
    assert support.fetch(Character, target["id"]).body_marks == 0
    assert support.fetch(Character, guard["id"]).body_marks == 1


def test_a_soaked_mark_stays_soaked_when_the_target_takes_another(client):
    """Fixed: the target's socket kept its own copy of the row, so its next mark was
    counted from the old value and undid the ally's Premonitions. Each message now
    reads the row fresh (vtt/ws/endpoint.py)."""
    target, seer = _allies(client, dict(body_marks=2), dict(intuition_max=3, specialty_ability="Premonitions"))
    with support.ws_connect(client, target["id"]) as wt, support.ws_connect(client, seer["id"]) as wsr:
        wt.send("update_pen_font", pen_font="Kalam")  # the target's socket has loaded its row
        wt.sync()
        support.offer_intercept(target["id"], "body")
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="body")
        wsr.sync()
        wt.drain()
        wt.send("take_mark", mark_type="body")
        assert wt.sync()[0]["payload"]["body_marks"] == 2
    assert support.fetch(Character, target["id"]).body_marks == 2


def test_premonitions_needs_a_mark_to_soak(client):
    target, seer = _allies(client, dict(bleed_marks=0), dict(intuition_max=3, specialty_ability="Premonitions"))
    with support.ws_connect(client, seer["id"]) as wsr:
        support.offer_intercept(target["id"], "bleed")
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="bleed")
        assert wsr.sync() == [{"type": "action_rejected", "payload": {
            "action": "intercept_mark", "status": 409, "detail": "There is no such mark to soak."}}]
        wsr.send("intercept_mark", ability="Premonitions", target_character_id=target["id"], mark_type="soul")
        assert support.types(wsr.sync()) == ["action_rejected"]
    assert support.fetch(Character, seer["id"]).intuition_resistance_spent == 0


def test_apply_scar_with_shift(client):
    ch = support.forge(client, move=2, sense=0)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="Burned hand", shift_down="move", shift_up="sense")
        p = ws.sync()[0]["payload"]
        assert p["scars_list"] == ["Burned hand"]
        assert p["scars_count"] == 1
        assert (p["move"], p["sense"]) == (1, 1)
        # Fixed (RULES_CHECK 12): keeping the ratings needs Hardened (or Not Again)
        ws.send("apply_scar", scar_text="Limp", shift_down="move", shift_up="sense", skip_shifts=True)
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "apply_scar", "status": 422,
            "detail": "A scar shifts an action point: choose one action to lower and one to raise. "
                      "Only Hardened, or a Not Again scar, keeps the ratings as they are."}}]
        ws.send("apply_scar", scar_text="", shift_down="sense", shift_up="move")
        p = ws.sync()[0]["payload"]
        assert (p["move"], p["sense"], p["scars_count"]) == (2, 0, 1)


def test_hardened_and_not_again_keep_the_ratings(client):
    hardened = support.forge(client, move=2, specialty_ability="Hardened")
    with support.ws_connect(client, hardened["id"]) as ws:
        ws.send("apply_scar", scar_text="Scar", skip_shifts=True)
        p = ws.sync()[0]["payload"]
        assert (p["move"], p["scars_count"]) == (2, 1)
    lesson = support.forge(client, move=2, specialty_ability="Not Again")
    with support.ws_connect(client, lesson["id"]) as ws:
        ws.send("apply_scar", scar_text="The lesson", skip_shifts=True, not_again=True)
        p = ws.sync()[0]["payload"]
        assert (p["scars_count"], p["ability_uses"]) == (1, {"Not Again": 1})
        ws.send("apply_scar", scar_text="Again", skip_shifts=True, not_again=True)  # once per assignment
        assert support.types(ws.sync()) == ["action_rejected"]


def test_a_scar_taken_for_not_again_or_forbidden_ritual(client):
    """Not Again (p. 29): a scar for an automatic full success, once per assignment, with
    the ratings left alone. Forbidden Ritual (p. 32): a Bleed scar, which shifts a point
    as a scar does. The desk sends the ability's name, and the table hears of it."""
    lesson = support.forge(client, move=2, sense=0, specialty_ability="Not Again")
    with support.ws_connect(client, lesson["id"]) as ws:
        # Shifts sent with a Not Again scar are not applied
        ws.send("apply_scar", scar_text="The lesson", shift_down="move", shift_up="sense", ability="Not Again")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        p = msgs[0]["payload"]
        assert (p["move"], p["sense"], p["scars_list"], p["ability_uses"]) == (2, 0, ["The lesson"], {"Not Again": 1})
        assert msgs[1]["payload"]["message"] == f"{lesson['name']} used Not Again: a scar, and an automatic full success."
        ws.send("apply_scar", scar_text="Again", skip_shifts=True, ability="Not Again")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "apply_scar", "status": 409, "detail": "Not Again is used for this assignment."}}]
    ritual = support.forge(client, move=2, sense=0, specialty_ability="Forbidden Ritual")
    with support.ws_connect(client, ritual["id"]) as ws:
        ws.send("apply_scar", scar_text="Burned palms", skip_shifts=True, ability="Forbidden Ritual")
        assert support.types(ws.sync()) == ["action_rejected"]   # a Bleed scar still shifts
        ws.send("apply_scar", scar_text="Burned palms", shift_down="move", shift_up="sense", ability="Forbidden Ritual")
        msgs = ws.sync()
        assert (msgs[0]["payload"]["move"], msgs[0]["payload"]["sense"], msgs[0]["payload"]["scars_count"]) == (1, 1, 1)
        assert msgs[1]["payload"]["message"] == f"{ritual['name']} used Forbidden Ritual and took a Bleed scar."
        # Not this character's ability, or no such scar ability
        ws.send("apply_scar", scar_text="x", skip_shifts=True, ability="Not Again")
        ws.send("apply_scar", scar_text="x", shift_down="move", shift_up="sense", ability="Ritual")
        ws.send("apply_scar", scar_text="x", shift_down="move", shift_up="sense", ability=["Not Again"])
        assert [m["payload"]["status"] for m in ws.sync()] == [409, 422, 422]
    assert support.fetch(Character, ritual["id"]).scars_count == 1


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


def test_apply_scar_words_are_text_of_up_to_500_characters(client):
    """The scar form's words and its shift note fit in 500 characters (the description is
    capped at 460). A longer scar, or one that is not text, used to be stored as it came, and
    the Lightkeeper's trauma record then refused every correction around it."""
    ch = support.forge(client, move=2, sense=0)
    too_long = {"type": "action_rejected", "payload": {
        "action": "apply_scar", "status": 422, "detail": "A scar is a description of up to 500 characters."}}
    with support.ws_connect(client, ch["id"]) as ws:
        for words in ("x" * 501, ["A limp"], 7, {"text": "A limp"}):
            ws.send("apply_scar", scar_text=words, shift_down="move", shift_up="sense")
            assert ws.sync() == [too_long]
        ws.send("apply_scar", scar_text="x" * 500, shift_down="move", shift_up="sense")
        assert ws.sync()[0]["payload"]["scars_list"] == ["x" * 500]
    row = support.fetch(Character, ch["id"])
    assert (row.scars_count, row.move, row.sense) == (1, 1, 1)


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
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("revive_character")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "activity_log", "member_status"]
        p = msgs[0]["payload"]
        # Fixed (RULES_CHECK 9): only incapacitated clears; the other tracks keep their marks
        assert (p["body_marks"], p["brain_marks"], p["bleed_marks"], p["incapacitated"]) == (2, 1, 3, False)
        assert p["is_dead"] is False
        assert msgs[1]["payload"] == {"message": f"{ch['name']} has been revived and is operational.",
                                      "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        assert gm.drain() == [{"type": "member_update", "payload": p}, msgs[1]]



def test_a_second_revive_does_nothing(client):
    """A double press on the Lightkeeper's Revive revived twice and logged
    "has been revived" twice on every desk (re-check of playtest 2): a revive for someone
    already able to act sends nothing."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("revive_character", character_id=ch["id"])
        gm.send("revive_character", character_id=ch["id"])
        lines = [m for m in gm.sync() if m["type"] == "activity_log"]
        assert [m["payload"]["message"] for m in lines] == [f"{ch['name']} has been revived and is operational."]
        assert support.types(ws.drain()) == ["character_update", "activity_log", "member_status"]
    assert support.fetch(Character, ch["id"]).incapacitated is False

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
        assert support.types(msgs) == ["character_update", "activity_log"]
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
            "options": [{"ability": "Steel Mind", "resist_key": "intuition"}], "action": "soak",
            "offer_id": ANY}}]


def test_body_soak_ignores_brain_abilities_and_brain_ignores_body(client):
    ch = support.forge(client, nerve_max=3, cunning_max=3,
                       role_ability="Compartmentalization", specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed")
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
        ws.send("take_mark", mark_type="body")
        assert ws.sync()[0]["payload"]["options"] == [{"ability": "In the Trenches", "resist_key": "cunning"}]
        ws.send("take_mark", mark_type="brain")  # the body mark the offer held lands first
        msgs = ws.sync()
        assert support.of_type(msgs, "character_update")[0]["payload"]["body_marks"] == 1
        assert msgs[-1]["payload"]["options"] == [{"ability": "Compartmentalization", "resist_key": "nerve"}]


# --- intercept_mark: what happens to the interceptor --------------------------

@pytest.mark.parametrize("soak,mark_type,fields", [
    ("In the Trenches", "body", dict(cunning_max=3)),
    ("Compartmentalization", "brain", dict(nerve_max=3)),
    ("Steel Mind", "brain", dict(intuition_max=3)),
])
def test_intercept_offers_interceptor_a_soak_that_holds_the_mark(client, soak, mark_type, fields):
    """Fixed (RULES_CHECK 10): the interceptor takes the mark as any mark is taken. Their
    soak offer lists its options like take_mark's, and declining it lands the mark."""
    target, guard = _allies(client, {f"{mark_type}_marks": 2},
                            dict(nerve_current=2, role_ability="Behind Me", specialty_ability=soak,
                                 **{"nerve_max": 3, **fields}))
    with support.ws_connect(client, guard["id"]) as wg:
        support.offer_intercept(target["id"], mark_type)
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type=mark_type)
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "ability_mark_offer"]
        assert msgs[0]["payload"]["message"] == f"{guard['name']} used Behind Me to intercept a mark for {target['name']}!"
        resist = {"In the Trenches": "cunning", "Compartmentalization": "nerve", "Steel Mind": "intuition"}[soak]
        assert msgs[1]["payload"] == {"ability": soak, "mark_type": mark_type, "character_id": guard["id"],
                                      "options": [{"ability": soak, "resist_key": resist}], "action": "soak",
                                      "offer_id": ANY}
        g = support.fetch(Character, guard["id"])
        assert (g.nerve_current, getattr(g, f"{mark_type}_marks")) == (1, 0)
        assert getattr(support.fetch(Character, target["id"]), f"{mark_type}_marks") == 1
        wg.send("resolve_ability_mark", ability=soak, choice="decline", mark_type=mark_type)
        assert ws_marks(wg.sync(), mark_type) == [1]
    assert getattr(support.fetch(Character, guard["id"]), f"{mark_type}_marks") == 1


def ws_marks(msgs, mark_type):
    return [m["payload"][f"{mark_type}_marks"] for m in msgs if m["type"] == "character_update"]


def test_intercept_soak_skipped_when_used(client):
    target, guard = _allies(client, dict(body_marks=2),
                            dict(nerve_current=2, cunning_max=3, role_ability="Behind Me",
                                 specialty_ability="In the Trenches"))
    support.update(Character, guard["id"], ability_uses={"In the Trenches": 1})
    with support.ws_connect(client, guard["id"]) as wg:
        support.offer_intercept(target["id"], "body")
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="body")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update", "activity_log"]
        assert msgs[1]["payload"]["body_marks"] == 1


def test_intercept_back_against_the_wall_does_not_block_the_mark(client):
    """Back Against the Wall is no soak anywhere, so the brain mark lands."""
    target, guard = _allies(client, dict(brain_marks=1),
                            dict(nerve_current=1, role_ability="Behind Me", specialty_ability="Back Against the Wall"))
    with support.ws_connect(client, guard["id"]) as wg:
        support.offer_intercept(target["id"], "brain")
        wg.send("intercept_mark", ability="Behind Me", target_character_id=target["id"], mark_type="brain")
        msgs = wg.sync()
        assert support.types(msgs) == ["activity_log", "character_update", "activity_log"]
        assert msgs[1]["payload"]["brain_marks"] == 1
    assert support.fetch(Character, guard["id"]).brain_marks == 1
    assert support.fetch(Character, target["id"]).brain_marks == 0


def test_intercept_unknown_target_is_rejected(client):
    """Before tokens an unknown target still cost the interceptor a nerve and a mark
    ("intercept a mark for an ally!"); an unknown id is 404 now."""
    camp = support.new_campaign(client)
    guard = support.active_member(client, camp, nerve_current=2, role_ability="Behind Me")
    with support.ws_connect(client, guard["id"]) as wg:
        support.offer_intercept(987654321, "bleed")
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
    goes only to the acting character's own channel, and the GM gets the sheet as
    member_update. The other members never see it."""
    camp = support.new_campaign(client)
    actor = support.active_member(client, camp, specialty_ability=ability, **fields)
    other = support.active_member(client, camp)
    if action == "intercept_mark":
        payload = dict(payload, target_character_id=other["id"])
    if ability == "Premonitions":
        support.update(Character, other["id"], body_marks=1)  # a mark for the seer to soak
    if action == "intercept_mark":
        support.offer_intercept(other["id"], payload["mark_type"])  # offered to the allies
    if action == "use_post_roll_ability":
        # The roll each one answers (RULES_CHECK 28): a failed Cunning roll for Flourish,
        # a 3 for Learn from My Mistakes, a mixed Sense roll for Bending Spoons
        rolls._last_roll[actor["id"]] = {
            "Flourish": {"action": "sneak", "cat": "cunning", "result": 2, "outcome": "failure", "used": set()},
            "Learn from My Mistakes": {"action": "move", "cat": "nerve", "result": 3, "outcome": "failure", "used": set()},
            "Bending Spoons": {"action": "sense", "cat": "intuition", "result": 5, "outcome": "mixed_success", "used": set()},
        }[ability]
    with support.ws_connect(client, actor["id"]) as wa, support.ws_connect(client, other["id"]) as wo, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        if ability == "Adrenaline Rush":
            # The offer comes with a mark (it can be used once per offer)
            wa.send("take_mark", mark_type="bleed")
            wa.sync()
            wo.drain()
            gm.drain()
        wa.send(action, **payload)
        msgs = wa.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        assert msgs[0]["payload"]["id"] == actor["id"]
        log = msgs[1]
        assert log["payload"]["ink_color"] == engine.INK_COLORS[0]
        assert log["payload"]["message"].startswith(f"{actor['name']} used {ability} {EM} ")
        seen = wo.drain()
        sheets = [msgs[0]["payload"]]
        if ability == "Premonitions":
            # The ally whose mark was soaked gets their own sheet's update
            assert support.types(seen) == ["character_update", "activity_log"]
            assert (seen[0]["payload"]["id"], seen[0]["payload"]["body_marks"]) == (other["id"], 0)
            sheets.append(seen[0]["payload"])
            seen = seen[1:]
        assert seen == [log]
        assert gm.drain() == [{"type": "member_update", "payload": s} for s in sheets] + [log]


# --- the Lightkeeper deals a mark ----------------------------------------------------------------

def test_a_mark_the_lightkeeper_deals_offers_what_a_mark_taken_offers(client):
    """Fixed (playtest, lk-mark-skips-abilities): the Lightkeeper's only mark control set
    the track, so no soak, Death Defy, Behind Me, Premonitions or Let Them In was offered
    for a story consequence. A take_mark from the GM socket naming a member now goes the
    way the player's own does, its offers to the player's desk, and the log says the
    Lightkeeper dealt it."""
    camp = support.new_campaign(client)
    edda = support.active_member(client, camp, role_ability="Let Them In")
    jonah = support.active_member(client, camp, role_ability="Behind Me", nerve_current=2)
    with support.ws_connect(client, edda["id"]) as we, support.ws_connect(client, jonah["id"]) as wj, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=edda["id"], mark_type="bleed", is_from_enemy=False)
        sent = gm.sync()
        assert "ability_mark_offer" not in support.types(sent)
        lines = [m["payload"]["message"] for m in sent if m["type"] == "activity_log"]
        # One line for the deal and where it landed (playtest, log-lines-doubled-per-event),
        # then who was offered an answer to it (playtest 3, behind-me-offer-unseen)
        assert lines == [f"The Lightkeeper dealt {edda['name']} a Bleed mark (1 of 3).",
                         f"{jonah['name']} is offered Behind Me for {edda['name']}'s Bleed mark (2 minutes)."]
        got = we.drain(0.5)
        assert support.of_type(got, "character_update")[0]["payload"]["bleed_marks"] == 1
        assert {"ability": "Let Them In", "mark_type": "bleed", "character_id": edda["id"],
                "action": "info"} in [m["payload"] for m in got if m["type"] == "ability_mark_offer"]
        offer = next(m for m in wj.drain(0.5) if m["type"] == "ability_intercept_offer")["payload"]
        assert (offer["ability"], offer["character_id"]) == ("Behind Me", edda["id"])
    assert support.fetch(Character, edda["id"]).bleed_marks == 1


def test_an_enemys_mark_the_lightkeeper_deals_offers_death_defy_to_the_player(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        gm.sync()
        offer = next(m for m in wc.drain(0.5) if m["type"] == "ability_mark_offer")["payload"]
        assert (offer["ability"], offer["action"]) == ("Death Defy", "escape")
        # Held for the player's answer: nothing landed yet
        assert support.fetch(Character, ch["id"]).body_marks == 0
        wc.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body")
        wc.sync()
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_a_mark_dealt_while_the_players_desk_is_closed_lands_at_once(client):
    """No desk is open to answer a soak or Death Defy, and a held mark would wait for one
    that never comes: the mark lands at once, and the log says why nothing was offered."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role_ability="Death Defy", specialty_ability="In the Trenches",
                               cunning_max=3)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        lines = [m["payload"]["message"] for m in gm.sync() if m["type"] == "activity_log"]
        assert lines == [(f"The Lightkeeper dealt {ch['name']} a Body mark. "
                          "Their desk is closed, so it landed without a soak or Death Defy."),
                         f"{ch['name']} took a Body mark (1 of 3)."]
    assert support.fetch(Character, ch["id"]).body_marks == 1


# --- the log's line for a mark that lands (playtest, self-mark-no-log) ---------------------------

def test_a_mark_taken_as_an_abilitys_cost_has_one_line(client):
    """A mark an ability takes as its cost lands through apply_mark too, but the use's own
    line already names it, so it is not announced a second time."""
    ch = support.forge(client, specialty_ability="Occult Researcher")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("use_ability", ability="Occult Researcher")
        lines = [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"]
        assert lines == [f"{ch['name']} used Occult Researcher (took a Brain mark)."]
    assert support.fetch(Character, ch["id"]).brain_marks == 1


def test_a_refused_soak_lands_the_mark_without_naming_it_passed_on(client):
    """A soak the server cannot pay for (its resistance burned meanwhile) lands the mark it
    held; the player pressed Use, so the line does not say they passed it on."""
    ch = support.forge(client, body_marks=1, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        ws.sync()
        support.update(Character, ch["id"], cunning_resistance_spent=1)
        ws.send("resolve_ability_mark", ability="In the Trenches", choice="soak")
        msgs = ws.sync()
        assert support.types(msgs) == ["action_rejected", "character_update", "activity_log"]
        assert msgs[2]["payload"]["message"] == f"{ch['name']} took a Body mark (2 of 3)."
    assert support.fetch(Character, ch["id"]).body_marks == 2


def test_a_held_mark_that_lands_when_another_comes_is_logged(client):
    """A mark an open offer holds lands first when another mark comes (mark_or_offer); the
    player passed nothing on, so its line is the plain one."""
    ch = support.forge(client, cunning_max=3, specialty_ability="In the Trenches")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body", is_from_enemy=False)
        assert support.types(ws.sync()) == ["ability_mark_offer"]
        ws.send("take_mark", mark_type="bleed", is_from_enemy=False)   # (and closes the offer)
        lines = [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"]
        assert lines == [f"{ch['name']} took a Body mark (1 of 3).", f"{ch['name']} took a Bleed mark (1 of 3)."]


def test_a_dead_investigators_sheet_is_a_record(client):
    """Once the fourth scar is taken the player's socket can no longer roll, take a mark,
    change gear or a drive, or spend the circle's resources (playtest,
    dead-investigator-still-acts); the Lightkeeper's Deal a mark is refused for them too.
    Chat and the Lightkeeper's other corrections stand."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, is_dead=True, incapacitated=True, scars_count=4,
                               scars_list=["a", "b", "c", "d"])
    refusal = lambda action: {"type": "action_rejected", "payload": {
        "action": action, "status": 409, "detail": f"{ch['name']} is dead: the sheet is a record."}}
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        for action, payload in (("roll", {"action": "move"}), ("take_mark", {"mark_type": "body"}),
                                ("update_gear", {"gear": ["Rope"]}), ("update_drive", {"pool": "nerve", "value": 1}),
                                ("spend_resource", {"resource_type": "refresh"}), ("use_ability", {"ability": "Hardened"}),
                                ("revive_character", {})):
            ws.send(action, **payload)
            assert ws.sync() == [refusal(action)]
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        assert gm.sync() == [refusal("take_mark")]
        gm.send("update_gear", character_id=ch["id"], gear=["Rope"])
        assert support.types(gm.sync()) != ["action_rejected"]
        ws.send("chat_message", message="Still here")
        assert "action_rejected" not in support.types(ws.sync())
    row = support.fetch(Character, ch["id"])
    assert row.body_marks == 0 and row.incapacitated is True


def test_the_lightkeepers_revive_reaches_the_players_desk(client):
    """revive_character from the Lightkeeper's socket sent the sheet to the Lightkeeper's
    channel only, so the player's desk kept showing Incapacitated (playtest,
    lightkeeper-has-no-revive)."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("revive_character", character_id=ch["id"])
        gm.sync()
        seen = ws.drain()
        assert support.types(seen) == ["character_update", "activity_log", "member_status"]
        assert seen[0]["payload"]["incapacitated"] is False
    assert support.fetch(Character, ch["id"]).incapacitated is False


def test_a_gilded_roll_made_in_life_is_finished_after_the_death_it_led_to(client, dice):
    """A gilded roll waits for its die, a mark follows it and the fourth scar is recorded:
    the die could never be kept, since resolve_gilded was refused for the dead (409), and
    the desk got its Keep buttons again on every connect (final check of playtest 2,
    dead-investigator-still-acts). The server holds that roll, so its choice goes
    through: scored and logged, with no drive back on a sheet that is a record now, and
    the roll is not burned on."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, nerve_max=3, nerve_current=2,
                               scars_count=3, scars_list=["a", "b", "c"])
    dice(3, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        assert support.types(ws.sync()) == ["roll_result"]
        ws.send("apply_scar", scar_text="d", skip_shifts=True)
        assert ws.sync()[0]["payload"]["is_dead"] is True
        ws.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=3)
        kept, line = ws.sync()
        assert (kept["type"], kept["payload"]["value"], kept["payload"]["outcome"]) == ("roll_kept", 3, "failure")
        assert line["type"] == "activity_log"
        assert line["payload"]["message"].endswith("(2 dice: 3 gilded, 5; kept the gilded 3).")
        # Once kept, the roll is gone, and the dead sheet's other actions are still refused
        for action, payload in (("resolve_gilded", {"action": "move", "chosen_type": "gilded"}),
                                ("burn_resistance", {"drive": "nerve"})):
            ws.send(action, **payload)
            assert ws.sync() == [{"type": "action_rejected", "payload": {
                "action": action, "status": 409, "detail": f"{ch['name']} is dead: the sheet is a record."}}]
    with support.ws_connect(client, ch["id"]) as ws:
        assert "roll_result" not in support.types(ws.drain())
    assert support.fetch(Character, ch["id"]).nerve_current == 2


def test_a_held_offer_is_dropped_at_the_death(client):
    """A soak offer holds a mark the Lightkeeper dealt while the fourth scar was still to
    be recorded; the scar kills. Its answer would be refused for the dead, and the offer
    came back on every connect: it is dropped, its mark is not taken, and the desk is told
    (mark_offer_closed with dropped)."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, cunning_max=3, specialty_ability="In the Trenches",
                               scars_count=3, scars_list=["a", "b", "c"])
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body", is_from_enemy=False)
        gm.sync()
        assert support.types(ws.drain()) == ["activity_log", "ability_mark_offer"]
        ws.send("apply_scar", scar_text="d", skip_shifts=True)
        seen = ws.sync()
        assert seen[0]["payload"]["is_dead"] is True
        closed = [m["payload"] for m in seen if m["type"] == "mark_offer_closed"]
        assert closed == [{"character_id": ch["id"], "ability": "In the Trenches", "mark_type": "body", "dropped": True}]
    with support.ws_connect(client, ch["id"]) as ws:
        assert "ability_mark_offer" not in support.types(ws.drain())
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.is_dead) == (0, True)


def test_a_scar_owed_is_on_the_sheet_and_the_recorded_scar_is_logged(client):
    """Playtest 3 (scar-pending-invisible-to-lightkeeper, scar-recorded-no-confirmation):
    the Lightkeeper's sheet showed only Incapacitated while a scar was owed, and a recorded
    scar left no line. The sheet carries scar_pending from the fourth mark until the scar
    is written, the log says "recorded a scar (n of 4)", and the players' circle cards are
    sent who is down and the scar count (member_status)."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=3)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("take_mark", mark_type="body")
        ws.sync()
        owed = [m for m in gm.drain() if m["type"] == "member_update"]
        assert owed[0]["payload"]["scar_pending"] is True
        ws.send("apply_scar", scar_text="A limp", shift_down="move", shift_up="sense")
        msgs = ws.sync()
        assert support.types(msgs) == ["character_update", "member_status", "activity_log"]
        assert msgs[0]["payload"]["scar_pending"] is False
        assert msgs[1]["payload"] == {"character_id": ch["id"], "campaign_id": camp["id"], "is_dead": False,
                                      "incapacitated": True, "scars_count": 1}
        assert msgs[2]["payload"]["message"] == f"{ch['name']} recorded a scar (1 of 4)."
        assert msgs[2]["payload"]["log_type"] == "field"


def test_marks_on_an_investigator_already_down_are_logged_as_another_scar(client):
    """Playtest 3: a fourth mark dealt to an incapacitated investigator logged "has been
    incapacitated!" again; it is another scar owed, and the line says so."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, incapacitated=True, scars_count=1, scars_list=["a"], bleed_marks=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="bleed")
        said = [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"]
    assert said[-1] == f"{ch['name']} takes another scar: a fourth Bleed mark while down."


def test_commune_use_line_reminds_of_the_sense_roll(client):
    """Commune takes its Brain mark when used; the Sense roll it calls for is the
    player's next step, so the line says so (playtest, commune-use-not-tied-to-roll)."""
    ch = support.forge(client, specialty_ability="Commune")
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("use_ability", ability="Commune")
        lines = [m["payload"]["message"] for m in ws.sync() if m["type"] == "activity_log"]
        assert lines == [f"{ch['name']} used Commune (took a Brain mark, then roll Sense)."]
    assert support.fetch(Character, ch["id"]).brain_marks == 1


def test_a_dealt_mark_held_for_an_offer_logs_the_deal_once_and_the_landing_later(client):
    """A mark held for the player's answer gets the deal's line now (it has not landed);
    the landing then reads as the player's own, so no line is doubled."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        lines = [m["payload"]["message"] for m in gm.sync() if m["type"] == "activity_log"]
        assert lines == [f"The Lightkeeper dealt {ch['name']} a Body mark."]
        wc.send("resolve_ability_mark", ability="Death Defy", choice="decline", mark_type="body")
        wc.sync()
        later = [m["payload"]["message"] for m in gm.drain(0.5) if m["type"] == "activity_log"]
        assert later == [f"{ch['name']} passed on Death Defy and took a Body mark (1 of 3)."]


def test_a_dealt_fourth_mark_is_one_line(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=3)
    with support.ws_connect(client, ch["id"]), support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        lines = [m["payload"]["message"] for m in gm.sync() if m["type"] == "activity_log"]
        assert lines[0] == f"The Lightkeeper dealt {ch['name']} a fourth Body mark."
        assert lines.count(lines[0]) == 1
