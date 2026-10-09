# Candela VTT playtest report: The Drowned Bell

For Austin (who wrote the app) and the group's organizer. Five AI playtesters ran a full session of Candela Obscura on a private copy of the site on 8 October 2026: a Lightkeeper on a 1440x900 laptop, Ada on a 1920x1080 desktop, Bram on a 390x844 phone, Cass on a 1366x768 laptop and Dev on an 820x1180 tablet, plus a test engineer for one stress beat. They logged 277 findings; the problems were grouped into 122 clusters and 113 of those were re-tested on a fresh copy of the site, almost always with the cause found in the code.

## The short version

- **The game itself works.** The session ran start to finish: accounts, characters, joining, circle formation, five scenes, reports, advancement and spending. Every Lightkeeper change reached every screen live, and every dice result checked against the rulebook came out right.
- **Four high-severity bugs can change a game's numbers.** A reload during a gilded choice erases the roll and allows a free reroll; a roll during a short connection stall can count twice; the assignment report forgets it was sent, so a second Send replaces the filed keys; and a double-click on a circle resource spends it twice. Two of the four fixes are small and two are medium.
- **The Illumination tally is done by hand and went wrong.** Nothing totals the reports or applies the book's key rule, and the circle advanced about 5 Illumination early.
- **Changes arrive silently.** All four players found new dispatches, tension, timers, private notes and open reports only by going to look. On the phone and tablet the hourglass and timer are never near the dice, and at laptop heights the desk is locked to the window, so the timer and the log get cut off.
- **The desk forgets what it was showing.** A reload, a second tab or a hub trip empties the Activity Log; 'Later' on the advancement dialog leaves no way back; a waiting player never hears they were approved.
- **Keep:** the live desk, the by-the-book dice, the character creator, the Notebook's paper feel, the honest connection banners, and the double-click guards on everything except resource squares.

## Fix these first

The ten changes that would most improve the next real session, in order:

1. On reconnect, send back any gilded roll still waiting for its Keep choice, so a reload can no longer erase a roll, lose its drive and allow a free reroll (S). (`gilded-reload-free-reroll`)
2. Give every roll a roll id the server de-duplicates, stop telling players to roll again when a reply is merely late, and add an offline listener and heartbeat so a silent drop is shown and no mark goes into a dead socket (M). (`offline-roll-double`, `offline-not-shown`)
3. Make the assignment report read back what was filed and keep ticks across tab switches, refuse silent overwrites, and have End Assignment close and clear reports (M). (`report-forgets-sent`, `key-ticks-lost`, `end-assignment-reports-open`)
4. Guard circle resource spends against double-clicks with a cooldown and a short Undo, and give the Lightkeeper a logged 'give a spend back' control (S to M). (`resource-double-click-double-spend`, `resource-spend-no-guard`, `lk-resource-repair`)
5. Put the Illumination tally on the Lightkeeper's report page, with the three questions answered once for the circle and the book's 2/4/0 key rule applied in one press, so the circle advances on the right number (M). (`report-questions-tally`)
6. Keep a short Activity Log history on the server and replay it on every connect, clearing stale 'Not connected' slips when the desk comes back (M). (`activity-log-not-persisted`, `stale-connection-slips`)
7. Log every Lightkeeper table event (dispatch, tension, timer, reports) and put a 'new' dot on the phone's Menu and drawer rows until the player has looked (M). (`silent-table-changes`)
8. Keep the table in view: a compact tension, timer and newest-log strip on the phone, the tablet and every non-Roster section, and inner scrolling for the side columns at laptop heights (S to M). (`hourglass-offscreen-small-screens`, `section-hides-table-column`, `left-rail-squeezed`, `log-squeezed-by-slip`)
9. Never let something waiting for a player disappear: a 'Choose advancements (N)' button after Later, Behind Me offers that last as long as the server window, and a hub that notices approval on its own (S to M). (`advancement-later-no-way-back`, `ability-offers-expire`, `pending-join-not-live`)
10. Make the dice say what they will do: show the capped dice count, name the outcome and drive refresh on each gilded choice, and close Burn and reroll once the table has moved on (S to M). (`rule-of-six-stepper`, `gilded-choice-unexplained`, `burn-offer-stale`)

If the group's next session starts a new campaign, also fix circle formation first: stop re-sorting names (`name-vote-reorders`), break ties the same way everywhere (`vote-tie-leading`), merge case duplicates (`name-case-duplicates`) and keep the relationship question out of the answer box (`relationship-question-in-answer`). Three of these are S.

## The session

In the fog-bound harbour town of Saint Aldric, a church bell that sank with its tower forty years ago has started ringing under the water, and each time it rings someone in town forgets a person they loved. The Lightkeeper, Rue, sent the circle that named itself The Ninth Night: Dr. Imogen Thale (Ada, a Scholar/Doctor), Jonah Hale (Bram, a Muscle/Soldier), Cassandra 'Latch' Moreau (Cass, a Slink/Criminal) and Edda Rook (Dev, a Weird/Occultist), working out of The Empty Office under the Compass, with Nobody Left Behind as their circle ability. At the harbour office, Harbourmaster Wendell Pike could not remember the partner who had worked beside him for thirty years, and while the circle worked the bell rang early, under the water. Imogen's examination drew out that the man had lost a fingertip to a winch, Edda read a second handwriting fading out of the tide ledger ('Taking the skiff out to look. Back by ten.'), and Latch picked a nameless eighth locker to find his oilskin, a wedding ring and a photograph of his widow, Nell: the missing man was Tam Carrow. Through Edda's Let Them In question they learned that a drowned congregation pulls the bell rope through Tam's hand and that every name the bell reads becomes a soul for its pews. In the flooding crypt, with a three-minute countdown on every screen, they escaped on Latch's best roll at a cost: the Doctor's shin split, Jonah half drowned, Latch's wrist ringed red and Edda marked. On the tower top at the turn of the tide, with the hourglass run empty, Edda took the fourth ring through her own body and, in the voice of the drowned curate Parson Absalom Grey, forbade the banns; the congregation let go. Jonah, who never let go of the rope, hauled the bell's tongue out of the belfry, so the bell now swings in silence. Latch's blade cut Tam's painter only halfway, and that was the price: Tam's name stays read and Saint Aldric will never remember him. At dawn each investigator had a quiet moment (Edda read her list of names to Nell, Latch left Tam's ring by the empty cup). Afterwards the circle filled its Illumination track (counted generously: see `report-questions-tally`), advanced with Stamina Training, and each investigator took two advancements.

### Timeline

Times are the table clock (UTC); 00:00 is 5:00 PM Pacific.

| Phase | What happened |
|---|---|
| Campaign (00:02-00:12) | Rue signs up; on the fresh database the first Create account fails with a 500 and works on retry. She creates The Drowned Bell (code drowned-bell); the desk shows 'connection dropped' for a second, then she tours every tool: roster, dispatch, hourglass and timer, dice, log, notes, Circle, Notebook, map. |
| Investigators (00:12-00:21) | Four players sign up and build investigators on a desktop, a phone, a laptop and a tablet, then ask to join. The creator works on every device; small issues: each step opens scrolled down, two pen fonts never load, the final summary is thin. |
| Approval (00:21-00:26) | Requests appear live on the Lightkeeper's desk with a polaroid per approval. No player's hub notices the approval; each had to press Check again. |
| Circle (00:26-00:45) | The formation papers open on every desk. The circle votes the 'incredibly heroic' question, the name The Ninth Night (after a case-duplicate and a vote that landed on a re-sorted row), Nobody Left Behind and the Compass; Ada writes the shared chapter house; twelve relationships are offered, one garbled by the question being pasted into the answer. Rue seals the charter with four relationships pending; they are accepted afterwards. |
| Ready (00:45) | Seal, dispatch to the harbour office of Saint Aldric and the hourglass named 'Before the bell rings' reach every desk live; the papers close by themselves. |
| Scene 1, the harbour office (00:45-01:22) | First rolls: Imogen's Focus success, Jonah's Survey mixed, Latch's critical Hide, Edda's failed Read burned to a mixed. Rue makes an open and a secret roll, raises tension to 1 and starts a 30-minute timer; players see it all live but only by going to look. The bell sounds early, under the water. |
| Scene 2, the eighth name (01:22-01:45) | Pike remembers the winch on the Mary Dunne and the eighth name on the photograph fades to T. C...rrow: Tam Carrow. Rue sets a Bleed mark on Edda (no Let Them In fires, so the question is asked by hand), passes a private note to Jonah (Nell Carrow and the belfry key) and re-sends the dispatch. Edda's critical Sense hears the next name forming, and the answer to her question reveals Tam's hand on the bell rope. |
| Scene 3, the flooded crypt (01:45-02:09) | A 3-minute countdown runs out on time on every desk. The circle escapes on Latch's 6. Bram's Behind Me offer for the Doctor expires before he can tap it. Rue puts Edda's Bleed mark on the Doctor by mistake (02:06) and has to undo it in three public log lines. |
| Scene 4, the tower top (02:09-02:33) | Tension 4 of 4 and a 20-minute timer. Edda takes Bleed 3 and forbids the banns; Jonah tears out the bell's tongue; Latch's Strike fails and she uses Death Defy; the price is Tam. |
| Scene 5, epilogue and reports (02:33-02:50) | Tension back to 0, dawn dispatch, Illumination 3 of 12, reports opened. Every player finds the report form forgets it was sent; Cass's resend replaces her first report. |
| Stress beat (02:52-03:01) | The test engineer fires three rolls in the same millisecond (identical on all five desks), reloads during a gilded choice (the roll vanishes), rolls during a network stall (counted while the roller is told 'not thrown'), and opens a second tab (clean handoff, stale slip). |
| Wrap (03:07-03:29) | Rue tallies 12 Illumination by hand, advances the circle with Stamina Training and ends the assignment. Three players dismiss the advancement dialog (Later or Escape) and must reload to get it back; each takes two advancements; between-assignment spending opens and Cass's double-click spends two Refreshes. Exit notes, and the case file closes under N. |

### In numbers

- 277 findings: 42 bugs, 2 rules problems, 153 confusing or awkward moments, 29 ideas and 51 things to keep.
- By seat: Lightkeeper 59, Ada 57, Cass 55, Bram 51, Dev 48, test engineer 7.
- 122 problem and idea clusters plus 11 praise themes. 113 clusters were reproduced on a fresh copy: 96 confirmed, 16 partly confirmed and 1 working as designed; 9 (mostly ideas) were not re-tested. Eight serious ones got a second adversarial check; all eight stood, two at a lower severity.
- In this report: 44 bugs and rules problems (4 high, 24 medium, 16 low), 67 UX items, 10 ideas, 11 praise themes, and 27 claims that did not hold up or proved deliberate.
- About 3 h 27 min of table time (00:02:41 to 03:29:20 on the table clock, UTC; 5:02 PM to 8:29 PM Pacific on 8 October 2026), 103 table messages.

## Bugs and rules problems, ranked

Ranked by harm to a real session: lost data and wrong numbers first, then blocked actions, then visible defects; ties go to the bug more seats hit. Severity is the verifier's (or the adversarial check's) where it differs from the playtester's.

| # | Severity | Bug | Seen on | Effort |
|---|---|---|---|---|
| 1 | High | The assignment report forgets it was sent, so a second Send silently replaces the filed keys (`report-forgets-sent`) | phone 390x844, desktop 1920x1080 | M |
| 2 | High | Reloading during a gilded choice makes the roll vanish and lets the player roll again (`gilded-reload-free-reroll`) | test engineer, phone 390x844 | S |
| 3 | High | A roll during a short connection stall is reported 'Not thrown, roll again' but still reaches the table, so the player rolls twice (`offline-roll-double`) | test engineer, tablet 820x1180 | M |
| 4 | High | Double-clicking a circle resource square spends it twice and uses up both of the player's between-assignment spends (`resource-double-click-double-spend`) | laptop 1366x768 | S |
| 5 | Medium | Nothing totals the assignment reports, the book's key rule is missing, and the circle advanced about 5 Illumination early (`report-questions-tally`) | desktop 1920x1080, Lightkeeper laptop 1440x900 | M |
| 6 | Medium | The Activity Log lives only in the tab: a reload, a second tab or a hub trip wipes every roll and pass note (`activity-log-not-persisted`) | laptop 1366x768 | M |
| 7 | Medium | Picking a relationship question pastes it into the answer box, so answers are spliced into the question and sent garbled (`relationship-question-in-answer`) | phone 390x844, desktop 1920x1080, tablet 820x1180 | M |
| 8 | Medium | The drive spend stepper promises dice past the Rule of Six: Focus shows '+5d', then rolls +4d (`rule-of-six-stepper`) | desktop 1920x1080 | S |
| 9 | Medium | 'Burn and reroll' stays offered long after the roll was settled, and the server still accepts it (`burn-offer-stale`) | phone 390x844 | S |
| 10 | Medium | Behind Me and Death Defy offers vanish on a 20-second client timer, though the server would accept them for 2 minutes (`ability-offers-expire`) | phone 390x844, laptop 1366x768 | M |
| 11 | Medium | A mark the Lightkeeper sets through Edit trauma record skips every ability that reacts to marks (`lk-mark-skips-abilities`) | Lightkeeper laptop 1440x900 | S |
| 12 | Medium | Tied votes: both names say 'leading', insignia marks no leader in words, and the seal breaks ties by database row order (`vote-tie-leading`) | desktop 1920x1080, phone 390x844 | M |
| 13 | Medium | Suggested circle names re-sort live by votes, so a click can land on a different name (`name-vote-reorders`) | desktop 1920x1080, phone 390x844 | S |
| 14 | Medium | Circle name suggestions accept case and spacing duplicates that split the vote (`name-case-duplicates`) | tablet 820x1180, laptop 1366x768 | S |
| 15 | Medium | Advancement log lines name the wrong action: gilding Read is announced as 'gilded their sneak action' (`advancement-log-raw-keys`) | tablet 820x1180 | S |
| 16 | Medium | Before the seal the Lightkeeper's Circle page says each resource is '1 of 1' and 'refills to 1 (1 plus the circle's members)' with four members (`circle-resources-pre-seal`) | Lightkeeper laptop 1440x900 | S |
| 17 | Medium | A field entry's sketch or photo caption silently replaces the title the player typed (`sketch-caption-replaces-title`) | tablet 820x1180 | S |
| 18 | Medium | Illumination key ticks made during the assignment are thrown away when the player leaves the Circle tab (`key-ticks-lost`) | tablet 820x1180 | S |
| 19 | Medium | When the network goes quiet without closing the socket, the desk shows nothing, and in a longer drop a mark is lost silently (`offline-not-shown`) | test engineer | S |
| 20 | Medium | End Assignment leaves reports open with the finished assignment's reports still filed (`end-assignment-reports-open`) | Lightkeeper laptop 1440x900 | M |
| 21 | Medium | After a tab handoff or a reconnect the desk keeps a stale 'Not connected... roll again' slip and never catches up (`stale-connection-slips`) | test engineer, desktop 1920x1080, laptop 1366x768 | S |
| 22 | Medium | Field entries with a sketch or photo, and redrawn sketches, never reach other desks or the log (`notebook-uploads-not-broadcast`) | tablet 820x1180, Lightkeeper laptop 1440x900 | S |
| 23 | Medium | After 'Later' or Escape on the Circle Advancement dialog, nothing brings the picks back without a reload (`advancement-later-no-way-back`) | desktop 1920x1080, phone 390x844, laptop 1366x768 | S |
| 24 | Medium | A waiting player's hub never learns of the approval, and a pending request cannot be opened or withdrawn (`pending-join-not-live`) | desktop 1920x1080, phone 390x844, laptop 1366x768 | M |
| 25 | Medium | On a fresh database the first sign-up fails with a 500 and the first campaign's desk drops its connection once (`seed-id-sequence-collision`) | Lightkeeper laptop 1440x900 | S |
| 26 | Medium | Focus falls to the page whenever a focused button is disabled or replaced, so keyboard users lose their place (`keyboard-focus-dropped`) | laptop 1366x768 | M |
| 27 | Medium | On a phone the circle name row overflows: only a 9 px sliver of Suggest shows and the papers scroll sideways (`suggest-button-offscreen-phone`) | phone 390x844 | S |
| 28 | Medium | After one approval the remaining join requests lose their pronouns and catalyst (`join-requests-lose-details`) | Lightkeeper laptop 1440x900 | S |
| 29 | Low | Patch Up is offered as a rider on every Focus roll, so one investigation roll also heals an ally (`patch-up-free-rider`) | desktop 1920x1080 | M |
| 30 | Low | Notebook contents print a page number that the page itself does not use (`notebook-toc-page-number`) | phone 390x844 | S |
| 31 | Low | Your Circle shows an accepted incoming relationship as '(not yet accepted)' when you have not proposed one back (`your-circle-pending-label`) | tablet 820x1180 | S |
| 32 | Low | Every player's desk receives every other player's full assignment report (`reports-broadcast-all`) | laptop 1366x768 | S |
| 33 | Low | The 30-day login token travels in the WebSocket URL and is printed in the browser console on every failed reconnect (`ws-token-in-url`) | laptop 1366x768 | M |
| 34 | Low | Handwriting choices 'Reenie Beenie' and 'Moondance' render in plain serif because the names are misspelled (`pen-fonts-missing`) | phone 390x844, desktop 1920x1080 | S |
| 35 | Low | Double-clicking 'Save and join a campaign' opens the join dialog and closes it again at once (`join-dialog-double-click`) | laptop 1366x768 | S |
| 36 | Low | A refused Patch Up leaves a red slip for minutes, and an answered prompt comes back after visiting the Notebook (`patch-up-prompt-stale`) | desktop 1920x1080 | S |
| 37 | Low | A long circle name suggestion runs off its row, and the field has no length limit (`long-name-overflow`) | tablet 820x1180, laptop 1366x768 | S |
| 38 | Low | Your Circle cards and the Lightkeeper's polaroids change order between visits (`roster-order-unstable`) | laptop 1366x768 | S |
| 39 | Low | A role ability taken by advancement is filed under the Specialty tab with the specialty's heading (`advanced-role-ability-wrong-tab`) | tablet 820x1180 | S |
| 40 | Low | The Style written in the creator is saved but never shown anywhere (`style-never-shown`) | laptop 1366x768 | S |
| 41 | Low | A multi-line catalyst runs together into one paragraph on the sheet (`catalyst-linebreaks`) | tablet 820x1180 | S |
| 42 | Low | The screen-reader timer status keeps saying 'Time's up.' after the timer is cleared or switched off (`timer-status-stale`) | Lightkeeper laptop 1440x900 | S |
| 43 | Low | The Handwriting picker is announced as a listbox, but arrow keys do nothing and Escape closes the whole dialog (`pen-listbox-no-arrows`) | laptop 1366x768 | S |
| 44 | Low | A stray strip of tape floats on the desk under the circle charter (`stray-tape`) | Lightkeeper laptop 1440x900 | S |

### 1. The assignment report forgets it was sent, so a second Send silently replaces the filed keys

Bug, high severity, confirmed on a fresh copy. Key `report-forgets-sent`, area circle-page. Seen on: phone 390x844 (Bram), desktop 1920x1080 (Ada). Effort M.

**What happens.** After Send report, the 'REPORT SENT' stamp sits over six empty boxes, so the player cannot see what they filed. Leave the Circle tab and come back and the form is blank and live again, with 'Reports open' and an enabled Send. The server keeps one report per investigator and overwrites it, so a second Send (even an empty one) replaces the keys that were filed, and the Lightkeeper's card still says 'Report filed' over a row of crosses. Cass resent at the table and her second report replaced the first. All four players hit it at the table (table #86, #87, #90, #91).

**To reproduce.** 1. Lightkeeper opens reports. 2. A player ticks two keys and presses Send report. 3. Switch to the Investigator tab and back to Circle. 4. Press Send report again with nothing ticked and look at the Lightkeeper's card.

**Cause.** CircleView.jsx:424 keeps 'submitted' in local useState, and MainDeskView.jsx:270 unmounts CircleView whenever another tab is shown, so the flag is lost. handleSubmitReport (CircleView.jsx:483-485) clears the ticks straight after sending. The form never reads the report the desk already holds (circleCreation.reports or circle.backstory_answers.reports). backend/vtt/ws/handlers/circle.py:38 overwrites reports[char_id] with no check.

**Fix.** Derive 'sent' from the stored report (myReport = circleCreation.reports[myId] ?? circle.backstory_answers.reports[myId]), show the filed ticks read-only under the stamp, disable Send while a report exists, and delete the reset at CircleView.jsx:483-485. Clear stored reports when a new assignment's reports open, guarded so that closing and reopening mid-round does not wipe them, and drop circleCreation.reports when a circle_update arrives without reports. Optionally have circle.py refuse a second report unless the payload says replace.

Findings F219, F220. Screenshots: `shots/bram/135_t8_ticked.png`, `shots/bram/136_t8_sent.png`, `shots/bram/141_t8_report_back2.png`, `verify/out_8409/r04_bram_back.png`, `verify/out_8409/r10_gm_imogen_card.png`.

### 2. Reloading during a gilded choice makes the roll vanish and lets the player roll again

Bug, high severity, confirmed on a fresh copy. Key `gilded-reload-free-reroll`, area dice. Seen on: test engineer (stress beat), phone 390x844 (Bram). Effort S.

**What happens.** If a player reloads while the 'Keep one die' choice is open, the roll is gone: no Keep bar, the roll buttons are live again, and no desk has a log line for it, because a gilded roll is only logged once a die is kept. The drive spent on it was already taken and stays lost. The next roll silently replaces the held one, so a player can reload away a bad gilded roll. The server still has the roll in memory; it just never offers it back.

**To reproduce.** 1. Roll a gilded action with a pool of 2 or more (for example Control 2, gilded, plus 1 Nerve). 2. Reload the page before keeping a die. 3. Look at this desk and the other desks' logs, then roll again.

**Cause.** backend/vtt/ws/endpoint.py:131-134 sends only character_update and circle_update on connect, never the roll waiting in _pending_gilded (rolls.py:32, set at :76-81). pendingGildedChoice is not in the store's persisted state (gameStore.js:1636-1646), so the roll buttons unlock. The next roll pops the held one (rolls.py:71). The drive is charged and committed before the choice (rolls.py:295-304).

**Fix.** On connect, if _pending_gilded holds a roll for this character, send it as a roll_result (it already carries action and drive_spent_key). The existing handler then restores the Keep bar and blocks rolling. The verifier tested exactly this on a scratch copy: after a reload the same dice came back and keeping one logged the roll on all three desks. Add a regression test that opens a second socket and expects the held roll.

Finding F233. Screenshots: `shots/stress/t2_bram_2600ms.png`, `shots/bram/144_t5_after_reload.png`, `verify/out_8422/reload_A_2_after_reload.png`, `verify/out_8422/fix_2_after_reload.png`.

### 3. A roll during a short connection stall is reported 'Not thrown, roll again' but still reaches the table, so the player rolls twice

Bug, high severity, confirmed on a fresh copy. Key `offline-roll-double`, area connection-sync. Seen on: test engineer (stress beat), tablet 820x1180 (Dev). Effort M.

**What happens.** If the connection stalls for more than 6 seconds without closing (the kind of Wi-Fi or mobile blip that TCP survives), the desk says 'Not thrown. The dice did not come back from the table. Reconnecting; roll again in a moment.' But the roll had reached the server: it is logged on every other desk and the drive is spent. The roller never sees that result. Doing as told gives a second roll with drive spent again; in the verification the second roll turned a Mixed success into a Failure. The playtest's stale 'Not thrown' bar was still on the tablet at End Assignment.

**To reproduce.** 1. Stall the desk's connection for 6 to 10 seconds without closing the socket. 2. Roll. 3. Let the connection resume after the 'Not thrown' message, then roll again as told. 4. Compare the roller's desk with the Lightkeeper's log.

**Cause.** frontend/src/store/gameStore.js:64-81 (sendRoll) treats a frame already handed to socket.send as failed after ROLL_REPLY_MS = 6000 and reconnects, with no roll id to match a late result. backend/vtt/ws/handlers/rolls.py:233-316 rolls and commits every frame whenever it arrives, sends roll_result only to the sockets on the channel at that moment, and the new socket gets nothing about it (endpoint.py:133-134).

**Fix.** Make rolls idempotent. The client adds a roll_id (crypto.randomUUID()); on the 6 s timeout it keeps the frame queued, shows 'Waiting for the table...' rather than 'roll again', and resends it with the same id after reconnecting. The server remembers the last roll_id and result per character and answers a duplicate by resending the stored result on that socket only, without rolling or charging again. Show 'Not thrown' only when the frame never left. The client should ignore a roll_id it has already handled, so a late duplicate does not replay the dice.

**Note.** The playtest used Playwright's setOffline, which holds frames on an open socket in Chromium (a known harness quirk). The refuter reproduced the double roll with a real Chromium socket through a TCP stall proxy, so it is not a harness artifact.

Finding F237. Screenshots: `shots/stress/t4b_dev_offline_roll.png`, `shots/stress/t4b_dev_back.png`, `verify/out_8420/dbl_v1_07s.png`, `verify/out_8433/tcp_b_gm_retry.png`.

### 4. Double-clicking a circle resource square spends it twice and uses up both of the player's between-assignment spends

Bug, high severity, confirmed on a fresh copy. Key `resource-double-click-double-spend`, area circle-page. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** A double-click on a Stitch, Refresh or Train square sends two spends: the pool drops by two, two identical log lines appear, and 'Spent this assignment 2 / 2' locks the player out. Cass's double-click took Refresh from 3 to 1 (the second Refresh did nothing, her drives were already full) and she could no longer Stitch her Bleed mark. It also happens with two clicks 180 ms apart and with Enter pressed twice. Every other commit button (Roll, Keep, Send report, Confirm advancement) already ignores a second click; these squares do not. The Lightkeeper cannot give the spend back (see lk-resource-repair).

**To reproduce.** 1. Lightkeeper presses Allow spending. 2. A player double-clicks one Refresh square. 3. Look at the pool, the counter and the log.

**Cause.** CircleView.jsx:723 (click) and :726 (key) call handleResourceClick on every event; :456-465 check only resources_editable and spent < 2; spendCircleResource (gameStore.js:1099-1107) sends straight away with no pending flag. The server is right to accept two separate spends. An in-flight lock alone would miss the 180 ms case, because the server had already answered before the second click.

**Fix.** Guard the spend gesture: keep a lastSpendAt ref and ignore a second spend within about 800 ms, and return early when event.detail > 1. The verifier injected this into the page and every case (fast double-click, 180 ms, Enter twice) spent once. A short Undo like the mark Undo is the fuller answer (see resource-spend-no-guard).

Findings F258, F266. Screenshots: `shots/cass/126_resources_before.png`, `shots/cass/127_resources_after_dblclick.png`, `verify/out_8410/dA2_after.png`.

### 5. Nothing totals the assignment reports, the book's key rule is missing, and the circle advanced about 5 Illumination early

Rules problem, medium severity, confirmed on a fresh copy. Key `report-questions-tally`, area circle-page. Seen on: desktop 1920x1080 (Ada), Lightkeeper laptop 1440x900. Effort M.

**What happens.** Each player's report form carries the circle's three Illumination questions plus their own three keys, so one 'yes' can come in four times. The Lightkeeper's report cards show ticks per player with no total, sending adds nothing to the track, a plain '+1 Illumination' leaves no log line, and the book's rule for keys (2 Illumination if some players hit a key, 4 if every player did, nothing if none: p. 55) appears nowhere. This produced a wrong number in the session: the Lightkeeper counted keys at 1 each (3 questions + 7 keys + 2 rulings = 12), filled the track and advanced the circle. By the book the reports were worth 4 for keys, about 7 in all, so the circle advanced roughly 5 Illumination early. Ada, the table's rules checker, also read keys as 1 each.

**To reproduce.** 1. Open reports and have every player tick at least one key. 2. Open the Lightkeeper's Circle page and look for a total. 3. Press '+1 Illumination' and read the log.

**Cause.** CircleView.jsx:596-609 renders the three questions as checkboxes on every player's form and :472-481 sends them per player. gm/CirclePage.jsx:404-409 prints the questions as plain text and :430-438 shows one card per player with no aggregate. backend/vtt/ws/handlers/circle.py:12-46 only stores reports. gm.py:26-43 (_log_illumination) logs only milestones and a full track.

**Fix.** Take the questions off the player form and make them checkboxes on the Lightkeeper's page, stored once on the circle. Under the report cards, show the tally (yes answers, plus 4 if every active member's report has a key, 2 if some do, 0 if none) with an 'Add N Illumination' button. Log every rise, e.g. 'The Ninth Night gains 2 Illumination (3 to 5)'.

**Note.** F223's own expectation scored keys at 1 each; that is wrong by the book. The refuter confirmed the finding and named the early advancement as the evidence.

Findings F223, F203, F196. Screenshots: `shots/ada/088_circle_reports.png`, `shots/ada/090_report_sent.png`, `shots/ada/080_circle_illum.png`.

### 6. The Activity Log lives only in the tab: a reload, a second tab or a hub trip wipes every roll and pass note

Bug, medium severity, confirmed on a fresh copy. Key `activity-log-not-persisted`, area connection-sync. Seen on: laptop 1366x768 (Cass). Effort M.

**What happens.** Reload, open a second tab, or go to the chapter hub and back, and the log is empty, including the player's own last roll and any private notes they received. Reloading about a second after a roll leaves an empty tray and an empty log although every other desk shows the roll. Post-roll offers also disappear on reload. Game state (marks, drives, picks) is never lost, and the other desks still have the lines, which is why the adversarial check rated this medium rather than high. Ada, Bram and Cass all lost the whole assignment's log when they reloaded to get the advancement dialog back.

**To reproduce.** 1. Collect a few log lines and a pass note. 2. Reload, or open a second tab, or go Back to chapter hub and press Last Played. 3. Alternatively reload while your dice are still tumbling.

**Cause.** frontend/src/store/gameStore.js:213 holds activityLog in memory, leaves it out of the persisted state (:1636-1646) and clears it on every connect() without keepLog (:331). The server broadcasts activity_log and stores nothing (vtt/ws/manager.py:187, :240-264); endpoint.py:133-134 sends only the sheet and the circle on connect.

**Fix.** Keep a short history on the server (a deque of about 100 activity_log payloads with a timestamp) and send it as an activity_history frame on every connect; the client replaces its log with it and plays no sounds for replayed lines. Key the history by campaign and channel, so an investigator who moves to another campaign never sees old private notes. Optionally also resend the last roll_result per character. A small table would make it survive a server restart.

Findings F112, F161, F265. Screenshots: `shots/cass/050_second_tab.png`, `shots/cass/067_sense_midroll.png`, `shots/cass/068_sense_after_reload.png`, `verify/out_8420/log_08_after_midroll_reload.png`.

### 7. Picking a relationship question pastes it into the answer box, so answers are spliced into the question and sent garbled

Bug, medium severity, confirmed on a fresh copy. Key `relationship-question-in-answer`, area circle-formation. Seen on: phone 390x844 (Bram), desktop 1920x1080 (Ada), tablet 820x1180 (Dev). Effort M.

**What happens.** Choosing one of a relationship's prompt questions puts the question text into the answer box. On a phone, a tap in the middle of the box leaves the caret inside the question, and the answer is typed into it: Bram's Confidant was stored as 'This person keeps your dark secret. WShe stitched me up after Harrow Ridge.hat is it?' and Ada received it that way. Tapping a question after typing replaces the answer, changing the type empties the box, and the question's highlight goes as soon as you type. A waiting proposal cannot be edited or withdrawn, and Counter opens blank, so fixing a typo means picking the type and retyping everything.

**To reproduce.** 1. VI. Circle Relationships: pick Confidant for someone. 2. Tap one of its questions. 3. Tap in the middle of the answer box and type. 4. Propose, and read it on the other player's desk.

**Cause.** RelationshipNegotiation.jsx:178 (and :121 for Counter) sets lore to the question text, overwriting what was typed; :36 ties the highlight to lore === q; :177 and :120 clear lore when the type changes; :103 opens Counter empty; :94 shows the proposer only 'Waiting for'. The drafts comment at :11 lists a promptIdx that is never set.

**Fix.** Keep the chosen question as an index (promptIdx), show it above the box or as its placeholder, and join question and answer only when sending. Open Counter prefilled with the existing type and text. Add an Edit button on your own pending proposal; the server already replaces the row on a re-propose.

Findings F058, F059, F062, F061, F074. Screenshots: `shots/bram/048_rel_q_1.png`, `shots/bram/050_imogen_card.png`, `shots/ada/042_jonah_proposal.png`.

### 8. The drive spend stepper promises dice past the Rule of Six: Focus shows '+5d', then rolls +4d

Bug, medium severity, confirmed on a fresh copy. Key `rule-of-six-stepper`, area dice. Seen on: desktop 1920x1080 (Ada). Effort S.

**What happens.** With Focus at 2 and 5 Intuition, '+' stays live to 5: the header, the Survey, Focus and Sense chips and the button's spoken name ('plus 5 from Intuition') all promise 7 dice. The roll sends 4 and the slip says 'Focus +4d: 6 dice', with nothing saying why. The drive charged is right (the fifth point is kept) and the server caps the same way, so nothing is lost; the dice count shown before the roll is wrong.

**To reproduce.** 1. An action at rating 2 with 5 or more points in its drive. 2. Press 'Spend one more' five times. 3. Read the chip, then roll.

**Cause.** InvestigatorDossier.jsx:899 and :903 cap the stepper only at Math.min(currentDrive, 6); the chip (:1038-1040) and the accessible name (:1033) show the raw spend; only the click handler (:1022) applies Math.min(spend, 6 - rating).

**Fix.** For each action compute shownSpend = Math.min(spend, Math.max(0, 6 - rating)) and use it in the chip and the accessible name, adding '(Rule of Six)' when it is smaller than the spend. Optionally stop the stepper where no action in that drive can use another die.

Finding F199. Screenshots: `shots/ada/081_spend_int.png`, `shots/ada/082_focus_roll.png`.

### 9. 'Burn and reroll' stays offered long after the roll was settled, and the server still accepts it

Bug, medium severity, confirmed on a fresh copy. Key `burn-offer-stale`, area dice. Seen on: phone 390x844 (Bram). Effort S.

**What happens.** The After the roll box keeps offering 'Burn and reroll' until the same player rolls again, with no time or roll shown. In the playtest it was still there 16 minutes and a full round later. The verifier let four other rolls and 90 seconds pass, tapped it, and the server accepted it: every desk logged 'burned resistance on Control, a 6: Success', turning a Mixed the table had moved past into a Success.

**To reproduce.** 1. Roll for a Mixed result and do not burn. 2. Let the other players roll and the Lightkeeper narrate. 3. Open Dice and log and tap Burn and reroll.

**Cause.** DiceVault.jsx:73 decides canResist from this desk's own lastRoll, which other players' rolls never clear (gameStore.js:469-481). backend/vtt/ws/handlers/rolls.py:596-600 accepts a burn whenever _last_roll holds the same action; only that character's next roll replaces it.

**Fix.** Treat the next roll at the table as settling earlier ones: set a lastRollSettled flag when another desk's dice_thrown arrives and hide the offer, and on the server drop the other members' _last_roll entries in _dice_thrown so a stale client gets the existing 409. If that is too strict, add a time limit and show the roll's time in the box.

Finding F151. Screenshots: `shots/bram/082_logtop.png`, `verify/out_8421/burn_02_later.png`.

### 10. Behind Me and Death Defy offers vanish on a 20-second client timer, though the server would accept them for 2 minutes

Bug, medium severity, partly confirmed on a fresh copy. Key `ability-offers-expire`, area abilities. Seen on: phone 390x844 (Bram), laptop 1366x768 (Cass). Effort M.

**What happens.** When an ally takes a mark, Behind Me ('take the mark instead') appears as a card with a 20-second countdown, then disappears without a trace, while the server keeps the mark answerable for 120 seconds. On the phone Bram's offer for the Doctor's Body mark was gone by the time he had read it, there is no Use button on the ability card and no log line to recover from, so the Doctor took the hit. For keyboard users the Death Defy card never takes focus, is not announced, has no Escape, sits last in the Tab order (34 Tabs from the top of the page), covers the log and Pass Notes at 1366x768, and drops focus to the page after Use.

**To reproduce.** 1. An ally with Behind Me, on a phone. 2. Another investigator takes a mark. 3. Read the card for more than 20 seconds before tapping Intercept.

**Cause.** AbilityMarkOffer.jsx:7 sets MIN_OFFER_SECONDS = 20 (used at :83), and the countdown (:85-97) drops the offer from state; backend marks.py:59 INTERCEPT_WINDOW = 120. Behind Me has no entry in game/abilityUses.js, so the sheet has no Use button. The dialog (:122-129) never takes focus, has no Escape handler and does not restore focus; MainDeskView.jsx:278 renders it last in the DOM.

**Fix.** Send the window with the offer (expires_in: INTERCEPT_WINDOW in marks.py:216-222) and count down from it. Focus the primary button when an offer opens (or use role=alertdialog with a live summary), close on Escape, and restore focus on close. Optionally leave a small 'Behind Me: Imogen's mark, 1:40 left' chip that reopens it within the window.

**Note.** Did not hold: 'a touch never pauses it'. A tap on the card does pause it (Chromium sends a compatibility mouseover), though nothing tells a touch user so and a scroll does not. F206's 'Paused 30s' was the harness's resting mouse pointer.

Findings F181, F206. Screenshots: `shots/bram/113_kept_gilded.png`, `shots/bram/114_no_offer.png`, `shots/cass/103_kb_defy_offer.png`.

### 11. A mark the Lightkeeper sets through Edit trauma record skips every ability that reacts to marks

Rules problem, medium severity, confirmed on a fresh copy. Key `lk-mark-skips-abilities`, area marks-scars. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** Setting a mark from the Lightkeeper's copy of a sheet just changes the track and logs 'The Lightkeeper set Edda Rook's Bleed marks to 1.' No soak offer, Death Defy, ally's Behind Me or Premonitions, or Let Them In fires. The same mark taken by the player on their own sheet offers all of them. The code treats the edit as a correction tool, but it is the Lightkeeper's only mark control and nothing on the page says it skips abilities, so the playtest Lightkeeper used it for every story consequence and the abilities were silently lost. The tablet player confirmed the mark arrived with no Let Them In (F172).

**To reproduce.** 1. Open Edda's sheet on the Lightkeeper's desk (Edda has Let Them In; Jonah has Behind Me). 2. Edit trauma record, set Bleed to 1. 3. Watch Edda's and Jonah's desks.

**Cause.** backend/vtt/ws/handlers/gm.py:46-67 (handle_gm_update_tension) sets the column and commits. Every ability check lives in marks.py mark_or_offer / apply_mark (:238-268, :126-165), which only the player's take_mark reaches. InvestigatorDossier.jsx:1285 gives no warning.

**Fix.** Now: extend the edit hint to say 'For corrections: a mark set here does not offer soaks, Death Defy, Behind Me, Premonitions or Let Them In. To deal a mark, ask the player to take it on their sheet.' Better: a separate 'Deal a mark' control that goes through mark_or_offer. Do not make the edit's +1 call mark_or_offer, because restoring a mark cleared by mistake would fire the offers again.

**Note.** The refuter upheld it at medium and suggested filing it as UX: the rules engine is right on the player path; the problem is a correction tool that reads like a dealing tool.

Finding F145. Screenshots: `shots/dm/063_trauma-edit.png`, `shots/dm/064_bleed-set-1.png`, `verify/out_8425/lk_04_edda_after_gm_set.png`.

### 12. Tied votes: both names say 'leading', insignia marks no leader in words, and the seal breaks ties by database row order

Bug, medium severity, confirmed on a fresh copy. Key `vote-tie-leading`, area circle-formation. Seen on: desktop 1920x1080 (Ada), phone 390x844 (Bram). Effort M.

**What happens.** A 1-1 tie in the circle name list marks both names 'leading'. The insignia list shows its leader only by a border colour. When the charter is sealed, ties are broken by whatever order the database returns the votes in, so the winner can change with no vote changed: after a routine ANALYZE the leading ability on the papers, the Lightkeeper's status and the sealed ability all switched. In the playtest the seal stored 'The Ninth Night' while Ada's papers showed both names leading with 'The Harrow Watch' on top. No tie rule is written on the papers.

**To reproduce.** 1. Give two names one vote each and look at the list. 2. Tie two insignia. 3. Seal and compare with what the papers showed.

**Cause.** backend/vtt/routers/circles.py:192-202 (_tally_winner) takes max() over votes from a query with no ORDER BY; circle_queries.py:106 is the same, so the papers and the Lightkeeper's status follow row order too. CircleCreationPopup.jsx:296 sets isLeading = count === max; :419-443 gives insignia no 'leading' label.

**Fix.** Add .order_by(CircleVote.id) to both queries, so a tie goes to the option voted for first, everywhere. Mark one name with leadingValue(), add the word 'leading' to the insignia card, and print 'A tie goes to the option voted for first' on the papers.

Findings F055, F066. Screenshots: `shots/ada/035_name_voted.png`, `shots/bram/056_insignia_tie.png`.

### 13. Suggested circle names re-sort live by votes, so a click can land on a different name

Bug, medium severity, confirmed on a fresh copy. Key `name-vote-reorders`, area circle-formation. Seen on: desktop 1920x1080 (Ada), phone 390x844 (Bram). Effort S.

**What happens.** The name list re-sorts by vote count on every update. Ada aimed at 'The Ninth Night' in the second row; Bram's vote moved it to the top just before her click, and her vote went to 'The Harrow Watch'. On the phone, your own vote makes the list jump under your finger. The verifier reproduced it with a click at fixed coordinates, as a person makes it.

**To reproduce.** 1. Two names, no votes. 2. Aim at the second row. 3. Have another player vote for it just before you click.

**Cause.** CircleCreationPopup.jsx:291-292 sorts allSuggestedNames by tally on every render; rows are keyed by name, so React moves them under the pointer.

**Fix.** Delete the sort. The list is already in first-suggested order, and the count and 'leading' mark show who is ahead. While there, name the button 'Vote for <name>' (see sr-identical-control-names).

Findings F054, F052. Screenshots: `shots/ada/034_names_list.png`, `shots/ada/035_name_voted.png`, `shots/bram/039_names_list3.png`.

### 14. Circle name suggestions accept case and spacing duplicates that split the vote

Bug, medium severity, confirmed on a fresh copy. Key `name-case-duplicates`, area circle-formation. Seen on: tablet 820x1180 (Dev), laptop 1366x768 (Cass). Effort S.

**What happens.** 'the ninth night', 'THE NINTH NIGHT' and 'The Ninth  Night' (two spaces, which looks identical on screen) were all accepted beside 'The Ninth Night', each with its own vote count. Exact copies from another player do merge into 'suggested 2 times'; case and spacing variants do not. The specific mis-vote in the playtest came from the harness's case-insensitive text matching; the accepted duplicate is the real defect.

**To reproduce.** 1. One player suggests 'The Ninth Night'. 2. Another suggests 'the ninth night'.

**Cause.** backend/vtt/ws/handlers/circle.py:106-120 and routers/circles.py:65-80 refuse only an exact repeat from the same character; the client trims the ends only.

**Fix.** Collapse whitespace, compare lower-case against every suggestion in the circle, and store a match under the existing spelling so it merges. On the client, say 'Already suggested: vote for it' instead of sending.

Findings F068, F070. Screenshots: `shots/cass/034_names_list.png`, `shots/dev/028_name_voted.png`, `shots/dev/029_name_revoted.png`.

### 15. Advancement log lines name the wrong action: gilding Read is announced as 'gilded their sneak action'

Bug, medium severity, confirmed on a fresh copy. Key `advancement-log-raw-keys`, area advancement-wrap. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** The log uses database column names, which do not match the book: the column 'sneak' holds Read and 'read' holds Focus. So gilding Read is logged as 'gilded their sneak action', and raising Focus is logged as 'gained +1 read', a real action the table would believe. Split drive points print as '+2 nerve,cunning drive'. The sheet itself is right. The line appears on every desk's log.

**To reproduce.** 1. Circle Advancement: Gild an additional action, Read; Add 1 action point, Focus. 2. Confirm. 3. Read the log on any desk.

**Cause.** backend/vtt/ws/handlers/character.py:181-186 puts the raw payload detail (adv_detail) into the message.

**Fix.** Map it through ACTION_LABELS from vtt.creation (no import cycle) and format drive picks ('+1 Nerve and +1 Cunning drive'). Update the expected strings in tests/test_ws_character.py. The same substitution suits the refusal texts at engine.py:302 and :337. Tested on a scratch copy.

Finding F262. Screenshots: `shots/dev/165_log_gild.png`, `shots/dev/161_adv_read.png`, `verify/out_8427/dev_04_log.png`.

### 16. Before the seal the Lightkeeper's Circle page says each resource is '1 of 1' and 'refills to 1 (1 plus the circle's members)' with four members

Bug, medium severity, confirmed on a fresh copy. Key `circle-resources-pre-seal`, area circle-page. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** With four investigators approved, the Lightkeeper's Circle Resources read '1 of 1 available' and 'refills to 1 (1 plus the circle's members)', while the players' papers say 'Starting Resource Points 5 (1 + 4 investigators)'. After a reload it reads '1 of 5' with four squares that look spent. It corrects itself at the seal (5 of 5) and nothing can be spent before then, so only the display and the wording are wrong.

**To reproduce.** 1. Approve four investigators with the desk open. 2. Open Circle, Circle Resources, before finalizing. 3. Reload and look again.

**Cause.** backend/vtt/routers/campaigns.py:137-159 (approve_character) sends no circle_update, so max_capacity stays at 1 on the open desk; circle_queries.py:95 creates the circle with 1 of each and fill_resources runs only at the seal (circles.py:243). The wording comes from game/circleResources.js:21-22.

**Fix.** In approve_character, call fill_resources when the circle is not finalized and broadcast circle_update. Reword the note to 'each refills to 1 plus the circle's members (now 5)'.

Findings F044, F010. Screenshots: `shots/dm/035_circle_resources.png`, `shots/dm/008_circle_section.png`.

### 17. A field entry's sketch or photo caption silently replaces the title the player typed

Bug, medium severity, confirmed on a fresh copy. Key `sketch-caption-replaces-title`, area notebook. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** When a Field Notes entry has a sketch or photo with a caption, the caption is saved as the entry's title; the title the player typed is gone from the heading, the contents and the database. A caption typed on a text entry with no picture is dropped without a word. Text entries cannot be edited to fix either.

**To reproduce.** 1. Field Notes: type an Entry Title. 2. Attach a sketch or photo and fill Caption. 3. Add entry.

**Cause.** NotebookView.jsx:500 sends uploadCaption || newEntryTitle as the title; the upload route has no caption field. The text path (:524-528) never reads the caption and :533 clears it.

**Fix.** Send the typed title, and put the caption in the entry text under the picture (in italics). Show the Caption field only when a picture is staged and give it an aria-label. No backend change.

Finding F114. Screenshots: `shots/dev/049_sketch_attached.png`, `shots/dev/052_my_entry2.png`.

### 18. Illumination key ticks made during the assignment are thrown away when the player leaves the Circle tab

Bug, medium severity, confirmed on a fresh copy. Key `key-ticks-lost`, area circle-page. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** The report's key and question boxes can be ticked while reports are still closed, which invites a player to tick a key the moment they earn it. The ticks live only in the Circle tab and vanish after a visit to Notebook or Investigator. The key boxes are 14 px on a touch screen.

**To reproduce.** 1. Reports closed: tick a key. 2. Go to Notebook, then back to Circle.

**Cause.** CircleView.jsx:421-424 keeps evalQ and keyChecks in useState; MainDeskView.jsx:270 unmounts the tab; the boxes are disabled only after sending (:604, :627); the key box is w-3.5 h-3.5 (:626).

**Fix.** Keep the draft in sessionStorage or the store, cleared on send and at End Assignment (the same change as report-forgets-sent), and give the labels a 44 px touch height.

Finding F188. Screenshots: `shots/dev/107_r3keys2.png`, `shots/dev/110_r3keyslost.png`.

### 19. When the network goes quiet without closing the socket, the desk shows nothing, and in a longer drop a mark is lost silently

Bug, medium severity, confirmed on a fresh copy. Key `offline-not-shown`, area connection-sync. Seen on: test engineer (stress beat). Effort S.

**What happens.** Chromium keeps a WebSocket open through a network drop, and the desk only notices a dead connection when the socket closes. So while offline it shows no warning and a stale sheet. Short drops catch up cleanly when the network returns. In a 45-second silent drop, though, the server closes the dead socket after about 40 seconds while the desk still thinks it is open: a mark the player took then went into the dead socket and was lost with no message (the database and sheet stayed at 0). The existing 'connection dropped' banner works whenever the socket actually closes.

**To reproduce.** 1. Make the desk's connection go silent (no FIN or RST) for 45 seconds. 2. During it, take a mark. 3. Restore the connection and check the sheet and the database.

**Cause.** gameStore.js:1677-1687 listens only for 'online' and 'visibilitychange'; connectionState leaves 'open' only in socket.onclose; there is no application heartbeat, and the protocol has no ping message.

**Fix.** Add an 'offline' listener that sets connectionState to 'reconnecting', so the banner shows at once and the existing 'online' handler reconnects and resyncs. Add a heartbeat: the client sends a ping every 15 seconds, the server answers pong, and after about 35 seconds of silence the desk reconnects.

**Note.** The playtest's version (F238) used setOffline, the harness quirk; the verifier reproduced the same blind spot with a half-open TCP relay, so it is real.

**Filed as** ux (low); moved here because verification found a mark silently lost.

Finding F238. Screenshots: `shots/stress/t4_dev_offline.png`, `shots/stress/t4_dev_back.png`.

### 20. End Assignment leaves reports open with the finished assignment's reports still filed

Bug, medium severity, confirmed on a fresh copy. Key `end-assignment-reports-open`, area advancement-wrap. Seen on: Lightkeeper laptop 1440x900. Effort M.

**What happens.** After 'Yes, end it' the circle still reads 'Reports: Open, 4 of 4 filed', players have a live Send button, and the old cards still turn over. Reports carry no date, so the next assignment's reports cannot be told from these. The confirm text and the log say nothing about reports.

**To reproduce.** 1. Open reports; all players send. 2. End Assignment. 3. Look at the circle abstract and the Circle page; reload a player desk.

**Cause.** backend/vtt/ws/handlers/gm.py:256-299 (handle_gm_end_assignment) resets the scene, tension, ability uses, gear, Train and stamina dice, but not reports_open or backstory_answers['reports']. The client's circle_update handler (gameStore.js:426-431) never syncs circleCreation.reports.

**Fix.** In End Assignment set reports_open to False and drop the stored reports (assign a new dict; the JSON column does not track in-place changes). Sync circleCreation.reports in the circle_update handler. Mention it in the armed hint and the log line.

Finding F241. Screenshots: `shots/dm/128_ended.png`, `verify/out_8426/r_gm_after_end.png`.

### 21. After a tab handoff or a reconnect the desk keeps a stale 'Not connected... roll again' slip and never catches up

Bug, medium severity, confirmed on a fresh copy. Key `stale-connection-slips`, area connection-sync. Seen on: test engineer (stress beat), desktop 1920x1080 (Ada), laptop 1366x768 (Cass). Effort S.

**What happens.** In a tab that has lost the desk to another tab, Roll looks live and answers 'Not connected to the table... Roll again once the desk is back', and a pass note says to resend 'once the connection is back'; neither mentions 'Use this tab', the only way back. After 'Use this tab' that tab never gets what happened in the other one and keeps both stale messages. After a real socket drop and reconnect, the 'Not connected' slip stays above the log and anything logged during the gap never appears.

**To reproduce.** 1. Open the desk in tab A, then tab B. 2. In A press Roll and send a note. 3. Roll in B. 4. In A press Use this tab.

**Cause.** gameStore.js:345 (socket.onopen) never clears an error caused by the connection; rollAction (:913) and onclose (:367) use the same message when the state is 'replaced'; PassNotes.jsx:24-33 keeps sendError locally with fixed text. The missing lines have the same cause as activity-log-not-persisted.

**Fix.** Clear the connection-caused roll errors on open; when the state is 'replaced', say 'This desk is open in another tab. Press Use this tab to roll here.' (and the same for notes); clear the note error when the connection opens. The catch-up comes with the activity history from activity-log-not-persisted.

**Note.** Cass's drop was made real by closing the socket through CDP, so it is not the setOffline quirk.

Findings F239, F164, F189. Screenshots: `shots/stress/t6_tab0_rolled.png`, `shots/ada/097_t6_restored_check.png`, `shots/cass/078_back_settled.png`.

### 22. Field entries with a sketch or photo, and redrawn sketches, never reach other desks or the log

Bug, medium severity, confirmed on a fresh copy. Key `notebook-uploads-not-broadcast`, area notebook. Seen on: tablet 820x1180 (Dev), Lightkeeper laptop 1440x900. Effort S.

**What happens.** Text entries go out live with a log line. Entries with a sketch or photo, and 'Keep drawing' redraws, are saved but send nothing: no frame and no log line on any desk, the author's included. Other desks see them only after leaving and reopening the Notebook. Verified with three live desks and a healthy connection.

**To reproduce.** 1. With another desk on the Notebook, add a Field entry with a sketch. 2. Redraw an existing sketch with Keep drawing. 3. Watch the other desk.

**Cause.** backend/vtt/routers/notebook.py upload_notebook_image (:223-283) and redraw_sketch (:310-328) return without broadcast_campaign. gameStore.js:539-543 also ignores a notebook_entry whose id it already holds, so a redraw broadcast would be dropped.

**Fix.** Move add_notebook_entry's broadcast into a helper and call it after uploads and redraws; in the store, merge an entry it already holds instead of ignoring it.

Findings F116, F210, F215. Screenshots: `shots/dev/052_my_entry2.png`, `shots/dev/133_banns_done.png`, `shots/dm/102_tower_sketch.png`.

### 23. After 'Later' or Escape on the Circle Advancement dialog, nothing brings the picks back without a reload

Bug, medium severity, confirmed on a fresh copy. Key `advancement-later-no-way-back`, area advancement-wrap. Seen on: desktop 1920x1080 (Ada), phone 390x844 (Bram), laptop 1366x768 (Cass). Effort S.

**What happens.** Pressing Later, or Escape (which does the same), closes the dialog for good: nothing on the sheet, the Circle page or the phone's Menu says picks are waiting, and a trip to the chapter hub and back does not bring it back. Only a page reload does, and that also empties the Activity Log. Three of the four players hit it and reloaded. The picks are kept on the server, so nothing is lost, but a player who does not think to reload cannot advance. The Lightkeeper cannot see waiting picks either.

**To reproduce.** 1. Lightkeeper advances the circle. 2. On the player's dialog press Later (or Escape). 3. Look on the sheet, Circle page and Menu; go to the hub and back.

**Cause.** gameStore.js:1162 sets advancementDeferred; only a circle_advanced message or a page load clears it (it is not persisted and logout does not reset it), although the comment at :1160-1161 promises 'the next visit to the desk'. CircleView.jsx:146 opens the dialog only while not deferred and :187 renders nothing otherwise; Escape goes to the same dismiss.

**Fix.** Add resumeCircleAdvancement, render a small 'Choose advancements (N)' button while picks wait and the dialog is deferred, and clear the flag when the desk mounts and on logout.

**Note.** At 1366 wide with the browser's bars (629 px of page), the live dialog puts Later and Confirm below its fold.

Findings F245, F246, F259. Screenshots: `shots/bram/146_after_later.png`, `shots/bram/154_back_to_desk.png`, `shots/cass/124_after_escape.png`.

### 24. A waiting player's hub never learns of the approval, and a pending request cannot be opened or withdrawn

Bug, medium severity, confirmed on a fresh copy. Key `pending-join-not-live`, area hub. Seen on: desktop 1920x1080 (Ada), phone 390x844 (Bram), laptop 1366x768 (Cass). Effort M.

**What happens.** After the Lightkeeper approves, the player's Registry keeps saying 'Waiting for the Lightkeeper to approve' (46 seconds later in the verification, about ten minutes in the playtest) until they press 'Check again' or reload, and even then the row flips silently. Every player hit this. Around it: 'Save and ask to join' lands on the hub with no confirmation, the pending row's name is plain text (no view of the sheet) and is cut off at 1366 with no tooltip, and there is no way to withdraw a request sent with the wrong code or character (deleting a pending investigator is refused). Dev said the same at the table (#16).

**To reproduce.** 1. As a player, Save and ask to join, then stay on the hub with the Registry open. 2. The Lightkeeper approves. 3. Wait without pressing Check again.

**Cause.** CampaignSelector.jsx:49-53 fetches the user's characters once on mount; useCampaignEntry.js:28 refetches on opening the book only when both lists are empty; the hub opens no socket, and approval goes only to campaign channels (campaigns.py:136-157). AppRouter.jsx:200-202 sets no hub notice after joining. PlayerRegistryPage.jsx:79 renders the name as a truncated <p>. No withdraw route exists.

**Fix.** While any character is pending, refetch every 15 seconds and on visibilitychange; when one flips to active, show a hub notice ('The Lightkeeper let Jonah Hale into The Drowned Bell. Open the Case Ledger and press Play.'), and a different one if it was declined. Show a confirmation notice after joining, and add a title to the name. A withdraw route and button is a separate, medium change.

**Note.** The greyed Delete does explain itself (tooltip and a message on tap), so that part of F040 was overstated.

Findings F047, F048, F024, F022, F040. Screenshots: `shots/ada/025_turn2_start.png`, `shots/bram/028_turn2_start.png`, `shots/bram/029_after_check_again.png`.

### 25. On a fresh database the first sign-up fails with a 500 and the first campaign's desk drops its connection once

Bug, medium severity, confirmed on a fresh copy. Key `seed-id-sequence-collision`, area accounts. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** On a brand-new PostgreSQL database the very first Create account shows 'Something went wrong. Please try again.', and the first campaign's desk shows 'The connection to the table dropped' for about a second. Both work on retry and it happens once per database, but it greets the first user of every new install. The repo already pins it as a known quirk.

**To reproduce.** 1. Start the API on an empty PostgreSQL database. 2. Create an account. 3. Create a campaign and watch the desk open.

**Cause.** backend/vtt/db.py:263 and :268-274 seed Circle(id=1) and User(id=1) with explicit ids and never advance users_id_seq or circles_id_seq, so the first register (routers/auth.py:193-201) and the first campaign circle (circle_queries.py:95-97, from ws/endpoint.py:112) collide on id 1. The SQLite test database hides it, and tests/conftest.py resyncs the sequences.

**Fix.** After the seed commit in init_db, on PostgreSQL set each sequence to GREATEST(MAX(id), last_value) with setval. Flip the characterization test (tests/test_00_startup.py:71-82) and strike the entry in docs/refactor/QUIRKS.md:6. Optionally map an IntegrityError on register to a clearer message.

Findings F001, F002. Screenshots: `shots/dm/003_after_signup.png`, `shots/dm/004_retry_signup.png`, `shots/dm/006_created.png`.

### 26. Focus falls to the page whenever a focused button is disabled or replaced, so keyboard users lose their place

Bug, medium severity, confirmed on a fresh copy. Key `keyboard-focus-dropped`, area accessibility. Seen on: laptop 1366x768 (Cass). Effort M.

**What happens.** In the creator's path cards, Enter on 'Next card' disables both arrows during the flip, focus drops to the page, and further Enters do nothing; a keyboard user has to press Shift+Tab, Tab, Enter for every card. The same drop happens after Propose and Accept in the relationship papers (the next Tab restarts at section I), after Roll (the way to 'Keep the gilded die' then runs through six 'Take a mark' buttons), after Keep, when a drive '+' reaches its cap, and after Send report.

**To reproduce.** 1. Creator step 1: Tab to 'Next card' and press Enter twice. 2. Check document.activeElement and the card counter.

**Cause.** CharacterCreator.jsx:820/:828 disable the arrows for the whole flip, which flip() at :604 already guards. InvestigatorDossier.jsx:903 and :999 use a real disabled; DiceTray.jsx:150 strips the kept die's role; CircleView.jsx:638 swaps Send for the stamp; RelationshipNegotiation.jsx:165 and :102 replace the button; useDialog.js:69 sends a Tab from the page to the dialog's first control.

**Fix.** Drop the flip-time disable on the arrows. Where a control must stay in place, use aria-disabled with a guard instead of disabled. When a control is replaced, move focus to its replacement (the result slip, 'Keep the gilded die', the 'Report sent' status, the relationship status) with tabIndex -1.

Findings F027, F076, F137, F190, F205, F229. Screenshots: `shots/cass/006_criminal.png`, `shots/cass/088_kb_after_roll.png`, `shots/cass/038_kb_rel_after.png`.

### 27. On a phone the circle name row overflows: only a 9 px sliver of Suggest shows and the papers scroll sideways

Bug, medium severity, partly confirmed on a fresh copy. Key `suggest-button-offscreen-phone`, area phone-tablet. Seen on: phone 390x844 (Bram). Effort S.

**What happens.** In 'II. Name the Circle' on a 390-wide phone the name box will not shrink, so only a 9 px sliver of Suggest is visible and the 0/5 count is never on screen; the row overflows at every width up to 480. Separately, the whole papers scroll sideways (442 px in 350) because of the form's footer line.

**To reproduce.** 1. On a 390-wide phone open the papers. 2. Scroll to II. Name the Circle and type a name.

**Cause.** CircleCreationPopup.jsx:276: the input is flex-1 without min-w-0, so it keeps its intrinsic width; :482: the footer row (a nowrap line and a min-width seal box) does not wrap.

**Fix.** Add min-w-0 to the input and flex-wrap to the footer row. Injected into the page, everything fits at 390 and the sideways scroll is gone; something else still overflows by 21 px at 360.

**Note.** Did not hold: 'tapping Suggest shoves the section 84 px sideways'. That came from Playwright scrolling the target into view before its tap; a real tap on the sliver works.

Finding F050. Screenshots: `shots/bram/034_name_section.png`, `shots/bram/036_name_suggested.png`.

### 28. After one approval the remaining join requests lose their pronouns and catalyst

Bug, medium severity, confirmed on a fresh copy. Key `join-requests-lose-details`, area gm-desk. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** Requests that arrive live show pronouns and the catalyst quote. Approving one refetches the roster, whose items lack those fields, so the remaining cards drop to 'SLINK · DETECTIVE' with no quote. A Lightkeeper who opens the desk after the requests arrived never sees them.

**To reproduce.** 1. Have several players ask to join while the desk is open. 2. Approve one. 3. Look at the next request, then reload.

**Cause.** backend/vtt/schemas.py:390-402: CharacterRosterItem has no pronouns or catalyst; routers/campaigns.py:422-436 (to_item) does not set them; gameStore.js:1202-1207 replaces the live cards with the roster.

**Fix.** Add pronouns and catalyst to CharacterRosterItem and to_item. They are already broadcast to the campaign channel, so nothing new is exposed.

Finding F042. Screenshots: `shots/dm/019_start_approval.png`, `shots/dm/023_approved_cass.png`.

### 29. Patch Up is offered as a rider on every Focus roll, so one investigation roll also heals an ally

Rules problem, low severity, confirmed on a fresh copy. Key `patch-up-free-rider`, area abilities. Seen on: desktop 1920x1080 (Ada). Effort M.

**What happens.** The site's own Patch Up text says 'you can make a Focus roll to heal 1 Body mark on an ally': the Focus roll is the heal. The site instead offers 'Patch Up: spend N Intuition' after any Focus roll, so one roll does two jobs, and there is no Patch Up button on the ability card to declare it first. The rider lists every ally even when nobody has a Body mark and answers Use with a generic three-condition refusal. Intuition is charged correctly and the heal is logged, so a Lightkeeper can police it; Ada skipped it every time.

**To reproduce.** 1. As a Doctor with Patch Up, roll Focus for something other than healing. 2. Keep the result and read the After the roll box.

**Cause.** frontend/src/components/pc/dice/usePostRollPrompts.js:35-46 offers it after any Focus roll; backend rolls.py:524-533 accepts it on any fresh Focus roll; abilityUses.js has no Patch Up entry; RollModifications.jsx:22-24 lists every living ally; rolls.py:446 has one generic refusal.

**Fix.** Declare it before the roll: a Patch Up control on the ability card that picks the ally and rolls Focus with a patch_up_target, and a server that accepts the heal only for that roll's target. Interim: a specific refusal ('Jonah Hale has no Body mark to heal'). Note that player desks cannot filter allies by marks today (roster items carry no body_marks and member_update reaches only the Lightkeeper), so a filtered list needs body_marks in the roster or a list from the server.

**Note.** The refuter upheld the deviation but lowered it to low: the design is deliberate, the cost is charged, the heal is logged, and it caused no wrong heal in play.

Findings F125, F126. Screenshots: `shots/ada/061_kept_six.png`, `shots/ada/062_patchup_refused.png`.

### 30. Notebook contents print a page number that the page itself does not use

Bug, low severity, confirmed on a fresh copy. Key `notebook-toc-page-number`, area notebook. Seen on: phone 390x844 (Bram). Effort S.

**What happens.** The contents list shows each entry's campaign-wide sequence number ('p.2'), which also counts the Lightkeeper's notes, private notes and deleted entries, while the page reads 'Field Notes, page 1'. With more entries the contents said p.4 for an entry on page 1 and p.9 for page 2. The gaps also hint how many hidden notes exist.

**To reproduce.** 1. Add the first field entry after the Lightkeeper has notes. 2. Open the contents and tap the entry.

**Cause.** NotebookView.jsx:1018 prints entry.page_number, a campaign counter (engine.py:144-147); the header and footers print the spread number.

**Fix.** Print p.{entrySpread(entry)}, the same function the line's click already uses.

Finding F093. Screenshots: `shots/bram/067_notebook.png`, `shots/bram/068_notebook_entry.png`.

### 31. Your Circle shows an accepted incoming relationship as '(not yet accepted)' when you have not proposed one back

Bug, low severity, confirmed on a fresh copy. Key `your-circle-pending-label`, area circle-page. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** A relationship someone proposed to you and you accepted shows on their Your Circle card as pending (empty stamp, '(not yet accepted)' for screen readers) until you propose one of your own. If it stays one-sided at the seal it shows as pending all campaign, and the card's back ('Them to you: Champion') contradicts its front.

**To reproduce.** 1. Another player proposes to you; Accept. 2. Before proposing back, look at their Your Circle card.

**Cause.** TactileSidebar.jsx:108-115 shows a settled relationship only when your own side is accepted.

**Fix.** settled = myRel accepted ? myRel : theirRel accepted ? theirRel : null; show pending only when neither side is accepted.

Finding F075. Screenshots: `shots/dev/023_desk_open.png`, `shots/dev/034_rels_proposed.png`.

### 32. Every player's desk receives every other player's full assignment report

Bug, low severity, confirmed on a fresh copy. Key `reports-broadcast-all`, area circle-page. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** The form says 'Report sent to the Lightkeeper', but each report (which questions and keys were ticked) goes to every player's desk in the submit message, in every circle_update and in the circle-creation-state response. Nothing shows it on player screens, and the book has the table discuss keys aloud, so the harm is small: the wording promises a privacy that is not there.

**To reproduce.** 1. Reports open; two players send. 2. Read a third player's WebSocket frames.

**Cause.** backend/vtt/ws/handlers/circle.py:42-45 uses broadcast_campaign; serializers.py:127 includes reports in every circle dict; routers/circles.py:53 returns them to players.

**Fix.** Send the full frame only to the Lightkeeper and the reporter, and strip other players' reports from get_circle_dict and the state endpoint for non-Lightkeeper callers.

Finding F228. Screenshots: `shots/cass/112_report_after_dblclick.png`.

### 33. The 30-day login token travels in the WebSocket URL and is printed in the browser console on every failed reconnect

Bug, low severity, confirmed on a fresh copy. Key `ws-token-in-url`, area connection-sync. Seen on: laptop 1366x768 (Cass). Effort M.

**What happens.** Chromium logs "WebSocket connection to 'ws://.../ws/3?token=eyJ...' failed" with the whole token on each retry during a drop. The token is the full login (it works on the REST API), so a console screenshot shared in a bug report hands over the account. Server logs already redact it.

**To reproduce.** 1. Drop the network on a desk. 2. Open the browser console.

**Cause.** gameStore.js:337-340 builds ws/{id}?token=<login JWT>; endpoint.py:65 accepts it.

**Fix.** Issue a short-lived socket ticket (POST /api/auth/ws-ticket, audience 'ws', 60 seconds) and accept only that on the socket; the smaller alternative is to pass the token as a WebSocket subprotocol.

Finding F165. Screenshots: `shots/cass/076_drop_roll_12s.png`.

### 34. Handwriting choices 'Reenie Beenie' and 'Moondance' render in plain serif because the names are misspelled

Bug, low severity, confirmed on a fresh copy. Key `pen-fonts-missing`, area joining. Seen on: phone 390x844 (Bram), desktop 1920x1080 (Ada). Effort S.

**What happens.** Two of the 20 pens preview and write in the book serif everywhere, including the Notebook. Google Fonts has no families by those names; they are 'Reenie Beanie' and 'Moon Dance'. The server's allow-list knows only the misspellings, so fixing the front end alone would silently swap the corrected names for Caveat.

**To reproduce.** 1. Join a Campaign dialog: open the Handwriting list. 2. Look at Reenie Beenie and Moondance.

**Cause.** Misspelled in frontend/index.html:22, campaignSelector/penFonts.js:2,4, shared/NotebookView.jsx:18,21 and backend/vtt/config.py:118,120.

**Fix.** Correct the names in all four places and migrate stored pen_font values in characters (and notebook entries if they hold a copy).

Findings F020, F021. Screenshots: `shots/bram/023_hw.png`, `shots/bram/024_hw_moondance.png`, `shots/ada/021_fontcheck.png`.

### 35. Double-clicking 'Save and join a campaign' opens the join dialog and closes it again at once

Bug, low severity, confirmed on a fresh copy. Key `join-dialog-double-click`, area joining. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** The first click opens the dialog and the second lands on its new backdrop, which closes it. Nothing is saved and nothing is said.

**To reproduce.** 1. Finish creator steps 1-4. 2. Double-click 'Save and join a campaign'.

**Cause.** CharacterCreator.jsx:1500: the backdrop's onClick closes the dialog on any click.

**Fix.** Ignore backdrop clicks with event.detail > 1.

Finding F033. Screenshots: `shots/cass/020_join.png`, `shots/cass/022_joindialog.png`.

### 36. A refused Patch Up leaves a red slip for minutes, and an answered prompt comes back after visiting the Notebook

Bug, low severity, confirmed on a fresh copy. Key `patch-up-prompt-stale`, area abilities. Seen on: desktop 1920x1080 (Ada). Effort S.

**What happens.** After Use is refused the refusal stays on the tray; visiting Notebook and back offers the Patch Up prompt again under the old refusal; Skip hides the prompt but not the refusal; and after a refusal there is no way to pick another ally. The sheet's ability tab also resets to Role ability on every tab switch.

**To reproduce.** 1. Roll Focus as a Doctor, pick an ally with no Body mark, press Use. 2. Notebook, then Investigator. 3. Skip.

**Cause.** usePostRollPrompts.js:59 keeps dismissed prompts in component state, lost when the Notebook unmounts DiceVault; the refusal (rollError) is cleared only by a new roll; RollModifications.jsx:94 dismisses on Use before the server answers; InvestigatorDossier.jsx:473 keeps the tab locally.

**Fix.** Keep dismissed prompt keys per roll id outside the component, clear the refusal on Use and Skip, and un-dismiss a prompt the server refused.

Finding F134. Screenshots: `shots/ada/062_patchup_refused.png`, `shots/ada/065_prompt_back_after_skip.png`.

### 37. A long circle name suggestion runs off its row, and the field has no length limit

Bug, low severity, confirmed on a fresh copy. Key `long-name-overflow`, area circle-formation. Seen on: tablet 820x1180 (Dev), laptop 1366x768 (Cass). Effort S.

**What happens.** A long suggestion with an unbroken word is clipped at the paper's edge, hiding its end and its count and 'yours' tag. Nothing limits the length: a 5000-character name was stored whole.

**To reproduce.** Suggest a 230-character name ending in a long unbroken word.

**Cause.** CircleCreationPopup.jsx:316: the name span is a flex item with min-width auto and no break; no maxlength on the input (:268-277) or in the server paths.

**Fix.** Add min-w-0 and overflow-wrap:anywhere to the span, maxLength 80 on the input, and the same 80-character cap on the server, as for campaign names.

Findings F069, F071. Screenshots: `shots/cass/034_names_list.png`, `shots/dev/029_name_revoted.png`.

### 38. Your Circle cards and the Lightkeeper's polaroids change order between visits

Bug, low severity, confirmed on a fresh copy. Key `roster-order-unstable`, area player-desk. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** The roster has no fixed order, so after a reload, hub trip or second tab the cards can come back in a different order; whoever's sheet changed last tends to move to the end. Open desks do not reorder live.

**To reproduce.** 1. Note the Your Circle order. 2. Change a sheet. 3. Go to the hub and back.

**Cause.** backend/engine.py:113-118 (get_campaign_roster) and routers/circles.py:43-46 query with no ORDER BY.

**Fix.** Add .order_by(Character.id) in both, as the codebase already does elsewhere.

Finding F230. Screenshots: `shots/cass/109_start_t8.png`, `shots/cass/117_back_desk_t8.png`.

### 39. A role ability taken by advancement is filed under the Specialty tab with the specialty's heading

Bug, low severity, confirmed on a fresh copy. Key `advanced-role-ability-wrong-tab`, area advancement-wrap. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** Great Wards, a Weird role ability, appears on the Specialty tab under 'Occultist ability' after advancement, while the Role tab still shows only Let Them In. Its Use button works. The Lightkeeper's copy shows the same.

**To reproduce.** 1. Circle Advancement: Take a new ability, a role ability. 2. Confirm. 3. Open the Role and Specialty tabs.

**Cause.** InvestigatorDossier.jsx:825-835 renders every advancement ability (stored appended to specialty_ability) in the specialty pane.

**Fix.** Split them with the existing ROLE_FROM_ABILITY map and list role abilities on the Role tab.

Finding F263. Screenshots: `shots/dev/163_sheet_after.png`, `shots/dev/166_spec_tab.png`.

### 40. The Style written in the creator is saved but never shown anywhere

Bug, low severity, confirmed on a fresh copy. Key `style-never-shown`, area player-desk. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** The investigator's look, typed in the creator's Style box, is stored and sent to every desk, but no screen shows it: not the sheet, the Lightkeeper's copy, the roster card or the creator's summary.

**To reproduce.** 1. Fill Style in the creator. 2. Join and open the sheet.

**Cause.** InvestigatorDossier.jsx never renders character.style; only CharacterCreator.jsx reads it.

**Fix.** Add Style to the Catalyst tab's entries (and optionally to the creator summary and the roster card).

Finding F106. Screenshots: `shots/cass/047_catalyst_tab.png`.

### 41. A multi-line catalyst runs together into one paragraph on the sheet

Bug, low severity, confirmed on a fresh copy. Key `catalyst-linebreaks`, area player-desk. Seen on: tablet 820x1180 (Dev). Effort S.

**What happens.** The line break is stored, but the sheet's Catalyst tab, the creator's summary and the Lightkeeper's roster card show one run-on paragraph.

**To reproduce.** 1. Type a two-line catalyst. 2. Open the sheet's Catalyst tab.

**Cause.** InvestigatorDossier.jsx:45, CharacterCreator.jsx:1409 and gm/PlayerRosterCard.jsx:33 render with the default white-space.

**Fix.** Add whitespace-pre-line in those three places.

Finding F110. Screenshots: `shots/dev/044_catalyst.png`.

### 42. The screen-reader timer status keeps saying 'Time's up.' after the timer is cleared or switched off

Bug, low severity, confirmed on a fresh copy. Key `timer-status-stale`, area hourglass-timer. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** The hidden status line stays at 'Time's up.' through Clear, switching the timer off and End Assignment, and changes only when the next timer starts; on the Lightkeeper's desk it stayed for an hour. The reset button is announced 'Reset the timer to 0:00' while no timer is set. The tablet still had it after End Assignment (F271).

**To reproduce.** 1. Run a short countdown to 0:00. 2. Clear it and switch the timer off. 3. Read the role=status elements.

**Cause.** shared/TimerBell.jsx:29-44 changes the status only on start, pause and time's up; TensionTimer.jsx:224-225 builds the reset label from a zero duration.

**Fix.** Empty the status when the timer is hidden, cleared or reset; label reset by its duration only when one is set.

Findings F085, F174. Screenshots: `shots/dm/046_ready_hourglass.png`, `shots/dm/079_timer_cleared.png`.

### 43. The Handwriting picker is announced as a listbox, but arrow keys do nothing and Escape closes the whole dialog

Bug, low severity, confirmed on a fresh copy. Key `pen-listbox-no-arrows`, area accessibility. Seen on: laptop 1366x768 (Cass). Effort S.

**What happens.** Arrow keys, Home and End do nothing, Enter closes the list with the old font still chosen, and the fonts are 20 separate Tab stops. Escape closes the whole surrounding dialog (the Case Ledger or the Join dialog), not just the list, and picking a font with Tab and Enter drops focus to the page.

**To reproduce.** 1. Open Join a Campaign. 2. Open the Handwriting list. 3. Press ArrowDown, then Enter; reopen and press Escape.

**Cause.** shared/JoinCampaignForm.jsx:52-85 declares listbox and option roles with no key handling; Escape reaches useDialog's document listener.

**Fix.** Make them plain toggle buttons (role=group, aria-pressed), handle Escape locally with preventDefault and return focus to the trigger; or implement the full listbox pattern.

Finding F037. Screenshots: `shots/cass/023_fonts.png`.

### 44. A stray strip of tape floats on the desk under the circle charter

Bug, low severity, confirmed on a fresh copy. Key `stray-tape`, area circle-page. Seen on: Lightkeeper laptop 1440x900. Effort S.

**What happens.** On the Lightkeeper's Circle page for a new campaign, a tape strip sits on the bare desk under the charter: it is the top of the Illumination Questions paper's tape, split across a column break.

**To reproduce.** Open Circle at 1440x900 on a campaign with no investigators yet.

**Cause.** shared/CirclePaper.jsx:28 lifts the tape with a negative top offset, so the multi-column flow splits it.

**Fix.** Replace -top-2.5 with top-0 -translate-y-2.5 (verified by injecting the CSS: same look, no stray strip).

Finding F005. Screenshots: `shots/dm/008_circle_section.png`.

## Confusing or awkward (UX), ranked

Ranked by severity, then by how many seats hit them.

### Medium

#### Lightkeeper changes reach every desk live but silently: no badge, highlight or log line

Key `silent-table-changes`, area phone-tablet. Seen on: phone 390x844 (Bram), tablet 820x1180 (Dev), desktop 1920x1080 (Ada), Lightkeeper laptop 1440x900. Partly confirmed.

**What happens.** Everything the Lightkeeper changed arrived without a reload, but nothing on the screen a player was looking at said so. On the phone the Menu button and its drawer rows never get a dot, so a new dispatch, tension rising, the timer starting, the timer running out, a private note and 'Reports open' were found only by going to look. On the tablet the same changes land screens below. On the desktop a re-sent dispatch swaps its text in place with no stamp. No desk, the Lightkeeper's included, writes a log line for a dispatch, a tension change, a timer start, reports opening or a report being filed. Bram named this his biggest problem of the night.

**Suggestion.** Write an Activity Log line for each table event on the server (dispatch, tension, timer start, reports opened or closed, report filed; time's up can be added locally by the timer). Keep a small 'unseen' set in the store and draw a dot on the phone's Menu button and on the matching drawer row (and on the md+ Circle tab for reports) until that part is opened.

**Note.** Softer than reported: tension rising plays a tick and time's up plays a chime (sound is on by default; the AI seats could not hear them), a re-sent dispatch types itself in on the desktop, and the Lightkeeper does get a report count and per-player status.

Findings F087, F129, F138, F162, F254, F153, F224, F122, F148. Screenshots: `shots/bram/057_turn3_start.png`, `shots/bram/104_sheettimesup.png`, `shots/dev/140_notebook_tab.png`.

#### Pass Notes: no Lightkeeper-only choice, yourself offered as a recipient, and 'private' notes neither say the Lightkeeper reads them nor look private

Key `pass-notes-recipients`, area pass-notes. Seen on: laptop 1366x768 (Cass), tablet 820x1180 (Dev), phone 390x844 (Bram), Lightkeeper laptop 1440x900. Confirmed.

**What happens.** A player's To: list is @Circle plus every investigator, including themselves (a note to self goes through); there is no way to write only to the Lightkeeper. Every '(private)' note also reaches the Lightkeeper, which the label never says. On the receiving phone a private note looks like any other log line, with only '-> @Jonah Hale' mid-line and no badge, and a long one overflows the log box; Bram said he could have read it out by mistake. On the Lightkeeper's desk a private recipient stays selected for the next message.

**Suggestion.** Leave yourself out of the list; add '@Lightkeeper only' for players (the server already routes it if the name lookup is skipped); label player-side private options '@Name (and the Lightkeeper)'; set the placeholder from the target ('Only Jonah Hale will read this'); flag private lines in the payload and give them a 'Private' tag and a distinct border; optionally reset to @Circle after a private send.

Findings F111, F117, F150, F147. Screenshots: `shots/cass/048_notes_to.png`, `shots/cass/049_note_self.png`, `shots/bram/087_privnote.png`.

#### The gilded choice never says that keeping the gilded die refreshes a drive, and the phone bar mislabels the other die

Key `gilded-choice-unexplained`, area dice. Seen on: desktop 1920x1080 (Ada), tablet 820x1180 (Dev), phone 390x844 (Bram). Confirmed.

**What happens.** The slip says only 'Keep one die', with buttons 'Keep the gilded die, 3' and 'Keep the highest regular die, 6'. Nothing says that keeping the gilded die gives a drive point back, what each choice's outcome would be, or that a second 6 makes a critical. On a tie (gilded 4, regular 4) the two look equal, though only one refreshes; keeping the regular one silently throws the point away. After keeping, only the log mentions the refresh. The phone's bottom bar calls the same die 'Keep the highest die, 1' even when the gilded die is higher.

**Suggestion.** One shared label for both places, built from the outcome: 'Keep the gilded 4: Mixed, 1 Nerve back' and 'Keep the 4: Mixed'. Show both lines under the 'Keep one die' stamp, add ', 1 Nerve back' to the slip after a gilded keep, and optionally offer only the gilded die on a tie.

Findings F124, F187, F168, F184, F159. Screenshots: `shots/ada/060_focus_rolled.png`, `shots/dev/098_r3sense.png`, `shots/bram/112_tray_keep.png`.

#### Game terms go unexplained, and hover tooltips never reach a touch screen

Key `report-and-terms-unexplained`, area other. Seen on: phone 390x844 (Bram), tablet 820x1180 (Dev), Lightkeeper laptop 1440x900. Confirmed.

**What happens.** A first-time player on the phone met bare key phrases and quoted questions on the report, with nothing saying what a tick is worth or who awards it, and Send goes at one tap with no summary. The gold rings on Illumination pips 3, 6, 9 and 12 are explained only by a hover title, and 'milestone reached!' says nothing about what it gives; the Lightkeeper could not tell either. The Stamina Training chip's '3 of 3 left' is only in its accessible name. The (i) 'About Move' slips are the one place players could teach themselves.

**Suggestion.** Reuse the touch-friendly ActionInfo slip for keys, milestones and circle-ability chips; add a one-line caption under the pips ('Gold rings are milestones: abilities such as Resource Management pay out there. At 12 the circle advances.'); a two-line intro on the report; a two-step Send that shows what will be sent; and a milestone log line that says whether anything is owed.

Findings F222, F255, F109, F214. Screenshots: `shots/bram/134_t8_report2.png`, `shots/bram/149_stamina_rows.png`, `shots/dev/041_circle_page.png`.

#### Spending a circle resource is one tap on a 16 px square with no confirm or Undo, and locked squares look live

Key `resource-spend-no-guard`, area circle-page. Seen on: phone 390x844 (Bram), desktop 1920x1080 (Ada), tablet 820x1180 (Dev). Confirmed.

**What happens.** Each Stitch, Refresh and Train square is a 16x16 button 4 px from the next, all with the same name ('Spend Refresh'). One tap spends the circle's shared resource at once; the only change on the Circle page is the counter. While spending is locked, or after a player's two spends, the squares look exactly the same but do nothing, and the reason is only a hover title. The counter reads 'Spent this assignment' though spending is allowed only between assignments.

**Suggestion.** One button per resource ('Spend 1 Refresh: restore all your drives and resistances', 44 px on touch) with the mark-style few-second Undo or a two-press confirm; dim squares that cannot be spent and print the reason under the header; relabel the counter 'Your spends: 1 / 2'.

Findings F249, F252, F186. Screenshots: `shots/bram/150_resources.png`, `shots/ada/113_resources.png`, `shots/dev/105_pip_tapped.png`.

#### Drive pips only go up: a mistaken tap cannot be undone, and refilling a drive leaves no log line

Key `drive-pips-one-way`, area player-desk. Seen on: test engineer (stress beat), laptop 1366x768 (Cass), Lightkeeper laptop 1440x900. Confirmed.

**What happens.** Only pips at or above the current value are live, so a filled pip can never be cleared; the only way down is to spend the point on a roll, which the test engineer had to do. The Lightkeeper's copy of the sheet shows the pips read-only, with no edit. A player can top a drive up at any time and no desk logs it, though every other self-edit is logged.

**Suggestion.** Make the last filled pip clear one point (as the trauma record already does), let the Lightkeeper's trauma edit set drives too (the server already accepts update_drive from the Lightkeeper), send the update to the player's channel, and log 'refilled Nerve: 4 of 4' or 'The Lightkeeper set Latch's Nerve to 2 of 4'.

Finding F236. Screenshots: `shots/cass/122_t3_after.png`, `shots/dm/117_t3_after.png`.

#### Switching desk section hides the Activity Log, dice tray, hourglass, timer and Pass Notes

Key `section-hides-table-column`, area gm-desk. Seen on: Lightkeeper laptop 1440x900, tablet 820x1180 (Dev). Partly confirmed.

**What happens.** On the Lightkeeper's desk, Notebook, Circle and Map replace the whole table column, and an open investigator sheet hides the hourglass and timer, so rolls landing and the timer reaching 0:00 go unseen until she goes back to Roster, which reopens the last sheet rather than the roster. On the tablet the Notebook tab hides the hourglass, timer, log and reports; the bell's 20:00 ran out while Dev was writing. Nothing is lost, it is just not seen. Both asked for a pinned table strip.

**Suggestion.** A small table strip (tension n/4, the running timer, the newest log line with an 'n new' count) in the Lightkeeper's left column whenever the roster is not showing, and above the player's Notebook. Make the Roster tab clear the open sheet when entered from another section.

**Note.** An open sheet keeps the log, tray and Pass Notes; only the hourglass and timer go. The 0:00 chime plays in every section when sound is on.

Findings F149, F198, F276, F213, F269. Screenshots: `shots/dm/072_lk-notes-r2.png`, `shots/dm/144_refresh_back.png`, `shots/dev/138_r4_nb_timer.png`.

#### At laptop heights the desk is locked to the window, so Your Circle and the running timer are cut off and unreachable

Key `left-rail-squeezed`, area player-desk. Seen on: laptop 1366x768 (Cass), desktop 1920x1080 (Ada). Confirmed.

**What happens.** On a 1366x768 laptop (629 px of page after the browser's bars) the desk cannot scroll. The dispatch and the hourglass take the left rail, leaving Your Circle a 12 to 42 px slot (no member readable) and the running timer ticket 4 px below the window, where no key, wheel or Tab reaches it; the 0:00 at time's up is cut off the same way. At 1920x941 the fourth circle card is half hidden. Cass's exit note: she spent the session scrolling inner boxes and guessing what was under the edge.

**Suggestion.** Let the rail scroll as a whole and give the circle box a floor: in TactileSidebar.jsx:189 add xl:overflow-y-auto (with xl:-mx-3 xl:px-3 so the tilted cards are not clipped) and change the circle box's xl:min-h-0 to xl:min-h-[7.5rem]. Tried in the page: a full card shows and the timer scrolls into view.

**Note.** Ada's 'no scrollbar until hover' was the headless browser's --hide-scrollbars flag.

Findings F104, F097, F204, F166, F267. Screenshots: `shots/cass/042_start_turn3.png`, `shots/cass/098_start_r4.png`, `shots/ada/048_turn3_start.png`.

#### A roll's result slip pushes the Activity Log behind Pass Notes, leaving zero to four lines visible

Key `log-squeezed-by-slip`, area player-desk. Seen on: laptop 1366x768 (Cass), Lightkeeper laptop 1440x900. Confirmed.

**What happens.** At 1366x629, after a roll the slip grows, the log card shrinks below its own body and slides under Pass Notes, so the newest lines (the log pins itself to the bottom) are exactly the hidden ones; after a five-line pass note no entry was readable. On the Lightkeeper's 1440x900 desk a stale slip leaves the log about four lines. The slip stays until the next roll.

**Suggestion.** In ActivityLog.jsx:110 change xl:min-h-0 to xl:min-h-[9rem], and let the dice column scroll inside itself (DiceVault.jsx:156: xl:overflow-y-auto). Tried in the page: the log stays readable after a roll and Pass Notes is reachable.

Findings F135, F146. Screenshots: `shots/cass/059_pre_roll.png`, `shots/cass/062_keep_enter2_settled.png`, `shots/dm/069_logbox.png`.

#### On phone and tablet the hourglass and running timer are never where the player rolls

Key `hourglass-offscreen-small-screens`, area phone-tablet. Seen on: phone 390x844 (Bram), tablet 820x1180 (Dev). Confirmed.

**What happens.** On the phone the hourglass and timer exist only on Menu > Hourglass; the sheet, Dice and log, and the tray sheet show neither, so during a timed scene the player must leave the sheet to check the clock (the 3:00 had run out before Bram saw it start). On the tablet in portrait the sidebar drops below everything: the dispatch two screens down and the hourglass and timer at the bottom of a 3300 px page, yet screen readers and Tab meet them first, because CSS order moves the drawing but not the reading order.

**Suggestion.** A compact 'Tension n/4 · m:ss' ticket in the phone's slim band and the roll bar, and at the top of the tablet's sheet column, while a timer runs or tension is above 0. Move TactileSidebar after DiceVault in the DOM and place it with lg:col-start-1 lg:row-start-1 so reading order matches what is drawn.

Findings F182, F107, F171. Screenshots: `shots/bram/108_hourglass3.png`, `shots/dev/043_desk_full.png`, `shots/dev/071_r2start.png`.

#### The character creator keeps the old scroll position on Advance, so each step opens at its bottom

Key `creator-step-scroll-position`, area creator. Seen on: phone 390x844 (Bram), laptop 1366x768 (Cass). Confirmed.

**What happens.** Moving to the next creator step keeps the page scrolled: on the phone step 2 opens on Catalyst and Question with Portrait and Full Name above the screen, and step 3 opens on the drive points with the free raise out of view. Same on the 1366 laptop. Browser scroll anchoring holds the persistent Back/Advance row in place, so every step opens at its bottom.

**Suggestion.** In CharacterCreator.jsx add useLayoutEffect(() => { window.scrollTo({ top: 0 }); }, [step]); optionally move focus to the new step's heading.

Findings F012, F032. Screenshots: `shots/bram/009_step2.png`, `shots/bram/010_step2_top.png`.

#### On a phone the creator's gild control is a 28 px unlabelled sun glyph, and gilded actions do not look alike

Key `creator-touch-targets`, area creator. Seen on: tablet 820x1180 (Dev), phone 390x844 (Bram), desktop 1920x1080 (Ada). Partly confirmed.

**What happens.** On the 390 phone the gild button is 28x28 and the +/- buttons 36x36 with 4 px between them. The free gild is a small faded sun beside the action name with no visible label and no instruction in parts A to C; it is found only through the checklist. Once chosen, the free gild and the specialty's fixed gild show the same sun, and the rating dots use three colours with no key; the gold dot appears only when the top point is one the player placed, so of two gilded actions one shows gold and the other does not (Ada, 1920 desktop), which makes the free gild look as if it did not take.

**Suggestion.** Give the gild button a 44 px touch area on every coarse pointer (a ::before overlay keeps the row width), add a one-line key under heading B ('Tap the sun beside an action to gild it...'), mark the specialty gild as fixed (a small padlock or dashed ring), and draw the gold top pip on every gilded action (CharacterCreator.jsx:1226).

**Note.** The tablet measurements in F030 (28 px) were a harness artifact: that seat had no touch emulation; on a real touch tablet every control is 44 px.

Findings F030, F013, F015. Screenshots: `shots/dev/011_ratings.png`, `shots/dev/013_ratings_full.png`, `shots/bram/017_step3_gild.png`, `shots/ada/016_ratings_done.png`.

#### Advancement 'Gild an additional action' picker: 20 px buttons, choice shown by colour only, unexplained ✦

Key `advancement-gild-picker`, area advancement-wrap. Seen on: tablet 820x1180 (Dev), laptop 1366x768 (Cass). Confirmed.

**What happens.** Each action button is 139x20 px with 12 px text on the tablet. The chosen action is shown only by a fill, with no aria-pressed (the 'Add 1 action point' grid in the same dialog has the same gap), and already-gilded actions are disabled and announced 'Focus ✦' with no reason.

**Suggestion.** aria-pressed on each button, a hidden ', already gilded' (or ', already at 3') beside the mark, and 44 px touch height on coarse pointers.

Findings F260, F264. Screenshots: `shots/dev/161_adv_read.png`, `shots/cass/134_adv_ready.png`.

#### Taking your own mark says 'Bleed mark taken', empties the box 5 seconds later, and only then offers Death Defy

Key `mark-undo-then-death-defy`, area marks-scars. Seen on: laptop 1366x768 (Cass). Confirmed.

**What happens.** For a Slink with Death Defy unused, every self-taken mark goes: a 5-second Undo strip saying the mark is taken with a ghosted box, then an empty box and a 30-second Death Defy card (the server holds the mark meanwhile), then, on 'Take the mark', a filled box. Two countdowns for one click, the second decides for you if it runs out, and neither decision is logged.

**Suggestion.** Keep the box ghosted while an own-mark offer holds it, and word the strip so it does not claim the mark has landed ('Bleed mark: it goes on the record when the Undo runs out'). The missing log line is self-mark-no-log.

**Note.** The auto-decline after 30 seconds is intended (marks.py:12-14).

Finding F185. Screenshots: `shots/cass/082_bleed_offer.png`, `shots/cass/083_bleed_after_undo.png`, `shots/cass/085_bleed_landed2.png`.

#### Taking a mark on your own sheet leaves no Activity Log line

Key `self-mark-no-log`, area marks-scars. Seen on: desktop 1920x1080 (Ada). Confirmed.

**What happens.** A self-taken mark changes the sheet but writes nothing to any desk's log, unlike the Lightkeeper's 'set ... marks to 1' line, Endurance and incapacitation. The roster cards show no marks, so without opening the sheet the Lightkeeper has no sign of it. Declining Death Defy is not logged either.

**Suggestion.** Give apply_mark an announce flag that logs 'Dr. Imogen Thale took a Body mark (1 of 3).', passed from the take_mark and decline paths only, so ability-cost callers that already log are not doubled.

Finding F177. Screenshots: `shots/ada/077_body_mark_after.png`.

#### The Lightkeeper can put a resource back only silently and cannot restore a player's spend count

Key `lk-resource-repair`, area gm-desk. Seen on: Lightkeeper laptop 1440x900. Confirmed.

**What happens.** Pressing a resource pip changes the pool with no log line on any desk. The per-player limit of two spends can only be reset by End Assignment, so after Cass's double spend the Lightkeeper put a Refresh back and Latch still could not Stitch; the Lightkeeper ruled it by word at the table. 'Reset drive and ability uses' logs 'session resources have been reset' but leaves the spend count alone.

**Suggestion.** Log the Lightkeeper's pool edits ('set the circle's Refresh to 2 (was 1)'). Add a 'Give a spend back' control on the Lightkeeper's copy of the sheet, showing 'Resources spent this assignment n / 2', that lowers the count, optionally returns the resource, and logs it. Reword the reset line.

Finding F274. Screenshots: `shots/dm/144_refresh_back.png`, `shots/dm/145_roster_after_refresh.png`.

#### Tactician 'Use (1 Nerve)' spends on one tap with no confirm, Undo or question

Key `tactician-one-tap`, area abilities. Seen on: phone 390x844 (Bram). Confirmed.

**What happens.** On the phone the 118x22 px button sits where a thumb lands after switching tabs; one tap spent Nerve with no change near the button, the button stays live, and the log says 'used Tactician (1 Nerve)' without which of the three questions was asked. Staying live is right (it can be used again); the missing question and the tiny irreversible target are not.

**Suggestion.** Make the three questions a required choice in both the front-end and server ability tables (the existing label code then logs the question), and give the Use button 44 px on touch; optionally a short 'Spent 1 Nerve' status.

Finding F200. Screenshots: `shots/bram/124_t7_abil.png`, `shots/bram/125_t7_tactician.png`.

#### A Lightkeeper's secret roll looks identical to an open one and leaves no trace on her own desk

Key `secret-roll-indistinct`, area dice. Seen on: Lightkeeper laptop 1440x900. Confirmed.

**What happens.** The secret result slip has no 'Secret' mark, and her own log gets no line, so the result is gone as soon as anyone at the table rolls (a player's roll replaces it on her felt within seconds). Players correctly see nothing.

**Suggestion.** Add is_secret to the roll_result payload, show 'Secret: only you saw this' on the slip, and send a '(Secret)' log line to the Lightkeeper's own channel only.

Finding F120. Screenshots: `shots/dm/050_open_roll.png`, `shots/dm/052_secret_roll.png`.

#### The Lightkeeper's formation panel never says formation began, shows no per-player progress, and Finalize ignores pending relationships

Key `lk-formation-status-thin`, area circle-formation. Seen on: Lightkeeper laptop 1440x900. Confirmed.

**What happens.** Approving a player silently opens the papers on their desk. The Lightkeeper's 'Circle formation so far' starts folded, shows dotted lines, has no chapter house row, shows insignia only once voted, reads 'Question 5 leads' without the question, hides ties, and never says who has not yet voted or answered. 'Finalize the circle' says '4 of 5 investigators' (reads as one missing) and nothing about relationships still waiting.

**Suggestion.** Start the panel open before the seal with a line that papers are open on players' desks; show the question text, chapter house, insignia always, ties, and a tick per investigator per section; in Finalize, say how many relationships still wait and that they can be accepted after the seal; reword '4 in the circle (up to 5)'.

**Note.** Pending relationships do keep their Accept after the seal, so F079's worry did not happen.

Findings F045, F079, F078. Screenshots: `shots/dm/033_formation_open.png`, `shots/dm/039_finalize_armed.png`, `shots/dm/038_formation_answers.png`.

#### Browser Back on the desk leaves the site instead of returning to the Chapter Hub

Key `browser-back-exits`, area other. Seen on: laptop 1366x768 (Cass). Confirmed.

**What happens.** Hub and desk share one address and opening a desk adds no history entry, so Back (or a phone's back gesture) goes to whatever page came before the site; on the player phone, laptop and Lightkeeper desk it went to a blank page. Forward restores the desk intact. The creator and account page already have their own history entries.

**Suggestion.** Generalize AppRouter's useCreatorExits to DESK and GM_DASH: push a marked history entry on entering, go to HOME on popstate, and step back when leaving by the button.

Finding F077. Screenshots: `shots/cass/039_after_back.png`, `shots/cass/040_after_return.png`.

#### An unpinned private note, or an unsent field entry, is lost without warning when the player leaves the Notebook

Key `private-note-draft-lost`, area notebook. Seen on: laptop 1366x768 (Cass). Confirmed.

**What happens.** Typing in Notebook > Private Notes and stepping to the Investigator tab (to roll mid-note) or to the chapter hub empties the box with no warning; the Field Notes form loses its title and text the same way. The private-note box is two lines tall and shows only the last line typed.

**Suggestion.** Keep unsent text in localStorage per viewer and campaign (wrapped in try/catch, as the creator's draft already is), clear it after pinning or adding, and give the box four rows or let it grow.

Finding F115. Screenshots: `shots/cass/054_privnote_typed.png`, `shots/cass/057_privnote_back.png`.

#### Sketch tools fall back to Select after one shape, so the next stroke drags the drawing

Key `sketch-tool-reverts`, area notebook. Seen on: tablet 820x1180 (Dev). Confirmed.

**What happens.** After drawing one box or line, the sheet's tool silently becomes Select; Dev's next stroke grabbed the box and moved it up the page. Only the Pen keeps drawing. Excalidraw's own lock button is hidden by the sheet's CSS, and a tablet has no Q key to toggle it.

**Suggestion.** Pass locked: true when setting tools in SketchPad.jsx (:143 and pickTool at :173). Tested on a touch tablet: every tool drew twice in a row and nothing moved.

Finding F170. Screenshots: `shots/dev/086_tower_drawn.png`, `shots/dev/089_tower_fixed.png`.

#### Screen reader: a turned report card never says which keys and questions were ticked

Key `report-cards-sr`, area accessibility. Seen on: Lightkeeper laptop 1440x900. Confirmed.

**What happens.** Each report card is one button whose spoken name is '<name>'s report: turn back to the front'; the ticks and crosses are hidden marks, so a blind Lightkeeper cannot tell what anyone claimed.

**Suggestion.** Add hidden 'Ticked:' / 'Not ticked:' words beside each mark and build the turned card's name from the claims, or render the back as a list with a separate Turn back button.

Finding F240. Screenshots: `shots/dm/122_after_jonah_click.png`, `shots/dm/123_reports_flipped.png`.

### Low

- **The circle question's personal answer saves silently on blur, can be lost silently, and its fixed box hides longer answers** (`personal-answer-save-feedback`; phone 390x844, desktop 1920x1080). Nothing on screen says the answer saved; only the focus outline goes away. Worse, if the connection is down when the player clicks away, the save is dropped and the box still shows the new text as if saved; a reload brings back the old answer. The box is fixed at four rows, so a 400-character answer cannot be read back whole (every real playtest answer overflowed on the phone). Suggestion: Show 'Saved' or 'Not saved yet' by comparing the draft with the server-confirmed value, optionally resend on reconnect, and let the box grow. Findings F049, F051.
- **'Your Chapter House' is one shared box where the last writer wins, nothing says so, and it has no accessible name** (`chapter-house-shared-box`; phone 390x844, desktop 1920x1080). The label reads as personal, but the box is shared and saving replaces everyone else's text; players knew only because Ada told the table. When another player saves, the box remounts and wipes what you were in the middle of typing, and your focus drops. The textarea has no accessible name. Suggestion: Label it 'The Circle's Chapter House' with a line 'Shared by the whole circle: what you save here replaces what anyone else wrote', tie the label to the box, keep a local draft while the box has focus, and optionally show who wrote it last. Findings F053, F057.
- **Log lines for other people's rolls leave out the dice: 'Lightkeeper rolled a 3' with no count or faces** (`others-rolls-not-shown`; phone 390x844, desktop 1920x1080, tablet 820x1180). A player's tray shows only their own rolls, so the only record of anyone else's roll (the Lightkeeper's open roll included) is a log line with no pool, faces or drive spent. The Lightkeeper had told the table to look at their trays. Suggestion: Put the dice in the shared log line on the server ('Edda Rook rolled Survey, a 4: Mixed success (2 dice: 4, 3).'), also for the gilded keep and burn lines; no front-end change is needed. (Players' trays showing only their own rolls is the documented design (DESIGN.md:445).) Findings F127, F128, F144.
- **End Assignment clears everyone's gear, but the confirm and log say 'gear slots reset', which reads as refilled** (`end-assignment-gear-wording`; Lightkeeper laptop 1440x900, desktop 1920x1080, phone 390x844). After End Assignment every sheet shows three empty gear slots, while the armed text says 'ability uses and gear slots reset' and the log 'gear slots ... have been reset'. Three seats read that as 'refilled' and were surprised. Suggestion: Reword the armed hint, receipt and log: 'Ability uses and the hourglass are reset; marked gear is cleared.' (Clearing gear follows the rulebook (p. 52) and the empty slots with no prompt follow the owner's No Instructions rule; only the wording is at issue.) Findings F242, F251, F256.
- **Gear limits are silent: a fourth pick does nothing, Add greys out with its reason a screen away, and a write-in is cut at 60 characters** (`gear-limits-silent`; desktop 1920x1080, phone 390x844, laptop 1366x768). In the creator a fourth gear click does nothing and the unpicked items still look clickable. In play on the phone, with three items marked, a typed write-in leaves Add greyed and the '3 / 3 selected' line is below the dialog's fold. On the laptop a long write-in is silently cut at 60 characters mid-word and saved that way. Bram also wanted somewhere to note an item the Lightkeeper hands over (the brass belfry key). Suggestion: Dim unpicked items at the limit with a short reason beside Add ('All 3 gear slots are marked...'), show a character counter near 60, and add 'untick one to swap' beside the counter. Findings F018, F160, F261.
- **Empty desk slots look blank because their words are screen-reader-only** (`desk-empty-states-blank`; Lightkeeper laptop 1440x900, phone 390x844). A new campaign's Lightkeeper desk shows a dashed frame where investigators will go (its 'No investigators in play' is hidden text), a blank ruled Activity Log whose header is cut to 'FORM C.O. 9 · TABL...', and a Circle ability select that looks like a broken empty box. On the phone the empty dice tray is bare felt and nothing says rolls start from the sheet's action buttons, so Bram opened the dice to roll and found no Roll button. Suggestion: Visible empty-state lines: 'No investigators yet: they appear here once you approve them', 'Rolls, passed notes and table events will appear here', 'Choose a circle ability...', and on the player tray 'To roll, tap an action on your sheet'. Findings F003, F004, F009, F098.
- **Screen readers hear identical or missing names: every vote is 'Vote', every reply 'Accept'/'Counter', and the Notebook's Handwriting select is unnamed** (`sr-identical-control-names`; desktop 1920x1080, tablet 820x1180). Each suggested name's button is 'Vote' or 'Voted' with no name and no pressed state; the question, ability and insignia cards have no pressed state either. The relationship papers have two 'Accept' and two 'Counter' buttons and same-named fields, so a wrong press confirms the wrong person's proposal. The Notebook's Handwriting select has no label. Suggestion: 'Vote for The Ninth Night' with aria-pressed; 'Accept Jonah Hale's Champion'; 'Relationship to Imogen Thale'; a real <label> for the Handwriting select. Findings F056, F073, F102.
- **Dispatch Location, dispatch Atmosphere and the Pass Notes message are too short to proofread what you send** (`short-boxes-long-text`; Lightkeeper laptop 1440x900, tablet 820x1180). The dispatch's Atmosphere box is two lines and stays scrolled to one end; Location is a one-line input that cuts a long place name mid-word. On the tablet the Pass Notes message is one line, so a 300-character note shows only its tail before Send. Everything arrives whole. Suggestion: Grow the fields with their content (field-sizing: content with a small JS fallback); make Location and the Pass Notes message one-row textareas, keeping Enter to send. Findings F084, F175, F169.
- **The dispatch card's 'Dispatched at' receipt vanishes on a section switch, and dispatches leave no trace in the log** (`dispatch-record-lost`; Lightkeeper laptop 1440x900, tablet 820x1180). After Notebook and back, the 'Dispatched at 12:44 AM.' receipt is gone and the card looks like an unsent one, so the Lightkeeper cannot tell whether players have it; an unsent draft is also dropped silently. No dispatch writes a log line, so after a re-dispatch or End Assignment the assignment's three dispatches are recorded nowhere. Suggestion: Under the stamps always say 'On the players' desks' when the fields match the circle, or 'Not dispatched yet' when they differ, and log each dispatch ('Dispatch: the flooded crypt...'). A per-assignment dispatch list would be a separate feature. (Clearing the card at End Assignment is intended and announced, and each re-dispatch replaces the current one by design.) Findings F119, F271.
- **The dispatch field the Lightkeeper calls 'Atmosphere' is 'Conditions' for players, and the letter and the card carry different serial numbers** (`dispatch-letter-mismatch`; phone 390x844, desktop 1920x1080). The Lightkeeper writes a letter ('To the investigators of The Ninth Night: proceed with haste to...'); players see a short card with Location and Conditions. The short card is the intended design, but the same field has two names, so 'check the atmosphere' finds nothing, and the two serial numbers never match. Suggestion: Call it 'Atmosphere' on the player card (TactileSidebar.jsx:213), optionally add 'To the investigators of <circle>' under the heading, and hash the same key for both serials. Findings F088, F096.
- **The creator's final summary leaves out abilities, ratings, drives, gilds, portrait, style and question** (`creator-dossier-incomplete`; desktop 1920x1080, phone 390x844). Step 4's 'Your investigator' box shows only name, pronouns, role and specialty, a gear count and the catalyst, so a player cannot check the build before saving without paging back (long scrolls on a phone), and abilities, ratings and drives cannot be changed after Save. Suggestion: Add tiles for abilities, gear names, drives and actions (marking gilds), plus Style, Question and a portrait thumbnail; optionally make each tile jump back to its step. Findings F017, F014.
- **The Circle Formation Papers lock the whole desk until the seal, with no way to fold them once you are done** (`papers-lock-desk`; desktop 1920x1080, phone 390x844). A player who has finished every section still cannot reach the sheet, notebook or pass notes until the Lightkeeper seals the charter: Escape does nothing and clicks land on the overlay. Nothing says why. On the phone the papers are about eight screens long with no sign of which sections are done. Suggestion: Add a 'Fold papers' button (and Escape) plus a small 'Circle formation papers' button on the desk to reopen them, a line saying the Lightkeeper seals them when everyone is done, and a done tick on each section title. (The blocking dialog is deliberate (useDialog with no onClose), and the header and nav are dimmed with the rest of the desk, not lit above it as reported.) Findings F064, F060.
- **Abilities and reports that ask a question give it nowhere to go: Let Them In is a toast with only Close** (`question-abilities-no-home`; tablet 820x1180, laptop 1366x768). Let Them In appears after a Bleed mark as a 20-second card with only Close, over the log, with no field for the question, and nothing reaches the Lightkeeper or the log, so the Lightkeeper's desk never learns it fired. The report has no line for how a key was earned, and Tactician asks no question. Questions and answers went to table talk. Suggestion: Log that Let Them In fired; give the card a one-line 'Your question for the Lightkeeper' field that sends it as a note and stops the countdown while typing; add an optional 'How were these earned?' note to the report, shown on the Lightkeeper's card. (Not the '10-second toast' reported: the card lasts 20 seconds. Pass Notes to @Circle do reach the Lightkeeper. The rulebook settles these questions by talking at the table, so this is a convenience, not a defect.) Findings F209, F270, F225, F227.
- **Creator caps grey out '+' with no reason, and 'max 2 per action' reads as a cap on free points** (`creator-caps-unexplained`; desktop 1920x1080, laptop 1366x768). A Doctor whose Focus starts at 2 finds Focus's '+' greyed under 'Distribute 3 Free Action Points (max 2 per action)', though no free point is on it: the rule caps the rating at 2 at creation. A Criminal's Cunning '+' stops at 6 while the counter says 4/6 placed. Neither disabled button has a reason anywhere. Suggestion: Headings 'no action above 2 at creation' and 'no drive above 6 at creation', a title on each disabled '+', and the cap in the tracks' spoken labels. Findings F016, F031.
- **The hub's Halcyon Herald says 'a emergency hearing', and its drop cap splits 'Citizens' into 'C itizens' for screen readers** (`herald-copy-fixes`; laptop 1366x768, tablet 820x1180). A typo in the last paragraph, and the floated drop cap is a separate element, so a screen reader says 'C' then 'itizens'. Suggestion: 'an emergency hearing'; style the paragraph's ::first-letter instead of a separate span (pixel-identical in the trial). Findings F026, F036.
- **The trauma record Edit never names whose record it is, and each corrective press is a separate public log line** (`trauma-edit-whose`; Lightkeeper laptop 1440x900). Once the trauma record is in view on the Lightkeeper's copy of a sheet, nothing on screen names the investigator, and the edit hint does not either. The Lightkeeper put a Bleed mark on the Doctor instead of Edda; undoing it took two more presses and three public lines (2, 1, 0) the player watched. Two box buttons are both named 'Set Bleed marks to 1'. Suggestion: Start the edit hint with 'Editing Edda Rook's trauma record' and name the toggle the same way; label the last filled box 'Clear mark 2'; optionally send one update per track on Done, or word the log as a correction ('from 2 to 0'). (The sheet does not open scrolled past the name; that came from the harness scrolling to the Edit button. The wrong-sheet slip was helped by the Roster tab reopening the last sheet (section-hides-table-column).) Finding F195.
- **Campaign codes are case-sensitive: 'Drowned-Bell' is refused with a message about spelling** (`campaign-code-case-sensitive`; laptop 1366x768). Joining with 'Drowned-Bell' for the code drowned-bell returns 'No campaign uses that code. Check the spelling...'. Codes that differ only in case can also coexist as separate campaigns. Suggestion: Match codes case-insensitively, preferring an exact match, and refuse new codes that differ from an existing one only by case. (The field already has autoCapitalize=none, so phone keyboards should not cause it; it needs a player or Lightkeeper to type capitals.) Finding F038.
- **The Lightkeeper cannot open a requesting investigator's sheet before approving** (`join-request-no-sheet-preview`; Lightkeeper laptop 1440x900). A join request card shows name, pronouns, role, specialty and catalyst with Approve and Reject; nothing opens the sheet, and once approved there is no reject. The server already lets the Lightkeeper read a pending sheet. Suggestion: A 'View sheet' button beside Approve and Reject that opens the existing sheet view read-only. Finding F041.
- **While reports are closed, Send report and the key boxes look live, and 'Reports closed' does not say when they open** (`report-closed-looks-live`; phone 390x844). The disabled Send report is styled like a live outline button (bolder than the live Menu button), the checkboxes can be ticked (and the ticks are then lost, see key-ticks-lost), and nothing says reports open when the Lightkeeper ends the assignment. Suggestion: 'Reports closed: the Lightkeeper opens them at the end of the assignment', a disabled style that reads as disabled, and either disabled boxes or kept ticks. Finding F090.
- **On a phone, once the roll bar fades nothing shows that a Burn and reroll choice is waiting** (`result-bar-fades-phone`; phone 390x844). The roll bar fades after 5 seconds (9 with a choice). After that the sheet shows no sign that 'Burn and reroll' is still on offer and the header's dice button looks the same; Bram found it only by opening Dice and log. Suggestion: Keep the owner's fading bar, and put a dot on the band's dice button while a post-roll choice waits. (The fade itself and its timings are the owner's design (DESIGN.md:448).) Finding F131.
- **Handwriting is chosen only when joining, so a rejected and re-sent request silently resets it to Caveat** (`pen-picked-at-join-only`; tablet 820x1180). The creator never offers the pen; it is picked in the Join dialog and stored with the join. If the Lightkeeper rejects the request, the pen is cleared, and the Registry's join form shows Caveat again, so asking again replaces the player's choice without a word. Suggestion: Store the pen with the investigator (pick it in creator step 2, send it on forge), stop clearing it on reject, and prefill the Registry's join form from it. The one-line version: delete the clear at engine.py:107 and prefill the form. (A player who presses Save for Later does meet the picker later, in the Registry's join form.) Finding F034.
- **The Lightkeeper's trauma Edit shows 'No scars.' and never says how a scar gets onto the record** (`lk-scar-route-hidden`; Lightkeeper laptop 1440x900). The edit only sets marks (up to 3) and removes scars; the route to a new scar (fill the track to 3, then the player takes the next mark on their sheet) is written nowhere on the page. Suggestion: One sentence in the edit hint: 'A new scar comes when a full track takes another mark: fill the track to 3 and have the player take the next mark on their sheet.' Finding F197.
- **Turning on Born in the Shadows does not change the Hide button: the pool shows only after the roll** (`ability-toggle-no-preview`; laptop 1366x768). With the ability chip on, the Hide button still reads 'HIDE +1D' with one gilded dot, and its spoken name leaves the ability out. Only the slip afterwards says '3 dice, 2 gilded'; with no drive spent the ability makes every die gilded and removes the gilded choice, which a player would want to know first. Suggestion: Preview the pool from the chosen chips (dice, gilds, ability names) in the button and its accessible name, mirroring the server's _plan_roll. Finding F140.
- **A burn whose reroll needs a gilded choice is logged as three lines that read like a second roll, and no burn names the drive** (`burn-log-shape`; desktop 1920x1080). Jonah's burn on Control logged 'rolled Control, a 2', 'burned resistance on Control.', then 'rolled Control, a 3', with nothing saying the 3 replaced the 2; a burn without a gilded choice is one line. Neither says which drive's resistance burned. Suggestion: One shape for every burn: 'burned Nerve resistance on Control, a 3: Failure' (log nothing until the choice when one is needed). Finding F157.
- **The player Circle tab reflows after the last relationship Accept, moving the card from under the mouse** (`circle-tab-reflow-accept`; desktop 1920x1080). At 1920 the Circle papers balance their columns by height, so when the last Accept shortens the relationships paper it jumps to the third column and Circle History takes its place; with nothing pending there is a large empty band. Suggestion: At the three-column width use a grid with the relationships paper pinned to column 3 (tested by injected CSS: nothing moved). Finding F100.
- **On the Lightkeeper's Circle page one report card sits alone below the fold and 'Open reports' starts below the window** (`lk-report-cards-split`; Lightkeeper laptop 1440x900). At 1440x900 three report cards fill the middle column while the fourth sits under the questions in the left column, both it and 'Open reports' below the window, so the page seems to show three cards for four investigators. Suggestion: Wrap the questions paper and the report cards in one group so a column break can never fall between them (tested: Open reports in view at every desk size). Finding F216.
- **After 'Add entry' the new entry is often screens below, with no confirmation** (`add-entry-scrolls-away`; tablet 820x1180). The book turns to the new entry's page but the window keeps its old offset, so the third to sixth entries on a page land off screen (3400 px down on the tablet) with no 'Added' message, and focus drops to the page. Suggestion: After a successful add, scroll the new entry into view and focus it (tested by patching the page: every new entry landed in view); optionally 'Added to Field Notes, page N'. Finding F192.
- **On a phone the Notebook contents cut entry titles to about 20 letters** (`notebook-toc-titles-cut`; phone 390x844). 'Saint Aldric, harbour office: the eighth man' shows as 'Saint Aldric, harbo...', so two entries on the same place look identical; the full title is only in the spoken name. Suggestion: Let contents titles wrap to two lines on narrow pages and count two-line rows there. Finding F094.
- **The log announces a field entry as 'has archived a journal entry', with no title and a verb that sounds like deletion** (`journal-entry-log-wording`; phone 390x844). Four different entries produced four identical lines; the Notebook itself never says 'journal' or 'archive'. Suggestion: 'Dr. Imogen Thale added a field entry: Saint Aldric, harbour office: the eighth man' (and 'added a sketch' / 'a photograph'); update the pinned test. Finding F099.
- **On a tablet the Link mark leaves the caret in the link words, so adding the address needs a 2 mm tap** (`link-mark-touch-caret`; tablet 820x1180). With nothing selected, Link inserts '[](https://)'; after typing the words the caret is still in the brackets and a soft keyboard has no arrows, so reaching the address means a precise tap. Tapping Link again nests a second link. Suggestion: When Link is pressed with the caret inside an unfinished link, select 'https://' instead of inserting another. Finding F141.
- ***Italic* emphasis is invisible in cursive pen fonts** (`italic-invisible-cursive`; tablet 820x1180). The pen fonts have no italic face, and the browser's synthetic slant is lost in a hand that already slants, so emphasised words look like the rest; bold is clear. Suggestion: Underline emphasis in notes (and give links a dotted underline so they stay distinct). Finding F118.
- **A '## ' heading in a field entry renders as h5 under the entry's h3 title, skipping h4** (`entry-heading-levels`; tablet 820x1180). The toolbar's own Heading button writes '## ', which becomes h5 directly under the h3 entry title, so heading navigation skips a level. Visually fine. Suggestion: Map Markdown h1 and h2 to h4 and h3 to h5 in NoteMarkdown.jsx, keeping the visual classes. Finding F143.
- **Creator path cards flip one at a time with the arrows only: no swipe or role jump, 9 taps to reach the Occultist** (`path-cards-tablet-navigation`; tablet 820x1180). On the tablet the only way through the 10 path cards is the round arrows, each flip locking them for about 600 ms. A swipe on the card does nothing. Suggestion: Add a horizontal swipe on the card stack and optionally a row of role chips that jumps to a role's specialties. Finding F029.
- **During a mark's Undo window a screen reader hears 'Body marks: 0 of 3' beside 'Take Body mark 2 of 3'** (`mark-undo-sr-count`; desktop 1920x1080). For the 5 seconds a mark waits for Undo, the track's count still says 0 while its button already says mark 2, and the pending box is hidden from the accessibility tree. Suggestion: Include the pending mark in the group's name ('0 of 3, and 1 more pending until Undo runs out'). Finding F180.
- **Advancement dialogs never say what advancing does or what was applied** (`advancement-dialogs-explain`; Lightkeeper laptop 1440x900, desktop 1920x1080). The Lightkeeper's dialog never says the track resets, resources refill and each investigator gets two picks; the log says only 'The Ninth Night has advanced!' and its two milestone lines are word for word identical. The player's ability list is names only, 'Advancement Applied' is a title and Close, and after a reload the 'New Circle Ability' box is gone. Suggestion: Name the ability in the log ('has advanced and gained Stamina Training!') and the milestone number in milestone lines; one explanatory paragraph in the Lightkeeper's dialog; the chosen ability's text under the player's select; a list of what was applied in the confirmation. (The Lightkeeper's radios do carry each ability's text; her choosing the circle's ability alone is a design choice.) Findings F243, F248.
- **A long investigator name breaks mid-word on the Lightkeeper's polaroid and is cut off on her sheet header** (`long-name-polaroid-sheet`; Lightkeeper laptop 1440x900). 'CASSAN / DRA / "LATCH" / MOREAU' on the polaroid, and 'CASSANDRA "LATCH" MORE...' on the sheet header, which overflows by 4 px with room below; the dice slip truncates it too. Suggestion: Let the sheet header wrap; shrink the polaroid name to fit (floor 14 px) instead of breaking words; let the slip's name wrap or add a title. Finding F043.
- **The Lightkeeper's clock name field clips a long name ('THE BELL READS THE NEXT N')** (`clock-name-clipped-1440`; Lightkeeper laptop 1440x900). The Lightkeeper's clock name is a one-line input that clips at every width, not only 1440; players' read-only placard wraps. Suggestion: Make it a one-row textarea that grows, with Enter to finish; at least add an ellipsis and a title. Finding F193.
- **Tension '+' at 4 of 4 and '-' at 0 of 4 stay enabled and send a no-op update to every desk** (`tension-buttons-at-limits`; Lightkeeper laptop 1440x900). Both buttons stay live at the limits, each press broadcasts an unchanged circle_update, and a screen reader hears ordinary buttons. Nothing marks the clock filling at 4 of 4. Suggestion: Return early when the value would not change and disable the button at its limit (aria-disabled if focus must stay). (The 'greyed' look reported at 4 was the hover style; the doubled update came from the clock-name field's blur.) Findings F194, F217.
- **The charter's insignia is an uncaptioned glyph: 'Compass' appears nowhere and screen readers hear just 'Insignia'** (`insignia-no-caption`; Lightkeeper laptop 1440x900). The insignia is a 30 px glyph with no name; it is also the same compass icon as the Lightkeeper's Map tab. Suggestion: Move the insignia labels to a shared module, caption the badge and give it role=img with 'Insignia: Compass'. Finding F081.
- **The Lightkeeper's resource tracks name the top two pips the same ('set available to 4')** (`resource-track-dotted-squares`; Lightkeeper laptop 1440x900). With 5 available, the fourth and fifth pips are both named 'Stitch: set available to 4' (both do that), and the faint dotted squares past the maximum have no explanation on the Lightkeeper's page. Suggestion: Name the top filled pip 'take one back (set available to 4)' and give the dotted squares the player page's 'Beyond current maximum' title. (The dotted squares are the owner's request (commit 8cbb511).) Finding F082.
- **The hourglass shows tension only as sand, with no visible number** (`tension-level-unreadable`; Lightkeeper laptop 1440x900). Telling 1 from 2 or 2 from 3 means reading sand heights; the count is only in the spoken name. Telling 3 from 4 is easy (the upper bulb empties). Suggestion: A small '1 / 4' under the glass on both desks, or at least a title tooltip. (Sand-only is the documented design (DESIGN.md:388-392), so this is an idea rather than a defect.) Finding F008.
- **Specialty gear is tagged '[SIG]' with no explanation, and screen readers hear it in every name** (`sig-gear-tag`; desktop 1920x1080). Each specialty item ends in a small red [SIG] that nothing explains, and the sub-heading above already says 'Doctor gear'. Suggestion: Drop the tag and title the group 'Doctor signature gear', or spell it out with aria-hidden. Finding F019.
- **With no map configured, the sign-in slip hugs the right edge of an empty black page** (`login-slip-hugs-right`; desktop 1920x1080). The right-hand placement is meant to leave the Fairelands map in view, but it applies even when the map variables are unset (as on this build) or the image fails, leaving two thirds of a 1920 screen black. Suggestion: Apply lg:justify-end and lg:pr-[8vw] only when the map is actually drawn. Finding F011.
- **The formation papers say 'Starting Resource Points 5' without saying it is 5 in each of Stitch, Refresh and Train** (`starting-resources-each`; desktop 1920x1080). One big '5' reads as five points to share across the three resources. The number is right: after the seal each resource showed 5 of 5. Suggestion: 'Stitch 5 · Refresh 5 · Train 5 (4 investigators + 1 each)'. Finding F067.

## Ideas

1. **A 'Call for a roll' card for the Lightkeeper: who, which action, the stakes, the result back on the card, and 'Apply 1 Bleed' through the player's own mark flow** (`lk-call-for-roll`). The Lightkeeper's exit note named the call-roll-read-mark loop as the slowest part of the night: about 5 to 8 clicks and a context switch per consequence, with the call and stakes living only in table talk and her own open roll reaching players as 'Lightkeeper rolled a 5' with no label. Applying the consequence through the player's mark flow would also fix lk-mark-skips-abilities. Findings F121, F275.
2. **One compact line per investigator on the Lightkeeper's Roster: drives, resistance, marks, scars, status, spent abilities, Train dice, picks waiting** (`lk-circle-overview`). Checking four sheets took 8 clicks plus scrolling, the Roster tab reopens the last sheet, and waiting advancement picks are visible only in the database. Opening sheets one by one is how she marked the wrong investigator (trauma-edit-whose). Finding F273.
3. **A one-line 'rules receipt' on each roll slip saying which rule the engine applied** (`roll-slip-rules-receipt`). Every number was right, but players learned why only from the book or the source: Rule of Six capping a spend, the gilded refresh, Well-Read refunds, why burning was not offered, what Burn and reroll costs. Ada spent four out-of-character messages explaining the site's maths; her exit note says the silence, not mistakes, got in the way. Findings F250, F155, F132.
4. **A read-only map on player desks, with one Lightkeeper pin per dispatch** (`player-map-and-pins`). Only the Lightkeeper's desk has the Fairelands map, and it is a fixed picture. Three seats asked independently: the Lightkeeper wanted to pin Saint Aldric, and players on the phone and the desktop looked for a map after the dispatch named it and found none. Findings F007, F095, F101.
5. **Let authors edit a written Field Notes entry** (`field-entry-not-editable`). The API already edits entries (PUT /api/notebook/entries/{id}, author-only) but the page never offers it, so the only fix is delete for everyone and retype, which moves the entry to the end and logs a second 'archived' line. Verified: half-built. The edit should also broadcast and the store should merge it. Finding F211.
6. **Show every member's answer to the circle question in Circle History** (`circle-history-own-answer`). Each player sees only their own answer, though the desk already holds all four and the circle question is one the group answers together. Verified; a small change modelled on the Lightkeeper's page. Finding F092.
7. **Let players see an ally's marks** (`ally-marks-invisible`). Your Circle cards and the Circle tab show name, role and relationship only; marks reach other desks only as a log line that scrolls away or is lost on reload. A Doctor cannot tell who is hurt, and the Patch Up rider lists allies without their marks. Needs body_marks in the roster payload and live updates to players. Finding F152.
8. **Show the circle's relationships on the Lightkeeper's desk after the seal** (`lk-no-relationships-view`). The Lightkeeper's sheets and Circle tab show no relationships; before the seal she got only a count. She wanted them to weave into scenes. Finding F083.
9. **See several rolls together: group efforts tallied on one card** (`group-effort-results`). Group rolls are out of scope per FAQ.md, so a group effort was called by voice and each result was a separate log line; with three rolls at once the Lightkeeper's tray showed only the last. Findings F173, F235.
10. **A 'Used this assignment' stamp on once-per-assignment abilities** (`spent-ability-stamp`). After Death Defy was used the ability card looked the same; the only trace was a log line that a reload wipes. The server already counts these uses. Finding F208.

## Keep these

- **The character creator is easy on every device: tarot path cards with full ability text, a sticky 'what's left' checklist, instant portrait upload and pen previews.** Phone, tablet, 1366 and 1920 players all finished the creator first time: path cards show both ability lists in full, the page recolours to the role, the sticky footer names what is missing before Advance lights, locked steps give a spoken reason, ability lists are proper radio groups (arrow keys, checked state), portraits upload from the frame with Change/Remove and alt text, multi-line catalysts are kept, and each pen previews in its own hand. No console errors. (F023, F025, F028, F035)
- **Circle formation and the seal work live: relationships propose, counter and confirm without reloads, and sealing carries everything over to every desk.** Proposals and counters arrived within seconds on phone and desktop and turned green 'Confirmed by you both'; Your Circle polaroids picked up the relationship names and flip to show both sides. Finalize carried name, chapter house, insignia, ability, question, all four answers and 5 of each resource, closed the papers on every open desk, updated the dispatch salutation, and relationships left pending could still be accepted after the seal via a clear 'Response needed' tag. (F063, F065, F080, F086, F089, F091, F108)
- **The desk stays current without reloading, and every desk agrees, even under simultaneous actions.** Join requests and approvals, marks set by the Lightkeeper, dispatch rewrites, tension 0-4, renamed clocks, Illumination, reports opening and the wind-down all reached phone, tablet, 1366 and 1920 desks live; the countdown start reached five desks within 31 ms and they ran out together; three rolls in the same millisecond, a tension raise mid-roll and a mark landing with a drive change came out identical on five desks and in the database. The Lightkeeper never had to ask what a sheet said. (F046, F172, F179, F201, F202, F231, F234, F277, F253)
- **Dice follow the rulebook to the letter, and the roll slip shows the pool and outcome plainly.** Drive spend shows '+1d' on every action of that drive and in the button names; pools, highest die, gilded choice and drive refresh (named in the log), burn and reroll, rating 0 with and without drive ('2 dice, lowest counts' / '1 die'), and Death Defy all behaved as written on phone, tablet and desktop. Rolling straight from the sheet was called the easiest part of the night on the phone; keepable dice wiggle and un-kept dice dim. (F130, F133, F139, F156, F158, F167, F178, F207, F257)
- **Double-clicks and repeated Enter never double-send (except on resource squares), and every typed field shows markup safely.** A failed join keeps the character and says so with one row in the database; double votes, double suggestions, double-click Roll, Enter twice on Keep and on Send report each sent exactly once, with the report replaced by a 'REPORT SENT' stamp and a status message. Names, answers, gear and pass notes fed <b>, <img onerror>, Markdown and emoji always showed as text or safe Markdown, never live HTML. The one exception is the circle resource squares (resource-double-click-double-spend). (F039, F072, F136, F226, F268)
- **The Notebook feels like a real field journal: Markdown with true preview and autosave, the player's own handwriting, photos as taped prints, sketches that reopen editable.** Lightkeeper Resources autosaves (Saving... to Saved) and previews cleanly; Field Notes remember the pen chosen at join, preview exactly what lands, render headings, lists, quotes and safe links on tablet and desktop; a photo entry stages with a thumbnail and lands as a white-bordered taped print; Keep drawing reopens a sketch with every shape editable. The tablet player called it the best thing on the site. (F006, F103, F142, F212, F232, F272)
- **Connection trouble is reported honestly: a clear drop banner, a refused roll in plain words, and a clean second-tab handoff.** On a socket drop a full-width 'The connection to the table dropped. Reconnecting...' banner with 'Reconnect now' appears, a roll during the drop says no dice were thrown and nothing is sent later, and the desk catches up within a second. A second tab shows 'This desk is open in another tab...' with 'Use this tab', announced as a status, handing the desk back and forth without loss. (F113, F163)
- **Taking a mark is safe and fair: one tap with an Undo window, and Death Defy is offered with the enemy question left to the player.** On the phone a Body mark ghosts the box with an Undo countdown and goes to the server only after the window; big thumb targets. Death Defy is offered on a self-taken mark with 'If an enemy dealt this mark...' wording, and declining lands exactly one mark while keeping the ability for later. (F183, F191)
- **Private things stay private.** A private pass note to one player never reached another player's log or WebSocket traffic, while notes addressed to a player did arrive; the Lightkeeper's secret roll likewise appeared nowhere on a player's desk (F130). (Private notes do also reach the Lightkeeper, which the label should say: see pass-notes-recipients.) (F154)
- **The Lightkeeper's table tools are quick and say their rules where you press them.** The hourglass timer starts in one press with named Pause/Reset/Clear and keeps counting across sections; Allow spending shows the two-per-player, between-assignments rule right on the card; winding down the climax (tension 4 to 0, renamed clock, cleared timer, dawn dispatch, +1 Illumination, Open reports) took a minute without leaving the desk, with the hourglass visibly refilling. (F123, F176, F218)
- **Wrap-up works end to end: reports fit a phone, End Assignment asks twice and says what it clears, and advancement follows the book.** The whole report form fits one 390 screen and tapping a key's words ticks its box; Track full shows an Advance button, the new circle ability joins the old, End Assignment confirms twice and resets uses, stamina dice and the hourglass; the player's advancement dialog pops up live, enforces two different picks, splits drive points, offers role/specialty abilities only and adds a resistance at drive 3, with log lines for each. (F221, F244, F247)

## How it felt, seat by seat

**The Lightkeeper (1440x900 laptop).** Rue ran the whole assignment from a 1440x900 laptop and got what she asked for: she never had to ask a player what their sheet said, because her copy of every sheet, the dispatch card, the hourglass with its named clock and timer, and the End Assignment and Advance flow stayed current on their own all night. What slowed her was everything around a roll: calling it, reading it and applying its cost took 5 to 8 clicks each, with no overview of the circle, so she opened four sheets one by one and once marked the wrong investigator. Every switch to Notebook, Circle or a sheet hid the log, tray and timer, the trauma Edit, her only way to give a mark, skips the abilities a mark should trigger, and she had to tally the reports by hand, which led the circle to advance early. Her ask: a circle overview on the Roster and a 'Call for a roll' card, built on top of the live sheets she wants kept exactly as they are.

**Ada (1920x1080 desktop).** Ada, the rules lawyer on the 1920x1080 desktop, checked every number against the book and found the dice right throughout: pools, highest die, gilded choice and refresh, the Rule of Six cap, rating 0, resistance and marks into scars. What got in her way was the silence: the drive stepper promised +5d and rolled +4d, the gilded choice never said keeping it refreshes a drive, and Patch Up appeared after every Focus roll; she spent four out-of-character messages explaining the site's maths to the table. A wide screen also meant most of the papers' desk was dark around a narrow column, and her name vote landed on the wrong row when the list re-sorted. Her ask: a one-line rules receipt on each roll slip. Keep the live desk and the by-the-book dice.

**Bram (390x844 phone).** Bram, new to tabletop games and playing on a 390-wide phone, got through the creator and the whole assignment on the phone, and called rolling straight from the sheet the easiest part of the night. What got in his way most was never knowing something had changed: the dispatch, tension 4 of 4, the timer running out, a private note from the Lightkeeper and 'Reports open' all arrived live but silently, and he found each only by opening the Menu. His Behind Me offer for the Doctor vanished before he could tap it, the hourglass was never on the screen he rolled from, and game words like keys, milestones and burning were explained only in hover tooltips a phone never shows. His asks: one 'new' dot on the Menu and its rows, and tap-to-explain on every game word. Keep the sheet-as-dice-tray, the mark Undo and the advancement dialog.

**Cass (1366x768 laptop).** Cass played Latch on a 1366x768 laptop and tried to break everything: double-clicks, Enter twice, reloads mid-roll, second tabs, keyboard only, a real dropped socket. The server held up as referee: dice never doubled, a roll during a drop was refused honestly, and every field showed tags and Markdown safely. What failed was the desk's memory, which lives in the tab: reloads and hub trips emptied the log, Later or Escape lost her advancement until a reload, the report forgot it was sent, a stale 'Not connected' slip outlived the reconnect, and a double-click on a resource square spent both her between-assignment spends. On her screen the desk is one locked page, so the timer sat just below the window and the log hid behind Pass Notes after every roll. Her asks: replay the log from the server and give every one-shot action the guard the dice already have.

**Dev (820x1180 tablet).** Dev played Edda on an 820x1180 tablet and lived in the Notebook, which Dev called the best thing on the site: their own handwriting on every entry, Markdown that reads like a field journal, photos as taped prints and sketches that reopen fully editable, plus relationships 'Confirmed by you both'. What got in the way was that the Notebook is cut off from the table: on that tab the hourglass, timer, log and reports vanish (the 20-minute bell ran out while Dev wrote), sketches, photos and redraws never reach other desks live, a caption replaced an entry's title, a written entry cannot be edited, and the sketch tools fall back to Select after one shape. In portrait the dispatch and hourglass sit two to three screens below the sheet. Dev's asks: keep a table strip beside the Notebook, sync every entry, and give question-asking abilities like Let Them In a place to file the question and answer.

## Claims that did not hold up

Parts of findings that the verification showed were harness artifacts, misreadings or deliberate design. Nothing the adversarial check looked at was knocked down entirely; the one whole cluster here is working as designed.

- **The Circle page shows Markdown in answers as raw asterisks and tags** (`circle-page-raw-markdown`). By design. Markdown was added on purpose for notes only (DESIGN.md, 'Notes in Markdown'); the circle answer and relationship fields are plain-text boxes with no formatting bar or preview, and every other free-text field shows text verbatim. The asterisks appear only because the tester typed Markdown where none was offered. Text is escaped safely.
- **'A touch never pauses the Behind Me countdown'** (`ability-offers-expire`). A tap on the card does pause it (Chromium fires a compatibility mouseover). F206's 'Paused 30s' came from the harness's resting mouse pointer. The 20-second versus 120-second mismatch stands.
- **'Creator +, - and gild controls are 28 px on the tablet'** (`creator-touch-targets`). Harness artifact: the tablet seat ran without touch emulation. On a real touch tablet every control is 44 px. The 28 px gild button on the phone stands.
- **'Tapping Suggest shoves the section 84 px sideways'** (`suggest-button-offscreen-phone`). Harness artifact: Playwright scrolls a target into view before tapping, which scrolled the clipped box. A real touch on the sliver submitted the name and left the box in place. The overflow itself stands.
- **'The Lightkeeper's sheet opens scrolled with the name off the top'** (`trauma-edit-whose`). Not reproduced: sheets opened at the top. The scroll came from the harness clicking Edit; the stress tester's wrong-sheet slip came from the Roster tab reopening the last sheet.
- **'At 1920 the fourth circle card has no scrollbar until hover'** (`left-rail-squeezed`). Harness artifact: headless Chromium runs with --hide-scrollbars. A normal browser shows the scrollbar.
- **'The header, nav and phone Menu stay bright above the papers' overlay'** (`papers-lock-desk`). Measured: they are dimmed by the same 80% as the rest of the desk. The blocking dialog is deliberate; the missing way to fold it once done stands.
- **'Players' dice trays should show other people's dice'** (`others-rolls-not-shown`). By design: DESIGN.md:445 says a player's felt shows their own rolls and the Lightkeeper's shows the newest roll at the table. The thin log line stands.
- **'Telling 3 from 4 on the hourglass means squinting'** (`tension-level-unreadable`). At 4 the upper bulb is empty and the stream stops, so 3 and 4 are easy to tell apart; sand-only is the documented design. Telling 1, 2 and 3 apart stays a fair idea.
- **'+ looks greyed at 4' and 'the update was sent twice'** (`tension-buttons-at-limits`). The grey was the hover style left by the pointer; the second update came from the clock-name field's blur, and in the playtest the label had really changed. The no-op update at the limits stands.
- **'Let Them In is a 10-second toast'** (`question-abilities-no-home`). The card lasts 20 seconds (dev's screenshot caught it mid-countdown). Pass Notes to @Circle do reach the Lightkeeper live.
- **'Phone keyboards capitalise the first letter of the code'** (`campaign-code-case-sensitive`). The code field has autoCapitalize=none, so iOS and Gboard should not do it. Case-sensitive matching stands for codes typed with capitals.
- **'Relationships still pending at the seal lose their Accept' (F079)** (`lk-formation-status-thin`). They can still be accepted on the Circle page after the seal; four were, on the phone and the desktop.
- **'The greyed Delete on a pending request gives its reason only to screen readers'** (`pending-join-not-live`). It has a title tooltip, and a tap shows 'Waiting for the Lightkeeper' under the row. The missing withdraw stands.
- **'An open investigator sheet hides the whole table column' and 'nothing happens at 0:00'** (`section-hides-table-column`). An open sheet keeps the log, tray and Pass Notes; only the hourglass and timer go. The 0:00 chime plays in every section with sound on, which the AI seats could not hear.
- **'Tension rising and the timer running out are completely silent'** (`silent-table-changes`). A tick plays when tension rises and a chime at 0:00 (sound is on by default); a re-sent dispatch types itself in on the desktop; the Lightkeeper does see a report count. The missing visual cues and log lines stand.
- **'Votes went to the lowercase copy of the name'** (`name-case-duplicates`). That mis-vote came from seat.js's case-insensitive text matching picking the wrong row. Accepting the duplicate stands.
- **'At 1920 the Circle Resources card starts below the fold'** (`resource-spend-no-guard`). With shorter circle text it was on screen at 1920x1080; it depends on content.
- **'End Assignment should not empty gear' and 'the sheet should ask players to choose gear again'** (`end-assignment-gear-wording`). Clearing gear follows the rulebook (gear is marked when used and slots reset when the assignment ends, p. 52), and the owner's No Instructions rule names blank gear slots as the intended empty state. Only the wording stands.
- **'End Assignment wipes the dispatch' and 'each re-dispatch overwrites the last'** (`dispatch-record-lost`). Both are intended: the End Assignment confirm says the dispatch clears, and the card is the current dispatch. The lost receipt and missing log line stand.
- **'Players should see the Lightkeeper's whole letter'** (`dispatch-letter-mismatch`). The short index card is the documented design for players. The different field name stands.
- **'The roll bar should stay until the player has looked'** (`result-bar-fades-phone`). The fade and its timings are the owner's spec (DESIGN.md:448). A badge for a waiting choice stands.
- **'The dotted squares past the maximum read as 5 of 8'** (`resource-track-dotted-squares`). They are the owner's request (commit 8cbb511), meant to show the limit at a glance. The duplicate pip name stands.
- **'A player who presses Save for Later never sees the pen picker'** (`pen-picked-at-join-only`). They meet it in the Registry's join form. The reset of the pen after a rejection stands.
- **'The Lightkeeper's advancement dialog shows ability names only'** (`advancement-dialogs-explain`). Each radio carries the ability's text. The Lightkeeper alone choosing the circle's ability is a design choice, not a defect.
- **'Keys should score 1 Illumination each' (F223's expectation)** (`report-questions-tally`). Wrong by the book: keys score 2 if some players fulfilled one, 4 if every player did, nothing if none (p. 55). The finding itself stands.
- **'The Lightkeeper's To: label is small italic'** (`pass-notes-recipients`). It is bold 16 px in the recipient's ink with a coloured dot. That the private recipient sticks for the next message stands.

## How the playtest worked

- Five AI seats played through the real interface in their own browsers (Playwright driving Chromium), each with its own account and screen size; a sixth, the test engineer, ran one stress beat across all seats. Every finding was logged as it happened with screenshots.
- Findings were grouped into clusters, and almost every cluster was re-tested on a fresh copy of the site (its own database and servers) with the cause traced in the source. Eight of the most serious were then given a second, adversarial check that tried to knock them down; all eight stood, two at a lower severity.
- Known harness quirks, already discounted above: Playwright's setOffline does not close an open WebSocket in Chromium, so 'network drop' findings were re-tested with a TCP stall proxy or a closed socket; the AI seats act several seconds after their screenshot, which widens races and makes short timers harder to catch; headless Chromium hides scrollbars; Playwright scrolls a target into view before clicking or tapping; the AI seats could not hear the site's sounds; one seat ran part of the session without touch emulation; seat.js matches text case-insensitively.
- Times in the timeline are the table clock (UTC). 00:00 is 5:00 PM Pacific on 8 October 2026.

Full data: `report.json` beside this file; findings in `findings.jsonl`; screenshot paths are relative to the playtest folder.
