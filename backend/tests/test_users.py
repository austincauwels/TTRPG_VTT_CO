"""/api/users/{user_id}/characters and /api/users/{user_id}/campaigns."""
import pytest

import support


def test_user_characters(client):
    u = support.make_user()
    camp = support.new_campaign(client)
    free = support.forge(client, user_id=u.id, role_ability="Flourish")
    member = support.active_member(client, camp, user_id=u.id)
    r = client.get(f"/api/users/{u.id}/characters")
    assert r.status_code == 200
    rows = {row["id"]: row for row in r.json()}
    assert set(rows) == {free["id"], member["id"]}
    assert rows[free["id"]] == {
        "id": free["id"], "name": free["name"], "role_ability": "Flourish",
        "specialty_ability": "None", "status": "unaffiliated",
        "campaign_id": None, "campaign_name": None, "campaign_code": None,
    }
    assert rows[member["id"]]["status"] == "active"
    assert rows[member["id"]]["campaign_id"] == camp["id"]
    assert rows[member["id"]]["campaign_name"] == camp["name"]
    assert rows[member["id"]]["campaign_code"] == camp["campaign_code"]


def test_user_characters_empty_and_unknown(client):
    u = support.make_user()
    assert client.get(f"/api/users/{u.id}/characters").json() == []
    assert client.get("/api/users/987654321/characters").json() == []


@pytest.mark.legacy_trust
def test_user_characters_of_someone_else(client):
    """Any caller can list any user's characters."""
    u = support.make_user()
    support.forge(client, user_id=u.id)
    assert len(client.get(f"/api/users/{u.id}/characters").json()) == 1


def test_user_gm_campaigns(client):
    u = support.make_user()
    live = support.new_campaign(client, gm_user_id=u.id)
    retired = support.new_campaign(client, gm_user_id=u.id)
    client.post(f"/campaign/{retired['id']}/retire")
    support.new_campaign(client)  # someone else's
    r = client.get(f"/api/users/{u.id}/campaigns")
    assert r.status_code == 200
    assert r.json() == [{"id": live["id"], "name": live["name"], "campaign_code": live["campaign_code"]}]


@pytest.mark.legacy_trust
def test_user_gm_campaigns_expose_codes_to_anyone(client):
    """The campaign code is also the GM WebSocket channel name."""
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    codes = [c["campaign_code"] for c in client.get(f"/api/users/{u.id}/campaigns").json()]
    assert codes == [camp["campaign_code"]]


def test_user_routes_validate_ids(client):
    assert client.get("/api/users/abc/characters").status_code == 422
    assert client.get("/api/users/abc/campaigns").status_code == 422
