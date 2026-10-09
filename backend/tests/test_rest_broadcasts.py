"""WebSocket frames sent by REST routes, and who receives them.

broadcast_campaign(code, id) sends to the campaign code channel (the GM) and to
every character in the campaign whose status is active at the time of the call.
"""
import support
from models import Circle


def _types(ws):
    return support.types(ws.drain())


def test_join_notifies_gm_but_not_pending_player(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    ch = support.forge(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem, \
            support.ws_connect(client, ch["id"]) as joiner:
        assert support.join(client, ch["id"], camp["campaign_code"]).status_code == 200
        [msg] = gm.drain()
        assert msg["type"] == "investigator_joined"
        assert msg["payload"]["campaign_code"] == camp["campaign_code"]
        assert [c["id"] for c in msg["payload"]["pending_investigators"]] == [ch["id"]]
        assert set(msg["payload"]["pending_investigators"][0]) == support.CHAR_DICT_KEYS
        assert _types(mem) == ["investigator_joined"]
        assert joiner.drain() == []


def test_approve_broadcasts_to_gm_and_active_members(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    ch = support.pending_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem, \
            support.ws_connect(client, ch["id"]) as newbie:
        support.approve(client, ch["id"])
        msg, circle = gm.drain()
        assert msg["type"] == "investigator_approved"
        assert msg["payload"]["character"]["id"] == ch["id"]
        assert msg["payload"]["character"]["status"] == "active"
        assert sorted(c["id"] for c in msg["payload"]["active_investigators"]) == sorted([member["id"], ch["id"]])
        assert msg["payload"]["campaign_id"] == camp["id"]
        # Then the circle: before the seal each resource is 1 plus the members (playtest,
        # 2026-10-09: it stayed at 1 and no desk was told the maximum had grown)
        assert circle["type"] == "circle_update"
        p = circle["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (3, 3, 3, 3)
        assert _types(mem) == ["investigator_approved", "circle_update"]
        assert _types(newbie) == ["investigator_approved", "circle_update"]


def test_approving_fills_the_resources_only_before_the_seal(client):
    """Rulebook p. 41: "At circle creation, assign a number of resource points equal to 1
    plus the number of circle members." Each approval before the seal fills each resource
    to that, as the seal does; after it, a new member raises the maximum the desks show
    but leaves what the circle has, which comes back only when the track fills. With no
    circle yet (nobody has opened the campaign) there is nothing to fill or send."""
    camp = support.new_campaign(client)
    first = support.active_member(client, camp)
    assert support.campaign_circle(camp["id"]) is None
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        cid = gm.initial[-1]["payload"]["id"]
        for n in range(2, 5):
            support.approve(client, support.pending_member(client, camp)["id"])
            p = support.of_type(gm.drain(), "circle_update")[0]["payload"]
            assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (n + 1, n + 1, n + 1, n + 1)
        r = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid},
                        headers=support.as_gm(camp))
        assert r.status_code == 200
        support.update(Circle, cid, refresh=2)  # spent since the seal
        gm.drain()
        support.approve(client, support.pending_member(client, camp)["id"])
        p = support.of_type(gm.drain(), "circle_update")[0]["payload"]
        assert (p["stitch"], p["refresh"], p["train"], p["max_capacity"]) == (5, 2, 5, 6)
    assert first["id"]


def test_reject_notifies_campaign_and_rejected_character(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    ch = support.pending_member(client, camp)
    other = support.pending_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem, \
            support.ws_connect(client, ch["id"]) as rejected:
        support.reject(client, ch["id"])
        [msg] = gm.drain()
        assert msg == {"type": "investigator_rejected", "payload": {
            "character_id": ch["id"],
            "pending_investigators": msg["payload"]["pending_investigators"]}}
        assert [c["id"] for c in msg["payload"]["pending_investigators"]] == [other["id"]]
        assert _types(mem) == ["investigator_rejected"]
        assert rejected.drain() == [{"type": "investigator_rejected", "payload": {"character_id": ch["id"]}}]


def test_retire_reaches_only_the_gm(client):
    """QUIRK: characters are retired before the broadcast, so members never get campaign_retired."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem:
        client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp))
        assert gm.drain() == [{"type": "campaign_retired", "payload": {
            "campaign_id": camp["id"], "campaign_code": camp["campaign_code"]}}]
        assert mem.drain() == []


def test_rejoin_sends_approved_then_joined_mid_campaign(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    ch = support.forge(client, user_id=support.make_user(pending_rejoin_campaign_id=camp["id"]).id)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem, \
            support.ws_connect(client, ch["id"]) as newbie:
        client.post("/campaign/rejoin", json={"character_id": ch["id"], "campaign_code": camp["campaign_code"]},
                    headers=support.as_owner(ch["id"]))
        msgs = gm.drain()
        assert support.types(msgs) == ["investigator_approved", "character_joined_mid_campaign", "circle_update"]
        assert msgs[0]["payload"]["character"]["id"] == ch["id"]
        assert msgs[1]["payload"]["new_character"]["id"] == ch["id"]
        assert sorted(c["id"] for c in msgs[1]["payload"]["active_investigators"]) == sorted([member["id"], ch["id"]])
        assert msgs[1]["payload"]["campaign_id"] == camp["id"]
        assert _types(mem) == ["investigator_approved", "character_joined_mid_campaign", "circle_update"]
        assert _types(newbie) == ["investigator_approved", "character_joined_mid_campaign", "circle_update"]


def test_invite_rejoin_reaches_every_character_of_the_user(client):
    camp = support.new_campaign(client)
    u = support.make_user()
    a = support.forge(client, user_id=u.id)
    b = support.forge(client, user_id=u.id)
    stranger = support.forge(client, user_id=support.make_user().id)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, stranger["id"]) as ws_other, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": u.username},
                    headers=support.as_gm(camp))
        expected = {"type": "gm_rejoin_invite", "payload": {
            "campaign_id": camp["id"], "campaign_name": camp["name"], "campaign_code": camp["campaign_code"]}}
        assert wa.drain() == [expected]
        assert wb.drain() == [expected]
        assert ws_other.drain() == []
        assert gm.drain() == []


def test_finalize_roster_skips_released_pending_characters(client):
    """QUIRK: pending characters are released before the broadcast, so they never see roster_finalized."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    pending = support.pending_member(client, camp)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem, \
            support.ws_connect(client, pending["id"]) as pend:
        client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp))
        [msg] = gm.drain()
        assert msg["type"] == "roster_finalized"
        assert set(msg["payload"]) == {"circle", "campaign_id", "rejected_character_ids"}
        assert msg["payload"]["rejected_character_ids"] == [pending["id"]]
        assert msg["payload"]["circle"]["is_finalized"] is True
        assert _types(mem) == ["roster_finalized"]
        assert pend.drain() == []


def test_notebook_entry_broadcast_only_for_visibility_all(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, member["id"]) as mem:
        r = client.post(f"/api/notebook/{camp['id']}/entries", json={
            "title": "Secret", "content": "x", "author_name": "LK", "author_type": "gm",
            "visibility": "gm_only"}, headers=support.as_gm(camp))
        assert r.status_code == 201
        assert gm.drain() == [] and mem.drain() == []

        r = client.post(f"/api/notebook/{camp['id']}/entries", json={
            "title": "Public", "content": "y", "author_name": "Ada", "author_type": "player",
            "character_id": member["id"]}, headers=support.as_owner(member["id"]))
        entry = r.json()
        msgs = gm.drain()
        assert support.types(msgs) == ["notebook_entry", "activity_log"]
        assert set(msgs[0]["payload"]) == {"id", "title", "content", "author_name", "author_type",
                                           "entry_type", "visibility", "character_id", "page_number",
                                           "pen_font", "ink_color", "image_data", "created_at", "is_deleted",
                                           "has_scene"}
        assert msgs[0]["payload"]["id"] == entry["id"]
        assert msgs[1]["payload"] == {"message": f"{member['name']} has archived a journal entry.", "log_type": "field",
                                      "ink_color": entry["ink_color"]}
        assert support.types(mem.drain()) == ["notebook_entry", "activity_log"]


def test_notebook_entry_log_has_no_ink_without_character(client):
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        client.post(f"/api/notebook/{camp['id']}/entries", json={
            "title": "T", "content": "c", "author_name": "LK", "author_type": "gm"}, headers=support.as_gm(camp))
        msgs = gm.drain()
        assert msgs[1]["payload"]["ink_color"] == ""


def test_upload_is_broadcast_with_a_log_line(client):
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        r = client.post(f"/api/notebook/{camp['id']}/upload",
                        files={"file": ("a.png", b"\x89PNG....", "image/png")}, headers=support.as_gm(camp))
        assert r.status_code == 201
        msgs = gm.drain()
        assert support.types(msgs) == ["notebook_entry", "activity_log"]
        assert msgs[0]["payload"]["id"] == r.json()["id"]
        assert msgs[0]["payload"]["image_data"] == r.json()["image_data"]
