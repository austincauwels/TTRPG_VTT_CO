# Login tokens and access rules

Before this stage the server trusted whatever user id, character id or role the browser sent (ROUTES.md and WEBSOCKET.md describe that state). Now login hands out a signed token, and the server works out who is calling from it.

## Tokens

- `POST /api/auth/login` and `POST /api/auth/register` return every field they returned before, plus `token`. The Google sign-in routes return the login shape with `token` too (see Sign in with Google below). Register refuses a taken username or email with one answer for both (Register answers, under Rate limits).
- The token is a JWT signed with `SECRET_KEY`, algorithm HS256. Claims: `sub` (the user id as a string), `pwh` (the session stamp, below), `iat`, `exp` (30 days after `iat`). There is no refresh; after 30 days the user logs in again.
- Decoding accepts HS256 only and requires `sub`, `pwh`, `iat` and `exp`. A token that is malformed, expired, signed with another key or algorithm, whose user no longer exists, or whose password stamp no longer matches the user counts as no token.
- The password stamp is a keyed hash (HMAC-SHA256 with `SECRET_KEY`, 32 hex digits) of the user's password hash at the time the token was issued (`password_stamp` in `vtt/security.py`). When the password is replaced, every login token issued before stops working (REST 401, WebSocket 4401). That happens when Sign in with Google links an account by email (step 2 below), when a password reset link is used (Password reset by email below), when the password is changed or set on the account page (The account page below; that answer carries a new token for the browser that changed it), when an email change is undone by its undo link, when `retire_published_passwords` replaces a published password, and when someone sets a new hash in the database. Tokens issued before the stamp existed have no `pwh` and no longer work, so everyone logs in once more after this change.
- The session stamp is what `pwh` holds (`session_stamp` in `vtt/security.py`): the password stamp while `users.session_epoch` is 0 (or NULL, for rows from before the column), so the tokens issued before the epoch existed keep working, and otherwise a keyed hash of the password hash and the epoch. Raising the epoch by one ends every login token issued before, as a new password does, but keeps the password. Removing the Google sign-in on the account page does that, because a session signed in with that Google account would otherwise outlive the link by up to 30 days. Reset links and email change links carry the plain password stamp, so a new epoch leaves them alone. `init_db` adds the column (`INTEGER DEFAULT 0`) to an older database.
- A token that carries a `purpose` claim is never a login token (Google link tokens have one).
- Every bcrypt hash and password check of the sign-in routes runs in a worker thread (`run_in_threadpool`), so a sign-in does not hold up the event loop and the game's WebSockets for the quarter of a second bcrypt takes. A login or link with an unknown username runs passlib's dummy check, so it takes as long as a wrong password (`check_password` in `vtt/routers/auth.py`).
- Code: `vtt/security.py` (issue and decode), `vtt/auth.py` (the `get_current_user` dependency and the access helpers).
- Changing `SECRET_KEY` logs everyone out. Anyone who knows it can mint a token for any user, so the server refuses to start when it is the `.env.example` placeholder (`your-secret-key-here`) or shorter than 32 characters (`vtt/config.py`). The test conftest stretches a shorter harness key with SHA-256.

## REST

Every route except the sign-in routes (login, register, the three `/api/auth/google` routes, `GET /api/auth/config`, the two `/api/auth/password-reset` routes, and `POST /api/auth/email-change/undo`, the undo link mailed to an old address) takes `Authorization: Bearer <token>`. Without a valid token the answer is 401 `{"detail": "Not authenticated."}` with `WWW-Authenticate: Bearer`, before any other check.

After that, ids the client sends are checked against the caller:

- An id that does not exist is 404. A deleted character or campaign counts as one that does not exist (DELETION.md). The routes keep their existing messages ("Campaign not found", "Character not found", "Investigator dossier not found.", "Entry not found", "Relationship not found"); a circle is "Circle not found".
- An id that exists but that the caller may not use is 403 `{"detail": "Not allowed."}`.
- Where the client still sends its own user id (`user_id` on campaign create and forge, the path of the two user routes), the server uses the token's user. A matching value is accepted and ignored; anything else is 403.

Terms: the **GM** of a campaign is `campaigns.gm_user_id`. A **member** is a user with an active character in the campaign, one the GM approved (a dead character keeps status active until it is replaced). A pending character is waiting for the GM's approval and is not a member: anyone who has the campaign code can make one, so it reaches nothing of the campaign (`MEMBER_STATUSES` in `vtt/auth.py`; before the security review pending counted too). The **owner** of a character is `characters.user_id`.

| Route | Who may call it |
|---|---|
| POST /campaign/create | any logged-in user; they become the GM. A taken code is 409 "Campaign code is already in use", or, when it is held by a campaign the caller deleted, 409 "A campaign you deleted still holds this code, so that it can be brought back. Choose a different code." (DELETION.md) |
| POST /campaign/join | owner of `character_id`; a retired campaign is 409 "This campaign has been retired."; a character on a roster is 409, "This investigator is already in a campaign." (active) or "This investigator is already waiting to join a campaign." (pending), after the owner check. A character already pending in this same campaign is a retry of a join that went through: the same answer as the first join, and nothing changes or is broadcast |
| POST /campaign/approve/{character_id} | GM of the character's campaign (a character with no campaign has no GM: 403) |
| POST /campaign/reject/{character_id} | GM of the character's campaign |
| POST /campaign/{campaign_id}/retire | GM of that campaign |
| DELETE /campaign/{campaign_id} | GM of that campaign; the characters on its roster go back to their owners, retired ones stay with it (DELETION.md) |
| POST /campaign/{campaign_id}/restore | GM of that campaign, within two minutes of deleting it; anyone else, or a campaign that is not deleted, is 404 (DELETION.md) |
| POST /campaign/rejoin | owner of `character_id` (checked before any row is locked), and only when the user has a pending rejoin invite to that campaign or an approved character there that died and has not been replaced yet (dead, status active; the rejoin retires it, so one death opens the way once). Rejoin skips GM approval, so a dead pending character does not count. After these checks, a retired campaign is 409, and a character on a roster is 409 as for a join ("This investigator is already in a campaign." or "This investigator is already waiting to join a campaign."), a dead one included. A living active member of this same campaign is a retry of a rejoin that went through: the same answer, and nothing changes or is broadcast |
| POST /campaign/{campaign_id}/invite-rejoin | GM of that campaign. The invite lets its holder skip GM approval, so the username must name one user: an exact match wins, a name that matches only ignoring case must match exactly one user (409 "More than one player has that username..." otherwise). A retired campaign is 409 |
| GET /campaign/{campaign_id}/roster | GM or member |
| GET /campaign/{campaign_id}/circle-creation-state | GM or member (unknown campaign is now 404, not 500) |
| POST /circle/vote | owner of `character_id`; the character must be an active member of the circle's campaign |
| POST /circle/relationship/propose | owner of `from_character_id`; both characters members of the circle's campaign |
| POST /circle/relationship/respond | the owner of the party that did not act last (for a row with no recorded actor, the to-character), as on the WebSocket; that character must be an active member of the circle's campaign; propose and respond record `last_actor_id`. A relationship in a deleted campaign's circle is 404 "Relationship not found" |
| POST /campaign/finalize-roster | GM of that campaign |
| GET /api/investigators | any logged-in user; lists only their own characters |
| GET /api/investigators/{id} | owner, or GM of the character's campaign |
| POST /api/investigators/forge | any logged-in user; the character is theirs. `profile_pic` follows the portrait rule (Portraits below). The sheet must be one the character creator could make (vtt/creation.py, 422 otherwise) |
| DELETE /api/investigators/{id} | owner only (not the GM of its campaign), and only while the character is on no roster: 409 while it is active or pending (DELETION.md) |
| POST /api/investigators/{id}/restore | owner, within two minutes of deleting it; anyone else, or a character that is not deleted, is 404 (DELETION.md) |
| PUT /api/investigators/{id}/portrait | owner, or GM of the character's campaign while the character is on its roster (active or pending; a retired character still tagged with the campaign is 403 for that GM) |
| GET /api/auth/me | any logged-in user; their own account |
| POST /api/auth/me/google | any logged-in user who also sends the account's password, or a Google account with the account's email; links it to their own account (Linking Google while signed in below) |
| POST /api/auth/me/username, /password, /email | any logged-in user who also proves the account again (the current password, or a fresh Google sign-in of the linked Google account); their own account only (The account page below) |
| POST /api/auth/me/email/resend, /email/cancel | any logged-in user; their own waiting change of address |
| POST /api/auth/me/email/check, /email/confirm | the logged-in user who asked for that change (403 for anyone else) |
| POST /api/auth/email-change/undo | anyone with the undo link (no login: the link was mailed to the old address) |
| POST /api/auth/me/google/remove | any logged-in user who also sends the account's current password; their own account. Every other session of the account ends |
| GET /api/notebook/{campaign_id}/entries | GM or member; `role=GM` only for the GM (403 otherwise); `character_id` must be the caller's own character (an empty `character_id=` means none) |
| POST /api/notebook/{campaign_id}/entries | GM or member; a player must send `character_id`, and it must be the caller's own character and an active member of this campaign (the GM may leave it out); Lightkeeper entries (author_type gm, entry_type lightkeeper or visibility gm_only) only for the GM. The server sets `author_name` (the character's name, or the GM's username), pen and ink |
| PUT, DELETE /api/notebook/entries/{entry_id} | the author: the owner of the entry's character while that character is an active member of the entry's campaign, or the campaign's GM for an entry without a character. An entry of a deleted campaign is 404 "Entry not found" |
| POST /api/notebook/{campaign_id}/upload | as for adding an entry. A `scene` part (a drawn sketch's drawing) only with `entry_type` sketch: 422 "Only a sketch keeps a drawing." otherwise |
| GET /api/notebook/entries/{entry_id}/scene | the author of the sketch alone, as for PUT on an entry. This one differs from the other notebook reads: everyone in the campaign sees a sketch's picture in the entry list, but only its author reads its drawing, so the campaign's GM gets 403 for a player's drawing, as do the other members. The 403 comes before anything is said about the scene; then 404 "This sketch keeps no drawing." when it has none |
| PUT /api/notebook/entries/{entry_id}/sketch | the author of the sketch alone, as for reading its drawing (the GM cannot redraw a player's sketch). Sketch entries only (422 "Only a sketch keeps a drawing."). A picture sent without a scene replaces the picture and drops the drawing |
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

- The connection manager remembers which user opened each socket (`connect(key, websocket, user_id)`, kept in the socket's state). `manager.close_user(user_id)` closes all of that user's sockets with **4401** and forgets them. The reset confirm route calls it after the new password is committed, the account page's password and Remove Google routes do too, so does the email change undo link, and step 2 of Sign in with Google calls it when it replaces the password. The browser treats 4401 as a logout, as for a refused token, so the account page closes its own browser's socket before it sends a new password and opens it again with the new token afterwards.
- Before every message that names a handler, the socket checks the token's session stamp again (`stamp_still_valid` in `vtt/auth.py`, one indexed query of the password hash and the session epoch). When the password or the epoch changed any other way (set in the database), or the user is gone, the socket is closed with 4401 and the message is not handled. Frames that name no handler are ignored as before, without the check.
- Linking Google while signed in keeps the password, so it keeps the sockets too, and so do the account page's changes of the username and the email address.

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
| roll | the owner; on a GM channel without a character it is a Lightkeeper roll; a negative `drive_spent` is 422 (QUIRK D15); a player's roll must name one of the nine actions and may not spend more drive than it holds (422, from the handler) |
| update_drive, take_mark, revive_character, update_gear | the owner, or the GM for a member; a `gear` list whose items are not all strings is 422; a `mark_type` other than body, brain or bleed is 422 |
| resolve_gilded, use_post_roll_ability, update_pen_font, resolve_ability_mark, burn_resistance, apply_advancement, circle_personal_answer | the owner (apply_advancement also needs a pick waiting from the circle's advance; the handler refuses others with 409 or 422) |
| apply_scar | the owner; `shift_down` and `shift_up` must be action ratings (move, strike, control, hide, sneak, sway, survey, read, sense), anything else is 403 (QUIRK D14); a scar without both (or with `skip_shifts`) is 422 unless the character has Hardened, sends `not_again` (or `ability` Not Again) with an unused Not Again, or takes the fatal fourth scar (RULES_CHECK.md item 12); an `ability` must be Not Again or Forbidden Ritual (else 422) and the character's own, with Not Again unused this assignment (else 409) |
| intercept_mark | the owner of the interceptor; `target_character_id` must exist (404) and be in the interceptor's campaign; an unknown `mark_type` is 422 |
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
- `ALLOW_PASSWORD_LOGIN` (default true): when false, `POST /api/auth/login` and `POST /api/auth/register` answer 403 `{"detail": "Password sign-in is turned off. Please use Sign in with Google."}` (after body validation and the rate limit) and the login screen hides the password form. Login tokens already issued keep working. Accepted values are true, false, 1, 0, yes, no, on and off in any case; anything else stops the server, so a typo cannot leave password login on. With it off and no `GOOGLE_CLIENT_ID` nobody can log in, and startup logs a warning. With it off, startup also logs a warning with the number of accounts that have no Google sign-in, the seeded ones left out (`warn_password_only_accounts` in `vtt/db.py`, called at the end of `init_db`): "Password sign-in is off (ALLOW_PASSWORD_LOGIN) and 4 account(s) have no Google sign-in, so they cannot sign in until they link a Google account on the sign-in screen". They can still get in with Google: a Google account with the account's address links it by email (step 2), and "Link my existing account" takes the username and password whether or not password sign-in is on. An account that removed its Google sign-in on the account page while password sign-in was on is one of them.
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
- `users.email_proven`: boolean, default false. True once someone showed they read the account's address: a used reset link, an account made with Google, a link with a Google account of that address, or a used email change link (the new address). Nothing sets it back.
- `init_db` adds both columns to an older database (`TEXT`, and `BOOLEAN DEFAULT FALSE`). Existing rows get NULL and false, so every link made before this change counts as unproven, as do the addresses of existing accounts.
- Whether a link is proven is worked out each time from the two addresses, so a change of the account's address on the account page changes it: a link proven by the old address is unproven with a new one (so a reset by whoever reads the new address removes it), and an unproven link becomes proven when the new address is its Google email.
- `users.session_epoch`: integer, default 0, NULL for rows from before it (counts as 0). Raised by one when every session of the account must end while the password stays (removing the Google sign-in); login tokens carry it in their session stamp (Tokens, above).
- `users.has_password`: boolean, nullable. True when someone chose the account's password: register, a used reset link, the account page, and any password that was checked and worked (a password login, a link with the password through `/api/auth/google/link` or `POST /api/auth/me/google`). False when the server set one nobody knows: an account made with Google, step 2 replacing the password, an email change undone by its undo link, `retire_published_passwords`, the seeded admin. NULL for accounts from before the column (not known; a password login makes it true). `init_db` adds it as `BOOLEAN` with no default. The account page uses it to offer "Set a password" and to refuse removing Google (The account page below).

### Login screen

- `components/LoginScreen.jsx` loads Google Identity Services (`https://accounts.google.com/gsi/client`) only when the build has `VITE_GOOGLE_CLIENT_ID`, and renders Google's standard "Sign in with Google" button above the password form. Without the client ID the screen is as before.
- It reads `GET /api/auth/config` on load: no button when the server has no client ID, no password form when password login is off. Until the answer comes (or if it never does) both are offered. A 403 from login or register also hides the form and shows the server's message.
- After Google: a session is stored exactly like a password login's. `needs_account` shows a choice between "Link my existing account" (username and password, once) and "Create a new account" (the name prefilled with `suggested_name`). Errors show inline in the server's words; a 429 shows "Too many attempts. Please wait a minute and try again."
- The calls are `fetchAuthConfig`, `signInWithGoogle`, `linkGoogleAccount` and `createGoogleAccount` in `utils/api.js`.
- For the account card and page, the reset page and portraits, `utils/api.js` also has `fetchAccount` (GET /api/auth/me, null on failure), `linkGoogleToAccount(credential, password)`, the account page's calls (The account page below), `requestPasswordReset(email)` (a 429 reads "Too many reset emails have been asked for. Please try again in an hour."), `confirmPasswordReset(token, password)` (resolves to a session), `setCharacterPortrait(characterId, dataUrlOrNull)`, `portraitDataUrl(file)`, `PORTRAIT_MAX_LENGTH` and `PORTRAIT_MAX_SIDE`.
- Google's button opens a popup. A `Cross-Origin-Opener-Policy: same-origin` header on the page would break it, and a Content-Security-Policy would have to allow `https://accounts.google.com/gsi/` for scripts, frames, styles and connections. The site sends neither today.
- The Google OAuth client must list every origin the site is served from (and `http://localhost:5173` for development) under Authorized JavaScript origins.

## Linking Google while signed in

A player who signed in with a password can link a Google account with "Add Google sign-in" on the account page (The account page below). The browser runs Google's sign-in, then posts the credential with its login token and, unless the Google email is the account's email, the account's password.

### GET /api/auth/me

Needs a login token (401 otherwise); not rate limited. Answers the caller's own account: `{"userId": 12, "name": "mira", "email": "mira@example.org", "googleLinked": false, "googleEmail": null, "hasPassword": true, "pendingEmail": null}`. `googleEmail` is the linked Google account's email (null without a link); `hasPassword` is `users.has_password` (true, false, or null when not known, see Data); `pendingEmail` is the new address of a change that waits for its link, or null. The account card shows the name and the email; the account page shows all of it. **API change:** the answer used to have the first four keys only; every route that answers the account (this one, `POST /api/auth/me/google` and the account page's routes) gives the same seven.

### POST /api/auth/me/google `{credential, password?}`

Needs a login token, checked first (401 `{"detail": "Not authenticated."}`, and Google is not asked). Rate limited 10 per minute per IP. A wrong password, or a credential Google refuses, counts as a failed proof against the account page's limit per user (10 an hour, The account page below). `credential` as for `POST /api/auth/google` (missing, or over 8192 characters, is 422); `password` is optional, a string of at most 1024 characters (422 otherwise). It works whether or not password login is on.

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
| a password is sent and it is wrong | **403** "That is not this account's password." (403, not 401, so the session stays; logged like a failed login; counted as a failed proof) |
| no password, and the Google email is not the account's email | **403** "This Google account has another email address than your account. Enter your account's password to link it." |
| another user has this Google account | 409 "This Google account is already linked to another account." (also when another request linked it in between and the unique index refuses the write) |
| otherwise | `google_sub` and `google_email` are set (and `email_proven` when the Google email is the account's) and the answer is the account, as `GET /api/auth/me` gives it, with `googleLinked: true` |
| another request changed the account after these checks (conditional write, see Two requests at once) | 200 with the account when it linked this same Google account; 409 "That account is already linked to a Google account." when it linked another; 403 "That is not this account's password." when the password changed |

Nothing else changes: the password stays (password login keeps working), every login token keeps working, and the account's email stays as it was even when the Google email differs. From then on `POST /api/auth/google` signs in to this account by the Google subject (step 1). A link with a Google account of another email is unproven (Data, above): a password reset removes it, and so does the sign-in of a Google account with the account's own address while that address is unproven.

Frontend: `linkGoogleToAccount(credential, password)` in `utils/api.js` sends the password when one is given. "Add Google sign-in" on the account page tries without it first, and asks for the password when the server's 403 says the Google email is not the account's.

## The account page

The signed-in user's own account (owner's request, 2026-10-04): change the username, the password and the email address, and add or remove the Google sign-in. Code: `vtt/routers/account.py` (the routes and the proof), `vtt/email_change.py` (the email change links, the undo links and their emails), `vtt/usernames.py` (how names are compared, and held names), and in `vtt/routers/auth.py` `account_view`, `refused_proof` and `signed_in_google_identity`. A review on 2026-10-04 (`candela-ui-review/account-review.md`) changed the limit per user, added the undo link, the confirm page's question, the end of sessions when Google is removed, the stricter username rule and held names, the email caps of their own and the startup warning; its recheck (`candela-ui-review/account-recheck.md`) added the caps on renames, the Google link an undo keeps, the notice to the address an undo takes off and the proof for resend and cancel. Each is described where it applies below.

### Proof

Every change needs a login token (401 first, as everywhere) and proves the account again in the same request. A login token alone is never enough: tokens last 30 days and cannot be revoked one at a time, so a stolen one must not rename the account, change its password or move its address.

- `password`: the account's current password. When one is sent it must be right, even when a Google proof comes with it: 403 "That is not this account's password." (logged as a warning with the user id only).
- `credential`: a Google ID token, as for `POST /api/auth/google`, of the Google account linked to this account (`google_sub`), issued at most 5 minutes before (`GOOGLE_PROOF_MAX_AGE_SECONDS`; `GoogleIdentity.issued_at` is the token's `iat`, set by `verify_id_token`). This is how an account whose password nobody knows proves itself. Another Google account, or an account without a link: 403 "That Google account is not the one linked to this account." An older sign-in (Google's ID tokens last an hour): 403 "That Google sign-in is too old. Please confirm with Google again." A credential Google refuses: **400**, not 401, which would end the browser's session. Google out of reach or not set up: 503, as for sign-in.
- Neither: 403 "Enter your current password, or confirm with Google."

A proof that fails (a wrong password, a credential Google refuses, another Google account, a sign-in too old) counts against the limit per user below; a request with no proof at all does not count. The bodies take `password` (at most 1024 characters) and `credential` (at most 8192) as optional fields next to the change's own (422 otherwise). The server takes either proof from any account, since `has_password` may be NULL. Each write is one conditional UPDATE: only while the password hash, and for a Google proof the Google link, are still what the proof checked; otherwise nothing is written and the answer is 409 "The account changed while this was being saved. Please try again." A password proof that worked also sets `has_password`. The routes work whether or not password login is on, except removing Google.

### Rate limits

- Each route: 10 a minute per client (`client_key`), as login.
- Per user, failed proofs only: a wrong password, a refused, foreign or old Google sign-in, and an email change link that does not work (unknown, used, expired, or another account's) count against 10 an hour (`FAILED_PROOF_LIMIT` in `vtt/routers/auth.py`), on the username, password, email, email resend, cancel, check and confirm, and Google remove routes and on `POST /api/auth/me/google`. They are counted after the proof was checked (`refused_proof`). Over the limit a failed proof is 429 "This account has reached its limit of failed attempts. The right password, Google sign-in or link still works." instead of its own answer, and a warning is logged. A right proof always goes through, over the limit too. The words used to be "Please try again in an hour.", which told the owner to wait when the right password works at once.
  - Why: every request used to count, refused ones and ones with no proof at all, before the proof was checked. Whoever held a stolen login token could send ten empty requests an hour and keep the owner from every change, the new password included, which is the one change that ends the stolen token (both reset routes are 403 while password sign-in is off). Now the thief's requests cannot block the owner's right password.
  - What it costs: the limit no longer caps how many passwords one stolen session can try over many addresses, since a guess that is right goes through. The per-IP limits cap it, as they cap guesses at login. It still answers 429 to a client that keeps failing.
- Emails (`mail_refusal` in `vtt/email_change.py`), each checked before anything is counted, 429 when one is used up:
  - per user: each request for a change and each resend count one against 3 an hour (`EMAIL_CHANGE_MAIL_LIMIT`, "Too many confirmation emails. Please try again in an hour.").
  - per new address, whoever asks: each confirmation link (request or resend) counts one against 3 a day (`EMAIL_CHANGE_ADDRESS_LIMIT`, lower case and spaces stripped, "Too many confirmation emails went to that address today. Please try again tomorrow."). Anyone can type any address, so one address gets only a few of the site's emails a day.
  - for the whole server: every email about a change of address counts against 15 an hour and 30 a day (`EMAIL_CHANGE_MAIL_LIMITS`, "Too many emails were sent from this site. Please try again later.", logged at ERROR). A request counts three when the old address gets notices (the link, the notice, and the notice with the undo link once the change goes through, counted now so that it always goes out), else one; a resend counts one.
  - These caps are apart from the reset emails' (`MAIL_LIMITS` in `vtt/password_reset.py`, 20 an hour and 50 a day). They used to be shared, so a few throwaway accounts asking for changes (two emails each, three requests an hour each) could stop every reset email for the hour. Together the two stay under Resend's 100 a day. The two emails an undo sends (the reset link, and the notice to the address it takes off) count against neither: each undo link comes from one finished change, which the change caps counted.
- A taken address counts as a register refusal (10 an hour per client, Register answers below), the other way to learn whether an address has an account; once those are used up the email route answers 429 as register does.
- Renames that free a name (more than a change of case or spaces), per user: 3 a day (`RENAME_LIMIT` in `vtt/usernames.py`, counted once the rename is saved), and at most 5 names held for the user at a time (`MAX_HOLDS_PER_USER`, counted in `username_holds`, so this one holds across restarts and with the limiter off). See the username route below.
- Resend and cancel take a proof like every other change, and a failed one counts per user; the undo link is limited per client only.
- The per-user, per-address and overall counts live in the limiter's memory and are off when it is off, like the others.

### Logging

Each change logs the user id, what changed and the kind of proof ("Changed the username of user id=12 (password proof)", "Set a new password for user id=12 on the account page (Google proof)", "Sent an email change link for user id=12 (password proof)", "Sent the email change link again for user id=12 (Google proof)", "Cancelled the email change of user id=12 (link proof)", "Changed the email address of user id=12 with its link (Google link: unproven)", "Undid a change of the email address of user id=12 with its undo link: every session ended, a reset link was sent, its Google link stayed", "Removed the Google sign-in of user id=12 and ended its other sessions"); a refused proof or another account's link logs a warning with the user id, and so does a user over the failed-proof limit or a refused rename. Never a password, a token, a credential or an address.

### POST /api/auth/me/username `{username, password | credential}`

| Check, in order | Answer |
|---|---|
| `username` breaks the register rule (below) | 422 |
| the account is a seeded one (`SEEDED_USERNAMES`) | 403 "This account's username cannot be changed." Their protections (never linked by email, no reset emails) go by the name. |
| the proof | as above (a failed one counts per user) |
| the name it already has | 200 with the account, nothing changes |
| another user has it, as names are compared (below), or holds it after a rename, or it is a seeded name | 400 "That identification is already claimed." (the frontend shows "That username is already taken. Choose another one."). A change of case of one's own name is fine. |
| the rename frees a name and the user made 3 such renames today (`RENAME_LIMIT`, while the limiter is on) | 429 "You can change your username 3 times a day. Please try again tomorrow." |
| the rename frees a name and the user would then hold more than 5 names (`MAX_HOLDS_PER_USER`): their live holds, less a hold on the new name, plus the old one | 429 "Your last 5 usernames are still held for you. You can change it again in 12 days, or go back to one of them.", with the days until enough of the oldest holds end |
| otherwise | the name changes and the old one is held for the user; 200 with the account |
| another request took the name in between (the unique index) | 400, the same |

The register rule, for register, an account made with Google and this route alike (`check_new_username` in `vtt/schemas.py`): whitespace at either end is dropped and runs of spaces become one, then 2 to 32 of the ASCII letters A to Z and a to z, digits, spaces, dots, dashes and underscores, checked with `fullmatch`. The name is stored as it comes out of that. It used to be `re.match(r"^[\w\-. ]+$")` on the name as sent: `$` also matches before a final newline, `\w` takes letters of any script, and nothing was stripped, so "mira " or "mira\n" passed next to "mira", and so did "mіra" with a Cyrillic і. Register and the Google sign-in's suggested name follow the same rule; the suggestion drops accents ("Zoë" becomes "Zoe") and falls back to the email's local part when nothing is left.

Names are compared by a key (`username_key` in `vtt/usernames.py`): whitespace at either end dropped, runs of whitespace made one space, lower case. Register, Google's create and this route refuse a name whose key another user's name has, so names stored before the rule ("mira ", "mira\n", "mira  bell") still count against their look-alikes. Login still compares names exactly. Names in letters of other scripts from before the rule are compared by that key only, not by their look.

A name freed by a rename is held for its former owner for 90 days (`USERNAME_HOLD_DAYS`, table `username_holds`: `id`, `user_id` with ON DELETE CASCADE, `name_key` indexed, `held_until` in Unix seconds). Nobody else may take it meanwhile (register, Google's create and this route answer as for a taken name); its former owner may take it back, which holds the name they leave. A GM who invites a player to rejoin by the name they knew (an invite skips the GM's approval) used to reach whoever took the freed name; during the hold such an invite answers 404 "No player found with that username." Expired holds are deleted at the next rename. `create_all` and `init_db` make the table.

Renames are capped per user (`rename_refusal` in `vtt/usernames.py`; the rows above). With no cap, each rename held one more name for 90 days, and the only limit was the route's 10 a minute per client: one account with its own password could hold about 600 names an hour that register and Google's create then refused for 90 days. Now an account holds at most 5 freed names at a time, and makes at most 3 renames a day. Going back to a held name ends that hold, so it never counts against the 5, and a change of case or spaces frees no name and counts against neither. A failed proof or a refused name is no rename.

Login tokens carry the user id, so every session stays. The new name shows wherever the name is read after the change: login answers, the GM's notebook entries and chat (read from the database as they are written), rejoin invites by username. The browser replaces `accessSession.name`.

### POST /api/auth/me/password `{new_password, password | credential}`

"Change password" proves the account with the current password; "Set a password", for an account whose password nobody knows (`hasPassword` false), with a fresh Google sign-in.

- `new_password` follows the register rule (8 to 128 characters, 422).
- 200 with the account plus `token`, a new login token for this browser.
- The new hash changes the password stamp, so every other login token ends (REST 401, WebSocket 4401), and the user's open sockets are closed with 4401 after the commit (`manager.close_user`), this browser's too (the page closes its own first and opens it again with the new token). Reset links issued before stop working (their stamp), and a change of address that waits for its link is deleted. Undo links of earlier changes of address keep working.
- `has_password` becomes true. A Google link stays as it is.

### Changing the email address

The address changes only through a link sent to the new address and used by the same user, signed in, after the page asked them. Once it changed, the old address gets an undo link for 7 days.

`POST /api/auth/me/email {email, password | credential}`, status 202:

| Check, in order | Answer |
|---|---|
| `email`, stripped: at most 254 characters, `x@y` with no spaces | 422 |
| `RESET_URL_BASE` is not set (the link has no site address) | 503 "Email changes are not available on this server." (logged) |
| the proof | as above (a failed one counts per user) |
| mail cannot reach the address (`usable_email`: a reserved domain such as `.test` or `example.com`, no top-level domain, non-ASCII) | 422 "That email address cannot receive mail." |
| the account's own address, ignoring case | 400 "That is already your email address." |
| the client's register refusals are used up | 429, as register |
| another account has it, ignoring case, or an undo link of another account can put it back (held, below) | 409 "That email address cannot be used." (counted as a register refusal) |
| the mail limits | 429 (Rate limits above) |
| otherwise | a new link replaces any older one; 202 with the account, `pendingEmail` set |

Then, after the answer (background tasks through `vtt/mail.py`, from `no-reply@mail.gatergrid.com`, on the reset email's paper; a failed send is logged and changes nothing):

- to the new address, "Confirm your new Candela Obscura email address": the account's name, the link `RESET_URL_BASE/confirm-email?token=<token>`, that it must be opened in a browser signed in to that account, works once and expires in one hour, and that the email can be ignored.
- to the old address, "Your Candela Obscura email address is being changed": the account's name, the new address masked (`n***@candela-players.org`), that the address changes only if the link sent to it is opened within the hour and that the old address then gets another email with a link to undo the change, and "If you did not ask for this, sign in and change your password. That also cancels the change." No notice goes to an address mail cannot reach, or to a seeded account's.

`POST /api/auth/me/email/check {token}`: what the link would change, without changing it. The page at `/confirm-email` calls it when it opens and shows the answer, `{"name": "mira", "email": <the address now>, "newEmail": <the new address>}`, before it asks. Its refusals are confirm's first three rows below (400, 403, 400, each a failed proof); the link keeps working either way.

`POST /api/auth/me/email/confirm {token}` (the page sends it only when the owner presses "Confirm new email"):

| Check, in order | Answer |
|---|---|
| no row with the token's hash, or it has expired | 400 "This link has expired or has already been used." (a failed proof) |
| the row is another user's | 403 "This link is for another account." (logged with the caller's id; a failed proof; the link keeps working for its owner) |
| the password changed since the request (the stamp), or the address changed another way (`old_email`) | 400, as expired (a failed proof) |
| another account has the new address by now, ignoring case, or it is held | 409 "That email address cannot be used." |
| `RESET_URL_BASE` is not set (the undo link has no site address) | 503, as for a request |
| otherwise | the address changes and `email_proven` becomes true; the user's email change rows and **password reset links** are deleted (those went to the old address); the old address gets an undo link (below); 200 with the account |
| another request used the link, or changed the password or the address, while this one ran, or took the address (the unique index) | 400, or 409 for the address |

A working link goes through even when the user's failed-proof limit is used up. 400 and 403, not 401, so the browser keeps its session. Sessions and sockets stay. Whether a Google link is proven now follows the new address (Data, under Sign in with Google).

The link needs the signed-in user as well as the token, so whoever reads the new address without being signed in to the account (a link scanner, or a stranger whose address was mistyped) changes nothing. The page used to send the token as soon as it opened: when the owner mistyped the new address, whoever got the link could send it to the owner, and an owner who opened it while signed in made the change at once, after which that address was proven and could take the account over by Google's sign-in by email or a reset. Now the page shows the account's name and the new address and waits for a click, and it offers Cancel change.

`POST /api/auth/me/email/resend {password | credential}` (202) mails a new link for the waiting change to the same address; the older link stops working and the change expires when it would have, so a resend never makes it last longer. It takes a proof (as above; a failed one counts per user), checked after `RESET_URL_BASE` (503 without it, as a request) and before the waiting change: without one it is 409 "No email change is waiting." `POST /api/auth/me/email/cancel {password | credential | token}` (200) deletes the waiting change. It takes a proof too, or instead `token`, the change's own link (the page at `/confirm-email` sends it for Cancel change), refused as confirm refuses a link (400, or 403 for another account's, each a failed proof); a password or credential sent with a token is checked and the token is not. Both used to take no proof, so a stolen login token alone could use up the owner's 3 confirmation emails an hour and the new address's 3 a day, end the link the owner already had with each resend, or drop the owner's waiting change. A right proof goes through over the failed-proof limit, so the owner can always drop a change someone else asked for, and a new password still ends that someone's session.

Tokens: 32 random bytes (`secrets.token_urlsafe`). Table `email_change_tokens`: `id`, `user_id` (foreign key to `users.id`, ON DELETE CASCADE, indexed), `token_hash` (SHA-256, unique index), `new_email`, `old_email` (the account's address when the change was asked for), `password_stamp`, `created_at` and `expires_at` (Unix seconds, one hour, `EMAIL_CHANGE_EXPIRE_MINUTES`). One row per user: a new request deletes the older ones, and expired rows are deleted on every request. A used reset link deletes the user's rows too. `create_all` makes the table, and `init_db` makes it on an older database (`checkfirst`).

### The undo link

Someone who has the password, or the linked Google account, could ask for a change and confirm it within seconds from their own mailbox, then change the password; from then on reset emails went to their address, and the old address had only the notice sent when the change was asked for. Now, when a change goes through and the old address gets notices, it also gets "Your Candela Obscura email address was changed": the account's name, the new address masked, "If you made this change, you can ignore this email.", and an "Undo this change" link, `RESET_URL_BASE/undo-email-change?token=<token>`, that works once for 7 days (`EMAIL_UNDO_EXPIRE_DAYS`). Undoing it puts the old address back on the account, ends every sign-in to it, and sends that address a link to set a new password.

`POST /api/auth/email-change/undo {token}` (the page at `/undo-email-change` sends it when the reader presses "Undo the change"; no login, since whoever made the change may have changed the password; 10 a minute per client; `token` at most 256 characters, 422 otherwise):

| Check, in order | Answer |
|---|---|
| no row with the token's hash, or it has expired | 400 "This link has expired or has already been used." |
| another account has the old address by now, ignoring case, or holds it | 409 "Another account has that address now, so the change cannot be undone." Nothing changes |
| otherwise | 200 `{"userId": 12, "name": "mira", "email": <the old address>, "passwordReset": true, "googleKept": true, "googleEmail": "m***@gmail.com", "googleOnlyWayIn": false}` |
| another request used the link in between, or took the address (the unique index) | 400, or 409 for the address |

What it does, in one transaction (`undo` in `vtt/email_change.py`):

- deletes the undo row, and the user's undo rows issued after it. Those belong to later changes, which this undo takes back; left alone, whoever made them could undo this undo. Undo rows issued before it stay: each still puts back the address it was sent to.
- one UPDATE of the user: the old address back, `email_proven` true (the link reached it); the password replaced with one nobody knows and `has_password` false, which ends every login token (the stamp); and the Google link:
  - kept when it is the link the account had when the change went through (the undo row's `google_sub`, recorded by `issue_undo` at confirm), or its Google email is the old address, ignoring case (`link_kept_by_rule`). The owner's own Google account may use another address than the account's; it used to be removed, and with password sign-in off (no reset link) such an owner, whose old address had no Google account, could not sign in at all.
  - removed otherwise (one linked after the change went through, or one that replaced the recorded link), so a Google account the person who made the change linked cannot sign in,
  - unless no reset link can be sent (password sign-in off, or no `RESET_URL_BASE`): then any link stays (`keep_any_link`), since without it the account would have no way in. The answer says so (`googleOnlyWayIn` true) and the page tells the reader.
- deletes the user's waiting change of address and reset links.
- while password sign-in is on, issues a reset link for the old address and mails it after the answer (`passwordReset` true). That email is not capped (Rate limits above). While password sign-in is off the reset routes are 403, so none is sent (`passwordReset` false) and the owner signs in with the Google link the account kept or, without one, with a Google account of the old address, which links the account by email (step 2, the address is proven now).
- after the commit the user's sockets close with 4401 (`manager.close_user`).
- after the answer, the address the undo took off the account (the one it had just before, when that one gets notices and is not the old address) gets "Your Candela Obscura email address was changed back": the account's name, the old address masked, that someone used the undo link sent to that address, that this address is no longer on the account and every sign-in has ended and its password no longer works, whether a Google sign-in (masked) still works, and "If you did not expect this, whoever reads <old address, masked> now has the account." It used to get nothing: when the old address was a lost or shared mailbox, the real owner was signed out without a word. Not capped either. With A to B to C, the first change's undo link takes C off, so C gets the notice.

The answer: `passwordReset`, whether a reset link was sent; `googleKept`, whether a Google link stayed; `googleEmail`, its Google email masked (`n***@gmail.com`), or null; `googleOnlyWayIn`, whether it stayed only because removing it would leave no way in.

The undo link works whatever happened to the account since: a new password, a reset from the new address, a new Google link, or another change of address do not end it. While it works, the old address is held for the account: another account's change of address, register and Google's create treat it as taken (`address_held`), so the undo can always put it back. Table `email_change_undos`: `id`, `user_id` (ON DELETE CASCADE, indexed), `token_hash` (SHA-256, unique index), `old_email`, `new_email`, `google_sub` (the Google link when the change went through, NULL for none and for rows from before the column), `created_at`, `expires_at`. Expired rows are deleted whenever a change is asked for. No undo link goes to an address that gets no notices (one mail cannot reach, or a seeded account's). `create_all` makes the table, and `init_db` makes it on an older database and adds `google_sub` to an older table.

### POST /api/auth/me/google/remove `{password}`

| Check, in order | Answer |
|---|---|
| `password` missing or over 1024 characters | 422 (a Google proof is not taken here) |
| no Google account is linked | 200 with the account, nothing changes (no `token`) |
| password sign-in is off (`ALLOW_PASSWORD_LOGIN`) | 409 "Password sign-in is turned off, so Google sign-in cannot be removed." |
| `has_password` is false (nobody knows the password) | 409 "Set a password before you remove Google sign-in." |
| an empty password | 403 "Enter your current password." |
| a wrong password | 403 "That is not this account's password." (a failed proof) |
| otherwise | `google_sub` and `google_email` become NULL, `session_epoch` goes up by one (only while the link and the password are the ones checked, else 409 as above) and `has_password` true; a change of address that waits for its link is deleted; 200 with the account plus `token`, a new login token for this browser |

Either 409 refusal would lock the account out: without Google it signs in with its password only, and the right password shows that it can (also when `has_password` is NULL). The raised session epoch ends every other login token (REST 401, WebSocket 4401) and the user's sockets close after the commit, this browser's too (the page closes its own first and opens it again with the new token), as for a new password. Login tokens used to be stamped with the password only, so a session signed in with the removed Google account kept working for up to 30 days. The password stays, and reset links keep working. An account that removed Google this way can no longer sign in directly if password sign-in is turned off later; startup then logs how many such accounts there are (Settings, under Sign in with Google). Adding a Google sign-in is `POST /api/auth/me/google` (Linking Google while signed in, above).

### Frontend

- The account card (`components/shared/AccountMenu.jsx`) shows the name, the email and the member number, an "Account" link (`/account` under the build's base, a real link) and Sign out. It no longer links Google or says "Google linked".
- The account page (`components/account/AccountPage.jsx`) has its own address, `/account` (`components/account/accountAddress.js`). The card pushes a history entry for it, so the browser's Back leaves it, as do Escape and the header's Back to chapter hub, Back to your desk or Back to the Lightkeeper's Desk. A reload stays on it. It is one paper form (Form C.O. 8, Chapter member, with the member number) with four lines: Username, Email, Password, Google sign-in. Each opens its change in place, one at a time, ending in its proof: Current password, or "Confirm with Google" (Google's button, only one on the page at a time) when the account is linked and Google is on, with "Use Google instead" or "Use password instead" when it has both. `hasPassword` false gets "Set a password", "Not set" and the Google proof only, and Remove Google sign-in answers with the plain message above; `hasPassword` null with Google starts on Google. A waiting change of address shows "Waiting for confirmation at ..." with Resend link and Cancel change; each opens its proof in the same box (the form's "Resend link" or "Cancel change", with Cancel or Back), as one of the page's forms, so only one is open at a time. After Cancel change the focus goes to Change email.
- A refusal goes under the change's own field only when it is about the value typed there (`aboutField`: its status is one of the field's and its message names the field, "username" or "email address"); a refused Google sign-in (400), "The account changed while this was being saved" (409) and too many attempts (429) go under the whole form. They all used to go under New username or New email.
- While password sign-in is off, the Google line says "Password sign-in is turned off on this site, so Google sign-in cannot be removed: it is how this account signs in." in place of the button that used to be hidden without a word. Remove Google sign-in says first that it signs the account out everywhere else, and after it "Google sign-in removed. Every other sign-in has ended."
- The page keeps the session: a new name goes into `accessSession.name`, and the token a new password or the removal of Google answers with into `accessSession.token`; the store's socket is closed before those requests and opened again afterwards (`withNewSession`), because the server closes it with 4401, which the store takes for a logout.
- The username fields (the account page, register, Google's create) check the register rule's characters too: "2 to 32 characters: letters A to Z, digits, spaces, dots, dashes or underscores."
- `/confirm-email?token=...` (`components/account/ConfirmEmailPage.jsx`) needs a session: until there is one the router shows the sign-in slip and keeps the address. Then it reads the link (`checkEmailChange`) and asks: "Change the email address of mira to" the new address, the address now, "Confirm only if the new address is yours.", then "Confirm new email" and "Cancel change". Only the click sends the token; Cancel change sends it to the cancel route as its proof. Then "Email changed." (Continue opens the account page), "Change cancelled.", "This link is for another account." (with Sign out), or that the link has expired (Go to account).
- `/undo-email-change?token=...` (`components/account/UndoEmailChangePage.jsx`) works signed in or not. It asks "Put this email address back on your Candela Obscura account?" with "Undo the change" and "Leave it as it is", and sends nothing before the click, so a mail scanner that opens links undoes nothing. Then "Change undone." with the account's name and the address it has again, and how it is signed in to now (`afterUndo`): a link to set a new password is on its way, and "Google sign-in with m***@gmail.com still works." when a Google link stayed; with password sign-in off, "Password sign-in is off on this site, so the account keeps its Google sign-in with m***@gmail.com: without it there would be no way in." when it stayed only for that, "so sign in with Google using m***@gmail.com." when it stayed by its rule, else "so sign in with Google using this address." A browser signed in to that account is signed out.
- `utils/api.js`: `changeUsername(username, proof)`, `changePassword(newPassword, proof)` (the account plus `token`), `requestEmailChange(email, proof)`, `resendEmailChange(proof)`, `cancelEmailChange(proof)` (a proof, or `{ token }` from the confirm page), `checkEmailChange(token)`, `confirmEmailChange(token)`, `undoEmailChange(token)` and `removeGoogleSignIn(password)` (the account plus `token`), where `proof` is `{ password }` or `{ credential }`. Each throws like the sign-in calls (`error.status` and a message to show as is).

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

Forge stored any string before the rule, and pictures up to 10 MB until the cap went down, so the database can hold links to other sites (every viewer's browser would fetch them, giving that site their address and times), SVGs, other types and oversized pictures. Nothing is deleted. Instead every place that serves a portrait passes it through `served_portrait` (`vtt/portraits.py`): a `data:image/png`, `jpeg` or `webp` base64 URL of at most `PORTRAIT_MAX_LENGTH` characters is served as it is, anything else as no portrait (`null`). That covers `get_char_dict` (every WebSocket frame and the REST answers built from it), `CharacterResponse` (forge, and `GET /api/investigators/{id}` through its `CharacterSheet`) and `CharacterRosterItem` (`GET /api/investigators`, the campaign roster). The check reads the prefix and the length only, so it is cheap on every frame; every portrait written since the rule was checked in full, and bytes behind a valid prefix are inert in an `<img>`.

The one other value served is a path to one of the app's own pictures: `/images/` followed by a single file name of letters, digits, `_` and `-` ending in `.png`, `.jpg`, `.jpeg` or `.webp` (`is_own_image_path`), such as `/images/Journalist.png`. The seeded and demo characters carry their role portraits this way, and so may older live rows; the browser loads them from the site it is already on, so they reach nobody else. `check_portrait` takes the same paths, so the dossier's Undo can put such a portrait back. Anything else that looks like a path (`//host/...`, `/images/../x.png`, a sub-folder, a query, `.svg`) is still no portrait and still refused.

A character whose old portrait no longer shows gets it back by setting a new one. Before deploying to live, a read-only count of the rows that will stop showing (anything that is neither a `data:image/png;base64,`, `data:image/jpeg;base64,` or `data:image/webp;base64,` URL of at most 409,600 characters nor an own-picture path as above) tells which players to warn.

## Password reset by email

A player who forgot their password asks for a link by email, then sets a new password with it. Code: `vtt/password_reset.py` (who gets a link, the tokens, the email), `vtt/mail.py` (sending), the two routes in `vtt/routers/auth.py`.

### Settings

- `RESEND_API_KEY`: the Resend API key (sending only). It goes into CT210's `/etc/candela/candela.env`, never into git. Without it a reset request still answers 202 and the log says `RESEND_API_KEY is not set, so the email 'Set a new Candela Obscura password (10:00 AM)' was not sent`; the link is never logged.
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
| a newer link replaced this one (`replaced_at`), and the user's newest link still works | 400 "A newer link was sent. Use the latest email." (`replaced_link`) |
| no token row with that hash, expired, replaced, its user gone, or the user's password changed since the link was issued | 400 "This link has expired or has already been used. Please ask for a new one." |
| another request used the token, or changed the password, while this one hashed the new password | 400, the same |
| otherwise | the new password is set and the answer is what login answers for the user (GM or player shape) with a new `token`, plus `"googleUnlinked": true` or `false` |

It is 400, not 401: a browser that still has a session sends its token along, and `apiFetch` would end that session on a 401.

The newer-link answer (owner's request, 2026-10-04, round 4 item 18: an old link in a Gmail thread said "expired" while a newer one worked): only whoever holds a replaced link's token gets it, so it says nothing about which addresses have accounts; unknown tokens and the request route answer as before. It is given only while the newest link of that user still works (not expired, the password unchanged), so "use the latest email" never sends the reader to a dead link. Once the newest link is used, or the password changes, an older link answers as expired. The reset page shows the server's words as they come, under them "Ask for a new link".

The same conditional UPDATE that sets the password also:

- sets `email_proven`: the link reached whoever reads the address.
- sets `has_password`: the reader chose the new password.
- removes the Google link (`google_sub` and `google_email` back to NULL) unless it is proven, that is unless its `google_email` equals the account's email ignoring case. An unproven link may belong to someone who registered this address before its owner, or who linked their own Google account with a stolen login token, and it used to outlive the reset, so they kept signing in with Google. Whoever reads the address owns the account. Links made before `google_email` was recorded count as unproven, so a reset removes them too; their owner signs in with Google again, which links the account by email (step 2), keeping the new password because the email is now proven. A player who had linked a Google account with another email of their own links it again (`POST /api/auth/me/google` with the new password).
- `googleUnlinked` in the answer says whether a link was removed, so the reset page can tell the player. **API change:** the answer used to be exactly login's shape; `confirmPasswordReset` in `utils/api.js` passes the extra key through.

Setting the password changes the password stamp, so every login token issued before stops working (REST 401, WebSocket 4401). Every WebSocket the user has open is closed with 4401 as soon as the new password is committed (`manager.close_user`), so the reset email's promise that every earlier sign-in ends holds for open sockets too. The answer's token is the only one that works. A change of address waiting for its link (The account page) is deleted too: whoever reads the current address owns the account. Undo links of earlier changes of address are not: the reset may come from whoever made such a change, from the new address, and the undo link is how the old address takes the account back.

### Tokens

- 32 random bytes (`secrets.token_urlsafe`, 43 characters). Only its SHA-256 is stored.
- Table `password_reset_tokens`: `id`, `user_id` (foreign key to `users.id`, ON DELETE CASCADE, indexed), `token_hash` (64 hex digits, unique index), `password_stamp` (the user's password stamp when the link was issued), `created_at` and `expires_at` (Unix seconds; `expires_at` is one hour after `created_at`, `PASSWORD_RESET_EXPIRE_MINUTES` in `vtt/config.py`), `replaced_at` (Unix seconds when a newer link replaced it, NULL while it is the newest and for rows from before the column). `main.py`'s `create_all` makes it on start, and `init_db` makes it too when it is missing (`checkfirst`, so a second start changes nothing and keeps the rows) and adds `replaced_at` to an older table.
- A token works once and for one hour. Using it deletes its row and every other row of the user, with conditional statements, so of two requests with the same token only one gets through. A newer request for the same user replaces the older rows: they used to be deleted; now they stay, with `replaced_at` set, never work again (`find_token` refuses them), and expire with the newer link (their `expires_at` becomes its), so the replaced-link answer above lasts as long as the newer link and the rows go with the expired ones. Any other change of the password (Google linking by email, `retire_published_passwords`, a hash set in the database) changes the stamp, so an older token no longer matches.

### The email

From `Candela Obscura <no-reply@mail.gatergrid.com>`, subject "Set a new Candela Obscura password (10:00 AM)": the time the link was issued on the US Pacific clock, where the players are (`subject` and `pacific_clock` in `vtt/password_reset.py`; `zoneinfo`'s America/Los_Angeles, or the US daylight time rule in force since 2007 on a system without time zone data). Gmail threads emails with the same subject, so the emails of several requests used to stack in one thread with the oldest link showing first; each now starts a thread of its own (owner's request, round 4 item 18). Plain text plus a simple HTML version in the site's palette (a parchment sheet on the night background, ink text, sepia small print, an oxblood "Set a new password" button, Georgia). It names the account, gives the link, says the link works once and expires in one hour and that every earlier sign-in ends, and that the email can be ignored. `vtt/mail.py` posts it to `https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>` and a 10 second timeout; it logs the subject and Resend's status, never the address or the body. The tests replace `vtt.mail.send_email` with a fake, and conftest makes any real request to Resend fail the test.

## Rate limits

- The per-IP limits (slowapi, `limiter` in `vtt/security.py`: login, register, the Google routes, the reset routes, the account page's routes) count under `client_key`: the client's address, which uvicorn takes from nginx's `X-Forwarded-For` (nginx sets it from Cloudflare's `CF-Connecting-IP`), but for an IPv6 client its /64 network (`2001:db8:1:2::/64`). Any machine with IPv6 has a whole /64, so counting each address on its own let one client start a fresh count with every request, and the register, reset and confirm limits stopped nothing. An IPv4 address mapped into IPv6 (`::ffff:203.0.113.9`) counts as that IPv4 address. The counts that are not per IP (per reset address, the mail caps, per new address for email changes, per user for portraits and for failed proofs on the account page) are unchanged by this.
- nginx's own `limit_req` (20 requests a second per address, in the gatergrid-web repository) still keys on the single address. Keying it on the /64 as well needs a `map` in the nginx site, which is outside this repository.

### Register answers

`POST /api/auth/register` used to answer "That identification is already claimed." for a taken username and "That correspondence address is already registered." for a taken email. With a made-up username, that told anyone in one request whether an address has an account, which undid the reset route's identical answer. Now:

- A taken username, a taken email (ignoring case), or both, all get 400 `{"detail": "That username or email address cannot be used for a new account. Choose another username, or sign in if you already have an account."}`. A username counts as taken as the account page compares names (case and stray spaces do not count, and a name freed by a rename is held for 90 days), and an address an undo link can still put back on its account counts as taken (The account page).
- Each refusal counts against 10 an hour per client (`client_key`, `REGISTER_REFUSAL_LIMIT` in `vtt/routers/auth.py`). Once they are used up, every register from that client is 429 `{"detail": "Too many accounts could not be created from here. Please try again in an hour."}` (the frontend shows its own 429 text) until the hour is over. The count is off when the limiter is off, like the others.
- What is left: since the request names the username, a client that sends a free one still learns from the 400 that the email has an account. The limits make that slow (10 addresses an hour per IPv4 address or IPv6 /64) instead of impossible. Hiding it fully needs registration that answers the same way every time and finishes by email, which needs new screens.
- `POST /api/auth/google/create` keeps its separate answers ("That identification is already claimed.", and 409 for an email with an account): it needs a Google sign-in for that address, so it is not an open lookup.
- `utils/authErrors.js` still maps the two old strings; the new one is shown as the server wrote it, which reads fine. The UI stage can drop the two old entries.

## Published passwords

User 1 (`admin`) owns every character forged before tokens without a `user_id` (WEBSOCKET.md A4, A5), so a known admin password would hand all of them out. `init_db` seeds admin with a random password nobody is told. On every startup `retire_published_passwords` (`vtt/db.py`) also checks the accounts whose passwords are published in this repository: `admin` with password `admin`, and `elara_voss`, `rook_halcyon`, `sable_devereux`, `finn_ashcroft` and `keeper_test` with password `testpass` (`reset_seed.py`, `seed_test_players.py`). Any of them that still has that password gets a random one (`has_password` false), and a warning names them in the log. Accounts with a password of their own are left alone. Password reset by email skips these accounts, so whoever needs one of them sets a new hash in the database. On the account page they keep their usernames, and nobody else may take one of these names (in any case), because the protections above go by the name.

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
- A stolen login token can no longer link the thief's Google account (`POST /api/auth/me/google` needs the password, or a Google account with the account's email). Someone who knows the password can still link a Google account of their own, and that link is unproven unless its email is the account's. The account page removes a link with the account's password ("Remove Google sign-in"); moving a link to another user is still a database edit.
- Whoever knows an account's password (or holds its Google account) can change its address on the account page to one they read, after which reset links go there and a link proven by the old address is unproven. The old address gets a notice when the change is asked for, and another with an undo link once it is made; for 7 days whoever reads the old address can take the account back. After 7 days the change stands. The undo link also works the other way: someone who reads an address the owner moved away from (a shared or lost mailbox) can take the account back within those 7 days, which is the price of the link. The owner then gets a notice at the address the undo took off, and a Google link the account had when the change went through stays, so an owner who signs in with Google keeps a way in; an owner without one has no way to undo the undo. Undo links also go to old addresses nobody ever proved, so for 7 days after a move such an address has the trust of a reset; limiting undo links to proven addresses would take the protection away from most older accounts.
- The undo keeps the Google link the account had when the change went through. Whoever made the change with the password could have linked a Google account of their own first (on an account with no link, or after removing the owner's while password sign-in is on), and the undo then keeps theirs. While password sign-in is on, the reset link the undo sends removes it when the owner uses it (it is unproven), but they can sign in with Google until then. While password sign-in is off, removing Google is refused, so they cannot have replaced the owner's link; on an account that had none, the undo keeps any link it has, since it would have no other way in, and a link of theirs stays until a database edit.
- The account page's per-user limit counts failed proofs only, and a right proof always goes through, so a stolen session cannot keep the owner from changing the password. It no longer caps how many passwords a stolen session can try from many addresses: the per-IP limits do, as at login. With password sign-in on, login is the easier place to guess anyway.
- Anyone with an account can still have the site mail a confirmation link to an address they choose: at most 3 a day to one address, whoever asks, and 15 an hour and 30 a day of email change emails in all. The email names the account and says it can be ignored. A few throwaway accounts can use up those overall caps, which pauses email changes for everyone for the hour or the day, but no longer reset emails.
- A name freed by a rename is held for 90 days. A GM who invites a player to rejoin by a name freed longer ago than that can reach whoever took it since; the invite still skips the GM's approval.
- One account holds at most 5 freed names, but someone who makes many accounts can hold 5 names with each; register's own limits (5 a minute per client) are what slow that. The 3 renames a day are counted in memory, so a restart clears them; the 5 held names are counted in the database. Two renames of one account at the same moment can each pass the check and hold one name more.
- Usernames from before the stricter rule may use letters of other scripts. They are compared with new names by case and spaces only, so an old "mіra" with a Cyrillic і and a new "mira" can both exist.
- `has_password` is NULL for accounts from before it was recorded, until their password works once (a password login). The account page then offers a Google proof first to an account linked to Google, and it lets such an account start "Remove Google sign-in"; the server refuses that without the right password, but cannot say "Set a password first".
- Two reset requests for one account at the same moment can leave two working links. Each still works once, and both end when either is used.
- Someone who keeps asking for resets for another person's address uses up its 3 an hour, so that person waits for the hour too. Someone who asks for resets for many addresses with accounts can use up the overall caps (20 an hour, 50 a day), and real reset emails wait until the hour or the day is over; the ERROR log line shows when that happens, but nothing alerts anyone yet. The per-IP, per-address and overall counts are in memory and reset when the server restarts.
- A token cannot be revoked on its own before it expires. Replacing the user's password hash revokes all of that user's tokens (the password stamp), changing `SECRET_KEY` logs everyone out, and deleting a user revokes theirs, because the user lookup fails.
- An open WebSocket keeps working after its token expires (30 days); the expiry is only checked when the socket connects. A changed password does end it (Ending sockets when the password changes, under WebSocket).
- The token sits in localStorage, so a script injected into the page could read it. The app renders no user HTML as markup today.
- `action_rejected` and `portrait_update` are new server-to-client types; WEBSOCKET.md section 5 lists the types from before this stage.
