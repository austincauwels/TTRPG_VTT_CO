# Backend module layout (after the main.py split)

backend/main.py used to hold the whole app in about 2,500 lines. It is now a short entry point, and the code lives in the `backend/vtt/` package. The code was moved, not rewritten: route handlers and WebSocket handler bodies are the old text, so ROUTES.md, WEBSOCKET.md and QUIRKS.md still describe the behavior. Their line numbers refer to the old main.py at commit `2355d1b`; the tables below say where each part went.

## Entry point

`backend/main.py` is still what `uvicorn main:app` loads. Importing it:

1. puts backend/ on `sys.path`,
2. imports `vtt.config`, which loads backend/.env, sets up logging and raises `RuntimeError` when `SECRET_KEY` is missing,
3. builds the app (`vtt.application`),
4. runs `Base.metadata.create_all` and `init_db()` (seed rows plus the additive ALTER TABLE migrations), as the old main.py did at import.

main.py re-exports the names the tests use: `app`, `SessionLocal`, `db_engine`, `limiter`, `init_db`, `pwd_context`, `manager`, `ConnectionManager`, `Base`, `SQLALCHEMY_DATABASE_URL`.

Assigning `main.db_engine` or `main.SessionLocal` (the tests do this with monkeypatch to run against a scratch schema) also replaces them in `vtt.db`. main.py does this with a small module subclass. Code in the package always reads them as `vtt.db.SessionLocal` and `vtt.db.db_engine` at call time, so the replacement reaches `init_db`, `get_db` and the WebSocket endpoint.

## Package

| Module | Contents | Old main.py lines |
|---|---|---|
| `vtt/config.py` | .env loading, logging (with the filter that hides `token=` query values), `SECRET_KEY` check, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` (30 days), `SQLALCHEMY_DATABASE_URL`, `CORS_ORIGINS`, `_SAFE_FONT_NAMES`, `_ALLOWED_CAMPAIGN_CODE_RE` | 13 to 20, 48 to 53, 58, 248, 441 to 448 |
| `vtt/security.py` | `pwd_context`, `limiter`, `create_access_token` and `user_id_from_token` (login tokens, see AUTH.md) | 28, 55, 56, 243 |
| `vtt/auth.py` | `get_current_user` (the Bearer token dependency) and the REST access helpers (owner, GM, member checks) | new |
| `vtt/db.py` | `db_engine`, `SessionLocal`, `get_db`, `init_db` | 58 to 240 |
| `vtt/schemas.py` | all pydantic request and response models | 260 to 434, 564, 635, 694 to 715 |
| `vtt/serializers.py` | `get_char_dict`, `get_circle_dict` | 1352 to 1445 |
| `vtt/circle_queries.py` | `get_or_create_campaign_circle`, `votes_dict` and `relationships_list` (were `_votes_dict` and `_relationships_list`), `resolve_circle` | 721 to 753, 1447 to 1454 |
| `vtt/application.py` | `app`, limiter state and handler, CORS, router includes in the old route order | 244 to 255, 944 |
| `vtt/routers/campaigns.py` | `/campaign/create` through `/campaign/{campaign_id}/roster` | 450 to 688 |
| `vtt/routers/circles.py` | circle-creation-state, `/circle/vote`, `/circle/relationship/*`, `/campaign/finalize-roster` | 755 to 942 |
| `vtt/routers/auth.py` | `/api/auth/login`, `/api/auth/register` | 950 to 1020 |
| `vtt/routers/investigators.py` | `/api/investigators`, `/api/investigators/{id}`, `/api/investigators/forge` | 1022 to 1088 |
| `vtt/routers/notebook.py` | the five `/api/notebook` routes | 1094 to 1245 |
| `vtt/routers/users.py` | `/api/users/{user_id}/characters`, `/api/users/{user_id}/campaigns` | 1251 to 1280 |
| `vtt/ws/manager.py` | `ConnectionManager`, the `manager` singleton, `character_key` and `campaign_key` (the channel keys) | 1285 to 1350 |
| `vtt/ws/endpoint.py` | `/ws/{game_id}`: connect, channel and campaign resolution, the receive loop, dispatch | 1456 to 1520, 2518 to 2525 |
| `vtt/ws/context.py` | `WSContext`, the state passed to a handler | new |
| `vtt/ws/access.py` | who may open which channel (`resolve_channel`, close codes 4401, 4403, 4404) and who may send which message (`check_target`, `check_message`) | new |
| `vtt/ws/handlers/__init__.py` | `HANDLERS`: message type to (handler, needs_character) | new |
| `vtt/ws/handlers/gm.py` | `gm_update_tension`, `gm_update_circle`, `gm_transition_scene`, `gm_toggle_resource_edit`, `gm_toggle_reports`, `gm_advance_circle`, `refill_resources`, `gm_end_assignment`, `gm_reset_character`, `update_circle` | WEBSOCKET.md 4.2 |
| `vtt/ws/handlers/rolls.py` | `roll`, `resolve_gilded`, `use_post_roll_ability`, `burn_resistance` | WEBSOCKET.md 4.3 |
| `vtt/ws/handlers/character.py` | `update_drive`, `update_pen_font`, `apply_scar`, `revive_character`, `update_gear`, `apply_advancement` | WEBSOCKET.md 4.4 |
| `vtt/ws/handlers/marks.py` | `take_mark`, `resolve_ability_mark`, `intercept_mark`, `INTERCEPT_ABILITIES` | WEBSOCKET.md 4.5 |
| `vtt/ws/handlers/circle.py` | `submit_assignment_report`, `spend_resource`, `circle_creation_vote`, `circle_backstory_update`, `circle_personal_answer`, `circle_relationship_propose`, `circle_relationship_respond` | WEBSOCKET.md 4.6 |
| `vtt/ws/handlers/chat.py` | `chat_message`, `add_notebook_entry` | WEBSOCKET.md 4.7 |

`engine.py` and `models.py` stay where they were.

## WebSocket dispatch

The old receive loop was one if/elif chain. Now the endpoint resolves the target character for each message exactly as before, then looks the type up in `HANDLERS`:

- Unknown types, and types that are not strings, are ignored, as before.
- Since the login token stage, `vtt.ws.access.check_target` checks the character the message names, then `check_message` checks the type's own rule; a rejected message gets an `action_rejected` frame and its handler does not run (AUTH.md).
- Types whose old branch had `and character` are marked `needs_character` and are ignored when no character was resolved.
- Each handler is `async def handle_<type>(ctx)` and receives a `WSContext`. `game_id`, `db`, `circle`, `camp_code` and `camp_id` are fixed at connect time (as they were). `payload`, `character` and `target_char_id` are set per message.
- A handler body is the old branch body. A `continue` that skipped to the next message is now `return`; a `continue` inside a loop of the handler is unchanged.
- An exception from a handler still leaves the loop and ends the connection (only `roll` catches its own errors).

Bug D1 is kept on purpose: `vtt/ws/handlers/marks.py` does not import `secrets`, so the Endurance branch of `take_mark` still raises `NameError` and ends the socket.

## Tests that pin the surface

`backend/tests/test_surface.py` was added before the split, on the unchanged code:

- the HTTP route table (methods, path, endpoint name, response model, declared status code), the WebSocket route, and which routes are rate limited,
- the whole OpenAPI document against `backend/tests/data/openapi.json` (every query, path, form and body parameter and every schema),
- one minimal message of each of the 32 WebSocket types, with the exact frames the sender gets back.

After the split it also pins the `HANDLERS` table and its `needs_character` flags.
