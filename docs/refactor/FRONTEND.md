# Frontend map and split plan

This document maps the Vite React frontend in `frontend/src` as it stands on the `beta` branch at commit `2355d1b`. It lists every HTTP call, every WebSocket message the client sends, what the browser stores, and how the user is identified after login. It then proposes how to split the eight largest files into smaller parts without any visual or behavioral change.

Everything here was found by reading the source. Nothing was run. Line numbers refer to commit `2355d1b`.

Since the login token stage, sections 2 and 5 are out of date on one point: every call now goes through `apiFetch` in `utils/api.js` with `Authorization: Bearer <token>`, the WebSocket URL carries `?token=`, and the server no longer trusts the ids the client sends. AUTH.md describes the change, including the frontend part.

Sign in with Google adds four calls on the login screen (`GET /api/auth/config`, `POST /api/auth/google`, `/api/auth/google/link` and `/api/auth/google/create`, through the helpers in `utils/api.js`). When the build has `VITE_GOOGLE_CLIENT_ID`, LoginScreen also loads `https://accounts.google.com/gsi/client`, and Google's button opens a popup from that host. AUTH.md, section "Login screen", has the details.

## 1. Layout

- Entry: `main.jsx` renders `App.jsx`, which renders `components/AppRouter.jsx`.
- Routing is not URL based. `AppRouter` switches on the persisted store field `stage`: `LOGIN` (LoginScreen), `HOME` (CampaignSelector), `CHARACTER_CREATION` (CharacterCreator wrapped in a header), `DESK` (pc/MainDeskView), `GM_DASH` (gm/OperationsPanel). Any other value falls back to LoginScreen.
- All state lives in one zustand store, `store/gameStore.js`.
- API base: `utils/api.js` exports `apiUrl(path)`, which prefixes `import.meta.env.VITE_API_URL` (empty string when unset, so requests go to the same origin). The Vite dev server proxies `/api`, `/campaign` and `/ws` to `127.0.0.1:8000`.
- Files that nothing imports: `components/pc/ActionModule.jsx`, `components/shared/ArchivesView.jsx`, `components/shared/PocketWatchClock.jsx`. Vite does not bundle them, so they can be left alone during the split.
- Store actions that no component calls: `gmAdjustTension`, `refreshCharacterStatus` (destructured in CampaignSelector but never called), `selectRollAction`, `clearPendingRoll`, `setPendingDriveSpend`, `toggleRollMod`. State fields that nothing reads: `pendingRoll`, `pendingRollMods`, `lastActivityLog`.

## 2. HTTP calls

No request sends an Authorization header, a token or a cookie that the app sets. All calls use `fetch` with default options.

| # | File:line | Method | Path | Ids sent | Called from |
|---|---|---|---|---|---|
| 1 | components/LoginScreen.jsx:20 | POST | `/api/auth/login` | none; body `{username, password}` | login form |
| 2 | components/LoginScreen.jsx:50 | POST | `/api/auth/register` | none; body `{username, email, password}` | register form |
| 3 | components/AppRouter.jsx:26 | POST | `/campaign/rejoin` | body `character_id` (new or chosen character), `campaign_code` (dead character's last campaign code or GM invite code) | `handleRejoinWithChar`, after forging in rejoin mode |
| 4 | components/AppRouter.jsx:109 | POST | `/api/investigators/forge` | body `user_id = accessSession.userId`, plus all character fields | CharacterCreator `onSubmit` |
| 5 | components/CampaignSelector.jsx:83 | POST | `/campaign/create?name=&code=&user_id=` | query `user_id = accessSession.userId` (empty string if missing) | GM pamphlet form (`handleGMEntry`); name falls back to the code |
| 6 | components/CampaignSelector.jsx:161 | POST | `/campaign/create?name=&code=&user_id=` | query `user_id = accessSession.userId` | Lightkeeper Ledger form in the book (`handleCreateCampaign`) |
| 7 | components/gm/GMCharacterSheet.jsx:27 | GET | `/api/investigators/{rosterItem.id}` | path character id | GM opens a roster card |
| 8 | components/gm/OperationsPanel.jsx:138 | POST | `/campaign/{activeCampaignId}/retire` | path campaign id (`lastPlayedCampaign.campaignId` or `accessSession.campaignId`) | Retire Campaign confirm |
| 9 | components/pc/DiceVault.jsx:267 | POST | `/campaign/{activeCampaignId}/invite-rejoin` | path campaign id (`lastPlayedCampaign.campaignId ?? accessSession.campaignId`); body `{username}` | GM "Invite Player to Rejoin" form |
| 10 | store/gameStore.js:366 | GET | `/api/users/{userId}/characters` | path user id | `fetchUserData` |
| 11 | store/gameStore.js:367 | GET | `/api/users/{userId}/campaigns` | path user id | `fetchUserData` (parallel with #10) |
| 12 | store/gameStore.js:630 | GET | `/campaign/{campaignId}/roster` | path campaign id | `fetchRoster` |
| 13 | store/gameStore.js:642 | POST | `/campaign/approve/{characterId}` | path character id (campaign id only used for the roster refetch) | `approveInvestigator` |
| 14 | store/gameStore.js:653 | POST | `/campaign/reject/{characterId}` | path character id | `rejectInvestigator` |
| 15 | store/gameStore.js:664 | POST | `/campaign/join?character_id=&code=&pen_font=` | query character id, campaign code, pen font | `joinCampaign` |
| 16 | store/gameStore.js:687 | GET | `/api/investigators/{characterId}` | path character id | `refreshCharacterStatus` (no callers) |
| 17 | store/gameStore.js:708 | GET | `/api/notebook/{campaignId}/entries?role=&character_id=` | path campaign id; query `role = accessSession.role` (or `player`), `character_id = character.id` (or empty) | `fetchNotebookEntries` |
| 18 | store/gameStore.js:719 | POST | `/api/notebook/{campaignId}/entries` | path campaign id; body `character_id`, `author_name`, `author_type`, `entry_type`, `visibility`, `title`, `content`, `image_data` | `submitNotebookEntry` |
| 19 | store/gameStore.js:747 | PUT | `/api/notebook/entries/{entryId}` | path entry id; body `{title, content}` | `updateNotebookEntry` |
| 20 | store/gameStore.js:768 | DELETE | `/api/notebook/entries/{entryId}` | path entry id | `deleteEphemeralNote` (used for private notes and for field entries) |
| 21 | store/gameStore.js:787 | POST | `/api/notebook/{campaignId}/upload` | path campaign id; multipart `file`, `title`, `content`, `author_name`, `author_type`, `entry_type`, `character_id` (only when set) | `uploadNotebookImage` |
| 22 | store/gameStore.js:828 | GET | `/campaign/{campaignId}/circle-creation-state` | path campaign id | `fetchCircleCreationState` |
| 23 | store/gameStore.js:915 | POST | `/campaign/finalize-roster` | body `{campaign_id, circle_id}` | `finalizeRoster` |

Callers of the store actions above:

- `fetchUserData(accessSession.userId)`: AppRouter.jsx:38, 43, 125, 129, 133; CampaignSelector.jsx:42 (mount effect), 89, 112, 120, 169, 188.
- `fetchRoster`: OperationsPanel.jsx:105 (active campaign id); TactileSidebar.jsx:119 (`character.campaign_id`); also inside approve and reject.
- `approveInvestigator`, `rejectInvestigator`: OperationsPanel.jsx:119, 124.
- `joinCampaign`: AppRouter.jsx:123 (forge then join); CampaignSelector.jsx:186 (join form in the book).
- `fetchNotebookEntries`: NotebookView.jsx:221, with `campaignId = accessSession.campaignId || character.campaign_id`.
- `submitNotebookEntry`: NotebookView.jsx:310 (field log), 332 (private note, `entry_type 'ephemeral'`, `visibility 'self'`), 351 (first Lightkeeper autosave, title `lk_main`, `entry_type 'lightkeeper'`, `visibility 'gm_only'`).
- `updateNotebookEntry`: NotebookView.jsx:349 (Lightkeeper autosave after the first save).
- `uploadNotebookImage`: NotebookView.jsx:290.
- `deleteEphemeralNote`: NotebookView.jsx:481, 605.
- `fetchCircleCreationState`: MainDeskView.jsx:45 (`character.campaign_id`); OperationsPanel.jsx:106; the `character_update` WebSocket handler (gameStore.js:130).
- `finalizeRoster`: OperationsPanel.jsx:130, with `circle.id || 1`.

Other outbound requests that are not API calls: Google Fonts (index.html, index.css, and `@import` inside the inline `<style>` blocks of CampaignSelector and CharacterCreator), texture images from `www.transparenttextures.com`, the login background images from `VITE_MAP_OFFICIAL` and `VITE_MAP_PUBLIC`, and local images under `/images/`.

## 3. WebSocket

### 3.1 Connection

`connect(gameId)` (gameStore.js:94) resets `activityLog`, `lastActivityLog`, `isRolling` and `pendingRoll`, builds `ws[s]://{host}/ws/{gameId}` (host from `VITE_API_URL` or `window.location.host`; `wss` when either is https), opens a new socket, attaches `onopen`, `onerror` and `onmessage`, then stores it in `socket`.

The path id is the only identity on the socket:

| Call site | gameId |
|---|---|
| CampaignSelector.jsx:126 `enterAsPlayer` | `char.id` |
| CampaignSelector.jsx:133 `enterAsGM` | `camp.campaign_code` |
| CampaignSelector.jsx:143 `handleLastPlayed` (player) | `lastPlayedCampaign.characterId` |
| CampaignSelector.jsx:150 `handleLastPlayed` (GM) | `lastPlayedCampaign.campaignCode` |
| AppRouter.jsx:35 after rejoin | `data.character.id` |
| MainDeskView.jsx:39 on mount, only if no socket | `character.id` |
| OperationsPanel.jsx:99 on mount, only if no socket | `activeCampaignCode`, or the literal `'gm'` |

The backend (`backend/main.py`, `@app.websocket("/ws/{game_id}")`) treats a numeric id as a character id and anything else as a campaign code. For each message it uses `payload.character_id` when present and falls back to the path id otherwise.

Behavior to keep in mind:

- `connect` never closes an existing socket. Entering a second campaign in the same tab leaves the first socket open, and its `onmessage` keeps writing into the store.
- `logout` closes the socket only when it is `OPEN`.
- There is no reconnect. The socket is not persisted, so after a reload MainDeskView or OperationsPanel opens a new one on mount.
- `rollAction` clears `isRolling` after 8 seconds if no `roll_result` or `roll_error` arrives.

### 3.2 Messages the client sends

Every store send is guarded by `socket.readyState === WebSocket.OPEN` and is silently dropped otherwise (`rollAction` and `gmAdjustTension` log a warning).

| Type | Payload | File:line | Called from |
|---|---|---|---|
| `roll` | `{action, drive_spent, is_secret, ability_mods}` | gameStore.js:401 | InvestigatorDossier.jsx:546 (action key, drive spend, mods); DiceVault.jsx:466 (GM cast: action `'Lightkeeper'`, `drive_spent` = dice count, secret flag); ActionModule.jsx:130 (unused file) |
| `burn_resistance` | `{action, drive_key}` | gameStore.js:421 | DiceVault.jsx:551 |
| `gm_reset_character` | `{character_id, role: 'GM'}` | gameStore.js:428 | GMCharacterSheet.jsx:19 (`rosterItem.id`) |
| `resolve_ability_mark` | `{ability, choice}` | gameStore.js:436 | AbilityMarkOffer.jsx:81, 85 |
| `use_post_roll_ability` | `{ability, ...params}` (params is `{}` or `{drive}`) | gameStore.js:443 | DiceVault.jsx:568, 581 |
| `intercept_mark` | `{ability, target_character_id, mark_type}` | gameStore.js:451 | AbilityMarkOffer.jsx:78 (`offer.character_id`) |
| `resolve_gilded` | `{action, chosen_type, chosen_value}` | gameStore.js:461 | DiceVault.jsx:426 |
| `update_drive` | `{pool, value}` | gameStore.js:471 | InvestigatorDossier.jsx:227; ActionModule.jsx:32 (unused) |
| `take_mark` | `{mark_type}` | gameStore.js:481 | InvestigatorDossier.jsx:612, 618 |
| `revive_character` | `{}` | gameStore.js:491 | InvestigatorDossier.jsx:651 |
| `apply_scar` | `{scar_text, shift_down, shift_up}` | gameStore.js:506 | ScarModal.jsx:70 |
| `chat_message` | `{sender_name, target, message}`; sender is `'Lightkeeper'` for GM, else character name | gameStore.js:521 | DiceVault.jsx:431 |
| `update_circle` | `{...updates, role}`; updates always include `circle_id` | gameStore.js:531 | CirclePage.jsx:168, 172, 201, 211, 226, 235, 309, 320; CircleView.jsx:410, 418 (GM editing resources) |
| `update_pen_font` | `{pen_font}` | gameStore.js:541 | NotebookView.jsx:726 |
| `spend_resource` | `{circle_id: circle.id, resource_type}` | gameStore.js:551 | CircleView.jsx:414 |
| `gm_toggle_resource_edit` | `{circle_id, role}` | gameStore.js:561 | CirclePage.jsx:443 |
| `gm_toggle_reports` | `{circle_id, role}` | gameStore.js:571 | CirclePage.jsx:363 |
| `submit_assignment_report` | `{circle_id, character_id, responses}` | gameStore.js:581 | CircleView.jsx:431 |
| `gm_advance_circle` | `{circle_id, circle_ability, role}` | gameStore.js:591 | CirclePage.jsx:177 |
| `refill_resources` | `{circle_id, role}` | gameStore.js:602 | CirclePage.jsx:437 |
| `apply_advancement` | `{character_id: accessSession.characterId, choice, detail}` | gameStore.js:615 | CircleView.jsx:149 (AdvancementModal, called once per pick) |
| `gm_update_tension` | `{mark_type, value, role}` | gameStore.js:807 | no callers |
| `circle_creation_vote` | `{circle_id, character_id, vote_type, value}` | gameStore.js:855 | CircleCreationPopup.jsx:298, 303, 306, 307, 308 |
| `circle_backstory_update` | `{circle_id, question_key, answer}` | gameStore.js:871 | CircleCreationPopup.jsx:310, 639 |
| `circle_personal_answer` | `{circle_id, character_id, answer}` | gameStore.js:886 | CircleCreationPopup.jsx:313 |
| `circle_relationship_propose` | `{circle_id, from_character_id, to_character_id, rel_type, lore}` | gameStore.js:896 | CircleCreationPopup.jsx:319; RelationshipIntroPopup.jsx:57 |
| `circle_relationship_respond` | `{relationship_id, action, counter_type, counter_lore}` | gameStore.js:906 | CircleCreationPopup.jsx:322, 327; CircleView.jsx:379, 385; RelationshipIntroPopup.jsx:60, 65 |
| `gm_update_circle` | `{role, circle_id: 1, tension_clock}` | gm/SceneManager.jsx:24 | TensionClock +/- buttons |
| `gm_update_circle` | `{role, circle_id: 1, location, atmosphere}` | gm/SceneManager.jsx:136 | SceneManager broadcast |
| `gm_end_assignment` | `{role, circle_id: circle.id \|\| 1, campaign_id: accessSession.campaignId}` | gm/SceneManager.jsx:145 | SceneManager end assignment |
| `update_gear` | `{character_id, gear}` | pc/InvestigatorDossier.jsx:232 | gear modal confirm |

Three components send on the socket directly instead of through a store action: SceneManager.jsx (3 sends) and InvestigatorDossier.jsx (1 send).

### 3.3 Messages the client handles

All in the `onmessage` if/else chain in gameStore.js:106-353. Only one branch runs per message.

`character_update`, `circle_update`, `roll_result`, `roll_error`, `trigger_scar`, `scene_transition` (console only), `notebook_entry` (deduplicated by id), `activity_log` (keeps the last 50), `vote_update`, `backstory_update`, `relationship_update`, `personal_answer_update`, `investigator_joined` (filtered by campaign code), `investigator_approved`, `investigator_rejected`, `roster_finalized`, `assignment_report_submitted`, `circle_advanced`, `campaign_retired`, `ability_mark_offer`, `ability_intercept_offer`, `gm_rejoin_invite`, `character_joined_mid_campaign`.

`investigator_approved`, `roster_finalized`, `circle_advanced`, `campaign_retired` and `character_joined_mid_campaign` are dropped when the payload carries a `campaign_id` that differs from `lastPlayedCampaign.campaignId ?? accessSession.campaignId`.

## 4. What the browser stores

- One `localStorage` key: `candela-vtt-storage`, written by zustand `persist` with its default JSON storage. The value is `{"state": {...}, "version": 0}`. No `version` or `migrate` is configured.
- Persisted fields (the `partialize` list): `accessSession`, `stage`, `character`, `characters`, `gmCampaigns`, `lastPlayedCampaign`, `circle`, `rejoinInvite`.
- Not persisted: `socket`, `circleCreation`, `notebookEntries`, `activityLog`, `campaignRoster`, `lastRoll`, roll and modal state.
- Nothing else uses `localStorage`, `sessionStorage`, cookies or IndexedDB.
- Rehydration from `localStorage` is synchronous at store creation, so the first render already has the persisted `stage` and session. A reload therefore returns to the same screen, and that screen reconnects the socket on mount.
- The persisted `character` can be a stub. `enterAsPlayer` stores `{id, name, status}`, and the player branch of `handleLastPlayed` stores `{id, name: campaignName}`. The full character arrives with the first `character_update` on the socket.
- The persisted `circle` can belong to a different campaign until the first `circle_update` arrives (see the comment at CircleCreationPopup.jsx:228).
- The beta site has its own origin, so its `localStorage` is separate from the live site.

## 5. How the user is identified after login

- Login and register return a plain object that becomes `accessSession`: `{role, name, userId, campaignCode, campaignId}` plus `pendingRejoinInvite` for players. `role` is `'GM'` when the user owns a non-retired campaign, otherwise `'PLAYER'`. There is no token, session cookie or expiry.
- `setAccessSession` stores it, moves to `HOME`, and copies `pendingRejoinInvite` into `rejoinInvite`.
- After that the client names the user by id in each request: `userId` in the path for `/api/users/{id}/...`, `user_id` in the query for `/campaign/create`, `user_id` in the body for `/api/investigators/forge`.
- Characters and campaigns are named by id in paths, queries and bodies (section 2).
- On the socket, the path id is the identity (character id for players, campaign code for the GM). `payload.character_id`, when present, overrides it on the server for that message.
- GM privilege on the socket is asserted by the client: `role: accessSession.role` is included in GM payloads, and `gm_reset_character` hardcodes `role: 'GM'`.
- `setLastPlayed` rewrites `accessSession.role` (`GM` or `PLAYER`) and `accessSession.campaignId` on the client whenever the user enters a campaign.
- `accessSession.characterId` is read by `applyAdvancement` but is never set anywhere, so that payload's `character_id` is `undefined`, `JSON.stringify` drops it, and the server falls back to the socket's character.

Nothing in the frontend proves identity to the server. Any backend authentication work will need to touch every row in sections 2 and 3.2. This refactor does not change that; it is listed so the split keeps every call identical.

## 6. Existing quirks that the refactor must preserve

These are current behaviors. A "no behavior change" split keeps them. Each one can be fixed later in its own commit.

1. NotebookView.jsx:629 calls `setLkSpreadIdx(0)`, which is not defined. Clicking "Lightkeeper Resources" in the table of contents throws a ReferenceError after the two state updates before it, so the view still switches.
2. CampaignSelector.jsx:1068 reads `createError` from the render closure after `await handleCreateCampaign(e)`, so it sees the old value. On a first failure the form collapses and hides its own error message.
3. AdvancementModal (CircleView.jsx:156) returns `null` when `circleAdvancement` is cleared, and that check runs before the `submitted` check. `applyAdvancement` clears `circleAdvancement`, so the "Advancement Applied" screen never shows.
4. `apply_advancement` relies on the server fallback because `accessSession.characterId` is never set (section 5).
5. `gm_update_circle` from SceneManager and TensionClock always sends `circle_id: 1`.
6. `connect` leaks the previous socket (section 3.1).
7. The shared `SafeIcon` (shared/SafeIcon.jsx) ignores the `style` prop and renders nothing for unknown names. CharacterCreator has its own `SafeIcon` that applies `style` and renders a dashed placeholder. InvestigatorDossier's gear modal passes `style` to the shared one, where it is ignored. Merging the two components would change how those icons look.
8. `animate-sheetDrop` (CircleView, CirclePage) has no CSS definition and does nothing.
9. The player branch of `handleLastPlayed` stores the campaign name as the character's `name` until the socket sends the real character.
10. `fetchNotebookEntries` sends the persisted `character.id` even for a GM, so a GM who last played as a player sends that old character id.
11. `logout`'s reset of `circleCreation` omits `circleId`, so it becomes `undefined` instead of `null`.

## 7. Split plan for the eight largest files

General rules for every split:

- Move code; do not rewrite it. Class strings, inline styles, text, handler bodies and effect dependency arrays are copied verbatim.
- Keep the DOM tree identical. An extracted component returns exactly the element it replaces. A fragment is only used where the original had sibling elements at that spot. Parents with `space-y-*`, `last:*`, `group`, `perspective` or `preserve-3d` depend on their direct children, so those children must stay direct children.
- Keep state where it lives today unless the new owner has exactly the same mount lifetime. Many sections mount and unmount on tab or step changes, and moving state into them would reset drafts.
- Keep hook order and effect order the same within each component. When effects move into a custom hook, call the hook at the position the effects used to occupy.
- Keep the existing exports working (`AdvancementModal`, `RELATIONSHIP_DATA`, `RELATIONSHIP_TYPES`, `getAvailableRollMods`, default exports) by re-exporting from the old file.
- Do not change how a component subscribes to the store in the same commit as the split. Many components call `useGameStore()` with no selector and re-render on every store change; switching them to selectors is a separate change.

### 7.1 components/CharacterCreator.jsx (1428 lines)

Proposed parts (folder `components/characterCreator/`):

- `data.js`: `PEN_FONTS`, `ILLUMINATION_KEYS`, `SPECIALTY_GILDED`, `DRIVE_FLAVOR`, `ACTION_FLAVOR`, `STANDARD_GEAR`, `ROLES`, `ROLE_COLORS`, `CARD_IMAGES`, `GEAR_ICONS`, `ACTION_DRIVES`, `EMPTY_ACTIONS`, `EMPTY_DRIVES`, `CARD_W`, `CARD_H`, and `ALL_CARDS` (today `allCards`, rebuilt every render from the static `ROLES`).
- `CreatorIcon.jsx`: the local `SafeIcon` under a new name so it is never confused with the shared one (quirk 7).
- `Ornaments.jsx`: `DecoCorner`, `EdgeDiamond`.
- `PaperSheet.jsx`, `CardFace.jsx`.
- `useCharacterDraft.js`: every `useState` in the component plus the derived values and handlers (`flip`, `chooseSpecialty`, `toggleGear`, `getActionTotal`, `getDriveValue`, `adjustFreePoints`, `adjustDrive`, `toggleFreeGilded`, `handleImageUpload`, `handleComplete`, the step unlock flags, `canAdvance`).
- `StepNav.jsx`: the progress bar.
- `Step1ChoosePath.jsx`, with `CardDeck.jsx` (stack, flip animation, prev/next) and `AbilityColumn.jsx` (one clickable ability row, used for both columns).
- `Step2Profile.jsx`.
- `Step3Ratings.jsx`, with `FreeRaisePicker.jsx`, `ActionPointGrid.jsx`, `DrivePointPicker.jsx`, `Step3Checklist.jsx`.
- `Step4GearDossier.jsx`, with `GearOption.jsx` (variant prop for signature versus standard, since their classes and alpha values differ) and `DossierSummary.jsx`.
- `CreatorFooter.jsx`: Back and Advance buttons, the rejoin panel, Save and Join buttons.
- `JoinCampaignModal.jsx`, with its pen font dropdown.

Risks:

- All state must stay in the parent hook. Each step unmounts when the user changes step, and today the user can go back to step 1 and find the same card, the same `animState` and the same selections.
- `flip` reads `allCards`, which is declared later in the render body. Making it a module constant removes that ordering dependence without changing values.
- The `<style>` block with the `cardFlip*` keyframes and a Google Fonts `@import` is mounted only while step 1 is visible. Keep it inside `Step1ChoosePath` so it mounts and unmounts at the same times.
- The step 3 IIFE that builds `zeroStartKeys` and `actionKeyLabel` moves into the `Step3Ratings` body unchanged.
- The step 3 tooltip uses a Tailwind named group (`group/act` with `group-hover/act:block`). The group span and the tooltip span must stay parent and child.
- `StepNav` relies on `last:border-r-0`, so the step divs must remain siblings with no wrapper.
- `JoinCampaignModal` is rendered inside the footer block that only exists when `step > 1`. It is `position: fixed`, so moving it changes nothing visually, but it must keep the same mount condition.
- `globalPenStyle` is passed by AppRouter but unused. Keep accepting it.
- Global classes used here live in index.css (`paper-bg`, `paper-texture`, `tea-stain`, `fold-line`, `paper-ruled`, `action-pip`, `animate-fadeIn`, `custom-scrollbar`), so they are safe to use from any file.

### 7.2 components/CampaignSelector.jsx (1113 lines)

Proposed parts (folder `components/campaignSelector/`):

- `DeskStyles.jsx`: the inline `<style>` block (fonts, `.font-cinzel`, `.font-garamond`, `.font-mono-data`, `.font-playfair`, keyframes, `.desk-surface`, `.thick-book`, `.leather-texture`, `.embossed-*`, `.pamphlet`, `.newspaper-top-fold`, `.aged-paper-img`, `.roster-book`, `.book-page`, `.book-page-right`). Rendered at the same position, right after the rejoin banner.
- `RejoinInviteBanner.jsx`.
- `DeskBackdrop.jsx` (desk surface), `CandleCluster.jsx`, `CryptidSketches.jsx`, `ForegroundAtmosphere.jsx` (the overlay rendered after `main`; it must stay after `main`).
- `HubHeader.jsx`: Return to Login button and the header bar.
- `ActiveRegisterTome.jsx` (Tome I and its counts), `LastSessionTome.jsx` (unlocked and locked variants, including the brass lock SVG).
- `HalcyonHerald.jsx`: the static newspaper.
- `NewInvestigatorPamphlet.jsx`.
- `GMAccessPamphlet.jsx`: the flip card and its form. `showGMBack`, `gmCampaignName`, `gmCode`, `gmEntryError` and `isGmCreating` are only used here and can move inside, since the pamphlet lives as long as CampaignSelector.
- `RosterBook.jsx`: the overlay, with `PlayerRegistryPage.jsx` (active, pending and unaffiliated lists), `UnaffiliatedCharacterRow.jsx` (inline join form and pen dropdown), `LightkeeperLedgerPage.jsx` and `RegisterInvestigationForm.jsx`.
- `useCampaignEntry.js`: `enterAsPlayer`, `enterAsGM`, `handleLastPlayed`, `closeBook`, `handleOpenRoster`, `refreshBook`.
- `useAutoLastPlayed.js`: the effect that fills `lastPlayedCampaign` from the first active character or GM campaign.
- `api/campaigns.js` (shared): `createCampaign(name, code, userId)` building the same URL for both forms. Each form keeps its own validation and its own name fallback.

Risks:

- The book's state (`showBook`, `isClosingBook`, `isLoadingBook`, `joinForms`, the ledger form fields) must stay in CampaignSelector or the hook, because the tomes open the book and the entry functions close it.
- `enterAsPlayer` and `enterAsGM` call `closeBook` (a 420 ms timeout) and then `setStage`, which unmounts the selector. Keep the call order: set character, connect, set last played, close book, set stage.
- Effect order: the mount effect that calls `fetchUserData` runs before the auto last played effect. Call the hooks in that order.
- Quirk 2: copy the inline `onSubmit` of the ledger form unchanged.
- Every CSS class from `DeskStyles` is only defined while CampaignSelector is mounted. All the new parts render inside it, so this holds, but none of them can be reused on another screen without moving the styles.
- `.desk-surface::after` uses `z-index: -1`; `.thick-book::before` and `::after` draw the spine and pages; `.roster-book.closing` needs both classes on the same element. Keep wrapper elements and class strings exactly.
- The GM pamphlet's two faces must remain direct children of the rotating `preserve-3d` element.
- The newspaper advertisement's corner marks are `absolute` inside a box with no `relative`, so they position against the newspaper. Keep the nesting.
- The brass lock SVG defines `id="brassGrad"`. It renders once today; do not render `LastSessionTome` twice.

### 7.3 store/gameStore.js (957 lines)

Proposed parts, combined back into one `create(persist(...))`:

- `store/initialState.js`: initial values and `EMPTY_CIRCLE_CREATION`. Keep logout's own reset object as it is (quirk 11).
- `store/wsUrl.js`: `buildWsUrl(gameId)`.
- `store/wsHandlers.js`: one function per incoming message type, `(message, set, get) => void`, plus `activeCampaignId(get)` and `isForThisCampaign(get, payload)`. `connect` looks up the handler by `message.type`. Since only one branch runs per message today, a lookup table is equivalent.
- `store/slices/session.js`: `stage`, `setStage`, `accessSession`, `setAccessSession`, `logout`, `fetchUserData`, `setLastPlayed`, `rejoinInvite`, `setRejoinInvite`, `connect`.
- `store/slices/gameplay.js`: roll, drive, mark, scar, gilded and ability actions, chat, pen font, and the unused pending roll helpers.
- `store/slices/circle.js`: `updateCircle`, `spendCircleResource`, GM toggles, `gmAdvanceCircle`, `refillResources`, advancement, `gmAdjustTension`.
- `store/slices/campaign.js`: roster, approve, reject, join, `refreshCharacterStatus`, `finalizeRoster`.
- `store/slices/notebook.js`: the five notebook actions.
- `store/slices/circleCreation.js`: creation state fetch, votes, backstory, personal answer, relationships, relationship intro popup.
- `api/http.js` (optional): one function per endpoint returning the raw `fetch` promise, with the same URL, method, headers and body. Error handling stays in the store actions.

Risks:

- `name: 'candela-vtt-storage'` and the `partialize` key list must not change. Adding a `version` or renaming the key would drop every user's saved session on the next load.
- Keep a single `create` call so rehydration stays synchronous and every slice shares the same `set` and `get`.
- Cross-slice calls go through `get()` (for example `character_update` calls `get().fetchCircleCreationState`, approve and reject call `get().fetchRoster`). They keep working as long as all slices are spread into one object.
- A shared `sendIfOpen` helper is fine, but some actions call `set` before sending (`resolveAbilityMark`, `interceptMark`, `resolveGildedChoice`, `updateBackstoryAnswer`, `updatePersonalAnswer`, `rollAction`), some after (`applyScar`, `gmAdvanceCircle`, `applyAdvancement`), and `applyScar`, `gmAdvanceCircle` and `applyAdvancement` call `set` even when the socket is closed. `rollAction` and `gmAdjustTension` log warnings. The helper must not change any of this.
- Keep the `notebook_entry` handler's `return state` (a no-op update) as it is.
- Keep `connect` exactly as it is, including not closing the old socket (quirk 6).

### 7.4 components/pc/CircleView.jsx (911 lines)

Exports `AdvancementModal` and `CircleView`, both used by MainDeskView.

Proposed parts (folder `components/pc/circle/`):

- Shared data (see section 8): `CIRCLE_QUESTIONS`, `CIRCLE_ABILITY_DESCRIPTIONS`, `ILLUMINATION_KEYS`, `TRACK_SIZE`, `RESOURCE_MAX_SQUARES`, `RESOURCES`, `ILLUM_QUESTIONS`, `ALL_ACTIONS`, `ADV_PICKS`, `ROLE_ABILITY_POOL`, `SPECIALTY_ABILITY_POOL`. `ADVANCEMENT_OPTIONS` is unused.
- `getAvailableAbilities.js`.
- `AdvancementModal.jsx`, with `AdvancementPickRow.jsx`, `ActionChoice.jsx`, `DriveChoice.jsx`, `AbilityChoice.jsx`. Re-export from CircleView.jsx.
- `CircleIdentityCard.jsx`, with `IlluminationTrack.jsx` and `CircleAbilitiesList.jsx`.
- `IlluminationReportForm.jsx`: owns `evalQ`, `keyChecks` and `submitted`. It mounts and unmounts with CircleView, so the lifetime is the same.
- `CircleResources.jsx`, with `ResourceRow.jsx` (the pip click and title logic).
- `CircleHistory.jsx`.
- `CircleRelationships.jsx`, with `RelationshipCard.jsx` and `CounterProposalForm.jsx`. `showCounter` and `counterDrafts` stay in `CircleRelationships`.

Risks:

- Quirk 3: keep the order of the two early returns in AdvancementModal.
- `isGM` comes from `accessSession.role`, which can be stale (comment at line 154). Keep the same derivation in every part that uses it.
- The root uses `space-y-8`, so each extracted part must return one element at the same level. The relationships block is already a fragment of a divider and a section, and can stay a fragment.
- `RELATIONSHIP_DATA` and `RELATIONSHIP_TYPES` are imported from CircleCreationPopup.jsx. Moving them to a data module and re-exporting from CircleCreationPopup keeps this file and RelationshipIntroPopup.jsx working.
- The counter form here looks like the ones in CircleCreationPopup and RelationshipIntroPopup but uses different classes. Share only the draft logic, not the markup.

### 7.5 components/pc/CircleCreationPopup.jsx (857 lines)

Proposed parts (folder `components/pc/circleCreation/`):

- `data/relationships.js` (shared): `RELATIONSHIP_DATA`, `RELATIONSHIP_TYPES`, re-exported from CircleCreationPopup.jsx.
- Shared circle content: `CIRCLE_QUESTIONS`, `CIRCLE_ABILITIES`, `INSIGNIA_OPTIONS`, `EXAMPLE_LOCATIONS`.
- `votes.js`: `tallyVotes`, `leadingValue`.
- `useCircleVotes.js`: the derived tallies, leaders and "my vote" values for each vote type.
- `Section.jsx`: the collapsible section.
- `QuestionSection.jsx`, `NameSection.jsx`, `ChapterHouseSection.jsx`, `CircleAbilitySection.jsx`, `InsigniaSection.jsx`, `RelationshipsSection.jsx`, `ResourcePointsFooter.jsx`.
- `InvestigatorRelationshipCard.jsx`, `ProposalForm.jsx`, `RelationshipStatusRow.jsx` (today the `renderRelRow` function).

Risks:

- `Section` unmounts its children when collapsed (`AnimatePresence`). The drafts (`nameDraft`, `personalAnswer`, `relDrafts`, `counterDrafts`, `showCounter`, `selectedPrompt`) live in the popup today and survive a collapse. Keep them in the popup and pass them down. Moving them into section bodies would erase drafts on collapse.
- `personalAnswer` is initialized from `character.personal_circle_answer` when the popup mounts. Keep that initializer in the popup.
- The chapter house textarea is uncontrolled with `key={backstoryAnswers.chapter_house}` so it remounts when another player changes the value. Keep the key and `defaultValue`.
- `renderRelRow` is called as a function. Turning it into a component adds a component boundary but no state, so behavior stays the same. Its unused `label` argument can be dropped.
- The outer `motion.div` mount animation must stay in the popup root so it plays once.
- `circleId` is `circleCreation.circleId || circle?.id || 1`. Compute it once in the popup and pass it down.

### 7.6 components/pc/InvestigatorDossier.jsx (794 lines)

Used two ways: by the player (store character, interactive) and by the GM through GMCharacterSheet (`character` prop, `readOnly`).

Proposed parts (folder `components/pc/dossier/`):

- Shared data: `ABILITY_TEXTS`, `ROLE_FROM_ABILITY`, `SPECIALTY_FROM_ABILITY`, `ROLE_ICONS`, `DRIVE_FLAVOR`, `ACTION_FLAVOR`, `DRIVE_PIP_TOTAL`, `STANDARD_GEAR`, `SPECIALTY_GEAR`, `GEAR_ICONS`, and `DOMAIN_CATEGORIES` (today `domainCategories`, rebuilt every render).
- `PortraitFrame.jsx`, `IdentityHeader.jsx` (name, role and specialty badges, pronouns).
- `AssetIndexCard.jsx`: the tabbed index card; can own `infoTab`.
- `ActionsGrid.jsx`, with `DrivePanel.jsx` (pre-spend controls, available and maximum pips, resistance) and `ActionRow.jsx` (roll button, rating pips, modifier chips). `preSpend` and `activeMods` stay in `ActionsGrid`, because the drive panel and the action rows of a category share them.
- `MarksPanel.jsx` (marks, trauma status, new investigator and revive buttons), `ScarsPanel.jsx`.
- `EquipmentLedger.jsx` and `GearChangeModal.jsx` (`showGearModal`, `pendingGear`). The direct `update_gear` send can become a store action `updateGear(characterId, gear)` that sends the identical message.

Risks:

- Every part must take `character` and `readOnly` as props and must not read `character` from the store. Otherwise the GM view would show the GM's own persisted character.
- `getAvailableRollMods` is imported from DiceVault.jsx. Move it with the roll modifier tables (section 7.8) and re-export from DiceVault.
- Tailwind groups: `group/drive`, `group/action`, and the plain `group` on the marks pip container must keep their `group-hover:` descendants inside them.
- The root uses `space-y-6`, and its first child is the absolutely positioned portrait. Keep the children in the same order.
- Quirk 7: the gear modal passes `style` to the shared `SafeIcon`, which ignores it. Keep using the shared component there.

### 7.7 components/shared/NotebookView.jsx (786 lines)

Used by the player (`isGM={false}`) and by the GM (`isGM={true}`).

Proposed parts (folder `components/shared/notebook/`):

- `constants.js`: `GM_PEN_FONT`, `GM_INK_COLOR`, `PEN_FONTS` (this list has a different order from the other two pen font lists, and the order shows in the select), `ENTRIES_PER_SIDE`, `LINED_PAPER`, `formatDate`.
- `PageFooter.jsx` (today `pageFooter()`), `EntryCard.jsx` (with `SketchEntry`, `PhotoEntry`, `LightkeeperEntry`, `FieldLogEntry`), `EphemeralNote.jsx`.
- `NotebookTabs.jsx`.
- `PrivateNotesView.jsx`.
- `LightkeeperResourcesView.jsx` and `useLightkeeperNote.js` (`lkContent`, `lkSaveStatus`, `lkEntryId`, `lkSaveTimer`, the populate effect and the debounced save).
- `FieldNotesView.jsx`, with `TableOfContentsPage.jsx` (author filter, entry list with delete confirm, Lightkeeper link), `SpreadPage.jsx`, `NewEntryForm.jsx` (title, content, image staging, pen select, submit) and `SpreadNav.jsx`.
- `useNotebookEntries.js`: the split by entry type, spreads, author map and filter.
- `useImageStaging.js`: pending file, preview, type, error, `handleStageImage`, `clearPendingImage`.

Risks:

- The three views mount and unmount when the tab changes. Drafts that survive a tab switch today (`ephemeralText`, the new entry title and content, the staged image, `lkContent`) must stay in NotebookView or in hooks called by NotebookView.
- `useLightkeeperNote` must be called from NotebookView, not from the Lightkeeper view. If it lived in the view, a tab switch during the 1.2 second debounce would lose `lkEntryId`, and the next save would create a second `lk_main` entry.
- Effect order: the fetch effect (`[campaignId]`) runs before the populate effect (`[lkEntries.length]`). Keep that order.
- Quirk 1: copy the table of contents link handler unchanged, including the undefined call.
- The field notes grid has the absolutely positioned spine between the left and right pages. Keep the order left, spine, right.
- Field entry deletion uses `deleteEphemeralNote`. Renaming the store action is a separate change.

### 7.8 components/pc/DiceVault.jsx (689 lines)

Used by the player (no props) and by the GM (`showGmControls`, `logEntries`, `playerList`).

Proposed parts:

- `game/rollMods.js` (shared): `MAX_ABILITY_USES`, `ABILITY_ROLL_MODS`, `resistRemaining`, `getAvailableRollMods`. Re-export the public names from DiceVault.jsx.
- `game/actions.js` (shared): `driveKeyFor`. `ACTION_LABEL` is unused.
- Folder `components/pc/dice/`: `ActivityLog.jsx` (with `LogEntry`, the style maps, `hex80`, `hexCC`, and the autoscroll effect), `TargetDropdown.jsx`, `InviteRejoinSection.jsx`, `GmDiceControls.jsx` (can own `gmDiceCount` and `gmSecretRoll`), `DiceTray.jsx` (`dieSkews`, `getIsCandidate`, `handleDieClick`), `RollModifications.jsx`, `usePostRollPrompts.js` (`postRollAbilityPrompts`, `dismissedPrompts`, `drivePickerPrompt`, the reset effect), `PassNotes.jsx` (`chatTarget`, `chatMessage`, `chatInputRef`, `targetOptions`).

Risks:

- `dieSkews` uses `Math.random` inside a `useMemo` keyed on the roll id. If `DiceTray` were ever mounted conditionally, the skews would be recomputed and the dice would land at different angles. Keep it always mounted, as today.
- The `postRollAbilityPrompts` memo deliberately depends only on `[lastRoll?.id, character?.specialty_ability, character?.role_ability]`. Copy the dependency list exactly; an exhaustive list would change when prompts refresh.
- `canResist` and the prompts are both read by `RollModifications`, so compute them in DiceVault or in one hook and pass them down.
- The root uses `space-y-6`, and the GM controls are a conditional first child. Keep the children in the same order.
- `TargetDropdown` renders its menu in a portal on `document.body` and adds global listeners while open. Move it unchanged.
- The tray relies on the CSS variable `--random-skew` set inline and on the `animate-dieTumble` and `animate-liftShimmy` classes in index.css.

## 8. Shared data and duplicates

Several game tables are copied between files. A shared `src/data/` folder removes the copies, but only for tables that are identical.

| Table | Files | Status |
|---|---|---|
| `PEN_FONTS` | CharacterCreator, CampaignSelector | identical, safe to share |
| `PEN_FONTS` | NotebookView | different order; keep separate or keep the order |
| `ILLUMINATION_KEYS` | CharacterCreator, CircleView, CirclePage | identical in all three, safe to share |
| `CIRCLE_QUESTIONS` | CircleView, CircleCreationPopup, CirclePage | shared since 2026-10-10: `game/circleFormation.js`, with the papers' `INSIGNIA_OPTIONS`, which the Lightkeeper's formation papers (gm/desk/CircleFormationStatus.jsx) read too |
| Circle ability descriptions | CircleView (object), CircleCreationPopup (array), CirclePage (object) | CircleView and CircleCreationPopup have the same text in different shapes; CirclePage uses shorter wording for Nobody Left Behind, Interdisciplinary and One Last Run, so it must keep its own copy to avoid a visible text change |
| `TRACK_SIZE`, `RESOURCE_MAX_SQUARES` | CircleView, CirclePage | same values |
| `DRIVE_FLAVOR`, `ACTION_FLAVOR` | CharacterCreator, InvestigatorDossier | same text, different whitespace |
| `STANDARD_GEAR`, gear lists, `GEAR_ICONS` | CharacterCreator, InvestigatorDossier | appear identical; compare after normalizing before merging |
| Ability text | CharacterCreator `ROLES`, InvestigatorDossier `ABILITY_TEXTS`, CircleView ability pools | same content in three shapes; any derived version must produce identical strings |
| `RELATIONSHIP_DATA`, `RELATIONSHIP_TYPES` | exported by CircleCreationPopup, imported by CircleView and RelationshipIntroPopup | move and re-export |
| `SafeIcon` | shared/SafeIcon.jsx, CharacterCreator | different behavior; do not merge (quirk 7) |

## 9. Suggested order and how to verify

There is no frontend test runner in the repository, and app code cannot be run on the host. Each step can be checked with:

1. A production build in CT210: `beta-test.sh --frontend -- -q` builds `frontend/` with Vite, which catches broken imports and syntax errors. It does not check behavior.
2. Reading the diff: moved code should show up as pure moves with identical class strings, handlers and dependency arrays.
3. A click-through on the beta site after deploying, for each screen touched.

Suggested order, from lowest to highest risk, one commit per step:

1. Shared data modules and re-exports (section 8), with no component changes besides imports.
2. Pure presentational extractions with no state: ornaments, `CardFace`, `PaperSheet`, `HalcyonHerald`, candles, sketches, `EntryCard`, `LogEntry`, `PageFooter`.
3. DiceVault and InvestigatorDossier parts, since both are shared by player and GM views and are easy to check on the beta desk.
4. CircleView and CircleCreationPopup, keeping all drafts in the parents.
5. NotebookView, with the hooks called from NotebookView.
6. CharacterCreator, with all state in `useCharacterDraft`.
7. CampaignSelector, with the style block kept as one mounted component.
8. The store split last, since every screen depends on it, keeping the persist name and `partialize` list unchanged.
