"""WebSocket circle and GM actions."""
import pytest

import support
from models import Character, Circle, CircleVote, Relationship

EM = support.EM


def _campaign(client, members=1, **char_fields):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, **char_fields) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]
    return camp, chars, cid


# --- gm_update_circle / gm_update_tension / gm_transition_scene ---------------

def test_gm_update_circle_scene_manager_edits_shared_circle_one(client):
    """QUIRK (bug D2): SceneManager sends circle_id 1, and the lookup is not scoped to
    the campaign, so every campaign edits circle 1 and is shown circle 1's data."""
    camp, (member,), cid = _campaign(client)
    before = support.fetch(Circle, 1)
    try:
        with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
            gm.send("gm_update_circle", role="GM", circle_id=1, tension_clock=2,
                    tension_label="Watch", location="Docks", atmosphere="Fog")
            [msg] = gm.sync()
            assert msg["type"] == "circle_update"
            assert msg["payload"]["id"] == 1
            assert (msg["payload"]["tension_clock"], msg["payload"]["tension_label"]) == (2, "Watch")
            assert (msg["payload"]["location"], msg["payload"]["atmosphere"]) == ("Docks", "Fog")
            assert wm.drain() == [msg]
        assert support.fetch(Circle, 1).location == "Docks"
        assert support.fetch(Circle, cid).location in ("", None)
    finally:
        support.update(Circle, 1, tension_clock=before.tension_clock, tension_label=before.tension_label,
                       location=before.location, atmosphere=before.atmosphere)


def test_gm_update_circle_defaults_to_circle_one_and_needs_role(client):
    camp, _, cid = _campaign(client, members=0)
    before = support.fetch(Circle, 1)
    try:
        with support.ws_connect(client, camp["campaign_code"]) as gm:
            gm.send("gm_update_circle", location="Nowhere")
            gm.send("gm_update_circle", role="player", location="Nowhere")
            assert gm.sync() == []
            gm.send("gm_update_circle", role="GM", atmosphere="Rain")
            assert gm.sync()[0]["payload"]["id"] == 1
            gm.send("gm_update_circle", role="GM", circle_id=cid, stitch=5, guard_patrol=2, name="ignored")
            p = gm.sync()[0]["payload"]
            assert (p["id"], p["stitch"], p["guard_patrol"]) == (cid, 5, 2)
            assert p["name"] == "Unnamed Circle"
    finally:
        support.update(Circle, 1, atmosphere=before.atmosphere)


@pytest.mark.legacy_trust
def test_gm_role_is_client_claimed(client):
    """A player socket that sends role GM gets GM powers."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("gm_toggle_reports", role="GM")
        assert wm.sync()[0]["payload"]["reports_open"] is True
    assert support.fetch(Circle, cid).reports_open is True


def test_gm_update_tension(client):
    camp, (member,), _ = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send("gm_update_tension", role="GM", mark_type="body", value=2, character_id=member["id"])
        msgs = gm.sync()
        assert support.types(msgs) == ["character_update"]
        assert msgs[0]["payload"]["id"] == member["id"]
        assert msgs[0]["payload"]["body_marks"] == 2
        assert wm.drain() == []  # the player is not told
        gm.send("gm_update_tension", role="GM", mark_type="body", value=3)  # no character on a GM socket
        gm.send("gm_update_tension", mark_type="body", value=3, character_id=member["id"])  # no role
        assert gm.sync() == []
    assert support.fetch(Character, member["id"]).body_marks == 2


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
        gm.send("gm_toggle_reports")
        gm.send("gm_toggle_resource_edit", role="player")
        assert gm.sync() == []
        assert support.types(wm.drain()) == ["circle_update"] * 3
    c = support.fetch(Circle, cid)
    assert (c.resources_editable, c.reports_open) == (False, True)


@pytest.mark.legacy_trust
def test_gm_toggle_reaches_another_campaigns_circle(client):
    """resolve_circle falls back to an unscoped id lookup."""
    camp_a, _, cid_a = _campaign(client, members=0)
    camp_b, _, cid_b = _campaign(client, members=0)
    with support.ws_connect(client, camp_a["campaign_code"]) as gm:
        gm.send("gm_toggle_reports", role="GM", circle_id=cid_b)
        assert gm.sync()[0]["payload"]["id"] == cid_b
    assert support.fetch(Circle, cid_b).reports_open is True
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
    assert support.fetch(Circle, cid).backstory_answers == {"reports": {str(a["id"]): {"q0": True, "q1": False}}}


@pytest.mark.legacy_trust
def test_submit_report_for_any_character_id(client):
    """No ownership or reports_open check; unknown ids are reported as Unknown."""
    camp, (a,), cid = _campaign(client)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=987654321, responses={"x": 1})
        [msg] = wa.sync()
        assert msg["payload"]["character_name"] == "Unknown"
    assert "987654321" in support.fetch(Circle, cid).backstory_answers["reports"]


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
        late = support.forge(client, user_id=support.make_user().id)
        client.post("/campaign/rejoin", json={"character_id": late["id"], "campaign_code": camp["campaign_code"]})
        gm.drain()
        # QUIRK: the GM socket's long-lived session still holds the member list it
        # loaded before the rejoin, so this refill uses the old count while the
        # circle_update (built after the commit reloaded it) already reports 2.
        gm.send("refill_resources", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["max_capacity"]) == (1, 2)
        gm.send("refill_resources", role="GM")
        p = gm.sync()[0]["payload"]
        assert (p["stitch"], p["max_capacity"]) == (2, 2)
        gm.send("refill_resources")
        assert gm.sync() == []


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
        gm.send("gm_reset_character", role="GM", character_id=foreign["id"])  # other campaign: ignored
        gm.send("gm_reset_character", role="GM")
        gm.send("gm_reset_character", character_id=member["id"])
        assert gm.sync() == []
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


def test_update_circle_player_may_lower_but_not_raise_resources(client):
    """QUIRK: role is client-claimed, and a non-GM may still set every other field."""
    camp, (member,), cid = _campaign(client)
    support.update(Circle, cid, stitch=2, refresh=2, train=2)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("update_circle", stitch=5, refresh=1, name="Player named it", illumination=7)
        p = wm.sync()[0]["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["name"], p["illumination"]) == (2, 1, 2, "Player named it", 7)


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


def test_update_circle_bad_type_closes_socket(client):
    """QUIRK: comparing a string resource to the stored int raises and ends the socket."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm:
        wm.send("update_circle", stitch="5")
        assert support.wait_server_dropped(member["id"])


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


def test_circle_creation_vote_unknown_type_stored_then_closes(client):
    """QUIRK: an unknown vote_type is committed, then the KeyError ends the socket."""
    camp, (a,), cid = _campaign(client)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_creation_vote", character_id=a["id"], vote_type="colour", value="red")
        assert support.wait_server_dropped(a["id"])
    assert [v.value for v in support.fetch_all(CircleVote, circle_id=cid, vote_type="colour")] == ["red"]


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
        wa.send("circle_personal_answer", character_id=outsider["id"], answer="nope")  # other campaign
        wa.send("circle_personal_answer", answer="nope")
        assert wa.sync() == []
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
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"])
        assert wa.sync() == []
    row = support.fetch(Relationship, rel["id"])
    assert (row.status, row.counter_type, row.counter_lore) == ("accepted", None, None)


def test_circle_relationship_respond_on_gm_socket_closes(client):
    """QUIRK: the actor id is int(game_id), which fails on a campaign-code socket."""
    camp, (a, b), cid = _campaign(client, members=2)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_relationship_propose", from_character_id=a["id"], to_character_id=b["id"], rel_type="X")
        rel_id = wa.sync()[0]["payload"]["relationships"][0]["id"]
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("circle_relationship_respond", relationship_id=rel_id, action="accept")
        assert support.wait_server_dropped(camp["campaign_code"])
    assert support.fetch(Relationship, rel_id).status == "proposed"
