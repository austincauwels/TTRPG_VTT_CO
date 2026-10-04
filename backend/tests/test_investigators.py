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
    })
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


def test_forge_without_user_id_belongs_to_admin(client):
    """QUIRK: legacy fallback, a character without user_id is owned by user 1."""
    body = support.forge(client)
    assert support.fetch(Character, body["id"]).user_id == 1


@pytest.mark.parametrize("user_id", [0, 987654321])
def test_forge_with_falsy_or_unknown_user_id_belongs_to_admin(client, user_id):
    """QUIRK: user_id 0 and unknown user ids silently fall back to user 1."""
    body = support.forge(client, user_id=user_id)
    assert support.fetch(Character, body["id"]).user_id == 1


@pytest.mark.legacy_trust
def test_forge_for_any_user_id(client):
    """Anyone can create a character owned by any existing user."""
    other = support.make_user()
    body = support.forge(client, user_id=other.id)
    assert support.fetch(Character, body["id"]).user_id == other.id


def test_forge_client_sets_any_stats(client):
    """QUIRK: the client chooses every stat, with no bounds."""
    body = support.forge(client, move=3, strike=3, nerve_max=9, nerve_current=9,
                         body_marks=3, scars_count=2, incapacitated=True, gilded_move=True)
    row = support.fetch(Character, body["id"])
    assert (row.move, row.strike, row.nerve_max, row.body_marks, row.scars_count) == (3, 3, 9, 3, 2)
    assert row.incapacitated is True and row.gilded_move is True


def test_forge_validation_errors(client):
    assert client.post("/api/investigators/forge", json={}).status_code == 422
    assert client.post("/api/investigators/forge", json={"name": "x", "gear": "lamp"}).status_code == 422
    assert client.post("/api/investigators/forge", json={"name": "x", "move": "lots"}).status_code == 422


def test_forge_database_error_is_500_with_message(client):
    r = client.post("/api/investigators/forge", json={"name": "Overflow", "move": 2 ** 40})
    assert r.status_code == 500
    assert r.json()["detail"].startswith("Database Forge Error: ")


def test_get_investigator(client):
    made = support.forge(client, user_id=support.make_user().id, gear=["rope"])
    r = client.get(f"/api/investigators/{made['id']}")
    assert r.status_code == 200
    assert r.json() == made


def test_get_investigator_not_found(client):
    r = client.get("/api/investigators/987654321")
    assert r.status_code == 404
    assert r.json() == {"detail": "Investigator dossier not found."}


def test_get_investigator_validation(client):
    assert client.get("/api/investigators/abc").status_code == 422


@pytest.mark.legacy_trust
def test_get_investigator_of_someone_else(client):
    """Any caller can read any character sheet by id."""
    made = support.forge(client, user_id=support.make_user().id)
    assert client.get(f"/api/investigators/{made['id']}").status_code == 200


def test_get_investigator_with_null_circle_is_500(client):
    """QUIRK: circle_id is required by the response model, so a NULL circle fails."""
    made = support.forge(client)
    support.update(Character, made["id"], circle_id=None)
    with support.server_errors_as_500(client):
        r = client.get(f"/api/investigators/{made['id']}")
    assert r.status_code == 500


def test_list_investigators(client):
    made = support.forge(client, user_id=support.make_user().id, role="Face",
                         specialty="Journalist", role_ability="Sweet Talk")
    support.update(Character, made["id"], is_dead=True, pen_font="Kalam", ink_color="#8b1a1a")
    r = client.get("/api/investigators")
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


@pytest.mark.legacy_trust
def test_list_investigators_shows_every_users_characters(client):
    a = support.forge(client, user_id=support.make_user().id)
    b = support.forge(client, user_id=support.make_user().id)
    ids = {row["id"] for row in client.get("/api/investigators").json()}
    assert {a["id"], b["id"]} <= ids
