"""/api/investigators routes (forge, get, list)."""
import pytest

import support
from models import Character
from vtt import creation
from vtt.routers import investigators

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
    r = client.post("/api/investigators/forge", json=support.sheet(
        user_id=u.id, name="Ada Quill", pronouns="she/her", gear=["Surgical Tools", "Lantern"],
    ), headers=support.as_user(u.id))
    assert r.status_code == 201
    body = r.json()
    assert set(body) == RESPONSE_KEYS
    assert "user_id" not in body and "campaign_id" not in body
    assert body["name"] == "Ada Quill"
    assert body["circle_id"] == 1
    assert body["status"] == "unaffiliated"
    assert body["pen_font"] == "Caveat"
    assert body["ink_color"] == ""
    assert body["gear"] == ["Surgical Tools", "Lantern"]
    assert body["scars_list"] == []
    assert (body["role"], body["specialty"], body["role_ability"], body["specialty_ability"]) == (
        "Scholar", "Doctor", "Well-Read", "Dissection")
    assert (body["move"], body["read"], body["nerve_max"], body["intuition_max"]) == (1, 2, 2, 5)
    row = support.fetch(Character, body["id"])
    assert row.user_id == u.id
    assert row.campaign_id is None
    assert row.circle_id == 1


def test_forge_defaults(client):
    body = support.sheet()
    del body["gear"]
    r = client.post("/api/investigators/forge", json=body, headers=support.as_stranger())
    assert r.status_code == 201, r.text
    body = r.json()
    assert (body["pronouns"], body["style"], body["catalyst"], body["question"]) == ("Unlisted", "", "", "")
    assert body["gear"] == []
    assert (body["body_marks"], body["scars_count"], body["scars_list"]) == (0, 0, [])
    assert body["nerve_resistance_spent"] == 0
    assert body["incapacitated"] is False
    assert body["profile_pic"] is None


def test_forge_without_user_id_belongs_to_the_caller(client):
    """Before tokens a character without user_id fell back to user 1 (admin)."""
    u = support.make_user()
    r = client.post("/api/investigators/forge", json=support.sheet(), headers=support.as_user(u.id))
    assert r.status_code == 201
    assert support.fetch(Character, r.json()["id"]).user_id == u.id


@pytest.mark.parametrize("user_id", [0, 987654321])
def test_forge_with_falsy_or_unknown_user_id_is_403(client, user_id):
    """Before tokens user_id 0 and unknown user ids silently fell back to user 1; now
    they are a user_id that is not the caller's."""
    name = f"Inv {support.uid()}"
    r = client.post("/api/investigators/forge", json=support.sheet(name=name, user_id=user_id),
                    headers=support.as_stranger())
    assert r.status_code == 403
    assert support.fetch_all(Character, name=name) == []


def test_forge_for_another_user_is_403(client):
    """Before tokens anyone could create a character owned by any existing user."""
    other = support.make_user()
    name = f"Inv {support.uid()}"
    r = client.post("/api/investigators/forge", json=support.sheet(name=name, user_id=other.id),
                    headers=support.as_stranger())
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert support.fetch_all(Character, name=name) == []
    body = support.forge(client, user_id=other.id)  # the user themself, sending their own id
    assert support.fetch(Character, body["id"]).user_id == other.id


@pytest.mark.parametrize("fields,detail", [
    ({"role": ""}, "Choose a role: Face, Muscle, Scholar, Slink, Weird."),
    ({"role": "Bard"}, "Choose a role: Face, Muscle, Scholar, Slink, Weird."),
    ({"specialty": "Journalist"}, "Choose a Scholar specialty: Doctor or Professor."),
    ({"role_ability": "Endurance"}, "Choose one of the Scholar abilities: Well-Read, Occult Researcher, Meticulous Notes."),
    ({"specialty_ability": "Dissection; Lifesaver"},
     "Choose one of the Doctor abilities: Patch Up, Non-Combatant, Dissection, Resuscitation, Lifesaver, Anatomical Strike."),
    ({"read": 1, "sense": 1}, "Focus starts at 2 for a Doctor."),
    ({"move": 3, "hide": 0}, "A new investigator has no action above 2."),
    ({"sway": 0}, "Raise one action that starts at 0 to 1, then add 3 more points."),
    ({"strike": 2}, "Raise one action that starts at 0 to 1, then add 3 more points."),
    ({"move": 0, "hide": 0, "sway": 0, "strike": 0, "control": 2, "sneak": 2, "survey": 2, "read": 2},
     "Raise one action that starts at 0 to 1, then add 3 more points."),
    ({"gilded_sneak": False, "gilded_sense": True}, "Gild Read, the Doctor's action, and one other."),
    ({"gilded_sense": True}, "Gild Read, the Doctor's action, and one other."),
    ({"gilded_move": False}, "Gild Read, the Doctor's action, and one other."),
    # The Doctor's gild is Read (key sneak), not Focus (key read): rulebook p. 26
    ({"gilded_sneak": False, "gilded_read": True}, "Gild Read, the Doctor's action, and one other."),
    ({"intuition_max": 2, "intuition_current": 2, "nerve_max": 5, "nerve_current": 5},
     "Intuition starts at 3 for a Doctor."),
    ({"intuition_max": 7, "intuition_current": 7, "nerve_max": 0, "nerve_current": 0},
     "A new investigator has no drive above 6."),
    ({"nerve_max": 3, "nerve_current": 3}, "Put 6 more points on the drives."),
    ({"nerve_current": 1}, "A new investigator starts with full drives and no resistance spent."),
    ({"cunning_resistance_spent": 1}, "A new investigator starts with full drives and no resistance spent."),
    ({"gear": ["Surgical Tools", "Lantern", "Camera"]},
     "Choose up to 3 items from the Doctor's gear and the standard issue."),
    ({"gear": ["Lantern", "Lantern"]}, "Choose up to 3 items from the Doctor's gear and the standard issue."),
    ({"gear": ["Surgical Tools", "Lantern", "Hand Weapon", "First Aid Kit"]},
     "Choose up to 3 items from the Doctor's gear and the standard issue."),
    ({"body_marks": 3}, "A new investigator has no marks or scars."),
    ({"scars_count": 1}, "A new investigator has no marks or scars."),
    ({"scars_list": ["Twitch"]}, "A new investigator has no marks or scars."),
    ({"incapacitated": True}, "A new investigator has no marks or scars."),
    ({"move": 2 ** 40}, "A new investigator has no action above 2."),
])
def test_forge_refuses_a_sheet_the_creator_cannot_make(client, fields, detail):
    """Fixed (RULES_CHECK 15): the client chose every stat with no bounds (a rating of 3,
    9 Nerve, marks, scars, any gild). The sheet must now be one the creator could make
    (vtt/creation.py); a huge rating used to reach the database and fail there with 500."""
    owner = support.make_user()
    r = client.post("/api/investigators/forge", json=support.sheet(**fields), headers=support.as_user(owner.id))
    assert (r.status_code, r.json()) == (422, {"detail": detail})
    assert support.fetch_all(Character, user_id=owner.id) == []


@pytest.mark.parametrize("role,specialty", [(r, s) for r, d in creation.ROLES.items() for s in d["specialties"]])
def test_forge_takes_every_specialty(client, role, specialty):
    """Each specialty's own sheet, built as the creator builds it, is accepted."""
    d = creation.ROLES[role]
    spec = d["specialties"][specialty]
    actions = dict(spec["actions"])
    zeros = [a for a in creation.ACTION_LABELS if not actions.get(a)]
    actions[zeros[0]] = 1                    # the raise
    for a in zeros[1:4]:                     # and 3 more points
        actions[a] = 1
    other = zeros[0]
    drives = {dr: spec["drives"].get(dr, 0) + 2 for dr in creation.DRIVES}
    body = dict(
        name=f"Inv {support.uid()}", role=role, specialty=specialty,
        role_ability=d["abilities"][-1], specialty_ability=spec["abilities"][-1],
        gear=[spec["gear"][0], creation.STANDARD_GEAR[0]],
        **actions, **{f"gilded_{spec['gilded']}": True, f"gilded_{other}": True},
        **{f"{dr}_max": v for dr, v in drives.items()}, **{f"{dr}_current": v for dr, v in drives.items()},
    )
    r = client.post("/api/investigators/forge", json=body, headers=support.as_stranger())
    assert r.status_code == 201, r.text


def test_forge_validation_errors(client):
    headers = support.as_stranger()
    assert client.post("/api/investigators/forge", json={}, headers=headers).status_code == 422
    assert client.post("/api/investigators/forge", json=support.sheet(gear="lamp"), headers=headers).status_code == 422
    assert client.post("/api/investigators/forge", json=support.sheet(move="lots"), headers=headers).status_code == 422


def test_forge_database_error_is_500_with_message(client, monkeypatch):
    def broken(**fields):
        raise RuntimeError("the database is away")
    monkeypatch.setattr(investigators, "Character", broken)
    r = client.post("/api/investigators/forge", json=support.sheet(), headers=support.as_stranger())
    assert r.status_code == 500
    assert r.json()["detail"] == "Database Forge Error: the database is away"


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


def test_get_investigator_with_null_circle(client):
    """Fixed: circle_id was required by the response model, so a character with no
    circle failed with a 500. It is now returned with circle_id null."""
    made = support.forge(client)
    support.update(Character, made["id"], circle_id=None)
    r = client.get(f"/api/investigators/{made['id']}", headers=support.as_owner(made["id"]))
    assert r.status_code == 200
    assert (r.json()["id"], r.json()["name"], r.json()["circle_id"]) == (made["id"], made["name"], None)


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
