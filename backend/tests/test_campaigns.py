"""/campaign/* REST routes: database effects and responses.
The WebSocket broadcasts these routes send are in test_rest_broadcasts.py."""
import pytest

import engine
import main
import support
from models import Campaign, Character, Circle, CircleVote, User


# --- create -----------------------------------------------------------------

def test_create_campaign(client):
    """The caller becomes the GM; no user_id is needed."""
    u = support.make_user()
    code = f"c-{support.uid()}"
    r = client.post("/campaign/create", params={"name": "The Hollow", "code": code}, headers=support.as_user(u.id))
    assert r.status_code == 200
    body = r.json()
    # The ORM object is serialized whole, so every column appears.
    assert set(body) == support.CAMPAIGN_COLUMNS
    assert body["name"] == "The Hollow"
    assert body["campaign_code"] == code
    assert body["gm_user_id"] == u.id
    assert body["roster_finalized"] is False
    assert body["is_retired"] is False
    assert support.fetch(Campaign, body["id"]).campaign_code == code


def test_codes_match_without_regard_to_case(client):
    camp = support.new_campaign(client, code=f"drowned-{support.uid()}")
    code = camp["campaign_code"]
    # A code that differs only in case is refused on create, as a taken one is.
    r = client.post("/campaign/create", params={"name": "x", "code": code.upper()},
                    headers=support.as_user(support.make_user().id))
    assert r.status_code == 409
    # A join in other capitals finds the campaign.
    ch = support.forge(client)
    r = support.join(client, ch["id"], code.upper())
    assert r.status_code == 200, r.text
    assert support.fetch(Character, ch["id"]).campaign_id == camp["id"]


def test_create_campaign_gm_comes_from_the_token(client):
    """A user_id equal to the caller is accepted and ignored; any other is 403."""
    u = support.make_user()
    body = support.new_campaign(client, gm_user_id=u.id)
    assert body["gm_user_id"] == u.id
    other = support.make_user()
    code = f"c-{support.uid()}"
    r = client.post("/campaign/create", params={"name": "x", "code": code, "user_id": other.id},
                    headers=support.as_user(u.id))
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert support.fetch_all(Campaign, campaign_code=code) == []


def test_create_campaign_unknown_user_id_is_403(client):
    """Before tokens, an unknown user_id reached the foreign key and failed with a 500."""
    r = client.post("/campaign/create", params={"name": "x", "code": f"c-{support.uid()}", "user_id": 987654321},
                    headers=support.as_stranger())
    assert r.status_code == 403


@pytest.mark.parametrize("code", ["ab", "x" * 33, "has space", "semi;colon", "dot.ted"])
def test_create_campaign_bad_code(client, code):
    r = client.post("/campaign/create", params={"name": "x", "code": code}, headers=support.as_stranger())
    assert r.status_code == 422
    assert r.json() == {"detail": "Campaign code must be 3\u201332 alphanumeric characters (hyphens/underscores allowed)"}


@pytest.mark.parametrize("name", ["", "n" * 81])
def test_create_campaign_bad_name(client, name):
    r = client.post("/campaign/create", params={"name": name, "code": f"c-{support.uid()}"},
                    headers=support.as_stranger())
    assert r.status_code == 422
    assert r.json() == {"detail": "Campaign name must be 1\u201380 characters"}


def test_create_campaign_code_checked_before_name(client):
    r = client.post("/campaign/create", params={"name": "", "code": "!"}, headers=support.as_stranger())
    assert r.json()["detail"].startswith("Campaign code must be")


def test_create_campaign_missing_params(client):
    headers = support.as_stranger()
    assert client.post("/campaign/create", params={"name": "x"}, headers=headers).status_code == 422
    assert client.post("/campaign/create", params={"code": f"c-{support.uid()}"}, headers=headers).status_code == 422


def test_create_campaign_duplicate_code_is_409(client):
    """Fixed: duplicate codes were not checked, so the unique index raised (unhandled 500)."""
    code = f"c-{support.uid()}"
    support.new_campaign(client, code=code)
    r = client.post("/campaign/create", params={"name": "again", "code": code}, headers=support.as_stranger())
    assert r.status_code == 409
    assert r.json() == {"detail": "Campaign code is already in use"}
    assert len(support.fetch_all(Campaign, campaign_code=code)) == 1


def test_create_campaign_when_another_request_took_the_code_first(client, monkeypatch):
    """Two requests for one code can both pass the check; the one that loses at the
    unique index gets the same 409."""
    from vtt.routers import campaigns
    code = f"c-{support.uid()}"
    support.new_campaign(client, code=code)
    real = campaigns._code_taken
    calls = []

    def taken_after_the_first_check(db, c):
        calls.append(c)
        return len(calls) > 1 and real(db, c)

    monkeypatch.setattr(campaigns, "_code_taken", taken_after_the_first_check)
    r = client.post("/campaign/create", params={"name": "again", "code": code}, headers=support.as_stranger())
    assert (r.status_code, r.json()) == (409, {"detail": "Campaign code is already in use"})
    assert calls == [code, code]
    assert len(support.fetch_all(Campaign, campaign_code=code)) == 1


@pytest.mark.parametrize("code", ["123", "000123", "-12", "1_000"])
def test_create_campaign_numeric_code_is_422(client, code):
    """QUIRK D13 fixed: all-digit codes used to pass, and /ws/{code} then named both the
    campaign and the character with that id. Codes that read as a number are refused."""
    r = client.post("/campaign/create", params={"name": "Digits", "code": code}, headers=support.as_stranger())
    assert r.status_code == 422
    assert r.json() == {"detail": "Campaign code must not be a number"}
    assert support.fetch_all(Campaign, campaign_code=code) == []


def test_create_campaign_code_with_digits_and_letters_is_fine(client):
    code = f"12{support.uid()}x"
    r = client.post("/campaign/create", params={"name": "Mixed", "code": code}, headers=support.as_stranger())
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
    assert client.post("/campaign/join", params={"code": camp["campaign_code"]},
                       headers=support.as_stranger()).status_code == 422


def test_join_someone_elses_character_is_403(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    for headers in (support.as_stranger(), support.as_gm(camp)):
        r = support.join(client, ch["id"], camp["campaign_code"], headers=headers)
        assert r.status_code == 403
        assert r.json() == {"detail": "Not allowed."}
    assert support.fetch(Character, ch["id"]).status == "unaffiliated"


def test_join_refuses_a_character_on_a_roster(client):
    """Join used to have no status check, so an active member of one campaign (or one
    waiting for a Lightkeeper) became pending in another when its owner joined it
    elsewhere, leaving its campaign without a word. Now that is 409, after the
    ownership check (another user still gets 403), and the character stays put."""
    a = support.new_campaign(client)
    b = support.new_campaign(client)
    active = support.active_member(client, a)
    pending = support.pending_member(client, a)
    dead = support.active_member(client, a)
    support.update(Character, dead["id"], is_dead=True)  # dead stays active until replaced
    assert support.join(client, active["id"], b["campaign_code"], headers=support.as_stranger()).status_code == 403
    for ch, detail in ((active, "This investigator is already in a campaign."),
                       (dead, "This investigator is already in a campaign."),
                       (pending, "This investigator is already waiting to join a campaign.")):
        r = support.join(client, ch["id"], b["campaign_code"])
        assert (r.status_code, r.json()) == (409, {"detail": detail})
    for ch, status in ((active, "active"), (dead, "active"), (pending, "pending")):
        row = support.fetch(Character, ch["id"])
        assert (row.status, row.campaign_id) == (status, a["id"])
    # rejected, it is free again and may join elsewhere
    assert support.reject(client, pending["id"]).status_code == 200
    assert support.join(client, pending["id"], b["campaign_code"]).status_code == 200
    row = support.fetch(Character, pending["id"])
    assert (row.status, row.campaign_id) == ("pending", b["id"])


def test_a_join_retried_after_it_went_through_answers_the_same(client):
    """The creator's save-and-join retries a join whose answer was lost. Once join
    refused pending characters, that retry got 409 "already waiting to join a campaign"
    every time. A character already pending in the same campaign now gets the first
    join's answer again, and nothing changes or is broadcast. Another campaign is still
    409, and someone else's character still 403."""
    camp = support.new_campaign(client)
    other = support.new_campaign(client)
    ch = support.forge(client)
    first = support.join(client, ch["id"], camp["campaign_code"], pen_font="Kalam")
    assert first.status_code == 200, first.text
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        again = support.join(client, ch["id"], camp["campaign_code"], pen_font="Kalam")
        assert again.status_code == 200, again.text
        assert again.json() == first.json()
        assert gm.drain() == []
    r = support.join(client, ch["id"], other["campaign_code"])
    assert (r.status_code, r.json()) == (409, {"detail": "This investigator is already waiting to join a campaign."})
    r = support.join(client, ch["id"], camp["campaign_code"], headers=support.as_stranger())
    assert (r.status_code, r.json()) == (403, {"detail": "Not allowed."})
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.pen_font) == ("pending", camp["id"], "Kalam")
    # once approved it is in the campaign, and a join is 409 there too
    assert support.approve(client, ch["id"]).status_code == 200
    r = support.join(client, ch["id"], camp["campaign_code"])
    assert (r.status_code, r.json()) == (409, {"detail": "This investigator is already in a campaign."})


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
    """The GM approving an active member gets 400. A character with no campaign has no
    GM (403), and an unknown id is 404 (before tokens both were 400)."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    r = support.approve(client, member["id"])
    assert r.status_code == 400
    assert r.json() == {"detail": "Character is not in pending status or does not exist"}
    loner = support.forge(client)
    assert support.approve(client, loner["id"]).status_code == 403
    r = support.approve(client, 987654321)
    assert r.status_code == 404
    assert r.json() == {"detail": "Character not found"}


def test_approve_only_by_the_campaigns_gm(client):
    """Before tokens any caller could approve any pending character."""
    camp = support.new_campaign(client, gm_user_id=support.make_user().id)
    other_camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    member = support.active_member(client, camp)
    for headers in (support.as_owner(ch["id"]), support.as_owner(member["id"]), support.as_gm(other_camp),
                    support.as_stranger()):
        r = support.approve(client, ch["id"], headers=headers)
        assert r.status_code == 403
        assert r.json() == {"detail": "Not allowed."}
    assert support.fetch(Character, ch["id"]).status == "pending"
    r = support.approve(client, ch["id"], headers=support.as_gm(camp))
    assert r.status_code == 200
    assert r.json()["character"]["status"] == "active"
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.ink_color) == ("active", camp["id"], engine.INK_COLORS[1])


def test_reject_only_by_the_campaigns_gm(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    for headers in (support.as_owner(ch["id"]), support.as_gm(support.new_campaign(client))):
        assert support.reject(client, ch["id"], headers=headers).status_code == 403
    assert support.fetch(Character, ch["id"]).status == "pending"


def test_reject(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    r = support.reject(client, ch["id"])
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"success", "character"}
    assert body["success"] is True
    assert set(body["character"]) == support.CHARACTER_COLUMNS
    assert body["character"]["id"] == ch["id"]
    assert body["character"]["status"] == "unaffiliated"
    assert body["character"]["campaign_id"] is None
    # The pen the player picked stays with the character, so asking again keeps it.
    assert body["character"]["pen_font"] == "Caveat"
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.pen_font) == ("unaffiliated", None, "Caveat")


def test_reject_keeps_the_pen(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    assert support.join(client, ch["id"], camp["campaign_code"], pen_font="Homemade Apple").status_code == 200
    assert support.reject(client, ch["id"]).status_code == 200
    assert support.fetch(Character, ch["id"]).pen_font == "Homemade Apple"


def test_reject_not_pending(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    r = support.reject(client, ch["id"])
    assert r.status_code == 400
    assert r.json() == {"detail": "Character is not in pending status or does not exist"}
    assert support.reject(client, 987654321).status_code == 404


# --- retire -----------------------------------------------------------------

def test_retire_campaign(client):
    camp = support.new_campaign(client)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    rejected = support.pending_member(client, camp)
    support.reject(client, rejected["id"])
    for headers in (support.as_owner(active["id"]), support.as_stranger()):
        assert client.post(f"/campaign/{camp['id']}/retire", headers=headers).status_code == 403
    assert support.fetch(Campaign, camp["id"]).is_retired is False
    r = client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp))
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert support.fetch(Campaign, camp["id"]).is_retired is True
    # living investigators go back to their players, free for another campaign
    for living in (active, pending):
        row = support.fetch(Character, living["id"])
        assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert support.fetch(Character, rejected["id"]).status == "unaffiliated"


def test_retire_ends_the_assignment_of_the_investigators_it_lets_go(client):
    """A released investigator kept the retired campaign's spends, ability uses, Train
    dice and gear, and started another campaign with "both of your two" spent (final
    check of playtest 2). Retiring ends their assignment as End Assignment does; a dead
    one, which stays with the campaign as its record, keeps what it had."""
    camp = support.new_campaign(client)
    used = dict(resources_spent_assignment=2, ability_uses={"Tactician": 1}, train_bonus=True, train_dice=1,
                gear=["Lantern"])
    living = support.active_member(client, camp)
    dead = support.active_member(client, camp)
    support.update(Character, living["id"], **used)
    support.update(Character, dead["id"], is_dead=True, **used)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp)).status_code == 200
    row = support.fetch(Character, living["id"])
    assert (row.resources_spent_assignment, row.ability_uses, row.train_bonus, row.train_dice, row.gear) == (
        0, {}, False, 0, [])
    row = support.fetch(Character, dead["id"])
    assert (row.resources_spent_assignment, row.gear) == (2, ["Lantern"])


def test_retire_keeps_the_dead_with_the_campaign(client):
    camp = support.new_campaign(client)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp)).status_code == 200
    row = support.fetch(Character, dead["id"])
    assert (row.status, row.campaign_id) == ("retired", camp["id"])


def test_retire_unknown_campaign(client):
    r = client.post("/campaign/987654321/retire", headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}


def test_retire_twice_is_ok(client):
    camp = support.new_campaign(client)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp)).json() == {"ok": True}
    assert client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp)).json() == {"ok": True}


# --- unretire (the ledger's Retired list, Restore) --------------------------

def _ledger(client, gm_user_id):
    headers = support.as_user(gm_user_id)
    running = [c["id"] for c in client.get(f"/api/users/{gm_user_id}/campaigns", headers=headers).json()]
    retired = [c["id"] for c in client.get(f"/api/users/{gm_user_id}/retired-campaigns", headers=headers).json()]
    return running, retired


def test_unretire_brings_the_campaign_back_with_its_dead(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    living = support.active_member(client, camp)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    assert _ledger(client, gm_user.id) == ([], [camp["id"]])

    # only its Lightkeeper: not a player it let go, not a dead investigator's player, not a stranger
    for headers in (support.as_owner(living["id"]), support.as_owner(dead["id"]), support.as_stranger()):
        r = client.post(f"/campaign/{camp['id']}/unretire", headers=headers)
        assert r.status_code == 403
    assert client.post(f"/campaign/{camp['id']}/unretire", json={}).status_code == 401
    assert support.fetch(Campaign, camp["id"]).is_retired is True

    r = client.post(f"/campaign/{camp['id']}/unretire", headers=gm)
    assert r.status_code == 200
    assert r.json() == {"ok": True, "id": camp["id"], "name": camp["name"], "campaign_code": camp["campaign_code"]}
    assert support.fetch(Campaign, camp["id"]).is_retired is False
    assert _ledger(client, gm_user.id) == ([camp["id"]], [])
    # the dead come back with it, as Fallen cards on the Lightkeeper's desk
    row = support.fetch(Character, dead["id"])
    assert (row.status, row.campaign_id) == ("retired", camp["id"])
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=gm).json()
    assert [c["id"] for c in roster["fallen_investigators"]] == [dead["id"]]
    assert roster["active_investigators"] == [] and roster["pending_investigators"] == []
    # the living one the retire let go stays its player's own
    row = support.fetch(Character, living["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    # it takes members again, and the player can ask to come back
    assert support.join(client, living["id"], camp["campaign_code"]).status_code == 200
    assert support.fetch(Character, living["id"]).status == "pending"
    # retrying is safe and changes nothing
    assert client.post(f"/campaign/{camp['id']}/unretire", headers=gm).status_code == 200
    assert support.fetch(Character, living["id"]).status == "pending"


def test_unretire_leaves_a_freed_investigator_where_it_went(client):
    """A living investigator the retire let go may be in another campaign by the time the
    Lightkeeper restores the old one. It stays there: restore puts nobody back."""
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    moved = support.active_member(client, camp)
    waiting = support.active_member(client, camp)
    free = support.active_member(client, camp)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    elsewhere = support.new_campaign(client)
    assert support.join(client, moved["id"], elsewhere["campaign_code"]).status_code == 200
    assert support.approve(client, moved["id"]).status_code == 200
    assert support.join(client, waiting["id"], elsewhere["campaign_code"]).status_code == 200
    before = {c: (support.fetch(Character, c).status, support.fetch(Character, c).ink_color)
              for c in (moved["id"], waiting["id"])}

    assert client.post(f"/campaign/{camp['id']}/unretire", headers=gm).status_code == 200
    for c, (status, ink) in before.items():
        row = support.fetch(Character, c)
        assert (row.status, row.campaign_id, row.ink_color) == (status, elsewhere["id"], ink)
    row = support.fetch(Character, free["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=gm).json()
    assert roster["active_investigators"] == [] and roster["pending_investigators"] == []


def test_unretire_tells_the_lightkeepers_desks_and_logs_a_line(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    other_camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    freed = support.active_member(client, camp)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    elsewhere = support.new_campaign(client)
    assert support.join(client, freed["id"], elsewhere["campaign_code"]).status_code == 200
    assert support.approve(client, freed["id"]).status_code == 200
    support.forget_approval_lines()
    with support.ws_connect(client, other_camp["campaign_code"]) as lk, \
            support.ws_connect(client, freed["id"]) as f:
        lk.sync()
        f.sync()
        assert client.post(f"/campaign/{camp['id']}/unretire", headers=gm).status_code == 200
        told = {"type": "campaign_restored", "payload": {
            "campaign_id": camp["id"], "campaign_code": camp["campaign_code"], "campaign_name": camp["name"],
            "restored_character_ids": []}}
        # the Lightkeeper on the desk of another of their campaigns reads the ledger again
        assert lk.recv() == told
        # the investigator it once let go is in another campaign and hears nothing
        assert f.drain() == []
        # a second restore of a campaign that is running sends nothing
        assert client.post(f"/campaign/{camp['id']}/unretire", headers=gm).status_code == 200
        assert lk.drain() == []
    # the campaign's Activity Log has the line when its desk opens again
    with support.ws_connect(client, camp["campaign_code"]) as desk:
        entries = desk.recv_type("activity_history")["payload"]["entries"]
    assert [e["message"] for e in entries] == [f"The Lightkeeper brought {camp['name']} back from retirement."]


def test_unretire_unknown_campaign(client):
    r = client.post("/campaign/987654321/unretire", headers=support.as_stranger())
    assert (r.status_code, r.json()) == (404, {"detail": "Campaign not found"})


def test_retired_campaigns_are_the_users_own(client):
    u = support.make_user()
    live = support.new_campaign(client, gm_user_id=u.id)
    older = support.new_campaign(client, gm_user_id=u.id)
    newer = support.new_campaign(client, gm_user_id=u.id)
    for c in (older, newer):
        assert client.post(f"/campaign/{c['id']}/retire", headers=support.as_user(u.id)).status_code == 200
    theirs = support.new_campaign(client)
    client.post(f"/campaign/{theirs['id']}/retire", headers=support.as_gm(theirs))
    r = client.get(f"/api/users/{u.id}/retired-campaigns", headers=support.as_user(u.id))
    assert r.status_code == 200
    # newest first, the running one and someone else's left out
    assert [c["id"] for c in r.json()] == [newer["id"], older["id"]]
    assert r.json()[0] == {"id": newer["id"], "name": newer["name"], "campaign_code": newer["campaign_code"],
                           "investigator_count": 0, "pending_count": 0}
    assert live["id"] not in [c["id"] for c in r.json()]
    assert client.get(f"/api/users/{u.id}/retired-campaigns", headers=support.as_stranger()).status_code == 403


# --- rejoin -----------------------------------------------------------------

def test_rejoin_with_invite(client):
    camp = support.new_campaign(client)
    circle_id = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    old = support.active_member(client, camp, user_id=u.id)
    support.update(Character, old["id"], is_dead=True)
    new = support.forge(client, user_id=u.id)
    r = client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(u.id))
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


def test_rejoin_needs_an_invite_or_a_dead_character(client):
    """Before tokens rejoin needed no invite at all. It still skips GM approval, so it
    is now only open to an invited user or one whose character in the campaign died,
    and only for the caller's own character."""
    camp = support.new_campaign(client)
    u = support.make_user()
    ch = support.forge(client, user_id=u.id)
    body = {"character_id": ch["id"], "campaign_code": camp["campaign_code"]}
    r = client.post("/campaign/rejoin", json=body, headers=support.as_user(u.id))
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert support.fetch(Character, ch["id"]).status == "unaffiliated"
    support.update(User, u.id, pending_rejoin_campaign_id=camp["id"])
    assert client.post("/campaign/rejoin", json=body, headers=support.as_stranger()).status_code == 403
    r = client.post("/campaign/rejoin", json=body, headers=support.as_user(u.id))
    assert r.status_code == 200
    row = support.fetch(Character, ch["id"])
    # QUIRK: still no GM approval step; the character joins as active
    assert (row.status, row.campaign_id) == ("active", camp["id"])
    assert row.circle_id == 1  # no campaign circle exists yet, so circle_id is untouched


def test_rejoin_after_a_death_needs_no_invite(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id)
    support.update(Character, old["id"], is_dead=True)
    new = support.forge(client, user_id=u.id)
    r = client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(u.id))
    assert r.status_code == 200
    assert support.fetch(Character, new["id"]).status == "active"


def test_rejoin_after_a_death_needs_an_approved_character(client):
    """Rejoin skips GM approval. The death path used to count any dead character of the
    user tagged with the campaign, so anyone with the campaign code could join it
    (pending), kill that character with four scars on its own socket, and rejoin with
    another character as an active member the GM never approved. Now only an approved
    character that died and is still on the roster (status active) counts, so a death
    opens the path once: the rejoin retires the dead character."""
    camp = support.new_campaign(client)
    u = support.make_user()
    bait = support.pending_member(client, camp, user_id=u.id)
    with support.ws_connect(client, bait["id"]) as ws:
        for n in range(4):
            ws.send("apply_scar", scar_text=f"scar {n}", shift_down="move", shift_up="sense")
        ws.sync()
    assert support.fetch(Character, bait["id"]).is_dead is True
    sneak = support.forge(client, user_id=u.id)
    body = {"character_id": sneak["id"], "campaign_code": camp["campaign_code"]}
    r = client.post("/campaign/rejoin", json=body, headers=support.as_user(u.id))
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    row = support.fetch(Character, sneak["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert support.fetch(Character, bait["id"]).status == "pending"

    # An approved character that died opens the path, once.
    v = support.make_user()
    fallen = support.active_member(client, camp, user_id=v.id)
    support.update(Character, fallen["id"], is_dead=True)
    heir = support.forge(client, user_id=v.id)
    r = client.post("/campaign/rejoin", json={"character_id": heir["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(v.id))
    assert r.status_code == 200
    assert support.fetch(Character, fallen["id"]).status == "retired"
    support.update(Character, heir["id"], campaign_id=None, status="unaffiliated")  # the heir leaves again
    another = support.forge(client, user_id=v.id)
    r = client.post("/campaign/rejoin", json={"character_id": another["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(v.id))
    assert r.status_code == 403
    assert support.fetch(Character, another["id"]).status == "unaffiliated"


def test_rejoin_retires_living_active_character_of_same_user(client):
    camp = support.new_campaign(client)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    old = support.active_member(client, camp, user_id=u.id)
    new = support.forge(client, user_id=u.id)
    client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]},
                headers=support.as_user(u.id))
    assert support.fetch(Character, old["id"]).status == "retired"


def test_rejoin_errors(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    owner = support.as_owner(ch["id"])
    r = client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": f"no-{support.uid()}"},
                    headers=owner)
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    r = client.post("/campaign/rejoin", json={"character_id": 987654321, "campaign_code": camp["campaign_code"]},
                    headers=owner)
    assert r.status_code == 404
    assert r.json() == {"detail": "Character not found"}
    assert client.post("/campaign/rejoin", json={"character_id": ch["id"]}, headers=owner).status_code == 422


IN_A_CAMPAIGN = {"detail": "This investigator is already in a campaign."}
WAITING = {"detail": "This investigator is already waiting to join a campaign."}


def test_rejoin_refuses_a_character_on_a_roster(client):
    """Rejoin had no status check, so a direct API call moved an active character (one
    an undo had just put back included) or a pending one out of its campaign and into
    this one as active. It now refuses them as join does: 409, after the caller's own
    checks, and nothing changes."""
    camp = support.new_campaign(client)
    elsewhere = support.new_campaign(client)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])

    def rejoin(ch, headers=None):
        return client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": camp["campaign_code"]},
                           headers=headers or support.as_user(u.id))

    active = support.active_member(client, elsewhere, user_id=u.id)
    pending = support.pending_member(client, elsewhere, user_id=u.id)
    waiting_here = support.pending_member(client, camp, user_id=u.id)
    for ch, refused in ((active, IN_A_CAMPAIGN), (pending, WAITING), (waiting_here, WAITING)):
        assert rejoin(ch, headers=support.as_stranger()).status_code == 403
        r = rejoin(ch)
        assert (r.status_code, r.json()) == (409, refused)
    for ch, status, campaign in ((active, "active", elsewhere), (pending, "pending", elsewhere),
                                 (waiting_here, "pending", camp)):
        row = support.fetch(Character, ch["id"])
        assert (row.status, row.campaign_id) == (status, campaign["id"])
    assert support.fetch(User, u.id).pending_rejoin_campaign_id == camp["id"]

    # a character the Lightkeeper's undo has just put back in its campaign
    restored_camp = support.new_campaign(client)
    restored = support.active_member(client, restored_camp, user_id=u.id)
    gm = support.as_gm(restored_camp)
    assert client.delete(f"/campaign/{restored_camp['id']}", headers=gm).status_code == 200
    assert client.post(f"/campaign/{restored_camp['id']}/restore", headers=gm).status_code == 200
    r = rejoin(restored)
    assert (r.status_code, r.json()) == (409, IN_A_CAMPAIGN)
    row = support.fetch(Character, restored["id"])
    assert (row.status, row.campaign_id) == ("active", restored_camp["id"])

    # a dead character opens the way back, but is not itself the one that comes back
    v = support.make_user()
    fallen = support.active_member(client, camp, user_id=v.id)
    support.update(Character, fallen["id"], is_dead=True)
    r = rejoin(fallen, headers=support.as_user(v.id))
    assert (r.status_code, r.json()) == (409, IN_A_CAMPAIGN)
    heir = support.forge(client, user_id=v.id)
    assert rejoin(heir, headers=support.as_user(v.id)).status_code == 200
    assert support.fetch(Character, fallen["id"]).status == "retired"


def test_a_rejoin_retried_after_it_went_through_answers_the_same(client):
    """A rejoin whose answer was lost had already made the character active and used up
    the invite, so a retry got 403 and the creator showed an error for a rejoin that had
    worked. A living active member of this campaign now gets the same answer again, and
    nothing changes or is broadcast. Someone else's character is still 403."""
    camp = support.new_campaign(client)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    ch = support.forge(client, user_id=u.id)
    body = {"character_id": ch["id"], "campaign_code": camp["campaign_code"]}
    first = client.post("/campaign/rejoin", json=body, headers=support.as_user(u.id))
    assert first.status_code == 200, first.text
    assert support.fetch(User, u.id).pending_rejoin_campaign_id is None
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        again = client.post("/campaign/rejoin", json=body, headers=support.as_user(u.id))
        assert again.status_code == 200, again.text
        assert again.json() == first.json()
        # only the history of the first rejoin's log line, replayed on connecting
        assert support.types(gm.drain()) == ["activity_history"]
    assert client.post("/campaign/rejoin", json=body, headers=support.as_stranger()).status_code == 403
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.ink_color) == ("active", camp["id"], first.json()["character"]["ink_color"])


def test_a_retired_campaign_takes_no_new_members(client):
    """A retired campaign used to take joins (the character waited as pending in a
    campaign nobody runs any more), rejoins (an invite sent before the retirement
    still made the character active in it) and new invites. All three are 409 now,
    after the caller's own checks."""
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    retired = {"detail": "This campaign has been retired."}

    ch = support.forge(client, user_id=u.id)
    r = support.join(client, ch["id"], camp["campaign_code"])
    assert (r.status_code, r.json()) == (409, retired)
    r = client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(u.id))
    assert (r.status_code, r.json()) == (409, retired)
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert support.fetch(User, u.id).pending_rejoin_campaign_id == camp["id"]

    other = support.make_user()
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": other.username}, headers=gm)
    assert (r.status_code, r.json()) == (409, retired)
    assert support.fetch(User, other.id).pending_rejoin_campaign_id is None

    # Callers the campaign would refuse anyway still get 403: their checks come first.
    outsider = support.forge(client)
    body = {"character_id": outsider["id"], "campaign_code": camp["campaign_code"]}
    assert client.post("/campaign/rejoin", json=body, headers=support.as_owner(outsider["id"])).status_code == 403
    assert client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": other.username},
                       headers=support.as_stranger()).status_code == 403


# --- withdraw ---------------------------------------------------------------

def test_withdraw_takes_back_a_waiting_request(client):
    camp = support.new_campaign(client)
    mine = support.pending_member(client, camp)
    other = support.pending_member(client, camp)
    assert client.post(f"/campaign/withdraw/{mine['id']}", headers=support.as_stranger()).status_code == 403
    assert client.post(f"/campaign/withdraw/{mine['id']}", headers=support.as_gm(camp)).status_code == 403
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        r = client.post(f"/campaign/withdraw/{mine['id']}", headers=support.as_owner(mine["id"]))
        assert (r.status_code, r.json()) == (200, {"ok": True})
        [msg] = gm.drain()
    assert msg["type"] == "investigator_rejected" and msg["payload"]["character_id"] == mine["id"]
    assert [c["id"] for c in msg["payload"]["pending_investigators"]] == [other["id"]]
    row = support.fetch(Character, mine["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert support.fetch(Character, other["id"]).status == "pending"
    # nothing left to withdraw
    r = client.post(f"/campaign/withdraw/{mine['id']}", headers=support.as_owner(mine["id"]))
    assert (r.status_code, r.json()) == (409, {"detail": "This request is no longer waiting."})


def test_withdraw_refuses_an_active_member(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    r = client.post(f"/campaign/withdraw/{member['id']}", headers=support.as_owner(member["id"]))
    assert r.status_code == 409
    assert support.fetch(Character, member["id"]).status == "active"
    assert client.post("/campaign/withdraw/987654321", headers=support.as_stranger()).status_code == 404


# --- invite-rejoin ----------------------------------------------------------

def test_invite_rejoin(client):
    camp = support.new_campaign(client)
    u = support.make_user(username=f"Invitee_{support.uid()}")
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": f"  {u.username.upper()} "},
                    headers=support.as_gm(camp))
    assert r.status_code == 200
    assert r.json() == {"ok": True, "current_investigator": None}
    assert support.fetch(User, u.id).pending_rejoin_campaign_id == camp["id"]


def test_invite_rejoin_names_the_living_investigator_and_logs(client):
    """Accepting retires the player's investigator, so the invite says whom, and the table
    gets a log line. The line names the player's seat, "<investigator>'s player": it read
    "invited <name> back", which after a death named the dead investigator, as if they
    were coming back (final check of playtest 2, invite-silently-retires-living-investigator)."""
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": u.username},
                        headers=support.as_gm(camp))
        logs = [m for m in gm.drain() if m["type"] == "activity_log"]
    assert r.json() == {"ok": True, "current_investigator": old["name"]}
    assert [m["payload"]["message"] for m in logs] == [f"The Lightkeeper invited {old['name']}'s player back."]
    assert u.username not in logs[0]["payload"]["message"]
    support.update(Character, old["id"], is_dead=True)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": u.username},
                        headers=support.as_gm(camp))
        logs = [m for m in gm.drain() if m["type"] == "activity_log"]
    assert r.json() == {"ok": True, "current_investigator": None}
    assert [m["payload"]["message"] for m in logs] == [f"The Lightkeeper invited {old['name']}'s player back."]


def test_rejoin_keeps_the_players_spends_and_logs_the_arrival(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id)
    support.update(Character, old["id"], is_dead=True, resources_spent_assignment=1)
    new = support.forge(client, user_id=u.id)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        r = client.post("/campaign/rejoin", json={"character_id": new["id"], "campaign_code": camp["campaign_code"]},
                        headers=support.as_user(u.id))
        logs = [m["payload"]["message"] for m in gm.drain() if m["type"] == "activity_log"]
    assert r.status_code == 200
    assert support.fetch(Character, new["id"]).resources_spent_assignment == 1
    assert logs == [f"{new['name']} joined the circle, in place of {old['name']}."]


def test_roster_names_the_player_of_each_request(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    first = support.pending_member(client, camp, user_id=u.id)
    second = support.pending_member(client, camp, user_id=u.id)
    body = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [(c["id"], c["owner_username"]) for c in body["pending_investigators"]] == [
        (first["id"], u.username), (second["id"], u.username)]
    # a member of the campaign does not get the players' login names
    member = support.active_member(client, camp)
    seen = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_owner(member["id"])).json()
    assert {c["owner_username"] for c in seen["pending_investigators"] + seen["active_investigators"]} == {""}


def test_invite_rejoin_case_variants(client):
    """The username was matched ignoring case with .first() and no order. With "mira"
    and "Mira" both registered, the invite (which lets its holder rejoin without GM
    approval) could land on the other user, whichever row the database returned
    first. An exact match now wins; a name that matches only ignoring case must match
    one user, otherwise the answer is 409 and nobody is invited."""
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    base = f"mira_{support.uid()}"
    first = support.make_user(username=base)
    second = support.make_user(username=base.capitalize())
    url = f"/campaign/{camp['id']}/invite-rejoin"

    r = client.post(url, json={"username": second.username}, headers=gm)
    assert r.status_code == 200
    assert support.fetch(User, second.id).pending_rejoin_campaign_id == camp["id"]
    assert support.fetch(User, first.id).pending_rejoin_campaign_id is None
    support.update(User, second.id, pending_rejoin_campaign_id=None)

    r = client.post(url, json={"username": f" {base} "}, headers=gm)
    assert r.status_code == 200
    assert support.fetch(User, first.id).pending_rejoin_campaign_id == camp["id"]
    assert support.fetch(User, second.id).pending_rejoin_campaign_id is None
    support.update(User, first.id, pending_rejoin_campaign_id=None)

    r = client.post(url, json={"username": base.upper()}, headers=gm)
    assert r.status_code == 409
    assert r.json() == {"detail": "More than one player has that username. Please type it exactly, "
                                  "with the same capital letters."}
    assert support.fetch(User, first.id).pending_rejoin_campaign_id is None
    assert support.fetch(User, second.id).pending_rejoin_campaign_id is None


def test_invite_rejoin_only_by_the_gm(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    u = support.make_user()
    for headers in (support.as_owner(member["id"]), support.as_user(u.id), support.as_stranger()):
        r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": u.username}, headers=headers)
        assert r.status_code == 403
    assert support.fetch(User, u.id).pending_rejoin_campaign_id is None


def test_invite_rejoin_errors(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    gm = support.as_gm(camp)
    r = client.post("/campaign/987654321/invite-rejoin", json={"username": u.username}, headers=gm)
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": f"ghost_{support.uid()}"}, headers=gm)
    assert r.status_code == 404
    assert r.json() == {"detail": "No player found with that username."}
    assert client.post(f"/campaign/{camp['id']}/invite-rejoin", json={}, headers=gm).status_code == 422


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
    support.update(Character, active["id"], pronouns="she/her", catalyst="Lost a brother\nto the fog")
    r = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp))
    assert r.status_code == 200
    body = r.json()
    # an active member sees the GM's roster; a pending character waits for approval
    # and a retired one no longer belongs
    # (without the players' login names, which are the Lightkeeper's to read)
    member_view = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_owner(active["id"])).json()
    assert all(c.pop("owner_username") for c in body["pending_investigators"] + body["active_investigators"])
    assert {c.pop("owner_username") for c in member_view["pending_investigators"] + member_view["active_investigators"]} == {""}
    # The marks, picks and owed scar are the Lightkeeper's read alone
    ours = ("body_marks", "brain_marks", "bleed_marks", "advancement_picks", "scar_pending")
    assert all(not any(c[k] for k in ours) for c in member_view["active_investigators"])
    for c in body["pending_investigators"] + body["active_investigators"]:
        for k in ours:
            c.pop(k)
    for c in member_view["pending_investigators"] + member_view["active_investigators"]:
        for k in ours:
            c.pop(k)
    assert member_view == body
    body = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    for outsider in (support.as_owner(pending["id"]), support.as_owner(retired["id"]), support.as_stranger()):
        assert client.get(f"/campaign/{camp['id']}/roster", headers=outsider).status_code == 403
    assert set(body) == {"pending_investigators", "active_investigators", "fallen_investigators", "roster_finalized"}
    assert body["roster_finalized"] is False
    assert [c["id"] for c in body["pending_investigators"]] == [pending["id"]]
    # A dead investigator stays active until replaced, and is listed with is_dead (the desk
    # shows them apart and counts only the living)
    # in a fixed order (by id), so the cards do not shuffle between visits
    assert [(c["id"], c["is_dead"]) for c in body["active_investigators"]] == \
        [(active["id"], False), (dead["id"], True)]
    body["active_investigators"] = [c for c in body["active_investigators"] if c["id"] == active["id"]]
    assert body["active_investigators"][0] == {
        "id": active["id"], "name": active["name"], "role_class": "Muscle",
        "role_ability": "Tenacious", "specialty": "Soldier", "specialty_ability": "None",
        "profile_pic": None, "circle_name": "The Order of Light", "status": "active",
        "is_dead": False, "pen_font": "Caveat", "ink_color": engine.INK_COLORS[0],
        "pronouns": "she/her", "catalyst": "Lost a brother\nto the fog",
        "owner_username": support.fetch(User, support.fetch(Character, active["id"]).user_id).username,
        # The Lightkeeper's read also tells how the investigator stands
        "incapacitated": False, "scars_count": 0, "body_marks": 0, "brain_marks": 0,
        "bleed_marks": 0, "advancement_picks": 0, "scar_pending": False,
    }


def test_roster_unknown_campaign(client):
    """Before tokens an unknown campaign answered 200 with an empty roster."""
    r = client.get("/campaign/987654321/roster", headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}


# --- circle creation state ----------------------------------------------------

def test_circle_creation_state_creates_circle_once(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    assert support.campaign_circle(camp["id"]) is None
    r = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id']))
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
    again = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()
    assert again["circle_id"] == circle.id
    assert len(support.fetch_all(Circle, campaign_id=camp["id"])) == 1


@pytest.mark.parametrize("unknown", [987654321, 2 ** 31])
def test_circle_creation_state_unknown_campaign_is_404(client, unknown):
    """Before tokens the GET tried to create a circle for any id and failed with a 500
    on the foreign key. The access check now looks the campaign up first, so no
    circle is created, and neither is one for a caller who is refused."""
    with support.server_errors_as_500(client):
        r = client.get(f"/campaign/{unknown}/circle-creation-state", headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}
    assert support.campaign_circle(unknown) is None
    camp = support.new_campaign(client)
    r = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_stranger())
    assert r.status_code == 403
    assert support.campaign_circle(camp["id"]) is None


def test_circle_creation_state_for_gm_and_members_only(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    outsider = support.active_member(client, support.new_campaign(client))
    assert client.get(f"/campaign/{camp['id']}/circle-creation-state",
                      headers=support.as_owner(member["id"])).status_code == 200
    for headers in (support.as_owner(pending["id"]), support.as_owner(outsider["id"])):
        r = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=headers)
        assert r.status_code == 403


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
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]

    def vote(char, vote_type, value, status=200):
        r = client.post("/circle/vote", json={"circle_id": cid, "character_id": char["id"],
                                              "vote_type": vote_type, "value": value},
                        headers=support.as_owner(char["id"]))
        assert r.status_code == status

    vote(a, "name_suggest", "The Moths")
    vote(b, "name_vote", "The Moths")
    vote(a, "ability", "Hunters")
    vote(b, "question", "q2")
    vote(pending, "insignia", "Owl", status=403)  # a pending character is not a member yet
    vote(b, "insignia", "Owl")
    with main.SessionLocal() as s:  # a stored vote of an unknown type is left out
        s.add(CircleVote(circle_id=cid, character_id=a["id"], vote_type="colour", value="red"))
        s.commit()
    rel = client.post("/circle/relationship/propose", json={
        "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "feud"}, headers=support.as_owner(a["id"])).json()["relationships"][0]
    support.update(Circle, cid, backstory_answers={"chapter_house": "Mill", "reports": {str(a["id"]): {"q0": True}}})

    body = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()
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
        "insignia": [{"character_id": b["id"], "value": "Owl"}],
    }
    assert body["relationships"] == [{
        "id": rel["id"], "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "feud", "status": "proposed", "last_actor_id": a["id"]}]
    assert body["backstory_answers"] == {"chapter_house": "Mill", "reports": {str(a["id"]): {"q0": True}}}


def test_a_replaced_dead_investigator_keeps_a_fallen_card_for_the_lightkeeper(client):
    """Playtest 3 (replaced-investigator-leaves-no-record): once a dead investigator was
    replaced he vanished from every desk. The Lightkeeper's roster lists him as fallen,
    with the answer he gave the circle; the table's log names whom the newcomer replaced;
    a player's read lists no one fallen."""
    camp = support.new_campaign(client)
    u = support.make_user()
    old = support.active_member(client, camp, user_id=u.id, personal_circle_answer="He kept the lamp lit.")
    support.update(Character, old["id"], is_dead=True, scars_count=4)
    new = support.pending_member(client, camp, user_id=u.id)
    watcher = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, watcher["id"]) as member:
        assert support.approve(client, new["id"]).status_code == 200
        frames = gm.drain()
        member_frames = member.drain()
    approved = next(m for m in frames if m["type"] == "investigator_approved")
    assert [c["id"] for c in approved["payload"]["fallen_investigators"]] == [old["id"]]
    # only the Lightkeeper's copy lists the fallen
    [plain] = [m for m in member_frames if m["type"] == "investigator_approved"]
    assert "fallen_investigators" not in plain["payload"]
    logs = [m["payload"]["message"] for m in frames if m["type"] == "activity_log"]
    assert logs == [f"{new['name']} joined the circle, in place of {old['name']}."]
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [c["id"] for c in roster["active_investigators"]] == [new["id"], watcher["id"]]
    [card] = roster["fallen_investigators"]
    assert (card["id"], card["name"], card["personal_circle_answer"], card["scars_count"], card["status"]) == \
        (old["id"], old["name"], "He kept the lamp lit.", 4, "retired")
    mine = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_owner(new["id"])).json()
    assert mine["fallen_investigators"] == []
    # A living investigator who is let go (a rejoin over a living one) is not fallen
    v = support.make_user(pending_rejoin_campaign_id=camp["id"])
    living = support.active_member(client, camp, user_id=v.id)
    heir = support.forge(client, user_id=v.id)
    assert client.post("/campaign/rejoin", json={"character_id": heir["id"], "campaign_code": camp["campaign_code"]},
                       headers=support.as_user(v.id)).status_code == 200
    assert support.fetch(Character, living["id"]).status == "retired"
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [c["id"] for c in roster["fallen_investigators"]] == [old["id"]]


def test_approve_after_a_withdraw_is_refused(client):
    camp = support.new_campaign(client)
    mine = support.pending_member(client, camp)
    assert client.post(f"/campaign/withdraw/{mine['id']}", headers=support.as_owner(mine["id"])).status_code == 200
    r = client.post(f"/campaign/approve/{mine['id']}", headers=support.as_gm(camp))
    assert r.status_code >= 400
    row = support.fetch(Character, mine["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
