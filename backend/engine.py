import random
from sqlalchemy.orm import Session
from models import Campaign, Character

def create_new_campaign(db: Session, name: str, code: str):
    """Creates a new campaign with a custom code."""
    new_campaign = Campaign(name=name, campaign_code=code)
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign

def request_join_campaign(db: Session, character_id: int, campaign_code: str):
    """Binds a character to a campaign and sets status to pending."""
    campaign = db.query(Campaign).filter(Campaign.campaign_code == campaign_code).first()
    if not campaign:
        return {"error": "Campaign code not found"}
    
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        return {"error": "Character not found"}
        
    character.campaign_id = campaign.id
    character.status = "pending"
    db.commit()
    db.refresh(character)
    
    return {"success": True, "character": character}

def approve_investigator(db: Session, character_id: int):
    """The GM 'Stamp' action. Moves character from pending to active."""
    character = db.query(Character).filter(Character.id == character_id).first()
    
    if character and character.status == "pending":
        character.status = "active"
        db.commit()
        db.refresh(character)
        return {"success": True, "character": character}
        
    return {"error": "Character is not in pending status or does not exist"}

def get_campaign_roster(db: Session, campaign_id: int):
    """Returns separate lists for the GM desk rendering."""
    pending = db.query(Character).filter(
        Character.campaign_id == campaign_id, 
        Character.status == "pending"
    ).all()
    
    active = db.query(Character).filter(
        Character.campaign_id == campaign_id, 
        Character.status == "active"
    ).all()
    
    return {
        "pending_investigators": pending, 
        "active_investigators": active
    }
    
def roll_dice(pool_size, is_gilded=False):
    if pool_size == 0:
        die1 = random.randint(1, 6)
        die2 = random.randint(1, 6)
        return {
            "type": "zero",
            "dice": [die1, die2],
            "result": min(die1, die2)
        }

    dice = []
    for i in range(pool_size):
        dice.append({
            "value": random.randint(1, 6),
            "is_gilded": is_gilded and i == 0
        })

    return {
        "type": "standard",
        "dice": dice
    }

def calculate_resistance_max(max_drive):
    return max_drive // 3
