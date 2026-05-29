"""
Add 4 test player accounts with pending characters in the fairelands-01 campaign.
Run AFTER starting the server at least once (to create the campaign).

  python3 backend/seed_test_players.py

All characters created with correct ability key names that match the roll modifier system.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Character, Campaign

SQLALCHEMY_DATABASE_URL = "sqlite:///./candela_obscura.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PLAYERS = [
    {
        "username": "elara_voss",
        "email": "elara@candela.test",
        "password": "testpass",
        "character": {
            "name": "Elara Voss",
            "pronouns": "She/Her",
            "role": "Scholar",
            "specialty": "Doctor",
            "role_ability": "Meticulous Notes",
            "specialty_ability": "Dissection",
            "style": "Worn linen coat covered in ink-stained pockets, brass-rimmed spectacles perched on her nose.",
            "catalyst": "My mentor was taken by the bleed three years ago. I joined Candela to find out why.",
            "question": "What single truth has the bleed taught you that you wish it hadn't?",
            "gear": ["Surgical Tools", "Bleed-Warded Gloves", "Occult Field Lexicon"],
            "move": 0, "strike": 0, "control": 1,
            "hide": 0, "sneak": 1, "sway": 0,
            "survey": 1, "read": 2, "sense": 2,
            "gilded_read": True,
            "nerve_max": 2, "nerve_current": 2,
            "cunning_max": 2, "cunning_current": 2,
            "intuition_max": 3, "intuition_current": 3,
            "pen_font": "Caveat",
            "ink_color": "#8b1a1a",
        }
    },
    {
        "username": "rook_halcyon",
        "email": "rook@candela.test",
        "password": "testpass",
        "character": {
            "name": "Rook Halcyon",
            "pronouns": "He/Him",
            "role": "Muscle",
            "specialty": "Soldier",
            "role_ability": "Behind Me",
            "specialty_ability": "Sharpshooter",
            "style": "Heavy greatcoat, left sleeve pinned up where his arm used to be. Moves like someone expecting an ambush.",
            "catalyst": "I survived a bleed exposure that killed my entire unit. I owe it to them to understand what we faced.",
            "question": "What do you do when violence is the only language something speaks?",
            "gear": ["Heavy Firearm", "Army-Issue Lantern", "Field Tourniquet Kit"],
            "move": 2, "strike": 2, "control": 1,
            "hide": 1, "sneak": 0, "sway": 0,
            "survey": 1, "read": 0, "sense": 1,
            "gilded_strike": True,
            "nerve_max": 3, "nerve_current": 3,
            "cunning_max": 2, "cunning_current": 2,
            "intuition_max": 2, "intuition_current": 2,
            "pen_font": "Patrick Hand",
            "ink_color": "#1a3a8b",
        }
    },
    {
        "username": "sable_devereux",
        "email": "sable@candela.test",
        "password": "testpass",
        "character": {
            "name": "Sable Devereux",
            "pronouns": "They/Them",
            "role": "Face",
            "specialty": "Journalist",
            "role_ability": "Sweet Talk",
            "specialty_ability": "Lie Detector",
            "style": "Sharp-cut suit, always carries a battered notebook and three spare pens. Smells faintly of printing ink.",
            "catalyst": "I covered a 'gas explosion' in the Underglass. The official story was wrong. I intend to find the real one.",
            "question": "Who taught you that the truth is dangerous, and were they right?",
            "gear": ["Reporter's Notebook", "Press Credentials (Forged)", "Pocket Camera"],
            "move": 0, "strike": 0, "control": 1,
            "hide": 1, "sneak": 1, "sway": 2,
            "survey": 1, "read": 1, "sense": 0,
            "gilded_sway": True,
            "nerve_max": 2, "nerve_current": 2,
            "cunning_max": 3, "cunning_current": 3,
            "intuition_max": 2, "intuition_current": 2,
            "pen_font": "Indie Flower",
            "ink_color": "#1a6b2a",
        }
    },
    {
        "username": "finn_ashcroft",
        "email": "finn@candela.test",
        "password": "testpass",
        "character": {
            "name": "Finn Ashcroft",
            "pronouns": "He/They",
            "role": "Weird",
            "specialty": "Medium",
            "role_ability": "Let Them In",
            "specialty_ability": "Premonitions",
            "style": "Threadbare wool suit, mismatched buttons. Eyes that sometimes focus on things that aren't there.",
            "catalyst": "The bleed took my twin sister when we were children. She still visits sometimes. I need to know if she's trapped.",
            "question": "What is the cost of talking to the dead, and do you pay it willingly?",
            "gear": ["Spirit Board", "Séance Candles", "Inherited Locket"],
            "move": 0, "strike": 0, "control": 0,
            "hide": 0, "sneak": 1, "sway": 1,
            "survey": 1, "read": 1, "sense": 3,
            "gilded_sense": True,
            "nerve_max": 1, "nerve_current": 1,
            "cunning_max": 2, "cunning_current": 2,
            "intuition_max": 3, "intuition_current": 3,
            "pen_font": "Shadows Into Light",
            "ink_color": "#6b1a6b",
        }
    },
]

def run():
    db = SessionLocal()
    campaign = db.query(Campaign).filter(Campaign.campaign_code == "fairelands-01").first()
    if not campaign:
        print("ERROR: Campaign 'fairelands-01' not found. Run the server once first.")
        db.close()
        return

    created = []
    for p in PLAYERS:
        if db.query(User).filter(User.username == p["username"]).first():
            print(f"  SKIP {p['username']} — already exists")
            continue

        user = User(
            username=p["username"],
            email=p["email"],
            hashed_password=pwd_context.hash(p["password"]),
        )
        db.add(user)
        db.flush()

        char_data = dict(p["character"])
        pen_font  = char_data.pop("pen_font")
        ink_color = char_data.pop("ink_color")

        char = Character(
            user_id=user.id,
            game_id=1,
            circle_id=1,
            campaign_id=campaign.id,
            status="pending",
            pen_font=pen_font,
            ink_color=ink_color,
            **char_data,
        )
        db.add(char)
        created.append(p["username"])

    db.commit()
    db.close()

    if created:
        print(f"\nCreated {len(created)} test players:")
        print(f"  {'Username':<22} {'Role/Specialty':<26} {'Role Ability':<22} Specialty Ability")
        print(f"  {'-'*22} {'-'*26} {'-'*22} {'-'*20}")
        for p in PLAYERS:
            if p["username"] in created:
                c = p["character"]
                print(f"  {p['username']:<22} {c['role']}/{c['specialty']:<20} {c['role_ability']:<22} {c['specialty_ability']}")
        print(f"\nAll characters are PENDING in campaign 'fairelands-01'.")
        print("Log in as the GM and approve them in the GM dashboard.")
    else:
        print("Nothing to create — all test accounts already exist.")

if __name__ == "__main__":
    run()
