"""/circle/* REST routes (unused by the frontend) and /campaign/finalize-roster."""
import pytest

import main
import support
from sqlalchemy import text
from models import Campaign, Character, Circle, CircleVote, Relationship


def _setup(client, members=2):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp) for _ in range(members)]
    circle_id = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    return camp, chars, circle_id


def _vote(client, circle_id, char_id, vote_type, value, headers=None):
    """Vote as the character's owner unless other headers are given."""
    return client.post("/circle/vote", json={"circle_id": circle_id, "character_id": char_id,
                                             "vote_type": vote_type, "value": value},
                       headers=headers or support.as_owner(char_id))


def _propose(client, body, headers=None):
    """Propose as the owner of from_character_id unless other headers are given."""
    return client.post("/circle/relationship/propose", json=body,
                       headers=headers or support.as_owner(body["from_character_id"]))


def _respond(client, rel_id, to_char_id, **fields):
    """Answer as the owner of the character the proposal was made to."""
    return client.post("/circle/relationship/respond", json={"relationship_id": rel_id, **fields},
                       headers=support.as_owner(to_char_id))


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


def test_name_suggest_merges_case_and_spacing_variants_and_caps_the_length(client):
    camp, (a, b), cid = _setup(client)
    _vote(client, cid, a["id"], "name_suggest", "The Ninth Night")
    _vote(client, cid, b["id"], "name_suggest", "the  ninth night ")
    r = _vote(client, cid, a["id"], "name_suggest", "THE NINTH NIGHT")  # already hers: ignored
    assert sorted(v["character_id"] for v in r.json()["votes"]) == sorted([a["id"], b["id"]])
    assert {v["value"] for v in r.json()["votes"]} == {"The Ninth Night"}
    r = _vote(client, cid, a["id"], "name_suggest", "W" * 5000)
    assert max(len(v["value"]) for v in r.json()["votes"]) == 80


def test_vote_only_for_own_character_in_the_circles_campaign(client):
    """Before tokens votes were accepted for any circle id and any character id."""
    camp, (a, _), cid = _setup(client)
    outsider = support.forge(client)
    other_camp_member = support.active_member(client, support.new_campaign(client))
    # someone else's character, a non-member's own character, a member of another campaign
    assert _vote(client, cid, a["id"], "insignia", "Moth", headers=support.as_owner(outsider["id"])).status_code == 403
    assert _vote(client, cid, outsider["id"], "insignia", "Moth").status_code == 403
    assert _vote(client, cid, other_camp_member["id"], "insignia", "Moth").status_code == 403
    assert _vote(client, cid, a["id"], "insignia", "Moth", headers=support.as_gm(camp)).status_code == 403
    # legacy circle 1 belongs to no campaign
    assert _vote(client, 1, a["id"], "insignia", "Moth").status_code == 403
    assert support.fetch_all(CircleVote, circle_id=cid) == []
    r = _vote(client, 987654321, a["id"], "insignia", "Moth")
    assert (r.status_code, r.json()) == (404, {"detail": "Circle not found"})
    r = _vote(client, cid, 987654321, "insignia", "Moth", headers=support.as_owner(a["id"]))
    assert (r.status_code, r.json()) == (404, {"detail": "Character not found"})
    r = _vote(client, cid, a["id"], "insignia", "Moth")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "votes": [{"character_id": a["id"], "value": "Moth"}]}


def test_vote_unknown_type_is_422_and_not_stored(client):
    """Fixed: an unknown vote_type was committed, then the response lookup raised
    KeyError (500). It is now refused before anything is stored."""
    camp, (a, _), cid = _setup(client)
    r = _vote(client, cid, a["id"], "colour", "red")
    assert r.status_code == 422
    assert r.json() == {"detail": "Unknown vote type."}
    assert support.fetch_all(CircleVote, circle_id=cid, vote_type="colour") == []


def test_vote_validation(client):
    assert client.post("/circle/vote", json={"circle_id": 1}, headers=support.as_stranger()).status_code == 422


# --- relationships ----------------------------------------------------------

def test_propose_relationship(client):
    camp, (a, b), cid = _setup(client)
    r = _propose(client, {
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "old feud"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    [rel] = body["relationships"]
    assert rel == {"id": rel["id"], "from_character_id": a["id"], "to_character_id": b["id"],
                   "rel_type": "Rivals", "lore": "old feud", "status": "proposed",
                   "last_actor_id": a["id"]}  # None before the token fixes


def test_propose_only_for_own_character_with_a_fellow_member(client):
    camp, (a, b), cid = _setup(client)
    outsider = support.active_member(client, support.new_campaign(client))
    body = {"circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"], "rel_type": "Rivals"}
    for headers in (support.as_owner(b["id"]), support.as_gm(camp), support.as_stranger()):
        assert _propose(client, body, headers=headers).status_code == 403
    assert _propose(client, dict(body, to_character_id=outsider["id"])).status_code == 403
    assert _propose(client, dict(body, circle_id=1)).status_code == 403
    assert _propose(client, dict(body, to_character_id=987654321)).status_code == 404
    assert _propose(client, dict(body, circle_id=987654321)).status_code == 404
    assert support.fetch_all(Relationship, circle_id=cid) == []


def test_propose_again_updates_same_row_and_resets_status(client):
    camp, (a, b), cid = _setup(client)
    body = {"circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"], "rel_type": "Rivals"}
    rel_id = _propose(client, body).json()["relationships"][0]["id"]
    _respond(client, rel_id, b["id"], action="accept")
    body["rel_type"] = "Friends"
    rels = _propose(client, body).json()["relationships"]
    assert len(rels) == 1
    assert rels[0]["id"] == rel_id
    assert (rels[0]["rel_type"], rels[0]["status"], rels[0]["lore"]) == ("Friends", "proposed", "")


def test_respond_accept_and_counter(client):
    camp, (a, b), cid = _setup(client)
    rel_id = _propose(client, {
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals"}).json()["relationships"][0]["id"]

    # only the owner of the character the proposal was made to may answer
    for headers in (support.as_owner(a["id"]), support.as_gm(camp)):
        r = client.post("/circle/relationship/respond", json={"relationship_id": rel_id, "action": "accept"},
                        headers=headers)
        assert r.status_code == 403
    r = _respond(client, rel_id, b["id"], action="counter", counter_type="Allies", counter_lore="truce")
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["relationships"][0]["status"] == "countered"
    row = support.fetch(Relationship, rel_id)
    # QUIRK: REST counter keeps the original terms and stores the counter separately;
    # the WebSocket counter rewrites the terms and sets status back to proposed.
    assert (row.rel_type, row.counter_type, row.counter_lore) == ("Rivals", "Allies", "truce")

    # b acted last, so now only a may answer
    assert _respond(client, rel_id, b["id"], action="accept").status_code == 403
    r = _respond(client, rel_id, a["id"], action="accept")
    assert r.json()["relationships"][0]["status"] == "accepted"
    assert r.json()["relationships"][0]["last_actor_id"] == a["id"]
    row = support.fetch(Relationship, rel_id)
    assert (row.counter_type, row.counter_lore) == (None, None)


def test_respond_cannot_accept_ones_own_counter_or_proposal(client):
    """Reviewer probe: REST respond used to check only the to-character's owner and
    ignore last_actor_id, and REST propose did not set it. So b could counter over the
    WebSocket and accept its own counter over REST, and a REST re-proposal left a
    stale actor that let the proposer accept its own proposal over the WebSocket."""
    camp, (a, b), cid = _setup(client)
    body = {"circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"], "rel_type": "Rivals"}
    rel_id = _propose(client, body).json()["relationships"][0]["id"]
    with support.ws_connect(client, b["id"]) as wb:
        wb.send("circle_relationship_respond", relationship_id=rel_id, action="counter",
                counter_type="Nemesis", counter_lore="")
        wb.sync()
    assert _respond(client, rel_id, b["id"], action="accept").status_code == 403
    row = support.fetch(Relationship, rel_id)
    assert (row.status, row.rel_type, row.last_actor_id) == ("proposed", "Nemesis", b["id"])

    _propose(client, body)  # a proposes again over REST, so b is the one to answer
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_relationship_respond", relationship_id=rel_id, action="accept")
        [rejected] = wa.sync()
        assert rejected["type"] == "action_rejected"
    row = support.fetch(Relationship, rel_id)
    assert (row.status, row.rel_type, row.last_actor_id) == ("proposed", "Rivals", a["id"])
    assert _respond(client, rel_id, b["id"], action="accept").status_code == 200


def test_respond_unknown_action_changes_nothing(client):
    camp, (a, b), cid = _setup(client)
    rel_id = _propose(client, {
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals"}).json()["relationships"][0]["id"]
    r = _respond(client, rel_id, b["id"], action="shrug")
    assert r.status_code == 200
    assert r.json()["relationships"][0]["status"] == "proposed"


def test_respond_not_found(client):
    r = client.post("/circle/relationship/respond", json={"relationship_id": 987654321, "action": "accept"},
                    headers=support.as_stranger())
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

    r = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp))
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
    # 1 + 3 members = 4 in each resource (rulebook p. 41, the example on p. 62), counting
    # the campaign's members (they stay on circle 1)
    assert (body["stitch"], body["refresh"], body["train"]) == (4, 4, 4)
    assert body["max_capacity"] == 4
    assert support.fetch(Campaign, camp["id"]).roster_finalized is True
    row = support.fetch(Character, pending["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()["roster_finalized"] is True


def test_a_tie_goes_to_the_option_voted_for_first_whatever_the_row_order(client):
    """The seal took the tie's winner from the votes in whatever order the database
    returned them, and a vote row written again as it was (rows move
    on disk, and a plan change after an ANALYZE reads them another way) moved the winner although no vote changed
    (playtest, vote-tie-leading). The votes are now read in the order they were cast, at
    the seal and on the papers, so a tie goes to the option voted for first."""
    camp, (a, b), cid = _setup(client)
    _vote(client, cid, a["id"], "name_vote", "The Harrow Watch")
    _vote(client, cid, b["id"], "name_vote", "The Ninth Night")
    for kind, first, second in (("ability", "Hunters", "Scholars"), ("insignia", "Moth", "Key")):
        _vote(client, cid, a["id"], kind, first)
        _vote(client, cid, b["id"], kind, second)
    with main.db_engine.begin() as conn:
        # Writes each first vote's row again, as it was, ids and all, which puts it after
        # the second in the table (and in its index)
        rows = conn.execute(text("DELETE FROM circle_votes WHERE circle_id = :c AND character_id = :a "
                                 "RETURNING id, circle_id, character_id, vote_type, value"),
                            {"c": cid, "a": a["id"]}).mappings().all()
        conn.execute(text("INSERT INTO circle_votes (id, circle_id, character_id, vote_type, value) "
                          "VALUES (:id, :circle_id, :character_id, :vote_type, :value)"), [dict(r) for r in rows])
    state = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()
    assert [v["value"] for v in state["votes"]["name_vote"]] == ["The Harrow Watch", "The Ninth Night"]
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid},
                       headers=support.as_gm(camp)).json()
    assert (body["name"], body["circle_ability"], body["insignia"]) == ("The Harrow Watch", "Hunters", "Moth")


def test_finalize_only_by_the_gm(client):
    camp, (a, _), cid = _setup(client)
    for headers in (support.as_owner(a["id"]), support.as_gm(support.new_campaign(client))):
        r = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid},
                        headers=headers)
        assert r.status_code == 403
    assert support.fetch(Campaign, camp["id"]).roster_finalized is False


def test_finalize_name_falls_back_to_suggestions(client):
    camp, (a, b), cid = _setup(client)
    _vote(client, cid, a["id"], "name_suggest", "Ashen Few")
    _vote(client, cid, b["id"], "name_suggest", "Ashen Few")
    _vote(client, cid, b["id"], "name_suggest", "Other")
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["name"] == "Ashen Few"


def test_finalize_without_votes_keeps_defaults(client):
    camp, _, cid = _setup(client, members=1)
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["name"] == "Unnamed Circle"
    assert body["circle_ability"] == ""
    assert body["backstory_answers"] == {}
    assert (body["stitch"], body["refresh"], body["train"]) == (2, 2, 2)


def test_finalize_wrong_circle_falls_back_to_campaign_circle(client):
    camp = support.new_campaign(client)
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": 1}, headers=support.as_gm(camp)).json()
    circle = support.campaign_circle(camp["id"])
    assert body["id"] == circle.id != 1
    assert support.fetch(Circle, 1).is_finalized in (False, None)


def test_finalize_unknown_campaign(client):
    headers = support.as_stranger()
    r = client.post("/campaign/finalize-roster", json={"campaign_id": 987654321, "circle_id": 1}, headers=headers)
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    assert client.post("/campaign/finalize-roster", json={"campaign_id": 1}, headers=headers).status_code == 422


@pytest.mark.parametrize("first,second", [("a", "b"), ("b", "a")])
def test_finalize_tie_goes_to_the_first_vote_cast(client, first, second):
    """QUIRK: _tally_winner keeps the first maximum in the order the votes come back,
    and the vote query has no ORDER BY, so a tie goes to whichever vote was stored
    first (insertion order on a fresh PostgreSQL table)."""
    camp, (a, b), cid = _setup(client)
    chars = {"a": a, "b": b}
    picks = {"a": ("Alpha", "Hunters", "Moth", "q1"), "b": ("Beta", "Seekers", "Owl", "q2")}
    for vote_type, i in (("name_vote", 0), ("ability", 1), ("insignia", 2), ("question", 3)):
        for who in (first, second):
            _vote(client, cid, chars[who]["id"], vote_type, picks[who][i])
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    name, ability, insignia, question = picks[first]
    assert (body["name"], body["circle_ability"], body["insignia"]) == (name, ability, insignia)
    assert body["backstory_answers"] == {"selected_question_key": question}


def test_finalize_keeps_an_existing_chapter_house(client):
    camp, _, cid = _setup(client, members=1)
    support.update(Circle, cid, chapter_house_location="Tower", backstory_answers={"chapter_house": "Mill"})
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["chapter_house_location"] == "Tower"
    assert body["backstory_answers"] == {"chapter_house": "Mill"}
