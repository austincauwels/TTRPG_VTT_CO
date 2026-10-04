"""Pydantic request and response models for the REST routes."""
import re as _re
from typing import List, Optional

from pydantic import BaseModel, field_validator


class NotebookEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_length(cls, v):
        if len(v) > 64:
            raise ValueError("Username too long")
        return v

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanum(cls, v):
        if len(v) < 2 or len(v) > 32:
            raise ValueError("Username must be 2–32 characters")
        if not _re.match(r"^[\w\-. ]+$", v):
            raise ValueError("Username contains invalid characters")
        return v

    @field_validator("email")
    @classmethod
    def email_length(cls, v):
        if len(v) > 254:
            raise ValueError("Email too long")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v

class CharacterBase(BaseModel):
    name: str
    pronouns: str = "Unlisted"
    style: str = ""
    catalyst: str = ""
    question: str = ""
    role: str = ""
    specialty: str = ""
    role_ability: str = "None"
    specialty_ability: str = "None"
    profile_pic: Optional[str] = None
    gear: List[str] = []

    move: int = 0
    strike: int = 0
    control: int = 0
    sneak: int = 0
    hide: int = 0
    sway: int = 0
    survey: int = 0
    read: int = 0
    sense: int = 0

    gilded_move: bool = False
    gilded_strike: bool = False
    gilded_control: bool = False
    gilded_hide: bool = False
    gilded_sneak: bool = False
    gilded_sway: bool = False
    gilded_survey: bool = False
    gilded_read: bool = False
    gilded_sense: bool = False

    nerve_current: int = 1
    nerve_max: int = 1
    nerve_resistance_spent: int = 0
    cunning_current: int = 1
    cunning_max: int = 1
    cunning_resistance_spent: int = 0
    intuition_current: int = 1
    intuition_max: int = 1
    intuition_resistance_spent: int = 0

    body_marks: int = 0
    brain_marks: int = 0
    bleed_marks: int = 0
    scars_count: int = 0
    scars_list: List[str] = []
    incapacitated: bool = False

class CharacterCreate(CharacterBase):
    user_id: Optional[int] = None

class CharacterSummaryItem(BaseModel):
    id: int
    name: str
    role_ability: str = "None"
    specialty_ability: str = "None"
    status: str
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_code: Optional[str] = None
    class Config:
        from_attributes = True

class CampaignSummaryItem(BaseModel):
    id: int
    name: str
    campaign_code: str
    class Config:
        from_attributes = True

class CharacterResponse(CharacterBase):
    id: int
    circle_id: int
    status: str = "unaffiliated"
    pen_font: str = "Caveat"
    ink_color: str = ""
    class Config:
        from_attributes = True

class CharacterRosterItem(BaseModel):
    id: int
    name: str
    role_class: Optional[str] = None
    role_ability: Optional[str] = None
    specialty: Optional[str] = None
    specialty_ability: Optional[str] = None
    profile_pic: Optional[str] = None
    circle_name: Optional[str] = None
    status: str
    is_dead: bool = False
    pen_font: Optional[str] = "Caveat"
    ink_color: Optional[str] = ""
    class Config:
        from_attributes = True

class RosterResponse(BaseModel):
    pending_investigators: List[CharacterRosterItem]
    active_investigators: List[CharacterRosterItem]
    roster_finalized: bool = False

class NotebookEntryCreate(BaseModel):
    title: str
    content: str
    author_name: str
    author_type: str          # 'gm' | 'player'
    character_id: Optional[int] = None
    entry_type: str = 'field_log'
    visibility: str = 'all'
    image_data: Optional[str] = None

class NotebookEntryResponse(BaseModel):
    id: int
    campaign_id: int
    character_id: Optional[int]
    author_name: str
    author_type: str
    pen_font: str
    ink_color: str
    title: str
    content: str
    created_at: str
    page_number: int
    entry_type: str = 'field_log'
    visibility: str = 'all'
    image_data: Optional[str] = None
    is_deleted: bool = False
    class Config:
        from_attributes = True

class RejoinRequest(BaseModel):
    character_id: int
    campaign_code: str

class InviteRejoinRequest(BaseModel):
    username: str

class CircleVoteSubmit(BaseModel):
    circle_id: int
    character_id: int
    vote_type: str   # 'name' | 'ability' | 'question'
    value: str

class RelationshipPropose(BaseModel):
    circle_id: int
    from_character_id: int
    to_character_id: int
    rel_type: str
    lore: str = ""

class RelationshipRespond(BaseModel):
    relationship_id: int
    action: str          # 'accept' | 'counter'
    counter_type: Optional[str] = None
    counter_lore: Optional[str] = None

class FinalizeRosterRequest(BaseModel):
    campaign_id: int
    circle_id: int
