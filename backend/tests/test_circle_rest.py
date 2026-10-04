"""/circle/* REST routes (unused by the frontend) and /campaign/finalize-roster."""
import pytest

import support
from models import Campaign, Character, Circle, CircleVote, Relationship


def _setup(client, members=2):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp) for _ in range(members)]
    circle_id = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]
    return camp, chars, circle_id


def _vote(client, circle_id, char_id, vote_type, value):
    return client.post("/circle/vote", json={"circle_id": circle_id, "character_id": char_id,
                                             "vote_type": vote_type, "value": value})


# --- votes ------------------------------------------------------------------

def test_vote_upserts_one_vote_per_character_and_type(client):
    camp, (a, b), cid = _setup(client)
    r = _vote(client, cid, a["id"], "ability", "Hunters")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "votes": [{"character_id": a["id"], "value": "Hunters"}]}
    r = _vote(client, cid, a["id"], "ability", "Seekers")
    assert r.json()["votes"] == [{"character_id": a["id"], "value": "Seekers"}]
    r = _vote(client, cid, b["id"], "ability", "Seekers")
    assert sorted(v["character_id"] for v in r.json()["votes"]) == sorted([a["id"], b["id"]])
    assert len(support.fetch_all(CircleVote, circle_id=cid, vote_type="ability")) == 2


def test_name_suggest_keeps_five_distinct_per_character(client):
    camp, (a, _), cid = _setup(client)
    for i in range(7):
        r = _vote(client, cid, a["id"], "name_suggest", f"Name {i}")
    _vote(client, cid, a["id"], "name_suggest", "Name 0")  # duplicate ignored
    values = [v["value"] for v in r.json()["votes"]]
    assert sorted(values) == [f"Name {i}" for i in range(5)]
    assert len(support.fetch_all(CircleVote, circle_id=cid, vote_type="name_suggest")) == 5


@pytest.mark.legacy_trust
def test_vote_for_any_circle_and_character(client):
    """Votes are accepted for any circle id and any character id, member or not."""
    camp, _, cid = _setup(client, members=0)
    outsider = support.forge(client)
    assert _vote(client, cid, outsider["id"], "insignia", "Moth").status_code == 200


def test_vote_unknown_type_is_stored_then_500(client):
    """QUIRK: an unknown vote_type is committed, then the response lookup raises KeyError."""
    camp, (a, _), cid = _setup(client)
    with support.server_errors_as_500(client):
        r = _vote(client, cid, a["id"], "colour", "red")
    assert r.status_code == 500
    assert [v.value for v in support.fetch_all(CircleVote, circle_id=cid, vote_type="colour")] == ["red"]


def test_vote_validation(client):
    assert client.post("/circle/vote", json={"circle_id": 1}).status_code == 422


# --- relationships ----------------------------------------------------------

def test_propose_relationship(client):
    camp, (a, b), cid = _setup(client)
    r = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "old feud"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    [rel] = body["relationships"]
    assert rel == {"id": rel["id"], "from_character_id": a["id"], "to_character_id": b["id"],
                   "rel_type": "Rivals", "lore": "old feud", "status": "proposed",
                   "last_actor_id": None}  # unlike the WebSocket version


def test_propose_again_updates_same_row_and_resets_status(client):
    camp, (a, b), cid = _setup(client)
    body = {"circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"], "rel_type": "Rivals"}
    rel_id = client.post("/circle/relationship/propose", json=body).json()["relationships"][0]["id"]
    client.post("/circle/relationship/respond", json={"relationship_id": rel_id, "action": "accept"})
    body["rel_type"] = "Friends"
    rels = client.post("/circle/relationship/propose", json=body).json()["relationships"]
    assert len(rels) == 1
    assert rels[0]["id"] == rel_id
    assert (rels[0]["rel_type"], rels[0]["status"], rels[0]["lore"]) == ("Friends", "proposed", "")


def test_respond_accept_and_counter(client):
    camp, (a, b), cid = _setup(client)
    rel_id = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals"}).json()["relationships"][0]["id"]

    r = client.post("/circle/relationship/respond", json={
        "relationship_id": rel_id, "action": "counter", "counter_type": "Allies", "counter_lore": "truce"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["relationships"][0]["status"] == "countered"
    row = support.fetch(Relationship, rel_id)
    # QUIRK: REST counter keeps the original terms and stores the counter separately;
    # the WebSocket counter rewrites the terms and sets status back to proposed.
    assert (row.rel_type, row.counter_type, row.counter_lore) == ("Rivals", "Allies", "truce")

    r = client.post("/circle/relationship/respond", json={"relationship_id": rel_id, "action": "accept"})
    assert r.json()["relationships"][0]["status"] == "accepted"
    row = support.fetch(Relationship, rel_id)
    assert (row.counter_type, row.counter_lore) == (None, None)


def test_respond_unknown_action_changes_nothing(client):
    camp, (a, b), cid = _setup(client)
    rel_id = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals"}).json()["relationships"][0]["id"]
    r = client.post("/circle/relationship/respond", json={"relationship_id": rel_id, "action": "shrug"})
    assert r.status_code == 200
    assert r.json()["relationships"][0]["status"] == "proposed"


def test_respond_not_found(client):
    r = client.post("/circle/relationship/respond", json={"relationship_id": 987654321, "action": "accept"})
    assert r.status_code == 404
    assert r.json() == {"detail": "Relationship not found"}


# --- finalize roster --------------------------------------------------------

def test_finalize_roster(client):
    camp, (a, b, c), cid = _setup(client, members=3)
    pending = support.pending_member(client, camp)
    _vote(client, cid, a["id"], "name_suggest", "The Lanterns")
    _vote(client, cid, a["id"], "name_vote", "The Moths")
    _vote(client, cid, b["id"], "name_vote", "The Moths")
    _vote(client, cid, c["id"], "name_vote", "The Lanterns")
    _vote(client, cid, a["id"], "ability", "Hunters")
    _vote(client, cid, a["id"], "insignia", "Moth")
    _vote(client, cid, b["id"], "question", "q2")
    support.update(Circle, cid, backstory_answers={"chapter_house": "Old mill", "q1": "yes"})

    r = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == support.CIRCLE_DICT_KEYS
    assert body["id"] == cid
    assert body["name"] == "The Moths"
    assert body["circle_ability"] == "Hunters"
    assert body["insignia"] == "Moth"
    assert body["backstory_answers"] == {"chapter_house": "Old mill", "q1": "yes", "selected_question_key": "q2"}
    assert body["chapter_house_location"] == "Old mill"
    assert body["is_finalized"] is True
    assert (body["stitch"], body["refresh"], body["train"]) == (4, 4, 4)
    # QUIRK: members stay on circle 1, so the campaign circle counts no one.
    assert body["max_capacity"] == 1
    assert support.fetch(Campaign, camp["id"]).roster_finalized is True
    row = support.fetch(Character, pending["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert client.get(f"/campaign/{camp['id']}/roster").json()["roster_finalized"] is True


def test_finalize_name_falls_back_to_suggestions(client):
    camp, (a, b), cid = _setup(client)
    _vote(client, cid, a["id"], "name_suggest", "Ashen Few")
    _vote(client, cid, b["id"], "name_suggest", "Ashen Few")
    _vote(client, cid, b["id"], "name_suggest", "Other")
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}).json()
    assert body["name"] == "Ashen Few"


def test_finalize_without_votes_keeps_defaults(client):
    camp, _, cid = _setup(client, members=1)
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}).json()
    assert body["name"] == "Unnamed Circle"
    assert body["circle_ability"] == ""
    assert body["backstory_answers"] == {}
    assert (body["stitch"], body["refresh"], body["train"]) == (2, 2, 2)


def test_finalize_wrong_circle_falls_back_to_campaign_circle(client):
    camp = support.new_campaign(client)
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": 1}).json()
    circle = support.campaign_circle(camp["id"])
    assert body["id"] == circle.id != 1
    assert support.fetch(Circle, 1).is_finalized in (False, None)


def test_finalize_unknown_campaign(client):
    r = client.post("/campaign/finalize-roster", json={"campaign_id": 987654321, "circle_id": 1})
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    assert client.post("/campaign/finalize-roster", json={"campaign_id": 1}).status_code == 422
