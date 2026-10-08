"""The Lightkeeper's countdown timer, shown beside the hourglass (the tension clock).

The circle keeps the duration the Lightkeeper set, whether the timer runs and whether
the desks show it, and either the time left (while it stands still) or the moment it
ends (while it runs, in epoch milliseconds by the server's clock). A desk is sent the
time left as it is when the message is built (timer_fields), never the end, and counts
down from that and the moment it arrived, so a desk that connects mid-countdown shows
the right time whatever its own clock says. Nothing on the server wakes when a timer
ends: one whose end has passed is sent as 0 and not running.

The gm_timer message (vtt/ws/handlers/timer.py) changes it with one of ACTIONS."""
import time

MIN_MS = 1_000                # one second
MAX_MS = 3 * 60 * 60 * 1_000  # three hours

# set (with a duration: stopped at that duration), start (from the time left, or from the
# whole duration once it has run out; a paused timer resumes), pause, reset (stopped at
# the duration), clear (no timer), show and hide (on the players' desks and the
# Lightkeeper's alike)
ACTIONS = ("set", "start", "pause", "reset", "clear", "show", "hide")


def now_ms() -> int:
    """The server's clock in epoch milliseconds (the tests freeze it here)."""
    return int(time.time() * 1000)


def valid_duration(value) -> bool:
    """A whole number of milliseconds from one second to three hours (not a bool, a
    float or a string)."""
    return type(value) is int and MIN_MS <= value <= MAX_MS


def time_left(circle, now: int) -> int:
    """Milliseconds left at `now`: to the end while it runs, else as it stood."""
    if getattr(circle, "timer_running", False) and getattr(circle, "timer_ends_at", None) is not None:
        return max(0, circle.timer_ends_at - now)
    return max(0, getattr(circle, "timer_remaining_ms", None) or 0)


def timer_fields(circle) -> dict:
    """The timer as get_circle_dict sends it: the duration set (0 for none), the time
    left now, whether it is running (a timer whose end has passed is not) and whether
    the desks show it."""
    left = time_left(circle, now_ms())
    return {
        "timer_duration_ms": getattr(circle, "timer_duration_ms", None) or 0,
        "timer_remaining_ms": left,
        "timer_running": bool(getattr(circle, "timer_running", False)) and left > 0,
        "timer_visible": bool(getattr(circle, "timer_visible", False)),
    }


def _stand(circle, left: int):
    circle.timer_remaining_ms = left
    circle.timer_running = False
    circle.timer_ends_at = None


def apply_action(circle, action: str, duration_ms=None):
    """Changes the circle's timer for one of ACTIONS (checked by the caller, with a
    valid duration for set and a duration already set for start)."""
    now = now_ms()
    left = time_left(circle, now)
    if action == "set":
        circle.timer_duration_ms = duration_ms
        _stand(circle, duration_ms)
    elif action == "start":
        circle.timer_ends_at = now + (left or circle.timer_duration_ms)
        circle.timer_remaining_ms = 0
        circle.timer_running = True
    elif action == "pause":
        _stand(circle, left)
    elif action == "reset":
        _stand(circle, circle.timer_duration_ms or 0)
    elif action == "clear":
        circle.timer_duration_ms = 0
        _stand(circle, 0)
    elif action in ("show", "hide"):
        circle.timer_visible = action == "show"
