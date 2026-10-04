# Login tokens and access rules

Before this stage the server trusted whatever user id, character id or role the browser sent (ROUTES.md and WEBSOCKET.md describe that state). Now login hands out a signed token, and the server works out who is calling from it.

## Tokens

- `POST /api/auth/login` and `POST /api/auth/register` return every field they returned before, plus `token`.
- The token is a JWT signed with `SECRET_KEY`, algorithm HS256. Claims: `sub` (the user id as a string), `iat`, `exp` (30 days after `iat`). There is no refresh; after 30 days the user logs in again.
- Decoding accepts HS256 only and requires `sub`, `iat` and `exp`. A token that is malformed, expired, signed with another key or algorithm, or whose user no longer exists counts as no token.
- Code: `vtt/security.py` (issue and decode), `vtt/auth.py` (the `get_current_user` dependency and the access helpers).
- Changing `SECRET_KEY` logs everyone out.

## REST

Every route except login and register takes `Authorization: Bearer <token>`. Without a valid token the answer is 401 `{"detail": "Not authenticated."}` with `WWW-Authenticate: Bearer`, before any other check.

After that, ids the client sends are checked against the caller:

- An id that does not exist is 404. The routes keep their existing messages ("Campaign not found", "Character not found", "Investigator dossier not found.", "Entry not found", "Relationship not found"); a circle is "Circle not found".
- An id that exists but that the caller may not use is 403 `{"detail": "Not allowed."}`.
- Where the client still sends its own user id (`user_id` on campaign create and forge, the path of the two user routes), the server uses the token's user. A matching value is accepted and ignored; anything else is 403.

Terms: the **GM** of a campaign is `campaigns.gm_user_id`. A **member** is a user with an active or pending character in the campaign. The **owner** of a character is `characters.user_id`.

| Route | Who may call it |
|---|---|
| POST /campaign/create | any logged-in user; they become the GM |
| POST /campaign/join | owner of `character_id` |
| POST /campaign/approve/{character_id} | GM of the character's campaign (a character with no campaign has no GM: 403) |
| POST /campaign/reject/{character_id} | GM of the character's campaign |
| POST /campaign/{campaign_id}/retire | GM of that campaign |
| POST /campaign/rejoin | owner of `character_id`, and only when the user has a pending rejoin invite to that campaign or has a dead character in it (rejoin skips GM approval) |
| POST /campaign/{campaign_id}/invite-rejoin | GM of that campaign |
| GET /campaign/{campaign_id}/roster | GM or member |
| GET /campaign/{campaign_id}/circle-creation-state | GM or member (unknown campaign is now 404, not 500) |
| POST /circle/vote | owner of `character_id`; the character must be an active or pending member of the circle's campaign |
| POST /circle/relationship/propose | owner of `from_character_id`; both characters members of the circle's campaign |
| POST /circle/relationship/respond | owner of the relationship's to-character |
| POST /campaign/finalize-roster | GM of that campaign |
| GET /api/investigators | any logged-in user; lists only their own characters |
| GET /api/investigators/{id} | owner, or GM of the character's campaign |
| POST /api/investigators/forge | any logged-in user; the character is theirs |
| GET /api/notebook/{campaign_id}/entries | GM or member; `role=GM` only for the GM (403 otherwise); `character_id` must be the caller's own character |
| POST /api/notebook/{campaign_id}/entries | GM or member; `character_id` must be the caller's own; Lightkeeper entries (author_type gm, entry_type lightkeeper or visibility gm_only) only for the GM |
| PUT, DELETE /api/notebook/entries/{entry_id} | the author: the owner of the entry's character, or the campaign's GM for an entry without a character |
| POST /api/notebook/{campaign_id}/upload | as for adding an entry |
| GET /api/users/{user_id}/characters, /campaigns | only the caller's own user id |

Not changed: the request and response shapes, `author_name` and `author_type` on notebook entries (still client text, within the rule above), and the quirks in QUIRKS.md that are not about who may call a route.

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
- A GM channel may name a character only for `gm_update_tension`, `gm_reset_character`, `update_drive`, `take_mark`, `revive_character` and `update_gear`, and only a character of its own campaign. Any other type with a `character_id` is 403; so the GM cannot roll, vote, chat or answer as a player's character.
- Messages that need a character and have none are still ignored without a reply, as before.

| Type | Who may send it |
|---|---|
| gm_update_tension, gm_transition_scene, gm_reset_character | the GM |
| gm_update_circle | the GM, for the campaign's own circle (`circle_id` still defaults to 1, which belongs to no campaign, so the frontend now sends the real id) |
| gm_toggle_resource_edit, gm_toggle_reports, gm_advance_circle, refill_resources, gm_end_assignment, update_circle | the GM, for the campaign's own circle (default: the circle loaded at connect) |
| roll | the owner; on a GM channel without a character it is a Lightkeeper roll |
| update_drive, take_mark, revive_character, update_gear | the owner, or the GM for a member |
| resolve_gilded, use_post_roll_ability, update_pen_font, resolve_ability_mark, burn_resistance, apply_advancement, circle_personal_answer | the owner |
| apply_scar | the owner; `shift_down` and `shift_up` must be action ratings (move, strike, control, hide, sneak, sway, survey, read, sense), anything else is 403 (QUIRK D14) |
| intercept_mark | the owner of the interceptor; `target_character_id` must exist (404) and be in the interceptor's campaign |
| spend_resource | the owner, an active member, on their campaign's circle |
| submit_assignment_report, circle_creation_vote | the owner of `character_id`, an active member, on their campaign's circle |
| circle_backstory_update | an active member or the GM, on the campaign's circle |
| circle_relationship_propose | a player for their own `from_character_id`, to a fellow member, on their campaign's circle |
| circle_relationship_respond | the other party: the character that did not act last (for a proposal made over REST, which records no actor, the character it was made to); never the GM |
| chat_message | a member (active or pending) or the GM; `@Environment` only from the GM. The sender name is the character's name, or "Lightkeeper" for the GM; `sender_name` is ignored |
| add_notebook_entry | a member or the GM, into their own campaign only; Lightkeeper entries only from the GM |

"Member" here is read fresh from the database for every message, so a player who joins or is approved while connected is a member at once (the handlers themselves still use the campaign fixed at connect, see QUIRKS.md).

Not changed: game rules that are not about who is acting (pending offers, `reports_open`, finalize state, value bounds) are still the quirks listed in QUIRKS.md and WEBSOCKET.md section 8.

## Frontend

- The token is kept in the persisted session (`accessSession.token`, localStorage key `candela-vtt-storage`).
- Every API call goes through `apiFetch` in `utils/api.js`, which adds `Authorization: Bearer`. A 401 on a call that carried a token logs the user out (session cleared, back to the login screen).
- The WebSocket URL gets `?token=`. A 4401 close logs the user out the same way; `action_rejected` is logged to the console (and ends a pending roll).
- A session persisted before this change has no token; on load it is cleared and the login screen is shown.
- SceneManager sends the campaign's circle id instead of 1 (see gm_update_circle above).

## Behavior that changed because of these rules

- Campaign create without `user_id` makes the caller the GM (it used to create a campaign with no GM). An unknown `user_id` is 403 (it was a 500 from the foreign key).
- Forge without `user_id` gives the character to the caller (it used to fall back to user 1, admin). `user_id` 0 or an unknown id is 403.
- Approve and reject of an unknown character are 404 (they were 400).
- Roster, notebook list and circle creation state for an unknown campaign are 404 (they were 200 with empty data, or 500).
- Notebook writes with an unknown character or campaign are 404 (they were 500).
- Rejoin without an invite or a dead character in that campaign is 403 (it always succeeded).
- `GET /api/investigators` lists only the caller's characters (it listed everyone's).
- WebSocket: unknown channels (including `gm`) are closed with 4404 instead of opening on circle 1. A GM channel obeys GM messages without `role: "GM"` in the payload; a player channel is refused them whatever role it claims.
- WebSocket: an unaffiliated character can no longer chat (its whispers used to match names in every campaign) or intercept a mark for a character outside its campaign.
- WebSocket: chat sender names come from the server. The frontend already sent the same values.
- WebSocket: gm_update_circle with circle 1 (the old SceneManager value) is 403, and the GM circle messages no longer reach another campaign's circle (bug D2 and the resolve_circle fallback).
- WebSocket: circle_relationship_respond on a GM channel is 403 instead of ending the socket (bug D9).
- WebSocket: update_circle is GM only, so the non-GM "may lower but not raise resources" branch is gone, and a player's string resource no longer ends the socket.

## Known gaps

- A token cannot be revoked before it expires, except by changing `SECRET_KEY` (which logs everyone out). Deleting a user does revoke it, because the user lookup fails.
- An open WebSocket keeps working after its token expires; the token is only checked when the socket connects.
- The token sits in localStorage, so a script injected into the page could read it. The app renders no user HTML as markup today.
- `action_rejected` is a new server-to-client type; WEBSOCKET.md section 5 lists the types from before this stage.
