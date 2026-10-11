"""/api/users/{user_id}/characters and /api/users/{user_id}/campaigns."""
import support
from models import Character


def test_user_characters(client):
    u = support.make_user()
    camp = support.new_campaign(client)
    free = support.forge(client, user_id=u.id, role_ability="Flourish")
    member = support.active_member(client, camp, user_id=u.id)
    r = client.get(f"/api/users/{u.id}/characters", headers=support.as_user(u.id))
    assert r.status_code == 200
    rows = {row["id"]: row for row in r.json()}
    assert set(rows) == {free["id"], member["id"]}
    assert rows[free["id"]] == {
        "id": free["id"], "name": free["name"], "role_ability": "Flourish",
        "specialty_ability": "None", "status": "unaffiliated", "is_dead": False,
        "campaign_id": None, "campaign_name": None, "campaign_code": None,
        "pen_font": "Caveat",
    }
    assert rows[member["id"]]["status"] == "active"
    assert rows[member["id"]]["campaign_id"] == camp["id"]
    assert rows[member["id"]]["campaign_name"] == camp["name"]
    assert rows[member["id"]]["campaign_code"] == camp["campaign_code"]


def test_user_characters_say_which_are_dead(client):
    """A dead investigator keeps status active on its roster: the hub's invite banner
    names only a living one as retired by coming back (final check of playtest 2)."""
    u = support.make_user()
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, user_id=u.id)
    support.update(Character, ch["id"], is_dead=True)
    row, = client.get(f"/api/users/{u.id}/characters", headers=support.as_user(u.id)).json()
    assert (row["status"], row["is_dead"]) == ("active", True)


def test_user_characters_carry_the_kept_pen_font(client):
    u = support.make_user()
    ch = support.forge(client, user_id=u.id)
    support.update(Character, ch["id"], pen_font="Kalam")
    r = client.get(f"/api/users/{u.id}/characters", headers=support.as_user(u.id))
    assert r.json()[0]["pen_font"] == "Kalam"


def test_user_characters_empty_and_unknown(client):
    """Before tokens an unknown user id answered 200 with an empty list; now any id but
    the caller's own is 403."""
    u = support.make_user()
    assert client.get(f"/api/users/{u.id}/characters", headers=support.as_user(u.id)).json() == []
    assert client.get("/api/users/987654321/characters", headers=support.as_user(u.id)).status_code == 403


def test_user_characters_of_someone_else_is_403(client):
    """Before tokens any caller could list any user's characters."""
    u = support.make_user()
    support.forge(client, user_id=u.id)
    r = client.get(f"/api/users/{u.id}/characters", headers=support.as_stranger())
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert len(client.get(f"/api/users/{u.id}/characters", headers=support.as_user(u.id)).json()) == 1


def test_user_gm_campaigns(client):
    u = support.make_user()
    live = support.new_campaign(client, gm_user_id=u.id)
    retired = support.new_campaign(client, gm_user_id=u.id)
    client.post(f"/campaign/{retired['id']}/retire", headers=support.as_user(u.id))
    support.new_campaign(client)  # someone else's
    r = client.get(f"/api/users/{u.id}/campaigns", headers=support.as_user(u.id))
    assert r.status_code == 200
    assert r.json() == [{"id": live["id"], "name": live["name"], "campaign_code": live["campaign_code"],
                         "investigator_count": 0, "pending_count": 0}]


def test_user_gm_campaigns_counts_the_requests_waiting(client):
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    support.pending_member(client, camp)
    support.pending_member(client, camp)
    support.active_member(client, camp)
    [row] = client.get(f"/api/users/{u.id}/campaigns", headers=support.as_user(u.id)).json()
    assert (row["investigator_count"], row["pending_count"]) == (3, 2)


def test_user_gm_campaigns_of_someone_else_is_403(client):
    """The campaign code is also the GM WebSocket channel name. Before tokens any caller
    could read any user's codes."""
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    r = client.get(f"/api/users/{u.id}/campaigns", headers=support.as_stranger())
    assert r.status_code == 403
    codes = [c["campaign_code"] for c in client.get(f"/api/users/{u.id}/campaigns", headers=support.as_user(u.id)).json()]
    assert codes == [camp["campaign_code"]]


def test_user_routes_validate_ids(client):
    headers = support.as_stranger()
    assert client.get("/api/users/abc/characters", headers=headers).status_code == 422
    assert client.get("/api/users/abc/campaigns", headers=headers).status_code == 422
