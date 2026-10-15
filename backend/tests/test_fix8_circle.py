"""Fix round 8, the charter group: the charter before the seal (#74), the Edit sheet log
line (#75), a report from the dead (#76), the advance's refill line (88.10), +1
Illumination at 12 (88.12), spending closed by End Assignment (88.u11, decision 9) and
the amended report (88.u12, 88.u13)."""
from datetime import datetime

import support
from models import Character, Circle


def _rejected(action, status, detail):
    return {"type": "action_rejected", "payload": {"action": action, "status": status, "detail": detail}}


def _campaign(client, members=1, **char_fields):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, **char_fields) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    return camp, chars, cid


def _lines(msgs):
    return [m["payload"]["message"] for m in support.of_type(msgs, "activity_log")]


# --- #74: the charter is the players' until the seal ------------------------------------

CHARTER_REFUSED = "Decided in the formation papers until the seal."


def test_the_lightkeepers_charter_is_refused_until_the_seal(client):
    """Fixed (issue #74, decision 2): before the seal the Lightkeeper's desk could rename
    the circle, write a chapter house that replaced the players' at the seal, and pick
    the ability. A message naming any of them is refused whole; the track and the
    resources still go. After the seal the charter is hers to correct."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, name="Unnamed Circle", illumination=1)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        for fields in ({"name": "Lanterns"}, {"chapter_house_location": "Tower"},
                       {"circle_ability": "Hunters"}, {"circle_ability": ""}, {"name": "Lanterns", "stitch": 4}):
            gm.send("update_circle", circle_id=cid, **fields)
            assert gm.sync() == [_rejected("update_circle", 409, CHARTER_REFUSED)]
        assert wm.drain() == []
        gm.send("update_circle", circle_id=cid, illumination=2)
        assert support.types(gm.sync()) == ["circle_update", "activity_log"]
        c = support.fetch(Circle, cid)
        assert (c.name, c.chapter_house_location, c.circle_ability, c.stitch, c.illumination) == (
            "Unnamed Circle", None, None, 2, 2)
        support.update(Circle, cid, is_finalized=True)
        gm.send("update_circle", circle_id=cid, name="Lanterns", chapter_house_location="Tower", circle_ability="Hunters")
        [update] = support.of_type(gm.sync(), "circle_update")
        p = update["payload"]
        assert (p["name"], p["chapter_house_location"], p["circle_ability"]) == ("Lanterns", "Tower", "Hunters")


def test_the_players_chapter_house_wins_at_the_seal(client):
    """Fixed (issue #74): a chapter house the Lightkeeper wrote before the seal replaced
    the one the players saved in the papers. Theirs, trimmed, wins."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, chapter_house_location="The Lightkeeper's tower")
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_backstory_update", circle_id=cid, question_key="chapter_house", answer="  The old mill  ")
        wa.sync()
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid},
                       headers=support.as_gm(camp)).json()
    assert body["chapter_house_location"] == "The old mill"


# --- #75: the Edit sheet line shows what changed ------------------------------------------

STYLE = "Soot-grey coat, many pockets (key), a brass button and a battered hat"


def test_a_change_late_in_a_long_field_is_shown(client):
    """Fixed (playtest 4, edit-sheet-log-truncates-identically): both sides were cut at the
    same 40 characters, so words added at the end read "style Soot-grey coat, many
    pockets (key), a b... to Soot-grey coat, many pockets (key), a b...". The line shows
    the words that differ, with a word either side, and "..." where it leaves words out.
    Short values are still shown whole."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, style=STYLE)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("edit_sheet", changes={"style": STYLE + ", and a lantern"})
        assert _lines(wa.sync()) == [f"{a['name']}: style ...battered hat to ...battered hat, and a lantern."]
        wa.send("edit_sheet", changes={"style": STYLE.replace("many pockets", "few pockets") + ", and a lantern"})
        assert _lines(wa.sync()) == [f"{a['name']}: style ...coat, many pockets... to ...coat, few pockets...."]
        wa.send("edit_sheet", changes={"style": "Smart", "pronouns": "she/her"})
        assert _lines(wa.sync()) == [
            f"{a['name']}: pronouns Unlisted to she/her, style Soot-grey coat, few pockets (key), a bra... to Smart."]


def test_a_long_change_is_still_clipped():
    """Each side of the changed part keeps to the 40 characters a value is clipped to."""
    from vtt.sheet_edits import _changed_part
    old = "a " * 30 + "end"
    new = "a " * 30 + "middle " + "word " * 20 + "end"
    shown_old, shown_new = _changed_part(old, new)
    assert shown_old == "...a end"
    assert shown_new.startswith("...a middle word") and shown_new.endswith("...") and len(shown_new) <= 46
    assert _changed_part("", new)[0] == "nothing"


# --- #76: the dead file no report --------------------------------------------------------

def test_a_dead_investigator_files_no_report(client):
    """Fixed (playtest 4, dead-can-file-report): a dead investigator's report was stored,
    and a crafted amendment too. The handler reads the reporter again under the circle's
    lock and refuses the dead with the sheet-is-a-record words, a death that commits after
    the access check included. A report filed in life keeps its card."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}})
        assert support.types(wa.sync()) == ["assignment_report_submitted", "activity_log"]
        support.update(Character, a["id"], is_dead=True)
        refused = _rejected("submit_assignment_report", 409, f"{a['name']} is dead: the sheet is a record.")
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"1": True}}, replace=True)
        assert wa.sync() == [refused]
    reports = support.fetch(Circle, cid).backstory_answers["reports"]
    assert reports[str(a["id"])]["responses"] == {"keys_detail": {"0": True}}


# --- 88.u12 and 88.u13: an amended report ------------------------------------------------

def test_an_amendment_is_marked_and_one_that_changes_nothing_is_refused(client):
    """Fixed (playtest 4, report-card-no-amended-mark and amend-without-change-logged): the
    card looked the same after an amendment, and an amendment with only trailing spaces
    on its line was stored and logged. An amended report keeps when it was filed and
    adds amended_at (UTC); one with the same keys and the same line, trimmed, is refused
    "Nothing changed." and nothing is logged."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}}, note="Fog.")
        [filed] = support.of_type(wa.sync(), "assignment_report_submitted")
        assert "amended_at" not in filed["payload"]
        gm.drain()
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}},
                note="Fog.\n\n  ", replace=True)
        assert wa.sync() == [_rejected("submit_assignment_report", 409, "Nothing changed.")]
        assert gm.drain() == []
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}},
                note="Fog, and a bell.", replace=True)
        sent = wa.sync()
        [amended] = support.of_type(sent, "assignment_report_submitted")
        assert _lines(sent) == [f"{a['name']} amended their assignment report."]
        p = amended["payload"]
        assert p["submitted_at"] == filed["payload"]["submitted_at"]
        assert datetime.fromisoformat(p["amended_at"]) >= datetime.fromisoformat(p["submitted_at"])
        assert datetime.fromisoformat(p["amended_at"]).tzinfo is not None
        assert support.of_type(gm.drain(), "assignment_report_submitted") == [amended]
        # Keys changed, the line left as it was: an amendment
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"1": True}},
                note="Fog, and a bell.", replace=True)
        assert support.types(wa.sync()) == ["assignment_report_submitted", "activity_log"]
    stored = support.fetch(Circle, cid).backstory_answers["reports"][str(a["id"])]
    assert (stored["responses"], stored["note"], stored["submitted_at"]) == (
        {"keys_detail": {"1": True}}, "Fog, and a bell.", filed["payload"]["submitted_at"])
    assert "amended_at" in stored


# --- 88.10: the advance names the refill -------------------------------------------------

def test_the_advance_line_names_the_refill(client):
    """Fixed (playtest 4, advance-log-no-refill): the advance refilled Stitch, Refresh and
    Train with no word; the Lightkeeper looked for the Refill button that was taken out.
    Its line says what they are back to: 1 plus the living members."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Circle, cid, illumination=12, name="The Moths", stitch=0, refresh=1, train=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_advance_circle", circle_id=cid, circle_ability="Seekers")
        assert _lines(gm.sync()) == ["The Moths has advanced and gained Seekers! Its Stitch, Refresh and Train are back to 3 each."]
    c = support.fetch(Circle, cid)
    assert (c.stitch, c.refresh, c.train) == (3, 3, 3)


# --- 88.12: +1 Illumination stops at 12 ---------------------------------------------------

def test_a_raise_stops_at_the_full_track_and_a_carry_over_is_kept(client):
    """Fixed (playtest 4, illumination-past-12; decision 8): +1 at 12 stored 13 behind "12 /
    12". A raise ends at 12 at most, with no line when nothing changed; Illumination
    carried over past 12 by Add N or Meticulous Notes is never cut, and a lowering from
    it goes through."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, illumination=11, name="The Moths")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_circle", circle_id=cid, illumination=13)
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["illumination"] == 12
        assert _lines(msgs) == ["The Moths gains 1 Illumination (11 to 12).",
                                "The Moths's Illumination track is full: the circle can advance."]
        gm.send("update_circle", circle_id=cid, illumination=13)
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["illumination"] == 12
        assert _lines(msgs) == []
        support.update(Circle, cid, illumination=14)  # carried over by Add N
        gm.send("update_circle", circle_id=cid, illumination=15)
        assert support.of_type(gm.sync(), "circle_update")[0]["payload"]["illumination"] == 14
        gm.send("update_circle", circle_id=cid, illumination=13)
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["illumination"] == 13
        assert _lines(msgs) == ["The Moths loses 1 Illumination (14 to 13)."]
    assert support.fetch(Circle, cid).illumination == 13


# --- 88.u11: spending closes with the assignment -----------------------------------------

def test_end_assignment_closes_spending_until_the_next_dispatch(client):
    """Fixed (playtest 4, spending-open-after-end; decision 9): spending left open at End
    Assignment stayed open, and the players spent in the break. End Assignment closes it
    and says so; a spend is refused with why, where it was silent; the next assignment's
    first dispatch opens it again, with a line. Spending the Lightkeeper had locked stays
    locked, and the dispatch does not open it."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, resources_editable=True, stitch=2, refresh=2, train=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("gm_end_assignment", circle_id=cid)
        msgs = gm.sync()
        [update] = support.of_type(msgs, "circle_update")
        assert update["payload"]["resources_editable"] is False
        assert _lines(msgs)[-1] == "Circle spending is closed until the next assignment's dispatch."
        wa.drain()
        wa.send("spend_resource", resource_type="stitch")
        assert wa.sync() == [_rejected("spend_resource", 409, "Spending is closed until the next assignment starts.")]
        gm.send("gm_update_circle", circle_id=cid, tension_clock=1)  # not a dispatch
        assert support.of_type(gm.sync(), "circle_update")[0]["payload"]["resources_editable"] is False
        gm.send("gm_update_circle", circle_id=cid, location="Docks", atmosphere="", dispatch_text="")
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["resources_editable"] is True
        assert _lines(msgs) == ["The Lightkeeper sent a dispatch: Docks.", "Spending is open again: up to two each."]
        assert "spending_paused" not in support.fetch(Circle, cid).backstory_answers
        wa.drain()
        wa.send("spend_resource", resource_type="stitch")
        assert support.types(wa.sync()) == ["character_update", "circle_update", "activity_log"]
        # A second dispatch opens nothing more
        gm.drain()
        gm.send("gm_update_circle", circle_id=cid, location="The mill")
        assert _lines(gm.sync()) == ["The Lightkeeper sent a new dispatch: The mill."]
        # Locked by the Lightkeeper: the End Assignment and the dispatch leave it locked
        gm.send("gm_toggle_resource_edit", circle_id=cid)
        gm.send("gm_end_assignment", circle_id=cid)
        assert "Circle spending is closed until the next assignment's dispatch." not in _lines(gm.sync())
        wa.drain()
        wa.send("spend_resource", resource_type="stitch")
        assert wa.sync() == [_rejected("spend_resource", 409, "Spending is locked until the Lightkeeper opens it.")]
        gm.send("gm_update_circle", circle_id=cid, location="Docks")
        assert support.of_type(gm.sync(), "circle_update")[0]["payload"]["resources_editable"] is False


def test_the_lightkeepers_own_choice_stands_after_end_assignment(client):
    """Spending End Assignment closed, opened or locked again by the Lightkeeper before the
    next dispatch: her choice stands, and the dispatch changes nothing."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, resources_editable=True)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_end_assignment", circle_id=cid)
        gm.send("gm_toggle_resource_edit", circle_id=cid)  # opened
        gm.send("gm_toggle_resource_edit", circle_id=cid)  # and locked again
        gm.sync()
        assert "spending_paused" not in support.fetch(Circle, cid).backstory_answers
        gm.send("gm_update_circle", circle_id=cid, location="Docks")
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["resources_editable"] is False
        assert "Spending is open again: up to two each." not in _lines(msgs)


def test_no_one_writes_the_spending_flag_through_the_backstory(client):
    """Fixed (review of fix round 8): the flag sits in the circle's backstory answers, so a
    member could set it through circle_backstory_update and open the Lightkeeper's locked
    spending at the next dispatch, or blank it so spending stayed closed. It is refused,
    as the other keys the server keeps, and the flag stays as it was."""
    camp, (a,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_backstory_update", circle_id=cid, question_key="spending_paused", answer="yes")
        assert wa.sync() == [_rejected("circle_backstory_update", 403, "Not allowed.")]
        assert "spending_paused" not in (support.fetch(Circle, cid).backstory_answers or {})
        gm.send("gm_update_circle", circle_id=cid, location="Docks")
        msgs = gm.sync()
        assert support.of_type(msgs, "circle_update")[0]["payload"]["resources_editable"] is False
        assert "Spending is open again: up to two each." not in _lines(msgs)
        # Closed by End Assignment: a member cannot blank the flag to keep it closed
        support.update(Circle, cid, resources_editable=True)
        gm.send("gm_end_assignment", circle_id=cid)
        gm.sync()
        wa.drain()
        wa.send("circle_backstory_update", circle_id=cid, question_key="spending_paused", answer="")
        assert wa.sync() == [_rejected("circle_backstory_update", 403, "Not allowed.")]
        assert support.fetch(Circle, cid).backstory_answers["spending_paused"] is True
