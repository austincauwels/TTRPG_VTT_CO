"""A player's direct edits of their own sheet (edit_sheet) and the Lightkeeper's dot for
them (gm_sheet_seen): decision 1 of fix round 5, issue #64. Detection, not prevention:
nothing is refused for the rules, each edit writes one line for the Lightkeeper, and the
member's roster card carries a dot until she opens the sheet (vtt/sheet_edits.py)."""
import pytest

import engine
import support
from models import Character


def _rejected(detail, action="edit_sheet", status=422):
    return {"type": "action_rejected", "payload": {"action": action, "status": status, "detail": detail}}


def _member_pair(client, **fields):
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, role="Slink", specialty="Detective", role_ability="Scout",
                              specialty_ability="Mind Palace", **fields)
    b = support.active_member(client, camp)
    return camp, a, b


def _roster(client, camp, headers):
    r = client.get(f"/campaign/{camp['id']}/roster", headers=headers)
    assert r.status_code == 200, r.text
    return {c["id"]: c["sheet_edited"] for c in r.json()["active_investigators"]}


def test_an_edit_is_stored_and_logged_for_the_lightkeeper_with_a_dot(client):
    """Every field the edit names is stored at once, and one line names each change from
    what to what. The line goes to the Lightkeeper and to the player; the other members
    are not told. The roster card's dot (sheet_edited) is on, for the Lightkeeper only."""
    camp, a, b = _member_pair(client, strike=1, nerve_max=5, nerve_current=5, body_marks=2,
                              gear=["Lantern"], scars_list=["A limp"], scars_count=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("edit_sheet", changes={
            "strike": 2, "gilded_strike": True, "nerve_max": 6, "body_marks": 0, "role": "Weird",
            "specialty": "Medium", "role_ability": "Ritual", "specialty_ability": ["Mind Palace", "Commune"],
            "scars_list": ["A bad limp"], "pronouns": "they/them"})
        msgs = wa.sync()
        assert support.types(msgs) == ["character_update", "activity_log", "member_status"]
        sheet = msgs[0]["payload"]
        assert (sheet["strike"], sheet["gilded_strike"], sheet["nerve_max"], sheet["nerve_current"],
                sheet["body_marks"], sheet["role"], sheet["specialty"], sheet["role_ability"],
                sheet["specialty_ability"], sheet["scars_list"], sheet["scars_count"], sheet["sheet_edited"]) == (
            2, True, 6, 5, 0, "Weird", "Medium", "Ritual", "Mind Palace; Commune", ["A bad limp"], 1, True)
        line = {"message": (
            f"{a['name']}: pronouns Unlisted to they/them, role Slink to Weird, specialty Detective to Medium, "
            "abilities Scout removed, Ritual added, Commune added, Strike 1 to 2, Strike gilded, "
            "Nerve maximum 5 to 6, Nerve resistance 1 to 2, Body marks 2 to 0, scars A limp removed, A bad limp added."),
            "log_type": "field", "ink_color": engine.INK_COLORS[0]}
        assert msgs[1]["payload"] == line
        seen = gm.drain()
        assert support.types(seen) == ["member_update", "activity_log"]
        assert seen[0]["payload"]["sheet_edited"] is True and seen[1]["payload"] == line
        assert support.types(wb.drain()) == ["member_status"]
    assert _roster(client, camp, support.as_gm(camp)) == {a["id"]: True, b["id"]: False}
    # The members' roster leaves the dot out: it is the Lightkeeper's
    assert _roster(client, camp, support.as_owner(b["id"])) == {a["id"]: False, b["id"]: False}


def test_the_dot_goes_when_the_lightkeeper_opens_the_sheet(client):
    """gm_sheet_seen clears sheet_edited and tells the Lightkeeper's desk alone (member_update);
    a sheet with no dot sends nothing. Only the Lightkeeper may send it."""
    camp, a, b = _member_pair(client)
    support.update(Character, a["id"], sheet_edited=True)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("gm_sheet_seen", character_id=a["id"])
        assert wa.sync() == [_rejected("Not allowed.", action="gm_sheet_seen", status=403)]
        gm.send("gm_sheet_seen", character_id=a["id"])
        seen = gm.sync()
        assert support.types(seen) == ["member_update"]
        assert seen[0]["payload"]["sheet_edited"] is False
        assert wa.drain() == []
        gm.send("gm_sheet_seen", character_id=a["id"])
        assert gm.sync() == []
    assert support.fetch(Character, a["id"]).sheet_edited is False
    assert _roster(client, camp, support.as_gm(camp))[a["id"]] is False


def test_the_rules_guide_and_never_refuse(client):
    """An edit the rules would not make (three actions at 3, an ability of another role,
    every gild) is stored: the desk warns, the server does not refuse it."""
    camp, a, b = _member_pair(client)
    changes = {"move": 3, "strike": 3, "control": 3, "specialty_ability": ["Mind Palace", "Ghostblade", "Patch Up"],
               **{f"gilded_{x}": True for x in engine.ALL_ACTIONS}}
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("edit_sheet", changes=changes)
        assert support.types(wa.sync()) == ["character_update", "activity_log", "member_status"]
    row = support.fetch(Character, a["id"])
    assert (row.move, row.strike, row.control, row.specialty_ability, row.gilded_sense) == (
        3, 3, 3, "Mind Palace; Ghostblade; Patch Up", True)


def test_a_lowered_maximum_brings_the_drive_and_its_resistance_down(client):
    """The sheet cannot show a drive or a burned resistance above the maximum: both come
    down with it, and the line says so."""
    camp, a, b = _member_pair(client, nerve_max=6, nerve_current=6, nerve_resistance_spent=2)
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("edit_sheet", changes={"nerve_max": 3})
        msgs = wa.sync()
        assert msgs[1]["payload"]["message"] == f"{a['name']}: Nerve maximum 6 to 3, Nerve 6 to 3."
    row = support.fetch(Character, a["id"])
    assert (row.nerve_max, row.nerve_current, row.nerve_resistance_spent) == (3, 3, 1)


@pytest.mark.parametrize("changes, detail", [
    (None, "An edit is the fields to change and their new values."),
    ({}, "An edit is the fields to change and their new values."),
    ({"is_dead": True}, "is_dead is not changed this way."),
    ({"campaign_id": 1}, "campaign_id is not changed this way."),
    ({"move": 4}, "Move is a rating from 0 to 3."),
    ({"sneak": "2"}, "Read is a rating from 0 to 3."),
    ({"gilded_move": 1}, "Gilded Move is yes or no."),
    ({"nerve_max": 10}, "Nerve's maximum is from 0 to 9."),
    ({"nerve_current": 4}, "Nerve is from 0 to its maximum."),
    ({"nerve_resistance_spent": 2}, "Nerve resistance burned is from 0 to a third of its maximum."),
    ({"body_marks": -1}, "Body marks are from 0 to 3."),
    ({"name": "   "}, "An investigator needs a name."),
    ({"name": "x" * 81}, "The name is text of up to 80 characters."),
    ({"role": "Bard"}, "Choose a role: Face, Muscle, Scholar, Slink, Weird."),
    ({"specialty": "Medium"}, "Choose a Slink specialty: Criminal or Detective."),
    ({"role_ability": "Juggling"}, "Choose a role or specialty ability."),
    ({"specialty_ability": "Mind Palace"}, "Abilities are a list of role and specialty abilities."),
    ({"specialty_ability": ["Scout"]}, "Each ability is listed once."),
    ({"scars_list": ["a", ""]}, "Scars are a list of descriptions."),
    ({"scars_list": ["a", "b", "c", "d"]}, "A fourth scar is taken through the scar form."),
])
def test_an_edit_the_sheet_cannot_hold_is_refused_whole(client, changes, detail):
    """Only the shape is checked: boxes the sheet prints, names the app knows, text within
    its length. A refused edit stores nothing, even its valid fields."""
    camp, a, b = _member_pair(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, a["id"]) as wa:
        payload = {} if changes is None else {"changes": {**changes, "strike": 2}} if changes else {"changes": {}}
        wa.send("edit_sheet", **payload)
        assert wa.sync() == [_rejected(detail)]
    row = support.fetch(Character, a["id"])
    assert (row.strike, row.sheet_edited) == (0, False)


def test_an_edit_that_changes_nothing_sends_nothing(client):
    camp, a, b = _member_pair(client, strike=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("edit_sheet", changes={"strike": 1, "role": "Slink"})
        assert wa.sync() == []
        assert gm.drain() == []
    assert support.fetch(Character, a["id"]).sheet_edited is False


def test_only_the_owner_edits_and_a_dead_sheet_stays_a_record(client):
    """The Lightkeeper corrects through her own messages, not this one; another player
    may not edit; a dead investigator's sheet is a record (fix round 4)."""
    camp, a, b = _member_pair(client)
    dead = support.active_member(client, camp, is_dead=True, scars_count=4, scars_list=["a", "b", "c", "d"])
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, dead["id"]) as wd:
        gm.send("edit_sheet", character_id=a["id"], changes={"strike": 2})
        assert gm.sync() == [_rejected("Not allowed.", status=403)]
        wb.send("edit_sheet", character_id=a["id"], changes={"strike": 2})
        assert wb.sync() == [_rejected("Not allowed.", status=403)]
        wd.send("edit_sheet", changes={"strike": 2})
        assert wd.sync() == [_rejected(f"{dead['name']} is dead: the sheet is a record.", status=409)]
    assert support.fetch(Character, a["id"]).strike == 0
    assert support.fetch(Character, dead["id"]).strike == 0


def test_an_investigator_with_no_lightkeeper_edits_without_a_dot(client):
    """Unaffiliated, or waiting for approval: the edit is stored and the player's own log
    has the line; there is no Lightkeeper to tell, and no dot."""
    camp = support.new_campaign(client)
    alone = support.forge(client)
    waiting = support.pending_member(client, camp)
    with support.ws_connect(client, alone["id"]) as wa, support.ws_connect(client, waiting["id"]) as ww, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("edit_sheet", changes={"name": "Ada Quill"})
        msgs = wa.sync()
        assert support.types(msgs) == ["character_update", "activity_log"]
        # Named as the sheet now has it, the old name in the change
        assert msgs[1]["payload"]["message"] == f"Ada Quill: name {alone['name']} to Ada Quill."
        ww.send("edit_sheet", changes={"strike": 1})
        assert support.types(ww.sync()) == ["character_update", "activity_log"]
        assert support.types(gm.drain()) == ["member_update"]
    assert support.fetch(Character, alone["id"]).sheet_edited is False
    assert support.fetch(Character, waiting["id"]).sheet_edited is False


def test_a_new_name_reaches_the_other_members_cards(client):
    """member_status carries the name, so the circle's cards on the other desks follow it."""
    camp, a, b = _member_pair(client)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("edit_sheet", changes={"name": "  Ada Quill "})
        wa.sync()
        [status] = wb.drain()
        assert status["payload"]["name"] == "Ada Quill"
    assert support.fetch(Character, a["id"]).name == "Ada Quill"


def test_a_drive_set_by_the_lightkeeper_puts_no_dot(client):
    """Her corrections are hers: the table's line, and no dot on the card."""
    camp, a, b = _member_pair(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("update_drive", character_id=a["id"], pool="nerve", value=1)
        gm.sync()
    assert support.fetch(Character, a["id"]).sheet_edited is False
