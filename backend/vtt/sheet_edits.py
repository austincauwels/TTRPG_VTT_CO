"""A player's direct edits to their own sheet (decision 1 of fix round 5, issue #64):
detection, not prevention.

A player may change everything on their own sheet at any time: the name and the other
words, the role and specialty, the abilities, the action ratings and gilds, the drives
and their maximums, the resistances, the marks and the scars (edit_sheet), and the gear
(update_gear). Nothing they edit is refused for the rules' sake; the desk shows the
maximums and warns softly. What is checked here is only what the sheet can hold: whole
numbers within the boxes the sheet prints, names the app knows, text within a length.

Each edit writes one line naming the investigator and each change from what to what
(vtt/ws/handlers/character.py record_edit): to the whole table while the character is an
active member, so the Lightkeeper's log has it, or to the player's own log otherwise.
It sets sheet_edited,
the dot on the member's roster card, until the Lightkeeper opens the sheet.

A fourth scar is not written in here: it is fatal (rulebook p. 74), and it comes through
the scar form, as every death does.
"""
from collections import Counter

from engine import ALL_ACTIONS, DRIVE_MAX
from vtt.ability_uses import DRIVES
from vtt.abilities import ONE_STEP_AHEAD
from vtt.creation import ACTION_LABELS, ALL_ABILITIES, ROLES
from vtt.ws.access import SCAR_TEXT_MAX

# The words on the sheet, each with the longest the edit keeps
TEXT_FIELDS = {"name": 80, "pronouns": 60, "style": 2000, "catalyst": 2000, "question": 2000}
ACTION_MAX = 3
MARK_MAX = 3
# Scars written in by an edit: three at most, as the fourth is a death
EDIT_SCARS_MAX = 3
ABILITIES_MAX = 30
MARK_FIELDS = tuple(f"{t}_marks" for t in ("body", "brain", "bleed"))
EDIT_FIELDS = frozenset(
    {*TEXT_FIELDS, "role", "specialty", "role_ability", "specialty_ability", "scars_list",
     *ALL_ACTIONS, *(f"gilded_{a}" for a in ALL_ACTIONS), *MARK_FIELDS,
     *(f"{d}_{part}" for d in DRIVES for part in ("max", "current", "resistance_spent"))})

# What a direct edit's log line clips each value to
SHOWN_MAX = 40


def _whole(value, low, high) -> bool:
    return type(value) is int and low <= value <= high


def _ability_list(value):
    """specialty_ability as a list of names (the column keeps them joined by "; ")."""
    if isinstance(value, list):
        return value
    return [p.strip() for p in str(value or "").split(";") if p.strip() and p.strip() != "None"]


def edit_problem(character, changes) -> str | None:
    """Why this edit cannot be stored, in words for the player, or None. Only the shape is
    checked, never the rules."""
    if not isinstance(changes, dict) or not changes:
        return "An edit is the fields to change and their new values."
    unknown = sorted(k for k in changes if k not in EDIT_FIELDS)
    if unknown:
        return f"{unknown[0]} is not changed this way."
    for key, longest in TEXT_FIELDS.items():
        if key in changes:
            value = changes[key]
            if not isinstance(value, str) or len(value.strip()) > longest:
                return f"The {key} is text of up to {longest} characters."
    if "name" in changes and not changes["name"].strip():
        return "An investigator needs a name."
    role = changes.get("role", getattr(character, "role", ""))
    # A role or specialty that is not text is refused like an unknown one: a list or an
    # object here must not end the sender's socket with a TypeError
    if "role" in changes and (not isinstance(role, str) or role not in ROLES):
        return "Choose a role: " + ", ".join(ROLES) + "."
    if "specialty" in changes or "role" in changes:
        specialty = changes.get("specialty", getattr(character, "specialty", ""))
        allowed = ROLES[role]["specialties"] if role in ROLES else \
            {s for r in ROLES.values() for s in r["specialties"]}
        if not isinstance(specialty, str) or specialty not in allowed:
            return f"Choose a {role} specialty: " + " or ".join(allowed) + "." if role in ROLES \
                else "Choose a specialty."
    # A name the sheet already holds stays, known to the app today or not
    held = _abilities_in_order(character)

    def known(name):
        return isinstance(name, str) and (name in ALL_ABILITIES or name in held)

    if "role_ability" in changes and not known(changes["role_ability"]):
        return "Choose a role or specialty ability."
    if "specialty_ability" in changes:
        names = changes["specialty_ability"]
        if not isinstance(names, list) or len(names) > ABILITIES_MAX or not all(known(n) for n in names):
            return "Abilities are a list of role and specialty abilities."
    if "role_ability" in changes or "specialty_ability" in changes:
        names = [changes.get("role_ability", getattr(character, "role_ability", None))] + \
            _ability_list(changes.get("specialty_ability", getattr(character, "specialty_ability", None)))
        names = [n for n in names if n and n != "None"]
        if len(names) != len(set(names)):
            return "Each ability is listed once."
    for act in ALL_ACTIONS:
        if act in changes and not _whole(changes[act], 0, ACTION_MAX):
            return f"{ACTION_LABELS[act]} is a rating from 0 to {ACTION_MAX}."
        if f"gilded_{act}" in changes and type(changes[f"gilded_{act}"]) is not bool:
            return f"Gilded {ACTION_LABELS[act]} is yes or no."
    for drive in DRIVES:
        # Only the drives the edit names: a stored value is not this edit's to check
        if not any(f"{drive}_{part}" in changes for part in ("max", "current", "resistance_spent")):
            continue
        top = changes.get(f"{drive}_max", getattr(character, f"{drive}_max", 0) or 0)
        if f"{drive}_max" in changes and not _whole(top, 0, DRIVE_MAX):
            return f"{drive.capitalize()}'s maximum is from 0 to {DRIVE_MAX}."
        if f"{drive}_current" in changes and not _whole(changes[f"{drive}_current"], 0, top):
            return f"{drive.capitalize()} is from 0 to its maximum."
        if f"{drive}_resistance_spent" in changes and not _whole(changes[f"{drive}_resistance_spent"], 0, top // 3):
            return f"{drive.capitalize()} resistance burned is from 0 to a third of its maximum."
    for field in MARK_FIELDS:
        if field in changes and not _whole(changes[field], 0, MARK_MAX):
            return f"{field.split('_')[0].capitalize()} marks are from 0 to {MARK_MAX}."
    if "scars_list" in changes:
        scars = changes["scars_list"]
        if not isinstance(scars, list) or not all(isinstance(s, str) and s.strip() for s in scars):
            return "Scars are a list of descriptions."
        # A scar the sheet already holds keeps its length (as gm_update_scars)
        if any(len(s.strip()) > SCAR_TEXT_MAX and s not in _scars_of(character) for s in scars):
            return f"A scar is a description of up to {SCAR_TEXT_MAX} characters."
        if len(scars) > EDIT_SCARS_MAX:
            return "A fourth scar is taken through the scar form."
    return None


def _shown(value) -> str:
    text = " ".join(str(value or "").split())
    if not text:
        return "nothing"
    return text if len(text) <= SHOWN_MAX else text[:SHOWN_MAX].rstrip() + "..."


def _changed_part(old, new) -> tuple:
    """A text change as the log shows it, (old, new): whole when both fit SHOWN_MAX, else
    only the words that differ, with one word of context each side and "..." where words
    are left out, each side then clipped to SHOWN_MAX. Both used to be cut at the same 40
    characters, so a change further on read as none (playtest 4,
    edit-sheet-log-truncates-identically)."""
    a, b = " ".join(str(old or "").split()), " ".join(str(new or "").split())
    if not a or not b or (len(a) <= SHOWN_MAX and len(b) <= SHOWN_MAX):
        return _shown(a), _shown(b)
    wa, wb = a.split(" "), b.split(" ")
    start = 0
    while start < min(len(wa), len(wb)) and wa[start] == wb[start]:
        start += 1
    end = 0
    while end < min(len(wa), len(wb)) - start and wa[-1 - end] == wb[-1 - end]:
        end += 1
    start, end = max(0, start - 1), max(0, end - 1)

    def part(words):
        middle = " ".join(words[start:len(words) - end])
        cut = len(middle) > SHOWN_MAX
        middle = middle[:SHOWN_MAX].rstrip() if cut else middle
        return ("..." if start else "") + middle + ("..." if end or cut else "")
    return part(wa), part(wb)


def _scars_of(character) -> list:
    raw = getattr(character, "scars_list", None)
    return [s for s in raw if isinstance(s, str)] if isinstance(raw, list) else []


def _abilities_in_order(character) -> list:
    role = getattr(character, "role_ability", None)
    return ([role] if role and role != "None" else []) + _ability_list(getattr(character, "specialty_ability", None))


def _added_removed(label, before, after) -> str | None:
    """'gear Lantern removed, Revolver added', or None when the two lists hold the same."""
    gone = list((Counter(before) - Counter(after)).elements())
    new = list((Counter(after) - Counter(before)).elements())
    if not gone and not new:
        return None
    parts = [f"{_shown(x)} removed" for x in gone] + [f"{_shown(x)} added" for x in new]
    return f"{label} " + ", ".join(parts)


def gear_name(item: str) -> str:
    """A gear item as the sheet shows it (One Step Ahead's object under its own name)."""
    return item[len(ONE_STEP_AHEAD):] if item.startswith(ONE_STEP_AHEAD) else item


def gear_change(before: list, after: list) -> str | None:
    """A gear edit in words: 'gear Lantern removed, Revolver added'."""
    return _added_removed("gear", [gear_name(i) for i in before], [gear_name(i) for i in after])


def _resistance_left(character, drive) -> int:
    return max(0, (getattr(character, f"{drive}_max", 0) or 0) // 3 - (getattr(character, f"{drive}_resistance_spent", 0) or 0))


def _snapshot(character) -> dict:
    snap = {key: getattr(character, key, None) for key in (*TEXT_FIELDS, "role", "specialty", *ALL_ACTIONS,
                                                           *(f"gilded_{a}" for a in ALL_ACTIONS), *MARK_FIELDS)}
    for drive in DRIVES:
        snap[f"{drive}_max"] = getattr(character, f"{drive}_max", 0) or 0
        snap[f"{drive}_current"] = getattr(character, f"{drive}_current", 0) or 0
        snap[f"{drive}_resist"] = _resistance_left(character, drive)
    snap["abilities"] = _abilities_in_order(character)
    snap["scars"] = _scars_of(character)
    return snap


def apply_edit(character, changes: dict) -> list:
    """Stores an edit edit_problem accepted and returns what changed, in words, in the
    sheet's order (empty when nothing did). A drive's amount and its burned resistance
    come down with a lowered maximum, as the sheet cannot show them above it."""
    before = _snapshot(character)
    for key, value in changes.items():
        if key in TEXT_FIELDS:
            value = value.strip()
        if key == "specialty_ability":
            value = "; ".join(value) if value else "None"
        if key == "scars_list":
            value = [s.strip() for s in value]
            character.scars_count = len(value)
        setattr(character, key, value)
    for drive in DRIVES:
        top = getattr(character, f"{drive}_max", 0) or 0
        if (getattr(character, f"{drive}_current", 0) or 0) > top:
            setattr(character, f"{drive}_current", top)
        if (getattr(character, f"{drive}_resistance_spent", 0) or 0) > top // 3:
            setattr(character, f"{drive}_resistance_spent", top // 3)
    after = _snapshot(character)

    said = []

    def text_change(key, label=None):
        if (before[key] or "") != (after[key] or ""):
            old, new = _changed_part(before[key], after[key])
            said.append(f"{label or key} {old} to {new}")

    text_change("name")
    text_change("pronouns")
    text_change("role")
    text_change("specialty")
    abilities = _added_removed("abilities", before["abilities"], after["abilities"])
    if abilities:
        said.append(abilities)
    for act in ALL_ACTIONS:
        label = ACTION_LABELS[act]
        if (before[act] or 0) != (after[act] or 0):
            said.append(f"{label} {before[act] or 0} to {after[act] or 0}")
        if bool(before[f"gilded_{act}"]) != bool(after[f"gilded_{act}"]):
            said.append(f"{label} gilded" if after[f"gilded_{act}"] else f"{label} no longer gilded")
    for drive in DRIVES:
        name = drive.capitalize()
        for key, label in ((f"{drive}_max", f"{name} maximum"), (f"{drive}_current", name),
                           (f"{drive}_resist", f"{name} resistance")):
            if before[key] != after[key]:
                said.append(f"{label} {before[key]} to {after[key]}")
    for field in MARK_FIELDS:
        if (before[field] or 0) != (after[field] or 0):
            said.append(f"{field.split('_')[0].capitalize()} marks {before[field] or 0} to {after[field] or 0}")
    scars = _added_removed("scars", before["scars"], after["scars"])
    if scars:
        said.append(scars)
    for key in ("style", "catalyst", "question"):
        text_change(key)
    return said
