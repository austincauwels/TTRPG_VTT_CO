"""/api/investigators routes (forge, get, list)."""
import pytest

import support
from models import Character

RESPONSE_KEYS = {
    "name", "pronouns", "style", "catalyst", "question", "role", "specialty",
    "role_ability", "specialty_ability", "profile_pic", "gear",
    "move", "strike", "control", "sneak", "hide", "sway", "survey", "read", "sense",
    "gilded_move", "gilded_strike", "gilded_control", "gilded_hide", "gilded_sneak",
    "gilded_sway", "gilded_survey", "gilded_read", "gilded_sense",
    "nerve_current", "nerve_max", "nerve_resistance_spent",
    "cunning_current", "cunning_max", "cunning_resistance_spent",
    "intuition_current", "intuition_max", "intuition_resistance_spent",
    "body_marks", "brain_marks", "bleed_marks", "scars_count", "scars_list", "incapacitated",
    "id", "circle_id", "status", "pen_font", "ink_color",
}


def test_forge_happy_path(client):
    u = support.make_user()
    r = client.post("/api/investigators/forge", json={
        "user_id": u.id, "name": "Ada Quill", "pronouns": "she/her", "role": "Scholar",
        "specialty": "Doctor", "role_ability": "Well-Read", "specialty_ability": "Dissection",
        "gear": ["lamp", "notebook"], "move": 1, "read": 2, "nerve_max": 4, "nerve_current": 4,
    }, headers=support.as_user(u.id))
    assert r.status_code == 201
    body = r.json()
    assert set(body) == RESPONSE_KEYS
    assert "user_id" not in body and "campaign_id" not in body
    assert body["name"] == "Ada Quill"
    assert body["circle_id"] == 1
    assert body["status"] == "unaffiliated"
    assert body["pen_font"] == "Caveat"
    assert body["ink_color"] == ""
    assert body["gear"] == ["lamp", "notebook"]
    assert body["scars_list"] == []
    assert (body["move"], body["read"], body["nerve_max"]) == (1, 2, 4)
    row = support.fetch(Character, body["id"])
    assert row.user_id == u.id
    assert row.campaign_id is None
    assert row.circle_id == 1


def test_forge_defaults(client):
    body = support.forge(client, user_id=support.make_user().id)
    assert body["pronouns"] == "Unlisted"
    assert body["role_ability"] == "None"
    assert body["specialty_ability"] == "None"
    assert (body["nerve_max"], body["nerve_current"]) == (1, 1)
    assert (body["cunning_max"], body["intuition_max"]) == (1, 1)
    assert body["gear"] == []
    assert body["incapacitated"] is False
    assert body["profile_pic"] is None


def test_forge_without_user_id_belongs_to_the_caller(client):
    """Before tokens a character without user_id fell back to user 1 (admin)."""
    u = support.make_user()
    r = client.post("/api/investigators/forge", json={"name": f"Inv {support.uid()}"}, headers=support.as_user(u.id))
    assert r.status_code == 201
    assert support.fetch(Character, r.json()["id"]).user_id == u.id


@pytest.mark.parametrize("user_id", [0, 987654321])
def test_forge_with_falsy_or_unknown_user_id_is_403(client, user_id):
    """Before tokens user_id 0 and unknown user ids silently fell back to user 1; now
    they are a user_id that is not the caller's."""
    name = f"Inv {support.uid()}"
    r = client.post("/api/investigators/forge", json={"name": name, "user_id": user_id},
                    headers=support.as_stranger())
    assert r.status_code == 403
    assert support.fetch_all(Character, name=name) == []


def test_forge_for_another_user_is_403(client):
    """Before tokens anyone could create a character owned by any existing user."""
    other = support.make_user()
    name = f"Inv {support.uid()}"
    r = client.post("/api/investigators/forge", json={"name": name, "user_id": other.id},
                    headers=support.as_stranger())
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert support.fetch_all(Character, name=name) == []
    body = support.forge(client, user_id=other.id)  # the user themself, sending their own id
    assert support.fetch(Character, body["id"]).user_id == other.id


def test_forge_client_sets_any_stats(client):
    """QUIRK: the client chooses every stat, with no bounds."""
    body = support.forge(client, move=3, strike=3, nerve_max=9, nerve_current=9,
                         body_marks=3, scars_count=2, incapacitated=True, gilded_move=True)
    row = support.fetch(Character, body["id"])
    assert (row.move, row.strike, row.nerve_max, row.body_marks, row.scars_count) == (3, 3, 9, 3, 2)
    assert row.incapacitated is True and row.gilded_move is True


def test_forge_validation_errors(client):
    headers = support.as_stranger()
    assert client.post("/api/investigators/forge", json={}, headers=headers).status_code == 422
    assert client.post("/api/investigators/forge", json={"name": "x", "gear": "lamp"}, headers=headers).status_code == 422
    assert client.post("/api/investigators/forge", json={"name": "x", "move": "lots"}, headers=headers).status_code == 422


def test_forge_database_error_is_500_with_message(client):
    r = client.post("/api/investigators/forge", json={"name": "Overflow", "move": 2 ** 40},
                    headers=support.as_stranger())
    assert r.status_code == 500
    assert r.json()["detail"].startswith("Database Forge Error: ")


def test_get_investigator(client):
    made = support.forge(client, user_id=support.make_user().id, gear=["rope"])
    r = client.get(f"/api/investigators/{made['id']}", headers=support.as_owner(made["id"]))
    assert r.status_code == 200
    assert r.json() == made


def test_get_investigator_not_found(client):
    r = client.get("/api/investigators/987654321", headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Investigator dossier not found."}


def test_get_investigator_validation(client):
    assert client.get("/api/investigators/abc", headers=support.as_stranger()).status_code == 422


def test_get_investigator_by_owner_or_the_campaigns_gm_only(client):
    """Before tokens any caller could read any character sheet by id."""
    camp = support.new_campaign(client)
    made = support.active_member(client, camp, move=2, role_ability="Flourish")
    fellow = support.active_member(client, camp)
    for headers in (support.as_owner(made["id"]), support.as_gm(camp)):
        r = client.get(f"/api/investigators/{made['id']}", headers=headers)
        assert r.status_code == 200
        assert r.json()["move"] == 2
    for headers in (support.as_owner(fellow["id"]), support.as_gm(support.new_campaign(client)),
                    support.as_stranger()):
        r = client.get(f"/api/investigators/{made['id']}", headers=headers)
        assert r.status_code == 403
        assert r.json() == {"detail": "Not allowed."}


def test_get_investigator_with_null_circle_is_500(client):
    """QUIRK: circle_id is required by the response model, so a NULL circle fails."""
    made = support.forge(client)
    support.update(Character, made["id"], circle_id=None)
    with support.server_errors_as_500(client):
        r = client.get(f"/api/investigators/{made['id']}", headers=support.as_owner(made["id"]))
    assert r.status_code == 500


def test_list_investigators(client):
    made = support.forge(client, user_id=support.make_user().id, role="Face",
                         specialty="Journalist", role_ability="Sweet Talk")
    support.update(Character, made["id"], is_dead=True, pen_font="Kalam", ink_color="#8b1a1a")
    r = client.get("/api/investigators", headers=support.as_owner(made["id"]))
    assert r.status_code == 200
    rows = {row["id"]: row for row in r.json()}
    assert rows[made["id"]] == {
        "id": made["id"],
        "name": made["name"],
        "role_class": "Face",
        "role_ability": "Sweet Talk",
        "specialty": "Journalist",
        "specialty_ability": "None",
        "profile_pic": None,
        "circle_name": None,
        "status": "unaffiliated",
        # QUIRK: these three are never filled in by this route, so they show defaults.
        "is_dead": False,
        "pen_font": "Caveat",
        "ink_color": "",
    }


def test_list_investigators_shows_only_the_callers_characters(client):
    """Before tokens it listed every user's characters."""
    u = support.make_user()
    a = support.forge(client, user_id=u.id)
    a2 = support.forge(client, user_id=u.id)
    b = support.forge(client, user_id=support.make_user().id)
    ids = [row["id"] for row in client.get("/api/investigators", headers=support.as_user(u.id)).json()]
    assert sorted(ids) == sorted([a["id"], a2["id"]])
    assert b["id"] not in ids
    assert client.get("/api/investigators", headers=support.as_stranger()).json() == []
