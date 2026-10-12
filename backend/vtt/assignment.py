"""An assignment's paperwork on the circle: the players' assignment reports.

They live in the circle's backstory_answers JSON (where the reports always were), under
"reports" ({character id: {character_name, responses, submitted_at, and note when the
report has a line on what happened}}), with
"assignment", the number of the assignment they belong to (1 until the first End
Assignment), and "tally", the Lightkeeper's three answers to the circle's questions and
the Illumination the reports added ({answers: [bool, bool, bool], added: int or None}),
kept here so every desk sees the tally added once (playtest, illumination-tally-added-twice:
it lived in one browser, and a second tab added it again). End Assignment closes the
reports and clears them and the tally (clear_paperwork), so the next assignment starts on
blank forms, and a desk drops the reports it holds when the assignment number changes.

A report is the investigator's own account, so it goes to the Lightkeeper and to its
author only: get_circle_dict leaves the reports out, and the circle-creation-state route
gives a member their own report alone (playtest, 2026-10-09: every desk was sent every
report).
"""
import json

REPORTS, ASSIGNMENT, TALLY = "reports", "assignment", "tally"


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


def tally_of(answers: dict) -> dict:
    """The assignment's tally, blank when there is none or it is not one."""
    raw = answers.get(TALLY)
    raw = raw if isinstance(raw, dict) else {}
    ticks = raw.get("answers")
    ticks = [t is True for t in ticks] if isinstance(ticks, list) and len(ticks) == 3 else [False] * 3
    added = raw.get("added")
    return {"answers": ticks, "added": added if type(added) is int else None}


def clear_paperwork(circle):
    """End Assignment: the reports close and the assignment's reports and tally go."""
    answers = answers_of(circle)
    answers.pop(REPORTS, None)
    answers.pop(TALLY, None)
    answers[ASSIGNMENT] = assignment_number(answers) + 1
    circle.backstory_answers = answers
    circle.reports_open = False


def end_assignment_for(character):
    """What End Assignment resets on an investigator: the ability uses, the circle spends
    and the Train dice of the assignment, and the gear, which "Gear slots only reset once
    an assignment is complete" (rulebook p. 52). Retiring a campaign ends its assignment
    too, for each investigator it lets go: one who joined another campaign started there
    with the spends and uses of the old one (final check of playtest 2)."""
    character.ability_uses = {}
    character.resources_spent_assignment = 0
    character.train_bonus = False
    character.train_dice = 0
    character.gear = []
