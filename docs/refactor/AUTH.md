# Login tokens and access rules

Before this stage the server trusted whatever user id, character id or role the browser sent (ROUTES.md and WEBSOCKET.md describe that state). Now login hands out a signed token, and the server works out who is calling from it.

## Tokens

- `POST /api/auth/login` and `POST /api/auth/register` return every field they returned before, plus `token`. The Google sign-in routes return the login shape with `token` too (see Sign in with Google below). Register refuses a taken username or email with one answer for both (Register answers, under Rate limits).
- The token is a JWT signed with `SECRET_KEY`, algorithm HS256. Claims: `sub` (the user id as a string), `pwh` (the password stamp, below), `iat`, `exp` (30 days after `iat`). There is no refresh; after 30 days the user logs in again.
- Decoding accepts HS256 only and requires `sub`, `pwh`, `iat` and `exp`. A token that is malformed, expired, signed with another key or algorithm, whose user no longer exists, or whose password stamp no longer matches the user counts as no token.
- The password stamp is a keyed hash (HMAC-SHA256 with `SECRET_KEY`, 32 hex digits) of the user's password hash at the time the token was issued (`password_stamp` in `vtt/security.py`). When the password is replaced, every login token issued before stops working (REST 401, WebSocket 4401). That happens when Sign in with Google links an account by email (step 2 below), when a password reset link is used (Password reset by email below), when `retire_published_passwords` replaces a published password, and when someone sets a new hash in the database. Tokens issued before the stamp existed have no `pwh` and no longer work, so everyone logs in once more after this change.
- A token that carries a `purpose` claim is never a login token (Google link tokens have one).
- Every bcrypt hash and password check of the sign-in routes runs in a worker thread (`run_in_threadpool`), so a sign-in does not hold up the event loop and the game's WebSockets for the quarter of a second bcrypt takes. A login or link with an unknown username runs passlib's dummy check, so it takes as long as a wrong password (`check_password` in `vtt/routers/auth.py`).
- Code: `vtt/security.py` (issue and decode), `vtt/auth.py` (the `get_current_user` dependency and the access helpers).
- Changing `SECRET_KEY` logs everyone out. Anyone who knows it can mint a token for any user, so the server refuses to start when it is the `.env.example` placeholder (`your-secret-key-here`) or shorter than 32 characters (`vtt/config.py`). The test conftest stretches a shorter harness key with SHA-256.

## REST

Every route except the sign-in routes (login, register, the three `/api/auth/google` routes, `GET /api/auth/config`, and the two `/api/auth/password-reset` routes) takes `Authorization: Bearer <token>`. Without a valid token the answer is 401 `{"detail": "Not authenticated."}` with `WWW-Authenticate: Bearer`, before any other check.

After that, ids the client sends are checked against the caller:

- An id that does not exist is 404. A deleted character or campaign counts as one that does not exist (DELETION.md). The routes keep their existing messages ("Campaign not found", "Character not found", "Investigator dossier not found.", "Entry not found", "Relationship not found"); a circle is "Circle not found".
- An id that exists but that the caller may not use is 403 `{"detail": "Not allowed."}`.
- Where the client still sends its own user id (`user_id` on campaign create and forge, the path of the two user routes), the server uses the token's user. A matching value is accepted and ignored; anything else is 403.

Terms: the **GM** of a campaign is `campaigns.gm_user_id`. A **member** is a user with an active character in the campaign, one the GM approved (a dead character keeps status active until it is replaced). A pending character is waiting for the GM's approval and is not a member: anyone who has the campaign code can make one, so it reaches nothing of the campaign (`MEMBER_STATUSES` in `vtt/auth.py`; before the security review pending counted too). The **owner** of a character is `characters.user_id`.

| Route | Who may call it |
|---|---|
| POST /campaign/create | any logged-in user; they become the GM. A taken code is 409 "Campaign code is already in use", or, when it is held by a campaign the caller deleted, 409 "A campaign you deleted still holds this code, so that it can be brought back. Choose a different code." (DELETION.md) |
| POST /campaign/join | owner of `character_id`; a retired campaign is 409 "This campaign has been retired."; a character on a roster is 409, "This investigator is already in a campaign." (active) or "This investigator is already waiting to join a campaign." (pending), after the owner check |
| POST /campaign/approve/{character_id} | GM of the character's campaign (a character with no campaign has no GM: 403) |
| POST /campaign/reject/{character_id} | GM of the character's campaign |
| POST /campaign/{campaign_id}/retire | GM of that campaign |
| DELETE /campaign/{campaign_id} | GM of that campaign; the characters on its roster go back to their owners, retired ones stay with it (DELETION.md) |
| POST /campaign/{campaign_id}/restore | GM of that campaign, within two minutes of deleting it; anyone else, or a campaign that is not deleted, is 404 (DELETION.md) || POST /campaign/rejoin | owner of `character_id`, and only when the user has a pending rejoin invite to that campaign or an approved character there that died and has not been replaced yet (dead, status active; the rejoin retires it, so one death opens the way once). Rejoin skips GM approval, so a dead pending character does not count. A retired campaign is 409, after these checks |
| POST /campaign/{campaign_id}/invite-rejoin | GM of that campaign. The invite lets its holder skip GM approval, so the username must name one user: an exact match wins, a name that matches only ignoring case must match exactly one user (409 "More than one player has that username..." otherwise). A retired campaign is 409 |
| GET /campaign/{campaign_id}/roster | GM or member |
| GET /campaign/{campaign_id}/circle-creation-state | GM or member (unknown campaign is now 404, not 500) |
| POST /circle/vote | owner of `character_id`; the character must be an active member of the circle's campaign |
| POST /circle/relationship/propose | owner of `from_character_id`; both characters members of the circle's campaign |
| POST /circle/relationship/respond | the owner of the party that did not act last (for a row with no recorded actor, the to-character), as on the WebSocket; that character must be an active member of the circle's campaign; propose and respond record `last_actor_id`. A relationship in a deleted campaign's circle is 404 "Relationship not found" |
| POST /campaign/finalize-roster | GM of that campaign |
| GET /api/investigators | any logged-in user; lists only their own characters |
| GET /api/investigators/{id} | owner, or GM of the character's campaign |
| POST /api/investigators/forge | any logged-in user; the character is theirs. `profile_pic` follows the portrait rule (Portraits below) |
| DELETE /api/investigators/{id} | owner only (not the GM of its campaign), and only while the character is on no roster: 409 while it is active or pending (DELETION.md) |
| POST /api/investigators/{id}/restore | owner, within two minutes of deleting it; anyone else, or a character that is not deleted, is 404 (DELETION.md) |
| PUT /api/investigators/{id}/portrait | owner, or GM of the character's campaign while the character is on its roster (active or pending; a retired character still tagged with the campaign is 403 for that GM) |
| GET /api/auth/me | any logged-in user; their own account |
| POST /api/auth/me/google | any logged-in user who also sends the account's password, or a Google account with the account's email; links it to their own account (Linking Google while signed in below) |
| GET /api/notebook/{campaign_id}/entries | GM or member; `role=GM` only for the GM (403 otherwise); `character_id` must be the caller's own character (an empty `character_id=` means none) |
| POST /api/notebook/{campaign_id}/entries | GM or member; a player must send `character_id`, and it must be the caller's own character and an active member of this campaign (the GM may leave it out); Lightkeeper entries (author_type gm, entry_type lightkeeper or visibility gm_only) only for the GM. The server sets `author_name` (the character's name, or the GM's username), pen and ink |
| PUT, DELETE /api/notebook/entries/{entry_id} | the author: the owner of the entry's character while that character is an active member of the entry's campaign, or the campaign's GM for an entry without a character. An entry of a deleted campaign is 404 "Entry not found" |
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

### Ending sockets when the password changes

A socket used to check its token only when it connected, so one opened before a password change stayed open: after a reset, whoever held it kept acting on that channel (a GM desk, a second character) and hearing its broadcasts, although the reset email says every earlier sign-in ends. Now:

- The connection manager remembers which user opened each socket (`connect(key, websocket, user_id)`, kept in the socket's state). `manager.close_user(user_id)` closes all of that user's sockets with **4401** and forgets them. The reset confirm route calls it after the new password is committed, and step 2 of Sign in with Google calls it when it replaces the password. The browser treats 4401 as a logout, as for a refused token.
- Before every message that names a handler, the socket checks the token's password stamp again (`stamp_still_valid` in `vtt/auth.py`, one indexed column query). When the password changed any other way (a hash set in the database), or the user is gone, the socket is closed with 4401 and the message is not handled. Frames that name no handler are ignored as before, without the check.
- Linking Google while signed in keeps the password, so it keeps the sockets too.

- A numeric `game_id` is a character channel, open only to the character's owner. Its campaign is the character's own; the old fallback to "the campaign whose code equals this number" is gone (it let a character socket join a campaign with an all-digit code).
- Any other `game_id` is a campaign code, open only to `campaigns.gm_user_id`. When an all-digit code equals a character id, the owner gets the character channel and the GM gets the campaign channel. The connection manager keys a character channel by the id (`"123"`) and a campaign channel by `"campaign:"` plus the code, so the two never share a key and neither can close the other's socket or receive its frames (QUIRK D13, fixed).
- A character channel is keyed by the character's id as the database has it, so `/ws/0123` and `/ws/123` are the same channel.
- A character channel opens with the campaign its character is tagged with, whatever the character's status, so that an approval while connected makes it a member at once. The `circle_update` sent on connect is that campaign's circle only for an active member; a pending or retired character gets the shared circle 1, as an unaffiliated one does (since the security review; it used to get the campaign's circle, backstory answers and assignment reports included).
- GM or player is decided here, from the token and `campaigns.gm_user_id`. `payload.role` is ignored everywhere.

### Messages

A message that breaks a rule is answered with `{"type": "action_rejected", "payload": {"action": <type>, "status": 403 or 404, "detail": ...}}` to the sender only, and nothing else happens. The socket stays open. Code: `vtt/ws/access.py`.

The character a message acts on is `payload.character_id`, or the player channel's own character when the payload has none (a GM channel has none).

- A player channel may only act for its own character: any other `character_id` is 403, one that matches no character is 404 (this includes 0 and 1.5, which used to fall through to "no character").
- A GM channel may name a character only for `gm_update_tension`, `gm_reset_character`, `update_drive`, `take_mark`, `revive_character` and `update_gear`, and only a character on its own campaign's roster (active or pending, `ROSTER_STATUSES`), not a retired character still tagged with it. Any other type with a `character_id` is 403; so the GM cannot roll, vote, chat or answer as a player's character.
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
| chat_message | a member (an active character) or the GM; `@Environment` only from the GM. The sender name is the character's name, or "Lightkeeper" for the GM; `sender_name` is ignored |
| add_notebook_entry | a member or the GM, into their own campaign only; Lightkeeper entries only from the GM. The author is the socket's: the player's character (name, pen, ink, character_id) or the GM's username with the default pen and ink; payload `author_name`, `pen_font`, `ink_color` and `character_id` are ignored |

"Member" here is read fresh from the database for every message, so a player who is approved while connected is a member at once (the handlers themselves still use the campaign fixed at connect, see QUIRKS.md).

A player channel that opened with a campaign posts into that campaign only while its character is an active member of it. Before approval, and after a retire or a join to another campaign, these types are 403 on the old socket until the client reconnects: roll, resolve_gilded, use_post_roll_ability, burn_resistance, take_mark, resolve_ability_mark, intercept_mark, revive_character, update_gear, apply_advancement, spend_resource, submit_assignment_report, circle_creation_vote, circle_backstory_update, circle_personal_answer, circle_relationship_propose, circle_relationship_respond, chat_message and add_notebook_entry (`PLAYER_CAMPAIGN_BROADCASTS` in `vtt/ws/access.py`). Types that touch only the player's own sheet and channel (update_drive, update_pen_font, apply_scar) still work.

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
2. Otherwise, if exactly one user without a `google_sub` has the Google email (compared ignoring case), the Google account is linked to that user (`google_sub` and `google_email` set) and they are signed in. This is how existing players move over: their first Google sign-in is the only step. Their username and email stay as they were, but their password is replaced with one nobody knows, and with it every login token issued before stops working (the password stamp, under Tokens). Register never checked that an email belongs to whoever registered it, so the account may have been registered by someone else who knows its password; from this point only the Google account gets in. The player signs in with Google from then on (password login no longer works for them). The exception is an account whose email is already proven (`email_proven`, under Data: a reset link sent to that address was used, so the address owner chose the password): it keeps its password. An account linked with its password through `/api/auth/google/link` keeps its password. When two such users share the email, nobody is linked automatically.
   - **Unproven links.** When every user with the Google email already has a Google account, and exactly one of them has an email that was never proven and an unproven link (made with a Google account whose email is not the account's, or from before `google_email` was recorded), that link is replaced the same way: `google_sub` and `google_email` become this Google account's, the password is replaced and every earlier login token ends. Such a link may be the work of a squatter who registered this address and linked their own Google account first (the security review's email squatter finding); before, step 2 skipped every linked account, create answered 409 for the address and link 409 for the account, so the address owner could never get in with Google, and with password login off not at all. A proven link, or an account whose email is proven, is never replaced this way. If the owner of the address had linked a second Google account of their own with another email, their own sign-in with the address's Google account replaces that link and the password.
   - The write is one conditional UPDATE: only while the account's `google_sub` is still what this request read. When another request changed it in between, the answer is a sign-in if that request linked this same Google account, else step 3. The accounts the seed scripts make (`admin` and the test players listed under Published passwords) are never linked by email. Their emails are seed data, not anyone's address; `admin@archive.com` is on a real domain whose owner could make a Google account for it, and admin owns every character forged before login tokens. Whoever knows one of their passwords can still link it with `/api/auth/google/link`. The list is `SEEDED_USERNAMES` in `vtt/routers/auth.py`, taken from `PUBLISHED_PASSWORDS`.
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
| otherwise | `google_sub` and `google_email` are set on the account and the answer is the login shape with `token` |
| another request linked the account, or changed its password, after the password check | 409 "That account is already linked to a Google account." when it is linked now, else 401 as for a wrong password. No token. |

The last row is the conditional write (Two requests at once, below). It used to be an unconditional write: a squatter's link racing the owner's first Google sign-in (step 2, which replaces the password) put the squatter's Google account in place of the owner's and handed the squatter a token for the new password.

### POST /api/auth/google/create `{link_token, username}`

Rate limited 5 per minute per IP, like register. Status 201.

| Check, in order | Answer |
|---|---|
| bad link token | 401, as above |
| the Google account is already linked to a user | 409, as for link |
| username breaks the register rule | 422 |
| username taken, compared ignoring case as in register | 400 "That identification is already claimed." |
| a user has the Google email, compared ignoring case (`users.email` is unique; this happens when two accounts share the email, which kept step 2 from linking) | 409 "An account with this email address already exists. Please use Link my existing account instead." |
| otherwise | a new user with that username, the Google email (also as `google_email`, and `email_proven` true: Google verified it), the `google_sub` and an unusable password (the bcrypt hash of a random value nobody is told); the answer is the login shape for a player with `token` |

Two requests at once: the checks above run before the write, so another request can take the Google account, the username or the email in between. The unique indexes on `google_sub`, `username` and `email` then refuse the write, and the answer is what the check would now give: 409 "This Google account is already linked..." when a link or a sign-in by email loses the race, and for create the first check in the table that now fails. Any other refused write is still a 500.

The unique index cannot catch two different Google accounts written to one user, one after the other. So every link (step 2, `/api/auth/google/link`, `POST /api/auth/me/google`) is one conditional UPDATE (`link_google_account` in `vtt/routers/auth.py`): it writes only while the user's `google_sub` is still the value the route read (none, or for step 2 the unproven link it replaces) and, for a link proven by a password, while the password hash is still the one just checked. When nothing matched, nothing is written and the route answers as its checks now would. Before, the last write won and both requests answered 200.

### Data

- `users.google_sub`: text, nullable, unique index `ix_users_google_sub` (several users may have none). `init_db` adds the column and the index to an older database. The admin seed reads only the user id, so it also works on a users table from before the column.
- `users.google_email`: text, nullable. The email of the Google account when it was linked, set by every link and by create, cleared with `google_sub` when a reset removes a link. A link is **proven** when its `google_email` equals `users.email` ignoring case; otherwise (another email, or NULL for links made before the column existed) it is **unproven**.
- `users.email_proven`: boolean, default false. True once someone showed they read the account's address: a used reset link, an account made with Google, or a link with a Google account of that address. Nothing sets it back.
- `init_db` adds both columns to an older database (`TEXT`, and `BOOLEAN DEFAULT FALSE`). Existing rows get NULL and false, so every link made before this change counts as unproven, as do the addresses of existing accounts.

### Login screen

- `components/LoginScreen.jsx` loads Google Identity Services (`https://accounts.google.com/gsi/client`) only when the build has `VITE_GOOGLE_CLIENT_ID`, and renders Google's standard "Sign in with Google" button above the password form. Without the client ID the screen is as before.
- It reads `GET /api/auth/config` on load: no button when the server has no client ID, no password form when password login is off. Until the answer comes (or if it never does) both are offered. A 403 from login or register also hides the form and shows the server's message.
- After Google: a session is stored exactly like a password login's. `needs_account` shows a choice between "Link my existing account" (username and password, once) and "Create a new account" (the name prefilled with `suggested_name`). Errors show inline in the server's words; a 429 shows "Too many attempts. Please wait a minute and try again."
- The calls are `fetchAuthConfig`, `signInWithGoogle`, `linkGoogleAccount` and `createGoogleAccount` in `utils/api.js`.
- For the account menu, the reset page and portraits, `utils/api.js` also has `fetchAccount` (GET /api/auth/me, null on failure), `linkGoogleToAccount(credential, password)`, `requestPasswordReset(email)` (a 429 reads "Too many reset emails have been asked for. Please try again in an hour."), `confirmPasswordReset(token, password)` (resolves to a session), `setCharacterPortrait(characterId, dataUrlOrNull)`, `portraitDataUrl(file)`, `PORTRAIT_MAX_LENGTH` and `PORTRAIT_MAX_SIDE`. No component calls them yet.
- Google's button opens a popup. A `Cross-Origin-Opener-Policy: same-origin` header on the page would break it, and a Content-Security-Policy would have to allow `https://accounts.google.com/gsi/` for scripts, frames, styles and connections. The site sends neither today.
- The Google OAuth client must list every origin the site is served from (and `http://localhost:5173` for development) under Authorized JavaScript origins.

## Linking Google while signed in

A player who signed in with a password can link a Google account from the desk's account menu. The browser runs Google's sign-in, then posts the credential with its login token and, unless the Google email is the account's email, the account's password.

### GET /api/auth/me

Needs a login token (401 otherwise); not rate limited. Answers the caller's own account: `{"userId": 12, "name": "mira", "email": "mira@example.org", "googleLinked": false}`. The account menu shows "Link Google account" while `googleLinked` is false.

### POST /api/auth/me/google `{credential, password?}`

Needs a login token, checked first (401 `{"detail": "Not authenticated."}`, and Google is not asked). Rate limited 10 per minute per IP. `credential` as for `POST /api/auth/google` (missing, or over 8192 characters, is 422); `password` is optional, a string of at most 1024 characters (422 otherwise). It works whether or not password login is on.

A login token alone is not enough. Tokens last 30 days and cannot be revoked one at a time, so a stolen one used to be enough to link the thief's own Google account, which then signed in to the account for good. With password login off it also locked the owner out: their own Google sign-in no longer linked by email (step 2 skips a linked account), create answered 409 for their email and link 409 for the linked account. So the request has to prove the account again, in one of two ways:

- the account's current password (`password`). This is the way for a Google account whose email differs from the account's.
- a Google account whose email is the account's email, ignoring case (`password` left out, null or empty). Google has verified that address, and whoever controls it could reset the password anyway. This is also how an account whose password nobody knows (one made with Google, or linked by email in step 2) proves itself.

The server cannot tell whether anyone knows an account's password (an unusable one is a bcrypt hash like any other), so it takes either proof from every account. A password that is sent must be right, even when the Google email would have been enough.

| Check, in order | Answer |
|---|---|
| no `GOOGLE_CLIENT_ID` | 503 "Sign in with Google is not set up on this server." |
| Google refuses the credential | **400** "Google could not confirm this sign-in. Please try again." It is 401 on the sign-in routes, but this caller is signed in, and `apiFetch` ends the session on any 401 |
| Google cannot be reached | 503, as for sign-in |
| the account is linked to this Google account already | 200 with the account, nothing changes (a second click) |
| the account is linked to another Google account | 409 "That account is already linked to a Google account." |
| a password is sent and it is wrong | **403** "That is not this account's password." (403, not 401, so the session stays; logged like a failed login) |
| no password, and the Google email is not the account's email | **403** "This Google account has another email address than your account. Enter your account's password to link it." |
| another user has this Google account | 409 "This Google account is already linked to another account." (also when another request linked it in between and the unique index refuses the write) |
| otherwise | `google_sub` and `google_email` are set (and `email_proven` when the Google email is the account's) and the answer is the account, as `GET /api/auth/me` gives it, with `googleLinked: true` |
| another request changed the account after these checks (conditional write, see Two requests at once) | 200 with the account when it linked this same Google account; 409 "That account is already linked to a Google account." when it linked another; 403 "That is not this account's password." when the password changed |

Nothing else changes: the password stays (password login keeps working), every login token keeps working, and the account's email stays as it was even when the Google email differs. From then on `POST /api/auth/google` signs in to this account by the Google subject (step 1). A link with a Google account of another email is unproven (Data, above): a password reset removes it, and so does the sign-in of a Google account with the account's own address while that address is unproven.

Frontend: `linkGoogleToAccount(credential, password)` in `utils/api.js` sends the password when one is given. The account menu can try without it when the Google email is the one `GET /api/auth/me` shows, and ask for the password on the second 403.

## Portraits

`PUT /api/investigators/{id}/portrait` with `{"profile_pic": "data:image/jpeg;base64,..."}` sets a character's portrait; `{"profile_pic": null}` (or `""`) clears it. The field is required: `{}` is 422. Who may call it is in the table above; 401, then 404 "Investigator dossier not found.", then 403, then the change limit (429), then the picture checks, so nobody learns anything about a character they may not touch.

- The picture is a data URL, `data:image/<type>;base64,<bytes>`, with `<type>` png, jpeg or webp, written exactly so (lower case, `jpeg` not `jpg`), as a canvas and `FileReader.readAsDataURL` write them. The bytes must start like a PNG, JPEG or WebP file (any of the three, so a .png file that is really a JPEG still passes). SVG is refused because it can carry script, other raster types (GIF, AVIF, HEIC, BMP, TIFF) because the browser turns every photo into one of the three anyway, and anything that is not such a data URL (a link to an image elsewhere would make every viewer's browser fetch it). Bad base64, an empty picture, or bytes that are no picture are refused too. All of these are 422 "The portrait must be a PNG, JPEG or WebP picture."
- Size: the whole data URL may be at most 400 KB (`PORTRAIT_MAX_LENGTH`, 409,600 characters), which holds a picture of up to about 300 KB (307,182 bytes as PNG). Over it the answer is 413 "The portrait is too large. Choose a smaller picture." The cap was 10 MB (about 13.4 MB as base64): one account could fill CT209's 10 GB disk (database, WAL and 30 nightly dumps) with a few hundred forges, and the join, approve and portrait broadcasts carried every portrait inline, so a campaign of large portraits built frames of hundreds of MB in the 1 GB, single-worker backend. Portraits are shown at most a few hundred pixels wide, so 400 KB loses nothing.
- The browser scales a photo down before it sends it: `portraitDataUrl(file)` in `utils/api.js` draws it on a canvas no larger than 512 pixels on its longest side (`PORTRAIT_MAX_SIDE`) and saves it as JPEG, at lower quality until it fits `PORTRAIT_MAX_LENGTH` (also exported). A typical result is 50 to 150 KB. **The character creator still sends the file as `FileReader` reads it** (`CharacterCreator.jsx` `handleImageUpload`), so until the UI stage calls `portraitDataUrl` there, a photo over about 300 KB gets the creator's existing 413 message.
- Changes are limited per user (`PORTRAIT_CHANGE_LIMITS`: 10 a minute and 50 a day), counted for the caller, so a GM setting roster portraits spends the GM's count. Every PUT counts, clears included, and so does a forge with a portrait (a forge without one does not). Over the limit the answer is 429 "The portrait was changed too often. Please wait a few minutes and try again." The counts are in the rate limiter's memory and are off when it is off.
- Forge (`POST /api/investigators/forge`) applies the same rule to `profile_pic` (it stored any string before, so its only limit was nginx's 25 MB). The creator's existing 413 message covers a picture that is too large. nginx still takes API requests up to 25 MB; with this cap its `client_max_body_size` for `/api/` can go down to about 2 MB (gatergrid-web, outside this repository).
- The answer is 200 with the character as the WebSocket sends it (`get_char_dict`, the `character_update` payload).
- Broadcast after the write: the character's own channel gets `character_update` with the whole sheet, as for every sheet change. A character on a campaign's roster also gets a new type, `portrait_update` `{"character_id", "campaign_id", "profile_pic"}`: for an active character it goes to the campaign (`broadcast_campaign`: the GM and every active member, so rosters and Circle cards update), for a pending character to the GM's channel only. Unaffiliated and retired characters reach their own channel only. `character_update` is not sent to the campaign because the store replaces its own `character` with any `character_update`. The frontend does not handle `portrait_update` yet (the UI stage wires it).
- Portraits stay inline in `portrait_update`, in `get_char_dict` (so in the `investigator_joined`, `investigator_approved`, `investigator_rejected`, rejoin and circle creation lists) and in the roster, because the frontend shows them from there (`InvestigatorBusinessCard`, `InvestigatorDossier`). The cap bounds each to 400 KB. `broadcast_campaign` reads the members as ids only (it loaded every member's whole row, portrait included, for every roll, chat line and log line), and the manager serializes a broadcast once and sends the same text to every socket (it ran `json.dumps` once per socket).
- Code: `vtt/portraits.py` (the rule, the read check and the change limit), `vtt/routers/investigators.py` (the route and `broadcast_portrait`), `require_owner_or_roster_gm` in `vtt/auth.py`, `vtt/ws/manager.py` (broadcasts).

### Stored portraits are checked when they are read

Forge stored any string before the rule, and pictures up to 10 MB until the cap went down, so the database can hold links to other sites (every viewer's browser would fetch them, giving that site their address and times), SVGs, other types and oversized pictures. Nothing is deleted. Instead every place that serves a portrait passes it through `served_portrait` (`vtt/portraits.py`): a `data:image/png`, `jpeg` or `webp` base64 URL of at most `PORTRAIT_MAX_LENGTH` characters is served as it is, anything else as no portrait (`null`). That covers `get_char_dict` (every WebSocket frame and the REST answers built from it), `CharacterResponse` (`GET /api/investigators/{id}`, forge) and `CharacterRosterItem` (`GET /api/investigators`, the campaign roster). The check reads the prefix and the length only, so it is cheap on every frame; every portrait written since the rule was checked in full, and bytes behind a valid prefix are inert in an `<img>`.

The one other value served is a path to one of the app's own pictures: `/images/` followed by a single file name of letters, digits, `_` and `-` ending in `.png`, `.jpg`, `.jpeg` or `.webp` (`is_own_image_path`), such as `/images/Journalist.png`. The seeded and demo characters carry their role portraits this way, and so may older live rows; the browser loads them from the site it is already on, so they reach nobody else. `check_portrait` takes the same paths, so the dossier's Undo can put such a portrait back. Anything else that looks like a path (`//host/...`, `/images/../x.png`, a sub-folder, a query, `.svg`) is still no portrait and still refused.

A character whose old portrait no longer shows gets it back by setting a new one. Before deploying to live, a read-only count of the rows that will stop showing (anything that is neither a `data:image/png;base64,`, `data:image/jpeg;base64,` or `data:image/webp;base64,` URL of at most 409,600 characters nor an own-picture path as above) tells which players to warn.

## Password reset by email

A player who forgot their password asks for a link by email, then sets a new password with it. Code: `vtt/password_reset.py` (who gets a link, the tokens, the email), `vtt/mail.py` (sending), the two routes in `vtt/routers/auth.py`.

### Settings

- `RESEND_API_KEY`: the Resend API key (sending only). It goes into CT210's `/etc/candela/candela.env`, never into git. Without it a reset request still answers 202 and the log says `RESEND_API_KEY is not set, so the email 'Set a new Candela Obscura password' was not sent`; the link is never logged.
- `RESET_URL_BASE` (no default): the link in the email is `RESET_URL_BASE` + `/reset-password?token=<token>`. A trailing slash is dropped. Each site sets its own: beta `RESET_URL_BASE=https://candela-beta.gatergrid.com`, live `RESET_URL_BASE=https://candela.gatergrid.com`, in `/etc/candela/candela.env`. It used to default to beta, so a live deploy that missed it would have mailed live tokens in links to the beta site. Now, while it is unset, or set to something that is not an `http(s)://host[:port][/path]` address, the app starts as usual, logs an error at startup (when password login is on), and a reset request answers 202 as always but issues no token and sends nothing (the log says `No password reset link was issued: RESET_URL_BASE is not set`). Both nginx sites already answer any path with `index.html`, so the app has to show the reset page at `/reset-password`.
- The reset routes follow `ALLOW_PASSWORD_LOGIN`: when it is off both answer 403 "Password sign-in is turned off. Please use Sign in with Google." (after body validation and the per-IP limit).

### POST /api/auth/password-reset `{email}`

Status 202, body `{"ok": true}`, the same whether or not an account has the address.

- Body: `email` is stripped of surrounding spaces, at most 254 characters and must look like `x@y` with no spaces (422 otherwise; this depends on the typed text only).
- Rate limits: 5 per minute and 20 per hour per IP (slowapi, as for login; an IPv6 client counts by its /64, see Rate limits), then 3 per hour per address (lower case, spaces stripped), counted for every request whether or not an account has the address. Over the address limit the answer is 429 `{"detail": "Too many reset emails were asked for this address. Please wait an hour and try again."}`, the same with or without an account. Over the IP limit it is slowapi's 429. The counts live in the limiter's memory, so a restart clears them.
- Who gets a link: every account whose `users.email` equals the address ignoring case (at most 5; several accounts share an address only as emails that differ in case, from before register compared them ignoring case), except the seeded accounts (`SEEDED_USERNAMES`, the list Google's email linking skips: `admin@archive.com` is on a real domain) and accounts whose email cannot receive mail (`usable_email`: one plain ASCII address, at most 254 characters, a domain with a top-level domain, and not a reserved name such as `.test`, `.example`, `.invalid`, `.localhost`, `.local` or `example.com/.net/.org`). The email goes to the address stored on the account, not the one typed. Accounts linked to Google get a link too; their email is the Google one or the one they registered.
- Caps on the emails themselves (`mail_allowed` in `vtt/password_reset.py`), checked for each account before its link is issued:
  - overall, for the whole server: at most 20 reset emails an hour and 50 a day (`MAIL_LIMITS`). Without them one client with a few registered addresses sent about 480 a day from one IPv4 address, and any client with many addresses had no limit, which uses up Resend's quota (100 a day on the free plan), after which every real reset email fails while the answer stays 202. Over a cap the log says `The overall cap on reset emails (...) is reached` at ERROR level.
  - per address that nobody has proven (`email_proven` false, see Data under Sign in with Google): at most 3 a day (`UNPROVEN_ADDRESS_MAIL_LIMIT`).
  - Over either cap the account gets no link and no email, and the answer is the same 202. The counts are in the limiter's memory, like the others, and are off when the limiter is off (the tests turn it off).
- Each such account gets a new token, and its older tokens are deleted. Tokens past their expiry are deleted on every request.
- The emails are sent after the answer (a FastAPI background task), so the time the answer takes does not show whether an account matched. A failed send is logged and changes nothing.

#### Why unproven registration addresses still get reset emails

The safer-looking rule would be to mail only proven addresses (a Google account with that address, or a reset link used before). It would make the feature useless: no existing account has a proven address (the column is new), a password account can only prove its address through a reset, and an account with a Google account for its own address can already sign in with Google, the one case where a reset is not needed. A player who forgot their password would get the same 202 and never an email.

So registration addresses still get reset emails, for these reasons:

- A reset link only ever reaches whoever reads the address. When the address is someone else's (a squatter registered it), the reset hands the account to that address's owner, which is the right outcome, and it removes the squatter's unproven Google link.
- What is left is mail to a stranger's inbox: someone registers an account with another person's address and asks for resets. That person gets at most 3 such emails a day (the unproven cap), each naming an account they never made and saying it can be ignored, and the server as a whole at most 20 an hour and 50 a day.
- Registering an account per target address is limited per IP (5 a minute, an IPv6 network counting as one, see Rate limits below) and refusals of taken addresses are limited too.

The full fix is registration that confirms the address by email before the account works. It needs new screens, so it is left for later.

### POST /api/auth/password-reset/confirm `{token, password}`

Rate limited 10 per minute per IP. `password` follows the register rule (8 to 128 characters; 422 "Password must be at least 8 characters" or "Password too long"); `token` is at most 256 characters.

| Check, in order | Answer |
|---|---|
| no token row with that hash, expired, its user gone, or the user's password changed since the link was issued | 400 "This link has expired or has already been used. Please ask for a new one." |
| another request used the token, or changed the password, while this one hashed the new password | 400, the same |
| otherwise | the new password is set and the answer is what login answers for the user (GM or player shape) with a new `token`, plus `"googleUnlinked": true` or `false` |

It is 400, not 401: a browser that still has a session sends its token along, and `apiFetch` would end that session on a 401.

The same conditional UPDATE that sets the password also:

- sets `email_proven`: the link reached whoever reads the address.
- removes the Google link (`google_sub` and `google_email` back to NULL) unless it is proven, that is unless its `google_email` equals the account's email ignoring case. An unproven link may belong to someone who registered this address before its owner, or who linked their own Google account with a stolen login token, and it used to outlive the reset, so they kept signing in with Google. Whoever reads the address owns the account. Links made before `google_email` was recorded count as unproven, so a reset removes them too; their owner signs in with Google again, which links the account by email (step 2), keeping the new password because the email is now proven. A player who had linked a Google account with another email of their own links it again (`POST /api/auth/me/google` with the new password).
- `googleUnlinked` in the answer says whether a link was removed, so the reset page can tell the player. **API change:** the answer used to be exactly login's shape; `confirmPasswordReset` in `utils/api.js` passes the extra key through.

Setting the password changes the password stamp, so every login token issued before stops working (REST 401, WebSocket 4401). Every WebSocket the user has open is closed with 4401 as soon as the new password is committed (`manager.close_user`), so the reset email's promise that every earlier sign-in ends holds for open sockets too. The answer's token is the only one that works.

### Tokens

- 32 random bytes (`secrets.token_urlsafe`, 43 characters). Only its SHA-256 is stored.
- Table `password_reset_tokens`: `id`, `user_id` (foreign key to `users.id`, ON DELETE CASCADE, indexed), `token_hash` (64 hex digits, unique index), `password_stamp` (the user's password stamp when the link was issued), `created_at` and `expires_at` (Unix seconds; `expires_at` is one hour after `created_at`, `PASSWORD_RESET_EXPIRE_MINUTES` in `vtt/config.py`). `main.py`'s `create_all` makes it on start, and `init_db` makes it too when it is missing (`checkfirst`, so a second start changes nothing and keeps the rows).
- A token works once and for one hour. Using it deletes its row and every other row of the user, with conditional statements, so of two requests with the same token only one gets through. A newer request for the same user deletes the older rows. Any other change of the password (Google linking by email, `retire_published_passwords`, a hash set in the database) changes the stamp, so an older token no longer matches.

### The email

From `Candela Obscura <no-reply@mail.gatergrid.com>`, subject "Set a new Candela Obscura password", plain text plus a simple HTML version in the site's palette (a parchment sheet on the night background, ink text, sepia small print, an oxblood "Set a new password" button, Georgia). It names the account, gives the link, says the link works once and expires in one hour and that every earlier sign-in ends, and that the email can be ignored. `vtt/mail.py` posts it to `https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>` and a 10 second timeout; it logs the subject and Resend's status, never the address or the body. The tests replace `vtt.mail.send_email` with a fake, and conftest makes any real request to Resend fail the test.

## Rate limits

- The per-IP limits (slowapi, `limiter` in `vtt/security.py`: login, register, the Google routes, the reset routes) count under `client_key`: the client's address, which uvicorn takes from nginx's `X-Forwarded-For` (nginx sets it from Cloudflare's `CF-Connecting-IP`), but for an IPv6 client its /64 network (`2001:db8:1:2::/64`). Any machine with IPv6 has a whole /64, so counting each address on its own let one client start a fresh count with every request, and the register, reset and confirm limits stopped nothing. An IPv4 address mapped into IPv6 (`::ffff:203.0.113.9`) counts as that IPv4 address. The counts that are not per IP (per reset address, the reset mail caps, per user for portraits) are unchanged by this.
- nginx's own `limit_req` (20 requests a second per address, in the gatergrid-web repository) still keys on the single address. Keying it on the /64 as well needs a `map` in the nginx site, which is outside this repository.

### Register answers

`POST /api/auth/register` used to answer "That identification is already claimed." for a taken username and "That correspondence address is already registered." for a taken email. With a made-up username, that told anyone in one request whether an address has an account, which undid the reset route's identical answer. Now:

- A taken username, a taken email (ignoring case), or both, all get 400 `{"detail": "That username or email address cannot be used for a new account. Choose another username, or sign in if you already have an account."}`.
- Each refusal counts against 10 an hour per client (`client_key`, `REGISTER_REFUSAL_LIMIT` in `vtt/routers/auth.py`). Once they are used up, every register from that client is 429 `{"detail": "Too many accounts could not be created from here. Please try again in an hour."}` (the frontend shows its own 429 text) until the hour is over. The count is off when the limiter is off, like the others.
- What is left: since the request names the username, a client that sends a free one still learns from the 400 that the email has an account. The limits make that slow (10 addresses an hour per IPv4 address or IPv6 /64) instead of impossible. Hiding it fully needs registration that answers the same way every time and finishes by email, which needs new screens.
- `POST /api/auth/google/create` keeps its separate answers ("That identification is already claimed.", and 409 for an email with an account): it needs a Google sign-in for that address, so it is not an open lookup.
- `utils/authErrors.js` still maps the two old strings; the new one is shown as the server wrote it, which reads fine. The UI stage can drop the two old entries.

## Published passwords

User 1 (`admin`) owns every character forged before tokens without a `user_id` (WEBSOCKET.md A4, A5), so a known admin password would hand all of them out. `init_db` seeds admin with a random password nobody is told. On every startup `retire_published_passwords` (`vtt/db.py`) also checks the accounts whose passwords are published in this repository: `admin` with password `admin`, and `elara_voss`, `rook_halcyon`, `sable_devereux`, `finn_ashcroft` and `keeper_test` with password `testpass` (`reset_seed.py`, `seed_test_players.py`). Any of them that still has that password gets a random one, and a warning names them in the log. Accounts with a password of their own are left alone. Password reset by email skips these accounts, so whoever needs one of them sets a new hash in the database.

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

- Sign in with Google links by email to the account that has that email, and register never checked that an email belongs to whoever registered it. Someone who registers a password account with another person's email before that person's first Google sign-in used to get that person linked to an account whose password they knew. Since the security review the link replaces the password and ends every earlier login token, so they lose the account at that moment, and since the second review that also holds when they linked a Google account of their own first (an unproven link, which step 2 replaces). What they put in it before (characters, a campaign they run) stays with the account. The other way round is not possible: Google must have verified the email.
- Password reset trusts the email on the account, and register never checked that an address belongs to whoever registered it. Whoever controls an account's registered address can set its password by reset, which also removes an unproven Google link; the other way round (someone who registered another person's address) they cannot, because the link goes to that address. A player whose account has an address that cannot receive mail (the reserved test domains) cannot reset it.
- Whoever controls an account's address while it is unproven can also take the account over with a Google account for that address (step 2 replaces an unproven link). That is the same trust a reset gives them. A player who registered with an address that is not theirs (a typo, a shared family address) and linked their own Google account with another email can lose the account to that address's owner; a used reset link, or a link with a Google account of the address, proves the address and ends this.
- A stolen login token can no longer link the thief's Google account (`POST /api/auth/me/google` needs the password, or a Google account with the account's email). Someone who knows the password can still link a Google account of their own, and that link is unproven unless its email is the account's. Nothing in the app removes a link on request: unlinking a Google account, or moving it to another user, is a database edit (`google_sub` and `google_email` set to NULL), apart from the reset and step 2 rules above.
- Two reset requests for one account at the same moment can leave two working links. Each still works once, and both end when either is used.
- Someone who keeps asking for resets for another person's address uses up its 3 an hour, so that person waits for the hour too. Someone who asks for resets for many addresses with accounts can use up the overall caps (20 an hour, 50 a day), and real reset emails wait until the hour or the day is over; the ERROR log line shows when that happens, but nothing alerts anyone yet. The per-IP, per-address and overall counts are in memory and reset when the server restarts.
- A token cannot be revoked on its own before it expires. Replacing the user's password hash revokes all of that user's tokens (the password stamp), changing `SECRET_KEY` logs everyone out, and deleting a user revokes theirs, because the user lookup fails.
- An open WebSocket keeps working after its token expires (30 days); the expiry is only checked when the socket connects. A changed password does end it (Ending sockets when the password changes, under WebSocket).
- The token sits in localStorage, so a script injected into the page could read it. The app renders no user HTML as markup today.
- `action_rejected` and `portrait_update` are new server-to-client types; WEBSOCKET.md section 5 lists the types from before this stage.
