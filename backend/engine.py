"""Core game logic: campaign management, dice rolling, character advancement, and resistance mechanics."""
import secrets
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from models import Campaign, Character, NotebookEntry

INK_COLORS = [
    '#8b1a1a',  # Player 1 — dark saturated red
    '#4a1a8b',  # Player 2 — dark purple
    '#1a5a1a',  # Player 3 — dark green
    '#8b4a0a',  # Player 4 — burnt orange
    '#1a3a6a',  # Player 5 — dark navy
]

def create_new_campaign(db: Session, name: str, code: str, gm_user_id: int = None):
    """Creates a new campaign with a custom code, optionally recording the GM's user id."""
    new_campaign = Campaign(name=name, campaign_code=code, gm_user_id=gm_user_id)
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign

def request_join_campaign(db: Session, character_id: int, campaign_code: str, pen_font: str = 'Caveat'):
    """Binds a character to a campaign, saves their pen font, and sets status to pending."""
    campaign = db.query(Campaign).filter(Campaign.campaign_code == campaign_code).first()
    if not campaign:
        return {"error": "Campaign code not found"}

    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        return {"error": "Character not found"}

    character.campaign_id = campaign.id
    character.status = "pending"
    character.pen_font = pen_font
    db.commit()
    db.refresh(character)

    return {"success": True, "character": character}

def approve_investigator(db: Session, character_id: int):
    """The GM 'Stamp' action. Moves character from pending to active and assigns an ink color."""
    character = db.query(Character).filter(Character.id == character_id).first()

    if character and character.status == "pending":
        # Retire any dead predecessor this user had in the same campaign so the old
        # character doesn't linger as "active" in the roster.
        if character.user_id and character.campaign_id:
            dead_predecessors = db.query(Character).filter(
                Character.campaign_id == character.campaign_id,
                Character.user_id == character.user_id,
                Character.id != character.id,
                Character.is_dead == True,
            ).all()
            for old in dead_predecessors:
                old.status = "retired"

        active_count = db.query(Character).filter(
            Character.campaign_id == character.campaign_id,
            Character.status == "active",
            Character.ink_color != ''
        ).count()
        character.ink_color = INK_COLORS[active_count % len(INK_COLORS)]
        character.status = "active"
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}

    return {"error": "Character is not in pending status or does not exist"}

def reject_investigator(db: Session, character_id: int):
    """GM rejects a pending character — returns them to unaffiliated so they can join elsewhere."""
    character = db.query(Character).filter(Character.id == character_id).first()
    if character and character.status == "pending":
        character.status = "unaffiliated"
        character.campaign_id = None
        character.pen_font = None
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}
    return {"error": "Character is not in pending status or does not exist"}

def get_campaign_roster(db: Session, campaign_id: int):
    """Returns separate lists for the GM desk rendering."""
    all_chars = db.query(Character).options(joinedload(Character.circle)).filter(
        Character.campaign_id == campaign_id,
        Character.status.in_(["pending", "active"])
    ).all()

    pending = [c for c in all_chars if c.status == "pending"]
    active  = [c for c in all_chars if c.status == "active"]

    return {
        "pending_investigators": pending,
        "active_investigators": active
    }

def get_notebook_entries(db: Session, campaign_id: int):
    """Returns all notebook entries for a campaign ordered by page number."""
    return db.query(NotebookEntry).filter(
        NotebookEntry.campaign_id == campaign_id
    ).order_by(NotebookEntry.page_number).all()

def create_notebook_entry(db: Session, campaign_id: int, title: str, content: str,
                          author_name: str, author_type: str,
                          pen_font: str, ink_color: str,
                          character_id: int = None,
                          entry_type: str = 'field_log',
                          visibility: str = 'all',
                          image_data: str = None):
    """Creates a new notebook entry and assigns the next sequential page number."""
    max_page = db.query(func.max(NotebookEntry.page_number)).filter(
        NotebookEntry.campaign_id == campaign_id
    ).scalar() or 0
    page_num = max_page + 1

    entry = NotebookEntry(
        campaign_id  = campaign_id,
        character_id = character_id,
        author_name  = author_name,
        author_type  = author_type,
        pen_font     = pen_font,
        ink_color    = ink_color,
        title        = title,
        content      = content,
        created_at   = datetime.utcnow().isoformat(),
        page_number  = page_num,
        entry_type   = entry_type,
        visibility   = visibility,
        image_data   = image_data,
        is_deleted   = False,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def calculate_outcome(value, dice=None):
    if dice and sum(1 for d in dice if d.get("value") == 6) >= 2:
        return "critical_success"
    if value == 6:
        return "full_success"
    if value >= 4:
        return "mixed_success"
    return "failure"

OUTCOME_LABELS = {
    "critical_success": "Critical Success",
    "full_success": "Full Success",
    "mixed_success": "Mixed Success",
    "failure": "Failure",
}

def roll_dice(pool_size, is_gilded=False, extra_dice=0, extra_gild=False):
    # extra_gild upgrades the action to gilded even if the gilded_{action} flag is False
    effective_gilded = is_gilded or extra_gild
    # extra_dice adds to pool but total is capped at 6
    effective_pool = min(6, pool_size + extra_dice)

    if effective_pool == 0:
        die1 = secrets.randbelow(6) + 1
        die2 = secrets.randbelow(6) + 1
        result_val = min(die1, die2)
        zero_dice = [
            {"value": die1, "is_gilded": effective_gilded},
            {"value": die2, "is_gilded": False},
        ]
        return {
            "type": "zero",
            "dice": zero_dice,
            "result": result_val,
            "outcome": calculate_outcome(result_val, zero_dice),
            "needs_gilded_choice": False,
        }

    pool_size = effective_pool
    is_gilded = effective_gilded

    dice = [{"value": secrets.randbelow(6) + 1, "is_gilded": is_gilded and i == 0} for i in range(pool_size)]

    if is_gilded and pool_size == 1:
        result_val = dice[0]["value"]
        return {
            "type": "standard",
            "dice": dice,
            "result": result_val,
            "outcome": calculate_outcome(result_val, dice),
            "needs_gilded_choice": False,
            "auto_gilded_refresh": True,
        }

    if is_gilded and pool_size > 1:
        gilded_value = dice[0]["value"]
        regular_values = [d["value"] for d in dice[1:]]
        highest_regular = max(regular_values)
        highest_regular_idx = next(i + 1 for i, d in enumerate(dice[1:]) if d["value"] == highest_regular)
        return {
            "type": "standard",
            "dice": dice,
            "needs_gilded_choice": True,
            "gilded_idx": 0,
            "gilded_value": gilded_value,
            "highest_regular_idx": highest_regular_idx,
            "highest_regular_value": highest_regular,
        }

    result_val = max(d["value"] for d in dice)
    return {
        "type": "standard",
        "dice": dice,
        "result": result_val,
        "outcome": calculate_outcome(result_val, dice),
        "needs_gilded_choice": False,
    }

ALL_ACTIONS = ["move", "strike", "control", "hide", "sneak", "sway", "survey", "read", "sense"]

def apply_advancement(db: Session, character, choice: str, detail: str = ""):
    """Apply a character advancement choice. Returns updated char dict or error."""
    if choice == "add_action":
        action = detail
        if action not in ALL_ACTIONS:
            return {"error": f"Unknown action: {action}"}
        current = getattr(character, action, 0) or 0
        if current >= 3:
            return {"error": f"{action} is already at maximum (3)"}
        setattr(character, action, current + 1)
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}

    elif choice == "add_drive":
        drive_key = detail  # 'nerve' | 'cunning' | 'intuition'
        max_field = f"{drive_key}_max"
        cur_field = f"{drive_key}_current"
        if not hasattr(character, max_field):
            return {"error": f"Unknown drive pool: {drive_key}"}
        new_max = (getattr(character, max_field) or 0) + 2
        new_cur = (getattr(character, cur_field) or 0) + 2
        setattr(character, max_field, new_max)
        setattr(character, cur_field, new_cur)
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}

    elif choice == "new_ability":
        ability_text = detail.strip()
        if not ability_text:
            return {"error": "Ability name cannot be empty"}
        # Append to specialty_ability (or role_ability) as a semicolon-separated list
        existing = getattr(character, "specialty_ability", "None") or "None"
        if existing in ("None", ""):
            setattr(character, "specialty_ability", ability_text)
        else:
            setattr(character, "specialty_ability", f"{existing}; {ability_text}")
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}

    elif choice == "gild_action":
        action = detail
        if action not in ALL_ACTIONS:
            return {"error": f"Unknown action: {action}"}
        setattr(character, f"gilded_{action}", True)
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}

    return {"error": f"Unknown advancement choice: {choice}"}


def calculate_resistance_max(max_drive):
    return max_drive // 3

def burn_resistance(db: Session, character, action: str, drive_key: str):
    """Burn one resistance pip and reroll using only the action rating (no drive added)."""
    resist_field = f"{drive_key}_resistance_spent"
    max_pips = calculate_resistance_max(getattr(character, f"{drive_key}_max", 1) or 1)
    current_spent = getattr(character, resist_field, 0) or 0
    if current_spent >= max_pips:
        return {"error": "No resistance pips remaining"}
    setattr(character, resist_field, current_spent + 1)
    db.commit()
    action_rating = getattr(character, action, 0) or 0
    is_gilded = bool(getattr(character, f"gilded_{action}", False))
    result = roll_dice(action_rating, is_gilded)
    result["action"] = action
    result["is_resistance_roll"] = True
    return result
