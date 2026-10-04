"""Entry point for uvicorn (main:app).

The application lives in the vtt package. Importing this module has the same side
effects as before the split: it reads backend/.env, refuses to start without
SECRET_KEY, creates the tables, seeds user 1 and circle 1 and runs the additive
migrations in init_db. It also re-exports the names the tests use (app,
SessionLocal, db_engine, limiter, init_db, pwd_context, manager,
ConnectionManager, Base, SQLALCHEMY_DATABASE_URL).
"""
import os
import sys
import types
import json
import base64
from typing import List, Optional

# Ensure backend/ is on the path regardless of where uvicorn is invoked from
sys.path.insert(0, os.path.dirname(__file__))

from vtt.config import logger, SQLALCHEMY_DATABASE_URL, CORS_ORIGINS, _SAFE_FONT_NAMES, _ALLOWED_CAMPAIGN_CODE_RE

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request, status, APIRouter, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from models import Base, User, Game, Character, Circle, Campaign, NotebookEntry, CircleVote, Relationship
from engine import (
    create_new_campaign, request_join_campaign,
    approve_investigator, reject_investigator, get_campaign_roster,
    roll_dice, calculate_resistance_max, burn_resistance,
    get_notebook_entries, create_notebook_entry,
    calculate_outcome, OUTCOME_LABELS,
    apply_advancement,
)
from vtt import db as _db
from vtt.security import pwd_context, limiter
from vtt.db import db_engine, SessionLocal, get_db, init_db
from vtt.schemas import (
    NotebookEntryUpdate, LoginRequest, RegisterRequest, CharacterCreate,
    CharacterSummaryItem, CampaignSummaryItem, CharacterResponse, CharacterRosterItem,
    RosterResponse, NotebookEntryCreate, NotebookEntryResponse, RejoinRequest,
    InviteRejoinRequest, CircleVoteSubmit, RelationshipPropose, RelationshipRespond,
    FinalizeRosterRequest,
)
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.circle_queries import get_or_create_campaign_circle, votes_dict, relationships_list, resolve_circle
from vtt.ws.manager import ConnectionManager, manager
from vtt.ws import endpoint as ws_endpoint
from vtt.routers import auth, campaigns, circles, investigators, notebook, users


class _MainModule(types.ModuleType):
    """Assigning main.db_engine or main.SessionLocal (the tests do this with
    monkeypatch to point the app at a scratch schema) also replaces them in vtt.db,
    which is where init_db, get_db and the WebSocket handler look them up."""

    def __setattr__(self, name, value):
        if name in ("db_engine", "SessionLocal"):
            setattr(_db, name, value)
        super().__setattr__(name, value)


sys.modules[__name__].__class__ = _MainModule


Base.metadata.create_all(bind=db_engine)
init_db()

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(campaigns.router)
app.include_router(circles.router)

app.include_router(auth.router)

app.include_router(investigators.router)
app.include_router(notebook.router)

app.include_router(users.router)

app.include_router(ws_endpoint.router)
