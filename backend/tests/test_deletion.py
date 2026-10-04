"""Deleting characters and campaigns (soft delete), the undo, and the admin restore.

docs/refactor/DELETION.md describes the rules these tests pin. support.fetch and the
as_owner / as_gm helpers cannot see deleted rows (every ORM query hides them), so
these tests take the headers they need before deleting, and read deleted rows with
fetch_any.
"""
import logging
import threading
import time
from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import text

import engine
import main
import restore_deleted
import support
from models import INCLUDE_DELETED, Campaign, Character, NotebookEntry, Relationship, User
from vtt import deletion
from vtt.auth import campaign_facts, character_facts
from vtt.ws import access

NOT_ALLOWED = {"detail": "Not allowed."}
NOTHING = {"detail": "Nothing to restore."}
TOO_LATE = {"detail": "It is too late to undo this."}
IN_A_CAMPAIGN = {"detail": "An investigator in a campaign cannot be deleted."}


def fetch_any(model, obj_id):
    """One row, deleted or not, detached."""
    with main.SessionLocal() as s:
        obj = s.query(model).execution_options(**{INCLUDE_DELETED: True}).filter(model.id == obj_id).first()
        if obj is not None:
            s.expunge(obj)
        return obj


def age(model, obj_id, seconds):
    """Moves a deleted row's deleted_at back by seconds."""
    with main.SessionLocal() as s:
        obj = s.query(model).execution_options(**{INCLUDE_DELETED: True}).filter(model.id == obj_id).one()
        obj.deleted_at = obj.deleted_at - timedelta(seconds=seconds)
        s.commit()


def as_admin():
    """User 1, the seeded admin. It has no special rights."""
    return support.bearer(support.fresh_token(1))


def my_characters(client, user_id):
    r = client.get(f"/api/users/{user_id}/characters", headers=support.as_user(user_id))
    assert r.status_code == 200, r.text
    return {c["id"]: c for c in r.json()}


def my_campaigns(client, user_id):
    r = client.get(f"/api/users/{user_id}/campaigns", headers=support.as_user(user_id))
    assert r.status_code == 200, r.text
    return {c["id"]: c for c in r.json()}


def delete_character(client, char_id, headers):
    return client.delete(f"/api/investigators/{char_id}", headers=headers)


def delete_campaign(client, camp_id, headers):
    return client.delete(f"/campaign/{camp_id}", headers=headers)


# --- characters: who may delete -----------------------------------------------------

def test_the_owner_deletes_their_character_and_it_is_kept(client):
    ch = support.forge(client, name=f"Theodore Pollock {support.uid()}")
    owner = support.owner_id(ch["id"])
    r = delete_character(client, ch["id"], support.as_user(owner))
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"ok", "id", "name", "deleted_at", "undo_until"}
    assert (body["ok"], body["id"], body["name"]) == (True, ch["id"], ch["name"])
    assert body["deleted_at"].endswith("Z") and body["undo_until"] > body["deleted_at"]
    row = fetch_any(Character, ch["id"])
    assert row.deleted_at is not None
    assert (row.name, row.user_id, row.status) == (ch["name"], owner, "unaffiliated")
    assert support.fetch(Character, ch["id"]) is None  # hidden from every ORM query


def test_only_the_owner_may_delete_a_character(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    ch = support.active_member(client, camp)
    owner = support.as_owner(ch["id"])
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    # retired: no longer on the roster, so its owner could delete it
    for headers in (support.as_stranger(), gm, as_admin()):
        r = delete_character(client, ch["id"], headers)
        assert (r.status_code, r.json()) == (403, NOT_ALLOWED)
    assert fetch_any(Character, ch["id"]).deleted_at is None
    assert client.delete(f"/api/investigators/{ch['id']}").status_code == 401
    assert delete_character(client, ch["id"], owner).status_code == 200


def test_a_character_on_a_roster_cannot_be_deleted(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    for ch in (active, pending):
        r = delete_character(client, ch["id"], support.as_owner(ch["id"]))
        assert (r.status_code, r.json()) == (409, IN_A_CAMPAIGN)
        # the campaign's Lightkeeper may not delete a player's character either
        assert delete_character(client, ch["id"], gm).status_code == 403
        assert fetch_any(Character, ch["id"]).deleted_at is None
    # a dead character stays active until it is replaced, so it is still on the roster
    support.update(Character, active["id"], is_dead=True)
    assert delete_character(client, active["id"], support.as_owner(active["id"])).status_code == 409


def test_deleting_an_unknown_or_deleted_character_is_404(client):
    ch = support.forge(client)
    owner = support.as_owner(ch["id"])
    assert delete_character(client, ch["id"], owner).status_code == 200
    missing = {"detail": "Investigator dossier not found."}
    for char_id in (ch["id"], 987654321):
        r = delete_character(client, char_id, owner)
        assert (r.status_code, r.json()) == (404, missing)


# --- characters: hidden everywhere ----------------------------------------------------

def test_a_deleted_character_is_hidden_from_every_list_and_lookup(client):
    u = support.make_user()
    kept = support.forge(client, user_id=u.id)
    gone = support.forge(client, user_id=u.id)
    me = support.as_user(u.id)
    assert delete_character(client, gone["id"], me).status_code == 200

    assert set(my_characters(client, u.id)) == {kept["id"]}
    assert [c["id"] for c in client.get("/api/investigators", headers=me).json()] == [kept["id"]]
    r = client.get(f"/api/investigators/{gone['id']}", headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "Investigator dossier not found."})
    r = client.put(f"/api/investigators/{gone['id']}/portrait", json={"profile_pic": None}, headers=me)
    assert r.status_code == 404
    with main.SessionLocal() as s:
        assert character_facts(s, gone["id"]) is None  # the column query the access checks use
        assert character_facts(s, kept["id"]) is not None

    camp = support.new_campaign(client)
    r = support.join(client, gone["id"], camp["campaign_code"], headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "Character not found"})
    support.update(User, u.id, pending_rejoin_campaign_id=camp["id"])
    r = client.post("/campaign/rejoin", json={"character_id": gone["id"], "campaign_code": camp["campaign_code"]},
                    headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "Character not found"})
    assert fetch_any(Character, gone["id"]).status == "unaffiliated"
    # its channel is gone too
    assert support.ws_close_code(client, gone["id"], token=support.token_for(u.id)) == 4404


def test_deleting_a_character_tells_and_closes_its_open_socket(client):
    ch = support.forge(client)
    owner = support.owner_id(ch["id"])
    with support.ws_connect(client, ch["id"]) as ws:
        assert delete_character(client, ch["id"], support.as_user(owner)).status_code == 200
        assert ws.recv() == {"type": "character_deleted", "payload": {"character_id": ch["id"]}}
        with pytest.raises(support.Closed) as closed:
            ws.recv()
        assert closed.value.code == 4404
        assert support.server_sockets(ch["id"]) == []


# --- characters: undo -------------------------------------------------------------------

def test_the_owner_can_undo_a_character_delete(client):
    ch = support.forge(client)
    owner = support.owner_id(ch["id"])
    me = support.as_user(owner)
    assert delete_character(client, ch["id"], me).status_code == 200
    for headers in (support.as_stranger(), as_admin()):
        r = client.post(f"/api/investigators/{ch['id']}/restore", headers=headers)
        assert (r.status_code, r.json()) == (404, NOTHING)
    r = client.post(f"/api/investigators/{ch['id']}/restore", headers=me)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "id": ch["id"], "name": ch["name"], "status": "unaffiliated", "campaign_id": None}
    assert support.fetch(Character, ch["id"]).deleted_at is None
    assert ch["id"] in my_characters(client, owner)
    # nothing left to undo
    r = client.post(f"/api/investigators/{ch['id']}/restore", headers=me)
    assert (r.status_code, r.json()) == (404, NOTHING)


def test_a_character_undo_has_a_time_limit(client):
    ch = support.forge(client)
    me = support.as_owner(ch["id"])
    assert delete_character(client, ch["id"], me).status_code == 200
    age(Character, ch["id"], deletion.UNDO_SECONDS + 5)
    r = client.post(f"/api/investigators/{ch['id']}/restore", headers=me)
    assert (r.status_code, r.json()) == (409, TOO_LATE)
    assert fetch_any(Character, ch["id"]).deleted_at is not None
    assert client.post("/api/investigators/987654321/restore", headers=me).status_code == 404


def test_an_undone_retired_character_keeps_its_old_campaign_tag(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    me = support.as_owner(ch["id"])
    assert client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp)).status_code == 200
    assert delete_character(client, ch["id"], me).status_code == 200
    r = client.post(f"/api/investigators/{ch['id']}/restore", headers=me)
    assert (r.json()["status"], r.json()["campaign_id"]) == ("retired", camp["id"])


# --- campaigns: who may delete ------------------------------------------------------------

def test_only_the_lightkeeper_may_delete_a_campaign(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    member = support.active_member(client, camp)
    other_gm = support.as_gm(support.new_campaign(client))
    for headers in (support.as_owner(member["id"]), other_gm, as_admin(), support.as_stranger()):
        r = delete_campaign(client, camp["id"], headers)
        assert (r.status_code, r.json()) == (403, NOT_ALLOWED)
    assert fetch_any(Campaign, camp["id"]).deleted_at is None
    assert client.delete(f"/campaign/{camp['id']}").status_code == 401
    r = delete_campaign(client, camp["id"], gm)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"ok", "id", "name", "deleted_at", "undo_until", "released_character_ids"}
    assert (body["id"], body["name"], body["released_character_ids"]) == (camp["id"], camp["name"], [member["id"]])
    for camp_id in (camp["id"], 987654321):
        r = delete_campaign(client, camp_id, gm)
        assert (r.status_code, r.json()) == (404, {"detail": "Campaign not found"})


def test_deleting_a_campaign_returns_its_characters_to_their_players(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)
    stranger = support.forge(client)
    r = delete_campaign(client, camp["id"], gm)
    assert sorted(r.json()["released_character_ids"]) == sorted([active["id"], pending["id"], dead["id"]])
    for ch in (active, pending, dead):
        row = support.fetch(Character, ch["id"])  # not deleted: still visible
        assert (row.status, row.campaign_id, row.deleted_at) == ("unaffiliated", None, None)
        owner = row.user_id
        mine = my_characters(client, owner)[ch["id"]]
        assert (mine["status"], mine["campaign_id"], mine["campaign_name"]) == ("unaffiliated", None, None)
    assert support.fetch(Character, stranger["id"]).status == "unaffiliated"
    kept = fetch_any(Campaign, camp["id"]).released_characters
    assert sorted((e["id"], e["status"]) for e in kept) == sorted(
        [(active["id"], "active"), (pending["id"], "pending"), (dead["id"], "active")])
    # a returned character is free: its owner can join it elsewhere, or delete it
    elsewhere = support.new_campaign(client)
    assert support.join(client, active["id"], elsewhere["campaign_code"]).status_code == 200
    assert delete_character(client, pending["id"], support.as_owner(pending["id"])).status_code == 200


def test_retired_characters_stay_with_a_deleted_campaign_and_come_back_with_it(client):
    """Retired characters are mostly dead predecessors that were replaced. Deleting the
    campaign used to let them go as unaffiliated, so they showed in their players'
    registries as free investigators and could join other campaigns. Now they stay
    tagged with the campaign, hidden with it, and come back with it."""
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    owner = support.make_user()
    fallen = support.active_member(client, camp, user_id=owner.id)
    support.update(Character, fallen["id"], status="retired", is_dead=True)
    heir = support.active_member(client, camp, user_id=owner.id)
    assert set(my_characters(client, owner.id)) == {fallen["id"], heir["id"]}

    r = delete_campaign(client, camp["id"], gm)
    assert r.json()["released_character_ids"] == [heir["id"]]
    row = support.fetch(Character, fallen["id"])
    assert (row.status, row.campaign_id, row.deleted_at) == ("retired", camp["id"], None)
    assert [e["id"] for e in fetch_any(Campaign, camp["id"]).released_characters] == [heir["id"]]
    # hidden with the campaign: the registry and the investigator list leave it out
    assert set(my_characters(client, owner.id)) == {heir["id"]}
    me = support.as_user(owner.id)
    assert [c["id"] for c in client.get("/api/investigators", headers=me).json()] == [heir["id"]]
    assert my_characters(client, owner.id)[heir["id"]]["status"] == "unaffiliated"

    r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
    assert r.json()["restored_character_ids"] == [heir["id"]]
    mine = my_characters(client, owner.id)
    assert (mine[fallen["id"]]["status"], mine[fallen["id"]]["campaign_name"]) == ("retired", camp["name"])
    assert (mine[heir["id"]]["status"], mine[heir["id"]]["campaign_id"]) == ("active", camp["id"])


def test_deleting_a_retired_campaign_lets_nobody_go(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    ch = support.active_member(client, camp)
    assert client.post(f"/campaign/{camp['id']}/retire", headers=gm).status_code == 200
    assert delete_campaign(client, camp["id"], gm).json()["released_character_ids"] == []
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("retired", camp["id"])
    assert ch["id"] not in my_characters(client, row.user_id)
    # its owner may still delete it (a retired character is on no roster)
    assert delete_character(client, ch["id"], support.as_owner(ch["id"])).status_code == 200


# --- campaigns: hidden everywhere -----------------------------------------------------------

def test_a_deleted_campaign_is_hidden_from_every_list_and_lookup(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    member = support.active_member(client, camp)
    member_headers = support.as_owner(member["id"])
    invited = support.make_user(pending_rejoin_campaign_id=camp["id"])
    r = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=gm)
    circle_id = r.json()["circle_id"]
    login = support.login(client, invited.username, support.PASSWORD).json()
    assert login["pendingRejoinInvite"]["campaign_id"] == camp["id"]
    assert support.login(client, gm_user.username, support.PASSWORD).json()["role"] == "GM"
    assert camp["id"] in my_campaigns(client, gm_user.id)

    assert delete_campaign(client, camp["id"], gm).status_code == 200

    assert camp["id"] not in my_campaigns(client, gm_user.id)
    with main.SessionLocal() as s:
        assert campaign_facts(s, camp["id"]) is None
    not_found = (404, {"detail": "Campaign not found"})
    for method, path, kwargs in [
        ("get", f"/campaign/{camp['id']}/roster", {}),
        ("get", f"/campaign/{camp['id']}/circle-creation-state", {}),
        ("post", f"/campaign/{camp['id']}/retire", {}),
        ("post", f"/campaign/{camp['id']}/invite-rejoin", {"json": {"username": invited.username}}),
        ("post", "/campaign/finalize-roster", {"json": {"campaign_id": camp["id"], "circle_id": circle_id}}),
    ]:
        r = getattr(client, method)(path, headers=gm, **kwargs)
        assert (r.status_code, r.json()) == not_found, path
    assert client.get(f"/api/notebook/{camp['id']}/entries", headers=gm).status_code == 404
    # its code: nobody can join it, and nobody else can take the code while it may come back
    ch = support.forge(client)
    r = support.join(client, ch["id"], camp["campaign_code"])
    assert (r.status_code, r.json()) == (404, {"detail": "Campaign code not found"})
    r = client.post("/campaign/create", params={"name": "Again", "code": camp["campaign_code"]},
                    headers=support.as_stranger())
    assert (r.status_code, r.json()) == (409, {"detail": "Campaign code is already in use"})
    # the invite it sent is hidden, and following it fails
    assert support.login(client, invited.username, support.PASSWORD).json()["pendingRejoinInvite"] is None
    new_char = support.forge(client, user_id=invited.id)
    r = client.post("/campaign/rejoin", json={"character_id": new_char["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_user(invited.id))
    assert (r.status_code, r.json()) == not_found
    # its Lightkeeper signs in as a player now, having no other campaign
    assert support.login(client, gm_user.username, support.PASSWORD).json()["role"] == "PLAYER"
    # its circle: a released character is no member of anything
    r = client.post("/circle/vote", json={"circle_id": circle_id, "character_id": member["id"],
                                          "vote_type": "ability", "value": "x"}, headers=member_headers)
    assert r.status_code == 403
    # its Lightkeeper's channel
    assert support.ws_close_code(client, camp["campaign_code"], token=support.token_for(gm_user.id)) == 4404


def test_the_ledger_counts_the_investigators_a_delete_would_return(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    empty = support.new_campaign(client, gm_user_id=gm_user.id)
    support.active_member(client, camp)
    support.active_member(client, camp)
    support.pending_member(client, camp)
    gone = support.pending_member(client, camp)
    support.reject(client, gone["id"])
    dead = support.active_member(client, camp)
    support.update(Character, dead["id"], is_dead=True)  # still active, so it goes back too
    retired = support.active_member(client, camp)
    support.update(Character, retired["id"], status="retired")  # stays with the campaign
    camps = my_campaigns(client, gm_user.id)
    assert camps[camp["id"]] == {"id": camp["id"], "name": camp["name"], "campaign_code": camp["campaign_code"],
                                 "investigator_count": 4}
    assert camps[empty["id"]]["investigator_count"] == 0
    # the count is exactly what a delete lets go
    r = delete_campaign(client, camp["id"], support.as_user(gm_user.id))
    assert len(r.json()["released_character_ids"]) == 4


# --- campaigns: sockets ----------------------------------------------------------------------

def test_deleting_a_campaign_tells_everyone_connected_and_closes_the_gm_channel(client):
    camp = support.new_campaign(client)
    gm_id = support.gm_id(camp)
    gm_headers = support.as_gm(camp)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    other = support.new_campaign(client)
    bystander = support.active_member(client, other)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, active["id"]) as a, \
            support.ws_connect(client, pending["id"]) as p, \
            support.ws_connect(client, other["campaign_code"]) as other_gm, \
            support.ws_connect(client, bystander["id"]) as b:
        assert delete_campaign(client, camp["id"], gm_headers).status_code == 200
        told = {"type": "campaign_deleted", "payload": {
            "campaign_id": camp["id"], "campaign_code": camp["campaign_code"], "campaign_name": camp["name"]}}
        assert gm.recv() == told
        with pytest.raises(support.Closed) as closed:
            gm.recv()
        assert closed.value.code == 4404
        assert a.drain() == [told]
        assert p.drain() == [told]
        assert other_gm.drain() == [] and b.drain() == []
        # the players' channels stay open, their characters free of the campaign
        a.send("update_pen_font", pen_font="Kalam")
        assert a.recv()["payload"]["status"] == "unaffiliated"
        a.send("chat_message", text="anyone?", target="@Circle")
        assert a.recv()["type"] == "action_rejected"
    assert support.ws_close_code(client, camp["campaign_code"], token=support.token_for(gm_id)) == 4404


def test_a_gm_message_for_a_deleted_campaign_is_refused(client):
    """Deleting a campaign closes its GM's channel; a message that arrives before the
    close is refused."""
    camp = support.new_campaign(client)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    with main.SessionLocal() as s:
        ctx = SimpleNamespace(is_gm=True, camp_id=camp["id"], db=s, own_char_id=None)
        with pytest.raises(access.Rejected) as rejected:
            access.check_message(ctx, "gm_transition_scene", {"scene_name": "x"}, None)
    assert (rejected.value.status, rejected.value.detail) == (404, "Campaign not found")


# --- campaigns: undo -------------------------------------------------------------------------

def test_the_lightkeeper_can_undo_a_campaign_delete(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    moved = support.active_member(client, camp)
    removed = support.active_member(client, camp)
    retired_char = support.active_member(client, camp)
    support.update(Character, retired_char["id"], status="retired")
    invited = support.make_user(pending_rejoin_campaign_id=camp["id"])
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    # meanwhile one character joins another campaign and another is deleted by its owner
    elsewhere = support.new_campaign(client)
    assert support.join(client, moved["id"], elsewhere["campaign_code"]).status_code == 200
    assert delete_character(client, removed["id"], support.as_owner(removed["id"])).status_code == 200

    for headers in (support.as_owner(active["id"]), support.as_stranger(), as_admin()):
        r = client.post(f"/campaign/{camp['id']}/restore", headers=headers)
        assert (r.status_code, r.json()) == (404, NOTHING)
    r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
    assert r.status_code == 200, r.text
    # the retired character never left (it stayed with the campaign), so it is not "put back"
    assert r.json() == {"ok": True, "id": camp["id"], "name": camp["name"], "campaign_code": camp["campaign_code"],
                        "restored_character_ids": sorted([active["id"], pending["id"]])}
    restored = support.fetch(Campaign, camp["id"])
    assert (restored.deleted_at, restored.released_characters) == (None, None)
    for ch, status in ((active, "active"), (pending, "pending"), (retired_char, "retired")):
        row = support.fetch(Character, ch["id"])
        assert (row.status, row.campaign_id) == (status, camp["id"])
    row = support.fetch(Character, moved["id"])
    assert (row.status, row.campaign_id) == ("pending", elsewhere["id"])
    assert fetch_any(Character, removed["id"]).deleted_at is not None
    assert camp["id"] in my_campaigns(client, gm_user.id)
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=gm).json()
    assert [c["id"] for c in roster["active_investigators"]] == [active["id"]]
    assert [c["id"] for c in roster["pending_investigators"]] == [pending["id"]]
    login = support.login(client, invited.username, support.PASSWORD).json()
    assert login["pendingRejoinInvite"]["campaign_id"] == camp["id"]
    r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
    assert (r.status_code, r.json()) == (404, NOTHING)


def test_a_campaign_undo_has_a_time_limit(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    ch = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    age(Campaign, camp["id"], deletion.UNDO_SECONDS + 5)
    r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
    assert (r.status_code, r.json()) == (409, TOO_LATE)
    assert fetch_any(Campaign, camp["id"]).deleted_at is not None
    assert support.fetch(Character, ch["id"]).campaign_id is None


# --- admin restore ---------------------------------------------------------------------------

def test_an_admin_restores_after_the_undo_window(client, capsys, monkeypatch):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    member = support.active_member(client, camp)
    ch = support.forge(client)
    assert delete_character(client, ch["id"], support.as_owner(ch["id"])).status_code == 200
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    age(Character, ch["id"], 3 * 24 * 3600)
    age(Campaign, camp["id"], 3 * 24 * 3600)

    assert restore_deleted.main(["list"]) == 0
    out = capsys.readouterr().out
    assert f"character {ch['id']}  {ch['name']!r}" in out
    assert f"campaign {camp['id']}  {camp['name']!r}  code {camp['campaign_code']}" in out
    assert "1 characters let go" in out
    assert restore_deleted.main(["list", "--days", "1"]) == 0
    assert f"character {ch['id']} " not in capsys.readouterr().out

    assert restore_deleted.main(["character", str(ch["id"])]) == 0
    assert support.fetch(Character, ch["id"]).deleted_at is None
    # its characters were let go three days ago, so the script names them and asks
    asked = []
    monkeypatch.setattr("builtins.input", lambda q: asked.append(q) or "y")
    assert restore_deleted.main(["campaign", str(camp["id"])]) == 0
    assert asked == ["Put them back in the campaign as they were? [y/N] "]
    out = capsys.readouterr().out
    assert f"character {member['id']}  {member['name']!r}" in out and "was active" in out
    assert f"Characters put back: {member['id']}." in out
    row = support.fetch(Character, member["id"])
    assert (row.status, row.campaign_id) == ("active", camp["id"])
    assert restore_deleted.main(["character", str(ch["id"])]) == 1
    assert f"No deleted character with id {ch['id']}." in capsys.readouterr().out


# --- migration -------------------------------------------------------------------------------

def test_the_migration_adds_the_columns_once_and_keeps_every_row_visible(client, monkeypatch, caplog):
    """A database from before deletion existed: init_db adds characters.deleted_at,
    campaigns.deleted_at and campaigns.released_characters, as NULL for every existing
    row, so nothing disappears. Running it again changes nothing."""
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("ALTER TABLE characters DROP COLUMN deleted_at"))
            conn.execute(text("ALTER TABLE campaigns DROP COLUMN deleted_at"))
            conn.execute(text("ALTER TABLE campaigns DROP COLUMN released_characters"))
            conn.execute(text("INSERT INTO campaigns (name, campaign_code) VALUES ('Old', 'old-code')"))
            conn.execute(text("INSERT INTO characters (name, status) VALUES ('Old hand', 'unaffiliated')"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()

        def columns():
            with eng.connect() as conn:
                rows = conn.execute(text(
                    "SELECT table_name, column_name, data_type FROM information_schema.columns "
                    "WHERE table_schema = :s AND column_name IN ('deleted_at', 'released_characters')"),
                    {"s": schema}).all()
            return sorted(tuple(r) for r in rows)

        expected = [("campaigns", "deleted_at", "timestamp without time zone"),
                    ("campaigns", "released_characters", "json"),
                    ("characters", "deleted_at", "timestamp without time zone")]
        assert columns() == expected
        with caplog.at_level(logging.ERROR, logger="candela"):
            main.init_db()  # every column is there now: each ALTER is a duplicate, said nothing of
        assert columns() == expected
        assert "Could not add the column" not in caplog.text
        with Session() as s:
            assert [c.name for c in s.query(Campaign)] == ["Old"]
            assert [c.name for c in s.query(Character)] == ["Old hand"]
            assert s.query(Character).one().deleted_at is None


def test_a_migration_that_fails_for_another_reason_is_logged(client, caplog):
    """Every Character and Campaign query reads deleted_at, so a failed ALTER other
    than "the column is there already" breaks all of them. init_db used to swallow
    every failure; now only that one is quiet."""
    from vtt import db as vtt_db
    with caplog.at_level(logging.ERROR, logger="candela"):
        assert vtt_db.add_columns("characters", [("deleted_at", "TIMESTAMP")]) == []
        assert "Could not add the column" not in caplog.text
        assert vtt_db.add_columns("no_such_table", [("deleted_at", "TIMESTAMP")]) == []
    assert "Could not add the column no_such_table.deleted_at" in caplog.text
    assert "no_such_table" in caplog.records[-1].getMessage()
    with caplog.at_level(logging.ERROR, logger="candela"):
        assert vtt_db.run_migration("ALTER TABLE no_such_table ALTER COLUMN x SET DEFAULT 0", "Could not do it") is False
    assert "Could not do it: " in caplog.text


# --- the deleted-campaign checks on older routes ---------------------------------------------

def _proposal(client):
    """A campaign with two members and a proposal from the first to the second."""
    camp = support.new_campaign(client)
    a, b = support.active_member(client, camp), support.active_member(client, camp)
    circle_id = client.get(f"/campaign/{camp['id']}/circle-creation-state",
                           headers=support.as_gm(camp)).json()["circle_id"]
    r = client.post("/circle/relationship/propose", json={
        "circle_id": circle_id, "from_character_id": a["id"], "to_character_id": b["id"],
        "rel_type": "Rivals", "lore": "the fire at Hollow Lane"}, headers=support.as_owner(a["id"]))
    assert r.status_code == 200, r.text
    return camp, a, b, r.json()["relationships"][0]["id"]


def _respond(client, rel_id, headers):
    return client.post("/circle/relationship/respond", json={"relationship_id": rel_id, "action": "accept"},
                       headers=headers)


def test_answering_a_proposal_of_a_deleted_campaign_is_404(client):
    """Respond used to answer with the whole circle's relationships, lore included, to
    a player whose character the delete had let go."""
    camp, a, b, rel_id = _proposal(client)
    owner, gm = support.as_owner(b["id"]), support.as_gm(camp)
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    r = _respond(client, rel_id, owner)
    assert (r.status_code, r.json()) == (404, {"detail": "Relationship not found"})
    assert support.fetch(Relationship, rel_id).status == "proposed"
    # it comes back with the campaign
    assert client.post(f"/campaign/{camp['id']}/restore", headers=gm).status_code == 200
    r = _respond(client, rel_id, owner)
    assert r.status_code == 200 and r.json()["relationships"][0]["status"] == "accepted"


def test_only_a_member_answers_a_proposal(client):
    camp, a, b, rel_id = _proposal(client)
    support.update(Character, b["id"], status="retired")
    r = _respond(client, rel_id, support.as_owner(b["id"]))
    assert (r.status_code, r.json()) == (403, NOT_ALLOWED)
    assert support.fetch(Relationship, rel_id).status == "proposed"


def test_notebook_entries_of_a_deleted_campaign_are_gone(client):
    """An author could still read (through the answer), edit and delete their own
    entries in a deleted campaign."""
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    member = support.active_member(client, camp)
    mine = support.as_owner(member["id"])

    def add(headers, **fields):
        r = client.post(f"/api/notebook/{camp['id']}/entries", json={
            "title": "Hollow Lane", "content": "words", "author_name": "x", "author_type": "player", **fields},
            headers=headers)
        assert r.status_code == 201, r.text
        return r.json()["id"]

    theirs = add(mine, character_id=member["id"])
    lightkeepers = add(gm, author_type="gm", entry_type="lightkeeper", visibility="gm_only")
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    gone = (404, {"detail": "Entry not found"})
    for entry_id, headers in ((theirs, mine), (lightkeepers, gm)):
        r = client.put(f"/api/notebook/entries/{entry_id}", json={"content": "changed"}, headers=headers)
        assert (r.status_code, r.json()) == gone
        r = client.delete(f"/api/notebook/entries/{entry_id}", headers=headers)
        assert (r.status_code, r.json()) == gone
        row = support.fetch(NotebookEntry, entry_id)
        assert (row.content, row.is_deleted) == ("words", False)


def test_a_retired_author_no_longer_changes_their_notebook_entry(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    mine = support.as_owner(member["id"])
    r = client.post(f"/api/notebook/{camp['id']}/entries", json={
        "title": "t", "content": "words", "author_name": "x", "author_type": "player",
        "character_id": member["id"]}, headers=mine)
    entry_id = r.json()["id"]
    support.update(Character, member["id"], status="retired")
    assert client.put(f"/api/notebook/entries/{entry_id}", json={"content": "x"}, headers=mine).status_code == 403
    assert client.delete(f"/api/notebook/entries/{entry_id}", headers=mine).status_code == 403
    assert support.fetch(NotebookEntry, entry_id).content == "words"


# --- telling players about an undo; join refuses a character on a roster -----------------------

def test_an_undo_tells_the_players_and_the_lightkeeper(client):
    """The undo used to tell nobody: a player whose desk the delete had sent to the hub
    kept a registry that showed the investigator free, with Join and Delete. Now every
    open socket of the owners of the characters put back, and of the Lightkeeper, gets
    campaign_restored, and the client reads the registry again."""
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    other_camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    active = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    moved = support.active_member(client, camp)
    bystander = support.forge(client)
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    elsewhere = support.new_campaign(client)
    assert support.join(client, moved["id"], elsewhere["campaign_code"]).status_code == 200
    with support.ws_connect(client, active["id"]) as a, support.ws_connect(client, pending["id"]) as p, \
            support.ws_connect(client, moved["id"]) as m, support.ws_connect(client, bystander["id"]) as b, \
            support.ws_connect(client, other_camp["campaign_code"]) as lk:
        r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
        assert r.status_code == 200, r.text
        told = {"type": "campaign_restored", "payload": {
            "campaign_id": camp["id"], "campaign_code": camp["campaign_code"], "campaign_name": camp["name"],
            "restored_character_ids": sorted([active["id"], pending["id"]])}}
        assert a.recv() == told
        assert p.recv() == told
        assert lk.recv() == told  # the Lightkeeper, on the desk of another of their campaigns
        assert m.drain() == [] and b.drain() == []
    # the registry the client reads again shows the investigator back in the campaign,
    # where Join and Delete refuse it
    mine = my_characters(client, support.owner_id(active["id"]))[active["id"]]
    assert (mine["status"], mine["campaign_id"]) == ("active", camp["id"])
    r = support.join(client, active["id"], elsewhere["campaign_code"])
    assert (r.status_code, r.json()) == (409, {"detail": "This investigator is already in a campaign."})
    r = delete_character(client, active["id"], support.as_owner(active["id"]))
    assert (r.status_code, r.json()) == (409, IN_A_CAMPAIGN)
    assert support.fetch(Character, active["id"]).campaign_id == camp["id"]


def test_a_code_kept_by_your_own_deleted_campaign_says_so(client):
    gm_user = support.make_user()
    camp = support.new_campaign(client, gm_user_id=gm_user.id)
    gm = support.as_user(gm_user.id)
    assert delete_campaign(client, camp["id"], gm).status_code == 200
    r = client.post("/campaign/create", params={"name": "Again", "code": camp["campaign_code"]}, headers=gm)
    assert (r.status_code, r.json()) == (409, {"detail": (
        "A campaign you deleted still holds this code, so that it can be brought back. Choose a different code.")})
    # anyone else learns only that the code is taken
    r = client.post("/campaign/create", params={"name": "Again", "code": camp["campaign_code"]},
                    headers=support.as_stranger())
    assert (r.status_code, r.json()) == (409, {"detail": "Campaign code is already in use"})
    # a live campaign of your own is simply in use
    live = support.new_campaign(client, gm_user_id=gm_user.id)
    r = client.post("/campaign/create", params={"name": "Again", "code": live["campaign_code"]}, headers=gm)
    assert (r.status_code, r.json()) == (409, {"detail": "Campaign code is already in use"})


# --- the admin restore asks before putting back characters freed long ago ----------------------

@pytest.mark.parametrize("args, answer, put_back", [
    ([], "n", False),
    ([], "", False),
    ([], None, False),          # nobody to ask (no terminal): they stay free
    (["--leave-free"], None, False),
    (["--put-back"], None, True),
])
def test_the_admin_restore_asks_before_putting_back_long_freed_characters(client, capsys, monkeypatch,
                                                                         args, answer, put_back):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    age(Campaign, camp["id"], 2 * 24 * 3600)
    asked = []

    def ask(question):
        asked.append(question)
        if answer is None:
            raise EOFError
        return answer

    monkeypatch.setattr("builtins.input", ask)
    assert restore_deleted.main(["campaign", str(camp["id"]), *args]) == 0
    assert len(asked) == (0 if args else 1)
    assert fetch_any(Campaign, camp["id"]).deleted_at is None
    row = support.fetch(Character, member["id"])
    if put_back:
        assert (row.status, row.campaign_id) == ("active", camp["id"])
        assert f"Characters put back: {member['id']}." in capsys.readouterr().out
    else:
        assert (row.status, row.campaign_id) == ("unaffiliated", None)
        assert "Characters put back: none." in capsys.readouterr().out


def test_the_admin_restore_of_a_recent_delete_does_not_ask(client, capsys, monkeypatch):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    age(Campaign, camp["id"], deletion.UNDO_SECONDS + 60)  # past the undo, within a day
    monkeypatch.setattr("builtins.input", lambda q: pytest.fail("asked: " + q))
    assert restore_deleted.main(["campaign", str(camp["id"])]) == 0
    assert f"Characters put back: {member['id']}." in capsys.readouterr().out


# --- concurrent deletes, joins and restores ----------------------------------------------------
#
# Each test runs one operation in its own session on a thread and stops it just before it
# commits, while it holds its row locks. A second operation then starts on another thread and
# must wait for one of those locks (pg_blocking_pids). The first then commits, and the
# second carries on and must see what the first did. Without the locks the second does not
# wait: it reads the rows as they were and the test fails, either at the wait or at the end.

class Step:
    """fn(session) on its own thread with its own session. With pause=True the session
    stops just before it commits, until finish()."""

    def __init__(self, fn, pause=False):
        self.fn = fn
        self.pid = None
        self.result = self.error = None
        self.at_commit = threading.Event()
        self._started = threading.Event()
        self._go = threading.Event()
        if not pause:
            self._go.set()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def _run(self):
        s = main.SessionLocal()
        real_commit = s.commit

        def commit():
            self.at_commit.set()
            self._go.wait(20)
            real_commit()

        s.commit = commit
        try:
            self.pid = s.execute(text("SELECT pg_backend_pid()")).scalar()
            self._started.set()
            self.result = self.fn(s)
        except Exception as e:  # what the second step answers is part of the test
            self.error = e
        finally:
            self._started.set()
            self.at_commit.set()
            s.close()

    def start(self):
        self._thread.start()
        assert self._started.wait(10)
        return self

    def blocked(self, timeout=5.0) -> bool:
        """True once this step's connection waits for a lock another transaction holds."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline and self._thread.is_alive():
            with main.db_engine.connect() as conn:
                if conn.execute(text("SELECT cardinality(pg_blocking_pids(:pid))"), {"pid": self.pid}).scalar():
                    return True
            time.sleep(0.02)
        return False

    def finish(self):
        self._go.set()
        self._thread.join(20)
        assert not self._thread.is_alive(), "a step never finished"
        return self


def interleave(first, second):
    """first runs up to its commit; second starts and must wait for first's lock; then
    first commits and second finishes. Returns both steps."""
    a = Step(first, pause=True).start()
    b = None
    try:
        assert a.at_commit.wait(10) and a.error is None, a.error
        b = Step(second).start()
        assert b.blocked(), "the second operation did not wait for the first one's lock"
    finally:
        a.finish()
        if b is not None:
            b.finish()
    assert a.error is None, a.error
    return a, b


def http_error(step):
    assert isinstance(step.error, HTTPException), step.error
    return step.error.status_code, step.error.detail


def test_two_deletes_of_one_campaign_at_once_keep_its_roster(client):
    """The second delete used to find no characters left and overwrite
    released_characters with [], so an undo brought the campaign back empty."""
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    members = sorted([support.active_member(client, camp)["id"], support.pending_member(client, camp)["id"]])
    first, second = interleave(lambda s: deletion.delete_campaign(s, camp["id"]),
                               lambda s: deletion.delete_campaign(s, camp["id"]))
    assert [e["id"] for e in first.result[1]] == members
    assert http_error(second) == (404, "Campaign not found")
    assert sorted(e["id"] for e in fetch_any(Campaign, camp["id"]).released_characters) == members
    r = client.post(f"/campaign/{camp['id']}/restore", headers=gm)
    assert sorted(r.json()["restored_character_ids"]) == members


def test_a_join_during_a_campaign_delete_finds_it_gone(client):
    camp = support.new_campaign(client)
    ch = support.forge(client)
    _, join = interleave(lambda s: deletion.delete_campaign(s, camp["id"]),
                         lambda s: engine.request_join_campaign(s, ch["id"], camp["campaign_code"]))
    assert join.error is None and join.result == {"error": "Campaign code not found"}
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)


def test_a_campaign_delete_waits_for_a_join_and_lets_it_go_too(client):
    """A join that committed between the delete's query and its commit used to leave a
    pending character tied to the deleted campaign, which no Lightkeeper could approve
    and its owner could not delete."""
    camp = support.new_campaign(client)
    ch = support.forge(client)
    _, delete = interleave(lambda s: engine.request_join_campaign(s, ch["id"], camp["campaign_code"]),
                           lambda s: deletion.delete_campaign(s, camp["id"]))
    assert delete.error is None
    assert delete.result[1] == [{"id": ch["id"], "status": "pending"}]
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None)
    assert delete_character(client, ch["id"], support.as_owner(ch["id"])).status_code == 200


def test_a_character_delete_and_a_join_of_it_do_not_cross(client):
    camp = support.new_campaign(client)
    # the join first: the delete then finds the character waiting for a Lightkeeper
    ch = support.forge(client)
    _, delete = interleave(lambda s: engine.request_join_campaign(s, ch["id"], camp["campaign_code"]),
                           lambda s: deletion.delete_character(s, ch["id"]))
    assert http_error(delete) == (409, IN_A_CAMPAIGN["detail"])
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id, row.deleted_at) == ("pending", camp["id"], None)
    # the delete first: the join then finds no character
    ch = support.forge(client)
    _, join = interleave(lambda s: deletion.delete_character(s, ch["id"]),
                         lambda s: engine.request_join_campaign(s, ch["id"], camp["campaign_code"]))
    assert join.result == {"error": "Character not found"}
    row = fetch_any(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("unaffiliated", None) and row.deleted_at is not None


def test_a_campaign_restore_and_a_join_do_not_cross(client):
    # the restore first: the join then finds the character back in its campaign
    camp = support.new_campaign(client)
    elsewhere = support.new_campaign(client)
    ch = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    _, join = interleave(lambda s: deletion.restore_campaign(s, camp["id"]),
                         lambda s: engine.request_join_campaign(s, ch["id"], elsewhere["campaign_code"]))
    assert join.result == {"error": "This investigator is already in a campaign.", "status": 409}
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("active", camp["id"])
    # the join first: the restore then leaves the character where it went
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    _, restore = interleave(lambda s: engine.request_join_campaign(s, ch["id"], elsewhere["campaign_code"]),
                            lambda s: deletion.restore_campaign(s, camp["id"]))
    assert restore.error is None and restore.result[1] == []
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("pending", elsewhere["id"])


def test_two_restores_at_once_restore_once(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    assert delete_campaign(client, camp["id"], support.as_gm(camp)).status_code == 200
    first, second = interleave(lambda s: deletion.restore_campaign(s, camp["id"]),
                               lambda s: deletion.restore_campaign(s, camp["id"]))
    assert first.result[1] == [ch["id"]]
    assert http_error(second) == (404, NOTHING["detail"])
    row = support.fetch(Character, ch["id"])
    assert (row.status, row.campaign_id) == ("active", camp["id"])
