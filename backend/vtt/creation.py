"""The character creator's rules, checked on the server when an investigator is forged
(RULES_CHECK.md item 15). The creator (frontend/src/components/CharacterCreator.jsx)
holds the same table with each ability's text; tests/test_creation.py checks that the
two agree.

A new investigator (rulebook p. 25 and 26):
- takes a role and one of its two specialties, one of the role's abilities and one of
  the specialty's;
- starts with the specialty's action ratings, raises one action that starts at 0 to 1,
  then adds 3 more points, with no action above 2;
- starts with the specialty's 3 drive points and adds 6 more, with no drive above 6, at
  full drive and with no resistance spent;
- gilds the specialty's action and one other;
- takes up to 3 items from the specialty's gear and the standard issue;
- has no marks or scars.
"""
from engine import ALL_ACTIONS

DRIVES = ("nerve", "cunning", "intuition")
RAISE_POINTS = 1 + 3   # the raise of a zero action, then 3 free points
ACTION_START_MAX = 2
DRIVE_POINTS = 6
DRIVE_START_MAX = 6
GEAR_MAX = 3
STANDARD_GEAR = ("Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern",
                 "Matches & Candles", "First Aid Kit")

# The players' names for the actions (sneak is labelled Read and read is Focus)
ACTION_LABELS = {"move": "Move", "strike": "Strike", "control": "Control", "sway": "Sway",
                 "sneak": "Read", "hide": "Hide", "survey": "Survey", "read": "Focus", "sense": "Sense"}


def _specialty(actions, drives, gilded, gear, abilities):
    return {"actions": actions, "drives": drives, "gilded": gilded, "gear": gear, "abilities": abilities}


ROLES = {
    "Face": {
        "abilities": ("I Know a Guy", "Sweet Talk", "Cool Under Pressure"),
        "specialties": {
            "Journalist": _specialty(
                {"sneak": 1, "survey": 2, "read": 1, "sense": 1}, {"cunning": 3}, "survey",
                ("Press Credentials", "Camera", "Hidden Recording Device"),
                ("Insider Access", "Open Book", "Lie Detector", "Press Conference", "In the Trenches", "Well-Researched")),
            "Magician": _specialty(
                {"sway": 2, "sneak": 1, "hide": 1, "read": 1}, {"cunning": 1, "intuition": 2}, "sway",
                ("Flash Powder", "Lockpicks", "Trick Deck of Cards"),
                ("Misdirection", "Escape Artist", "Practiced Patter", "Uncanny Eye", "Flourish", "The Prestige")),
        },
    },
    "Muscle": {
        "abilities": ("Behind Me", "Adrenaline Rush", "Endurance"),
        "specialties": {
            "Explorer": _specialty(
                {"move": 1, "strike": 2, "survey": 1, "read": 1}, {"nerve": 3}, "move",
                ("Heavy Climbing Gear", "Machete", "Vintage Map Collection"),
                ("Obscure Lexicon", "Field Experience", "Mind Over Matter", "Tenacious", "Narrow Escape", "Not Again")),
            "Soldier": _specialty(
                {"move": 2, "strike": 2, "control": 1}, {"nerve": 1, "intuition": 2}, "strike",
                ("Heavy Firearm", "Tactical Armor", "Trench Whistle"),
                ("Basic Training", "Geared Up", "Sharpshooter", "Tactician", "Compartmentalization", "Volunteer Duty")),
        },
    },
    "Scholar": {
        "abilities": ("Well-Read", "Occult Researcher", "Meticulous Notes"),
        "specialties": {
            "Doctor": _specialty(
                {"control": 1, "sneak": 1, "survey": 1, "read": 2}, {"intuition": 3}, "read",
                ("Surgical Tools", "Heavy Sedatives", "Medical Journals"),
                ("Patch Up", "Non-Combatant", "Dissection", "Resuscitation", "Lifesaver", "Anatomical Strike")),
            "Professor": _specialty(
                {"sway": 1, "survey": 2, "read": 2}, {"cunning": 2, "intuition": 1}, "read",
                ("Thick Reference Tome", "Chemical Kit", "University Keys"),
                ("Steel Mind", "University Resources", "Learn from My Mistakes", "Better Part of Valor", "Verbose",
                 "Chemical Concoction")),
        },
    },
    "Slink": {
        "abilities": ("Scout", "Saw This Coming", "Death Defy"),
        "specialties": {
            "Criminal": _specialty(
                {"control": 1, "hide": 2, "survey": 1, "read": 1}, {"nerve": 1, "cunning": 2}, "hide",
                ("Advanced Lockpicks", "Forged Documents", "Concealed Blade"),
                ("Street Smarts", "Leverage", "Hardened", "Born in the Shadows", "Tricks of the Trade", "Sticky Fingers")),
            "Detective": _specialty(
                {"control": 1, "hide": 1, "survey": 2, "read": 1}, {"nerve": 2, "cunning": 1}, "control",
                ("Magnifying Glass", "Evidence Bags", "Concealed Pistol"),
                ("Mind Palace", "Interrogation", "Back Against the Wall", "Inspection", "Stakeout", "One Step Ahead")),
        },
    },
    "Weird": {
        "abilities": ("Great Wards", "Let Them In", "Ritual"),
        "specialties": {
            "Medium": _specialty(
                {"sneak": 2, "survey": 1, "sense": 2}, {"cunning": 1, "intuition": 2}, "sense",
                ("Spirit Board", "Ectoplasm Vial", "Tarot Deck"),
                ("Miasma", "Bending Spoons", "Cold Read", "Premonitions", "Last Moments", "Commune")),
            "Occultist": _specialty(
                {"control": 1, "sneak": 1, "read": 1, "sense": 2}, {"intuition": 3}, "read",
                ("Arcane Texts", "Occult Supplies", "Ritual Dagger"),
                ("Ghostblade", "Blood of the Covenant", "Speak Their Language", "Play the Bait", "Extend Your Senses",
                 "Forbidden Ritual")),
        },
    },
}


def creation_problem(sheet: dict):
    """What keeps this sheet from being a new investigator the creator could make, in
    words for the player, or None when it is one."""
    role = ROLES.get(sheet.get("role"))
    if role is None:
        return "Choose a role: " + ", ".join(ROLES) + "."
    spec = role["specialties"].get(sheet.get("specialty"))
    if spec is None:
        return f"Choose a {sheet['role']} specialty: " + " or ".join(role["specialties"]) + "."
    if sheet.get("role_ability") not in role["abilities"]:
        return f"Choose one of the {sheet['role']} abilities: " + ", ".join(role["abilities"]) + "."
    if sheet.get("specialty_ability") not in spec["abilities"]:
        return f"Choose one of the {sheet['specialty']} abilities: " + ", ".join(spec["abilities"]) + "."

    raised = 0
    raised_a_zero = False
    for act in ALL_ACTIONS:
        value, start = sheet.get(act) or 0, spec["actions"].get(act, 0)
        if value < start:
            return f"{ACTION_LABELS[act]} starts at {start} for a {sheet['specialty']}."
        if value > ACTION_START_MAX:
            return f"A new investigator has no action above {ACTION_START_MAX}."
        raised += value - start
        raised_a_zero = raised_a_zero or (start == 0 and value > 0)
    if raised != RAISE_POINTS or not raised_a_zero:
        return "Raise one action that starts at 0 to 1, then add 3 more points."

    gilded = {act for act in ALL_ACTIONS if sheet.get(f"gilded_{act}")}
    if spec["gilded"] not in gilded or len(gilded) != 2:
        return f"Gild {ACTION_LABELS[spec['gilded']]}, the {sheet['specialty']}'s action, and one other."

    added = 0
    for drive in DRIVES:
        top, start = sheet.get(f"{drive}_max") or 0, spec["drives"].get(drive, 0)
        if top < start:
            return f"{drive.capitalize()} starts at {start} for a {sheet['specialty']}."
        if top > DRIVE_START_MAX:
            return f"A new investigator has no drive above {DRIVE_START_MAX}."
        if sheet.get(f"{drive}_current") != top or sheet.get(f"{drive}_resistance_spent"):
            return "A new investigator starts with full drives and no resistance spent."
        added += top - start
    if added != DRIVE_POINTS:
        return f"Put {DRIVE_POINTS} more points on the drives."

    gear = sheet.get("gear") or []
    if len(gear) > GEAR_MAX or len(set(gear)) != len(gear) or any(
            item not in spec["gear"] and item not in STANDARD_GEAR for item in gear):
        return f"Choose up to {GEAR_MAX} items from the {sheet['specialty']}'s gear and the standard issue."

    if any(sheet.get(f) for f in ("body_marks", "brain_marks", "bleed_marks", "scars_count", "scars_list",
                                  "incapacitated")):
        return "A new investigator has no marks or scars."
    return None
