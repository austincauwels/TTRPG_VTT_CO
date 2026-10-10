"""WebSocket circle and GM actions."""
from datetime import datetime

import pytest

import support
from models import Character, Circle, CircleVote, Relationship

EM = support.EM


def _campaign(client, members=1, **char_fields):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, **char_fields) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    return camp, chars, cid


# --- gm_update_circle / gm_update_tension / gm_transition_scene ---------------

REJECTED = {"status": 403, "detail": "Not allowed."}


def _rejected(action, **payload):
    return {"type": "action_rejected", "payload": {"action": action, **(payload or REJECTED)}}


def test_gm_update_circle_on_the_shared_circle_one_is_rejected(client):
    """Bug D2: SceneManager used to send circle_id 1, and the lookup was not scoped to
    the campaign, so every campaign edited circle 1 and was shown its data. Circle 1
    belongs to no campaign, so no GM may edit it now; the frontend sends the
    campaign's own circle id instead."""
    camp, (member,), cid = _campaign(client)
    before = support.fetch(Circle, 1)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_circle", circle_id=1, tension_clock=2, location="Docks")
        assert gm.sync() == [_rejected("gm_update_circle")]
        assert wm.drain() == []
        gm.send("gm_update_circle", circle_id=cid, tension_clock=2,
                tension_label="Watch", location="Docks", atmosphere="Fog")
        sent = gm.sync()
        [msg] = support.of_type(sent, "circle_update")
        # What changed at the table is said in the log, to every desk (silent-table-changes)
        assert [m["payload"]["message"] for m in support.of_type(sent, "activity_log")] == [
            "The Lightkeeper sent a dispatch.",
            "The Lightkeeper raised the tension to 2 of 4.",
            "The Lightkeeper named the tension: Watch.",
        ]
        assert msg["payload"]["id"] == cid
        assert (msg["payload"]["tension_clock"], msg["payload"]["tension_label"]) == (2, "Watch")
        assert (msg["payload"]["location"], msg["payload"]["atmosphere"]) == ("Docks", "Fog")
        assert wm.drain() == sent
    assert support.fetch(Circle, 1).location == before.location
    assert support.fetch(Circle, cid).location == "Docks"


def test_gm_update_circle_defaults_to_circle_one_and_ignores_role(client):
    """The GM is known from the token, so payload.role no longer matters; without a
    circle_id the message still means circle 1, which is refused."""
    camp, _, cid = _campaign(client, members=0)
    other_cid = _campaign(client, members=0)[2]
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_update_circle", role="GM", atmosphere="Rain")
        gm.send("gm_update_circle", circle_id=other_cid, atmosphere="Rain")
        gm.send("gm_update_circle", circle_id=987654321, atmosphere="Rain")
        assert gm.sync() == [_rejected("gm_update_circle"), _rejected("gm_update_circle"),
                             _rejected("gm_update_circle", status=404, detail="Circle not found")]
        gm.send("gm_update_circle", role="player", circle_id=cid, stitch=5, guard_patrol=2, name="ignored")
        p = gm.sync()[0]["payload"]
        assert (p["id"], p["stitch"], p["guard_patrol"]) == (cid, 5, 2)
        assert p["name"] == "Unnamed Circle"
    assert support.fetch(Circle, other_cid).atmosphere in ("", None)



DISPATCH_TOO_LONG = {"status": 422, "detail": "A dispatch is text of up to 2000 characters."}


def test_gm_update_circle_sends_a_dispatch_in_her_own_words(client):
    """The Lightkeeper may write the dispatch in their own words instead of filling the template's
    blanks. Each send writes all three fields, so the players' card shows exactly what
    was sent: the Lightkeeper's own words (line breaks kept) and the location given, or the
    template's location and atmosphere with no words of their own. Up to 2000 characters."""
    camp, (member,), cid = _campaign(client)
    own = "Meet at the lighthouse at dusk.\n\nBring lamps, and tell no one.\n"
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_circle", circle_id=cid, dispatch_text=own, location="Saltmarsh Light", atmosphere="")
        [msg] = support.of_type(gm.sync(), "circle_update")
        p = msg["payload"]
        assert (p["dispatch_text"], p["location"], p["atmosphere"]) == (own, "Saltmarsh Light", "")
        assert support.of_type(wm.drain(), "circle_update") == [msg]
        # The template again: the own words go
        gm.send("gm_update_circle", circle_id=cid, dispatch_text="", location="Docks", atmosphere="Fog")
        p = gm.sync()[0]["payload"]
        assert (p["dispatch_text"], p["location"], p["atmosphere"]) == ("", "Docks", "Fog")
        # The longest that may be written
        gm.send("gm_update_circle", circle_id=cid, dispatch_text="x" * 2000, location="", atmosphere="")
        assert gm.sync()[0]["payload"]["dispatch_text"] == "x" * 2000
    assert support.fetch(Circle, cid).dispatch_text == "x" * 2000


@pytest.mark.parametrize("bad", ["x" * 2001, 7, None, ["Docks"], {"text": "Docks"}, True])
def test_gm_update_circle_refuses_a_dispatch_that_is_not_text_within_the_limit(client, bad):
    """A dispatch in the Lightkeeper's own words that is longer than 2000 characters, or is not text, is
    refused with 422 and nothing in the message is saved, the location and the tension
    with it. No desk hears of it."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, location="Docks", atmosphere="Fog", dispatch_text="", tension_clock=1)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_circle", circle_id=cid, dispatch_text=bad, location="Elsewhere", atmosphere="",
                tension_clock=3)
        assert gm.sync() == [_rejected("gm_update_circle", **DISPATCH_TOO_LONG)]
        assert wm.drain() == []
    c = support.fetch(Circle, cid)
    assert (c.location, c.atmosphere, c.dispatch_text, c.tension_clock) == ("Docks", "Fog", "", 1)


def test_a_new_circle_has_no_dispatch_of_her_own(client):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm:
        circle = wm.initial[1]["payload"]
    assert (circle["id"], circle["dispatch_text"]) == (cid, "")


def test_gm_messages_from_a_player_are_rejected(client):
    """Before tokens a player socket that sent role GM got GM powers."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm, support.ws_connect(client, camp["campaign_code"]) as gm:
        wm.send("gm_toggle_reports", role="GM")
        wm.send("gm_update_circle", role="GM", circle_id=cid, location="Docks")
        wm.send("gm_reset_character", role="GM", character_id=member["id"])
        assert wm.sync() == [_rejected("gm_toggle_reports"), _rejected("gm_update_circle"),
                             _rejected("gm_reset_character")]
        assert gm.drain() == []
        assert support.server_sockets(member["id"])
    c = support.fetch(Circle, cid)
    assert (c.reports_open, c.location) == (False, "")


def test_gm_update_tension(client):
    """The Lightkeeper corrects a character's marks (the GM sheet's Marks row). The player's
    sheet is told and the table's log says so (only the GM's own socket used to hear).
    The GM's socket gets the sheet back as member_update."""
    camp, (member,), _ = _campaign(client)
    outsider = support.active_member(client, support.new_campaign(client))
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_tension", role="GM", mark_type="body", value=2, character_id=member["id"])
        msgs = gm.sync()
        assert support.types(msgs) == ["member_update", "activity_log"]
        assert msgs[1]["payload"]["message"] == f"The Lightkeeper set {member['name']}'s Body marks to 2."
        seen = wm.drain()
        assert support.types(seen) == ["character_update", "activity_log"]
        assert (seen[0]["payload"]["id"], seen[0]["payload"]["body_marks"]) == (member["id"], 2)
        assert msgs[0]["payload"] == seen[0]["payload"]
        gm.send("gm_update_tension", role="GM", mark_type="body", value=3)  # no character on a GM socket
        assert gm.sync() == []
        gm.send("gm_update_tension", mark_type="body", value=3, character_id=outsider["id"])
        assert gm.sync() == [_rejected("gm_update_tension")]
        # Only the three tracks, 0 to 3
        for m_type, value in (("foo", 1), ("body", 4), ("body", -1), ("body", "2"), ("body", True), ("nerve_max", 1)):
            gm.send("gm_update_tension", mark_type=m_type, value=value, character_id=member["id"])
        assert gm.sync() == [_rejected("gm_update_tension", status=422,
                                       detail="Marks are 0 to 3, in Body, Brain or Bleed.")] * 6
        gm.send("gm_update_tension", mark_type="body", value=1, character_id=member["id"])  # role not needed
        assert support.types(gm.sync()) == ["member_update", "activity_log"]
    assert support.fetch(Character, member["id"]).body_marks == 1
    assert support.fetch(Character, outsider["id"]).body_marks == 0


SCARS = ["A burn across the palm (-1 Strike, +1 Sense)", "Hears the bells at night", "A limp"]


def _after_member_update(msgs):
    """A correction the Lightkeeper makes reaches their own desk first as member_update, the
    investigator's whole sheet (vtt/ws/manager.py), then as what the correction sends."""
    assert msgs and msgs[0]["type"] == "member_update", support.types(msgs)
    return msgs[1:]


def test_gm_update_scars_rewords_and_removes(client):
    """The Lightkeeper's trauma record edit: a scar reworded, then one removed. The
    player's sheet is told, the table's log says so, and the action point the scar
    shifted stays where it is."""
    camp, (member,), _ = _campaign(client, scars_list=SCARS, scars_count=3, strike=0, sense=2)
    name = member["name"]
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        reworded = ["A burn across the left palm (-1 Strike, +1 Sense)", "  Hears the bells at night ", "A limp"]
        gm.send("gm_update_scars", role="GM", character_id=member["id"], scars=reworded, previous=SCARS)
        msgs = _after_member_update(gm.sync())
        assert support.types(msgs) == ["activity_log"]
        assert msgs[0]["payload"]["message"] == f"The Lightkeeper corrected {name}'s scars (3 of 4)."
        seen = wm.drain()
        assert support.types(seen) == ["character_update", "activity_log"]
        stored = [reworded[0], "Hears the bells at night", "A limp"]  # trimmed
        assert (seen[0]["payload"]["scars_list"], seen[0]["payload"]["scars_count"]) == (stored, 3)
        # The same list again changes nothing and says nothing
        gm.send("gm_update_scars", character_id=member["id"], scars=stored, previous=stored)
        assert gm.sync() == []
        assert wm.drain() == []
        gm.send("gm_update_scars", character_id=member["id"], scars=[stored[0], stored[2]], previous=stored)
        msgs = _after_member_update(gm.sync())
        assert msgs[0]["payload"]["message"] == f"The Lightkeeper removed a scar from {name}'s record (2 of 4)."
        assert wm.drain()[0]["payload"]["scars_list"] == [stored[0], stored[2]]
        gm.send("gm_update_scars", character_id=member["id"], scars=[], previous=[stored[0], stored[2]])
        msgs = _after_member_update(gm.sync())
        assert msgs[0]["payload"]["message"] == f"The Lightkeeper removed 2 scars from {name}'s record (0 of 4)."
    row = support.fetch(Character, member["id"])
    assert (row.scars_list, row.scars_count) == ([], 0)
    assert (row.strike, row.sense, row.is_dead) == (0, 2, False)


def test_gm_update_scars_refusals(client):
    """Only the campaign's Lightkeeper, only a member of their campaign, at most four
    scars, each a description of 1 to 500 characters, made from the record as it is, and
    no new scar (that comes through the scar form and its shift, p. 14)."""
    camp, (member,), _ = _campaign(client, scars_list=SCARS[:2], scars_count=2)
    outsider = support.active_member(client, support.new_campaign(client), scars_list=SCARS[:2], scars_count=2)
    two = SCARS[:2]
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        # The player may not correct their own scars
        wm.send("gm_update_scars", role="GM", character_id=member["id"], scars=[two[0]], previous=two)
        assert wm.recv() == _rejected("gm_update_scars")
        # Another campaign's member
        gm.send("gm_update_scars", character_id=outsider["id"], scars=[two[0]], previous=two)
        assert gm.sync() == [_rejected("gm_update_scars")]

        def refused(detail, **payload):
            gm.send("gm_update_scars", character_id=member["id"], **payload)
            assert gm.sync() == [_rejected("gm_update_scars", status=422, detail=detail)]
        not_a_list = "Scars are a list of descriptions."
        refused(not_a_list, scars="A limp", previous=two)
        refused(not_a_list, scars=[two[0], 7], previous=two)
        refused(not_a_list, scars=[two[0]])                    # no previous
        refused(not_a_list, scars=[two[0]], previous="nope")
        refused("An investigator has at most 4 scars.", scars=["a", "b", "c", "d", "e"], previous=two)
        blank = "A scar needs a description. Remove it instead of leaving it blank."
        refused(blank, scars=[two[0], ""], previous=two)
        refused(blank, scars=[two[0], "   "], previous=two)
        refused("A scar is a description of up to 500 characters.", scars=[two[0], "x" * 501], previous=two)

        # A new scar is not added here
        gm.send("gm_update_scars", character_id=member["id"], scars=two + ["A new one"], previous=two)
        assert gm.sync() == [_rejected("gm_update_scars", status=409,
                                       detail="A new scar comes from a full mark track, through the scar form.")]
        # Made from a record that has changed since (a scar the player took meanwhile)
        gm.send("gm_update_scars", character_id=member["id"], scars=[two[0]], previous=[two[0]])
        assert gm.sync() == [_rejected("gm_update_scars", status=409, detail=(
            f"{member['name']}'s scars changed while you were editing. The record shows them as they are now."))]
        assert wm.drain() == []
        # 500 characters (after trimming) is allowed
        gm.send("gm_update_scars", character_id=member["id"], scars=[two[0], " " + "x" * 500 + " "], previous=two)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
    assert support.fetch(Character, member["id"]).scars_list == [two[0], "x" * 500]
    assert support.fetch(Character, outsider["id"]).scars_list == two


def test_gm_update_scars_checks_only_the_scars_the_lightkeeper_rewords(client):
    """A scar stored before the limit, longer than 500 characters (or blank), is left as it
    is: it no longer blocks rewording or removing another scar. Words the Lightkeeper
    writes are held to the limit, and may not be blank."""
    long_one = "The bite of the thing in the cellar, " * 20 + "(-1 Strike, +1 Sense)"
    stored = ["A limp", long_one, "  "]
    camp, (member,), _ = _campaign(client, scars_list=stored, scars_count=3)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_scars", character_id=member["id"], scars=["A bad limp", long_one, "  "], previous=stored)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
        stored = ["A bad limp", long_one, ""]   # trimmed
        assert wm.drain()[0]["payload"]["scars_list"] == stored
        gm.send("gm_update_scars", character_id=member["id"], scars=stored[1:], previous=stored)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
        stored = stored[1:]

        def refused(detail, scars):
            gm.send("gm_update_scars", character_id=member["id"], scars=scars, previous=stored)
            assert gm.sync() == [_rejected("gm_update_scars", status=422, detail=detail)]
        refused("A scar is a description of up to 500 characters.", [long_one + "!", ""])
        refused("A scar needs a description. Remove it instead of leaving it blank.", [long_one, " "])
        gm.send("gm_update_scars", character_id=member["id"], scars=["The bite in the cellar"], previous=stored)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
    assert support.fetch(Character, member["id"]).scars_list == ["The bite in the cellar"]


def test_gm_update_scars_below_four_lifts_the_death(client):
    """The fourth scar is fatal (p. 74). One taken by mistake was a death by mistake: with
    fewer than four the investigator is alive, and incapacitated until revived (p. 14),
    even after a stray revive cleared it. Rewording a dead investigator's scars does not."""
    four = SCARS + ["A fourth, taken by mistake"]
    camp, (member,), cid = _campaign(client, scars_list=four, scars_count=4, is_dead=True, incapacitated=False)
    support.update(Circle, cid, circle_ability="Nobody Left Behind")
    name = member["name"]
    # The Lightkeeper's roster lists the dead investigator, so the sheet can be opened
    roster = lambda: {c["id"]: c["is_dead"] for c in client.get(
        f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()["active_investigators"]}
    assert roster() == {member["id"]: True}
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        reworded = four[:3] + ["A fourth"]
        gm.send("gm_update_scars", character_id=member["id"], scars=reworded, previous=four)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
        assert wm.drain()[0]["payload"]["is_dead"] is True
        gm.send("gm_update_scars", character_id=member["id"], scars=SCARS, previous=reworded)
        msgs = _after_member_update(gm.sync())
        assert support.types(msgs) == ["activity_log", "circle_update"]
        assert msgs[0]["payload"]["message"] == (
            f"The Lightkeeper removed a scar from {name}'s record (3 of 4). {name} is alive, and incapacitated until revived.")
        # Nobody Left Behind: the circle's desks hear that a member is down, not dead
        assert msgs[1]["payload"]["incapacitated_members"] == [{"id": member["id"], "name": name}]
        update = wm.drain()[0]["payload"]
        assert (update["is_dead"], update["incapacitated"], update["scars_count"]) == (False, True, 3)
    row = support.fetch(Character, member["id"])
    assert (row.is_dead, row.incapacitated, row.scars_count, row.status) == (False, True, 3, "active")
    assert roster() == {member["id"]: False}


def test_a_death_and_its_undo_reach_the_other_players(client):
    """A player's desk reads the roster once and leaves the dead out of its circle cards
    and ally pickers, so the campaign's players are told (member_status) when a member
    dies of the fourth scar and when the Lightkeeper lifts that death. Only is_dead, as
    the roster lists it; the GM's desk has the whole sheet (member_update) and is not sent
    it. No other campaign hears it, and nor does a scar reworded while dead."""
    camp = support.new_campaign(client)
    dying = support.active_member(client, camp, scars_list=SCARS, scars_count=3)
    ally = support.active_member(client, camp)
    elsewhere = support.active_member(client, support.new_campaign(client))
    status = lambda is_dead: {"type": "member_status", "payload": {
        "character_id": dying["id"], "campaign_id": camp["id"], "is_dead": is_dead}}
    four = SCARS + ["The last one"]
    with support.ws_connect(client, dying["id"]) as wd, support.ws_connect(client, ally["id"]) as wa, \
            support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, elsewhere["id"]) as we:
        wd.send("apply_scar", scar_text="The last one", skip_shifts=True)
        seen = wd.sync()
        assert support.types(seen) == ["character_update", "member_status"]
        assert seen[0]["payload"]["is_dead"] is True and seen[1] == status(True)
        assert wa.drain() == [status(True)]
        assert support.types(gm.drain()) == ["member_update"]
        # Rewording a dead investigator's scars changes nothing on the players' rosters
        gm.send("gm_update_scars", character_id=dying["id"], scars=SCARS + ["The last"], previous=four)
        assert support.types(gm.sync()) == ["member_update", "activity_log"]
        assert support.types(wa.drain()) == ["activity_log"]
        assert support.types(wd.drain()) == ["character_update", "activity_log"]
        gm.send("gm_update_scars", character_id=dying["id"], scars=SCARS, previous=SCARS + ["The last"])
        assert support.types(gm.sync()) == ["member_update", "activity_log"]
        seen = wa.drain()
        assert support.types(seen) == ["member_status", "activity_log"]
        assert seen[0] == status(False)
        assert support.types(wd.drain()) == ["character_update", "member_status", "activity_log"]
        assert we.drain() == []
    # What the players' rosters read when they load
    listed = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_owner(ally["id"])).json()
    assert {c["id"]: c["is_dead"] for c in listed["active_investigators"]} == {dying["id"]: False, ally["id"]: False}


def test_gm_update_scars_keeps_a_death_once_the_player_has_a_new_investigator(client):
    """The death opened the way for a new investigator. Once their player has one on the
    roster, waiting or approved, the fourth scar and the death stand."""
    four = SCARS + ["A fourth"]
    camp = support.new_campaign(client)
    owner = support.make_user()
    dead = support.active_member(client, camp, user_id=owner.id, scars_list=four, scars_count=4,
                                 is_dead=True, incapacitated=True)
    successor = support.pending_member(client, camp, user_id=owner.id)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_update_scars", character_id=dead["id"], scars=SCARS, previous=four)
        assert gm.sync() == [_rejected("gm_update_scars", status=409, detail=(
            f"{dead['name']}'s player already has a new investigator on the roster, "
            "so the fourth scar and the death stand."))]
        # Rewording still works while the dead investigator is on the roster
        gm.send("gm_update_scars", character_id=dead["id"], scars=SCARS + ["The fourth"], previous=four)
        assert support.types(_after_member_update(gm.sync())) == ["activity_log"]
        # Approving the new investigator retires the dead one: no longer on the roster
        assert support.approve(client, successor["id"]).status_code == 200
        gm.recv_type("investigator_approved")
        gm.recv_type("circle_update")  # the circle's pool grew with the new member
        gm.send("gm_update_scars", character_id=dead["id"], scars=SCARS, previous=SCARS + ["The fourth"])
        assert gm.sync() == [_rejected("gm_update_scars")]
    row = support.fetch(Character, dead["id"])
    assert (row.is_dead, row.scars_count, row.status) == (True, 4, "retired")


def test_gm_transition_scene(client):
    camp, (member,), _ = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_transition_scene", role="GM", scene_name="Crypt", description="cold")
        assert gm.recv() == {"type": "scene_transition", "payload": {"scene_name": "Crypt", "description": "cold"}}
        gm.send("gm_transition_scene", role="GM")
        assert gm.recv() == {"type": "scene_transition", "payload": {"scene_name": "Unknown Location", "description": ""}}
        gm.send("gm_transition_scene", scene_name="nope")
        gm.sync()
        assert wm.drain() == []


# --- toggles, reports, advance, refill, end assignment, reset ----------------

def test_gm_toggles(client):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_toggle_resource_edit", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["id"], p["resources_editable"]) == (cid, True)
        gm.send("gm_toggle_resource_edit", role="GM", circle_id=cid)
        assert gm.sync()[0]["payload"]["resources_editable"] is False
        gm.send("gm_toggle_reports", role="GM")
        assert gm.sync()[0]["payload"]["reports_open"] is True
        # payload.role is ignored now: these two toggle as well
        gm.send("gm_toggle_reports")
        gm.send("gm_toggle_resource_edit", role="player")
        assert support.types(gm.sync()) == ["circle_update", "activity_log", "circle_update"]
        assert support.types(support.of_type(wm.drain(), "circle_update")) == ["circle_update"] * 5
    c = support.fetch(Circle, cid)
    assert (c.resources_editable, c.reports_open) == (True, False)


def test_gm_toggle_cannot_reach_another_campaigns_circle(client):
    """Before tokens resolve_circle fell back to an unscoped id lookup, so one GM
    could toggle another campaign's circle."""
    camp_a, _, cid_a = _campaign(client, members=0)
    camp_b, _, cid_b = _campaign(client, members=0)
    with support.ws_connect(client, camp_a["campaign_code"]) as gm:
        for action in ("gm_toggle_reports", "gm_toggle_resource_edit", "gm_advance_circle", "refill_resources",
                       "gm_end_assignment", "update_circle"):
            gm.send(action, circle_id=cid_b)
            assert gm.sync() == [_rejected(action)]
        gm.send("gm_toggle_reports", circle_id=1)
        assert gm.sync() == [_rejected("gm_toggle_reports")]
    assert support.fetch(Circle, cid_b).reports_open is False
    assert support.fetch(Circle, cid_a).reports_open is False


def test_submit_assignment_report(client):
    """Fixed (playtest, 2026-10-09): a report went to every player's desk, any number
    could be sent while reports were closed, and a second one silently replaced the
    first, so a stray Send wiped the filed keys. A report now goes to the Lightkeeper and
    back to its author, with when it was filed; it needs reports open; and a second one
    replaces the first only when it says so (the form's Amend)."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}})
        assert wa.sync() == [_rejected("submit_assignment_report", status=409, detail="Reports are closed.")]
        support.update(Circle, cid, reports_open=True)
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}})
        sent = wa.sync()
        [msg] = support.of_type(sent, "assignment_report_submitted")
        assert [m["payload"]["message"] for m in support.of_type(sent, "activity_log")] == [f"{a['name']} filed an assignment report."]
        p = msg["payload"]
        assert (p["character_id"], p["character_name"], p["responses"]) == (a["id"], a["name"], {"keys_detail": {"0": True}})
        assert datetime.fromisoformat(p["submitted_at"]).tzinfo is not None
        assert support.of_type(gm.drain(), "assignment_report_submitted") == [msg]
        assert [m["type"] for m in wb.drain()] == ["activity_log"]  # the line, not the report
        wa.send("submit_assignment_report", responses={"q0": True})  # needs character_id
        assert wa.sync() == []
        wa.send("submit_assignment_report", character_id=a["id"], responses={})
        assert wa.sync() == [_rejected("submit_assignment_report", status=409, detail="Your report is already filed.")]
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"1": True}}, replace=True)
        sent = wa.sync()
        [amended] = support.of_type(sent, "assignment_report_submitted")
        assert [m["payload"]["message"] for m in support.of_type(sent, "activity_log")] == [f"{a['name']} amended their assignment report."]
        assert amended["payload"]["responses"] == {"keys_detail": {"1": True}}
        assert support.of_type(gm.drain(), "assignment_report_submitted") == [amended]
        assert support.types(wb.drain()) == ["activity_log"]
    assert _undated(support.fetch(Circle, cid).backstory_answers) == {
        "reports": {str(a["id"]): _report(a, {"keys_detail": {"1": True}})}}


def test_reports_reach_only_the_lightkeeper_and_their_authors(client):
    """Fixed (playtest, 2026-10-09): the circle every desk is sent carried every report, and
    so did the circle-creation-state route. The circle leaves them out, and the route
    gives the Lightkeeper every report and a member only their own."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Circle, cid, reports_open=True, backstory_answers={"chapter_house": "Mill"})
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"keys_detail": {"0": True}})
        wa.sync()
        wb.send("submit_assignment_report", character_id=b["id"], responses={"keys_detail": {}})
        wb.sync()
    with support.ws_connect(client, a["id"]) as wa:
        assert wa.initial[-1]["payload"]["backstory_answers"] == {"chapter_house": "Mill"}

    def reports(headers):
        body = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=headers).json()
        answers = body["backstory_answers"]
        assert answers["chapter_house"] == "Mill"
        return sorted(answers["reports"])
    assert reports(support.as_gm(camp["id"])) == sorted([str(a["id"]), str(b["id"])])
    assert reports(support.as_owner(a["id"])) == [str(a["id"])]
    assert reports(support.as_owner(b["id"])) == [str(b["id"])]


def test_submit_report_only_for_own_character(client):
    """Before tokens any character id was accepted, and unknown ids were reported as
    Unknown. Now a player reports only for their own character, and the GM cannot
    report for anyone."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Circle, cid, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("submit_assignment_report", character_id=987654321, responses={"x": 1})
        wa.send("submit_assignment_report", character_id=b["id"], responses={"x": 1})
        assert wa.sync() == [_rejected("submit_assignment_report", status=404, detail="Character not found"),
                             _rejected("submit_assignment_report")]
        gm.drain()
        gm.send("submit_assignment_report", character_id=a["id"], responses={"x": 1})
        assert gm.sync() == [_rejected("submit_assignment_report")]
    assert support.fetch(Circle, cid).backstory_answers in ({}, None)


def test_gm_advance_circle(client):
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, illumination=14, circle_ability="Hunters", name="The Moths")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_advance_circle", role="GM", circle_ability="Seekers")
        msgs = gm.sync()
        assert support.types(msgs) == ["member_update", "activity_log", "circle_advanced"]
        assert msgs[1]["payload"] == {"message": "The Moths has advanced!", "log_type": "field"}
        assert msgs[2]["payload"]["campaign_id"] == camp["id"]
        assert msgs[2]["payload"]["circle"]["circle_ability"] == "Hunters\nSeekers"
        assert msgs[2]["payload"]["circle"]["illumination"] == 2
        # Each member is given two advancement picks (RULES_CHECK 14)
        seen = wm.drain()
        assert support.types(seen) == ["character_update", "activity_log", "circle_advanced"]
        assert (seen[0]["payload"]["advancement_picks"], seen[0]["payload"]["advancement_taken"]) == (2, [])
        assert msgs[0]["payload"] == seen[0]["payload"]
        gm.send("gm_advance_circle", role="GM")  # no ability, no full track: still advances
        msgs = gm.sync()
        assert msgs[2]["payload"]["circle"]["illumination"] == 0
    assert support.fetch(Character, member["id"]).advancement_picks == 4


def test_refill_resources_counts_the_campaigns_members(client):
    """Fixed (RULES_CHECK 16): each of Stitch, Refresh and Train refills to 1 + the
    campaign's active members (rulebook p. 41; the p. 62 example has four players with 5
    in each). It counted the members attached to the circle, and campaign members stay
    on circle 1, so a campaign circle got 1 each."""
    camp, members, cid = _campaign(client, members=3)
    support.update(Circle, cid, stitch=0, refresh=0, train=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("refill_resources", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (4, 4, 4, 4)
        # a rejoined character counts at once (the count is read fresh, not from the session)
        late = support.forge(client, user_id=support.make_user(pending_rejoin_campaign_id=camp["id"]).id)
        client.post("/campaign/rejoin", json={"character_id": late["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_owner(late["id"]))
        gm.drain()
        gm.send("refill_resources")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (5, 5, 5, 5)


def test_meticulous_notes_add_illumination_after_an_assignment(client):
    """Rulebook p. 27: "After an assignment, increase your Illumination track 1 additional
    point because of the detailed notes your character returns with." It was only a
    reminder that made the point conditional."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Character, a["id"], role_ability="Meticulous Notes")
    support.update(Circle, cid, illumination=2, name="The Moths")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_end_assignment")
        msgs = gm.sync()
        assert msgs[0]["payload"]["illumination"] == 3
        lines = [m["payload"]["message"] for m in msgs if m["type"] == "activity_log"]
        assert lines[1:] == [f"Meticulous Notes: {a['name']}'s detailed notes add 1 Illumination.",
                             "The Moths milestone reached!"]
    assert support.fetch(Circle, cid).illumination == 3


def test_gm_end_assignment(client):
    camp, (a, b), cid = _campaign(client, members=2)
    for ch in (a, b):
        support.update(Character, ch["id"], ability_uses={"Steel Mind": 1}, resources_spent_assignment=2,
                       train_bonus=True, gear=["Lantern"])
    outsider = support.forge(client)
    support.update(Character, outsider["id"], resources_spent_assignment=2)
    support.update(Circle, cid, location="Docks", atmosphere="Fog", dispatch_text="Bring lamps.")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("gm_end_assignment", role="GM", campaign_id=987654321)
        msgs = gm.sync()
        assert support.types(msgs) == ["circle_update", "member_update", "member_update", "activity_log"]
        assert (msgs[0]["payload"]["location"], msgs[0]["payload"]["atmosphere"]) == ("", "")
        assert msgs[0]["payload"]["dispatch_text"] == ""
        assert sorted(m["payload"]["id"] for m in msgs[1:3]) == sorted([a["id"], b["id"]])
        assert msgs[3]["payload"] == {"message": f"{EM} Assignment ended. Ability uses, gear slots, the hourglass and the reports have been reset. {EM}",
                                      "log_type": "field"}
        got = wa.drain()
        assert support.types(got) == ["circle_update", "character_update", "activity_log"]
        assert got[1]["payload"]["ability_uses"] == {}
        assert got[1]["payload"]["resources_spent_assignment"] == 0
        assert got[1]["payload"]["train_bonus"] is False
        assert got[1]["payload"]["gear"] == []  # gear slots reset with the assignment (p. 52)
    assert support.fetch(Character, b["id"]).resources_spent_assignment == 0
    assert support.fetch(Character, outsider["id"]).resources_spent_assignment == 2
    assert support.fetch(Circle, cid).dispatch_text == ""


def test_gm_end_assignment_closes_and_clears_the_reports(client):
    """Fixed (playtest, 2026-10-09): End Assignment left reports open with the finished
    assignment's reports filed, so the next assignment opened on a live form and the
    Lightkeeper could not tell old reports from new. It closes them and the reports go;
    the circle's other answers stay, and its assignment number goes up, by which the
    desks drop the reports they hold. Another campaign's are untouched."""
    camp, (a,), cid = _campaign(client)
    other, (o,), other_cid = _campaign(client)
    filed = {str(a["id"]): _report(a, {"keys_detail": {"0": True}})}
    support.update(Circle, cid, reports_open=True, backstory_answers={
        "chapter_house": "Mill", "reports": filed})
    support.update(Circle, other_cid, reports_open=True, backstory_answers={"reports": {str(o["id"]): {}}})
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("gm_end_assignment")
        [update] = support.of_type(gm.sync(), "circle_update")
        assert update["payload"]["reports_open"] is False
        assert update["payload"]["backstory_answers"] == {"chapter_house": "Mill", "assignment": 2}
        [seen] = support.of_type(wa.drain(), "circle_update")
        assert seen == update
        gm.send("gm_end_assignment")
        [update] = support.of_type(gm.sync(), "circle_update")
        assert update["payload"]["backstory_answers"]["assignment"] == 3
    c = support.fetch(Circle, cid)
    assert (c.reports_open, c.backstory_answers) == (False, {"chapter_house": "Mill", "assignment": 3})
    theirs = support.fetch(Circle, other_cid)
    assert (theirs.reports_open, theirs.backstory_answers) == (True, {"reports": {str(o["id"]): {}}})


def test_gm_end_assignment_empties_the_tension_clock(client):
    """Every assignment starts with an empty clock. Circles made before the default became 0
    kept a full clock (4) from one assignment to the next; End Assignment now empties it
    and clears its name, at every desk. Another campaign's clock is left alone."""
    camp, (a,), cid = _campaign(client)
    other, _, other_cid = _campaign(client)
    support.update(Circle, cid, tension_clock=4, tension_label="The tide comes in")
    support.update(Circle, other_cid, tension_clock=3, tension_label="Theirs")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("gm_end_assignment", role="GM")
        [update] = [m for m in gm.sync() if m["type"] == "circle_update"]
        assert (update["payload"]["tension_clock"], update["payload"]["tension_label"]) == (0, "")
        [seen] = [m for m in wa.drain() if m["type"] == "circle_update"]
        assert (seen["payload"]["tension_clock"], seen["payload"]["tension_label"]) == (0, "")
    after = support.fetch(Circle, cid)
    assert (after.tension_clock, after.tension_label) == (0, "")
    theirs = support.fetch(Circle, other_cid)
    assert (theirs.tension_clock, theirs.tension_label) == (3, "Theirs")


def test_gm_reset_character(client):
    camp, (member,), _ = _campaign(client, nerve_max=3, nerve_current=0, cunning_max=6, cunning_current=2,
                                   intuition_max=3, intuition_current=1, nerve_resistance_spent=1)
    other_camp = support.new_campaign(client)
    foreign = support.active_member(client, other_camp, nerve_max=3, nerve_current=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_reset_character", role="GM", character_id=member["id"])
        msgs = gm.sync()
        got = wm.drain()
        assert msgs == [{"type": "member_update", "payload": got[0]["payload"]}, {"type": "activity_log", "payload": {
            "message": f"{EM} {member['name']}'s session resources have been reset. {EM}", "log_type": "field"}}]
        assert support.types(got) == ["character_update", "activity_log"]
        p = got[0]["payload"]
        assert (p["nerve_current"], p["cunning_current"], p["intuition_current"]) == (3, 6, 3)
        assert p["nerve_resistance_spent"] == 0
        gm.send("gm_reset_character", role="GM", character_id=foreign["id"])  # other campaign
        gm.send("gm_reset_character", role="GM")  # no character: ignored
        assert gm.sync() == [_rejected("gm_reset_character")]
        gm.send("gm_reset_character", character_id=member["id"])  # payload.role is ignored now
        assert support.types(gm.sync()) == ["member_update", "activity_log"]
    assert support.fetch(Character, foreign["id"]).nerve_current == 0


# --- update_circle ----------------------------------------------------------

def test_update_circle_as_gm(client):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("update_circle", role="GM", name="Lanterns", stitch=5, chapter_house_location="Mill",
                circle_ability="Hunters", tension_clock=1, ignored_field="x")
        [msg] = support.of_type(gm.sync(), "circle_update")
        p = msg["payload"]
        assert (p["id"], p["name"], p["stitch"], p["chapter_house_location"], p["circle_ability"],
                p["tension_clock"]) == (cid, "Lanterns", 5, "Mill", "Hunters", 1)
        assert support.of_type(wm.drain(), "circle_update") == [msg]


def test_update_circle_from_a_player_is_rejected(client):
    """Before tokens a non-GM could lower stitch, refresh and train and set every
    other field (only the GM screens send update_circle). It is GM only now."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, stitch=2, refresh=2, train=2)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("update_circle", stitch=5, refresh=1, name="Player named it", illumination=7)
        assert wm.sync() == [_rejected("update_circle")]
    c = support.fetch(Circle, cid)
    assert (c.stitch, c.refresh, c.train, c.name, c.illumination) == (2, 2, 2, "Unnamed Circle", 0)


def test_update_circle_milestone_log(client):
    camp, _, cid = _campaign(client, members=0)
    support.update(Circle, cid, illumination=2, name="The Moths")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_circle", role="GM", illumination=3)
        msgs = gm.sync()
        assert support.types(msgs) == ["circle_update", "activity_log", "activity_log"]
        # Every change says so (playtest, report-questions-tally: a plain +1 left no line)
        assert msgs[1]["payload"] == {"message": "The Moths gains 1 Illumination (2 to 3).", "log_type": "field"}
        assert msgs[2]["payload"] == {"message": "The Moths milestone reached!", "log_type": "field"}
        gm.send("update_circle", role="GM", illumination=4)
        gm.send("update_circle", role="GM", illumination=3)  # going down: no milestone
        assert [m["payload"]["message"] for m in gm.sync() if m["type"] == "activity_log"] == [
            "The Moths gains 1 Illumination (3 to 4).", "The Moths loses 1 Illumination (4 to 3)."]
        gm.send("update_circle", role="GM", illumination=3)  # no change: no line
        assert support.types(gm.sync()) == ["circle_update"]
        # Fixed (RULES_CHECK 19): every milestone passed gets its line, and a full track says so
        gm.send("update_circle", role="GM", illumination=12)
        msgs = gm.sync()
        assert [m["payload"]["message"] for m in msgs[1:]] == [
            "The Moths gains 9 Illumination (3 to 12).",
            "The Moths milestone reached!", "The Moths milestone reached!",
            "The Moths's Illumination track is full: the circle can advance."]


def test_resource_management_reminds_at_each_milestone(client):
    """RULES_CHECK 20: Resource Management gains a resource of the circle's choice at each
    milestone; the log says so (the choice stays with the table)."""
    camp, _, cid = _campaign(client, members=0)
    support.update(Circle, cid, illumination=2, name="The Moths", circle_ability="Hunters\nResource Management")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_circle", illumination=7)
        lines = [m["payload"]["message"] for m in gm.sync()[2:]]
        assert lines == ["The Moths milestone reached!", "Resource Management: The Moths gains one resource of its choice.",
                         "The Moths milestone reached!", "Resource Management: The Moths gains one resource of its choice."]


def test_advancing_the_circle_replenishes_its_resources(client):
    """Fixed (RULES_CHECK 16): resources come back when the track fills (p. 41)."""
    camp, members, cid = _campaign(client, members=2)
    support.update(Circle, cid, stitch=0, refresh=0, train=0, illumination=12)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_advance_circle")
        circle = gm.sync()[-1]["payload"]["circle"]
        assert (circle["stitch"], circle["refresh"], circle["train"]) == (3, 3, 3)


def test_one_last_run_gives_all_four_options(client):
    """One Last Run (rulebook p. 41): "Everyone gets to take all four options during this
    character advancement instead of only two." The advance that brings it gives four
    picks that must all differ; later advances are pairs again."""
    camp, (member,), cid = _campaign(client, move=1, nerve_max=3, nerve_current=3)
    support.update(Circle, cid, illumination=12)
    rejected = {"type": "action_rejected", "payload": {
        "action": "apply_advancement", "status": 409, "detail": "Choose a different option for your other advancement."}}
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_advance_circle", circle_ability="One Last Run")
        gm.sync()
        assert wm.drain()[0]["payload"]["advancement_picks"] == 4
        wm.send("apply_advancement", choice="add_action", detail="move")
        wm.send("apply_advancement", choice="add_drive", detail="nerve")
        wm.sync()
        wm.send("apply_advancement", choice="add_action", detail="strike")  # the set is four different options
        assert wm.sync() == [rejected]
        wm.send("apply_advancement", choice="new_ability", detail="Steel Mind")
        wm.send("apply_advancement", choice="gild_action", detail="sense")
        msgs = wm.sync()
        last = [m for m in msgs if m["type"] == "character_update"][-1]["payload"]
        assert (last["advancement_picks"], last["advancement_taken"]) == (0, [])
    row = support.fetch(Character, member["id"])
    assert (row.move, row.nerve_max, row.gilded_sense, row.advancement_set) == (2, 5, True, 2)


def test_an_open_desk_can_take_the_picks_of_an_advance(client):
    """Fixed: a player whose desk was open when the Lightkeeper advanced the circle got
    "No advancement is waiting", because the socket kept the character it had loaded.
    Each message now reads the row fresh (vtt/ws/endpoint.py)."""
    camp, (member,), cid = _campaign(client, move=1)
    support.update(Circle, cid, illumination=12)
    with support.ws_connect(client, member["id"]) as wm, support.ws_connect(client, camp["campaign_code"]) as gm:
        wm.send("update_pen_font", pen_font="Kalam")  # the player's socket has loaded its row
        wm.sync()
        gm.send("gm_advance_circle")
        gm.sync()
        wm.drain()
        wm.send("apply_advancement", choice="add_action", detail="move")
        assert wm.sync()[0]["payload"]["move"] == 2


def test_the_gms_resource_edit_is_written_after_a_spend(client):
    """Fixed: the GM socket's copy of the circle still showed the value from before a
    player's spend, so setting that value again wrote nothing."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, stitch=2, resources_editable=True)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("update_circle", illumination=0)  # the GM socket has loaded the circle
        gm.sync()
        support.update(Circle, cid, stitch=1)     # a spend from elsewhere
        gm.send("update_circle", stitch=2)
        assert gm.sync()[0]["payload"]["stitch"] == 2
    assert support.fetch(Circle, cid).stitch == 2


def test_stamina_training_on_a_zero_rating_rolls_its_die(client, dice):
    """With a rating of 0, the Stamina die is the roll: one gilded die (an added die
    makes it a normal roll, rulebook p. 11), not two dice taking the lower."""
    camp, (a,), cid = _campaign(client, move=0)
    support.update(Circle, cid, circle_ability="Stamina Training")
    with support.ws_connect(client, a["id"]) as wa:
        dice(5)
        wa.send("roll", action="move", drive_spent=0, ability_mods=["Stamina Training"])
        roll = wa.sync()[0]["payload"]["roll"]
        assert [(d["value"], d["is_gilded"]) for d in roll["dice"]] == [(5, True)]
        assert roll["outcome"] == "mixed_success"


def test_nobody_left_behind_adds_a_die_while_a_member_is_down(client, dice):
    """Rulebook p. 41: when a circle member drops incapacitated, a roll to protect them or
    get them out of danger has +1d. The circle names who is down, and goes out again when
    that changes, so the desks offer the die only then."""
    camp, (a, b), cid = _campaign(client, members=2, move=1)
    support.update(Circle, cid, circle_ability="Nobody Left Behind")

    def rolls(ws, count):
        dice(*([2] * count))
        ws.send("roll", action="move", drive_spent=0, ability_mods=["Nobody Left Behind"])
        return len(support.of_type(ws.sync(), "roll_result")[0]["payload"]["roll"]["dice"]) == count

    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        assert rolls(wa, 1)   # nobody is down: no die
        support.update(Character, b["id"], body_marks=3)
        wb.send("take_mark", mark_type="body", is_from_enemy=False)
        update = next(m for m in wa.drain(0.5) if m["type"] == "circle_update")
        assert update["payload"]["incapacitated_members"] == [{"id": b["id"], "name": b["name"]}]
        assert rolls(wa, 2)   # b is down: +1d
        assert rolls(wb, 1)   # not for b's own rolls
        wb.drain()
        wb.send("revive_character")
        wb.sync()
        update = next(m for m in wa.drain(0.5) if m["type"] == "circle_update")
        assert update["payload"]["incapacitated_members"] == []
        assert rolls(wa, 1)
    # Without the circle ability, no die
    support.update(Circle, cid, circle_ability="Stamina Training")
    support.update(Character, b["id"], incapacitated=True)
    with support.ws_connect(client, a["id"]) as wa:
        assert rolls(wa, 1)


def test_stamina_training_adds_three_gilded_dice_an_assignment(client, dice):
    """RULES_CHECK 20: Stamina Training gives the circle three gilded dice to share each
    assignment, each added "as +1d to any roll" (rulebook p. 41); a player picks one on a
    roll, and ending the assignment brings them back. (It first gilded a die already in
    the pool and added none.)"""
    camp, (a,), cid = _campaign(client, move=2)
    support.update(Circle, cid, circle_ability="Stamina Training")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        for left in (2, 1, 0):
            dice(4, 5, 3)
            wa.send("roll", action="move", drive_spent=0, ability_mods=["Stamina Training"])
            msgs = wa.sync()
            # Move 2 plus the Stamina die: three dice, one gilded
            assert [d["is_gilded"] for d in msgs[0]["payload"]["roll"]["dice"]] == [True, False, False]
            update = next(m for m in msgs if m["type"] == "circle_update")
            assert update["payload"]["stamina_dice_left"] == left
            wa.send("resolve_gilded", action="move", chosen_type="regular")
            wa.sync()
        dice(4, 5)
        wa.send("roll", action="move", drive_spent=0, ability_mods=["Stamina Training"])  # none left
        msgs = wa.sync()
        assert [d["is_gilded"] for d in msgs[0]["payload"]["roll"]["dice"]] == [False, False]
        gm.drain()
        gm.send("gm_end_assignment")
        assert gm.sync()[0]["payload"]["stamina_dice_left"] == 3


def test_update_circle_string_resource(client):
    """Before tokens a player's string resource was compared with the stored int,
    which raised and ended the socket. A player is rejected before that now, and the
    GM's update stores the string the way PostgreSQL casts it."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm, support.ws_connect(client, camp["campaign_code"]) as gm:
        wm.send("update_circle", stitch="5")
        assert wm.sync() == [_rejected("update_circle")]
        assert support.server_sockets(member["id"])
        wm.drain()
        gm.send("update_circle", stitch="5")
        [msg] = support.of_type(gm.sync(), "circle_update")
    assert support.fetch(Circle, cid).stitch == 5


# --- circle creation --------------------------------------------------------

def test_circle_creation_vote(client):
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="ability", value="Hunters")
        msgs = wa.sync()
        assert msgs == [{"type": "vote_update", "payload": {
            "vote_type": "ability", "votes": [{"character_id": a["id"], "value": "Hunters"}]}}]
        assert wb.drain() == msgs
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="ability", value="Seekers")
        assert wa.sync()[0]["payload"]["votes"] == [{"character_id": a["id"], "value": "Seekers"}]
        for i in range(6):
            wa.send("circle_creation_vote", character_id=a["id"], vote_type="name_suggest", value=f"N{i}")
        msgs = wa.sync()
        assert len(msgs) == 6
        assert len(msgs[-1]["payload"]["votes"]) == 5
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="ability")  # no value
        wa.send("circle_creation_vote", vote_type="ability", value="x")  # no character
        assert wa.sync() == []
    assert len(support.fetch_all(CircleVote, circle_id=cid, vote_type="name_suggest")) == 5


def test_circle_creation_vote_unknown_type_is_rejected(client):
    """Fixed: an unknown vote_type was committed, then the KeyError ended the socket.
    It is now refused (422) before anything is stored, and the socket keeps working."""
    camp, (a,), cid = _campaign(client)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="colour", value="red")
        assert wa.sync() == [{"type": "action_rejected", "payload": {
            "action": "circle_creation_vote", "status": 422, "detail": "Unknown vote type."}}]
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="insignia", value="Moth")
        assert support.types(wa.sync()) == ["vote_update"]
    assert support.fetch_all(CircleVote, circle_id=cid, vote_type="colour") == []


def test_circle_backstory_update(client):
    camp, (a,), cid = _campaign(client)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_backstory_update", question_key="chapter_house", answer="Old mill")
        assert wa.sync() == [{"type": "backstory_update", "payload": {"question_key": "chapter_house", "answer": "Old mill"}}]
        wa.send("circle_backstory_update", answer="no key")
        assert wa.sync() == []
    assert support.fetch(Circle, cid).backstory_answers == {"chapter_house": "Old mill"}


def test_circle_backstory_can_overwrite_reserved_keys(client):
    """QUIRK: free keys can replace the reports and selected_question_key entries."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, backstory_answers={"reports": {"1": {"q": True}}})
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_backstory_update", question_key="reports", answer="gone")
        wa.sync()
    assert support.fetch(Circle, cid).backstory_answers == {"reports": "gone"}


def test_circle_personal_answer(client):
    camp, (a,), cid = _campaign(client)
    outsider = support.forge(client)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_personal_answer", character_id=a["id"], answer="For my sister")
        assert wa.sync() == [{"type": "personal_answer_update", "payload": {
            "character_id": a["id"], "answer": "For my sister"}}]
        wa.send("circle_personal_answer", character_id=outsider["id"], answer="nope")  # someone else's
        wa.send("circle_personal_answer", answer="nope")
        assert wa.sync() == [_rejected("circle_personal_answer")]
    assert support.fetch(Character, a["id"]).personal_circle_answer == "For my sister"
    assert support.fetch(Character, outsider["id"]).personal_circle_answer in ("", None)


def test_circle_relationship_propose_and_respond(client):
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"],
                rel_type="Rivals", lore="feud")
        [msg] = wa.sync()
        assert msg["type"] == "relationship_update"
        [rel] = msg["payload"]["relationships"]
        assert rel == {"id": rel["id"], "from_character_id": a["id"], "to_character_id": b["id"],
                       "rel_type": "Rivals", "lore": "feud", "status": "proposed", "last_actor_id": a["id"]}
        assert wb.drain() == [msg]

        wb.send("circle_relationship_respond", relationship_id=rel["id"], action="counter",
                counter_type="Allies", counter_lore="truce")
        [msg] = wb.sync()
        assert msg["payload"]["relationships"][0] == dict(rel, rel_type="Allies", lore="truce",
                                                          status="proposed", last_actor_id=b["id"])
        assert wa.drain() == [msg]
        wa.send("circle_relationship_respond", relationship_id=rel["id"], action="accept")
        [msg] = wa.sync()
        assert msg["payload"]["relationships"][0]["status"] == "accepted"
        assert msg["payload"]["relationships"][0]["last_actor_id"] == a["id"]
        wa.send("circle_relationship_respond", relationship_id=987654321, action="accept")
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"])  # no type
        assert wa.sync() == [_rejected("circle_relationship_respond", status=404, detail="Relationship not found")]
    row = support.fetch(Relationship, rel["id"])
    assert (row.status, row.counter_type, row.counter_lore) == ("accepted", None, None)


def test_relationship_messages_only_for_the_rightful_party(client):
    """Before tokens a socket could propose as any character and answer any
    relationship. Now a player proposes only from their own character to a fellow
    member, and only the party that did not act last may answer."""
    camp, (a, b, c), cid = _campaign(client, members=3)
    outsider = support.active_member(client, support.new_campaign(client))
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, c["id"]) as wc:
        wa.send("circle_relationship_propose", from_character_id=b["id"], to_character_id=c["id"], rel_type="X")
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=outsider["id"], rel_type="X")
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"], rel_type="X",
                circle_id=1)
        assert wa.sync() == [_rejected("circle_relationship_propose")] * 3
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"], rel_type="X")
        rel_id = wa.sync()[0]["payload"]["relationships"][0]["id"]
        wb.drain(), wc.drain()
        wa.send("circle_relationship_respond", relationship_id=rel_id, action="accept")  # a acted last
        assert wa.sync() == [_rejected("circle_relationship_respond")]
        wc.send("circle_relationship_respond", relationship_id=rel_id, action="accept")  # not a party
        assert wc.sync() == [_rejected("circle_relationship_respond")]
    assert support.fetch(Relationship, rel_id).status == "proposed"


def test_circle_relationship_respond_on_gm_socket_is_rejected(client):
    """Before tokens the actor id was int(game_id), which raised on a campaign-code
    socket and ended it (bug D9). The GM is not a party, so it is rejected first."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"], rel_type="X")
        rel_id = wa.sync()[0]["payload"]["relationships"][0]["id"]
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("circle_relationship_respond", relationship_id=rel_id, action="accept")
        assert gm.sync() == [_rejected("circle_relationship_respond")]
        assert support.server_sockets(camp["campaign_code"])
    assert support.fetch(Relationship, rel_id).status == "proposed"


def test_a_relationship_waiting_at_the_seal_can_still_be_answered(client):
    """The Lightkeeper's Finalize slip says the relationships still waiting can be
    accepted after the seal (playtest, lk-formation-status-thin). Finalizing leaves them
    as they stand, and the party whose turn it is still accepts or counters one from the
    Circle tab, with the update reaching the Lightkeeper too."""
    camp, (a, b, c), cid = _campaign(client, members=3)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"], rel_type="Rivals")
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=c["id"], rel_type="Allies")
        rels = support.of_type(wa.sync(), "relationship_update")[-1]["payload"]["relationships"]
    to_b, to_c = (next(r["id"] for r in rels if r["to_character_id"] == who["id"]) for who in (b, c))
    r = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid},
                    headers=support.as_gm(camp))
    assert r.status_code == 200 and r.json()["is_finalized"] is True
    assert [row.status for row in support.fetch_all(Relationship, circle_id=cid)] == ["proposed", "proposed"]

    with support.ws_connect(client, b["id"]) as wb, support.ws_connect(client, c["id"]) as wc, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wb.send("circle_relationship_respond", relationship_id=to_b, action="accept")
        [msg] = wb.sync()
        assert msg["type"] == "relationship_update"
        assert support.of_type(gm.drain(), "relationship_update") == [msg]
        assert wc.drain() == [msg]
        wc.send("circle_relationship_respond", relationship_id=to_c, action="counter",
                counter_type="Family", counter_lore="cousins")
        [msg] = wc.sync()
        assert support.of_type(gm.drain(), "relationship_update") == [msg]
    accepted, countered = support.fetch(Relationship, to_b), support.fetch(Relationship, to_c)
    assert (accepted.status, accepted.last_actor_id) == ("accepted", b["id"])
    assert (countered.status, countered.rel_type, countered.lore, countered.last_actor_id) == (
        "proposed", "Family", "cousins", c["id"])


def test_ws_propose_again_resets_the_existing_relationship(client):
    camp, (a, b), cid = _campaign(client, members=2)
    rel_id = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "feud"}, headers=support.as_owner(a["id"])).json()["relationships"][0]["id"]
    client.post("/circle/relationship/respond", json={
        "relationship_id": rel_id, "action": "counter", "counter_type": "Allies", "counter_lore": "truce"},
        headers=support.as_owner(b["id"]))
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"],
                rel_type="Friends", lore="new")
        [msg] = wa.sync()
        assert msg["payload"]["relationships"] == [{
            "id": rel_id, "from_character_id": a["id"], "to_character_id": b["id"],
            "rel_type": "Friends", "lore": "new", "status": "proposed", "last_actor_id": a["id"]}]
        assert wb.drain() == [msg]
    row = support.fetch(Relationship, rel_id)
    assert (row.counter_type, row.counter_lore) == (None, None)
    assert len(support.fetch_all(Relationship, circle_id=cid)) == 1


def test_ws_respond_unknown_action_and_counter_without_terms(client):
    """An unknown action commits and broadcasts with nothing changed, and a counter
    without new terms keeps the old type and lore and reopens the proposal.

    QUIRK (in QUIRKS.md, not pinned here): a socket whose session still holds an
    older copy of the row can lose a response, because the counter sets the values
    the stale copy already has. Whether that copy is still in the session depends on
    when Python's garbage collector runs (the identity map holds weak references),
    and the extra access-check queries changed that timing. So this test first makes
    a's session reload its rows with a commit of its own."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"],
                rel_type="Rivals", lore="feud")
        [rel] = wa.sync()[0]["payload"]["relationships"]
        wb.drain()
        # an unknown action still commits and broadcasts, with nothing changed
        wb.send("circle_relationship_respond", relationship_id=rel["id"], action="shrug")
        [msg] = wb.sync()
        assert msg == {"type": "relationship_update", "payload": {"relationships": [rel]}}
        assert wa.drain() == [msg]
        wb.send("circle_relationship_respond", relationship_id=rel["id"], action="accept")
        accepted = dict(rel, status="accepted", last_actor_id=b["id"])
        assert wb.sync()[0]["payload"]["relationships"] == [accepted]
        assert wa.drain()[0]["payload"]["relationships"] == [accepted]
        wa.send("update_pen_font", pen_font="Kalam")  # any commit reloads a's rows
        wa.sync()
        wa.send("circle_relationship_respond", relationship_id=rel["id"], action="counter")
        assert wa.sync()[0]["payload"]["relationships"] == [rel]
    row = support.fetch(Relationship, rel["id"])
    assert (row.status, row.last_actor_id) == ("proposed", a["id"])


# --- the GM gate on gm_advance_circle and gm_end_assignment ----------------------

@pytest.mark.parametrize("role", [None, "player", "gm", "GM"])
def test_advance_and_end_assignment_need_the_gm(client, role):
    """Before tokens the gate was payload.role == "GM" (so a GM socket without it was
    ignored and a player with it was obeyed). Now it is the socket: a player is
    rejected whatever role it claims."""
    camp, (member,), cid = _campaign(client)
    support.update(Character, member["id"], ability_uses={"Steel Mind": 1}, resources_spent_assignment=2,
                   train_bonus=True)
    support.update(Circle, cid, illumination=14, circle_ability="Hunters", location="Docks", atmosphere="Fog")
    extra = {} if role is None else {"role": role}
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        wm.send("gm_advance_circle", circle_ability="Seekers", **extra)
        wm.send("gm_end_assignment", **extra)
        assert wm.sync() == [_rejected("gm_advance_circle"), _rejected("gm_end_assignment")]
        assert gm.drain() == []
    c = support.fetch(Circle, cid)
    assert (c.illumination, c.circle_ability, c.location, c.atmosphere) == (14, "Hunters", "Docks", "Fog")
    row = support.fetch(Character, member["id"])
    assert (row.ability_uses, row.resources_spent_assignment, row.train_bonus) == ({"Steel Mind": 1}, 2, True)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_advance_circle", circle_ability="Seekers", **extra)
        gm.send("gm_end_assignment", **extra)
        assert support.types(gm.sync()) == ["member_update", "activity_log", "circle_advanced",
                                            "circle_update", "member_update", "activity_log"]
    c = support.fetch(Circle, cid)
    assert (c.illumination, c.circle_ability, c.location, c.atmosphere) == (2, "Hunters\nSeekers", "", "")


def test_gm_advance_circle_first_ability_and_unnamed_circle(client):
    camp, _, cid = _campaign(client, members=0)
    support.update(Circle, cid, name="", circle_ability=None, illumination=12)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_advance_circle", role="GM", circle_ability="Seekers")
        msgs = gm.sync()
        assert msgs[0]["payload"] == {"message": "The Circle has advanced!", "log_type": "field"}
        assert msgs[1]["payload"]["circle"]["circle_ability"] == "Seekers"
        assert msgs[1]["payload"]["circle"]["illumination"] == 0
    assert support.fetch(Circle, cid).circle_ability == "Seekers"


def test_milestone_log_for_unnamed_circle(client):
    camp, _, cid = _campaign(client, members=0)
    support.update(Circle, cid, name=None, illumination=5)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_circle", role="GM", illumination=6)
        msgs = gm.sync()
        assert support.types(msgs) == ["circle_update", "activity_log", "activity_log"]
        assert msgs[1]["payload"] == {"message": "The Circle gains 1 Illumination (5 to 6).", "log_type": "field"}
        assert msgs[2]["payload"] == {"message": "The Circle milestone reached!", "log_type": "field"}


def test_update_circle_player_claiming_gm_is_rejected(client):
    """Before tokens a player that sent role GM could raise the circle's resources."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, stitch=1, refresh=1, train=1)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("update_circle", role="GM", stitch=4, refresh=5, train=6)
        assert wm.sync() == [_rejected("update_circle")]
    c = support.fetch(Circle, cid)
    assert (c.stitch, c.refresh, c.train) == (1, 1, 1)


# --- submit_assignment_report when backstory_answers already holds data ----------

def _report(ch, responses):
    """A stored report: the shape of the assignment_report_submitted payload, which the
    GM's report card reads after a reload (without its submitted_at, see _undated)."""
    return {"character_name": ch["name"], "responses": responses}


def _undated(answers):
    """backstory_answers with each report's submitted_at checked and taken out."""
    reports = {}
    for key, report in answers.get("reports", {}).items():
        report = dict(report)
        assert datetime.fromisoformat(report.pop("submitted_at")).tzinfo is not None
        reports[key] = report
    return {**answers, "reports": reports}


def test_second_report_from_a_fresh_session_is_saved(client):
    """Fixed (was a live bug): once backstory_answers was not empty, the handler added
    the report to the dict it loaded, in place, and assigned that same object back. The
    JSON column does not track in-place changes, so SQLAlchemy skipped the UPDATE and
    the report was broadcast but lost on reload. Reports were also stored as the bare
    responses, while the GM's report card reads {character_name, responses}."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Circle, cid, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        wa.sync()
        with support.ws_connect(client, b["id"]) as wb:  # loads the circle with a's report in it
            wb.send("submit_assignment_report", character_id=b["id"], responses={"q0": False})
            [msg] = support.of_type(wb.sync(), "assignment_report_submitted")
            assert msg["payload"] == {"character_id": b["id"], "character_name": b["name"], "responses": {"q0": False},
                                      "submitted_at": msg["payload"]["submitted_at"]}
            # a's desk is not sent b's report, only the line that says it was filed
            assert [m["type"] for m in wa.drain()] == ["activity_log"]
    assert _undated(support.fetch(Circle, cid).backstory_answers) == {"reports": {
        str(a["id"]): _report(a, {"q0": True}), str(b["id"]): _report(b, {"q0": False})}}
    state = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp["id"])).json()
    assert state["backstory_answers"]["reports"][str(b["id"])] == {
        "character_name": msg["payload"]["character_name"], "responses": msg["payload"]["responses"],
        "submitted_at": msg["payload"]["submitted_at"]}


def test_reports_from_sockets_opened_before_any_report_are_all_kept(client):
    """Fixed: each socket kept the empty dict it loaded at connect, so every report
    built a new dict holding only itself and the last report replaced the others. The
    handler now reads the row again before adding its report."""
    camp, (a, b), cid = _campaign(client, members=2)
    support.update(Circle, cid, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        wa.sync()
        wb.send("submit_assignment_report", character_id=b["id"], responses={"q0": False})
        wb.sync()
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q1": True}, replace=True)  # amended
        wa.sync()
    assert _undated(support.fetch(Circle, cid).backstory_answers) == {"reports": {
        str(a["id"]): _report(a, {"q1": True}), str(b["id"]): _report(b, {"q0": False})}}


def test_report_after_circle_answers_is_saved(client):
    """Fixed: same cause as above; any stored answer (chapter house, selected
    question) made the dict non-empty, so even the first report was lost."""
    camp, (a,), cid = _campaign(client)
    answers = {"chapter_house": "Mill", "selected_question_key": "q2"}
    support.update(Circle, cid, backstory_answers=answers, reports_open=True)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        assert support.types(wa.sync()) == ["assignment_report_submitted", "activity_log"]
    assert _undated(support.fetch(Circle, cid).backstory_answers) == {
        **answers, "reports": {str(a["id"]): _report(a, {"q0": True})}}


# --- the frontend's 'gm' fallback channel is gone ---------------------------------

def test_campaignless_gm_channel_is_refused(client):
    """Before tokens the 'gm' channel (OperationsPanel's fallback with no campaign
    code) was a GM socket with no campaign on circle 1, and could toggle circle 1's
    reports. Nobody is the GM of it, so it is closed with 4404."""
    before = support.fetch(Circle, 1).reports_open
    for user_id in (support.make_user().id, support.gm_id(support.new_campaign(client))):
        assert support.ws_close_code(client, "gm", token=support.token_for(user_id)) == 4404
    assert support.fetch(Circle, 1).reports_open == before


def test_gm_cannot_reset_unaffiliated_or_foreign_characters(client):
    """Before tokens the 'gm' channel could reset any unaffiliated character (its
    campaign filter became campaign_id IS NULL). A GM may only reset members of
    their own campaign."""
    loner = support.forge(client, nerve_max=3, nerve_current=0, cunning_max=3, cunning_current=1,
                          nerve_resistance_spent=1)
    camp = support.new_campaign(client)
    member = support.active_member(client, camp, nerve_max=3, nerve_current=0)
    other_camp = support.new_campaign(client)
    with support.ws_connect(client, other_camp["campaign_code"]) as gm, support.ws_connect(client, loner["id"]) as wl, \
            support.ws_connect(client, member["id"]) as wm, \
            support.ws_connect(client, camp["campaign_code"]) as member_gm:
        gm.send("gm_reset_character", character_id=loner["id"])
        gm.send("gm_reset_character", character_id=member["id"])
        assert gm.sync() == [_rejected("gm_reset_character")] * 2
        assert wl.drain() == [] and wm.drain() == [] and member_gm.drain() == []
    assert support.fetch(Character, loner["id"]).nerve_current == 0
    assert support.fetch(Character, member["id"]).nerve_current == 0


def test_gm_end_assignment_only_on_own_circle(client):
    """Before tokens gm_end_assignment on the 'gm' channel cleared the scene of any
    circle id and reset every active character with no campaign. A GM may only end
    the assignment on their own campaign's circle, and it resets only their members."""
    camp, (member,), cid = _campaign(client)
    support.update(Character, member["id"], ability_uses={"Steel Mind": 1}, resources_spent_assignment=2)
    stray = support.forge(client)
    support.update(Character, stray["id"], status="active", ability_uses={"Steel Mind": 1},
                   resources_spent_assignment=2, train_bonus=True)
    support.update(Circle, cid, location="Docks", atmosphere="Fog")
    other_camp, _, other_cid = _campaign(client, members=0)
    with support.ws_connect(client, other_camp["campaign_code"]) as gm, support.ws_connect(client, stray["id"]) as wst, \
            support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_end_assignment", circle_id=cid)
        assert gm.sync() == [_rejected("gm_end_assignment")]
        gm.send("gm_end_assignment", circle_id=other_cid)
        assert support.types(gm.sync()) == ["circle_update", "activity_log"]
        assert wst.drain() == [] and wm.drain() == []
    assert support.fetch(Character, member["id"]).ability_uses == {"Steel Mind": 1}
    assert support.fetch(Character, stray["id"]).resources_spent_assignment == 2
    assert support.fetch(Circle, cid).location == "Docks"


def test_the_lightkeeper_resource_and_report_changes_are_logged(client):
    """The circle's resources, the dispatch cleared, the tension lowered, and the reports
    opening and closing each leave a line (playtest: lk-resource-repair,
    silent-table-changes)."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("update_circle", circle_id=cid, refresh=4, tension_clock=3, location="Docks")
        gm.send("update_circle", circle_id=cid, refresh=4, tension_clock=1, location="", atmosphere="", dispatch_text="")
        gm.send("gm_toggle_reports", circle_id=cid)
        gm.send("gm_toggle_reports", circle_id=cid)
        gm.sync()
        lines = [m["payload"]["message"] for m in support.of_type(wm.drain(), "activity_log")]
    assert lines[2].startswith("The Lightkeeper set the circle's Refresh to 4 (was ")
    assert lines[:2] + lines[3:] == [
        "The Lightkeeper sent a dispatch.",
        "The Lightkeeper raised the tension to 3 of 4.",
        "The Lightkeeper cleared the dispatch.",
        "The Lightkeeper lowered the tension to 1 of 4.",
        "The Lightkeeper opened the assignment reports.",
        "The Lightkeeper closed the assignment reports.",
    ]


def test_the_lightkeeper_gives_a_spend_back(client):
    camp, (member,), cid = _campaign(client)
    support.update(Character, member["id"], resources_spent_assignment=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        before = support.fetch(Circle, cid).stitch
        gm.send("gm_return_spend", character_id=member["id"], resource_type="stitch", circle_id=cid)
        sent = gm.sync()
        assert support.types(sent) == ["member_update", "circle_update", "activity_log"]
        assert sent[-1]["payload"]["message"] == (
            f"The Lightkeeper gave {member['name']} a spend back (1 of 2 used this assignment), and a Stitch to the circle.")
        assert support.of_type(wm.drain(), "character_update")[0]["payload"]["resources_spent_assignment"] == 1
        # Without a resource only the member's count moves; at 0 there is nothing to give back
        gm.send("gm_return_spend", character_id=member["id"])
        gm.send("gm_return_spend", character_id=member["id"])
        refused = [m for m in gm.sync() if m["type"] == "action_rejected"]
    assert [m["payload"]["status"] for m in refused] == [409]
    assert support.fetch(Character, member["id"]).resources_spent_assignment == 0
    assert support.fetch(Circle, cid).stitch == before + 1


def test_a_player_cannot_give_a_spend_back(client):
    camp, (member,), cid = _campaign(client)
    support.update(Character, member["id"], resources_spent_assignment=2)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("gm_return_spend", character_id=member["id"])
        assert [m["type"] for m in wm.sync()] == ["action_rejected"]
    assert support.fetch(Character, member["id"]).resources_spent_assignment == 2


def test_a_lightkeeper_cannot_give_a_spend_back_on_another_campaigns_circle(client):
    camp, (member,), cid = _campaign(client)
    other, _, other_cid = _campaign(client)
    support.update(Character, member["id"], resources_spent_assignment=1)
    before = support.fetch(Circle, other_cid).stitch
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_return_spend", character_id=member["id"], resource_type="stitch", circle_id=other_cid)
        assert [m["type"] for m in gm.sync()] == ["action_rejected"]
    assert support.fetch(Circle, other_cid).stitch == before
    assert support.fetch(Character, member["id"]).resources_spent_assignment == 1
