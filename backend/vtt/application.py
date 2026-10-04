"""The FastAPI app: rate limiter, CORS, and every router.

The routers are included in the order the routes were declared in the old
main.py (tests/test_00_startup.py pins that order).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from vtt.config import CORS_ORIGINS
from vtt.routers import auth, campaigns, circles, investigators, notebook, users
from vtt.security import limiter
from vtt.ws import endpoint as ws_endpoint

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

app.include_router(campaigns.router)       # /campaign/... (create to roster)
app.include_router(circles.router)         # circle creation and finalize-roster
app.include_router(auth.router)            # /api/auth/...
app.include_router(investigators.router)   # /api/investigators...
app.include_router(notebook.router)        # /api/notebook/...
app.include_router(users.router)           # /api/users/...
app.include_router(ws_endpoint.router)     # /ws/{game_id}
