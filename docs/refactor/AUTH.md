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

## Behavior that changed because of these rules

- Campaign create without `user_id` makes the caller the GM (it used to create a campaign with no GM). An unknown `user_id` is 403 (it was a 500 from the foreign key).
- Forge without `user_id` gives the character to the caller (it used to fall back to user 1, admin). `user_id` 0 or an unknown id is 403.
- Approve and reject of an unknown character are 404 (they were 400).
- Roster, notebook list and circle creation state for an unknown campaign are 404 (they were 200 with empty data, or 500).
- Notebook writes with an unknown character or campaign are 404 (they were 500).
- Rejoin without an invite or a dead character in that campaign is 403 (it always succeeded).
- `GET /api/investigators` lists only the caller's characters (it listed everyone's).
