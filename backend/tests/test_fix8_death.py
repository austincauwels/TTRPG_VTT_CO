"""Fix round 8, the death group: an owed scar kept in the database (#72), a death lowering
the circle's resources (#73), the dead filing no report (#76), a leaver's spend count kept
within the assignment (#77), the Lightkeeper's revive (#82), the held mark on the roster
card (88.1) and the Let in mark kept by the server (88.7)."""
import support
from models import Character, Circle, User
from vtt.ws.handlers import marks


def _sealed(client, members=3, **fields):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, **fields) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()["circle_id"]
    support.update(Circle, cid, is_finalized=True)
    return camp, chars, cid


def _roster_item(client, camp, char_id):
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    return next(c for c in roster["active_investigators"] if c["id"] == char_id)


# --- #72 the owed scar is stored ------------------------------------------------

def test_a_scar_owed_survives_a_restart(client, monkeypatch):
    """Fixed (#72): the owed scar was a set in the server's memory, so a restart lost it and
    the sheet, the roster card and Resuscitation forgot the scar. It is the column
    characters.scar_pending: set by the fourth mark, read on every connect and on the
    roster after a restart (nothing in memory holds it), and cleared by the recorded scar."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, body_marks=3)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        ws.sync()
    assert support.fetch(Character, ch["id"]).scar_pending is True
    # a restart keeps nothing of the marks' memory and drops the sockets: a new socket
    # reads the stored column
    for name in ("_pending_rush", "_interceptable", "_intercept_for", "_watched", "_non_combatant"):
        monkeypatch.setattr(marks, name, type(getattr(marks, name))())
    with support.ws_connect(client, ch["id"]) as again:
        assert again.initial[0]["payload"]["scar_pending"] is True
        assert _roster_item(client, camp, ch["id"])["scar_pending"] is True
        again.send("apply_scar", scar_text="A limp", shift_down="move", shift_up="sense")
        assert support.of_type(again.sync(), "character_update")[0]["payload"]["scar_pending"] is False
    assert support.fetch(Character, ch["id"]).scar_pending is False
    assert _roster_item(client, camp, ch["id"])["scar_pending"] is False


def test_the_death_clears_the_owed_scar(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, scars_count=3, scars_list=["a", "b", "c"], incapacitated=True,
                               scar_pending=True)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="d")
        assert ws.sync()[0]["payload"]["scar_pending"] is False
    row = support.fetch(Character, ch["id"])
    assert (row.is_dead, row.scar_pending) == (True, False)


# --- #73 a death lowers the resources ---------------------------------------------

def test_a_death_lowers_the_resources_on_every_desk(client):
    """Fixed (#73; decision 1 of fix round 8): a death lowered the maximum (the dead are no
    member to count) and told no desk, so every desk read 4 of 4 until a reload showed
    "4 of 3". The pools come down at once, exactly as at a release; every desk gets the
    circle, and the log says so in one line after the death's."""
    camp, (a, b, c), cid = _sealed(client)
    support.update(Circle, cid, stitch=4, refresh=4, train=3)
    support.update(Character, c["id"], scars_count=3, scars_list=["a", "b", "c"], incapacitated=True)
    with support.ws_connect(client, c["id"]) as wc, support.ws_connect(client, a["id"]) as wa, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wc.send("apply_scar", scar_text="d")
        for seen in (wc.sync(), wa.drain(0.5), gm.drain(0.5)):
            update = [m for m in seen if m["type"] == "circle_update"]
            assert (update[-1]["payload"]["stitch"], update[-1]["payload"]["refresh"],
                    update[-1]["payload"]["train"], update[-1]["payload"]["max_capacity"]) == (3, 3, 3, 3)
        lines = [line["message"] for _, line in support.stored_lines(camp["id"])]
        assert lines[-2:] == [f"{c['name']} is deceased: a fourth scar.",
                              "Stitch, Refresh and Train now hold at most 3 each."]
    circle = support.fetch(Circle, cid)
    assert (circle.stitch, circle.refresh, circle.train) == (3, 3, 3)


def test_a_death_locks_its_own_row_before_the_circle(client):
    """The death's row is written before the circle is locked, the order release_member
    locks them (the character, then the circle), so a release of the same member at the
    same moment waits rather than deadlocking. It locked the circle first (the session
    does not autoflush), with the character row still free."""
    import time
    import main
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError
    camp, (a, b, c), cid = _sealed(client)
    support.update(Character, c["id"], scars_count=3, scars_list=["a", "b", "c"], incapacitated=True)
    holder = main.SessionLocal()
    try:
        holder.execute(text("SELECT id FROM circles WHERE id = :id FOR UPDATE"), {"id": cid})
        with support.ws_connect(client, c["id"]) as wc:
            wc.send("apply_scar", scar_text="d")
            locked = False
            deadline = time.monotonic() + 3
            while not locked and time.monotonic() < deadline:
                with main.SessionLocal() as probe:
                    try:
                        probe.execute(text("SELECT id FROM characters WHERE id = :id FOR UPDATE NOWAIT"),
                                      {"id": c["id"]})
                        probe.rollback()
                        time.sleep(0.05)
                    except OperationalError:
                        locked = True
            holder.commit()
            wc.sync()
        assert locked
    finally:
        holder.close()
    assert support.fetch(Character, c["id"]).is_dead is True


def test_a_death_never_raises_a_resource_and_cuts_waiting_earn_backs(client):
    """As at a release: a pool below the new maximum stays, and Resource Management's
    earn-backs waiting are cut to the points now missing."""
    camp, (a, b, c), cid = _sealed(client)
    support.update(Circle, cid, stitch=1, refresh=4, train=3, earn_backs=3)
    support.update(Character, c["id"], scars_count=3, scars_list=["a", "b", "c"], incapacitated=True)
    with support.ws_connect(client, c["id"]) as wc:
        wc.send("apply_scar", scar_text="d")
        wc.sync()
    circle = support.fetch(Circle, cid)
    assert (circle.stitch, circle.refresh, circle.train, circle.earn_backs) == (1, 3, 3, 2)


def test_lifting_a_death_raises_nothing(client):
    """Nothing goes up when the Lightkeeper lifts the death (decisions_fix4 1)."""
    camp, (a, b, c), cid = _sealed(client)
    support.update(Character, c["id"], scars_count=3, scars_list=["a", "b", "c"], incapacitated=True)
    with support.ws_connect(client, c["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        wc.send("apply_scar", scar_text="d")
        wc.sync()
        gm.drain()
        gm.send("gm_update_scars", character_id=c["id"], scars=["a", "b", "c"], previous=["a", "b", "c", "d"])
        gm.sync()
    row = support.fetch(Character, c["id"])
    assert row.is_dead is False
    circle = support.fetch(Circle, cid)
    assert (circle.stitch, circle.refresh, circle.train) == (3, 3, 3)


# --- #76 the dead file no report ----------------------------------------------------

def test_the_dead_file_no_report(client):
    """Fixed (#76): a dead investigator could still file and amend a report. The sheet is
    a record: refused 409, as the other actions of the dead are."""
    camp, (a,), cid = _sealed(client, members=1)
    support.update(Circle, cid, reports_open=True)
    support.update(Character, a["id"], is_dead=True, incapacitated=True, scars_count=4,
                   scars_list=["a", "b", "c", "d"])
    with support.ws_connect(client, a["id"]) as ws:
        ws.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}})
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "submit_assignment_report", "status": 409,
            "detail": f"{a['name']} is dead: the sheet is a record."}}]
    assert "reports" not in (support.fetch(Circle, cid).backstory_answers or {})


# --- #77 a leaver's spends stay within the assignment ----------------------------------

def _spend_twice(client, ch, cid):
    support.update(Circle, cid, resources_editable=True, stitch=4, refresh=4, train=4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("spend_resource", resource_type="refresh")
        ws.sync()
        ws.send("spend_resource", resource_type="stitch")
        ws.sync()
    assert support.fetch(Character, ch["id"]).resources_spent_assignment == 2


def test_leaving_and_coming_back_keeps_the_spend_count(client):
    """Fixed (#77; decision 3 of fix round 8): a member who used both spends, left, asked
    again and was approved came back at 0 and could spend two more in the assignment. They
    keep their count for the assignment, as a replacement keeps its predecessor's (#41)."""
    camp, (a, b), cid = _sealed(client, members=2)
    _spend_twice(client, a, cid)
    assert client.post(f"/campaign/release/{a['id']}", headers=support.as_owner(a["id"])).status_code == 200
    assert support.fetch(Character, a["id"]).resources_spent_assignment == 0
    # the count is the server's: the circle's frames do not carry it
    with support.ws_connect(client, b["id"]) as wb:
        assert "departed_spends" not in wb.initial[1]["payload"]["backstory_answers"]
    assert support.join(client, a["id"], camp["campaign_code"]).status_code == 200
    assert support.approve(client, a["id"]).status_code == 200
    assert support.fetch(Character, a["id"]).resources_spent_assignment == 2
    assert "departed_spends" not in support.fetch(Circle, cid).backstory_answers
    train = support.fetch(Circle, cid).train
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("spend_resource", resource_type="train")
        wa.sync()
    assert support.fetch(Circle, cid).train == train


def test_the_spend_count_follows_the_player_to_another_investigator(client):
    """The two spends follow the player, not the investigator (#41): one who leaves and
    comes back with another investigator in the same assignment keeps the count too."""
    camp, (a,), cid = _sealed(client, members=1)
    _spend_twice(client, a, cid)
    owner = support.fetch(Character, a["id"]).user_id
    assert client.post(f"/campaign/release/{a['id']}", headers=support.as_gm(camp)).status_code == 200
    other = support.pending_member(client, camp, user_id=owner)
    assert support.approve(client, other["id"]).status_code == 200
    assert support.fetch(Character, other["id"]).resources_spent_assignment == 2


def test_a_rejoin_in_the_same_assignment_keeps_the_spend_count(client):
    camp, (a,), cid = _sealed(client, members=1)
    _spend_twice(client, a, cid)
    owner = support.fetch(Character, a["id"]).user_id
    assert client.post(f"/campaign/release/{a['id']}", headers=support.as_owner(a["id"])).status_code == 200
    support.update(User, owner, pending_rejoin_campaign_id=camp["id"])
    r = client.post("/campaign/rejoin", json={"character_id": a["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(owner))
    assert r.status_code == 200, r.text
    assert r.json()["character"]["resources_spent_assignment"] == 2


def test_end_assignment_ends_the_kept_spend_count(client):
    """End Assignment resets the count (decisions_fix4 2): a member who left in the old
    assignment comes back at 0."""
    camp, (a, b), cid = _sealed(client, members=2)
    _spend_twice(client, a, cid)
    assert client.post(f"/campaign/release/{a['id']}", headers=support.as_owner(a["id"])).status_code == 200
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_end_assignment", circle_id=cid)
        gm.sync()
    assert "departed_spends" not in support.fetch(Circle, cid).backstory_answers
    assert support.join(client, a["id"], camp["campaign_code"]).status_code == 200
    assert support.approve(client, a["id"]).status_code == 200
    assert support.fetch(Character, a["id"]).resources_spent_assignment == 0


def test_a_player_cannot_write_the_kept_spend_count(client):
    camp, (a,), cid = _sealed(client, members=1)
    with support.ws_connect(client, a["id"]) as ws:
        ws.send("circle_backstory_update", circle_id=cid, question_key="departed_spends", answer="x")
        assert support.types(ws.sync()) == ["action_rejected"]


# --- #82 only the Lightkeeper revives ---------------------------------------------------

def test_a_player_cannot_revive_their_investigator(client):
    """Fixed (#82; decision 4 of fix round 8): a player's own Revive stood them up. Only the
    Lightkeeper revives; the player's is refused, and the log names her."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("revive_character")
        assert ws.sync() == [{"type": "action_rejected", "payload": {
            "action": "revive_character", "status": 403, "detail": "Only the Lightkeeper revives an investigator."}}]
        assert gm.drain() == []
        assert support.fetch(Character, ch["id"]).incapacitated is True
        gm.send("revive_character", character_id=ch["id"])
        lines = [m for m in gm.sync() if m["type"] == "activity_log"]
        assert [m["payload"]["message"] for m in lines] == [f"The Lightkeeper revived {ch['name']}."]
    assert support.fetch(Character, ch["id"]).incapacitated is False


def test_an_unaffiliated_investigator_cannot_revive_itself_either(client):
    ch = support.forge(client, incapacitated=True)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("revive_character")
        assert support.types(ws.sync()) == ["action_rejected"]
    assert support.fetch(Character, ch["id"]).incapacitated is True


# --- 88.1 the held mark on the roster card ------------------------------------------------

def test_the_roster_card_says_a_mark_is_held(client):
    """Fixed (88.1): the roster card was blank while a dealt mark was held for Death Defy.
    The Lightkeeper's roster item carries held_marks, as the sheet does; a member reading
    the roster gets none."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, role_ability="Death Defy")
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("take_mark", character_id=ch["id"], mark_type="bleed", is_from_enemy=True)
        gm.sync()
        ws.sync()
    assert _roster_item(client, camp, ch["id"])["held_marks"] == {"ability": "Death Defy", "mark_types": ["bleed"]}
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_owner(ch["id"])).json()
    assert roster["active_investigators"][0]["held_marks"] is None


# --- 88.7 the Let in mark is the server's ----------------------------------------------------

def _summary(client, ch_id):
    owner = support.fetch(Character, ch_id).user_id
    rows = client.get(f"/api/users/{owner}/characters", headers=support.as_user(owner)).json()
    return next(r for r in rows if r["id"] == ch_id)


def test_the_let_in_mark_is_kept_until_the_desk_opens(client):
    """Fixed (88.7): the Let in mark lived in the browser that saw the approval. The server
    keeps it (characters.let_in): every browser's registry reads it, until the
    investigator's desk opens in the campaign."""
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    assert _summary(client, ch["id"])["let_in"] is False
    assert support.approve(client, ch["id"]).status_code == 200
    assert _summary(client, ch["id"])["let_in"] is True
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["let_in"] is False
    assert _summary(client, ch["id"])["let_in"] is False
    assert support.fetch(Character, ch["id"]).let_in is False


def test_no_let_in_mark_for_a_desk_open_at_the_approval(client):
    """A player waiting on the desk plays at once when let in: nothing to press Play for."""
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    with support.ws_connect(client, ch["id"]):
        assert support.approve(client, ch["id"]).status_code == 200
    assert _summary(client, ch["id"])["let_in"] is False


def test_a_release_takes_the_let_in_mark(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    assert support.approve(client, ch["id"]).status_code == 200
    assert client.post(f"/campaign/release/{ch['id']}", headers=support.as_gm(camp)).status_code == 200
    assert _summary(client, ch["id"])["let_in"] is False
    assert support.fetch(Character, ch["id"]).let_in is False
