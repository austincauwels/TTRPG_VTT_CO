"""/campaign/* REST routes: database effects and responses.
The WebSocket broadcasts these routes send are in test_rest_broadcasts.py."""
import pytest

import engine
import main
import support
from models import Campaign, Character, Circle, CircleVote, User


# --- create -----------------------------------------------------------------

def test_create_campaign(client):
    code = f"c-{support.uid()}"
    r = client.post("/campaign/create", params={"name": "The Hollow", "code": code})
    assert r.status_code == 200
    body = r.json()
    # The ORM object is serialized whole, so every column appears.
    assert set(body) == support.CAMPAIGN_COLUMNS
    assert body["name"] == "The Hollow"
    assert body["campaign_code"] == code
    assert body["gm_user_id"] is None
    assert body["roster_finalized"] is False
    assert body["is_retired"] is False
    assert support.fetch(Campaign, body["id"]).campaign_code == code


@pytest.mark.legacy_trust
def test_create_campaign_gm_is_whatever_user_id_says(client):
    u = support.make_user()
    body = support.new_campaign(client, gm_user_id=u.id)
    assert body["gm_user_id"] == u.id


def test_create_campaign_unknown_gm_user_is_500(client):
    """On PostgreSQL the gm_user_id foreign key rejects unknown users (unhandled)."""
    with support.server_errors_as_500(client):
        r = client.post("/campaign/create", params={"name": "x", "code": f"c-{support.uid()}",
                                                     "user_id": 987654321})
    assert r.status_code == 500


@pytest.mark.parametrize("code", ["ab", "x" * 33, "has space", "semi;colon", "dot.ted"])
def test_create_campaign_bad_code(client, code):
    r = client.post("/campaign/create", params={"name": "x", "code": code})
    assert r.status_code == 422
    assert r.json() == {"detail": "Campaign code must be 3\u201332 alphanumeric characters (hyphens/underscores allowed)"}


@pytest.mark.parametrize("name", ["", "n" * 81])
def test_create_campaign_bad_name(client, name):
    r = client.post("/campaign/create", params={"name": name, "code": f"c-{support.uid()}"})
    assert r.status_code == 422
    assert r.json() == {"detail": "Campaign name must be 1\u201380 characters"}


def test_create_campaign_code_checked_before_name(client):
    r = client.post("/campaign/create", params={"name": "", "code": "!"})
    assert r.json()["detail"].startswith("Campaign code must be")


def test_create_campaign_missing_params(client):
    assert client.post("/campaign/create", params={"name": "x"}).status_code == 422
    assert client.post("/campaign/create", params={"code": f"c-{support.uid()}"}).status_code == 422


def test_create_campaign_duplicate_code_is_500(client):
    """QUIRK: duplicate codes are not checked; the unique index raises (unhandled 500)."""
    code = f"c-{support.uid()}"
    support.new_campaign(client, code=code)
    with support.server_errors_as_500(client):
        r = client.post("/campaign/create", params={"name": "again", "code": code})
    assert r.status_code == 500
    assert len(support.fetch_all(Campaign, campaign_code=code)) == 1


def test_create_campaign_numeric_code_allowed(client):
    """QUIRK: all-digit codes pass, and collide with character-id WebSocket channels."""
    code = str(10 ** 11 + int(support.uid(6), 16))
    r = client.post("/campaign/create", params={"name": "Digits", "code": code})
    assert r.status_code == 200
    assert r.json()["campaign_code"] == code


# --- join -------------------------------------------------------------------

def test_join_campaign(client):
    camp = support.new_campaign(client)
    ch = support.forge(client, user_id=support.make_user().id)
    r = support.join(client, ch["id"], camp["campaign_code"], pen_font="Kalam")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"success", "character"}
    assert body["success"] is True
    assert set(body["character"]) == support.CHARACTER_COLUMNS
    assert body["character"]["status"] == "pending"
    assert body["character"]["campaign_id"] == camp["id"]
    assert body["character"]["pen_font"] == "Kalam"
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.pen_font) == ("pending", camp["id"], "Kalam")
    assert row.circle_id == 1  # join never moves the character off circle 1


def test_join_unknown_font_becomes_caveat(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    r = support.join(client, ch["id"], camp["campaign_code"], pen_font="Comic Sans; color:red")
    assert r.status_code == 200
    assert support.fetch(Character, ch["id"]).pen_font == "Caveat"


def test_join_errors(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    r = support.join(client, ch["id"], "!!")
    assert r.status_code == 422
    assert r.json() == {"detail": "Invalid campaign code format"}
    r = support.join(client, ch["id"], f"nope-{support.uid()}")
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign code not found"}
    r = support.join(client, 987654321, camp["campaign_code"])
    assert r.status_code == 404
    assert r.json() == {"detail": "Character not found"}
    assert client.post("/campaign/join", params={"code": camp["campaign_code"]}).status_code == 422


@pytest.mark.legacy_trust
def test_join_moves_an_active_character_out_of_its_campaign(client):
    """QUIRK: join has no status check, so an active member of one campaign becomes
    pending in another (any caller can do this to any character id)."""
    a = support.new_campaign(client)
    b = support.new_campaign(client)
    ch = support.active_member(client, a)
    assert support.join(client, ch["id"], b["campaign_code"]).status_code == 200
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("pending", b["id"])
    assert row.ink_color == engine.INK_COLORS[0]  # keeps the old ink


# --- approve / reject -------------------------------------------------------

def test_approve(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    r = support.approve(client, ch["id"])
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert set(body["character"]) == support.CHARACTER_COLUMNS
    assert body["character"]["status"] == "active"
    assert body["character"]["ink_color"] == engine.INK_COLORS[0]
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.ink_color, row.circle_id) == ("active", engine.INK_COLORS[0], 1)


def test_approve_assigns_ink_colors_in_order_and_wraps(client):
    camp = support.new_campaign(client)
    inks = [support.fetch(Character, support.active_member(client, camp)["id"]).ink_color for _ in range(6)]
    assert inks == engine.INK_COLORS + [engine.INK_COLORS[0]]


def test_approve_retires_dead_predecessor_of_same_user(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id)
    support.update(Character, old["id"], is_dead=True)
    other_user_dead = support.active_member(client, camp, user_id=support.make_user().id)
    support.update(Character, other_user_dead["id"], is_dead=True)
    new = support.pending_member(client, camp, user_id=u.id)
    assert support.approve(client, new["id"]).status_code == 200
    assert support.fetch(Character, old["id"]).status == "retired"
    assert support.fetch(Character, other_user_dead["id"]).status == "active"


def test_approve_not_pending(client):
    ch = support.forge(client)
    for cid in (ch["id"], 987654321):
        r = support.approve(client, cid)
        assert r.status_code == 400
        assert r.json() == {"detail": "Character is not in pending status or does not exist"}


@pytest.mark.legacy_trust
def test_approve_by_anyone(client):
    """Any caller can approve any pending character; there is no GM check."""
    camp = support.new_campaign(client, gm_user_id=support.make_user().id)
    ch = support.pending_member(client, camp)
    r = support.approve(client, ch["id"])
    assert r.status_code == 200
    assert r.json()["character"]["status"] == "active"
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.ink_color) == ("active", camp["id"], engine.INK_COLORS[0])


def test_reject(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    r = client.post(f"/campaign/reject/{ch['id']}")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"success", "character"}
    assert body["success"] is True
    assert set(body["character"]) == support.CHARACTER_COLUMNS
    assert body["character"]["id"] == ch["id"]
    assert body["character"]["status"] == "unaffiliated"
    assert body["character"]["campaign_id"] is None
    assert body["character"]["pen_font"] is None
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.pen_font) == ("unaffiliated", None, None)


def test_reject_not_pending(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    r = client.post(f"/campaign/reject/{ch['id']}")
    assert r.status_code == 400
    assert r.json() == {"detail": "Character is not in pending status or does not exist"}
    assert client.post("/campaign/reject/987654321").status_code == 400


# --- retire -----------------------------------------------------------------

def test_retire_campaign(client):
    camp = support.new_campaign(client)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    rejected = support.pending_member(client, camp)
    client.post(f"/campaign/reject/{rejected['id']}")
    r = client.post(f"/campaign/{camp['id']}/retire")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert support.fetch(Campaign, camp["id"]).is_retired is True
    assert support.fetch(Character, active["id"]).status == "retired"
    assert support.fetch(Character, pending["id"]).status == "retired"
    assert support.fetch(Character, rejected["id"]).status == "unaffiliated"
    # retiring keeps campaign_id on the characters
    assert support.fetch(Character, active["id"]).campaign_id == camp["id"]


def test_retire_unknown_campaign(client):
    r = client.post("/campaign/987654321/retire")
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}


def test_retire_twice_is_ok(client):
    camp = support.new_campaign(client)
    assert client.post(f"/campaign/{camp['id']}/retire").json() == {"ok": True}
    assert client.post(f"/campaign/{camp['id']}/retire").json() == {"ok": True}


# --- rejoin -----------------------------------------------------------------

def test_rejoin_with_invite(client):
    camp = support.new_campaign(client)
    circle_id = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    old = support.active_member(client, camp, user_id=u.id)
    support.update(Character, old["id"], is_dead=True)
    new = support.forge(client, user_id=u.id)
    r = client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"success", "character"}
    assert body["success"] is True
    assert set(body["character"]) == support.CHAR_DICT_KEYS
    assert body["character"]["status"] == "active"
    assert body["character"]["campaign_id"] == camp["id"]
    assert body["character"]["circle_id"] == circle_id
    # QUIRK: the session does not autoflush, so the dead predecessor (being retired in
    # the same request) still counts as an active inked member when the color is picked
    assert body["character"]["ink_color"] == engine.INK_COLORS[1]
    assert support.fetch(Character, old["id"]).status == "retired"
    assert support.fetch(User, u.id).pending_rejoin_campaign_id is None


@pytest.mark.legacy_trust
def test_rejoin_without_invite_skips_gm_approval(client):
    """QUIRK: rejoin needs no invite and no GM; any character joins as active."""
    camp = support.new_campaign(client)
    ch = support.forge(client, user_id=support.make_user().id)
    r = client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": camp["campaign_code"]})
    assert r.status_code == 200
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("active", camp["id"])
    assert row.circle_id == 1  # no campaign circle exists yet, so circle_id is untouched


def test_rejoin_retires_living_active_character_of_same_user(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id)
    new = support.forge(client, user_id=u.id)
    client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]})
    assert support.fetch(Character, old["id"]).status == "retired"


def test_rejoin_errors(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    r = client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": f"no-{support.uid()}"})
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    r = client.post("/campaign/rejoin", json={"character_id": 987654321, "campaign_code": camp["campaign_code"]})
    assert r.status_code == 404
    assert r.json() == {"detail": "Character not found"}
    assert client.post("/campaign/rejoin", json={"character_id": ch["id"]}).status_code == 422


# --- invite-rejoin ----------------------------------------------------------

def test_invite_rejoin(client):
    camp = support.new_campaign(client)
    u = support.make_user(username=f"Invitee_{support.uid()}")
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": f"  {u.username.upper()} "})
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert support.fetch(User, u.id).pending_rejoin_campaign_id == camp["id"]


def test_invite_rejoin_errors(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    r = client.post("/campaign/987654321/invite-rejoin", json={"username": u.username})
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": f"ghost_{support.uid()}"})
    assert r.status_code == 404
    assert r.json() == {"detail": "No player found with that username."}
    assert client.post(f"/campaign/{camp['id']}/invite-rejoin", json={}).status_code == 422


# --- roster -----------------------------------------------------------------

def test_roster(client):
    camp = support.new_campaign(client)
    active = support.active_member(client, camp, role="Muscle", specialty="Soldier",
                                   role_ability="Tenacious")
    pending = support.pending_member(client, camp)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    retired = support.active_member(client, camp)
    support.update(Character, retired["id"], status="retired")
    r = client.get(f"/campaign/{camp['id']}/roster")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"pending_investigators", "active_investigators", "roster_finalized"}
    assert body["roster_finalized"] is False
    assert [c["id"] for c in body["pending_investigators"]] == [pending["id"]]
    assert [c["id"] for c in body["active_investigators"]] == [active["id"]]
    assert body["active_investigators"][0] == {
        "id": active["id"], "name": active["name"], "role_class": "Muscle",
        "role_ability": "Tenacious", "specialty": "Soldier", "specialty_ability": "None",
        "profile_pic": None, "circle_name": "The Order of Light", "status": "active",
        "is_dead": False, "pen_font": "Caveat", "ink_color": engine.INK_COLORS[0],
    }


def test_roster_unknown_campaign(client):
    r = client.get("/campaign/987654321/roster")
    assert r.status_code == 200
    assert r.json() == {"pending_investigators": [], "active_investigators": [], "roster_finalized": False}


# --- circle creation state ----------------------------------------------------

def test_circle_creation_state_creates_circle_once(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    assert support.campaign_circle(camp["id"]) is None
    r = client.get(f"/campaign/{camp['id']}/circle-creation-state")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"circle_id", "is_finalized", "active_investigators", "votes",
                         "relationships", "backstory_answers"}
    circle = support.campaign_circle(camp["id"])
    assert body["circle_id"] == circle.id
    assert circle.name == "Unnamed Circle"
    assert (circle.stitch, circle.refresh, circle.train) == (1, 1, 1)
    assert body["is_finalized"] is False
    assert [c["id"] for c in body["active_investigators"]] == [member["id"]]
    assert set(body["active_investigators"][0]) == support.CHAR_DICT_KEYS
    assert body["votes"] == {"name_suggest": [], "name_vote": [], "ability": [], "question": [], "insignia": []}
    assert body["relationships"] == []
    assert body["backstory_answers"] == {}
    again = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()
    assert again["circle_id"] == circle.id
    assert len(support.fetch_all(Circle, campaign_id=camp["id"])) == 1


def test_circle_creation_state_unknown_campaign_is_500(client):
    """QUIRK: the GET tries to create a circle for any id; on PostgreSQL the foreign
    key rejects an unknown campaign and the error is unhandled."""
    with support.server_errors_as_500(client):
        r = client.get("/campaign/987654321/circle-creation-state")
    assert r.status_code == 500


def test_circle_creation_state_with_content(client):
    """Unlike the roster, dead members stay in active_investigators (they keep status active)."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp)
    b = support.active_member(client, camp)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    retired = support.active_member(client, camp)
    support.update(Character, retired["id"], status="retired")
    pending = support.pending_member(client, camp)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()["circle_id"]

    def vote(char, vote_type, value):
        r = client.post("/circle/vote", json={"circle_id": cid, "character_id": char["id"],
                                              "vote_type": vote_type, "value": value})
        assert r.status_code == 200

    vote(a, "name_suggest", "The Moths")
    vote(b, "name_vote", "The Moths")
    vote(a, "ability", "Hunters")
    vote(b, "question", "q2")
    vote(pending, "insignia", "Owl")  # any character id is accepted
    with main.SessionLocal() as s:  # a stored vote of an unknown type is left out
        s.add(CircleVote(circle_id=cid, character_id=a["id"], vote_type="colour", value="red"))
        s.commit()
    rel = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "feud"}).json()["relationships"][0]
    support.update(Circle, cid, backstory_answers={"chapter_house": "Mill", "reports": {str(a["id"]): {"q0": True}}})

    body = client.get(f"/campaign/{camp['id']}/circle-creation-state").json()
    assert body["circle_id"] == cid
    assert body["is_finalized"] is False
    actives = {c["id"]: c for c in body["active_investigators"]}
    assert set(actives) == {a["id"], b["id"], dead["id"]}
    assert actives[dead["id"]]["is_dead"] is True
    assert all(set(c) == support.CHAR_DICT_KEYS for c in actives.values())
    assert body["votes"] == {
        "name_suggest": [{"character_id": a["id"], "value": "The Moths"}],
        "name_vote": [{"character_id": b["id"], "value": "The Moths"}],
        "ability": [{"character_id": a["id"], "value": "Hunters"}],
        "question": [{"character_id": b["id"], "value": "q2"}],
        "insignia": [{"character_id": pending["id"], "value": "Owl"}],
    }
    assert body["relationships"] == [{
        "id": rel["id"], "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "feud", "status": "proposed", "last_actor_id": None}]
    assert body["backstory_answers"] == {"chapter_house": "Mill", "reports": {str(a["id"]): {"q0": True}}}
