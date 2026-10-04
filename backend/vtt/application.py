"""The FastAPI app: rate limiter, CORS, and every router.

The routers are included in the order the routes were declared in the old
main.py (tests/test_00_startup.py pins that order).
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import OperationalError

from vtt.config import CORS_ORIGINS, logger
from vtt.db import is_lock_timeout
from vtt.routers import auth, campaigns, circles, investigators, notebook, users
from vtt.security import limiter
from vtt.ws import endpoint as ws_endpoint

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

BUSY = "This is being changed by another request right now. Try again in a moment."


async def _lock_timeout(request: Request, exc: OperationalError):
    """A request that waited LOCK_TIMEOUT_MS for a row lock (vtt/db.py) answers 503 and
    changes nothing. Any other database error goes on to the usual 500 (the WebSocket
    handles its own errors)."""
    if not is_lock_timeout(exc) or request.scope.get("type") != "http":
        raise exc
    logger.warning("A lock wait timed out: %s %s", request.method, request.url.path)
    return JSONResponse(status_code=503, content={"detail": BUSY}, headers={"Retry-After": "1"})


app.add_exception_handler(OperationalError, _lock_timeout)

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
