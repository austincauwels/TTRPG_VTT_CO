"""An assignment's paperwork on the circle: the players' assignment reports.

They live in the circle's backstory_answers JSON (where the reports always were), under
"reports" ({character id: {character_name, responses, submitted_at}}), with
"assignment", the number of the assignment they belong to (1 until the first End
Assignment). End Assignment closes the reports and clears them (clear_paperwork), so the
next assignment starts on blank forms, and a desk drops the reports it holds when the
assignment number changes.

A report is the investigator's own account, so it goes to the Lightkeeper and to its
author only: get_circle_dict leaves the reports out, and the circle-creation-state route
gives a member their own report alone (playtest, 2026-10-09: every desk was sent every
report).
"""
import json

REPORTS, ASSIGNMENT = "reports", "assignment"


def answers_of(circle) -> dict:
    """A new dict of the circle's backstory_answers, whatever the column holds. Changes are
    written back as a new dict: the JSON column does not see a dict changed in place."""
    raw = getattr(circle, "backstory_answers", None)
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = None
    return dict(raw) if isinstance(raw, dict) else {}


def reports_of(answers: dict) -> dict:
    """The filed reports, by character id as text."""
    raw = answers.get(REPORTS)
    return dict(raw) if isinstance(raw, dict) else {}


def without_reports(answers: dict) -> dict:
    return {key: value for key, value in answers.items() if key != REPORTS}


def assignment_number(answers: dict) -> int:
    n = answers.get(ASSIGNMENT)
    return n if type(n) is int and n > 0 else 1


def clear_paperwork(circle):
    """End Assignment: the reports close and the assignment's reports go."""
    answers = answers_of(circle)
    answers.pop(REPORTS, None)
    answers[ASSIGNMENT] = assignment_number(answers) + 1
    circle.backstory_answers = answers
    circle.reports_open = False
