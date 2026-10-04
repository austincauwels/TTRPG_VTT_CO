"""WebSocket circle and GM actions."""
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
        [msg] = gm.sync()
        assert msg["type"] == "circle_update"
        assert msg["payload"]["id"] == cid
        assert (msg["payload"]["tension_clock"], msg["payload"]["tension_label"]) == (2, "Watch")
        assert (msg["payload"]["location"], msg["payload"]["atmosphere"]) == ("Docks", "Fog")
        assert wm.drain() == [msg]
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
    camp, (member,), _ = _campaign(client)
    outsider = support.active_member(client, support.new_campaign(client))
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_tension", role="GM", mark_type="body", value=2, character_id=member["id"])
        msgs = gm.sync()
        assert support.types(msgs) == ["character_update"]
        assert msgs[0]["payload"]["id"] == member["id"]
        assert msgs[0]["payload"]["body_marks"] == 2
        assert wm.drain() == []  # the player is not told
        gm.send("gm_update_tension", role="GM", mark_type="body", value=3)  # no character on a GM socket
        assert gm.sync() == []
        gm.send("gm_update_tension", mark_type="body", value=3, character_id=outsider["id"])
        assert gm.sync() == [_rejected("gm_update_tension")]
        gm.send("gm_update_tension", mark_type="body", value=1, character_id=member["id"])  # role not needed
        assert gm.sync()[0]["payload"]["body_marks"] == 1
    assert support.fetch(Character, member["id"]).body_marks == 1
    assert support.fetch(Character, outsider["id"]).body_marks == 0


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
        assert support.types(gm.sync()) == ["circle_update"] * 2
        assert support.types(wm.drain()) == ["circle_update"] * 5
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
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True, "q1": False})
        msgs = wa.sync()
        expected = {"type": "assignment_report_submitted", "payload": {
            "character_id": a["id"], "character_name": a["name"], "responses": {"q0": True, "q1": False}}}
        assert msgs == [expected]
        assert wb.drain() == [expected]  # every player sees every report
        wa.send("submit_assignment_report", responses={"q0": True})  # needs character_id
        assert wa.sync() == []
    assert support.fetch(Circle, cid).backstory_answers == {"reports": {str(a["id"]): {
        "character_name": a["name"], "responses": {"q0": True, "q1": False}}}}


def test_submit_report_only_for_own_character(client):
    """Before tokens any character id was accepted, and unknown ids were reported as
    Unknown. Now a player reports only for their own character (QUIRK kept: there is
    still no reports_open check), and the GM cannot report for anyone."""
    camp, (a, b), cid = _campaign(client, members=2)
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
        assert support.types(msgs) == ["activity_log", "circle_advanced"]
        assert msgs[0]["payload"] == {"message": "The Moths has advanced!", "log_type": "field"}
        assert msgs[1]["payload"]["campaign_id"] == camp["id"]
        assert msgs[1]["payload"]["circle"]["circle_ability"] == "Hunters\nSeekers"
        assert msgs[1]["payload"]["circle"]["illumination"] == 2
        assert support.types(wm.drain()) == ["activity_log", "circle_advanced"]
        gm.send("gm_advance_circle", role="GM")  # no ability, no full track: still advances
        msgs = gm.sync()
        assert msgs[1]["payload"]["circle"]["illumination"] == 0


def test_refill_resources_counts_circle_members(client):
    """QUIRK: capacity counts characters attached to the circle, and campaign members
    stay on circle 1, so a campaign circle refills to 1."""
    camp, members, cid = _campaign(client, members=3)
    support.update(Circle, cid, stitch=0, refresh=0, train=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("refill_resources", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (1, 1, 1, 1)
        # a rejoined character is moved onto the campaign circle and then counts
        late = support.forge(client, user_id=support.make_user(pending_rejoin_campaign_id=camp["id"]).id)
        client.post("/campaign/rejoin", json={"character_id": late["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_owner(late["id"]))
        gm.drain()
        # QUIRK: the GM socket's long-lived session still holds the member list it
        # loaded before the rejoin, so this refill uses the old count while the
        # circle_update (built after the commit reloaded it) already reports 2.
        gm.send("refill_resources", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["max_capacity"]) == (1, 2)
        gm.send("refill_resources")  # payload.role is ignored now
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["max_capacity"]) == (2, 2)


def test_gm_end_assignment(client):
    camp, (a, b), cid = _campaign(client, members=2)
    for ch in (a, b):
        support.update(Character, ch["id"], ability_uses={"Steel Mind": 1}, resources_spent_assignment=2,
                       train_bonus=True)
    outsider = support.forge(client)
    support.update(Character, outsider["id"], resources_spent_assignment=2)
    support.update(Circle, cid, location="Docks", atmosphere="Fog")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("gm_end_assignment", role="GM", campaign_id=987654321)
        msgs = gm.sync()
        assert support.types(msgs) == ["circle_update", "activity_log"]
        assert (msgs[0]["payload"]["location"], msgs[0]["payload"]["atmosphere"]) == ("", "")
        assert msgs[1]["payload"] == {"message": f"{EM} Assignment ended. Ability uses have been reset. {EM}",
                                      "log_type": "field"}
        got = wa.drain()
        assert support.types(got) == ["circle_update", "character_update", "activity_log"]
        assert got[1]["payload"]["ability_uses"] == {}
        assert got[1]["payload"]["resources_spent_assignment"] == 0
        assert got[1]["payload"]["train_bonus"] is False
    assert support.fetch(Character, b["id"]).resources_spent_assignment == 0
    assert support.fetch(Character, outsider["id"]).resources_spent_assignment == 2


def test_gm_reset_character(client):
    camp, (member,), _ = _campaign(client, nerve_max=3, nerve_current=0, cunning_max=6, cunning_current=2,
                                   intuition_max=3, intuition_current=1, nerve_resistance_spent=1)
    other_camp = support.new_campaign(client)
    foreign = support.active_member(client, other_camp, nerve_max=3, nerve_current=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_reset_character", role="GM", character_id=member["id"])
        msgs = gm.sync()
        assert msgs == [{"type": "activity_log", "payload": {
            "message": f"{EM} {member['name']}'s session resources have been reset. {EM}", "log_type": "field"}}]
        got = wm.drain()
        assert support.types(got) == ["character_update", "activity_log"]
        p = got[0]["payload"]
        assert (p["nerve_current"], p["cunning_current"], p["intuition_current"]) == (3, 6, 3)
        assert p["nerve_resistance_spent"] == 0
        gm.send("gm_reset_character", role="GM", character_id=foreign["id"])  # other campaign
        gm.send("gm_reset_character", role="GM")  # no character: ignored
        assert gm.sync() == [_rejected("gm_reset_character")]
        gm.send("gm_reset_character", character_id=member["id"])  # payload.role is ignored now
        assert support.types(gm.sync()) == ["activity_log"]
    assert support.fetch(Character, foreign["id"]).nerve_current == 0


# --- update_circle ----------------------------------------------------------

def test_update_circle_as_gm(client):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("update_circle", role="GM", name="Lanterns", stitch=5, chapter_house_location="Mill",
                circle_ability="Hunters", tension_clock=1, ignored_field="x")
        [msg] = gm.sync()
        p = msg["payload"]
        assert (p["id"], p["name"], p["stitch"], p["chapter_house_location"], p["circle_ability"],
                p["tension_clock"]) == (cid, "Lanterns", 5, "Mill", "Hunters", 1)
        assert wm.drain() == [msg]


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
        assert support.types(msgs) == ["circle_update", "activity_log"]
        assert msgs[1]["payload"] == {"message": "The Moths milestone reached!", "log_type": "field"}
        gm.send("update_circle", role="GM", illumination=4)
        gm.send("update_circle", role="GM", illumination=3)  # going down: no log
        gm.send("update_circle", role="GM", illumination=12)  # 12 is excluded
        assert support.types(gm.sync()) == ["circle_update"] * 3


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
        [msg] = gm.sync()
        assert msg["type"] == "circle_update"
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
        assert support.types(gm.sync()) == ["activity_log", "circle_advanced", "circle_update", "activity_log"]
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
        assert support.types(msgs) == ["circle_update", "activity_log"]
        assert msgs[1]["payload"] == {"message": "The Circle milestone reached!", "log_type": "field"}


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
    GM's report card reads after a reload."""
    return {"character_name": ch["name"], "responses": responses}


def test_second_report_from_a_fresh_session_is_saved(client):
    """Fixed (was a live bug): once backstory_answers was not empty, the handler added
    the report to the dict it loaded, in place, and assigned that same object back. The
    JSON column does not track in-place changes, so SQLAlchemy skipped the UPDATE and
    the report was broadcast but lost on reload. Reports were also stored as the bare
    responses, while the GM's report card reads {character_name, responses}."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        wa.sync()
        with support.ws_connect(client, b["id"]) as wb:  # loads the circle with a's report in it
            wb.send("submit_assignment_report", character_id=b["id"], responses={"q0": False})
            [msg] = wb.sync()
            assert msg["payload"] == {"character_id": b["id"], "character_name": b["name"], "responses": {"q0": False}}
            assert wa.drain() == [msg]
    assert support.fetch(Circle, cid).backstory_answers == {"reports": {
        str(a["id"]): _report(a, {"q0": True}), str(b["id"]): _report(b, {"q0": False})}}
    state = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp["id"])).json()
    assert state["backstory_answers"]["reports"][str(b["id"])] == {
        "character_name": msg["payload"]["character_name"], "responses": msg["payload"]["responses"]}


def test_reports_from_sockets_opened_before_any_report_are_all_kept(client):
    """Fixed: each socket kept the empty dict it loaded at connect, so every report
    built a new dict holding only itself and the last report replaced the others. The
    handler now reads the row again before adding its report."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        wa.sync()
        wb.send("submit_assignment_report", character_id=b["id"], responses={"q0": False})
        wb.sync()
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q1": True})  # a report again
        wa.sync()
    assert support.fetch(Circle, cid).backstory_answers == {"reports": {
        str(a["id"]): _report(a, {"q1": True}), str(b["id"]): _report(b, {"q0": False})}}


def test_report_after_circle_answers_is_saved(client):
    """Fixed: same cause as above; any stored answer (chapter house, selected
    question) made the dict non-empty, so even the first report was lost."""
    camp, (a,), cid = _campaign(client)
    answers = {"chapter_house": "Mill", "selected_question_key": "q2"}
    support.update(Circle, cid, backstory_answers=answers)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        assert support.types(wa.sync()) == ["assignment_report_submitted"]
    assert support.fetch(Circle, cid).backstory_answers == {**answers, "reports": {str(a["id"]): _report(a, {"q0": True})}}


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
