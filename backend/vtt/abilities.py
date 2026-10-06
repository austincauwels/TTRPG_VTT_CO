"""A character's abilities, as the rules code checks them.

A character has a role ability and a specialty ability. An advancement's new ability
is appended to specialty_ability after "; " (engine.apply_advancement), so an exact
comparison with specialty_ability stops finding the specialty's own ability once a
character has advanced (QUIRKS.md D12). abilities_of splits both fields on ";", so a
check sees every ability the character has.
"""
import json

MARK_TYPES = ("body", "brain", "bleed")


def abilities_of(character) -> frozenset:
    """Every ability name the character has, from role_ability and specialty_ability."""
    names = set()
    for field in (getattr(character, "role_ability", None), getattr(character, "specialty_ability", None)):
        if isinstance(field, str):
            names.update(part.strip() for part in field.split(";"))
    names.discard("")
    names.discard("None")
    return frozenset(names)


def has_ability(character, name: str) -> bool:
    return name in abilities_of(character)


def resistance_left(character, drive: str) -> int:
    """Resistance points the character can still burn in a drive: a third of the drive's
    maximum, less what is spent (rulebook p. 13)."""
    maximum = (getattr(character, f"{drive}_max", 0) or 0) // 3
    return max(0, maximum - (getattr(character, f"{drive}_resistance_spent", 0) or 0))


def _uses(character) -> dict:
    """ability_uses as a dict. On a database that grew through init_db the column can be
    TEXT, so a row may hold the JSON as a string (QUIRKS.md); anything unreadable is empty."""
    raw = getattr(character, "ability_uses", None)
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = None
    return dict(raw) if isinstance(raw, dict) else {}


def uses_of(character, name: str) -> int:
    value = _uses(character).get(name, 0)
    return value if isinstance(value, int) else 0


def count_use(character, name: str):
    """Records one use of an ability this assignment (ability_uses, reset when the
    Lightkeeper ends the assignment). A new dict, so the JSON column sees the change."""
    uses = _uses(character)
    uses[name] = uses_of(character, name) + 1
    character.ability_uses = uses
