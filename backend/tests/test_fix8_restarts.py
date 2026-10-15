"""Fix round 8, restarts group: what a restart or a reload leaves, a roll over a waiting
gilded choice, a mark dealt beside a stored Death Defy hold, and Non-Combatant's drive
points (issues #78, #79, #80 and #81)."""
import support
from models import Character
from vtt.ws.handlers import marks

EM, DOT = support.EM, support.DOT


# --- #78: activity_history ends the connect frames -------------------------------------------

def test_every_connect_ends_with_the_logs_history_empty_too(client, dice):
    """Fixed (#78): activity_history was sent only when the channel had lines, so nothing
    told a desk that the connect frames were over, and a desk whose open roll the server
    no longer held (a restart) kept offering Burn and reroll for it. It is the last frame
    of every connect now, empty too, after a roll sent again."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=1)
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.empty_history is True
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        assert gm.empty_history is True
    dice(2)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        ws.sync()
    with support.ws_connect(client, ch["id"]) as again:
        assert support.types(again.queued) == ["roll_result", "activity_history"]
        assert again.queued[0]["payload"]["replayed"] is True
        assert again.queued[1]["payload"]["entries"][-1]["message"].startswith(f"{ch['name']} rolled move")


def test_a_restart_sends_no_roll_back_and_still_ends_the_connect(client, dice, monkeypatch):
    """After a restart the server holds no roll (in memory only): a desk that opens is
    sent none, and its history still closes the connect frames, so the desk knows the
    roll it shows is gone (the store says so and offers no burn)."""
    from vtt.ws.handlers import rolls
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, nerve_max=3, nerve_current=3)
    dice(3, 5)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="move", drive_spent=0)
        [held] = ws.sync()
        assert held["payload"]["roll"]["needs_gilded_choice"] is True
    for name in ("_pending_gilded", "_shown_roll", "_last_roll", "_roll_replies"):
        monkeypatch.setattr(rolls, name, {})
    with support.ws_connect(client, ch["id"]) as again:
        assert again.empty_history is True and again.queued == []
        again.send("resolve_gilded", action="move", chosen_type="gilded", chosen_value=3)
        assert again.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_gilded", "status": 409, "detail": rolls.NO_CHOICE_WAITING}}]


# --- #80: no roll over a waiting gilded choice ----------------------------------------------

def test_a_roll_is_refused_while_a_gilded_die_waits(client, dice):
    """Fixed (#80): the server took a new roll while a gilded choice waited, and the held
    roll was dropped: only the desk kept a player from rolling over it, so a second tab or
    device could. The roll is refused, nothing is rolled or spent, and the die can still
    be kept. The same roll sent again (its roll_id) is still answered with its result."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, move=2, gilded_move=True, sway=1, nerve_max=3, nerve_current=3,
                               cunning_max=3, cunning_current=3)
    dice(3, 5)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("roll", action="move", drive_spent=0, roll_id="held-1")
        [held] = ws.sync()
        ws.send("roll", action="sway", drive_spent=1, roll_id="other-2")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "roll", "status": 409, "detail": "Keep a die from your last roll first."}}]
        ws.send("roll", action="move", drive_spent=0, roll_id="held-1")
        assert ws.sync()[0]["payload"]["roll"] == held["payload"]["roll"]
        assert support.of_type(gm.drain(), "dice_thrown") == []
        ws.send("resolve_gilded", action="move", chosen_type="regular", chosen_value=5)
        assert support.types(ws.sync()) == ["roll_kept", "activity_log"]
        dice(4, 2)
        ws.send("roll", action="sway", drive_spent=1, roll_id="other-3")
        assert support.types(ws.sync()) == ["roll_result", "activity_log"]
    row = support.fetch(Character, ch["id"])
    assert (row.nerve_current, row.cunning_current) == (3, 2)


# --- #81: a mark dealt to a closed desk beside a stored hold -------------------------------------

def test_a_mark_dealt_to_a_closed_desk_lands_the_held_one_first(client):
    """Fixed (#81, decision 5): a mark the Lightkeeper dealt to a closed desk landed at
    once beside a stored Death Defy hold, which stayed, and the desk that opened was then
    offered Death Defy for a harm a mark of had already landed. The held mark lands first
    and its offer closes; then the new mark lands, and no offer comes back."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        gm.sync()
        offer = next(m for m in wc.drain(0.5) if m["type"] == "ability_mark_offer")["payload"]
        assert offer["ability"] == "Death Defy"
    assert support.fetch(Character, ch["id"]).held_mark is not None
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="body")
        lines = [m["payload"]["message"] for m in gm.sync() if m["type"] == "activity_log"]
        assert lines == [f"{ch['name']} took a Body mark (1 of 3).",
                         (f"The Lightkeeper dealt {ch['name']} a Body mark. "
                          "Their desk is closed, so it landed without a soak or Death Defy."),
                         f"{ch['name']} took a Body mark (2 of 3)."]
    row = support.fetch(Character, ch["id"])
    assert (row.body_marks, row.held_mark) == (2, None)
    with support.ws_connect(client, ch["id"]) as again:
        assert support.of_type(again.drain(0.3), "ability_mark_offer") == []


# --- #79: Non-Combatant's drive points --------------------------------------------------------

def _doctor_and_ally(client):
    camp = support.new_campaign(client)
    doctor = support.active_member(client, camp, specialty_ability="Non-Combatant")
    ally = support.active_member(client, camp, nerve_max=3, nerve_current=1, cunning_max=3, cunning_current=3)
    return camp, doctor, ally


def test_a_non_combatant_point_comes_back_to_a_desk_that_opens_in_its_window(client):
    """Fixed (#79): only Behind Me and Premonitions were sent again to a desk that opened
    in their window, so an ally who reloaded lost the Non-Combatant card while the server
    still held the point. Each point still open comes back, with the seconds left."""
    camp, doctor, ally = _doctor_and_ally(client)
    with support.ws_connect(client, doctor["id"]) as wd:
        wd.send("take_mark", mark_type="brain", is_from_enemy=False)
        wd.sync()
    with support.ws_connect(client, ally["id"]) as wa:
        [offer] = support.of_type(wa.queued, "ability_mark_offer")
        assert offer["payload"] == {"ability": "Non-Combatant", "mark_type": "brain", "character_id": doctor["id"],
                                    "character_name": doctor["name"], "action": "drive_refresh",
                                    "expires_in": offer["payload"]["expires_in"]}
        assert 100 < offer["payload"]["expires_in"] < 120
        wa.drain()
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")
        msgs = wa.sync()
        assert msgs[1]["payload"]["message"] == f"{ally['name']} recovered 1 Nerve (Non-Combatant)."
    # Taken: a desk that opens now is not offered it again
    with support.ws_connect(client, ally["id"]) as again:
        assert support.of_type(again.queued, "ability_mark_offer") == []
    assert support.fetch(Character, ally["id"]).nerve_current == 2


def test_a_non_combatant_point_is_gone_after_a_restart(client, monkeypatch):
    """The points live in memory, like the other ally offers (decisions_fix6 1): after a
    restart none comes back, and an answer from a card kept from before is refused."""
    camp, doctor, ally = _doctor_and_ally(client)
    with support.ws_connect(client, doctor["id"]) as wd:
        wd.send("take_mark", mark_type="body", is_from_enemy=False)
        wd.sync()
    monkeypatch.setattr(marks, "_non_combatant", {})
    with support.ws_connect(client, ally["id"]) as wa:
        assert support.of_type(wa.queued, "ability_mark_offer") == []
        wa.drain()
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")
        assert wa.sync() == [{"type": "action_rejected", "payload": {
            "action": "resolve_ability_mark", "status": 409, "detail": "No Non-Combatant drive point is waiting."}}]
    assert support.fetch(Character, ally["id"]).nerve_current == 1


def test_a_full_drive_is_refused_and_the_point_kept(client):
    """Fixed (#79): a Non-Combatant pick of a full drive logged "recovered 1" and used the
    point up while nothing came back. It is refused, the point waits on (its card comes
    back with the sheet that shows the drive full), and the log says only what came back."""
    camp, doctor, ally = _doctor_and_ally(client)
    with support.ws_connect(client, doctor["id"]) as wd, support.ws_connect(client, ally["id"]) as wa, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wd.send("take_mark", mark_type="body", is_from_enemy=False)
        wd.sync()
        wa.drain(0.5)
        gm.drain(0.5)
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="cunning")
        msgs = wa.sync()
        assert support.types(msgs) == ["action_rejected", "character_update", "ability_mark_offer"]
        assert msgs[0]["payload"]["detail"] == "Cunning is already full."
        assert support.of_type(gm.drain(0.3), "activity_log") == []
        wa.send("resolve_ability_mark", ability="Non-Combatant", choice="nerve")
        assert support.types(wa.sync()) == ["character_update", "activity_log"]
    row = support.fetch(Character, ally["id"])
    assert (row.nerve_current, row.cunning_current) == (2, 3)
