# WebSocket channel map

This is a read-only survey of the live game channel on branch `beta` at commit `2355d1b`. Nothing was executed to produce it. Line numbers refer to `backend/main.py` unless another file is named. The goal is to give the refactor a fixed description of current behavior, including the parts that are bugs, so characterization tests can pin it and later changes are deliberate.

Sources read: `backend/main.py`, `backend/engine.py`, `backend/models.py`, `frontend/src/store/gameStore.js`, and the components that open or write to the socket (`AppRouter.jsx`, `CampaignSelector.jsx`, `pc/MainDeskView.jsx`, `pc/InvestigatorDossier.jsx`, `pc/DiceVault.jsx`, `pc/AbilityMarkOffer.jsx`, `pc/CircleView.jsx`, `gm/OperationsPanel.jsx`, `gm/SceneManager.jsx`, `gm/CirclePage.jsx`, `gm/GMCharacterSheet.jsx`).

## 1. Endpoint and connection lifecycle

- Route: `@app.websocket("/ws/{game_id}")`, function `websocket_endpoint`, main.py:1456-2525. It is the only WebSocket route.
- `game_id` is a free string from the URL path. The frontend builds `ws(s)://<host>/ws/<gameId>` in `gameStore.connect` (gameStore.js:94). The host is `VITE_API_URL` without its scheme, or the page host. The Vite dev server proxies `/ws` to `127.0.0.1:8000`.

Setup, in order:

1. `manager.connect(game_id, websocket)` accepts the socket and closes (code 1001) every socket already registered under the same `game_id`.
2. One `SessionLocal()` is opened and kept for the whole life of the socket. It is closed in the `finally` block.
3. If `game_id` parses as an integer, the `Character` with that id is loaded. There is no ownership check. Otherwise `character` is None and the socket is treated as a GM socket.
4. Campaign: the character's campaign if it has one, else the campaign whose `campaign_code == game_id`.
5. Circle: `get_or_create_campaign_circle(campaign.id)` (this inserts an "Unnamed Circle" if the campaign has none, so connecting can write to the database). Without a campaign it uses circle id 1, and creates circle id 1 if it is missing.
6. `camp_code = campaign.campaign_code` (or `game_id` when there is no campaign) and `camp_id = campaign.id` (or None). These are resolved once and never refreshed for the life of the socket.
7. The server sends `character_update` (only when a character was resolved) and then `circle_update`, to this socket only.

Receive loop (main.py:1496-2516):

- `receive_text()`, then `json.loads`. Text that is not JSON is skipped.
- `type` and `payload` (default `{}`) are read from the message. Unknown types are ignored with no reply.
- Target character for the message: `payload.character_id` when present, otherwise `int(game_id)` when the path is numeric, otherwise None. The `character` variable is reassigned on every message. Any message carrying a `character_id` therefore acts on that character, whichever socket sent it.
- Only the `roll` handler has its own try/except. An exception in any other handler (wrong type in a field, KeyError, NameError, a database error on commit) leaves the loop, is logged as "WebSocket fatal error", removes the socket from the manager and ends the connection. A JSON message that is not an object (a list, a number) or a payload that is not an object also ends the connection, because `.get` is called on it.
- `WebSocketDisconnect` calls `manager.disconnect`. The session is closed in `finally`.

## 2. ConnectionManager (in-memory state)

main.py:1285-1350. One module-level instance, `manager`.

- `active_connections: dict[str, list[WebSocket]]`, keyed by channel string. Two kinds of key share one namespace: `str(character.id)` for player sockets and the campaign code for GM sockets. The literal `gm` also appears (see section 3).
- `connect`: accept, close all old sockets on that key with code 1001, then replace the list with `[websocket]`. In practice there is one socket per key and the last connection wins.
- `disconnect`: removes the socket from its list. Empty lists stay in the dict.
- `broadcast(key, message)`: sends to each socket on the key, one awaited send at a time. Sockets that raise are dropped from the list.
- `broadcast_all`: defined, never called.
- `broadcast_campaign(code, campaign_id, message, db)`: without a `campaign_id` it is the same as `broadcast(code)`. Otherwise it queries the campaign's characters with status `active` (one query per call) and sends to the campaign code key plus `str(id)` of each of them. Pending, retired and unaffiliated characters are not included. Dead characters keep status `active` and are included.
- There are no locks, no send timeouts, no message size or rate limits. The state lives in one process. A second uvicorn worker or a second instance would hold a separate map and broadcasts would miss half the clients.

## 3. How a client identifies itself today

- The socket has no authentication. The path segment is the whole identity.
  - Numeric path: the socket is that character. Nothing checks that the caller owns it.
  - Any other path: the socket is the GM channel of the campaign with that code. Nothing checks that the caller is the campaign's `gm_user_id`.
- `POST /api/auth/login` (main.py:950) checks the password and returns `{role, name, userId, campaignCode, campaignId, pendingRejoinInvite}`. No token and no cookie are issued. `SECRET_KEY`, `python-jose`, `OAuth2PasswordBearer` and `ACCESS_TOKEN_EXPIRE_MINUTES` are configured but nothing issues or verifies a token. The frontend keeps `accessSession` in localStorage under `candela-vtt-storage`.
- GM privilege for `gm_*` messages, `refill_resources` and the GM branch of `update_circle` is `payload.role == "GM"`. The client fills this from `accessSession.role`; `gmResetCharacter` hard-codes `'GM'`.
- The acting character (`character_id`), the chat sender name, notebook author fields and relationship `from_character_id` are all client-supplied.
- Ids and codes are easy to find: character ids are sequential, `GET /api/investigators` lists every character, and `GET /api/users/{id}/campaigns` returns campaign codes for any user id. Anyone who can reach the server can open the socket of any player or GM, read its private traffic, and disconnect the real user through the 1001 kick.
- Campaign codes may be all digits (`^[a-zA-Z0-9\-_]{3,32}$`). A GM socket on `/ws/123` is resolved as character 123 if that character exists, and the key `"123"` collides with that character's channel.
- `OperationsPanel` falls back to `connect('gm')` when it has no campaign code. That socket gets circle 1 and `camp_id` None.

Frontend callers of `connect`: `CampaignSelector.enterAsPlayer` and `handleLastPlayed` (character id), `CampaignSelector.enterAsGM` and `handleLastPlayed` (campaign code), `MainDeskView` on mount when there is no socket (character id), `AppRouter` after a rejoin (character id), `OperationsPanel` on mount when there is no socket (campaign code or `gm`).

## 4. Incoming messages

### 4.1 Summary

"Gate today" is the only server check before the handler runs. "Should be allowed" is the proposed rule for the authenticated version. "Owner" means the logged-in user whose `user_id` owns the character. "GM" means the logged-in user who is `gm_user_id` of the campaign the target belongs to.

| Type | Line | Frontend sender | Gate today | Should be allowed |
|---|---|---|---|---|
| `gm_update_tension` | 1522 | store `gmAdjustTension`, never called | `role == "GM"` and a character resolved | GM of the character's campaign |
| `gm_update_circle` | 1532 | `SceneManager` (tension clock, scene text) | `role == "GM"` | GM of the circle's campaign |
| `gm_transition_scene` | 1545 | none | `role == "GM"` | GM of the campaign (or remove) |
| `roll` | 1557 | `rollAction` | none | Owner for a character roll; GM for a Lightkeeper roll |
| `update_drive` | 1698 | `updateDrive` | character resolved | Owner (GM optional), value within 0..max |
| `resolve_gilded` | 1706 | `resolveGildedChoice` | character resolved | Owner, only to answer a pending gilded roll, once |
| `use_post_roll_ability` | 1731 | `usePostRollAbility` | character resolved, ability on sheet | Owner, once, right after a qualifying roll |
| `update_pen_font` | 1757 | `updatePenFont` | character resolved, font whitelist | Owner |
| `take_mark` | 1764 | `takeMark` | character resolved | Owner (self, as the UI does today) or GM |
| `resolve_ability_mark` | 1887 | `resolveAbilityMark` | character resolved, ability on sheet | Owner, only to answer a pending offer |
| `intercept_mark` | 1917 | `interceptMark` | character resolved, ability on sheet | Owner of the interceptor, answering a pending intercept offer for a target in the same campaign |
| `apply_scar` | 1985 | `applyScar` | character resolved | Owner, only after a `trigger_scar` for that character |
| `revive_character` | 2006 | `reviveCharacter` | character resolved | Owner or GM, not for a dead character |
| `burn_resistance` | 2023 | `burnResistance` | character resolved | Owner |
| `update_gear` | 2040 | `InvestigatorDossier.sendGearUpdate` (direct send) | character resolved | Owner (GM optional) |
| `gm_toggle_resource_edit` | 2056 | `gmToggleResourceEdit` | `role == "GM"` | GM |
| `gm_toggle_reports` | 2065 | `gmToggleReports` | `role == "GM"` | GM |
| `submit_assignment_report` | 2074 | `submitAssignmentReport` | `character_id` present | Owner of `character_id`, active member, while `reports_open` |
| `gm_advance_circle` | 2097 | `gmAdvanceCircle` | `role == "GM"` | GM |
| `refill_resources` | 2122 | `refillResources` | `role == "GM"` | GM |
| `gm_end_assignment` | 2134 | `SceneManager.endAssignment` (direct send) | `role == "GM"` | GM |
| `gm_reset_character` | 2160 | `gmResetCharacter` | `role == "GM"` | GM |
| `spend_resource` | 2189 | `spendCircleResource` | character resolved, GM toggle on, under 2 spends | Owner, active member, while GM toggle is on |
| `apply_advancement` | 2236 | `applyAdvancement` | character resolved | Owner, only when an advancement is pending |
| `update_circle` | 2258 | `updateCircle` (GM screens only) | none (non-GM may not raise resources) | GM |
| `circle_creation_vote` | 2284 | `submitCircleVote` | ids present | Owner of `character_id`, active member, before finalize |
| `circle_backstory_update` | 2322 | `updateBackstoryAnswer` | `question_key` present | Active members (and GM) before finalize, reserved keys blocked |
| `circle_personal_answer` | 2343 | `updatePersonalAnswer` | `character_id` present | Owner of `character_id` |
| `circle_relationship_propose` | 2359 | `proposeRelationship` | ids and type present | Owner of `from_character_id`, both in the same circle |
| `circle_relationship_respond` | 2390 | `respondToRelationship` | ids present | Owner of the other party (the character that did not act last) |
| `chat_message` | 2416 | `sendChat` | non-empty text | Any member of the campaign; `@Environment` GM only; sender name derived by the server |
| `add_notebook_entry` | 2472 | none (UI uses REST) | `campaign_id` present | Member of that campaign; GM for `gm_only` and Lightkeeper entries (or remove) |

"Character resolved" means the `character` lookup found a row. On a player socket that is always true. On a GM socket it is only true when the payload carries a `character_id`.

### 4.2 GM messages

**`gm_update_tension`** (1522). Fields: `role`, `mark_type`, `value`, optional `character_id`. Sets `{mark_type}_marks = value` on the character with no validation of name, type or range. Sends `character_update` to the sender's key only, so the player never sees it live. The store action `gmAdjustTension` exists but no component calls it, and it sends no `character_id`, so on a GM socket it would do nothing.

**`gm_update_circle`** (1532). Fields: `role`, `circle_id` (default 1), any of `stitch`, `refresh`, `train`, `guard_patrol`, `miasma_bleed`, `location`, `atmosphere`, `tension_clock`, `tension_label`. Loads the circle by id with no campaign scoping and sets the given fields. Sends `circle_update` to the connection's campaign. `SceneManager` sends this from the tension clock and from "broadcast scene" with `circle_id: 1` written literally, so every campaign edits circle 1 and then pushes circle 1 to its own players (see D2).

**`gm_transition_scene`** (1545). Fields: `role`, `scene_name`, `description`. Sends `scene_transition` to the sender's key only. Nothing in the UI sends it, and the store handler only logs to the console.

**`gm_toggle_resource_edit`** (2056) and **`gm_toggle_reports`** (2065). Fields: `role`, `circle_id` (default: the circle loaded at connect, else 1). `resolve_circle` looks the circle up inside the connection's campaign and falls back to any circle with that id. Flips `resources_editable` or `reports_open`. Sends `circle_update` to the campaign.

**`gm_advance_circle`** (2097). Fields: `role`, `circle_id`, `circle_ability`. Appends the ability text (newline separated) and sets `illumination = max(0, illumination - 12)`. It does not check that the track was full. Sends `activity_log` ("has advanced") and `circle_advanced {circle, campaign_id}` to the campaign. Players' clients open the advancement modal on `circle_advanced`.

**`refill_resources`** (2122). Fields: `role`, `circle_id`. Sets stitch, refresh and train to 1 plus the number of active members. Sends `circle_update` to the campaign.

**`gm_end_assignment`** (2134). Fields: `role`, `circle_id` (the UI also sends `campaign_id`, which is ignored). Clears `location` and `atmosphere`, and for every active character in `camp_id` resets `ability_uses`, `resources_spent_assignment` and `train_bonus`. Sends `circle_update` to the campaign, `character_update` to each character's key, and an `activity_log` line.

**`gm_reset_character`** (2160). Fields: `role`, `character_id`. Scoped to `camp_id`. Restores all three drives to max, sets resistance spent to 0, clears `ability_uses`. Sends `character_update` to that character's key and `activity_log` to the campaign.

**`update_circle`** (2258). Fields: `circle_id`, `role`, any of `name`, `stitch`, `refresh`, `train`, `guard_patrol`, `miasma_bleed`, `location`, `atmosphere`, `chapter_house_location`, `circle_ability`, `illumination`, `tension_clock`, `tension_label`. A non-GM may not raise stitch, refresh or train, but may lower them and may set every other field. Values are not type checked. For a non-GM, comparing a non-number with the current resource value raises; for anyone, a wrong type can fail at commit on Postgres. Either way the connection ends. Sends `circle_update` to the campaign, plus an `activity_log` "milestone reached" line when illumination rises to 3, 6 or 9. In the UI only GM code paths send it (`CirclePage`, and the GM branch inside `CircleView`).

### 4.3 Dice and roll messages

**`roll`** (1557). Fields: `action` (required), `drive_spent` (int, default 0), `is_secret` (bool), `ability_mods` (list of ability names), optional `character_id`.

With a character:

1. Drive category from the action: move, strike, control use Nerve; hide, sneak, sway use Cunning; anything else uses Intuition.
2. For each name in `ability_mods` that is in `ABILITY_MOD_DEFS`, equals the character's `role_ability` or `specialty_ability` exactly, and applies to this action: drive substitution, extra dice, extra gild, Back Against the Wall adds one Brain mark (capped at 3, never incapacitates), Sharpshooter costs one Nerve.
3. A pending Train bonus adds one die and is cleared.
4. `{category}_current -= drive_spent` (floor 0). Pool is `min(6, rating + drive_spent)`.
5. Commit. This happens before the dice are rolled.

Without a character (GM socket): a "Lightkeeper" roll. Pool is `drive_spent`, no gild.

Then `roll_dice` runs (section 6) and `roll_result {character_id, action, roll, character}` goes to the sender's key only. The GM does not see a player's dice, only the log line. If no gilded choice is needed and the roll is not secret: a single gilded die refreshes one drive, the Well-Read ability refunds spent Intuition on a failure, `character_update` goes to the sender if anything changed, and `activity_log` (log_type `roll`) goes to the campaign. If a gilded choice is needed nothing else happens until the client sends `resolve_gilded`. A secret roll writes no log, and also skips the gilded refresh and the Well-Read refund (D7). On any exception the session is rolled back and `roll_error {message: str(exception)}` goes to the sender.

Validation gaps: `action` is not checked against the nine actions, so `getattr` reads any attribute. `drive_spent` is not checked against the current drive or for sign. A negative value raises the drive above its max, and that change is committed before the roll; if the pool ends up negative, `roll_dice` fails with `max()` of an empty list and the client gets `roll_error`, but the drive change stays.

`ABILITY_MOD_DEFS` and `MAX_ABILITY_USES` are rebuilt inside the handler on every roll. No ability in `ABILITY_MOD_DEFS` is in `MAX_ABILITY_USES`, so the use counter in this handler never counts anything.

**`resolve_gilded`** (1706). Fields: `action`, `chosen_type` (`gilded` or anything else), `chosen_value`. If `gilded`, adds one to the action's drive (capped at max) and commits. The outcome is `calculate_outcome(chosen_value)` using the value the client sent, without the dice, so it can never be a critical. Sends `activity_log` to the campaign and `character_update` to the sender if the drive changed. The server keeps no record of the pending roll: a client can send this at any time, any number of times, with any value. A non-numeric `chosen_value` ends the connection.

**`burn_resistance`** (2023). Fields: `action`, `drive_key`. Calls `engine.burn_resistance`: if a resistance pip remains it spends it, commits, then rolls the action rating alone (no drive), gilded per the character. Sends `roll_result` to the sender and `activity_log` to the campaign. The log shows `?` as the result when a gilded choice is pending, and `resolve_gilded` then logs a second line. When no pips remain the error is dropped silently. Neither field is validated.

**`use_post_roll_ability`** (1731). Fields: `ability`, `drive` (for Learn from My Mistakes). The ability must equal `role_ability` or `specialty_ability`. Flourish: Cunning minus 2 (floor 0, no check that two are available); the log says the result was pushed up a tier, but the server does not change or record any result. Learn from My Mistakes: one drive plus 1 (capped). Bending Spoons: one Bleed mark (capped at 3, no incapacitation check). Sends `character_update` to the sender and `activity_log` to the campaign. Nothing ties it to a roll, so it can be repeated.

### 4.4 Character sheet messages

**`update_drive`** (1698). Fields: `pool`, `value`. Sets `{pool}_current = value`. Neither the name nor the value is validated (the UI clamps to 0..max before sending). Sends `character_update` to the sender.

**`update_pen_font`** (1757). Field: `pen_font`, which must be in `_SAFE_FONT_NAMES`. Sends `character_update` to the sender. Sent from `NotebookView`.

**`update_gear`** (2040). Fields: `gear` (list), `character_id` (the UI sends the dossier character's id). Replaces the gear list with no check on elements or size. Sends `character_update` to the sender and an `activity_log` line that joins the gear names. A non-string element makes the join raise after the commit, which ends the connection.

**`revive_character`** (2006). No fields. Sets `incapacitated` False and all three mark tracks to 0; `is_dead` is left as is. Sends `character_update` to the sender and `activity_log` to the campaign.

**`apply_scar`** (1985). Fields: `scar_text`, `shift_down`, `shift_up`, `skip_shifts` (the UI never sends `skip_shifts`). Appends the scar text, sets `scars_count`, and at 4 scars sets `is_dead` and `incapacitated`. If both shift names are attributes of the model, `shift_down` is above 0 and `shift_up` is below 3, moves one point from one to the other. The names are not limited to the nine actions; any numeric column qualifies, including `nerve_max` and the primary key `id`. Sends `character_update` to the sender. Nothing ties it to a pending `trigger_scar`.

**`apply_advancement`** (2236). Fields: `choice`, `detail`, `character_id`. The UI sends `accessSession.characterId`, which is never set anywhere, so `JSON.stringify` drops the key and the server falls back to the socket's own character. Calls `engine.apply_advancement` (section 6). Nothing checks that an advancement was earned. Sends `character_update` to the sender and `activity_log` to the campaign.

### 4.5 Marks, offers and intercepts

**`take_mark`** (1764). Fields: `mark_type` (`body`, `brain` or `bleed`, not validated), `is_from_enemy` (never sent by the UI), optional `character_id`.

1. Soak offers. Brain: Compartmentalization (needs Nerve resistance), Steel Mind (needs Intuition resistance), Back Against the Wall (no cost). Body: In the Trenches (needs Cunning resistance). The first three each have one use per assignment. If any apply, the server sends `ability_mark_offer {ability: first option, options, mark_type, character_id, action: "soak"}` to the sender and stops. The mark is not applied. Accepting sends `resolve_ability_mark`, which soaks it. Declining, or the 15 second auto-dismiss in `AbilityMarkOffer`, sends nothing, so the mark is never applied (D5).
2. Death Defy: if `is_from_enemy` and unused, sends an `escape` offer and stops. The UI never sets `is_from_enemy`, so this offer cannot appear today.
3. New mark value is the current value plus 1. At 4 with Endurance, the handler rolls one die per remaining Nerve resistance pip with `secrets.randbelow`, but `secrets` is not imported in main.py. This raises NameError, nothing is committed, and the player's connection ends (D1).
4. At 4 or more: that track resets to 0, `incapacitated` is set, commit, `trigger_scar {character_id, mark_type, character}` to the sender and `activity_log` (log_type `danger`) to the campaign.
5. Otherwise: the mark is set, commit, `character_update` to the sender, a `Let Them In` info offer on Bleed marks, an `Adrenaline Rush` drive refresh offer, and for each other active character in the same campaign whose role or specialty ability is exactly Behind Me (with Nerve at least 1) or Premonitions (with Intuition resistance left), `ability_intercept_offer {ability, mark_type, character_id: target, character_name, action}` to that character's key.

**`resolve_ability_mark`** (1887). Fields: `ability`, `choice`.

- Adrenaline Rush with `choice` in nerve, cunning or intuition: that drive plus 1 (capped).
- Compartmentalization, Steel Mind, In the Trenches: one resistance pip spent on the mapped drive (no check that one remains at this point) and one use recorded. The mark is soaked.
- Death Defy: use recorded.
- Back Against the Wall: no branch, nothing happens. The frontend also has no offer config for it, so the offer never renders (D5).

Sends `character_update` to the sender and `activity_log` to the campaign. There is no record of a pending offer, so the message can be replayed; Adrenaline Rush gives unlimited drive this way.

**`intercept_mark`** (1917). Fields: `ability`, `target_character_id`, `mark_type`.

- Behind Me (needs Nerve at least 1): interceptor Nerve minus 1; target's `{mark_type}_marks` minus 1 (floor 0), with the target looked up by id only, in any campaign; commit; `character_update` to the target's key; `activity_log` to the campaign. Then the mark is applied to the interceptor: a soak offer (without `options`) to the sender, or incapacitation (`trigger_scar` and a danger log), or the mark plus `character_update` and an Adrenaline Rush offer. Endurance, Death Defy, Let Them In and further intercept offers are not part of this path, unlike `take_mark`.
- Premonitions: interceptor Intuition resistance plus 1, `character_update` and `activity_log`. The target's mark is not removed (D6).

Nothing checks that an offer was made, that the target took a mark, or that the target is in the same campaign.

### 4.6 Circle resources, reports and circle creation

**`spend_resource`** (2189). Fields: `resource_type` (stitch, refresh or train), `circle_id` (ignored; the circle loaded at connect is used). Requires a character, `resources_editable` on that circle, fewer than 2 spends this assignment, and a resource count above 0. Stitch clears all marks. Refresh restores drives, resistance and ability uses. Train sets `train_bonus`. The circle count goes down by one and the character's spend count up by one. Sends `character_update` to the sender, and `circle_update` and `activity_log` to the campaign. Rejections are silent.

**`submit_assignment_report`** (2074). Fields: `circle_id`, `character_id` (required), `responses` (object). There is no character, ownership or `reports_open` check. Writes `backstory_answers.reports[str(character_id)] = responses`. Sends `assignment_report_submitted {character_id, character_name, responses}` to the whole campaign, so every player's client also receives every report.

**`circle_creation_vote`** (2284). Fields: `circle_id`, `character_id`, `vote_type`, `value`. For `name_suggest`, inserts if the character has fewer than 5 and this value is new. Other types keep one vote per character and type. Sends `vote_update {vote_type, votes}` to the campaign. An unknown `vote_type` is stored and then `updated_votes[vote_type]` raises KeyError, ending the connection. There is no check on finalization, ownership or circle membership.

**`circle_backstory_update`** (2322). Fields: `circle_id`, `question_key`, `answer`. Writes `backstory_answers[question_key] = answer`. Keys are free, and `reports` and `selected_question_key` live in the same JSON, so they can be overwritten. Sends `backstory_update {question_key, answer}` to the campaign. The UI also applies the change locally before sending.

**`circle_personal_answer`** (2343). Fields: `character_id`, `answer` (the UI also sends `circle_id`, ignored). Scoped to `camp_id` when the connection has one. Sends `personal_answer_update {character_id, answer}` to the campaign.

**`circle_relationship_propose`** (2359). Fields: `circle_id`, `from_character_id`, `to_character_id`, `rel_type`, `lore`. Upserts by (circle, from, to), sets status `proposed` and `last_actor_id = from`. Sends `relationship_update {relationships}` to the campaign. No ownership or membership check.

**`circle_relationship_respond`** (2390). Fields: `relationship_id`, `action` (`accept` or `counter`), `counter_type`, `counter_lore`. The actor is `int(game_id)`, which raises on a GM socket and ends the connection. `accept` sets status `accepted`. `counter` replaces `rel_type` and `lore` and sets status back to `proposed`. Nothing checks that the actor is a party to the relationship. Sends `relationship_update` to the campaign. The REST route `/circle/relationship/respond` handles `counter` differently (status `countered`, counter fields stored).

### 4.7 Chat and notebook

**`chat_message`** (2416). Fields: `sender_name`, `message`, `target` (`@Circle` by default, `@Environment`, or `@<character name>`). The campaign is re-resolved from the character or the code.

- `@Environment`: the text upper-cased, `activity_log` with log_type `environment` to the campaign. Any socket can send it; the UI only offers it on GM controls.
- `@Circle`: `"<sender_name>: <text>"`, `activity_log` with log_type `chat` and the sender's ink color, to the campaign.
- Anything else is a whisper. It goes to the sender's key, the campaign code key (so the GM sees every whisper), and the first character in the campaign whose name matches `ILIKE <target without @>`. `%` and `_` in the target act as wildcards.

There is no length limit. The sender name is whatever the client sends; the UI uses "Lightkeeper" for the GM and the character name for players.

**`add_notebook_entry`** (2472). Fields: `campaign_id` (any campaign), `title`, `content`, `author_name`, `author_type`, `pen_font`, `ink_color`, `character_id`, `entry_type`, `visibility`, `image_data`. Creates the entry in the given campaign with no membership check and no size limit on `image_data` (the REST upload caps files at 2 MB). With visibility `all` it sends `notebook_entry` and `activity_log` to the connection's campaign, which can differ from `campaign_id`. Otherwise `notebook_entry` goes to the sender only. The UI never sends this; it uses `POST /api/notebook/{id}/entries`.

## 5. Outgoing messages

All 23 types the server emits have a handler in `gameStore.js`, and the store handles no type the server never emits.

| Type | Emitted by | Recipients | Frontend effect |
|---|---|---|---|
| `character_update` | connect; most character handlers; `gm_end_assignment`; `gm_reset_character`; Behind Me target | Sender's key, or the affected character's key | Replaces `character` with the payload, no campaign check; triggers circle creation fetch; adds a "deceased" log line on first incapacitation |
| `circle_update` | connect; GM circle handlers; `update_circle`; `spend_resource`; `refill_resources`; `gm_end_assignment` | Campaign (connect: sender only) | Replaces `circle`, no campaign check |
| `roll_result` | `roll`, `burn_resistance` | Sender's key | Sets `lastRoll`, `character`, clears rolling state, sets `pendingGildedChoice` when needed |
| `roll_error` | `roll` exception | Sender's key | Clears `isRolling`; the message text is not shown |
| `trigger_scar` | `take_mark`, `intercept_mark` at 4 marks | Sender's key | Sets `character`, opens the scar modal |
| `scene_transition` | `gm_transition_scene` | Sender's key | console.log only |
| `activity_log` | many handlers; REST notebook POST | Campaign; whispers to sender, GM and target | Appends to `activityLog` (last 50) |
| `ability_mark_offer` | `take_mark`, `intercept_mark` | Sender's key | Sets `abilityMarkOffer` |
| `ability_intercept_offer` | `take_mark` | Other characters' keys | Sets `abilityMarkOffer` (same slot) |
| `assignment_report_submitted` | `submit_assignment_report` | Campaign | Stores in `circleCreation.reports` |
| `circle_advanced` | `gm_advance_circle` | Campaign | Campaign-checked; sets `circle` and opens the advancement modal |
| `vote_update` | `circle_creation_vote` | Campaign | Replaces one vote list |
| `backstory_update` | `circle_backstory_update` | Campaign | Sets one backstory answer |
| `personal_answer_update` | `circle_personal_answer` | Campaign | Updates own character and the investigator list |
| `relationship_update` | relationship propose and respond | Campaign | Replaces relationships |
| `notebook_entry` | WS `add_notebook_entry`; REST `POST /api/notebook/{id}/entries` (visibility `all`) | Campaign, or sender only | Appends if the id is new |
| `investigator_joined` | REST `POST /campaign/join` | Campaign (pending characters excluded), or the code key | Updates pending roster when the code matches |
| `investigator_approved` | REST approve, REST rejoin | Campaign | Campaign-checked; updates roster and own character |
| `investigator_rejected` | REST reject | Campaign, plus the rejected character's key | Resets that character to unaffiliated |
| `campaign_retired` | REST retire | Campaign (but see D3) | Campaign-checked; sends the user to HOME |
| `character_joined_mid_campaign` | REST rejoin | Campaign | Campaign-checked; opens the relationship intro |
| `gm_rejoin_invite` | REST invite-rejoin | Every character key owned by the invited user | Sets `rejoinInvite` |
| `roster_finalized` | REST finalize-roster | Campaign (but see D4) | Campaign-checked; sets `circle`, hides circle creation, unaffiliates rejected ids |

"Campaign" means `broadcast_campaign`: the campaign code key plus each active character's key.

## 6. Dice and game logic in engine.py

- `roll_dice(pool, is_gilded, extra_dice, extra_gild)`: gilded if either flag is set; effective pool is `min(6, pool + extra_dice)`.
  - 0 dice: roll two, keep the lower; the first die carries the gilded flag but no refresh or choice follows. The outcome uses the dice list, so two sixes on a zero roll count as a critical.
  - Gilded with 1 die: that die is the result and `auto_gilded_refresh` is True (the `roll` handler then refreshes one drive).
  - Gilded with 2 or more: no result; returns `needs_gilded_choice`, `gilded_idx` 0, `gilded_value`, `highest_regular_idx`, `highest_regular_value`. The client picks a die and sends `resolve_gilded`.
  - Otherwise: the highest die.
  - Negative pool: the dice list is empty and `max()` raises ValueError.
- `calculate_outcome(value, dice)`: two or more sixes is `critical_success`, a 6 is `full_success`, 4 or 5 is `mixed_success`, anything else is `failure`. `OUTCOME_LABELS` maps these to display text.
- `burn_resistance(db, character, action, drive_key)`: max pips are `drive_max // 3`; spends one and commits before rolling; rolls the action rating alone.
- `apply_advancement(db, character, choice, detail)`: `add_action` (+1 to one of the nine actions, max 3), `add_drive` (+2 to max and current; `detail` is only checked with `hasattr(character, detail + "_max")`), `new_ability` (free text appended to `specialty_ability` with `"; "`), `gild_action` (sets the gilded flag). Each branch commits.
- `calculate_resistance_max(max_drive)` is `max_drive // 3`. main.py repeats this arithmetic inline in several handlers.
- Randomness is `secrets.randbelow` inside engine.py. main.py also calls `secrets.randbelow` for Endurance without importing `secrets`.
- Ability checks everywhere compare names by exact equality with `role_ability` or `specialty_ability`. After a `new_ability` advancement `specialty_ability` becomes `"A; B"`, so both A and B stop matching in roll mods, soak offers, post-roll abilities and the intercept query (which uses SQL `IN`).
- The same rules are duplicated in the frontend: `ABILITY_ROLL_MODS` in `DiceVault.jsx` mirrors `ABILITY_MOD_DEFS`, and `ABILITY_OFFER_CONFIG` in `AbilityMarkOffer.jsx` lists the offer abilities.
- The campaign helpers in engine.py (`request_join_campaign`, `approve_investigator`, `reject_investigator`, `get_campaign_roster`, `create_notebook_entry`) are used by REST routes whose broadcasts appear in section 5.

## 7. Frontend cross-check

- `connect()` opens a new socket without closing the previous one. The old socket's `onmessage` keeps writing into the same store, so switching between a character and a GM view in one tab can mix messages from two channels. Only `logout()` closes the socket.
- There is no `onclose` handler and no reconnect. After a server restart or a 1001 kick the store keeps a closed socket, every sender silently does nothing (they all check `readyState === OPEN`), and `MainDeskView` and `OperationsPanel` do not reconnect because `socket` is not null. A page reload fixes it because `socket` is not persisted.
- `JSON.parse` in `onmessage` is not guarded.
- Only `investigator_approved`, `roster_finalized`, `circle_advanced`, `campaign_retired` and `character_joined_mid_campaign` are checked against the active campaign id; `investigator_joined` checks the campaign code. `character_update` and `circle_update` replace state unconditionally.
- Types the server handles but the UI never sends: `gm_update_tension` (store action with no caller), `gm_transition_scene`, `add_notebook_entry`.
- Fields the server reads but the UI never sends: `take_mark.is_from_enemy` (so the Death Defy offer is unreachable), `apply_scar.skip_shifts`, `roll.character_id`.
- Fields the UI sends that the server ignores: `spend_resource.circle_id`, `gm_end_assignment.campaign_id`, `circle_personal_answer.circle_id`. `apply_advancement.character_id` is always undefined.
- Two components bypass the store and call `socket.send` directly: `gm/SceneManager.jsx` (`gm_update_circle` twice with `circle_id: 1`, and `gm_end_assignment`) and `pc/InvestigatorDossier.jsx` (`update_gear`). A protocol change must cover them too.
- The GM character sheet (`GMCharacterSheet`) reads characters through `GET /api/investigators/{id}`, not the socket, because `character_update` normally never reaches the GM key (it would only if the GM socket itself sent a character message with a `character_id`).

## 8. Defects found while mapping

These are current behavior. The refactor should decide for each one whether to preserve it in a characterization test or fix it in a separate, named change.

- D1. Endurance crashes: main.py:1814 uses `secrets.randbelow` but main.py never imports `secrets`. A character with Endurance taking a fourth mark with Nerve resistance left gets NameError; nothing is committed and the socket closes.
- D2. Tension clock and scene text always edit circle 1: `SceneManager` sends `circle_id: 1` and `gm_update_circle` looks the circle up without campaign scoping, then pushes circle 1 to the GM's campaign. This only works for a campaign whose circle is id 1.
- D3. `campaign_retired` never reaches players: `retire_campaign` sets every character to `retired` and commits before `broadcast_campaign`, which only includes active characters. Only the GM key receives it.
- D4. `roster_finalized` does not reach the pending characters it releases, for the same reason (they are set to unaffiliated first).
- D5. Declining or ignoring a soak or Death Defy offer means the mark is never applied. A Back Against the Wall soak offer has no frontend config and no server branch, so when it is the first soak option a Brain mark can never land through `take_mark`.
- D6. The Premonitions intercept spends the interceptor's resistance but does not remove the target's mark.
- D7. Secret rolls skip the single-gilded-die drive refresh and the Well-Read refund.
- D8. `resolve_gilded` trusts the client's value and can be replayed; gilded-choice rolls can never be critical.
- D9. `circle_relationship_respond` raises on a GM socket (`int(game_id)`). REST and WebSocket handle `counter` differently.
- D10. Malformed input ends the connection: unknown `vote_type` (after the vote is committed), non-object payloads, non-numeric `chosen_value`, non-numeric resource values in `update_circle`, non-string gear elements (after commit).
- D11. The ability use counter inside `roll` never counts anything.
- D12. Exact-match ability checks stop working after a `new_ability` advancement.
- D13. An all-digit campaign code collides with the character id of the same number.
- D14. `apply_scar` shifts accept any column name, including `id`.
- D15. A negative `drive_spent` raises the drive above its max and is committed even when the roll then fails.

## 9. Risks for the refactor

- R1. No tests exist in the repo, and `websocket_endpoint` is one function of about 1,070 lines sharing mutable locals (`character`, `circle`, `camp_code`, `camp_id`, `db`). Write characterization tests first. Test notes: importing `main` has side effects (requires `SECRET_KEY`, runs `create_all`, `init_db` with ALTER TABLEs, seeds `admin`/`admin` and circle 1); `manager` is a module singleton that must be cleared between tests; dice need `engine.secrets.randbelow` patched; checking campaign broadcasts needs several sockets open at once.
- R2. The message types and payload shapes are a contract with `gameStore.js` and the two components that send directly. The frontend is a separate static build and persisted localStorage sessions survive deploys, so old clients will talk to a new server for a while. Keep names and shapes stable, or version the protocol and force a reload.
- R3. Who receives what is part of the behavior. Many updates go only to the sender's key (`character_update`, `roll_result`, `trigger_scar`, offers); others go to the campaign. Because the store applies `character_update` to `character` without checking the id, widening its audience would overwrite a player's sheet with another character's data.
- R4. Fallbacks the UI depends on: a missing `character_id` falls back to the socket's character (`apply_advancement` relies on this), a missing `circle_id` falls back to the connect-time circle or 1, and a GM socket with no character turns `roll` into a Lightkeeper roll.
- R5. One session per socket for hours. After any read the session holds an open transaction and a pooled connection while idle (QueuePool default is 5 plus 10 overflow), which shows up as "idle in transaction" on Postgres and can exhaust the pool with many open sockets. The identity map also returns stale values for rows other sockets changed until this session commits; `spend_resource` reads the connect-time circle, and arithmetic like "drive minus spent" can use a stale value and overwrite another socket's change. Moving to a session per message fixes this but changes timing.
- R6. Synchronous SQLAlchemy calls run inside async handlers and block the event loop. Broadcasts are awaited one by one without timeouts, so one slow client delays everyone. Moving database work to threads changes the ordering of broadcasts.
- R7. Single process only. More than one worker splits the channel map without any error. A restart drops every socket, and the frontend does not reconnect. Any pending state added to the server (offers, gilded choices) is lost on restart unless it is stored.
- R8. Last connection wins per key, with close code 1001 and no client handling. Multi-tab users and a GM who is also a player hit this. Allowing several sockets per key changes who receives sender-only messages.
- R9. Most handler errors end the connection, and several handlers commit before they fail. Adding a per-message try/except is an improvement but changes observable behavior, and tests should state what persists after an error.
- R10. Transaction boundaries are spread out: engine helpers commit inside (`burn_resistance` commits before rolling, `apply_advancement` commits), and `roll` commits the drive spend before rolling. One transaction per message changes what survives an error.
- R11. Rules are duplicated: `ABILITY_MOD_DEFS` inside the handler, two different soak maps in `take_mark` and `intercept_mark`, resistance arithmetic inline, and copies in `DiceVault.jsx` and `AbilityMarkOffer.jsx`. Moving them into engine.py has to keep the frontend copies in sync or serve them from the backend.
- R12. JSON columns hold several things: `Circle.backstory_answers` contains collaborative answers, `selected_question_key` and `reports`. `ability_uses`, `gear` and `scars_list` are JSON too. SQLAlchemy only notices reassignment; the current code reassigns fresh objects, and an in-place mutation introduced by a refactor would silently not persist.
- R13. Fixing D2 or D3 changes what players see. Decide per defect and record it.
- R14. Character ids and campaign codes share one key namespace. Changing the key format must also change the REST broadcasters in join, approve, reject, retire, rejoin, invite-rejoin, finalize-roster and the notebook POST.
- R15. `backend/candela_obscura.db` (about 1.2 MB SQLite) is tracked in git. Tests and seed scripts must not write to it, and it may contain user rows and password hashes.

## 10. Risks for adding real authentication

- A1. There is nothing to build on yet. Login returns no token and the configured JWT pieces are unused. Token issue (login and register), verification for both WebSocket and REST, expiry and renewal all have to be added.
- A2. Browsers cannot set an Authorization header on a WebSocket. The options are a token in the query string (it lands in reverse proxy access logs and needs scrubbing and a short lifetime), a short-lived one-time ticket fetched over authenticated REST, a cookie (needs an Origin check, because CORS does not apply to WebSockets and FastAPI does not check Origin), or an auth message as the first frame (every other message must be refused until it arrives, with a timeout).
- A3. The path is the identity today. With auth the server has to derive identity from the user: owned characters through `Character.user_id`, GM campaigns through `Campaign.gm_user_id`. A user can be GM in one campaign and a player in another and can own several characters. The login `role` is a single global value today, chosen by "has any non-retired GM campaign".
- A4. Legacy data will not fit ownership rules cleanly. `forge` falls back to `user_id` 1 (admin) when the client sends none, `create_campaign` leaves `gm_user_id` NULL when no `user_id` is passed, and circle 1 has `campaign_id` NULL. Count these rows on the beta copy before enforcing anything.
- A5. `init_db` seeds a user `admin` with password `admin` when it is missing. Under ownership rules that account owns the orphaned characters. Rotate or remove it before auth goes live, on beta and on live.
- A6. Authorization is per message, not per socket. Legitimate cross-character writes exist: `intercept_mark` changes the target, `take_mark` sends offers to other players, `gm_reset_character` and `gm_end_assignment` change other characters, and whispers always reach the GM. Rules need the campaign membership of both sides. Section 4.1 has the proposed matrix.
- A7. Identity alone does not stop a logged-in player from cheating. `resolve_gilded`, `resolve_ability_mark`, `intercept_mark`, `apply_scar`, `apply_advancement` and `use_post_roll_ability` all trust that the client is answering a real prompt. The server needs pending state for those prompts, kept in memory (lost on restart) or in the database (needs cleanup).
- A8. Client-asserted fields have to become server-derived: `role`, `character_id` for self actions, `sender_name`, notebook `author_*`, `ink_color` and `pen_font`, `from_character_id`, and the relationship actor. During the transition, keep accepting and ignoring them so cached frontends keep working, or version the protocol.
- A9. REST is just as open and carries GM powers: approve, reject, retire, finalize-roster, invite-rejoin, campaign create with any `user_id`, forge with any `user_id`, notebook reads with `role=GM` in the query (which returns `gm_only` entries), notebook update and delete by id, and user characters and campaigns by id. Locking only the socket leaves these open. `GET /api/investigators` lists every character.
- A10. Existing sessions in localStorage have no token. The frontend must detect a missing or expired token and send the user to login, otherwise it shows the desk with a refused socket. It also needs an `onclose` handler with distinct close codes (for example 4401 for unauthenticated and 4403 for forbidden) and a reconnect policy that does not loop.
- A11. Invalid or unauthorized messages are dropped silently today and the UI never learns. Rejections need an error message type and a handler in the store, otherwise features will look broken (for example `isRolling` only clears on `roll_result`, `roll_error` or the 8 second timer).
- A12. The key for a socket needs a decision once identities are real (user plus character, user plus campaign for a GM). Last-wins kicking across a user's own tabs is confusing; several sockets per key changes who receives sender-only messages.
- A13. Remove or authenticate the `gm` fallback channel, and either reject all-digit campaign codes or give keys a prefix.
- A14. Rate and size limits exist only on login (10 per minute) and register (5 per minute). The socket has no message size cap (`image_data` in `add_notebook_entry`, chat text, gear, report responses) and no rate limit. Dropping `add_notebook_entry` from the socket is reasonable since the UI uses REST.
- A15. Once auth lands, the beta and live protocols differ. Deploy the frontend and backend of each site together, and do not point a live frontend at the beta backend or the reverse.
