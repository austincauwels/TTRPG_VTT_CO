"""member_update: every change to a character on a campaign's roster reaches that
campaign's GM socket with the whole sheet, so the Lightkeeper's roster and open sheet
follow it live (vtt/ws/manager.py, broadcast). The players' sockets never get it, and
no other campaign's GM does."""
import support
from models import Character, Circle


def _members(client, **fields):
    camp = support.new_campaign(client)
    return camp, support.active_member(client, camp, **fields), support.active_member(client, camp)


def _sheets(frames):
    """The sheets of the member_update frames among frames."""
    return [m["payload"] for m in support.of_type(frames, "member_update")]


def test_a_drive_spent_or_recovered_reaches_the_gm_and_no_other_player(client):
    camp, a, b = _members(client, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("update_drive", pool="nerve", value=1)
        [own] = wa.sync()
        # The GM gets the sheet the player's own desk got
        assert gm.drain() == [{"type": "member_update", "payload": own["payload"]}]
        assert set(own["payload"]) == support.CHAR_DICT_KEYS
        wa.send("update_drive", pool="nerve", value=3)
        wa.sync()
        assert [(s["id"], s["nerve_current"]) for s in _sheets(gm.drain())] == [(a["id"], 3)]
        assert wb.drain() == []


def test_a_roll_and_a_resistance_burned_or_refreshed_reach_the_gm(client, dice):
    """A roll and a burn tell the roller with roll_result, which carries the sheet; a
    Refresh tells them with character_update (rulebook pp. 13 and 41)."""
    camp, a, b = _members(client, move=1, nerve_max=3, nerve_current=3)
    dice(2, 1, 4)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        # The circle opens its resources (it is made when the first socket opens)
        support.update(Circle, support.campaign_circle(camp["id"]).id, resources_editable=True, refresh=1)
        wa.send("roll", action="move", drive_spent=1)
        wa.sync()
        seen = gm.drain()
        assert support.types(seen) == ["member_update", "dice_thrown", "activity_log"]
        assert seen[0]["payload"]["nerve_current"] == 2
        wa.send("burn_resistance", action="move")
        wa.sync()
        seen = gm.drain()
        assert support.types(seen) == ["member_update", "dice_thrown", "activity_log"]
        assert seen[0]["payload"]["nerve_resistance_spent"] == 1
        wa.send("spend_resource", resource_type="refresh")
        wa.sync()
        [sheet] = _sheets(gm.drain())
        assert (sheet["nerve_current"], sheet["nerve_resistance_spent"]) == (3, 0)
        assert _sheets(wb.drain()) == []


def test_marks_scars_and_incapacitation_reach_the_gm(client):
    camp, a, b = _members(client, body_marks=2, move=1)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("take_mark", mark_type="body")
        wa.sync()
        assert [s["body_marks"] for s in _sheets(gm.drain())] == [3]
        # The fourth mark: trigger_scar carries the sheet (p. 14)
        wa.send("take_mark", mark_type="body")
        wa.sync()
        [sheet] = _sheets(gm.drain())
        assert (sheet["body_marks"], sheet["incapacitated"]) == (0, True)
        wa.send("apply_scar", scar_text="A limp", shift_down="move", shift_up="strike")
        wa.sync()
        [sheet] = _sheets(gm.drain())
        assert (sheet["scars_list"], sheet["move"], sheet["strike"]) == (["A limp"], 0, 1)
        assert _sheets(wb.drain()) == []


def test_a_change_one_member_makes_to_another_shows_both_sheets(client):
    """Behind Me (p. 28): the ally takes the mark, from their own socket, and both
    sheets reach the GM."""
    camp = support.new_campaign(client)
    hurt = support.active_member(client, camp)
    guard = support.active_member(client, camp, nerve_current=1, role_ability="Behind Me")
    with support.ws_connect(client, hurt["id"]) as wh, support.ws_connect(client, guard["id"]) as wg, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wh.send("take_mark", mark_type="body")
        wh.sync()
        gm.drain()
        wg.send("intercept_mark", ability="Behind Me", target_character_id=hurt["id"], mark_type="body")
        wg.sync()
        sheets = _sheets(gm.drain())
        assert [(s["id"], s["body_marks"], s["nerve_current"]) for s in sheets] == [
            (hurt["id"], 0, 1), (guard["id"], 1, 0)]


def test_the_gms_own_change_reaches_its_socket_with_the_player_away(client):
    camp, a, b = _members(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        gm.send("gm_update_tension", character_id=a["id"], mark_type="brain", value=2)
        [sheet] = _sheets(gm.sync())
        assert (sheet["id"], sheet["brain_marks"]) == (a["id"], 2)


def test_a_pending_applicant_reaches_its_gm_and_a_retired_character_does_not(client):
    """The GM sees the sheets on the campaign's roster, as GET .../roster lists them:
    active members and pending applicants. A retired character keeps its campaign_id
    but is no longer the GM's to see change."""
    camp = support.new_campaign(client)
    applicant = support.pending_member(client, camp, nerve_max=3, nerve_current=3)
    veteran = support.active_member(client, camp, nerve_max=3, nerve_current=3)
    support.update(Character, veteran["id"], status="retired")
    with support.ws_connect(client, applicant["id"]) as wp, support.ws_connect(client, veteran["id"]) as wv, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wp.send("update_drive", pool="nerve", value=2)
        wp.sync()
        wv.send("update_drive", pool="nerve", value=2)
        wv.sync()
        assert [(s["id"], s["status"]) for s in _sheets(gm.drain())] == [(applicant["id"], "pending")]


def test_a_character_outside_the_campaign_sends_its_gm_nothing(client):
    camp, a, b = _members(client)
    loner = support.forge(client, nerve_max=3, nerve_current=3)   # no campaign
    other_camp = support.new_campaign(client)
    elsewhere = support.active_member(client, other_camp, nerve_max=3, nerve_current=3)
    with support.ws_connect(client, loner["id"]) as wl, support.ws_connect(client, elsewhere["id"]) as we, \
            support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, other_camp["campaign_code"]) as other_gm:
        wl.send("update_drive", pool="nerve", value=1)
        wl.sync()
        we.send("update_drive", pool="nerve", value=1)
        we.sync()
        assert gm.drain() == []
        # Only the GM of the campaign the character is in
        assert [s["id"] for s in _sheets(other_gm.drain())] == [elsewhere["id"]]
