from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

    characters = relationship("Character", back_populates="game")
    circles = relationship("Circle", back_populates="game")

class Circle(Base):
    __tablename__ = "circles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    game_id = Column(Integer, ForeignKey("games.id"))

    stitch = Column(Integer, default=0)
    refresh = Column(Integer, default=0)
    train = Column(Integer, default=0)

    game = relationship("Game", back_populates="circles")
    characters = relationship("Character", back_populates="circle")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    circle_id = Column(Integer, ForeignKey("circles.id"))

    # Actions
    # Nerve
    move = Column(Integer, default=0)
    strike = Column(Integer, default=0)
    control = Column(Integer, default=0)
    # Cunning
    hide = Column(Integer, default=0)
    sneak = Column(Integer, default=0)
    sway = Column(Integer, default=0)
    # Intuition
    survey = Column(Integer, default=0)
    read = Column(Integer, default=0)
    sense = Column(Integer, default=0)

    # Gilded Actions (flags)
    gilded_move = Column(Boolean, default=False)
    gilded_strike = Column(Boolean, default=False)
    gilded_control = Column(Boolean, default=False)
    gilded_hide = Column(Boolean, default=False)
    gilded_sneak = Column(Boolean, default=False)
    gilded_sway = Column(Boolean, default=False)
    gilded_survey = Column(Boolean, default=False)
    gilded_read = Column(Boolean, default=False)
    gilded_sense = Column(Boolean, default=False)

    # Drive
    nerve_max = Column(Integer, default=3)
    nerve_current = Column(Integer, default=3)
    cunning_max = Column(Integer, default=3)
    cunning_current = Column(Integer, default=3)
    intuition_max = Column(Integer, default=3)
    intuition_current = Column(Integer, default=3)

    # Marks
    body_marks = Column(Integer, default=0)
    brain_marks = Column(Integer, default=0)
    bleed_marks = Column(Integer, default=0)

    # Scars
    scars_count = Column(Integer, default=0)
    scars_list = Column(JSON, default=list) # List of strings

    # Status
    incapacitated = Column(Boolean, default=False)

    game = relationship("Game", back_populates="characters")
    circle = relationship("Circle", back_populates="characters")
