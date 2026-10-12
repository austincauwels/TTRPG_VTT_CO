# Candela VTT: third AI playtest report

12 October 2026, beta site (candela-beta.gatergrid.com), build 2d86b77. For Austin (who wrote the app) and Robert (who runs the server and the group).

## The short version

- The session ran end to end on the real beta site: a Lightkeeper and four players founded a circle, played The Drowned Choir through three scenes, filed reports, added Illumination and ended the assignment. Every desk on all five devices stayed current without a reload.
- The rules held. Pool sizes, gilded dice, a critical, burns, refunds and the Illumination tally (3 questions + 2 for some keys = 5, p. 55) all matched the book. The only rules-side slip is a log line that claims a Well-Read refund the cap swallowed.
- The biggest problem: Robert's Pontius Aganus could not be taken off the roster once approved. He stayed a ghost member all session, so the circle's resources started at 6 instead of 5 and the 'all of you' key bonus was out of reach (the circle got 5 Illumination; with four members it would have been 7). The Lightkeeper corrected the resources by hand.
- 7 new bugs: besides the ghost member, a Train die bought during an assignment is wiped at End Assignment, a 0-maximum drive shows '0 of 1', sketch labels get lost, notebook Contents does not reach its entry, and players see the Lightkeeper's login name. All are verified and most are small fixes.
- What every player hit: the circle spend 'Press again' confirm lapses after 4 seconds and silently spends nothing, and the report has no line for what happened.
- 10 clusters repeat open issues (mostly the #45 checklist); none needs reopening. Not tested this time: scars, incapacitation, death, the timer running out and advancement.

## Fix these first

1. Add a two-press Release for an approved investigator on the Lightkeeper's sheet that also clears votes, relationships and the report and clamps Stitch, Refresh and Train (ghost-member-no-release).
2. Stop End Assignment wiping a bought Train die and make the card, log, roll chip and Lightkeeper sheet say the same thing about when spends happen (circle-spend-timing-wording).
3. Send and draw a 0-maximum drive as 0, not '0 of 1', in serializers.py and InvestigatorDossier.jsx (drive-max-zero-shows-one).
4. Make each click with the sketch Text tool start a new label and stop Escape-then-click overwriting the last one (sketch-text-tool-drops).
5. Make a notebook Contents line scroll to its entry and let each contents page hold only the lines that fit (notebook-pages-clip).
6. Sign the Lightkeeper's notebook entries, sketches and photos 'The Lightkeeper' instead of her login name (lk-username-shown-to-players).
7. Add a read-only Circle Relationships paper to the Lightkeeper's Circle page so she still sees agreed and waiting relationships after the seal (lk-no-relationships-after-seal).
8. Keep the circle spend confirm armed until the player presses elsewhere, since all four players lost a spend to the 4-second lapse (spend-confirm-lapses-fast, pending Robert's decision).
9. Reword the join notice to 'You asked to join <campaign> with <name>' so a player does not read it as someone else's request (join-notice-third-person).
10. Tell the player 'Your session ended, please sign in again' instead of dropping to a blank sign-in slip, and open the keys info slip above its heading so it no longer covers the checkboxes (silent-logout-on-401, info-slip-covers-keys).

## Decisions for Robert

- Who may take an approved investigator off a roster: the Lightkeeper only, the player too (leaving a campaign), or both; and only before the first session, or at any time?
- When a member is released after the seal, should their votes, relationships and filed report be dropped and Stitch, Refresh and Train recomputed at once, or kept and left for the next refill to correct?
- When may circle resources be spent: only between assignments (End Assignment opens spending and Dispatch locks it), or whenever the Lightkeeper opens spending; and does a bought Train die last until it is used, or end with the assignment?
- Should the circle spend 'Press again' confirm keep its 4-second lapse from DESIGN.md, or stay armed until the player presses elsewhere like every other confirm in the app?
- Should the assignment report get an optional line of text that the Lightkeeper reads on the report card, or stay key ticks only?
- Should Add Illumination and End Assignment warn when a report is missing (today FAQ.md says they do not), or is the '4 of 5' line enough?
- Should Behind Me and other ally offers stay open until the ally answers (better for a table that takes turns), or keep the 2-minute window and tell the Lightkeeper who was offered?

## The session

Robert was going to play one seat himself. He built Pontius Aganus (Scholar, Professor), was approved, and left before play. Ada Quill, an AI player and a Scholar too, took his seat. The site had no way to remove an approved investigator, so Pontius stayed listed as a member for the whole session. Robert's own two findings are under seat "robert".

### The Drowned Choir, as played

The Saltmere Chapter sent its new circle, The Lantern Wall (Ada Quill, Scholar; Bram Okafor, Muscle; Cass Moreau, Slink; Dev Lindqvist, Weird), to the river town of Saltmere, where the bells of a chapel that sank eighty years ago ring under the mud at low tide and three fishermen have walked out onto the flats and not come back. On the flats at dusk Bram found a firm line out to a warm bell rope, Ada found bootprints that turned backwards and took a Brain mark from the bells, Cass got the mudlark girl Nell talking before the mud nearly took her, and Dev heard their grandmother's hymn under the whole shore. In the dead choirmaster Abel's lodging, Ada's critical Read showed the drowned choir writing through Abel's hand, signed Maren; Cass picked the salt-crusted cabinet (tower keys, handbells, one missing); Dev read the daybook as a bell-ringer's change book one row short, with Maren in the margin; Bram saw choir-white figures on the slates and took a Bleed mark. As the tide turned they raced a 30-minute timer to a bell tower risen from the silt: Bram hauled Cass through, Ada read the safe ridges, Cass found the key that turned, and Dev held the choir by singing the verse without its last line. Bram and Cass took Body marks. Dev rang the last change on Maren's handbell instead of singing it, the choir stopped for good, and the circle carried the three fishermen home alive. The circle gained 5 Illumination (0 to 5 of 12). Nobody was scarred or killed.

### In numbers

| | |
|---|---|
| Findings logged | 138 (all 138 placed in a cluster or a praise theme) |
| Clusters | 53, plus 9 praise themes |
| New and confirmed by a verifier | 9 (7 listed as bugs below, the rest under UX) |
| Partly confirmed | 2 |
| Repeats of open issues | 10 (9 in the repeats table, 1 idea that extends #34) |
| By design (verifier) | 1 |
| Not reproduced by a verifier | 0 (parts of three clusters were refuted; see 'Not reproduced or by design') |

### Timeline

| Phase | What happened |
|---|---|
| Founding (03:02 to 03:11) | The Lightkeeper's first turn was blocked: the testing environment's proxy refused every signed-in request, so she could not stay signed in (a harness problem, not the site). Once that was cleared she founded The Saltmere Chapter (code saltmere-r3), toured her desk and posted the code at 03:11. |
| Investigators (03:14 to 03:23) | Cass (Slink, Criminal), Bram (Muscle, Soldier) and Dev (Weird, Occultist) signed up, built investigators in the creator and asked to join. Robert signed up as Chilly, built Pontius Aganus (Scholar, Professor) and asked to join; at 03:18 he logged two findings about the join notice and the waiting screen. |
| Approval (03:42 to 03:44) | After a machine restart (start_all.sh reloaded the Lightkeeper's desk), the four requests were on her desk. She checked each sheet and approved Cass, Bram, Pontius and Dev. The formation papers opened on each approved desk. |
| Robert leaves; Ada takes the seat (03:46 to 03:53) | Robert left before play. The Lightkeeper tried to take Pontius off the roster and found no way to do it (F030). Ada Quill (Scholar, Professor) signed up, asked to join and was approved at 03:52. Pontius stayed listed as a fifth member for the rest of the session. |
| Circle formation and seal (03:53 to 04:01) | The four players filled the six parts of the papers live: The Lantern Wall, Nobody Left Behind, Candlelight, a chapter house in a loft above the chandler's on Wick Lane, and relationships among the four. The seal said 'finalize with 5 investigators' and set Stitch, Refresh and Train to 6 each (1 + 5); the Lightkeeper lowered each to 5 by hand. Dispatch sent, clock named 'The bells beneath the mud'. |
| Scene 1, the flats (04:01 to 04:06) | Bram Move 4, Ada Focus 2 (failure), Cass Sway 4, Dev Sense 6. Ada took a Brain mark and a private pass note; tension rose to 1 of 4; the Lightkeeper made an open and a secret roll. |
| Scene 2, Abel's lodging (04:06 to 04:15) | Ada Read critical (two 6s), Cass Control 6, Dev Focus 6 (gilded), Bram Survey 4 then 5 after burning resistance, and a Bleed mark. The Lightkeeper opened circle spending and drew a sketch map of the flats (3 of 5 labels lost the first time). |
| Scene 3, the bell tower (04:15 to 04:21) | New dispatch, tension 2 of 4, a 30:00 timer. Ada and Bram Stitched their marks (the 'Press again' confirm lapsed on several tries). Bram Move 5, Ada Survey 6, Cass Move 5, Dev Sway 6; Bram and Cass took Body marks. The climax freed the choir; the Lightkeeper paused and cleared the timer and lowered tension to 0. |
| Reports and Illumination (04:21 to 04:27) | Reports opened and the Lightkeeper ticked all three questions. All four players filed a key (no field for a line of text). Tally: questions +3, 'Keys: some investigators (4 of 5) +2', total +5; Add 5 Illumination took the track 0 to 5 of 12. End Assignment at 04:27 cleared dispatch, clock, reports, gear, spends and ability uses. |
| Between assignments (04:28 to 04:32) | Bram and Cass Stitched and Refreshed (2 of 2 each), Ada Refreshed, Dev took Train. Every desk matched what the Lightkeeper announced. No advancement at 5 of 12, so the advancement dialog was not reached. |

## New bugs

Ranked by harm to a real session: wrong numbers and lost data first, then blocked actions, then visible defects. Severity is the verifier's, or the adversarial check's where they differ.

| # | Bug | Severity | Seats | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | An approved investigator cannot be taken off the roster, so a player who leaves stays a counted circle member (`ghost-member-no-release`) | medium | dm, bram, ada | M | confirmed |
| 2 | A Train die bought during an assignment is wiped at End Assignment, and four places disagree on when spends happen (`circle-spend-timing-wording`) | medium | dm, dev | M | confirmed |
| 3 | A drive whose maximum is 0 shows as '0 of 1' with an empty pip that can never fill (`drive-max-zero-shows-one`) | medium | dm, dev | S | confirmed |
| 4 | Sketch labels get lost: a click with the Text tool only closes the open label, and after Escape the next click overwrites the last one (`sketch-text-tool-drops`) | medium | dm | S | confirmed |
| 5 | Notebook Contents lines do not bring the entry into view, and a contents page hides lines that do not fit (`notebook-pages-clip`) | medium | ada, cass | S | partly |
| 6 | Players see the Lightkeeper's login name on her notebook entries, the author filter and the sketch log line (`lk-username-shown-to-players`) | medium | dm, bram, ada | S | confirmed |
| 7 | The log claims a Well-Read refund that the drive's cap swallowed (`wellread-refund-logged-when-capped`) | low | ada | S | confirmed |

### 1. An approved investigator cannot be taken off the roster, so a player who leaves stays a counted circle member

`ghost-member-no-release` · medium · campaign-management · effort M · laptop 1440x900 (Lightkeeper), phone 390x844, desktop 1920x1080

**What happens.** Robert's Pontius Aganus was approved at about 03:43; Robert then left. Nothing on the site releases an approved investigator: Reject works only on a waiting request, the player's Withdraw only on a waiting request, Delete refuses an investigator on a roster, and the only way out is Retire campaign, which drops everyone. Pontius was counted for the whole session: the formation papers listed him as a voter ('0 of 5 voted') with a relationship row, the seal said 'finalize with 5 investigators', Stitch, Refresh and Train started at 6 each (1 + 5) where four players get 5 (rulebook p. 41), every refill returns to 6, and he had a report card, so the tally read 'some investigators (4 of 5) +2'. All four real players filed a key, so with four members the keys would have given 4 and the total 7, not 5. Approve is one press with no warning that it is final, while Reject asks twice. The Lightkeeper worked around it by lowering each resource to 5 by hand (the maximum stayed 6).

**Steps.** 1. Approve a join request. 2. Look for a way to release that investigator on the roster card, the Lightkeeper's copy of the sheet, the Circle page and the Finalize slip. 3. Seal the circle without that member taking part; read Stitch, Refresh and Train. 4. At wrap, have every other player file a key and read the tally.

**Why.** No code path releases an active, living investigator except retiring or deleting the campaign: engine.reject_investigator (backend/engine.py:112-121) acts only on status 'pending'; withdraw_request (backend/vtt/routers/campaigns.py:328-342) refuses non-pending with 409; delete_character (backend/vtt/deletion.py:117-127) refuses rostered investigators. Every count then includes the ghost: resource_pool (backend/vtt/circle_queries.py:26-39) counts every active living member, and tallyReports (frontend/src/game/illumination.js:17-23) uses all living investigators as the member count.

**Fix.** Add a Lightkeeper-only POST /campaign/release/{character_id} that does for one active, living investigator what retire_campaign does (status 'unaffiliated', campaign_id None, ink colour cleared, end_assignment_for), removes its votes, relationship proposals and report entry, clamps Stitch, Refresh and Train to the new resource_pool, broadcasts the change and logs 'The Lightkeeper released <name>'. On the Lightkeeper's copy of an approved sheet add a two-press Release, worded so it is clear the investigator goes back to its player. Base the report tally's member count on the same member set as resource_pool so the two cannot drift. Weaker stopgap: give Approve a second-press warning that approval is final. Needs Robert's decision on who may release and what happens after the seal.

**Verdict.** Confirmed; the adversarial check stands and lowers severity to medium (the Lightkeeper can correct resources and Illumination by hand, and the 'up to 5' seat cap is hint text, not enforced). Findings: F030, F031, F033, F036, F044, F104, F035, F057, F112. Screenshots: shots/dm/058_sealed2.png, shots/dm/052_circle_after2.png, shots/bram/043_t8.png, verify/out_8401/r04_tally.png, verify/out_8401/r08_roster_ledger.png, verify/out_8401/g02_sheet.png.

### 2. A Train die bought during an assignment is wiped at End Assignment, and four places disagree on when spends happen

`circle-spend-timing-wording` · medium · circle-page · effort M · laptop 1440x900 (Lightkeeper), tablet 820x1180

**What happens.** The Lightkeeper opened spending in the middle of the assignment and again after End Assignment, as the site allows. The Train card says the die is for 'the next assignment'; the log and the roll buttons say 'this assignment'; the Circle page says 'up to two between assignments'; the Lightkeeper's sheet says 'Circle spends this assignment'. The verifier showed on a local copy that a Train die bought while an assignment is open is cleared by End Assignment without giving the circle its point back, and that the spend count resets at End, so a player can spend before and again after End in the same break. In this session Dev bought their Train after End, so it survived; here only the wording misled.

**Steps.** 1. As the Lightkeeper, open spending during an assignment. 2. As a player, spend 1 Train; read the card, the log line and a roll button. 3. End Assignment. 4. Check the Train die and the spend count; spend again.

**Why.** The server counts spends and Train dice per assignment and wipes both at End Assignment (backend/vtt/assignment.py:76-79, called from backend/vtt/ws/handlers/gm.py:370-371), while the Lightkeeper may open spending at any time (gm.py:265) and End Assignment does not close it. Wording: CircleView.jsx:52 and circleResources.js:7 say 'next assignment'; circle.py:102 and rollMods.js:140-146 say 'this assignment'; circleResources.js:23-24 says 'between assignments'; GMCharacterSheet.jsx:37 says 'this assignment'.

**Fix.** Decide when spends happen. Smallest change that matches rulebook p. 41 and the card: stop End Assignment clearing train_bonus and train_dice (assignment.py:78-79) so a bought die lasts until a roll uses it, and make the log, the roll chip and the Lightkeeper's sheet use the card's wording. The end-assignment test and QUIRKS.md line 184 change with it. Alternative: End Assignment opens spending and Dispatch locks it, so no spend falls inside an assignment.

**Verdict.** Confirmed (filed as ux; the verifier found a lost Train die, so it is listed as a bug). Findings: F086, F130. Screenshots: shots/dm/083_bram_bleed.png, shots/dm/086_spending_open.png, shots/dev/076_train.png, verify/out_8404/train_02_tablet_circle.png, verify/out_8404/train_03_lk_sheet.png.

### 3. A drive whose maximum is 0 shows as '0 of 1' with an empty pip that can never fill

`drive-max-zero-shows-one` · medium · player-desk · effort S · laptop 1440x900 (Lightkeeper), tablet 820x1180, desktop 1920x1080 (verifier)

**What happens.** Professors and Occultists may start with Nerve 0. The sheet then draws one empty pip, a screen reader hears 'Nerve: 0 of 1 available', and a live 'Set Nerve available to 1' button is offered that the server refuses (422). A circle Refresh logs 'drives & resistances restored' but the pip stays empty, so it looks like a spent point that never comes back. Two of the five characters this session had it (Pontius on the Lightkeeper's view, Dev on the tablet); Dev logged it as Refresh not restoring Nerve.

**Steps.** 1. Create a Weird (Occultist) or Scholar (Professor) and leave Nerve at 0. 2. Open the sheet as the player or the Lightkeeper. 3. Read Nerve, tap the empty pip, then spend a circle Refresh.

**Why.** backend/vtt/serializers.py:60, 63 and 66 send `getattr(char, "nerve_max", 1) or 1` (the same for Cunning and Intuition), so a stored 0 goes out as 1. The frontend repeats the fallback in InvestigatorDossier.jsx:982 (`|| 1`, which draws the pips and makes pip 0 a live button) and :579 (handleSpendDrive).

**Fix.** Use `or 0` in serializers.py:60, 63, 66 and `?? 0` in InvestigatorDossier.jsx:579 and :982 (and gameStore.js:242 for consistency); optionally print 'none' for a 0-maximum drive as the Resistance row does. Add a serializer test that a 0 maximum round-trips as 0. No product decision needed.

**Verdict.** Confirmed (verifier rated medium: the number and control are wrong, the server stays correct). Findings: F021, F100. Screenshots: shots/dev/062_inv2.png, shots/dm/035_pontius_actions.png, verify/out_8402/drive_02_after_refresh.png.

### 4. Sketch labels get lost: a click with the Text tool only closes the open label, and after Escape the next click overwrites the last one

`sketch-text-tool-drops` · medium · notebook · effort S · laptop 1440x900 (Lightkeeper)

**What happens.** Drawing the flats map at the table, the Lightkeeper lost 3 of 5 text labels and once ended up on the Eraser. The verifier reproduced it with a real mouse: the Text tool stays selected, but a click while a label is open only finishes that label, so the next label is never started and the typed letters go nowhere or act as tool shortcuts ('e' picks the Eraser). Pressing Escape to finish a label is worse: the next click reopens the previous label and typing replaces its text. Two clicks per label works. This contradicts DESIGN.md (Sketch sheet): a word never turns the tool back, so the next stroke draws again.

**Steps.** 1. Notebook > Log a Field Entry > Sketch. 2. Text tool, click, type a label. 3. Click elsewhere once and type a second label. 4. Separately: finish a label with Escape, click once and type.

**Why.** SketchPad.jsx:154/179/187 locks every tool, Text included, but Excalidraw 0.18 is not written for a locked Text tool: in handleTextOnPointerDown a click while a label is open only finishes it, and an Escape submit leaves the finished text selected so startTextEditing reuses it on the next click.

**Fix.** In SketchPad.jsx: add a capture-phase pointerdown on the canvas wrapper that blurs an open label before Excalidraw sees the click (checked in the browser: 5 of 5 labels with one click each), and in onChange clear the selection when the Text tool is active and no label is being edited.

**Verdict.** Confirmed (filed as ux; it loses what was typed and contradicts DESIGN.md, so it is listed as a bug). Findings: F084. Screenshots: shots/dm/091_sketch_labels.png, shots/dm/093_after_labels.png, verify/out_8403/s_A.png, verify/out_8403/s_C.png, verify/out_8403/s_fix_sim.png.

### 5. Notebook Contents lines do not bring the entry into view, and a contents page hides lines that do not fit

`notebook-pages-clip` · medium · notebook · effort S · desktop 1920x1080, laptop 1366x768

**What happens.** Under the 30:00 timer Ada was sent to the Lightkeeper's map in the notebook and could not reach it: clicking its Contents line opens the right spread but leaves the page at the top, with the map about 3000px down inside the page's own scroll. On Cass's 1366x768 laptop the contents page read 'page 1 of 2' but showed only the first of three lines; the other two hid in a 60px inner scroll, and the next arrow jumped to the fourth entry.

**Steps.** 1. Post three or more long Field Notes entries and a sketch. 2. On 1920x1080 click the sketch's Contents line. 3. On a 1366x768 window open Contents.

**Why.** NotebookView.jsx:231 is setCount(Math.max(3, fits)), forcing at least three contents lines per page even when one fits. NotebookView.jsx:1191: a contents line only sets the spread and never scrolls the entry into view (the post-entry path at 694-705 already does).

**Fix.** Change to Math.max(1, fits) so arrows page through the rest, and move the scrollIntoView block from handleSubmitEntry into a showEntry(id) helper that the contents button also calls (block 'start'). Keep three entries to a page as DESIGN.md asks.

**Verdict.** Partly: the two defects above are confirmed; three entries sharing page 1, the empty right page until a fourth entry, and long pages scrolling inside themselves are by design (the headless browser hid the scrollbar). Findings: F092, F136. Screenshots: shots/ada/054_map.png, shots/cass/074_nb.png, shots/cass/076_nb3.png, verify/out_8403/n_short_contents.png, verify/out_8403/n_desk1920_after_click.png.

### 6. Players see the Lightkeeper's login name on her notebook entries, the author filter and the sketch log line

`lk-username-shown-to-players` · medium · notebook · effort S · laptop 1440x900 (Lightkeeper), phone 390x844, desktop 1920x1080

**What happens.** When the Lightkeeper posts a Field Notes entry, sketch or photo it is signed with her account name. Every player's log read 'lightkeeper_rue_r3 added a sketch', and the Notebook's Filter by Author chips and byline showed 'lightkeeper_rue_r3' beside investigator names. Every other Lightkeeper line says 'The Lightkeeper', and #16 keeps login names to the Lightkeeper.

**Steps.** 1. As the Lightkeeper, add a Field Notes entry or a sketch. 2. On a player's desk open the Notebook and the Activity Log.

**Why.** backend/vtt/routers/notebook.py:70-71 (_require_writer) and backend/vtt/ws/handlers/chat.py:90-91 return user.username as author_name for the GM; that stored name feeds the byline, the author filter (NotebookView.jsx:608-617) and the log line (notebook.py:144-151, chat.py:133). NotebookView.jsx:627 matches it on the client.

**Fix.** Sign GM entries 'The Lightkeeper' on the server (notebook.py:71, chat.py:90), update existing rows (author_type 'gm'), set NotebookView.jsx:627 to match, and update test_notebook.py:114, test_ws_chat_notebook.py:231-232 and QUIRKS.md:72, which pin the old behaviour.

**Verdict.** Confirmed (QUIRKS.md and two tests pin the username, carried over from an earlier refactor rather than chosen). Findings: F085, F125, F129. Screenshots: shots/dm/094_map_posted.png, shots/bram/092_nb2.png, shots/ada/080_nb.png, verify/out_8403/n_phone_contents.png.

### Low

- **The log claims a Well-Read refund that the drive's cap swallowed** (`wellread-refund-logged-when-capped`). Ada (Professor, Well-Read, Intuition 4 of 4) spent 1 Intuition on a gilded Focus, failed and kept the gilded die. The gilded refresh gave the point back, so Well-Read's refund had nowhere to go, yet the log says both happened ('1 Intuition refunded' for Well-Read). Intuition ends at 4 of 4, which is right by the rules; only the log overstates. Fix: Measure before and after and log the real amount only when it is above 0, in both places; keep the existing fallback for a missing maximum. (F052)

## Repeats of open issues

These were seen again on 2d86b77 and are already filed. They were not re-verified.

| Issue | Cluster | What this run added |
|---|---|---|
| #40 | After a reload the tray says 'No dice thrown yet' although the player's roll is in the log (`tray-empty-after-reload`) | Seen on beta on the 1366x768 laptop after a Mixed Sway roll; a hub round trip without a reload keeps the tray (F096), so it is the reload alone. |
| #24 | The sheet's ability tab goes back to Role after leaving and returning (`ability-tab-resets`) | Still present on 2d86b77: Specialty to Circle and back lands on Role, on the 1920x1080 desktop. |
| #45 (Dispatch and End Assignment below the fold at 1440x900) | Dispatch and End Assignment are below the fold on a 1440x900 laptop with no scroll cue (`dispatch-below-fold-1440`) | Still true on beta; the middle column (formation papers) also runs off the bottom. Only a mouse wheel over the left column reaches the stamps. |
| #45 (milestone log line says nothing of what it gives) | 'The Lantern Wall milestone 3 reached!' is logged for a circle whose ability makes milestones meaningless (`milestone-line-meaningless`) | The line became the newest line on every desk right after Add 5 Illumination, and the Lightkeeper had to tell the table it meant nothing for a Nobody Left Behind circle. |
| #45 (Invite player says 'The player rejoins...') | Invite player on a brand-new campaign says 'The player rejoins with a new investigator' (`invite-rejoins-wording`) | Same wording on a brand-new campaign; also unclear whether Invite can reach a player by username. |
| #45 (waiting investigator's sheet cannot be opened from the hub) | A player cannot open their own investigator from the hub while the join request waits (`waiting-sheet-unopenable`) | Robert hit it himself while waiting with Pontius Aganus (one of his two findings). |
| #45 (Handwriting help prints the word twice) | The Join dialog shows 'Handwriting' twice (the label plus the info button's text) (`handwriting-label-twice`) | Also on the 1920x1080 desktop, not only the phone; a screen reader hears 'About Handwriting' then a button named Handwriting. |
| #16 (kept on purpose: the hourglass shows sand only) | The hourglass shows no tension number: 0 and 1 of 4 look alike, and with the timer on the tension cannot be read at all (`hourglass-no-number`) | With the timer running the sand shows the timer, so tension 2 and 0 looked the same to the Lightkeeper; DESIGN.md says the timer replaces the sand at the owner's request. Kept on purpose, so nothing to fix unless Robert reopens it. |
| #16 (kept on purpose: help is on demand) | Report key checkboxes do not say what each key means; the meaning is behind a small i (`report-key-meaning-hidden`) | Bram, new to the game, did not find the (i) beside the keys heading on the phone. Kept on purpose. |

## Not reproduced or by design

- **A missing assignment report is silent at Add Illumination and End Assignment, and its card shows a blank box** (`missing-report-silent`). By design. FAQ.md:226 sets the Add and End Assignment wording (End warns only when the tally is not added), DESIGN.md:270 makes an unfiled report a dashed stamp with a screen-reader word, and the Roster's circle file already prints '4 of 5 filed' and 'Pontius Aganus: No report yet' in visible text. The real cost (+4 unreachable) belongs to ghost-member-no-release. Whether to warn is listed as a decision for Robert.
- **After Create account the user cannot tell the account was made** (`silent-logout-on-401 (sign-up part)`). Harness artifact. On beta the 401s came from the testing environment's proxy; on a local copy Create account lands on the hub signed in. The silent logout on a refused session is real and is listed under UX.
- **Three entries on one page with the right page empty** (`notebook-pages-clip (layout part)`). By design: DESIGN.md asks for three entries to a page and a long page that scrolls inside itself; the fourth entry fills the right page. The headless browser hid the 5px scrollbar, which made the page look unscrollable.
- **The ghost member takes the last of five seats** (`ghost-member-no-release (seat cap part)`). Refuted: 'up to 5' is hint text in FinalizeRosterSlip.jsx:68; neither join nor approve enforces a member limit, so Pontius did not block a fifth real player.
- **The Text tool drops back to Select after each label** (`sketch-text-tool-drops (tool falls to Select)`). Not what happens: the Text tool stayed selected throughout; labels are lost for the reasons in the bug. Picking an ink while the last label is selected recolours it, which is by design.
- **Formation papers did not open by themselves after approval** (`F037, F042 (papers did not open)`). Logged as bugs, but the hub did update live on all four devices and the papers opening by themselves was never the design; the 12-second approval notice is kept as low UX (hub-approval-feedback).
- **Drives are not refilled at End Assignment** (`F127 (drives not refilled)`). Filed as rules, but the site follows the book: only a Refresh restores drives. The silence about it is kept as low UX (drive-refill-unexplained).

## UX

Items marked confirmed or partly were checked by a verifier, with severity from the verifier; the rest are low items, listed unverified with the triage severity. The first five are described in full.

| # | Item | Severity | Seats | Verdict |
|---|---|---|---|---|
| 1 | After the seal the Lightkeeper cannot see the circle's relationships, agreed or pending, anywhere (`lk-no-relationships-after-seal`) | medium | dm | confirmed |
| 2 | A refused session drops the user on an empty sign-in form with no message (`silent-logout-on-401`) | medium | dm | partly |
| 3 | The circle resource 'Press again' confirm lapses after four seconds with no cue and drops a second press under 500 ms (`spend-confirm-lapses-fast`) | low | ada, dev, bram, cass | unverified |
| 4 | The notice after Ask to join names the investigator in the third person, so players read it as someone else's request (`join-notice-third-person`) | low | robert, dev, ada | confirmed |
| 5 | An open key info slip covers the report's first key checkboxes, so clicks land on the slip (`info-slip-covers-keys`) | low | ada | confirmed |
| 6 | Approval reaches the hub only as a 12-second notice; after that nothing says the papers wait behind Play (`hub-approval-feedback`) | low | bram, ada, cass, dev | unverified |
| 7 | The keep-a-die choice is a moving target and each choice is announced twice (`keep-die-moving-duplicate`) | low | bram, ada, cass, dev | unverified |
| 8 | Nothing says drives do not refill at End Assignment, and the Lightkeeper's Reset drive button has no rule beside it (`drive-refill-unexplained`) | low | ada, dm | unverified |
| 9 | After End Assignment the player's tray still shows the last scene's roll and 'Roll settled' (`tray-old-roll-after-end`) | low | cass | unverified |
| 10 | 'A choice is waiting' stays on Dice and log when the only thing left is the optional Burn and reroll (`choice-waiting-badge-burn`) | low | bram | unverified |
| 11 | Private pass notes are not marked clearly: the sender's To: stays on the last private recipient, and the receiver's log line looks like any other (`private-note-cues`) | low | dm, ada | unverified |
| 12 | A posted sketch is scaled down so its text labels are about 8px and the Keep drawing button is cut off (`sketch-label-scale`) | low | dm | unverified |
| 13 | After a roll the drive stepper goes back to +0d and only the pips show that a point was spent (`nerve-stepper-spent-cue`) | low | bram, cass | unverified |
| 14 | Learn from My Mistakes is offered after a low roll even when every drive is already full (`lfmm-offer-drives-full`) | low | ada | unverified |
| 15 | End Assignment leaves the Timer switch on with an empty 0:00 face (`timer-switch-after-end`) | low | dm | unverified |
| 16 | On the upright tablet the pass-notes recipient list opens upward, mostly off the screen (`recipient-menu-offscreen-tablet`) | low | dev | unverified |
| 17 | On the tablet the Handwriting list in the Join dialog runs past the dialog and covers the sample line (`handwriting-select-overflow-tablet`) | low | dev | unverified |
| 18 | With a keyboard it takes 12 Tabs to reach the first drive stepper, there is no skip link, and the disabled 'one less' stepper takes focus (`keyboard-path-to-actions`) | low | cass | unverified |
| 19 | A Your Circle card shows a proposed relationship's name almost as if it were agreed (`pending-rel-looks-agreed`) | low | ada | unverified |
| 20 | The shared Chapter House box saves silently, with no 'Saved' like the personal answer has (`chapter-house-no-saved`) | low | dev | unverified |
| 21 | The Lightkeeper's 'Waiting for an answer from' line gives counts for some names and not others, so it reads ambiguously (`rel-waiting-line-counts`) | low | dm | unverified |
| 22 | A long circle name suggestion is cut to about 80 characters mid-word with no counter or warning (`circle-name-silent-cut`) | low | cass | unverified |
| 23 | The notebook's Preview button keeps its label while previewing, so there is no clear way back to editing (`notebook-preview-label`) | low | dev | unverified |
| 24 | On a phone, a tap on a fourth gear item shows nothing where the finger is; the limit message is off-screen (`gear-limit-feedback-offscreen`) | low | bram | unverified |
| 25 | The creator summary shows drive totals without which points came from the specialty and which were placed (`creator-drive-breakdown`) | low | ada | unverified |
| 26 | The sign-in page leaves a dark band under the map, and at 1366x768 Create an account is below the fold (`signin-fold-band`) | low | cass, ada | unverified |
| 27 | The Google button's frame has no accessible name, and the sign-up screen still says 'Sign in with Google' (`google-frame-unnamed`) | low | dm | unverified |

### After the seal the Lightkeeper cannot see the circle's relationships, agreed or pending, anywhere

`lk-no-relationships-after-seal` · medium · laptop 1440x900 (Lightkeeper)

The formation panel is the only place the Lightkeeper sees relationships, and it goes away at the seal. With six proposals still waiting (and acceptable after the seal), her Roster, every sheet and the Circle page showed none, while each player's Circle tab still listed them. DESIGN.md:284 says her circle page carries the same papers as the player's tab.

**Suggestion.** Add a read-only Circle Relationships paper to frontend/src/components/gm/CirclePage.jsx after Circle history, built from circleCreation.relationships (already loaded and kept live), marking each confirmed or 'waiting for <name>'. About 30 lines, no server change. (F047)

### A refused session drops the user on an empty sign-in form with no message

`silent-logout-on-401` · medium · laptop 1440x900 (Lightkeeper)

When a session is refused (for example the password was changed on another device), any page, the desk included, drops to an empty sign-in slip with no word of why and no username filled in. The verifier reproduced it on the hub and on a desk (WebSocket close 4401).

**Suggestion.** Add a sessionEnded flag set by an endSession() used only for 401s and 4401 closes, and show a status line on the sign-in slip: 'Your session ended. Please sign in again.' About 15 lines in gameStore.js and LoginScreen.jsx. (F001)

### The circle resource 'Press again' confirm lapses after four seconds with no cue and drops a second press under 500 ms

`spend-confirm-lapses-fast` · low · desktop 1920x1080, tablet 820x1180, phone 390x844, laptop 1366x768

All four players had a Stitch or Refresh go back to its idle label before their second press, so nothing was spent, and a press within about 300 to 500 ms of arming is ignored. The lapse is 4 seconds (CircleView.jsx:594, 603) and is written into DESIGN.md; every other confirm in the app stays armed until Escape or a press elsewhere. Agents are slower than people, which overstates it, but it hit every device.

**Suggestion.** Keep the armed state until the player presses elsewhere, like ConfirmAction.jsx, or show how long it lasts. A decision for Robert, since DESIGN.md sets the 4 seconds. (F093, F099, F124, F134)

### The notice after Ask to join names the investigator in the third person, so players read it as someone else's request

`join-notice-third-person` · low · Robert's desktop (Chrome), tablet 820x1180, desktop 1920x1080

After Ask to join the hub says '<Investigator> asked to join. The hub will say when the Lightkeeper answers.' It names neither 'you' nor the campaign. Robert, the one real person at the table, read it as someone else's request or an invitation; Ada and Dev logged the same. The Case Ledger beside it does say Awaiting approval, so nothing goes wrong in play.

**Suggestion.** In AppRouter.jsx:191 say 'You asked to join <campaign> with <name>. The hub will say when the Lightkeeper answers.' The campaign is already in the store at that point. (F011, F019, F025)

### An open key info slip covers the report's first key checkboxes, so clicks land on the slip

`info-slip-covers-keys` · low · desktop 1920x1080

Pressing the (i) beside '<Specialty> Illumination Keys' pins a slip directly over the key checkboxes; clicks and taps on the boxes land on the slip, which neither ticks the box nor closes, and hovering the slip keeps it open. Seen on the 1920x1080 desktop, reproduced on a phone. Same kind of problem as the #45 item about the reroll slip covering Burn and reroll, in a new place.

**Suggestion.** Pass a slipClassName at CircleView.jsx:763 so the slip opens above the heading (over the intro text, not the list). One line. (F109)

### The rest, briefly

- **Approval reaches the hub only as a 12-second notice; after that nothing says the papers wait behind Play** (`hub-approval-feedback`). While waiting, the hub gives no hint that it checks by itself (it polls every 15 seconds). On approval the hub did flip to In play live on all four devices, but the notice that says to press Play disappears after 12 seconds, so every player who looked later saw only 'In play' and had to find Play on their own. Agent turns are longer than 12 seconds, so this is partly a harness effect; a real player who looks away also misses it. Suggestion: Keep a lasting cue on the waiting row or the Case Ledger ('You are in: press Play for the formation papers') and say that the hub checks by itself.
- **The keep-a-die choice is a moving target and each choice is announced twice** (`keep-die-moving-duplicate`). After a gilded roll the keepable dice keep animating (up to 8px lift and a tilt) and the tray die and the result bar carry the same 'Keep the ... die' name, so a screen reader hears each choice twice. The test tool's 'element is not stable' on every device is mostly a tool artifact; the duplicate names are real, and the drift may make an edge tap miss on a phone. Suggestion: Give each choice one named control, and stop the shimmy on the die under the pointer or finger.
- **Nothing says drives do not refill at End Assignment, and the Lightkeeper's Reset drive button has no rule beside it** (`drive-refill-unexplained`). End Assignment resets ability uses, spends, Train dice and gear but not drives, which follows the book. Nothing on the Circle page or the log says so, and the Lightkeeper's per-sheet 'Reset drive and ability uses' button sits beside the spends with no hint, so it could hand out a free Refresh. Suggestion: One on-demand line that drives carry over and a Refresh restores them, and a hint on what the Reset button is for.
- **After End Assignment the player's tray still shows the last scene's roll and 'Roll settled'** (`tray-old-roll-after-end`). After End Assignment, without a reload, Cass's Investigator page still showed the last scene's Move roll and 'Roll settled', while dispatch, gear and reports had cleared. Suggestion: Clear the tray with the rest of the assignment.
- **'A choice is waiting' stays on Dice and log when the only thing left is the optional Burn and reroll** (`choice-waiting-badge-burn`). On the phone the header reads 'Dice and log, a choice is waiting' with a red dot after a kept die or a plain roll, when the only thing left is an optional Burn and reroll. Suggestion: No 'waiting' cue for an optional burn, or say what is waiting ('Burn and reroll available').
- **Private pass notes are not marked clearly: the sender's To: stays on the last private recipient, and the receiver's log line looks like any other** (`private-note-cues`). After a private note the Lightkeeper's To: line stays on that player, so the next quick note can go to one person instead of the table. On the receiving desk a private note looks like any other log line, with no private or unread mark. Suggestion: Return To: to @Circle after a private note (or show the recipient loudly), and mark private notes on the receiver's desk.
- **A posted sketch is scaled down so its text labels are about 8px and the Keep drawing button is cut off** (`sketch-label-scale`). A posted sketch is scaled to about half, so labels drawn at default size become about 8px on the notebook page, and 'Keep drawing' is cut off at the page bottom. Suggestion: Scale labels up when the sketch is shrunk, or draw on a canvas the size of the page.
- **After a roll the drive stepper goes back to +0d and only the pips show that a point was spent** (`nerve-stepper-spent-cue`). After spending a drive point and rolling, the stepper reads +0d and only a hollow pip shows the spend (phone and 1366x768 laptop). The tray does say 'Move +1d'. Suggestion: A short '1 Nerve spent' near the drive after the roll.
- **Learn from My Mistakes is offered after a low roll even when every drive is already full** (`lfmm-offer-drives-full`). Learn from My Mistakes is offered (Use or Skip) after a result of 3 or less even when every drive is already full, so Use can do nothing. The ability has no use limit, so nothing is lost. Suggestion: Skip the offer when no drive can take a point, or say so on it.
- **End Assignment leaves the Timer switch on with an empty 0:00 face** (`timer-switch-after-end`). End Assignment clears tension, dispatch and clock name but leaves the Timer switch on with an empty 0:00 face. Suggestion: Turn the switch off at End Assignment.
- **On the upright tablet the pass-notes recipient list opens upward, mostly off the screen** (`recipient-menu-offscreen-tablet`). On the upright tablet the pass-notes To: list opened upward with only its last option on screen. Possibly a harness effect (the list follows scroll and the shot came after a scroll). Suggestion: Check once on a real tablet; open the list downward when there is no room above.
- **On the tablet the Handwriting list in the Join dialog runs past the dialog and covers the sample line** (`handwriting-select-overflow-tablet`). On the tablet the Handwriting list in the Join dialog runs past the dialog, cuts off mid-option and covers the sample line, with no sign it scrolls. Suggestion: Keep the list inside the dialog, scrolling, without hiding the sample.
- **With a keyboard it takes 12 Tabs to reach the first drive stepper, there is no skip link, and the disabled 'one less' stepper takes focus** (`keyboard-path-to-actions`). With a keyboard it takes 12 Tabs from the top of the Investigator page to the first drive stepper and about 16 to a roll; there is no skip link and the disabled 'one less' stepper takes focus. Related to the #45 item about Burn and reroll after a roll, but this is the path before it. Suggestion: A skip link or heading jump to Actions, and skip disabled steppers.
- **A Your Circle card shows a proposed relationship's name almost as if it were agreed** (`pending-rel-looks-agreed`). A member's card in Your Circle shows a proposed relationship's name ('Coworker') almost as if agreed; only sepia pencil and a faint stamp outline mark it as waiting. Suggestion: Add a visible word such as 'proposed'.
- **The shared Chapter House box saves silently, with no 'Saved' like the personal answer has** (`chapter-house-no-saved`). The shared Chapter House box saves silently, with no 'Saved' like the personal answer, and nothing warns that saving replaces another player's text. Suggestion: Show 'Saved' and a short note that the box is shared.
- **The Lightkeeper's 'Waiting for an answer from' line gives counts for some names and not others, so it reads ambiguously** (`rel-waiting-line-counts`). The Lightkeeper's line 'Waiting for an answer from Cass Moreau, Bram Okafor (3 relationships) and Ada Quill (2 relationships)' reads as if Cass and Bram together owe 3. Suggestion: Give each name its own count.
- **A long circle name suggestion is cut to about 80 characters mid-word with no counter or warning** (`circle-name-silent-cut`). A very long circle name suggestion is stored cut at about 80 characters mid-word with no counter or warning (emoji and markup were shown safely). Suggestion: A maxlength or a counter.
- **The notebook's Preview button keeps its label while previewing, so there is no clear way back to editing** (`notebook-preview-label`). After Preview the button still reads Preview and the toolbar dims, so there is no clear way back to editing on the tablet. Suggestion: Change the label to Edit while previewing, or show a pressed state.
- **On a phone, a tap on a fourth gear item shows nothing where the finger is; the limit message is off-screen** (`gear-limit-feedback-offscreen`). On a phone a tap on a fourth gear item changes nothing near the finger; 'Three gear is the limit' appears in a status line off-screen. Suggestion: Show the hint by the tapped item.
- **The creator summary shows drive totals without which points came from the specialty and which were placed** (`creator-drive-breakdown`). The creator's summary shows drive totals without which points came from the specialty and which were placed, which is hard to check against the book. Suggestion: Show each total with its sources.
- **The sign-in page leaves a dark band under the map, and at 1366x768 Create an account is below the fold** (`signin-fold-band`). At 1366x768 Create an account is below the fold with no hint; at 1366x768 and 1920x1080 the bottom of the sign-in map is a flat dark band. Suggestion: Fit both buttons above the fold and let the map fill the window.
- **The Google button's frame has no accessible name, and the sign-up screen still says 'Sign in with Google'** (`google-frame-unnamed`). The Google button's frame has no accessible name, and the sign-up screen still says 'Sign in with Google'. Suggestion: Name the frame and request 'Sign up with Google' on the Enlist screen.

## Ideas

1. **The assignment report has no field for a line about what happened** (`report-text-line`). The Lightkeeper asked every player for a ticked key and a line on what happened; all four (phone, desktop, laptop, tablet) had nowhere to put the line and used table talk or the notebook. Not the same as #30. (F106, F110, F114, F116)
2. **An ally's Behind Me offer opens and lapses unseen: the Lightkeeper is not told who was offered, and the ally finds no trace of it later** (`behind-me-offer-unseen`). Bram's Behind Me offer for Ada's Brain mark opened and lapsed unseen: the Lightkeeper's status did not name who was offered and Bram's desk kept no trace. The 2-minute window works as the FAQ says, but at a table that takes turns the ally ability never comes into play. (F069, F072)
3. **Ticking the circle's Illumination questions writes no log line, so players do not see which were answered yes** (`tally-ticks-unlogged`). Players saw nothing of the three yes answers (+3) until Add Illumination; a log line would let them follow the tally. (F105)
4. **Nothing on the Circle page says what reaching 12 Illumination gives** (`illumination-track-purpose`). Bram and Cass did not know what 12 Illumination gives; an on-demand (i) would fit #16. The advancement dialog was not reached this run. (F126, F137)
5. **A mark on the Investigator page gives no hint or shortcut to Stitch it** (`stitch-from-marks`). Bram had a Bleed mark and spending was open, but the Investigator page gave no hint that Stitch lives on the Circle page; he guessed. (F090)
6. **After reports close, the Circle page keeps no record of the keys a player filed** (`filed-keys-after-close`). After End Assignment nothing on the Circle page records the keys a player filed or that they counted. Fits #31 (loosely). (F132)
7. **The Lightkeeper cannot sketch a map privately and reveal it later; Sketch and Photo exist only in public Field Notes** (`private-sketch-prep`). The Lightkeeper wanted to rough out a map before showing it; Private Notes and Lightkeeper Resources are text only. Adds 'prepare privately, reveal later' to Robert's note on #34. Fits #34. (F006)
8. **The creator's path carousel has no list or names to jump to a path; finding Soldier took ten taps on a phone** (`creator-path-jump`). Finding Soldier took ten taps on the phone: the path carousel has only arrows and a counter. (F014)
9. **The New campaign form does not suggest a code from the campaign name** (`campaign-code-suggest`). The Lightkeeper had to make a code up; a suggestion from the campaign name would save a step. (F007)

## Keep

What worked well and should survive any change:

- **Every desk stays current without a reload.** On every device (phone, tablet, laptops, desktop) the seal, dispatches, tension, timer, other players' rolls, Stitch/Refresh spends, relationship proposals and accepts, votes and the hub's Waiting to In play change all arrived live. A hub round trip mid-scene kept the tray (F096). (F034, F056, F062, F065, F073, F080, F091, F094, F096, F131, F058, F043)
- **Rolls follow the rulebook and the tray explains them.** Pool sizes, the gilded keep choice with outcome and drive effect labelled, criticals, Burn and reroll with rating only, and drive refunds all matched the rules. A keyboard-only roll works, and button names state the bonus. A first-time phone player found it unaided. (F049, F054, F071, F074, F077, F098)
- **Double-clicks and edge inputs do not duplicate anything.** Rapid votes, a double-click on Roll, Enter twice on a keep die, a double resend of a report, a double-click on an armed spend and a double Accept each did exactly one thing. Hostile text was shown safely. (F040, F059, F113, F133, F138)
- **The character creator is clear on every screen.** Caps are enforced with plain messages ('Three gear is the limit...'). Steps lock, counters and checklists tick, the portrait upload works, and the summary lists everything before saving. (F009, F015, F020, F027)
- **Join, approval and the seal flow cleanly for the Lightkeeper.** Waiting is explained on the hub. View sheet has Approve at the top and moves on to the next request. Finalize warns on its first press and names every empty part. The seal flows at once into the dispatch, the roster charter and the log. (F010, F022, F023, F046)
- **The Lightkeeper's table bookkeeping is quick and always logged.** Dealing marks, secret and open rolls, pass notes, dispatches, tension, the timer, opening reports and End Assignment each take one or two presses. Each writes a clear log line. A whole round's bookkeeping took about two minutes, and End Assignment resets what it says. (F067, F087, F102, F120)
- **Reports and the Illumination tally are right and clear.** Filing a report works on phone, tablet and desktop, with big boxes, a REPORT SENT stamp and Amend. The tally follows p. 55 (3 questions + 2 for some keys = 5), adds once and is logged. (F107, F111, F115, F117)
- **Circle resource spends land correctly.** Stitch clears marks and Refresh restores drives and resistances. The counters, 'Your spends n / 2' and the log update at once. The state after End Assignment matched what the Lightkeeper was told. (F088, F101, F123, F128)
- **Notebook, photos, sketch and pass notes work smoothly.** Markdown preview renders in handwriting. Photos post with captions from a tablet. The sketch tools are fast, with named inks and a Discard guard. Private pass notes show the sender and recipient. (F005, F063, F081, F083)

## The players' view

**The Lightkeeper (laptop 1440x900, mouse).** On the 1440x900 laptop the Lightkeeper ran the whole assignment without stopping the table: approvals from the sheet, the seal, dispatches, marks, open and secret rolls, tension, the timer, reports and End Assignment each took one or two presses and wrote a clear log line, and she always knew what the sheets said. What cost her was Pontius: no way to release him, resources she had to correct by hand, and a tally that could never give 'all'. She also lost sight of relationships after the seal, lost sketch labels while improvising the map, and had to wheel-scroll to reach Dispatch and End Assignment. Her first turn was lost to a harness proxy problem, not the site.

**Ada (desktop 1920x1080, mouse).** On the 1920x1080 desktop Ada, the rules lawyer, found the numbers right: pool sizes, gilded choices, a critical, refunds, and the Illumination tally (3 questions + 2 for some keys = 5, p. 55) all matched the book, and the on-demand rules text let her check quickly. The one rules-side slip was a Well-Read log line claiming a refund the cap swallowed. What got in the way: the spend confirm lapsing in a few seconds, the key info slip covering the checkboxes, the map she was sent to being unreachable from the notebook Contents, and silence on things the book decides (drives between assignments, the empty fifth seat).

**Bram (phone 390x844, touch).** On the 390x844 phone Bram, new to tabletop games, played the whole session unaided: the roll flow, the big report boxes and the REPORT SENT stamp were clear, and his desk never needed a reload. The 'Press again' confirm lapsing before his second tap, keep-die taps that missed at first (partly the test tool), a long Circle page and no line on the report were the friction. He did not open the Circle page until round 3, so relationship proposals waited, and he never saw his Behind Me offer.

**Cass (laptop 1366x768, mouse and keyboard).** On the 1366x768 laptop Cass tried to break things and mostly could not: double-clicks, Enter twice, a double resend, a reload mid-choice and a hub round trip mid-scene each did exactly one thing and lost nothing, and a keyboard-only roll worked. What broke: a reload empties the dice tray (#40), the notebook Contents hid entries at her screen size, the old roll stayed in the tray after End Assignment, and the spend confirm swallowed a quick second click.

**Dev (tablet 820x1180, touch).** On the 820x1180 tablet Dev kept the story in the notebook: Markdown, photos with captions and the closing note all posted and rendered well, and the desk stayed live. What got in the way: no line on the report (the closing note went into the notebook instead), Nerve showing '0 of 1' that no Refresh fills, the spend confirm lapsing on touch, the pass-note recipient list opening off-screen, and Pontius still listed in the circle.

Robert (his own desktop, Chrome) only reached the waiting screen before he left. His two findings: the join notice reads like someone else's request (new, confirmed: `join-notice-third-person`) and he could not open Pontius while waiting (already on #45).

## Method notes

- Clear the testing environment's proxy before play: the Lightkeeper's first turn was lost because the proxy refused requests that carried their own sign-in token, and a machine restart before approvals needed start_all.sh, which reloaded her desk.
- Settle the human seat before approvals: Robert left after Pontius was approved, which turned the run into a test of a release feature that does not exist; once Release is built, rerun the drop-out case on purpose.
- Seats act minutes apart, so time windows (the 12-second approval notice, the 4-second spend confirm, the 2-minute Behind Me offer) are mismeasured; test them with a timed script or a seat that waits in place, and say so in the finding.
- The test tool's 'element is not stable' on the animated dice and the headless browser's hidden scrollbars made several findings look worse than they are; use a trial click, check by hand, or run with visible scrollbars.
- The story never reached a scar, incapacitation, a death, the timer running out or advancement (the track ended at 5 of 12); add a short scripted side check, or seed a circle near 12, so those flows get exercised.
- Finding IDs in some turn summaries were wrong (Dev's round 1 summary lists Cass's F059 to F061, Ada's round 1 list includes Bram's F055 and F056); have finding.js print the ID it assigned and copy that.
- The Lightkeeper's turn 1 screenshots were overwritten when turn 2 numbered from 001 again, so F001's and F002's shots are gone; keep screenshot numbers running across turns.
- Keep at least one real person for the whole session: Robert's two findings came from the only human eyes, and a person would settle what the AI seats judged as artifacts (keep-die taps, the 4-second confirm).

Inputs: /home/user/pt3 (README.md, personas.md, table.md, results/, memory/, findings.jsonl, issues.md, triage_result.json, verify_result.json). Verifier scripts and screenshots: /home/user/pt3/verify/.
