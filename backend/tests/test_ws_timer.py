"""The Lightkeeper's countdown beside the hourglass: gm_timer and the timer fields of
circle_update (vtt/countdown.py, vtt/ws/handlers/timer.py). The server's clock is
frozen in vtt.countdown.now_ms, so the time left is exact."""
import pytest

import support
from models import Circle
from vtt import countdown

T0 = 1_791_000_000_000  # an epoch millisecond in 2026, past INTEGER's range


@pytest.fixture
def clock(monkeypatch):
    """The server's clock, frozen at T0; clock.now moves it."""
    class Clock:
        now = T0
    monkeypatch.setattr(countdown, "now_ms", lambda: Clock.now)
    return Clock


def _campaign(client, members=1):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp) for _ in range(members)]
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp['id'])).json()["circle_id"]
    return camp, chars, cid


def _timer(payload):
    return {k: payload[k] for k in ("timer_duration_ms", "timer_remaining_ms", "timer_running", "timer_visible")}


def _rejected(status, detail):
    return {"type": "action_rejected", "payload": {"action": "gm_timer", "status": status, "detail": detail}}


def _send(gm, **payload):
    """One gm_timer from the Lightkeeper; returns the timer as the campaign is sent it."""
    gm.send("gm_timer", **payload)
    [msg] = gm.sync()
    assert msg["type"] == "circle_update"
    return _timer(msg["payload"])


def test_a_new_circle_has_no_timer(client, clock):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm:
        assert _timer(wm.initial[1]["payload"]) == {
            "timer_duration_ms": 0, "timer_remaining_ms": 0, "timer_running": False, "timer_visible": False}


def test_the_lightkeeper_sets_starts_pauses_resumes_resets_and_clears_it(client, clock):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        assert _send(gm, action="show") == {
            "timer_duration_ms": 0, "timer_remaining_ms": 0, "timer_running": False, "timer_visible": True}
        assert _send(gm, action="set", duration_ms=30_000) == {
            "timer_duration_ms": 30_000, "timer_remaining_ms": 30_000, "timer_running": False, "timer_visible": True}
        assert _send(gm, circle_id=cid, action="start")["timer_running"] is True
        row = support.fetch(Circle, cid)
        assert (row.timer_ends_at, row.timer_running) == (T0 + 30_000, True)
        # Paused 12.5 seconds in
        clock.now = T0 + 12_500
        assert _send(gm, action="pause") == {
            "timer_duration_ms": 30_000, "timer_remaining_ms": 17_500, "timer_running": False, "timer_visible": True}
        # A paused timer stands still however long it waits
        clock.now = T0 + 600_000
        assert _send(gm, action="pause")["timer_remaining_ms"] == 17_500
        # Resumed: it runs on from where it stood
        assert _send(gm, action="start") == {
            "timer_duration_ms": 30_000, "timer_remaining_ms": 17_500, "timer_running": True, "timer_visible": True}
        assert support.fetch(Circle, cid).timer_ends_at == T0 + 600_000 + 17_500
        clock.now += 5_000
        assert _send(gm, action="reset") == {
            "timer_duration_ms": 30_000, "timer_remaining_ms": 30_000, "timer_running": False, "timer_visible": True}
        assert _send(gm, action="start")["timer_remaining_ms"] == 30_000
        assert _send(gm, action="clear") == {
            "timer_duration_ms": 0, "timer_remaining_ms": 0, "timer_running": False, "timer_visible": True}
        # The player's desk was sent every change, as the Lightkeeper's was
        seen = wm.drain()
        assert support.types(seen) == ["circle_update"] * 9
        assert _timer(seen[-1]["payload"])["timer_duration_ms"] == 0
    row = support.fetch(Circle, cid)
    assert (row.timer_duration_ms, row.timer_remaining_ms, row.timer_ends_at, row.timer_running) == (0, 0, None, False)


def test_set_stops_a_running_timer_at_the_new_duration(client, clock):
    camp, _, cid = _campaign(client, members=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        _send(gm, action="set", duration_ms=60_000)
        _send(gm, action="start")
        clock.now += 10_000
        assert _send(gm, action="set", duration_ms=5_000) == {
            "timer_duration_ms": 5_000, "timer_remaining_ms": 5_000, "timer_running": False, "timer_visible": False}
    assert support.fetch(Circle, cid).timer_ends_at is None


def test_show_and_hide(client, clock):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        _send(gm, action="set", duration_ms=90_000)
        _send(gm, action="start")
        assert _send(gm, action="show")["timer_visible"] is True
        clock.now += 1_000
        # Hiding it leaves it running
        assert _send(gm, action="hide") == {
            "timer_duration_ms": 90_000, "timer_remaining_ms": 89_000, "timer_running": True, "timer_visible": False}
        assert [_timer(m["payload"])["timer_visible"] for m in wm.drain()] == [False, False, True, False]
    assert support.fetch(Circle, cid).timer_visible is False


def test_the_time_left_is_counted_from_the_end_whenever_a_desk_connects(client, clock):
    """A desk that connects or reconnects mid-countdown is sent the time left as of
    then, and once the end has passed, 0 and not running (nothing on the server wakes
    at the end)."""
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        _send(gm, action="show")
        _send(gm, action="set", duration_ms=30_000)
        _send(gm, action="start")
    for at, left, running in ((12_300, 17_700, True), (29_999, 1, True), (30_000, 0, False), (95_000, 0, False)):
        clock.now = T0 + at
        with support.ws_connect(client, member["id"]) as wm:
            assert _timer(wm.initial[1]["payload"]) == {
                "timer_duration_ms": 30_000, "timer_remaining_ms": left, "timer_running": running, "timer_visible": True}
    # Paused after its end it stands at 0, and started again it runs the whole duration
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        assert _send(gm, action="pause")["timer_remaining_ms"] == 0
        assert _send(gm, action="start") == {
            "timer_duration_ms": 30_000, "timer_remaining_ms": 30_000, "timer_running": True, "timer_visible": True}
    assert support.fetch(Circle, cid).timer_ends_at == T0 + 95_000 + 30_000


def test_a_player_cannot_run_the_timer(client, clock):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, member["id"]) as wm, support.ws_connect(client, camp["campaign_code"]) as gm:
        for payload in ({"action": "show"}, {"action": "set", "duration_ms": 5_000}, {"action": "start"},
                        {"action": "show", "role": "GM", "circle_id": cid}):
            wm.send("gm_timer", **payload)
            assert wm.recv() == {"type": "action_rejected", "payload": {
                "action": "gm_timer", "status": 403, "detail": "Not allowed."}}
        assert gm.drain() == []
    row = support.fetch(Circle, cid)
    assert (row.timer_duration_ms, row.timer_running, row.timer_visible) == (0, False, False)


@pytest.mark.parametrize("duration", [0, 999, 10_800_001, -5_000, 1.5, 60_000.0, "60000", True, None, [60_000]])
def test_a_bad_duration_is_refused(client, clock, duration):
    camp, (member,), cid = _campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        _send(gm, action="set", duration_ms=60_000)
        wm.drain()
        gm.send("gm_timer", action="set", duration_ms=duration)
        assert gm.sync() == [_rejected(422, "A timer runs from 1 second to 3 hours.")]
        assert wm.drain() == []
    assert support.fetch(Circle, cid).timer_duration_ms == 60_000


def test_the_limits_are_one_second_and_three_hours(client, clock):
    camp, _, _ = _campaign(client, members=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        assert _send(gm, action="set", duration_ms=1_000)["timer_remaining_ms"] == 1_000
        assert _send(gm, action="set", duration_ms=10_800_000)["timer_remaining_ms"] == 10_800_000


def test_an_unknown_action_or_a_start_without_a_duration_is_refused(client, clock):
    camp, _, cid = _campaign(client, members=0)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        for action in ("explode", None, "", ["start"], {"a": 1}, 3, "START"):
            gm.send("gm_timer", action=action)
        gm.send("gm_timer")
        assert gm.sync() == [_rejected(422, "Unknown timer action.")] * 8
        gm.send("gm_timer", action="start")
        assert gm.sync() == [_rejected(409, "The timer has no duration yet.")]
        assert support.server_sockets(camp["campaign_code"])
    row = support.fetch(Circle, cid)
    assert (row.timer_duration_ms, row.timer_running, row.timer_ends_at) == (0, False, None)


def test_another_campaigns_circle_is_untouched(client, clock):
    camp_a, _, cid_a = _campaign(client, members=0)
    camp_b, (member_b,), cid_b = _campaign(client)
    with support.ws_connect(client, camp_a["campaign_code"]) as gm_a, \
            support.ws_connect(client, camp_b["campaign_code"]) as gm_b, \
            support.ws_connect(client, member_b["id"]) as wb:
        for payload in ({"action": "set", "duration_ms": 5_000}, {"action": "show"}, {"action": "start"}):
            gm_a.send("gm_timer", circle_id=cid_b, **payload)
            assert gm_a.sync() == [{"type": "action_rejected", "payload": {
                "action": "gm_timer", "status": 403, "detail": "Not allowed."}}]
        gm_a.send("gm_timer", circle_id=1, action="show")
        assert gm_a.sync()[0]["payload"]["status"] == 403
        # Its own circle's change reaches only its own campaign
        _send(gm_a, action="show")
        assert gm_b.drain() == [] and wb.drain() == []
    row_b = support.fetch(Circle, cid_b)
    assert (row_b.timer_duration_ms, row_b.timer_running, row_b.timer_visible) == (0, False, False)
    assert support.fetch(Circle, cid_a).timer_visible is True
    assert support.fetch(Circle, 1).timer_visible in (False, None)
