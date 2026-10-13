# Fix round 6 triage (13 October 2026, on main 77452a3)

One Opus agent read every issue against main. Line numbers are from 77452a3. Use them as starting points, and confirm in the code.

## #17 Activity Log and held offers live in memory (still present)
Log: an in-memory list per desk channel, the last 100 lines (ws/manager.py:54-55, 94-114, docstring 26-32), sent on connect (ws/endpoint.py:161-166). No browser persistence. Offers: all in memory in ws/handlers/marks.py: held marks (soak or Death Defy) :78, Adrenaline Rush :86, Behind Me and Premonitions with their 2-minute lapse tasks :91-99, Non-Combatant :102, seen mark ids :108. rolls.py keeps the gilded choice, last roll, settled flag and replies in memory (:54, 289-298). serializers.py:17 keeps "scar owed" the same way. A restart loses all of these.
Design. Log: a new table activity_lines (id, campaign_id FK with cascade delete, channels (the list of desk channels to address), line JSON, created_at). Write it once per line where lines are kept now, in its own short DB session (the lapse tasks have none). Prune to the last 500 per campaign. On connect, read the newest 400 for the campaign, filter to the desk's channel, and send the last 100. Lines with no campaign stay in memory. Offers: a new column characters.held_mark (JSON) storing the held-mark record as now, including its offer id. Write it on offer, and clear it on answer, landing, death and End Assignment.
Files: models.py, vtt/db.py, ws/manager.py, ws/handlers/marks.py, ws/endpoint.py. Tests: test_00_startup.py (both column-existence and legacy-upgrade tests), test_ws_connect.py (log survives a restart), WEBSOCKET.md section 2. Size L, data and a DB write on every log line.

## #18 Stale offer card after a restart lands its mark (still present, documented "restart rule")
_stale_answer (marks.py:476-486) accepts an unknown pre-restart id; _let_the_mark_land (:608-613) then lands it. The desk keeps offer cards across a reconnect (gameStore.js:673-677).
Fix: with #17's column the held mark survives a restart and is resent on connect with the same offer id (send_held_mark :497). Drop the restart rule: an answer naming an offer the server does not hold is ignored, and the server replies mark_offer_closed {dropped:true}, which the desk already handles (gameStore.js:1346-1353). Ally offers (Behind Me, Premonitions, Adrenaline Rush, Non-Combatant) are not persisted; they expire with the existing refusal. Say so in QUIRKS.md. Flip test_ws_marks.py:353 test_an_answer_from_before_a_restart_still_lands_its_mark, add "a held mark survives a restart", and rewrite the QUIRKS.md pin and WEBSOCKET.md lines 201 and 215. Size M.

## #19 Flourish outcome not shown (still present)
Flourish and Bending Spoons change the server outcome (rolls.py:688-692, 713) and log it, but nothing tells the desk; RollResultBar.jsx:112 reads the old outcome. Fix: a new message roll_outcome {character_id, action, outcome, by} to the roller (and the table unless the roll was secret); the store updates lastRoll. test_surface.py:214-217 (use_post_roll_ability), test_ws_rolls.py, WEBSOCKET.md row. S.

## #20 Drafts after Sign out (still present)
Notebook drafts are per account (NotebookView.jsx:68-89); so is the creator draft (CharacterCreator.jsx:482-508, AppRouter.jsx:248). logout (gameStore.js:556-606) clears neither. Fix: a helper that removes candela-notebook-draft:<id>:* and candela-creator-draft:<id>* keys and empties keptInPage, called on explicit Sign out only (not on a server-ended session). S.

## #21 Sketch lost on Back after reload (still present)
After a reload the desk sits on a history entry from the earlier load. Back does a full navigation, so holdBack (stageHistory.js:123-152, used at SketchPad.jsx:151) never fires. Fix: when holdBack starts and the current entry is not this page's own, replace it with the hub's entry and push a fresh entry for this page. Add a beforeunload warning while there are unsaved strokes. S-M.

## #22 403 opening a retired campaign's desk (still present)
TactileSidebar.jsx:179-181 and the reconnect path (gameStore.js:726-729) fetch the roster for any campaign_id; the route (campaigns.py:650) allows only the GM or active members. Fix: fetch only when the character is active. S.

## #38 Dead scar and proposals (all three still present)
access.py:533-537 DEAD_REFUSED lacks apply_scar. REST propose (circles.py:124-132) checks status only, and a dead investigator stays 'active' until replaced. The WS check (access.py:291-296) has the same gap for the recipient. UI: proposeBlocked reflects only the player's own death (CircleView.jsx:1102, RelationshipNegotiation.jsx:229). Fix: add apply_scar to DEAD_REFUSED; refuse a dead sender or recipient with 409 in both routes (add is_dead to character_facts, auth.py:92); in RelationshipNegotiation, when inv.is_dead, show "Dead" and no Propose. Tests: test_access.py, test_circle_rest.py, test_ws_circle.py. S.

## #39 Rejoin leaves old desk live (still present)
rejoin_campaign (campaigns.py:547-590) sends nothing to the retired investigators. Fix: send investigator_replaced {character_id, character_name, campaign_id, replaced_by} to each retired investigator's channel. The store handles it like investigator_released (gameStore.js:1173-1190): go to the hub, clear rejoinInvite, show a hub notice. test_campaigns.py, WEBSOCKET.md. S-M.

## #40 Reload empties the tray (still present)
Only a held gilded roll or a settled notice is sent on connect (rolls.py:86-106); lastRoll is not persisted (gameStore.js:2436-2447). Fix: keep the last displayed roll per character in memory; on connect resend roll_result marked replayed:true with the correct settled flag and the current outcome (from #19). The desk plays no tumble on a replay. test_ws_rolls.py (open and settled rolls come back); flip test_a_desk_that_missed_the_settling_dice_is_told_when_it_opens; WEBSOCKET.md. M, protocol, with a race between settle and reload. After a server restart the tray stays empty, which is consistent with what the server accepts.

## #41 Replacement by request starts at 0 spends (still present)
approve_investigator (backend/engine.py:86-97, not vtt/) retires the dead predecessor without copying resources_spent_assignment, which rejoin does (campaigns.py:514-520). Fix: carry over the highest count among the active predecessors it replaces. Test in test_campaigns.py. S.

## #42 Play on a retired campaign (still present)
enterAsPlayer (useCampaignEntry.js:43-49) does not re-check. Fix: await fetchUserData; if the character is no longer active in that campaign, stay on the hub with "<Name> is no longer in <Campaign>." and refresh the book. S.

## #43 Held mark lost on reload (still present)
heldMarks is not in partialize (gameStore.js:2436); seen mark ids are in memory only (marks.py:108). Fix: persist unanswered held marks that carry a mark_id, with a timestamp, and resend them when the same character's socket opens. Drop any older than 10 minutes, with "A Body mark taken before the reload may not have counted. Check the trauma record." For restart safety, keep the last 16 mark ids in a characters column (from #17's work). test_ws_marks.py. M, races.

## #44 Markdown marks on an empty line (still present)
MarkdownMarks.jsx:54 prefixLines selects the whole new line. When there was no selection, put the caret at the line's end. S.

## #23 Lightkeeper copy hides held marks (still present)
Held boxes are drawn only when the sheet is not read-only (InvestigatorDossier.jsx:514-515, 1305). Fix: get_char_dict adds held_marks from #17's column; _offer (marks.py:469) and the clearing points broadcast the sheet (it reaches the Lightkeeper as member_update); her read-only copy draws dashed held boxes. S-M after #17.

## #24 Ability tab resets (still present)
infoTab is local state (InvestigatorDossier.jsx:580), and the sheet unmounts on a tab switch (MainDeskView.jsx:296). Remember it per character and view in a module-level map, as NotebookView does. The tab buttons are 36px on a phone; make them 44px. S.

## #25 Notebook controls under 44px (partly fixed)
md:-only 44px (so not on a phone): NotebookView.jsx:1160, 1168, 1326-1366. No 44px rule at all: :444, 1005, 1091, 1222-1223, 1238. SketchPad.jsx:90 mark buttons are 40px wide under 400px; the swatches at :336 are 40px wide. Move them all to the app's 44px-on-touch rule. S.

## #26 Creator step 3 overflow under 356px (likely still present; check in the browser)
On touch the action row (CharacterCreator.jsx:1282-1320) adds up to about 350px: two 44px steppers, a 44px star, the 64px name and the pips. Let it wrap below 360px, or drop the star's negative margins. S.

## #46 40px join card buttons: already fixed by 7be39b1 (PlayerRosterCard.jsx:48, 56, 72; GMCharacterSheet.jsx:313+). Verify at 390x844.

## #47 Registry has no Fallen record (still present)
The data arrives (status retired plus is_dead, users.py:22-45), but PlayerRegistryPage.jsx shows only active, pending and unaffiliated. Frontend only. S.

## #67 Illumination ring
Now: player CircleView.jsx:719-747 is a wrapping row of 12 dots of 18px, with gold rings at 3, 6 and 9 and an 11px GiCandleLight in the heading. Lightkeeper CirclePage.jsx:422-479 is the same row with each dot a button (hit area about 26x46, index.css:1149-1150), plus +1 and -1. Lightkeeper desk summary CircleLedger.jsx:84-91 is 10px dots (keep this one as is). Design: a new shared/IlluminationRing.jsx. The candle is about 56px in the centre. Pip n sits at n x 30 degrees clockwise from the top. Milestone pips are larger, with a gold ring. The flame warms with the fill and is fully lit when full. On the Lightkeeper's ring the pips are real buttons in DOM order 1-12 with the existing labels and toggle behaviour; on touch the target is 44px on a radius of about 86px (box about 220px), so targets do not overlap; with a fine pointer the ring is about 180px. Keep +1 and -1 below. The player's ring is one role="img" labelled "Illumination n of 12". Respect reduced motion. Files: CircleView.jsx, CirclePage.jsx, index.css, DESIGN.md pip section. M, UI only.

## Shared files
gameStore.js is touched by all groups in separate regions. WEBSOCKET.md by log, rolls and dead. QUIRKS.md by all: each group adds its own "Fix round 6, <group>" subsection. InvestigatorDossier.jsx: log (around 1300-1340) and ui (around 580). Merge log first.
