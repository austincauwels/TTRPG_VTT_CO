# Login tokens and access rules

Before this stage the server trusted whatever user id, character id or role the browser sent (ROUTES.md and WEBSOCKET.md describe that state). Now login hands out a signed token, and the server works out who is calling from it.

## Tokens

- `POST /api/auth/login` and `POST /api/auth/register` return every field they returned before, plus `token`. The Google sign-in routes return the login shape with `token` too (see Sign in with Google below).
- The token is a JWT signed with `SECRET_KEY`, algorithm HS256. Claims: `sub` (the user id as a string), `iat`, `exp` (30 days after `iat`). There is no refresh; after 30 days the user logs in again.
- Decoding accepts HS256 only and requires `sub`, `iat` and `exp`. A token that is malformed, expired, signed with another key or algorithm, or whose user no longer exists counts as no token.
- A token that carries a `purpose` claim is never a login token (Google link tokens have one).
- Code: `vtt/security.py` (issue and decode), `vtt/auth.py` (the `get_current_user` dependency and the access helpers).
- Changing `SECRET_KEY` logs everyone out. Anyone who knows it can mint a token for any user, so the server refuses to start when it is the `.env.example` placeholder (`your-secret-key-here`) or shorter than 32 characters (`vtt/config.py`). The test conftest stretches a shorter harness key with SHA-256.

## REST

Every route except the sign-in routes (login, register, the three `/api/auth/google` routes and `GET /api/auth/config`) takes `Authorization: Bearer <token>`. Without a valid token the answer is 401 `{"detail": "Not authenticated."}` with `WWW-Authenticate: Bearer`, before any other check.

After that, ids the client sends are checked against the caller:

- An id that does not exist is 404. The routes keep their existing messages ("Campaign not found", "Character not found", "Investigator dossier not found.", "Entry not found", "Relationship not found"); a circle is "Circle not found".
- An id that exists but that the caller may not use is 403 `{"detail": "Not allowed."}`.
- Where the client still sends its own user id (`user_id` on campaign create and forge, the path of the two user routes), the server uses the token's user. A matching value is accepted and ignored; anything else is 403.

Terms: the **GM** of a campaign is `campaigns.gm_user_id`. A **member** is a user with an active or pending character in the campaign. The **owner** of a character is `characters.user_id`.

| Route | Who may call it |
|---|---|
| POST /campaign/create | any logged-in user; they become the GM |
| POST /campaign/join | owner of `character_id`; a retired campaign is 409 "This campaign has been retired." |
| POST /campaign/approve/{character_id} | GM of the character's campaign (a character with no campaign has no GM: 403) |
| POST /campaign/reject/{character_id} | GM of the character's campaign |
| POST /campaign/{campaign_id}/retire | GM of that campaign |
| POST /campaign/rejoin | owner of `character_id`, and only when the user has a pending rejoin invite to that campaign or an approved character there that died and has not been replaced yet (dead, status active; the rejoin retires it, so one death opens the way once). Rejoin skips GM approval, so a dead pending character does not count. A retired campaign is 409, after these checks |
| POST /campaign/{campaign_id}/invite-rejoin | GM of that campaign. The invite lets its holder skip GM approval, so the username must name one user: an exact match wins, a name that matches only ignoring case must match exactly one user (409 "More than one player has that username..." otherwise). A retired campaign is 409 |
| GET /campaign/{campaign_id}/roster | GM or member |
| GET /campaign/{campaign_id}/circle-creation-state | GM or member (unknown campaign is now 404, not 500) |
| POST /circle/vote | owner of `character_id`; the character must be an active or pending member of the circle's campaign |
| POST /circle/relationship/propose | owner of `from_character_id`; both characters members of the circle's campaign |
| POST /circle/relationship/respond | the owner of the party that did not act last (for a row with no recorded actor, the to-character), as on the WebSocket; propose and respond record `last_actor_id` |
| POST /campaign/finalize-roster | GM of that campaign |
| GET /api/investigators | any logged-in user; lists only their own characters |
| GET /api/investigators/{id} | owner, or GM of the character's campaign |
| POST /api/investigators/forge | any logged-in user; the character is theirs |
| GET /api/notebook/{campaign_id}/entries | GM or member; `role=GM` only for the GM (403 otherwise); `character_id` must be the caller's own character (an empty `character_id=` means none) |
| POST /api/notebook/{campaign_id}/entries | GM or member; a player must send `character_id`, and it must be the caller's own character and an active or pending member of this campaign (the GM may leave it out); Lightkeeper entries (author_type gm, entry_type lightkeeper or visibility gm_only) only for the GM. The server sets `author_name` (the character's name, or the GM's username), pen and ink |
| PUT, DELETE /api/notebook/entries/{entry_id} | the author: the owner of the entry's character, or the campaign's GM for an entry without a character |
| POST /api/notebook/{campaign_id}/upload | as for adding an entry |
| GET /api/users/{user_id}/characters, /campaigns | only the caller's own user id |

Not changed: the request and response shapes (`author_name` is still sent but ignored), `author_type` on notebook entries (still client text, within the rule above), and the quirks in QUIRKS.md that are not about who may call a route.

## WebSocket

The browser cannot set headers on a WebSocket, so it connects to `/ws/{game_id}?token=<token>`. nginx logs paths without query strings; uvicorn does log the query string of a WebSocket, so a log filter on the `uvicorn.error`, `uvicorn.access` and `candela` loggers replaces `token=...` with `token=<redacted>` (`vtt/config.py`).

### Connecting

The socket is accepted and then closed at once, before any message is read, with:

| Code | When |
|---|---|
| 4401 | no token, or a token that is invalid, expired or names a user that no longer exists |
| 4403 | the channel exists but is not the caller's: someone else's character, or a campaign the caller is not GM of |
| 4404 | no character with that id and no campaign with that code (this includes the frontend's old `gm` fallback channel) |

A refused connection never reaches the connection manager, so it does not kick the real user off with 1001.

- A numeric `game_id` is a character channel, open only to the character's owner. Its campaign is the character's own; the old fallback to "the campaign whose code equals this number" is gone (it let a character socket join a campaign with an all-digit code).
- Any other `game_id` is a campaign code, open only to `campaigns.gm_user_id`. When an all-digit code equals a character id, the owner gets the character channel and the GM gets the campaign channel. The connection manager keys a character channel by the id (`"123"`) and a campaign channel by `"campaign:"` plus the code, so the two never share a key and neither can close the other's socket or receive its frames (QUIRK D13, fixed).
- A character channel is keyed by the character's id as the database has it, so `/ws/0123` and `/ws/123` are the same channel.
- GM or player is decided here, from the token and `campaigns.gm_user_id`. `payload.role` is ignored everywhere.

### Messages

A message that breaks a rule is answered with `{"type": "action_rejected", "payload": {"action": <type>, "status": 403 or 404, "detail": ...}}` to the sender only, and nothing else happens. The socket stays open. Code: `vtt/ws/access.py`.

The character a message acts on is `payload.character_id`, or the player channel's own character when the payload has none (a GM channel has none).

- A player channel may only act for its own character: any other `character_id` is 403, one that matches no character is 404 (this includes 0 and 1.5, which used to fall through to "no character").
- A GM channel may name a character only for `gm_update_tension`, `gm_reset_character`, `update_drive`, `take_mark`, `revive_character` and `update_gear`, and only a member (active or pending) of its own campaign, not a retired character still tagged with it. Any other type with a `character_id` is 403; so the GM cannot roll, vote, chat or answer as a player's character.
- Messages that need a character and have none are still ignored without a reply, as before.

| Type | Who may send it |
|---|---|
| gm_update_tension, gm_transition_scene, gm_reset_character | the GM |
| gm_update_circle | the GM, for the campaign's own circle (`circle_id` still defaults to 1, which belongs to no campaign, so the frontend now sends the real id) |
| gm_toggle_resource_edit, gm_toggle_reports, gm_advance_circle, refill_resources, gm_end_assignment, update_circle | the GM, for the campaign's own circle (default: the circle loaded at connect) |
| roll | the owner; on a GM channel without a character it is a Lightkeeper roll |
| update_drive, take_mark, revive_character, update_gear | the owner, or the GM for a member; a `gear` list whose items are not all strings is 422 |
| resolve_gilded, use_post_roll_ability, update_pen_font, resolve_ability_mark, burn_resistance, apply_advancement, circle_personal_answer | the owner |
| apply_scar | the owner; `shift_down` and `shift_up` must be action ratings (move, strike, control, hide, sneak, sway, survey, read, sense), anything else is 403 (QUIRK D14) |
| intercept_mark | the owner of the interceptor; `target_character_id` must exist (404) and be in the interceptor's campaign |
| spend_resource | the owner, an active member, on their campaign's circle |
| submit_assignment_report, circle_creation_vote | the owner of `character_id`, an active member, on their campaign's circle; an unknown `vote_type` is 422 |
| circle_backstory_update | an active member or the GM, on the campaign's circle |
| circle_relationship_propose | a player for their own `from_character_id`, to a fellow member, on their campaign's circle |
| circle_relationship_respond | the other party: the character that did not act last (for a proposal made over REST, which records no actor, the character it was made to); never the GM |
| chat_message | a member (active or pending) or the GM; `@Environment` only from the GM. The sender name is the character's name, or "Lightkeeper" for the GM; `sender_name` is ignored |
| add_notebook_entry | a member or the GM, into their own campaign only; Lightkeeper entries only from the GM. The author is the socket's: the player's character (name, pen, ink, character_id) or the GM's username with the default pen and ink; payload `author_name`, `pen_font`, `ink_color` and `character_id` are ignored |

"Member" here is read fresh from the database for every message, so a player who joins or is approved while connected is a member at once (the handlers themselves still use the campaign fixed at connect, see QUIRKS.md).

A player channel that opened with a campaign posts into that campaign only while its character is still an active or pending member of it. After a reject, a retire or a join to another campaign, these types are 403 on the old socket until the client reconnects: roll, resolve_gilded, use_post_roll_ability, burn_resistance, take_mark, resolve_ability_mark, intercept_mark, revive_character, update_gear, apply_advancement, spend_resource, submit_assignment_report, circle_creation_vote, circle_backstory_update, circle_personal_answer, circle_relationship_propose, circle_relationship_respond, chat_message and add_notebook_entry (`PLAYER_CAMPAIGN_BROADCASTS` in `vtt/ws/access.py`). Types that touch only the player's own sheet and channel (update_drive, update_pen_font, apply_scar) still work.

Not changed: game rules that are not about who is acting (pending offers, `reports_open`, finalize state, value bounds) are still the quirks listed in QUIRKS.md and WEBSOCKET.md section 8.

## Frontend

- The token is kept in the persisted session (`accessSession.token`, localStorage key `candela-vtt-storage`).
- Every API call goes through `apiFetch` in `utils/api.js`, which adds `Authorization: Bearer`. A 401 on a call that carried a token logs the user out (session cleared, back to the login screen).
- The WebSocket URL gets `?token=`. A 4401 close logs the user out the same way; `action_rejected` is logged to the console (and ends a pending roll).
- A session persisted before this change has no token; on load it is cleared and the login screen is shown.
- SceneManager sends the campaign's circle id instead of 1 (see gm_update_circle above).

## Sign in with Google

Players can sign in with their Google account alone. The login screen shows Google's standard "Sign in with Google" button; Google Identity Services gives the browser an ID token (the "credential"), which the browser posts to the server. Password login stays as a fallback that can be switched off.

### Settings

- `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend build): the public client ID of the Google OAuth web client. No client secret is used. When it is empty Google sign-in is off: the frontend loads nothing from Google and shows no button, and `POST /api/auth/google` answers 503 "Sign in with Google is not set up on this server."
- `ALLOW_PASSWORD_LOGIN` (default true): when false, `POST /api/auth/login` and `POST /api/auth/register` answer 403 `{"detail": "Password sign-in is turned off. Please use Sign in with Google."}` (after body validation and the rate limit) and the login screen hides the password form. Login tokens already issued keep working. Accepted values are true, false, 1, 0, yes, no, on and off in any case; anything else stops the server, so a typo cannot leave password login on. With it off and no `GOOGLE_CLIENT_ID` nobody can log in, and startup logs a warning.
- `GET /api/auth/config` is public and not rate limited: `{"google": <GOOGLE_CLIENT_ID is set>, "password_login": <ALLOW_PASSWORD_LOGIN>}`.
- Code: `vtt/config.py` (settings), `vtt/google.py` (the token check), `vtt/security.py` (link tokens), `vtt/routers/auth.py` (routes).

### Checking Google's token

`verify_id_token` in `vtt/google.py` calls google-auth's `id_token.verify_oauth2_token` with audience `GOOGLE_CLIENT_ID`, which checks Google's signature, the expiry (10 seconds of clock skew allowed), the audience and the issuer (`accounts.google.com` or `https://accounts.google.com`). The wrapper then checks the audience and the issuer again itself and requires `email_verified` true, a subject and an email address. It refuses to run without a client ID, because google-auth skips the audience check when it gets none.

- Google's certificates are kept in memory for the max-age in Google's Cache-Control header (5 minutes when there is none, at most a day). A failed download is not kept. A download times out after 10 seconds.
- The check runs in a worker thread, so a slow download does not hold up the event loop and the game's WebSockets.
- A token that is refused is 401 `{"detail": "Google could not confirm this sign-in. Please try again."}`; when Google cannot be reached the answer is 503 "Google could not be reached to check this sign-in. Please try again in a moment." The reason is logged, the token is not.

### POST /api/auth/google `{credential}`

Rate limited 10 per minute per IP, like login.

1. A user whose `google_sub` is the token's subject is signed in. The answer is exactly what login answers for that user (GM or player shape), including `token`.
2. Otherwise, if exactly one user without a `google_sub` has the Google email (compared ignoring case), the Google account is linked to that user (`google_sub` set) and they are signed in. This is how existing players move over: their first Google sign-in is the only step. Their username, email and password stay as they were. When two such users share the email, nobody is linked automatically. The accounts the seed scripts make (`admin` and the test players listed under Published passwords) are never linked by email. Their emails are seed data, not anyone's address; `admin@archive.com` is on a real domain whose owner could make a Google account for it, and admin owns every character forged before login tokens. Whoever knows one of their passwords can still link it with `/api/auth/google/link`. The list is `SEEDED_USERNAMES` in `vtt/routers/auth.py`, taken from `PUBLISHED_PASSWORDS`.
3. Otherwise the answer is `{"needs_account": true, "link_token": ..., "suggested_name": ..., "email": <the Google email>}` and nothing is written.

`suggested_name` is the Google name cut down to the username rule of register (letters, digits, spaces, dots, dashes and underscores, 2 to 32 characters), else the local part of the email, else "Investigator". When it is taken (ignoring case), " 2" to " 9" (then 4 random hex digits) is added.

### Link tokens

A link token is a JWT signed with `SECRET_KEY` (HS256) with the claims `purpose` ("google_link"), `google_sub`, `email`, `name`, `iat` and `exp` (10 minutes after `iat`). It has no `sub`. `user_id_from_token` refuses any token with a `purpose`, and `identity_from_link_token` refuses any token whose `purpose` is not "google_link", so a login token never works as a link token and a link token never works as a login token (REST 401, WebSocket 4401). It is not stored anywhere. It stops being useful once its Google account is linked, because both routes below refuse a Google account that already has a user.

A link token that is missing, malformed, expired, tampered with, signed with another key, of another purpose, or a login token, is 401 `{"detail": "This Google sign-in has expired. Please sign in with Google again."}`.

### POST /api/auth/google/link `{link_token, username, password}`

Rate limited 10 per minute per IP, because it checks a password. It works whether or not password login is on, so players whose Google email matches none of their accounts can still bring an account over.

| Check, in order | Answer |
|---|---|
| bad link token | 401, as above |
| the Google account is already linked to a user | 409 "This Google account is already linked to an account. Please sign in with Google again." |
| unknown username or wrong password | 401 "That username and password do not match." (logged like a failed login) |
| the account already has a `google_sub` | 409 "That account is already linked to a Google account." This comes after the password check, so only the account's owner learns it. |
| otherwise | `google_sub` is set on the account and the answer is the login shape with `token` |

### POST /api/auth/google/create `{link_token, username}`

Rate limited 5 per minute per IP, like register. Status 201.

| Check, in order | Answer |
|---|---|
| bad link token | 401, as above |
| the Google account is already linked to a user | 409, as for link |
| username breaks the register rule | 422 |
| username taken, compared ignoring case as in register | 400 "That identification is already claimed." |
| a user has the Google email, compared ignoring case (`users.email` is unique; this happens when two accounts share the email, which kept step 2 from linking) | 409 "An account with this email address already exists. Please use Link my existing account instead." |
| otherwise | a new user with that username, the Google email, the `google_sub` and an unusable password (the bcrypt hash of a random value nobody is told); the answer is the login shape for a player with `token` |

Two requests at once: the checks above run before the write, so another request can take the Google account, the username or the email in between. The unique indexes on `google_sub`, `username` and `email` then refuse the write, and the answer is what the check would now give: 409 "This Google account is already linked..." when a link or a sign-in by email loses the race, and for create the first check in the table that now fails. Any other refused write is still a 500.

### Data

`users.google_sub`: text, nullable, unique index `ix_users_google_sub` (several users may have none). `init_db` adds the column and the index to an older database. The admin seed reads only the user id, so it also works on a users table from before the column.

### Login screen

- `components/LoginScreen.jsx` loads Google Identity Services (`https://accounts.google.com/gsi/client`) only when the build has `VITE_GOOGLE_CLIENT_ID`, and renders Google's standard "Sign in with Google" button above the password form. Without the client ID the screen is as before.
- It reads `GET /api/auth/config` on load: no button when the server has no client ID, no password form when password login is off. Until the answer comes (or if it never does) both are offered. A 403 from login or register also hides the form and shows the server's message.
- After Google: a session is stored exactly like a password login's. `needs_account` shows a choice between "Link my existing account" (username and password, once) and "Create a new account" (the name prefilled with `suggested_name`). Errors show inline in the server's words; a 429 shows "Too many attempts. Please wait a minute and try again."
- The calls are `fetchAuthConfig`, `signInWithGoogle`, `linkGoogleAccount` and `createGoogleAccount` in `utils/api.js`.
- Google's button opens a popup. A `Cross-Origin-Opener-Policy: same-origin` header on the page would break it, and a Content-Security-Policy would have to allow `https://accounts.google.com/gsi/` for scripts, frames, styles and connections. The site sends neither today.
- The Google OAuth client must list every origin the site is served from (and `http://localhost:5173` for development) under Authorized JavaScript origins.

## Published passwords

User 1 (`admin`) owns every character forged before tokens without a `user_id` (WEBSOCKET.md A4, A5), so a known admin password would hand all of them out. `init_db` seeds admin with a random password nobody is told. On every startup `retire_published_passwords` (`vtt/db.py`) also checks the accounts whose passwords are published in this repository: `admin` with password `admin`, and `elara_voss`, `rook_halcyon`, `sable_devereux`, `finn_ashcroft` and `keeper_test` with password `testpass` (`reset_seed.py`, `seed_test_players.py`). Any of them that still has that password gets a random one, and a warning names them in the log. Accounts with a password of their own are left alone. There is no reset flow, so whoever needs one of these accounts sets a new hash in the database.

## Behavior that changed because of these rules

- Campaign create without `user_id` makes the caller the GM (it used to create a campaign with no GM). An unknown `user_id` is 403 (it was a 500 from the foreign key).
- Campaign create refuses a code that reads as a number (`"123"`, `"-12"`, `"1_000"`) with 422 "Campaign code must not be a number", because `/ws/{code}` would also name the character with that id (QUIRK D13).
- Forge without `user_id` gives the character to the caller (it used to fall back to user 1, admin). `user_id` 0 or an unknown id is 403.
- Approve and reject of an unknown character are 404 (they were 400).
- Roster, notebook list and circle creation state for an unknown campaign are 404 (they were 200 with empty data, or 500).
- Notebook writes with an unknown character or campaign are 404 (they were 500).
- Rejoin without an invite or a dead character in that campaign is 403 (it always succeeded). Since the security review only an approved character that died counts: any dead character used to, and a player can kill their own pending character with four scars, so anyone with the campaign code could join, die and rejoin as an active member without the GM.
- `GET /api/investigators` lists only the caller's characters (it listed everyone's).
- WebSocket: unknown channels (including `gm`) are closed with 4404 instead of opening on circle 1. A GM channel obeys GM messages without `role: "GM"` in the payload; a player channel is refused them whatever role it claims.
- WebSocket: an unaffiliated character can no longer chat (its whispers used to match names in every campaign) or intercept a mark for a character outside its campaign.
- WebSocket: chat sender names come from the server. The frontend already sent the same values.
- WebSocket: gm_update_circle with circle 1 (the old SceneManager value) is 403, and the GM circle messages no longer reach another campaign's circle (bug D2 and the resolve_circle fallback).
- WebSocket: circle_relationship_respond on a GM channel is 403 instead of ending the socket (bug D9).
- WebSocket: update_circle is GM only, so the non-GM "may lower but not raise resources" branch is gone, and a player's string resource no longer ends the socket.

## Known gaps

- Sign in with Google links by email to the account that has that email, and register never checked that an email belongs to whoever registered it. Someone who registers a password account with another person's email before that person's first Google sign-in gets that person linked to an account whose password they know. Turning password login off ends that. The other way round is not possible: Google must have verified the email.
- There is no password reset, so a player whose Google email matches none of their accounts and who has forgotten their password cannot claim their old account. Unlinking a Google account, or moving it to another user, is a database edit (`google_sub` set to NULL).
- A token cannot be revoked before it expires, except by changing `SECRET_KEY` (which logs everyone out). Deleting a user does revoke it, because the user lookup fails.
- An open WebSocket keeps working after its token expires; the token is only checked when the socket connects.
- The token sits in localStorage, so a script injected into the page could read it. The app renders no user HTML as markup today.
- `action_rejected` is a new server-to-client type; WEBSOCKET.md section 5 lists the types from before this stage.
