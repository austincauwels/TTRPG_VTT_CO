"""JSON columns that come back as Python strings.

A database that grew through init_db's ALTERs has TEXT columns where the models
declare JSON (see test_init_db_alters_upgrade_a_legacy_schema), and the code keeps
isinstance(str) / json.loads fallbacks for that. The test database comes from
create_all, so these tests store a Python string in the JSON column instead, which
reads back as a str and takes the same code paths.
"""
import support
from models import Character, Circle


def _campaign(client, members=1):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    return camp, chars, cid


def test_string_columns_read_back_as_strings(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], gear='["a"]')
    assert support.fetch(Character, ch["id"]).gear == '["a"]'


# --- serializers ----------------------------------------------------------------

def test_char_dict_parses_string_gear_and_scars(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], gear='["lamp", "rope"]', scars_list='["Limp"]')
    with support.ws_connect(client, ch["id"]) as ws:
        p = ws.initial[0]["payload"]
        assert (p["gear"], p["scars_list"]) == (["lamp", "rope"], ["Limp"])


def test_char_dict_empty_string_gear_is_empty_list(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], gear="", scars_list="")
    with support.ws_connect(client, ch["id"]) as ws:
        p = ws.initial[0]["payload"]
        assert (p["gear"], p["scars_list"]) == ([], [])


def test_char_dict_passes_string_ability_uses_through(client):
    """QUIRK: gear and scars are parsed, but ability_uses is sent as the raw string."""
    ch = support.forge(client)
    support.update(Character, ch["id"], ability_uses='{"Death Defy": 1}')
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["ability_uses"] == '{"Death Defy": 1}'


def test_circle_dict_parses_string_backstory(client):
    camp, _, cid = _campaign(client, members=0)
    support.update(Circle, cid, backstory_answers='{"q1": "yes"}')
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        assert gm.initial[0]["payload"]["backstory_answers"] == {"q1": "yes"}
    support.update(Circle, cid, backstory_answers="not json")
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        assert gm.initial[0]["payload"]["backstory_answers"] == {}
    state = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()
    assert state["backstory_answers"] == {}


def test_get_investigator_parses_string_gear_and_scars(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], gear='["lamp"]', scars_list="not json")
    r = client.get(f"/api/investigators/{ch['id']}", headers=support.as_owner(ch["id"]))
    assert r.status_code == 200
    assert (r.json()["gear"], r.json()["scars_list"]) == (["lamp"], [])
    # parsed for the response only; the stored value is unchanged
    row = support.fetch(Character, ch["id"])
    assert (row.gear, row.scars_list) == ('["lamp"]', "not json")


# --- writers --------------------------------------------------------------------

def test_finalize_roster_with_string_backstory_and_question_vote(client):
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, backstory_answers='{"chapter_house": "Mill"}')
    client.post("/circle/vote", json={"circle_id": cid, "character_id": a["id"], "vote_type": "question", "value": "q2"},
                headers=support.as_owner(a["id"]))
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["backstory_answers"] == {"chapter_house": "Mill", "selected_question_key": "q2"}
    assert body["chapter_house_location"] == "Mill"
    assert support.fetch(Circle, cid).backstory_answers == {"chapter_house": "Mill", "selected_question_key": "q2"}


def test_finalize_roster_with_string_backstory_and_no_question_vote(client):
    """The chapter house is read from the string; the string itself is left as it was."""
    camp, _, cid = _campaign(client)
    support.update(Circle, cid, backstory_answers='{"chapter_house": "Mill"}')
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["chapter_house_location"] == "Mill"
    assert body["backstory_answers"] == {"chapter_house": "Mill"}
    assert support.fetch(Circle, cid).backstory_answers == '{"chapter_house": "Mill"}'


def test_finalize_roster_with_unparseable_backstory(client):
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, backstory_answers="not json")
    client.post("/circle/vote", json={"circle_id": cid, "character_id": a["id"], "vote_type": "question", "value": "q1"},
                headers=support.as_owner(a["id"]))
    body = client.post("/campaign/finalize-roster", json={"campaign_id": camp["id"], "circle_id": cid}, headers=support.as_gm(camp)).json()
    assert body["backstory_answers"] == {"selected_question_key": "q1"}
    assert body["chapter_house_location"] == ""


def test_report_onto_string_backstory_is_saved(client):
    """A string is parsed into a new dict and the report is added to it."""
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, backstory_answers='{"chapter_house": "Mill"}')
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("submit_assignment_report", character_id=a["id"], responses={"q0": True})
        wa.sync()
    assert support.fetch(Circle, cid).backstory_answers == {
        "chapter_house": "Mill",
        "reports": {str(a["id"]): {"character_name": a["name"], "responses": {"q0": True}}}}


def test_backstory_update_onto_string_backstory(client):
    camp, (a,), cid = _campaign(client)
    support.update(Circle, cid, backstory_answers='{"q1": "yes"}')
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("circle_backstory_update", question_key="q2", answer="no")
        wa.sync()
    assert support.fetch(Circle, cid).backstory_answers == {"q1": "yes", "q2": "no"}


def test_apply_scar_onto_string_scars(client):
    ch = support.forge(client)
    support.update(Character, ch["id"], scars_list='["Limp"]', scars_count=1)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("apply_scar", scar_text="Burn")
        p = ws.sync()[0]["payload"]
        assert (p["scars_list"], p["scars_count"]) == (["Limp", "Burn"], 2)
    assert support.fetch(Character, ch["id"]).scars_list == ["Limp", "Burn"]


# --- dict(ability_uses) on a string -------------------------------------------------

def test_take_mark_with_string_ability_uses_closes_the_socket(client):
    """QUIRK: dict() of a JSON string raises ValueError before any change, and the socket ends."""
    ch = support.forge(client, body_marks=1)
    support.update(Character, ch["id"], ability_uses='{"Death Defy": 1}')
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("take_mark", mark_type="body")
        assert support.wait_server_dropped(ch["id"])
    assert support.fetch(Character, ch["id"]).body_marks == 1


def test_resolve_ability_mark_with_string_ability_uses_closes_the_socket(client):
    ch = support.forge(client, nerve_max=3, nerve_current=1, specialty_ability="Adrenaline Rush")
    support.update(Character, ch["id"], ability_uses='{"Death Defy": 1}')
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("resolve_ability_mark", ability="Adrenaline Rush", choice="nerve")
        assert support.wait_server_dropped(ch["id"])
    assert support.fetch(Character, ch["id"]).nerve_current == 1


def test_roll_with_string_ability_uses_works(client, dice):
    """The roll handler only copies ability_uses for names that are never roll mods,
    so a string there is never touched."""
    ch = support.forge(client, read=1, specialty_ability="Meticulous Notes")
    support.update(Character, ch["id"], ability_uses='{"Death Defy": 1}')
    dice(2, 4)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("roll", action="read", drive_spent=0, ability_mods=["Meticulous Notes"])
        p = ws.sync()[0]["payload"]
        assert len(p["roll"]["dice"]) == 2
        assert p["character"]["ability_uses"] == '{"Death Defy": 1}'
