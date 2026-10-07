"""Core game logic: campaign management, dice rolling, character advancement, and resistance mechanics."""
import secrets
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from models import Campaign, Character, NotebookEntry
from vtt.db import releases_locks_on_error

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

# Why a join is refused for a character that is on a roster already (409). Joining used
# to move an active or pending character out of its campaign without a word.
ALREADY_ON_A_ROSTER = {
    "active": "This investigator is already in a campaign.",
    "pending": "This investigator is already waiting to join a campaign.",
}


@releases_locks_on_error
def request_join_campaign(db: Session, character_id: int, campaign_code: str, pen_font: str = 'Caveat'):
    """Binds a character to a campaign, saves their pen font, and sets status to pending.
    A character that is active or pending in a campaign is refused (an error with
    status 409), except one already pending in this campaign: that is a retry of a
    join that went through (its answer was lost), so it gets the same answer and
    nothing changes ("unchanged": True, which the route takes out). The campaign row is
    locked FOR SHARE and the character row FOR UPDATE before anything is decided, so a
    delete of either, or a restore that puts the character back on a roster, waits for
    the join or the join for it (vtt/deletion.py). Every way out that does not commit
    rolls back, an exception included, which lets go of the locks at once."""
    campaign = db.query(Campaign).filter(Campaign.campaign_code == campaign_code) \
        .populate_existing().with_for_update(read=True).first()
    if not campaign:
        db.rollback()
        return {"error": "Campaign code not found"}

    character = db.query(Character).filter(Character.id == character_id) \
        .populate_existing().with_for_update().first()
    if not character:
        db.rollback()
        return {"error": "Character not found"}
    if character.status == "pending" and character.campaign_id == campaign.id:
        db.rollback()
        db.refresh(character)
        return {"success": True, "character": character, "unchanged": True}
    if character.status in ALREADY_ON_A_ROSTER:
        db.rollback()
        return {"error": ALREADY_ON_A_ROSTER[character.status], "status": 409}

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
                          image_data: str = None,
                          sketch_scene: str = None):
    """Creates a new notebook entry and assigns the next sequential page number.
    sketch_scene is a drawn sketch's cleaned scene (vtt/sketch_scenes.py)."""
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
        sketch_scene = sketch_scene,
        is_deleted   = False,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def calculate_outcome(value, dice=None):
    """The outcome of a result. With the roll's dice, a 6 among two or more 6s is a
    critical success (rulebook p. 10); a result below 6 never is, whatever else was rolled."""
    if value == 6 and dice and sum(1 for d in dice if d.get("value") == 6) >= 2:
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

def roll_dice(pool_size, is_gilded=False, extra_dice=0, extra_gild=0):
    """Rolls an action's pool (rulebook pp. 10 to 13).

    is_gilded is the action's own gilding; extra_gild is how many more dice abilities
    gild (True counts as one). Each gild makes one more die gilded, as many as the pool
    has dice, so a gilded action with a gilding ability rolls two gilded dice. extra_dice
    adds to the pool, which is capped at six dice (the Rule of Six).

    With no dice the roll takes the lower of two, never a critical success, and the
    gilded die cannot be chosen; when it is the lower die (the result) drive is still
    earned back (auto_gilded_refresh). With gilded dice and regular dice the player
    keeps either the best gilded die or the best regular one (needs_gilded_choice; the
    server holds the dice, see vtt/ws/handlers/rolls.py). When every die is gilded the
    best one counts and earns back drive."""
    gilds = (1 if is_gilded else 0) + int(extra_gild or 0)
    pool = min(6, max(0, pool_size + extra_dice))

    if pool == 0:
        die1 = secrets.randbelow(6) + 1
        die2 = secrets.randbelow(6) + 1
        result_val = min(die1, die2)
        zero = {
            "type": "zero",
            "dice": [
                {"value": die1, "is_gilded": gilds > 0},
                {"value": die2, "is_gilded": False},
            ],
            "result": result_val,
            "outcome": calculate_outcome(result_val),
            "needs_gilded_choice": False,
        }
        if gilds > 0 and die1 <= die2:
            zero["auto_gilded_refresh"] = True
        return zero

    gilded_count = min(pool, gilds)
    dice = [{"value": secrets.randbelow(6) + 1, "is_gilded": i < gilded_count} for i in range(pool)]

    if gilded_count == pool:
        result_val = max(d["value"] for d in dice)
        return {
            "type": "standard",
            "dice": dice,
            "result": result_val,
            "outcome": calculate_outcome(result_val, dice),
            "needs_gilded_choice": False,
            "auto_gilded_refresh": True,
        }

    if gilded_count > 0:
        def best(of_gilded):
            return max((i for i, d in enumerate(dice) if d["is_gilded"] == of_gilded),
                       key=lambda i: (dice[i]["value"], -i))
        gilded_idx, highest_regular_idx = best(True), best(False)
        return {
            "type": "standard",
            "dice": dice,
            "needs_gilded_choice": True,
            "gilded_idx": gilded_idx,
            "gilded_value": dice[gilded_idx]["value"],
            "highest_regular_idx": highest_regular_idx,
            "highest_regular_value": dice[highest_regular_idx]["value"],
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

DRIVE_MAX = 9  # drives range from 0 to 9 (rulebook p. 8)
ADVANCEMENT_CHOICES = ("add_action", "add_drive", "new_ability", "gild_action")


def apply_advancement(db: Session, character, choice: str, detail: str = "", interdisciplinary: bool = False):
    """Applies one advancement pick (rulebook p. 55; RULES_CHECK.md item 14). Returns
    {"success": True, "character": ...} or {"error": ..., "status": ...} with words for
    the player, having changed nothing.

    A pick must be waiting: the Lightkeeper's circle advance gives each active member two
    (advancement_picks), and the two must be different options (advancement_taken).
    - add_action: +1 to an action, up to 3.
    - add_drive: 2 drive points, both to one drive ("nerve") or split ("nerve,cunning"),
      each drive up to 9; the current value rises with the maximum.
    - new_ability: an ability the character does not have yet, of its role or specialty
      (or one from another with the circle's Interdisciplinary, vtt/creation.py),
      appended to specialty_ability after "; " (vtt/abilities.py reads it back).
    - gild_action: an action that is not gilded yet."""
    from vtt.abilities import abilities_of
    from vtt.creation import new_ability_problem
    from vtt.serializers import advancement_taken

    if choice not in ADVANCEMENT_CHOICES:
        return {"error": f"Unknown advancement choice: {choice}", "status": 422}
    if (character.advancement_picks or 0) < 1:
        return {"error": "No advancement is waiting to be chosen.", "status": 409}
    taken = advancement_taken(character)
    if choice in taken:
        return {"error": "Choose a different option for your other advancement.", "status": 409}
    detail = detail if isinstance(detail, str) else ""

    if choice == "add_action":
        if detail not in ALL_ACTIONS:
            return {"error": f"Unknown action: {detail}", "status": 422}
        current = getattr(character, detail, 0) or 0
        if current >= 3:
            return {"error": f"{detail} is already at maximum (3)", "status": 409}
        setattr(character, detail, current + 1)

    elif choice == "add_drive":
        drives = [d.strip() for d in detail.split(",") if d.strip()]
        if len(drives) == 1:
            drives = drives * 2
        if len(drives) != 2 or any(d not in ("nerve", "cunning", "intuition") for d in drives):
            return {"error": "Choose one drive for both points, or two drives for one each.", "status": 422}
        for drive in set(drives):
            if (getattr(character, f"{drive}_max") or 0) + drives.count(drive) > DRIVE_MAX:
                return {"error": f"{drive.capitalize()} is at most {DRIVE_MAX}.", "status": 409}
        for drive in drives:
            setattr(character, f"{drive}_max", (getattr(character, f"{drive}_max") or 0) + 1)
            setattr(character, f"{drive}_current", (getattr(character, f"{drive}_current") or 0) + 1)

    elif choice == "new_ability":
        ability_text = detail.strip()
        if not ability_text or ";" in ability_text:
            return {"error": "Choose an ability.", "status": 422}
        if ability_text in abilities_of(character):
            return {"error": f"{ability_text} is already one of this investigator's abilities.", "status": 409}
        problem = new_ability_problem(character, ability_text, interdisciplinary)
        if problem:
            return {"error": problem, "status": 409}
        existing = getattr(character, "specialty_ability", "None") or "None"
        if existing in ("None", ""):
            setattr(character, "specialty_ability", ability_text)
        else:
            setattr(character, "specialty_ability", f"{existing}; {ability_text}")

    elif choice == "gild_action":
        if detail not in ALL_ACTIONS:
            return {"error": f"Unknown action: {detail}", "status": 422}
        if getattr(character, f"gilded_{detail}", False):
            return {"error": f"{detail} is already gilded.", "status": 409}
        setattr(character, f"gilded_{detail}", True)

    # Picks come in sets of different options: two to an advancement, or all four for the
    # one that brings One Last Run (advancement_set). The options taken reset when a set is
    # complete, so the next advancement's picks may repeat this one's.
    character.advancement_picks = (character.advancement_picks or 0) - 1
    taken = taken + [choice]
    if len(taken) >= (character.advancement_set or 2) or character.advancement_picks <= 0:
        character.advancement_taken = []
        character.advancement_set = 2
    else:
        character.advancement_taken = taken
    db.commit()
    db.refresh(character)
    return {"success": True, "character": character}


def calculate_resistance_max(max_drive):
    return max_drive // 3

def drive_for_action(action: str) -> str:
    """The drive an action belongs to: Nerve for move, strike, control; Cunning for
    hide, sneak (the rulebook's Read), sway; Intuition for survey, read (Focus), sense."""
    if action in ("move", "strike", "control"):
        return "nerve"
    if action in ("hide", "sneak", "sway"):
        return "cunning"
    return "intuition"


def burn_resistance(db: Session, character, action: str, drive_key: str):
    """Burn one resistance pip and reroll using only the action rating (no drive added).
    The caller passes the action's own drive (drive_for_action, rulebook p. 13)."""
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
