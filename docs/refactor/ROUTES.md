# Backend route map (refactor baseline)

This file maps every HTTP and WebSocket entry point of the FastAPI backend before the refactor. It is meant as the checklist for keeping every path and payload identical while main.py is split up.

- Branch: `beta`, mapped at commit `2355d1b` on 2026-10-03.
- Line numbers refer to `backend/main.py` at that commit unless another file is named.
- Sources read: `backend/main.py`, `models.py`, `engine.py`, `gm_hub.py`, the two seed scripts, and `frontend/src` (store, components, vite config).

## How to read this

- **Trusted ids**: ids the server takes from the client (path, query, body or WebSocket payload) and acts on without checking that the caller owns them or may act on them.
- **Intended access**: who should be allowed, inferred from the frontend (which screen calls it, which role sees the button) and the game rules (the GM is the Lightkeeper of one campaign; players own investigators).
- **Current access for every route is "anyone who can reach the server".** There is no session or token. Login returns `userId`, the frontend keeps it in localStorage and sends it back as a plain value. `SECRET_KEY` is required at startup but never used; `jose`, `OAuth2PasswordBearer` (tokenUrl `token`, a route that does not exist) and `ACCESS_TOKEN_EXPIRE_MINUTES` are imported or defined and unused. GM-only WebSocket actions check only `payload.role == "GM"`, which the client sets.
- On the beta site nginx basic auth is the only outer gate. nginx proxies `/api/`, `/campaign/`, `/circle/` and `/ws/` to the app and returns 404 for `/docs`, `/redoc` and `/openapi.json`.

## Startup behavior (all of it runs at import time of main.py)

1. `sys.path.insert(0, backend/)` so `models` and `engine` import from any working directory (line 12).
2. `load_dotenv(backend/.env)` (line 13). Existing environment variables win.
3. `logging.basicConfig(...)` on the root logger, logger name `candela` (lines 15 to 20).
4. `SECRET_KEY` missing raises `RuntimeError` and the module fails to import (lines 48 to 50).
5. `pwd_context` (bcrypt) is created (line 55).
6. Engine and session factory: `DATABASE_URL`, default `sqlite:///./candela_obscura.db`, which is relative to the process working directory, not to backend/. SQLite gets `check_same_thread=False` (lines 58 to 61). Production and the test harness use PostgreSQL.
7. `Base.metadata.create_all(bind=db_engine)` (line 62).
8. `init_db()` is called at line 241:
   - Seeds circle `id=1` "The Order of Light" (stitch, refresh, train = 1, `campaign_id` NULL) if missing.
   - Seeds user `id=1` username `admin`, email `admin@archive.com`, password `admin` (bcrypt) if no user named `admin` exists.
   - Both seeds are in one transaction. Any error is logged and swallowed, so a failure (for example a different user already holding id 1) silently skips both rows.
   - Then runs about 30 additive `ALTER TABLE ... ADD COLUMN` statements, each in its own connection, each wrapped in `except Exception: pass`. Columns: circles (guard_patrol, miasma_bleed, location, atmosphere, chapter_house_location, circle_ability, insignia, backstory_answers, is_finalized, illumination, tension_clock, tension_label, resources_editable, reports_open, campaign_id), campaigns (gm_user_id, roster_finalized), characters (role, specialty, personal_circle_answer, nerve/cunning/intuition_resistance_spent, ability_uses, train_bonus, resources_spent_assignment), relationships (last_actor_id), notebook_entries (entry_type, visibility, image_data, is_deleted), users (pending_rejoin_campaign_id).
   - Before the bug-fix stage the ALTER types did not match the models: booleans were added as `INTEGER`, JSON columns (`backstory_answers`, `ability_uses`) as `TEXT`. They now add `BOOLEAN DEFAULT FALSE` and `JSON`, and `convert_integer_flags` turns a flag column that is still an integer into a boolean on every start (characters.train_bonus broke every forge and train action this way). On a database created by `create_all` the ALTERs all fail harmlessly. On an older database that got the JSON columns as `TEXT`, values can come back as strings, which is why several places do `if isinstance(x, str): json.loads(x)`.
9. `limiter = Limiter(key_func=get_remote_address)`, `app = FastAPI()`, `app.state.limiter`, the `RateLimitExceeded` handler, and CORS from `CORS_ORIGINS` (default `http://localhost:5173,http://localhost:4173`, credentials allowed, all methods and headers) (lines 243 to 255).
10. Routes are registered in this order: the prefix-less `router` (all `/campaign/*` and `/circle/*` routes, included at line 944), then the `/api/*` routes on `app`, then `/ws/{game_id}`.
11. `manager = ConnectionManager()` module singleton (line 1350). It only works with one worker process; `candela.service` runs `uvicorn main:app --workers 1 --proxy-headers --forwarded-allow-ips 10.0.0.202`.

### Legacy fallbacks to user 1 and circle 1

- `POST /api/investigators/forge` uses `user_id` from the body, falls back to `1` when it is missing or falsy, and falls back to user 1 again when that user does not exist (lines 1066 to 1071). Every forged character gets `circle_id = 1` (it recreates circle 1 if missing).
- Joining, approving and finalizing never change `Character.circle_id`. Only `/campaign/rejoin` moves a character onto the campaign's own circle. So nearly every character points at circle 1, `Circle.characters` on campaign circles is mostly empty, and `get_circle_dict(...)["max_capacity"]` and `refill_resources` (both count `circle.characters`) disagree with `finalize-roster` (which counts active campaign members).
- WebSocket connect falls back to circle 1 when the connection has no campaign, and creates it if missing (lines 1481 to 1486).
- Most WebSocket circle actions use `payload.circle_id or connection_circle.id or 1`.
- `resolve_circle(db, circle_id, camp_id)` (line 1447) first looks for the circle inside the campaign, then falls back to a plain id lookup, so the campaign scoping does not restrict anything.
- `gm_update_circle` does a plain `Circle.id` lookup with `circle_id or 1`, and the frontend `SceneManager.jsx` hard-codes `circle_id: 1`. From reading the code, the GM's tension clock and scene text are written to the shared legacy circle 1 for every campaign, and circle 1's full state is then broadcast to that campaign as `circle_update`. Confirm this with a characterization test before changing it.

### Fresh PostgreSQL databases (likely, to be confirmed)

`init_db` inserts `circles.id = 1` and `users.id = 1` with explicit ids. On PostgreSQL that does not advance the SERIAL sequences, so on a fresh database the first `POST /api/auth/register` and the first auto-created campaign circle probably fail with a duplicate key (500) and the next attempt succeeds. The deployment kit has `ct/resync-sequences.sql` for the same reason. The test harness recreates a fresh database on every run, so tests will hit this.

## REST routes

Summary. "Caller" is the frontend file that uses the route; "none" means the frontend never calls it.

| Method | Path | Handler | Line | Writes | Caller | Intended access |
|---|---|---|---|---|---|---|
| POST | /campaign/create | create_campaign | 450 | yes | CampaignSelector.jsx | logged-in user, becomes GM |
| POST | /campaign/join | join_campaign | 458 | yes | gameStore.joinCampaign | owner of the character |
| POST | /campaign/approve/{character_id} | approve_character | 489 | yes | gameStore.approveInvestigator (GM panel) | GM of the character's campaign |
| POST | /campaign/reject/{character_id} | reject_character | 512 | yes | gameStore.rejectInvestigator (GM panel) | GM of the character's campaign |
| POST | /campaign/{campaign_id}/retire | retire_campaign | 545 | yes | OperationsPanel.jsx | GM of that campaign |
| POST | /campaign/rejoin | rejoin_campaign | 568 | yes | AppRouter.jsx | owner of the character, if invited or their old character there died |
| POST | /campaign/{campaign_id}/invite-rejoin | invite_rejoin | 638 | yes | DiceVault.jsx (GM controls only) | GM of that campaign |
| GET | /campaign/{campaign_id}/roster | get_roster | 663 | no | OperationsPanel.jsx, TactileSidebar.jsx | GM or member of that campaign |
| GET | /campaign/{campaign_id}/circle-creation-state | get_circle_creation_state | 755 | yes (may create circle) | MainDeskView.jsx, OperationsPanel.jsx | GM or member of that campaign |
| POST | /circle/vote | submit_circle_vote | 771 | yes | none (WS used instead) | owner of character_id, member of the circle's campaign |
| POST | /circle/relationship/propose | propose_relationship | 804 | yes | none (WS used instead) | owner of from_character_id, both in the circle's campaign |
| POST | /circle/relationship/respond | respond_relationship | 829 | yes | none (WS used instead) | owner of the relationship's to-character |
| POST | /campaign/finalize-roster | finalize_roster | 845 | yes | gameStore.finalizeRoster (GM panel) | GM of that campaign |
| POST | /api/auth/login | login | 950 | no | LoginScreen.jsx | anyone (rate limited 10/minute per IP) |
| POST | /api/auth/register | register | 995 | yes | LoginScreen.jsx | anyone (rate limited 5/minute per IP) |
| GET | /api/investigators | list_investigators | 1022 | no | none | nobody needs it (lists every character of every user) |
| GET | /api/investigators/{investigator_id} | get_investigator | 1040 | no | GMCharacterSheet.jsx, gameStore.refreshCharacterStatus | owner, or GM of the character's campaign |
| POST | /api/investigators/forge | forge_investigator | 1055 | yes | AppRouter.jsx | logged-in user, for themself |
| GET | /api/notebook/{campaign_id}/entries | fetch_notebook_entries | 1094 | no | NotebookView.jsx | GM or member of that campaign; gm_only rows for the GM only; self rows for that character's owner only |
| POST | /api/notebook/{campaign_id}/entries | add_notebook_entry | 1112 | yes | NotebookView.jsx | GM or member of that campaign, writing as themself |
| PUT | /api/notebook/entries/{entry_id} | update_notebook_entry | 1169 | yes | NotebookView.jsx (GM lk_main autosave) | author of the entry |
| DELETE | /api/notebook/entries/{entry_id} | delete_notebook_entry | 1182 | yes (soft) | NotebookView.jsx | author of the entry (UI: GM deletes gm entries, player deletes own) |
| POST | /api/notebook/{campaign_id}/upload | upload_notebook_image | 1190 | yes | NotebookView.jsx | GM or member of that campaign |
| GET | /api/users/{user_id}/characters | get_user_characters | 1251 | no | gameStore.fetchUserData | the logged-in user themself |
| GET | /api/users/{user_id}/campaigns | get_user_gm_campaigns | 1275 | no | gameStore.fetchUserData | the logged-in user themself |
| WS | /ws/{game_id} | websocket_endpoint | 1456 | yes | gameStore.connect | owner of character `game_id`, or GM of campaign code `game_id` |

### Campaign router (prefix-less `APIRouter`, defined at line 439)

**POST /campaign/create** (line 450, `def`)
- Inputs: query `name` (1 to 80 chars), `code` (regex `^[a-zA-Z0-9\-_]{3,32}$`), optional `user_id` (int).
- Trusted ids: `user_id` becomes `campaigns.gm_user_id`.
- Tables: campaigns (insert) via `engine.create_new_campaign`.
- Response: the ORM Campaign object serialized by FastAPI (id, name, campaign_code, gm_user_id, roster_finalized, is_retired).
- Notes: a duplicate code is 409 "Campaign code is already in use", also when another request takes the code between the check and the insert (before the bug-fix stage it raised an unhandled IntegrityError, a 500). Without `user_id` the campaign has no GM and is unreachable from the UI. A code made only of digits is allowed and collides with character-id WebSocket channels (see WebSocket section).

**POST /campaign/join** (line 458, `async def`)
- Inputs: query `character_id` (int), `code`, `pen_font` (default Caveat, replaced by Caveat if not in `_SAFE_FONT_NAMES`).
- Trusted ids: `character_id`.
- Tables: campaigns (read), characters (update campaign_id, status `pending`, pen_font), characters (read pending list).
- Broadcast: `investigator_joined` with `{campaign_code, pending_investigators}` to the campaign (or to `code` if no campaign id).
- Errors: 422 bad code format, 404 with engine error text.
- Notes: no check of the character's current status, so an active character in another campaign is moved to pending here. Response is the engine dict `{"success": true, "character": <ORM Character>}` serialized by FastAPI (all columns, including user_id).

**POST /campaign/approve/{character_id}** (line 489, `async def`)
- Inputs: path `character_id`.
- Trusted ids: `character_id`.
- Tables: characters (status `active`, ink_color from `INK_COLORS` by active count; dead predecessors of the same user in the campaign set to `retired`), campaigns (read).
- Broadcast: `investigator_approved` with `{character, active_investigators, campaign_id}`.
- Errors: 400 if not pending. If the character's campaign row is missing, `campaign.campaign_code` raises (500).

**POST /campaign/reject/{character_id}** (line 512, `async def`)
- Inputs: path `character_id`.
- Trusted ids: `character_id`.
- Tables: characters (status `unaffiliated`, campaign_id NULL, pen_font NULL), campaigns (read).
- Broadcast: `investigator_rejected` `{character_id, pending_investigators}` to the campaign, then `{character_id}` to channel `str(character_id)`.
- Errors: 400 if not pending.

**POST /campaign/{campaign_id}/retire** (line 545, `async def`)
- Inputs: path `campaign_id`.
- Trusted ids: `campaign_id`.
- Tables: campaigns (is_retired true), characters (active and pending set to `retired`).
- Broadcast: `campaign_retired` `{campaign_id, campaign_code}`. Note that `broadcast_campaign` runs after the commit, so it only reaches the GM channel (characters are no longer active).
- Response: `{"ok": true}`. 404 if the campaign is missing.

**POST /campaign/rejoin** (line 568, `async def`)
- Inputs: JSON body `RejoinRequest {character_id, campaign_code}`.
- Trusted ids: `character_id`, `campaign_code`.
- Tables: campaigns (read), characters (retire the same user's other active or dead characters in the campaign; set new character campaign_id, ink_color, status `active`, circle_id to the campaign circle if one exists), users (clear pending_rejoin_campaign_id).
- Broadcast: `investigator_approved` and `character_joined_mid_campaign`, both with the new character and active list.
- Response: `{"success": true, "character": get_char_dict(...)}`.
- Notes: skips GM approval entirely and does not check that an invite exists or that a predecessor died. Imports `INK_COLORS` from engine inside the function.

**POST /campaign/{campaign_id}/invite-rejoin** (line 638, `async def`)
- Inputs: path `campaign_id`, JSON body `InviteRejoinRequest {username}` (case-insensitive match; since the security review an exact match wins and a name that matches more than one user ignoring case is 409).
- Trusted ids: `campaign_id`.
- Tables: campaigns (read), users (set pending_rejoin_campaign_id), characters (read the user's characters).
- Broadcast: `gm_rejoin_invite` `{campaign_id, campaign_name, campaign_code}` to every character channel of that user.
- Response: `{"ok": true}`. 404 if campaign or user is missing (the 404 also confirms whether a username exists).

**GET /campaign/{campaign_id}/roster** (line 663, `def`, `response_model=RosterResponse`)
- Inputs: path `campaign_id`.
- Trusted ids: `campaign_id`.
- Tables: characters joined with circles (engine `get_campaign_roster`), campaigns.
- Response: `{pending_investigators, active_investigators (dead excluded), roster_finalized}`; items are `CharacterRosterItem`.

**GET /campaign/{campaign_id}/circle-creation-state** (line 755, `def`)
- Inputs: path `campaign_id`.
- Trusted ids: `campaign_id`.
- Tables: circles (creates "Unnamed Circle" for the campaign if none, and commits), characters, circle_votes, relationships.
- Response: `{circle_id, is_finalized, active_investigators, votes, relationships, backstory_answers}`.
- Notes: a GET with a write side effect, and it works for any campaign id, including ids that do not exist.

**POST /circle/vote** (line 771, `def`)
- Inputs: JSON `CircleVoteSubmit {circle_id, character_id, vote_type, value}`.
- Trusted ids: `circle_id`, `character_id`.
- Tables: circle_votes (insert or update; `name_suggest` allows up to 5 distinct values per character).
- Response: `{"ok": true, "votes": <list for vote_type>}`. A `vote_type` outside name_suggest, name_vote, ability, question, insignia is 422 "Unknown vote type." and nothing is stored (before the bug-fix stage it was stored and then the response raised KeyError, a 500).
- Notes: unused by the frontend; the WebSocket `circle_creation_vote` action does the same thing.

**POST /circle/relationship/propose** (line 804, `def`)
- Inputs: JSON `RelationshipPropose {circle_id, from_character_id, to_character_id, rel_type, lore}`.
- Trusted ids: all three ids.
- Tables: relationships (insert or reset to proposed).
- Response: `{"ok": true, "relationships": [...]}`.
- Notes: unused. Unlike the WebSocket version it does not set `last_actor_id`.

**POST /circle/relationship/respond** (line 829, `def`)
- Inputs: JSON `RelationshipRespond {relationship_id, action, counter_type, counter_lore}`.
- Trusted ids: `relationship_id`.
- Tables: relationships.
- Notes: unused. Semantics differ from the WebSocket version: here `counter` sets status `countered` and stores counter fields; the WebSocket version rewrites the terms and sets status back to `proposed`.

**POST /campaign/finalize-roster** (line 845, `async def`)
- Inputs: JSON `FinalizeRosterRequest {campaign_id, circle_id}`.
- Trusted ids: `campaign_id`, `circle_id`.
- Tables: campaigns (roster_finalized), circles (may create; name, circle_ability, insignia, backstory_answers.selected_question_key, chapter_house_location, is_finalized, stitch/refresh/train = 1 + active members), circle_votes (read), characters (pending ones set to `unaffiliated`, campaign_id NULL).
- Broadcast: `roster_finalized` `{circle, campaign_id, rejected_character_ids}`.
- Response: `get_circle_dict(circle)`.

### Auth routes (on `app`)

**POST /api/auth/login** (line 950, `async def`, `@limiter.limit("10/minute")`)
- Inputs: JSON `LoginRequest {username (max 64), password}`; `request: Request` is required by slowapi.
- Tables: users, campaigns (read).
- Response, GM (user has a non-retired campaign with `gm_user_id` = user): `{role: "GM", name, userId, campaignCode, campaignId}`.
- Response, player: `{role: "PLAYER", name, userId, campaignCode: null, campaignId: null, pendingRejoinInvite: {campaign_id, campaign_name, campaign_code} | null}`.
- Errors: 401 `Invalid credentials.`; 429 from slowapi.
- Notes: no token is issued. The returned `userId` is what every later call trusts.

**POST /api/auth/register** (line 995, `async def`, status 201, `@limiter.limit("5/minute")`)
- Inputs: JSON `RegisterRequest {username (2 to 32, `^[\w\-. ]+$`), email (max 254, not validated as an address), password (8 to 128)}`.
- Tables: users (insert), campaigns (read code `fairelands-01`).
- Response: `{role: "PLAYER", name, userId, campaignCode: "fairelands-01", campaignId: <id or null>}`. The hard-coded campaign code is a leftover; the frontend ignores it.
- Errors: 400 for a taken username or email; 422 validation.

### Investigator routes

**GET /api/investigators** (line 1022, `async def`, `response_model=List[CharacterRosterItem]`)
- Returns every character in the database. Unused by the frontend.

**GET /api/investigators/{investigator_id}** (line 1040, `async def`, `response_model=CharacterResponse`)
- Trusted ids: `investigator_id`.
- Tables: characters. Parses `gear` and `scars_list` if stored as strings (mutates the ORM object, never committed).
- Response fields are limited by `CharacterResponse` (no user_id or campaign_id). `circle_id` is an optional int: a character with NULL circle_id is returned with `circle_id: null` (before the bug-fix stage it was a required int, and such a character failed response validation with a 500).

**POST /api/investigators/forge** (line 1055, `async def`, status 201, `response_model=CharacterResponse`)
- Inputs: JSON `CharacterCreate` (all `CharacterBase` fields plus optional `user_id`).
- Trusted ids: `user_id` (falls back to 1, see legacy fallbacks).
- Tables: circles (creates id 1 if missing), users (read), characters (insert with circle_id 1).
- Errors: any exception becomes 500 `Database Forge Error: <text>` after rollback.
- Notes: the client can set every stat directly (action ratings, drives, marks, scars, gilded flags); there is no server-side character creation rule check.

### Notebook routes

**GET /api/notebook/{campaign_id}/entries** (line 1094, `def`)
- Inputs: path `campaign_id`, query `role` (default `player`), `character_id` (optional int; an empty value, which the GM's notebook sends, counts as absent since the bug-fix stage, where it used to be a 422).
- Trusted ids: `campaign_id`, `character_id`, and the `role` string.
- Tables: notebook_entries (non-deleted, ordered by page).
- Filtering: `all` always; `gm_only` when `role == "GM"`; `self` when `entry.character_id == character_id`. Anyone can pass `role=GM` to read the Lightkeeper's private notes.

**POST /api/notebook/{campaign_id}/entries** (line 1112, `async def`, status 201)
- Inputs: JSON `NotebookEntryCreate {title, content, author_name, author_type, character_id, entry_type, visibility, image_data}`.
- Trusted ids: `campaign_id`, `character_id`; also trusts `author_name`, `author_type`, `visibility`.
- Tables: characters (read pen_font, ink_color), notebook_entries (insert, page = max + 1), campaigns (read).
- Broadcast when `visibility == "all"`: `notebook_entry` with the entry, then `activity_log` "X has archived a journal entry.".

**PUT /api/notebook/entries/{entry_id}** (line 1169, `def`)
- Inputs: JSON `NotebookEntryUpdate {title?, content?}`.
- Trusted ids: `entry_id`. No campaign or author check.

**DELETE /api/notebook/entries/{entry_id}** (line 1182, `def`, status 204)
- Soft delete (`is_deleted = true`). Trusted ids: `entry_id`. No check.

**POST /api/notebook/{campaign_id}/upload** (line 1190, `async def`, status 201)
- Inputs: multipart `file` (max 2 MB after reading), form `title`, `content`, `author_name`, `author_type`, `entry_type` (default sketch), `character_id`.
- Trusted ids: `campaign_id`, `character_id`; the client `content_type` goes straight into the stored data URI.
- Tables: characters (read), notebook_entries (insert, visibility forced to `all`).
- Response: hand-built dict (no `author_type` key, unlike the JSON route). No broadcast, unlike the JSON route.

### User routes

**GET /api/users/{user_id}/characters** (line 1251, `def`, `response_model=List[CharacterSummaryItem]`)
- Trusted ids: `user_id`. Tables: characters, campaigns. Anyone can list anyone's characters.

**GET /api/users/{user_id}/campaigns** (line 1275, `def`, `response_model=List[CampaignSummaryItem]`)
- Trusted ids: `user_id`. Tables: campaigns (non-retired with that GM). Returns campaign codes, which are the GM WebSocket channel names.

## WebSocket: /ws/{game_id} (line 1456)

### Connection setup

1. `manager.connect(game_id)` accepts the socket and closes any earlier socket on the same `game_id` with code 1001 (one tab per channel).
2. A long-lived `SessionLocal()` session is opened for the whole connection (not `get_db`).
3. If `game_id` parses as an int it is a character id and the character is loaded. Otherwise it is treated as a GM campaign code.
4. Campaign: the character's campaign, else the campaign whose code equals `game_id`.
5. Circle: the campaign's circle (created if missing), else circle 1 (created if missing).
6. `camp_code` and `camp_id` are fixed for the connection. A character that joins a campaign after connecting gets no campaign broadcasts until it reconnects.
7. Sends `character_update` (if a character) and `circle_update`.

Intended: a numeric channel only for the owner of that character; a code channel only for the GM of that campaign. Today anyone can open any channel, which also kicks the real user off.

### Per message

- Message is `{type, payload}`; invalid JSON and JSON that is not an object are ignored, and a payload that is not an object gets `action_rejected` 422.
- `target_char_id = payload.character_id`, else `int(game_id)`, else None. `character` is reloaded from that id on every message. So any action guarded by "and character" can be aimed at any character id by putting `character_id` in the payload.
- `broadcast(game_id)` reaches only the sender's own channel. `broadcast_campaign(camp_code, camp_id)` reaches the GM channel (campaign code) plus every active character channel in the campaign; with no `camp_id` it reaches only `camp_code`.
- Only the `roll` branch has its own try/except (rollback and `roll_error`). An exception in any other branch ends the receive loop and closes the connection.

### Actions

| Action | Line | Payload | Trusted ids | Writes | Caller | Intended access | Notes |
|---|---|---|---|---|---|---|---|
| gm_update_tension | 1522 | mark_type, value, role, character_id? | character_id | characters.{mark}_marks | none (store action gmAdjustTension is never called) | GM of the character's campaign | Needs a character; a GM code channel has none unless character_id is sent. |
| gm_update_circle | 1532 | role, circle_id, stitch, refresh, train, guard_patrol, miasma_bleed, location, atmosphere, tension_clock, tension_label | circle_id | circles | SceneManager.jsx | GM of the campaign | Plain id lookup, frontend sends circle_id 1 (see legacy fallbacks). No type checks. |
| gm_transition_scene | 1545 | role, scene_name, description | none | no | none | GM | Sends `scene_transition` to the sender only. |
| roll | 1557 | action, drive_spent, is_secret, ability_mods, character_id? | character_id | characters (drive, brain_marks, ability_uses, train_bonus) | ActionModule, DiceVault, InvestigatorDossier | owner of the character; GM for a Lightkeeper roll | `action` is not validated (any attribute name feeds the pool). `ABILITY_MOD_DEFS` and `MAX_ABILITY_USES` are rebuilt per message. Sends `roll_result` to the sender, `activity_log` to the campaign unless secret or a gilded choice is pending. |
| update_drive | 1698 | pool, value | character_id | characters.{pool}_current | ActionModule, InvestigatorDossier | owner | No bounds on value. |
| resolve_gilded | 1706 | action, chosen_type, chosen_value | character_id | characters drive +1 if gilded | gameStore.resolveGildedChoice | owner | The client chooses the result value; the server keeps no record of the pending roll. `int()` failure closes the socket. |
| use_post_roll_ability | 1731 | ability, drive? | character_id | characters | DiceVault | owner | Flourish, Learn from My Mistakes, Bending Spoons; no use limits. |
| update_pen_font | 1757 | pen_font | character_id | characters.pen_font | NotebookView | owner | Allow-listed fonts. |
| take_mark | 1764 | mark_type, is_from_enemy | character_id | characters marks, incapacitated | InvestigatorDossier | owner (GM arguably) | Soak and Death Defy offers return early, and the mark is never applied if the offer is dismissed. Endurance branch calls `secrets.randbelow` but main.py never imports `secrets` (NameError closes the socket). Sends intercept offers to other characters' channels. |
| resolve_ability_mark | 1887 | ability, choice | character_id | characters | AbilityMarkOffer | owner | "Back Against the Wall" is offered as a soak in take_mark but has no branch here. |
| intercept_mark | 1917 | ability, target_character_id, mark_type | character_id, target_character_id | characters (self and target) | AbilityMarkOffer | owner of the interceptor; target must be in the same campaign | Target is not scoped to the campaign. |
| apply_scar | 1985 | scar_text, shift_down, shift_up, skip_shifts | character_id | characters | ScarModal | owner | `shift_down` and `shift_up` are any attribute names (`hasattr`), so a client can decrement and increment columns such as user_id or campaign_id. Intended: action ratings only. |
| revive_character | 2006 | none | character_id | characters (marks 0, incapacitated false) | InvestigatorDossier | owner (GM arguably) | |
| burn_resistance | 2023 | action, drive_key | character_id | characters.{drive}_resistance_spent | DiceVault | owner | |
| update_gear | 2040 | gear (list), character_id | character_id | characters.gear | InvestigatorDossier | owner | |
| gm_toggle_resource_edit | 2056 | role, circle_id | circle_id | circles.resources_editable | CirclePage | GM | resolve_circle fallback reaches any circle. |
| gm_toggle_reports | 2065 | role, circle_id | circle_id | circles.reports_open | CirclePage | GM | same |
| submit_assignment_report | 2074 | circle_id, character_id, responses | circle_id, character_id | circles.backstory_answers.reports | CircleView | owner of character_id, member | No "and character" guard. |
| gm_advance_circle | 2097 | role, circle_id, circle_ability | circle_id | circles (circle_ability appended, illumination minus 12) | CirclePage | GM | Sends `activity_log` and `circle_advanced`. |
| refill_resources | 2122 | role, circle_id | circle_id | circles stitch/refresh/train | CirclePage | GM | Capacity counts `circle.characters` (see legacy fallbacks). |
| gm_end_assignment | 2134 | role, circle_id, campaign_id (ignored) | circle_id | circles (location, atmosphere cleared), characters (ability_uses, resources_spent_assignment, train_bonus reset for active members) | SceneManager | GM | |
| gm_reset_character | 2160 | role, character_id | character_id (scoped to camp_id) | characters drives, resistances, ability_uses | GMCharacterSheet | GM | One of the few scoped lookups. |
| spend_resource | 2189 | resource_type, circle_id (ignored) | character_id | circles resource -1, characters | CircleView | owner, member | Uses the connection's circle; requires resources_editable; max 2 per assignment. |
| apply_advancement | 2236 | choice, detail, character_id | character_id | characters | CircleView | owner, after a circle advancement | No server gate on when advancement is allowed. Frontend sends `accessSession.characterId`, which is normally undefined, so the channel id is used. |
| update_circle | 2258 | role, circle_id, name, stitch, refresh, train, guard_patrol, miasma_bleed, location, atmosphere, chapter_house_location, circle_ability, illumination, tension_clock, tension_label | circle_id | circles | CirclePage (GM), CircleView (GM branch only) | GM | Non-GM may only lower resources, but role is client-claimed. A string compared with an int raises and closes the socket. |
| circle_creation_vote | 2284 | circle_id, character_id, vote_type, value | circle_id, character_id | circle_votes | CircleCreationPopup | owner of character_id, member | Sends `vote_update`. |
| circle_backstory_update | 2322 | circle_id, question_key, answer | circle_id | circles.backstory_answers | CircleCreationPopup | member | Sends `backstory_update`. |
| circle_personal_answer | 2343 | character_id, answer | character_id (scoped to camp_id when set) | characters.personal_circle_answer | CircleCreationPopup | owner | Sends `personal_answer_update`. |
| circle_relationship_propose | 2359 | circle_id, from_character_id, to_character_id, rel_type, lore | all three | relationships | CircleCreationPopup, RelationshipIntroPopup | owner of from_character_id, both members | Sends `relationship_update`. |
| circle_relationship_respond | 2390 | relationship_id, action, counter_type, counter_lore | relationship_id | relationships | CircleCreationPopup, CircleView, RelationshipIntroPopup | owner of the to-character | `actor_id = int(game_id)` raises on a GM code channel and closes the socket. |
| chat_message | 2416 | sender_name, message, target | none (sender_name is trusted text) | no | DiceVault | member or GM; `@Environment` GM only (UI) | Direct target looked up with `Character.name.ilike(name)`, so `%` wildcards match. Assigns a local named `text`, which shadows sqlalchemy `text` for the whole function. |
| add_notebook_entry | 2472 | campaign_id, title, content, author_name, author_type, pen_font, ink_color, character_id, entry_type, visibility, image_data | campaign_id, character_id | notebook_entries | none | member of that campaign | Writes to any campaign but broadcasts to the connection's campaign. |

### Server to client message types

From the WebSocket handler: `character_update`, `circle_update`, `roll_result`, `roll_error`, `scene_transition`, `activity_log`, `ability_mark_offer`, `ability_intercept_offer`, `trigger_scar`, `assignment_report_submitted`, `circle_advanced`, `vote_update`, `backstory_update`, `personal_answer_update`, `relationship_update`, `notebook_entry`.

From REST routes: `investigator_joined`, `investigator_approved`, `investigator_rejected`, `campaign_retired`, `character_joined_mid_campaign`, `gm_rejoin_invite`, `roster_finalized`, `notebook_entry`, `activity_log`.

`character_update` payloads come from `get_char_dict` (line 1352) and `circle_update` payloads from `get_circle_dict` (line 1419). Both shapes must stay identical.

## Dev scripts and placeholders

- `backend/reset_seed.py`: wipes every table and seeds admin/admin, four test players (password `testpass`), and `keeper_test` with campaign `veilhaven-01`. It hard-codes `sqlite:///./candela_obscura.db`, so it never touches PostgreSQL. Not imported by the app.
- `backend/seed_test_players.py`: adds four pending players to campaign `fairelands-01`. Hard-coded SQLite path. Its docstring says the server creates that campaign, but main.py does not.
- `backend/gm_hub.py`: a one-line docstring, imported by nothing.
- `backend/candela_obscura.db`: a 1.2 MB SQLite database tracked in git. With no `DATABASE_URL`, an app or test started in backend/ would read and write it.
- Unused in main.py: `OAuth2PasswordBearer`, `OAuth2PasswordRequestForm`, `jwt`, `JWTError`, `oauth2_scheme`, `SECRET_KEY` (beyond the startup check), `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `datetime`, `timedelta`, `joinedload`, `Game`, `get_notebook_entries`, `calculate_resistance_max`, `ConnectionManager.broadcast_all`.
- The Vite dev proxy forwards `/api`, `/campaign` and `/ws` but not `/circle`; that matches the frontend never calling the `/circle/*` routes.

## Proposed module split

Goal: same paths, methods, status codes, response models, payloads and WebSocket message shapes. `uvicorn main:app` keeps working, and `main` keeps re-exporting `app`, `get_db`, `SessionLocal`, `db_engine`, `limiter` and `manager` for tests.

| Module | Contents (current lines) |
|---|---|
| `main.py` | sys.path insert, `load_dotenv`, logging setup, import config (fails fast on missing SECRET_KEY), run `startup.run()` at import time, build `app`, attach `limiter` and its exception handler, CORS, include routers in the current order, re-exports. |
| `config.py` | env reading: SECRET_KEY check, DATABASE_URL, CORS_ORIGINS, ALGORITHM and token constants (48 to 53, 58, 248). |
| `db.py` | `db_engine`, `SessionLocal`, `get_db` (58 to 69). One `get_db` object so `dependency_overrides` keep working. |
| `startup.py` | `create_all` and `init_db` with the seed rows and the ALTER list, unchanged (62, 71 to 241). Called explicitly from main.py. |
| `security.py` | `pwd_context` (55). Later home for real auth. |
| `ratelimit.py` | the single `limiter = Limiter(key_func=get_remote_address)` (243). |
| `schemas.py` | every Pydantic model: 260 to 434, `RejoinRequest` 564, `InviteRejoinRequest` 635, circle schemas 694 to 715. |
| `constants.py` | `_SAFE_FONT_NAMES`, `_ALLOWED_CAMPAIGN_CODE_RE`, `INTERCEPT_ABILITIES`, plus `ABILITY_MOD_DEFS` and `MAX_ABILITY_USES` hoisted out of the roll branch (441 to 448, 46, 1567, 1623). |
| `serializers.py` | `get_char_dict`, `get_circle_dict`, `_votes_dict`, `_relationships_list` (1352 to 1445, 731 to 753). |
| `realtime.py` | `ConnectionManager` and the `manager` singleton (1285 to 1350). |
| `services/circles.py` | `get_or_create_campaign_circle`, `resolve_circle`, the finalize tally (721 to 729, 1447 to 1454, 861 to 918). |
| `routers/campaigns.py` | the `/campaign/*` routes and, to keep registration order identical, the three `/circle/*` routes in one prefix-less router (450 to 942). |
| `routers/auth.py` | login and register with their limiter decorators (950 to 1020). |
| `routers/investigators.py` | list, get, forge (1022 to 1088). |
| `routers/notebook.py` | the five notebook routes (1094 to 1245). |
| `routers/users.py` | the two user routes (1251 to 1280). |
| `ws/endpoint.py` | the `/ws/{game_id}` route: connection setup, receive loop, context, dispatch (1456 to 1520, 2518 to 2525). |
| `ws/handlers/gm.py` | gm_update_tension, gm_update_circle, gm_transition_scene, gm_toggle_resource_edit, gm_toggle_reports, gm_advance_circle, refill_resources, gm_end_assignment, gm_reset_character. |
| `ws/handlers/rolls.py` | roll, resolve_gilded, use_post_roll_ability, burn_resistance. |
| `ws/handlers/marks.py` | take_mark, resolve_ability_mark, intercept_mark, apply_scar, revive_character. |
| `ws/handlers/character.py` | update_drive, update_pen_font, update_gear, apply_advancement, spend_resource. |
| `ws/handlers/circle.py` | update_circle, submit_assignment_report, circle_creation_vote, circle_backstory_update, circle_personal_answer, circle_relationship_propose, circle_relationship_respond. |
| `ws/handlers/chat.py`, `ws/handlers/notebook.py` | chat_message; add_notebook_entry. |
| `engine.py`, `models.py` | unchanged. |

WebSocket dispatch: a dict from action name to `(handler, needs_character)`. A small context object carries `websocket, db, game_id, camp_code, camp_id, circle, character, target_char_id, payload`. A handler returns early where the current code uses `continue`. Keep the "and character" guards as `needs_character` flags (when the guard fails the current elif chain does nothing, because action names are unique). Keep the roll handler's own try/except, and let other handler exceptions propagate so the connection still closes the same way, until a later stage changes that on purpose.

Suggested order: characterization tests first; then pure moves with no logic changes, one module at a time, running the tests after each; then the WebSocket dispatch table; then bug fixes and access control as separate, clearly labeled commits, because they change behavior.

## Refactor risks

1. **Import-time side effects.** Importing main.py reads `.env`, configures root logging, fails without SECRET_KEY, connects to the database, runs `create_all`, seeds rows and runs ALTERs. Tests must set `DATABASE_URL` and `SECRET_KEY` before the first import. Moving startup into a FastAPI lifespan or startup event changes behavior: `TestClient(app)` without a `with` block would no longer create tables.
2. **Circular imports.** The campaign routes (written above line 944) call `manager`, `get_char_dict` and `get_circle_dict`, which are defined later in the same file and resolved at call time. In separate modules these must live in leaf modules (`realtime.py`, `serializers.py`) that import nothing from routers.
3. **Module-level state.** `manager` is a per-process singleton: it needs one worker, a second import path (for example `backend.realtime` and `realtime`) would create a second manager that never sees the sockets, and tests share it across cases. `connect()` closes an earlier socket on the same id. `limiter` must be the same object in the decorators and in `app.state.limiter`. `pwd_context`, `db_engine` and `SessionLocal` are singletons too.
4. **Rate limiter.** slowapi needs the decorator order `@router.post(...)` above `@limiter.limit(...)` and a parameter named `request: Request`. Counters are in memory, per process, keyed on the client IP (uvicorn `--proxy-headers` trusts only 10.0.0.202). In tests every request comes from `testclient`, so more than 5 registrations or 10 logins a minute return 429 unless the test resets the limiter or disables it. The 429 body comes from `_rate_limit_exceeded_handler`; keep it.
5. **WebSocket database session.** The socket uses `SessionLocal()` directly, so `app.dependency_overrides[get_db]` does not reach it, and patching `SessionLocal` must happen on the module that the endpoint imports from. The session lives as long as the socket; between commits it can hold an open transaction and return stale identity-map objects.
6. **Name shadowing.** `text = payload.get("message")` in the chat branch makes `text` a local of the whole `websocket_endpoint`. Splitting the function removes the shadowing; moving sqlalchemy `text(...)` calls into that function before splitting would raise UnboundLocalError.
7. **Latent NameError.** The Endurance branch uses `secrets` without importing it. Fixing it changes behavior (today the socket closes). Pin it in a test and fix it in its own commit.
8. **Exception semantics.** Only `roll` catches its own errors. Bad input elsewhere (`int(chosen_value)`, `int(game_id)` on a GM channel in `circle_relationship_respond`, string versus int comparisons in `update_circle`, KeyError in REST `/circle/vote`) closes the socket or returns 500. A dispatcher that wraps every handler in try/except would change that.
9. **Legacy fallbacks.** `or 1` defaults for circle ids, user 1 in forge, circle 1 at connect, and the resolve_circle fallback are load-bearing for existing data. Replacing `x or 1` with `x if x is not None else 1` changes behavior for 0.
10. **Schema drift.** JSON columns may be strings on older databases. Keep the defensive `json.loads` paths in `get_char_dict`, `get_circle_dict`, finalize, and `get_investigator`. `ability_uses` uses `dict(...)` with no string handling.
11. **Async versus sync handlers.** `def` routes run in the threadpool; `async def` routes run on the event loop and block it during database work. Changing one to the other changes concurrency. Routes that broadcast must stay `async def`.
12. **Response shapes.** Some routes return ORM objects without a response model (create campaign, join), so FastAPI's `jsonable_encoder` emits every loaded column (it skips `_sa_*` keys). A change in what is loaded, for example a refresh moved or removed, changes the JSON. Others go through `response_model` filtering. Upload returns a hand-built dict without `author_type`. Moving code between helpers must not change which path a response takes. Pydantic v1-style `class Config` and `.dict()` still work in v2 with warnings; keep them until the tests cover the output.
13. **Route registration order and prefixes.** The campaign router has no prefix; `/circle/*` lives in the same router. No current paths overlap, but keep the order so OpenAPI and any future overlap behave the same.
14. **Fresh PostgreSQL sequences.** Explicit `id=1` inserts in `init_db` likely make the first register and the first auto-created circle fail on a fresh database. Characterization tests should resync sequences in a fixture or expect it.
15. **Committed SQLite file and relative default URL.** A test run without `DATABASE_URL` writes to `backend/candela_obscura.db` in git.
16. **Numeric campaign codes.** A code such as `123` is accepted by the code regex, and the WebSocket treats it as character id 123, so the GM and that character share a channel.
17. **Access control is a behavior change.** Every row in the tables above that trusts a client id is a gap. Adding tokens changes request and response payloads (login would return a token, every call would send it), so it belongs in a separate stage after the pure split, with the frontend changed in the same stage.
