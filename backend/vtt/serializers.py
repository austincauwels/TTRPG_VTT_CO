"""Dict forms of a Character and a Circle, as sent over the WebSocket and in several REST responses.

profile_pic is the stored portrait only when it follows the portrait rule
(vtt/portraits.py served_portrait); anything else is sent as no portrait."""
import json

from vtt.circle_queries import (STAMINA_DICE, circle_abilities, downed_members, resource_pool, saw_this_coming,
                                train_dice_left)

from vtt.abilities import ability_uses
from vtt.countdown import timer_fields
from vtt.portraits import served_portrait


def advancement_taken(char) -> list:
    """The advancement options the character has taken among its waiting picks (a list,
    whatever the column holds)."""
    raw = getattr(char, "advancement_taken", None)
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = None
    return [c for c in raw if isinstance(c, str)] if isinstance(raw, list) else []


def get_char_dict(char):
    gear = char.gear if not isinstance(char.gear, str) else json.loads(char.gear) if char.gear else []
    scars = char.scars_list if not isinstance(char.scars_list, str) else json.loads(char.scars_list) if char.scars_list else []

    return {
        "id": getattr(char, "id", 1),
        "name": getattr(char, "name", "Unknown Investigator"),

        "move": getattr(char, "move", 0) or 0,
        "strike": getattr(char, "strike", 0) or 0,
        "control": getattr(char, "control", 0) or 0,
        "hide": getattr(char, "hide", 0) or 0,
        "sneak": getattr(char, "sneak", 0) or 0,
        "sway": getattr(char, "sway", 0) or 0,
        "survey": getattr(char, "survey", 0) or 0,
        "read": getattr(char, "read", 0) or 0,
        "sense": getattr(char, "sense", 0) or 0,

        "gilded_move": bool(getattr(char, "gilded_move", False)),
        "gilded_strike": bool(getattr(char, "gilded_strike", False)),
        "gilded_control": bool(getattr(char, "gilded_control", False)),
        "gilded_hide": bool(getattr(char, "gilded_hide", False)),
        "gilded_sneak": bool(getattr(char, "gilded_sneak", False)),
        "gilded_sway": bool(getattr(char, "gilded_sway", False)),
        "gilded_survey": bool(getattr(char, "gilded_survey", False)),
        "gilded_read": bool(getattr(char, "gilded_read", False)),
        "gilded_sense": bool(getattr(char, "gilded_sense", False)),

        "nerve_max": getattr(char, "nerve_max", 1) or 1,
        "nerve_current": max(0, getattr(char, "nerve_current", 0) or 0),
        "nerve_resistance_spent": getattr(char, "nerve_resistance_spent", 0) or 0,
        "cunning_max": getattr(char, "cunning_max", 1) or 1,
        "cunning_current": max(0, getattr(char, "cunning_current", 0) or 0),
        "cunning_resistance_spent": getattr(char, "cunning_resistance_spent", 0) or 0,
        "intuition_max": getattr(char, "intuition_max", 1) or 1,
        "intuition_current": max(0, getattr(char, "intuition_current", 0) or 0),
        "intuition_resistance_spent": getattr(char, "intuition_resistance_spent", 0) or 0,

        "body_marks": getattr(char, "body_marks", 0) or 0,
        "brain_marks": getattr(char, "brain_marks", 0) or 0,
        "bleed_marks": getattr(char, "bleed_marks", 0) or 0,
        "scars_count": getattr(char, "scars_count", 0) or 0,
        "scars_list": scars,
        "incapacitated": bool(getattr(char, "incapacitated", False)),
        "is_dead": bool(getattr(char, "is_dead", False)),
        "circle_id": getattr(char, "circle_id", 1),

        "pronouns": getattr(char, "pronouns", "Unlisted") or "Unlisted",
        "style": getattr(char, "style", "") or "",
        "catalyst": getattr(char, "catalyst", "") or "",
        "question": getattr(char, "question", "") or "",
        "role": getattr(char, "role", "") or "",
        "specialty": getattr(char, "specialty", "") or "",
        "role_ability": getattr(char, "role_ability", "None") or "None",
        "specialty_ability": getattr(char, "specialty_ability", "None") or "None",
        "gear": gear,
        "profile_pic": served_portrait(getattr(char, "profile_pic", None)),
        "status": getattr(char, "status", "unaffiliated") or "unaffiliated",
        "pen_font": getattr(char, "pen_font", "Caveat") or "Caveat",
        "ink_color": getattr(char, "ink_color", "") or "",
        "campaign_id": getattr(char, "campaign_id", None),
        "personal_circle_answer": getattr(char, "personal_circle_answer", "") or "",
        "ability_uses": ability_uses(char),
        "train_bonus": bool(getattr(char, "train_bonus", False)),
        "train_dice": train_dice_left(char),
        "warded_by_id": getattr(char, "warded_by_id", None),
        "resources_spent_assignment": getattr(char, "resources_spent_assignment", 0) or 0,
        "advancement_picks": getattr(char, "advancement_picks", 0) or 0,
        "advancement_taken": advancement_taken(char),
    }

def get_circle_dict(circle):
    backstory = getattr(circle, "backstory_answers", None) or {}
    if isinstance(backstory, str):
        try: backstory = json.loads(backstory)
        except: backstory = {}
    return {
        "id": circle.id,
        "name": circle.name,
        "stitch": circle.stitch,
        "refresh": circle.refresh,
        "train": circle.train,
        "guard_patrol": getattr(circle, "guard_patrol", None) or 0,
        "miasma_bleed": getattr(circle, "miasma_bleed", None) or 0,
        "tension_clock": getattr(circle, "tension_clock", None) or 0,
        "tension_label": getattr(circle, "tension_label", None) or "",
        "location": getattr(circle, "location", None) or "",
        "atmosphere": getattr(circle, "atmosphere", None) or "",
        "dispatch_text": getattr(circle, "dispatch_text", None) or "",
        # The resource pool (1 plus the active members, rulebook p. 41): any one resource
        # can hold all of it
        "max_capacity": resource_pool(circle),
        "stamina_dice_left": max(0, STAMINA_DICE - (getattr(circle, "stamina_dice_used", 0) or 0))
        if "Stamina Training" in circle_abilities(circle) else 0,
        # Nobody Left Behind (p. 41): who is down, for the +1d chip on the desks
        "incapacitated_members": downed_members(circle),
        # Saw This Coming (p. 27): who can still add +1d to another member's roll
        "saw_this_coming": saw_this_coming(circle),
        "chapter_house_location": getattr(circle, "chapter_house_location", None) or "",
        "circle_ability": getattr(circle, "circle_ability", None) or "",
        "insignia": getattr(circle, "insignia", None) or "",
        "backstory_answers": backstory,
        "is_finalized": bool(getattr(circle, "is_finalized", False)),
        "illumination": getattr(circle, "illumination", 0) or 0,
        "resources_editable": bool(getattr(circle, "resources_editable", False)),
        "reports_open": bool(getattr(circle, "reports_open", False)),
        # The Lightkeeper's countdown beside the hourglass, with the time left as of now
        # (vtt/countdown.py)
        **timer_fields(circle),
    }
