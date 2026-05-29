"""
Full database reset and re-seed for playtesting.

State after running:
  admin / admin          — Scholar/Professor investigator (Adrian Voss)
  elara_voss / testpass  — Scholar/Doctor (Meticulous Notes + Dissection)
  rook_halcyon / testpass — Muscle/Soldier (Behind Me + Sharpshooter)
  sable_devereux / testpass — Face/Journalist (Sweet Talk + Lie Detector)
  finn_ashcroft / testpass  — Weird/Medium (Let Them In + Premonitions)
  keeper_test / testpass — Lightkeeper of "The Veilhaven Chapter"

All investigators are unaffiliated — players join the keeper's campaign normally.

Usage:
  python3 backend/reset_seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Character, Campaign, Circle, Game, CircleVote, Relationship, NotebookEntry

SQLALCHEMY_DATABASE_URL = "sqlite:///./candela_obscura.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def reset():
    db = SessionLocal()

    # ── Wipe all data ────────────────────────────────────────────────────────────
    print("Clearing existing data...")
    db.query(Relationship).delete()
    db.query(CircleVote).delete()
    db.query(NotebookEntry).delete()
    db.query(Character).delete()
    db.query(Campaign).delete()
    db.query(Circle).delete()
    db.query(Game).delete()
    db.query(User).delete()
    db.commit()
    print("  Done.")

    # ── Scaffold: default Game + Circle ──────────────────────────────────────────
    game = Game(id=1, name="Candela Obscura", owner_id=None)
    db.add(game)

    circle = Circle(id=1, name="The Order of Veilhaven", stitch=1, refresh=1, train=1)
    db.add(circle)
    db.flush()

    # ── Admin — Scholar/Professor ─────────────────────────────────────────────────
    admin = User(id=1, username="admin", email="admin@archive.com",
                 hashed_password=pwd_context.hash("admin"))
    db.add(admin)
    db.flush()

    admin_char = Character(
        name="Adrian Voss",
        pronouns="He/Him",
        user_id=admin.id,
        game_id=1,
        circle_id=1,
        status="unaffiliated",
        role="Scholar",
        specialty="Professor",
        role_ability="Well-Read",
        specialty_ability="Better Part of Valor",
        style="Rumpled suit perpetually dusted with chalk, ink-stained fingers, wire-rimmed spectacles.",
        catalyst="I found an entry in the Archive that referenced my father's disappearance as a 'bleed event.' I intend to find the truth.",
        question="What knowledge do you refuse to write down, and why?",
        gear=["Annotated Field Lexicon", "Bleed-Glass Monocle", "Cipher Journal"],
        move=0, strike=0, control=1,
        hide=0, sneak=1, sway=1,
        survey=2, read=2, sense=0,
        gilded_survey=True,
        nerve_max=2, nerve_current=2,
        cunning_max=3, cunning_current=3,
        intuition_max=2, intuition_current=2,
        pen_font="Caveat",
        ink_color="#3a2a1a",
    )
    db.add(admin_char)

    # ── Elara Voss — Scholar/Doctor ───────────────────────────────────────────────
    elara_user = User(username="elara_voss", email="elara@candela.test",
                      hashed_password=pwd_context.hash("testpass"))
    db.add(elara_user)
    db.flush()

    elara_char = Character(
        name="Elara Voss",
        pronouns="She/Her",
        user_id=elara_user.id,
        game_id=1,
        circle_id=1,
        status="unaffiliated",
        role="Scholar",
        specialty="Doctor",
        role_ability="Meticulous Notes",
        specialty_ability="Dissection",
        style="Worn linen coat covered in ink-stained pockets, brass-rimmed spectacles perched on her nose.",
        catalyst="My mentor was taken by the bleed three years ago. I joined Candela to find out why.",
        question="What single truth has the bleed taught you that you wish it hadn't?",
        gear=["Surgical Tools", "Bleed-Warded Gloves", "Occult Field Lexicon"],
        move=0, strike=0, control=1,
        hide=0, sneak=1, sway=0,
        survey=1, read=2, sense=2,
        gilded_read=True,
        nerve_max=2, nerve_current=2,
        cunning_max=2, cunning_current=2,
        intuition_max=3, intuition_current=3,
        pen_font="Caveat",
        ink_color="#8b1a1a",
    )
    db.add(elara_char)

    # ── Rook Halcyon — Muscle/Soldier ─────────────────────────────────────────────
    rook_user = User(username="rook_halcyon", email="rook@candela.test",
                     hashed_password=pwd_context.hash("testpass"))
    db.add(rook_user)
    db.flush()

    rook_char = Character(
        name="Rook Halcyon",
        pronouns="He/Him",
        user_id=rook_user.id,
        game_id=1,
        circle_id=1,
        status="unaffiliated",
        role="Muscle",
        specialty="Soldier",
        role_ability="Behind Me",
        specialty_ability="Sharpshooter",
        style="Heavy greatcoat, left sleeve pinned up where his arm used to be. Moves like someone expecting an ambush.",
        catalyst="I survived a bleed exposure that killed my entire unit. I owe it to them to understand what we faced.",
        question="What do you do when violence is the only language something speaks?",
        gear=["Heavy Firearm", "Army-Issue Lantern", "Field Tourniquet Kit"],
        move=2, strike=2, control=1,
        hide=1, sneak=0, sway=0,
        survey=1, read=0, sense=1,
        gilded_strike=True,
        nerve_max=3, nerve_current=3,
        cunning_max=2, cunning_current=2,
        intuition_max=2, intuition_current=2,
        pen_font="Patrick Hand",
        ink_color="#1a3a8b",
    )
    db.add(rook_char)

    # ── Sable Devereux — Face/Journalist ──────────────────────────────────────────
    sable_user = User(username="sable_devereux", email="sable@candela.test",
                      hashed_password=pwd_context.hash("testpass"))
    db.add(sable_user)
    db.flush()

    sable_char = Character(
        name="Sable Devereux",
        pronouns="They/Them",
        user_id=sable_user.id,
        game_id=1,
        circle_id=1,
        status="unaffiliated",
        role="Face",
        specialty="Journalist",
        role_ability="Sweet Talk",
        specialty_ability="Lie Detector",
        style="Sharp-cut suit, always carries a battered notebook and three spare pens. Smells faintly of printing ink.",
        catalyst="I covered a 'gas explosion' in the Underglass. The official story was wrong. I intend to find the real one.",
        question="Who taught you that the truth is dangerous, and were they right?",
        gear=["Reporter's Notebook", "Press Credentials (Forged)", "Pocket Camera"],
        move=0, strike=0, control=1,
        hide=1, sneak=1, sway=2,
        survey=1, read=1, sense=0,
        gilded_sway=True,
        nerve_max=2, nerve_current=2,
        cunning_max=3, cunning_current=3,
        intuition_max=2, intuition_current=2,
        pen_font="Indie Flower",
        ink_color="#1a6b2a",
    )
    db.add(sable_char)

    # ── Finn Ashcroft — Weird/Medium ──────────────────────────────────────────────
    finn_user = User(username="finn_ashcroft", email="finn@candela.test",
                     hashed_password=pwd_context.hash("testpass"))
    db.add(finn_user)
    db.flush()

    finn_char = Character(
        name="Finn Ashcroft",
        pronouns="He/They",
        user_id=finn_user.id,
        game_id=1,
        circle_id=1,
        status="unaffiliated",
        role="Weird",
        specialty="Medium",
        role_ability="Let Them In",
        specialty_ability="Premonitions",
        style="Threadbare wool suit, mismatched buttons. Eyes that sometimes focus on things that aren't there.",
        catalyst="The bleed took my twin sister when we were children. She still visits sometimes. I need to know if she's trapped.",
        question="What is the cost of talking to the dead, and do you pay it willingly?",
        gear=["Spirit Board", "Séance Candles", "Inherited Locket"],
        move=0, strike=0, control=0,
        hide=0, sneak=1, sway=1,
        survey=1, read=1, sense=3,
        gilded_sense=True,
        nerve_max=1, nerve_current=1,
        cunning_max=2, cunning_current=2,
        intuition_max=3, intuition_current=3,
        pen_font="Shadows Into Light",
        ink_color="#6b1a6b",
    )
    db.add(finn_char)

    # ── keeper_test — Lightkeeper, no investigator ────────────────────────────────
    keeper_user = User(username="keeper_test", email="keeper@candela.test",
                       hashed_password=pwd_context.hash("testpass"))
    db.add(keeper_user)
    db.flush()

    campaign = Campaign(
        name="The Veilhaven Chapter",
        campaign_code="veilhaven-01",
        gm_user_id=keeper_user.id,
        roster_finalized=False,
        is_retired=False,
    )
    db.add(campaign)

    db.commit()
    db.close()

    print("\nDatabase reset complete.")
    print("\nAccounts:")
    print("  admin / admin              — Scholar/Professor (Adrian Voss)")
    print("  elara_voss / testpass      — Scholar/Doctor    (Meticulous Notes + Dissection)")
    print("  rook_halcyon / testpass    — Muscle/Soldier    (Behind Me + Sharpshooter)")
    print("  sable_devereux / testpass  — Face/Journalist   (Sweet Talk + Lie Detector)")
    print("  finn_ashcroft / testpass   — Weird/Medium      (Let Them In + Premonitions)")
    print("  keeper_test / testpass     — Lightkeeper of 'The Veilhaven Chapter' (code: veilhaven-01)")
    print("\nAll investigators are unaffiliated. Players join keeper_test's campaign to begin.")


if __name__ == "__main__":
    reset()
