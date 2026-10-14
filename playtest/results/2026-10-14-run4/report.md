# Candela VTT: fourth AI playtest

14 October 2026. Build under test: main 1bc48a0 (PRs 61, 68, 70 and 71). Control: 2d86b77. For Austin (who wrote the app) and Robert (who runs the server and the group).

The run had three stages:
- **Stage A:** six agents replayed every item the four fix rounds fixed, on local copies of this build and the control.
- **Stage B:** three side checks on local copies: advancement near 12 with Resource Management, scars up to a death, and timed windows plus server restarts.
- **Stage C:** a Lightkeeper and four AI players played one full assignment, The Ferryman's Psalm, on the beta site on five screen sizes.

## The short version
- **The fixes held.** Of 150 items replayed, 132 are fixed, 12 partly fixed, 2 not fixed and 4 not checked. Stage A found no item not fixed and no regression. Both "not fixed" items come from the side checks.
- **Beta ran a whole assignment cleanly,** from sign-up to End Assignment, on a phone, a tablet, two laptops and a desktop. There were no console errors and no reloads, and every desk stayed current. Every roll, refund and the Illumination tally matched the book.
- **Two high bugs, both from the side checks.** A death lowers the resource maximum on the server without telling any desk: after a reload the Lightkeeper reads "Stitch: 4 of 3 available." A scar owed is forgotten on a server restart, so the investigator can be revived with no scar.
- **Medium bugs:**
  - A chapter house the Lightkeeper types before the seal silently replaces the players' answer.
  - The Edit sheet log cuts old and new text at the same 40 characters, so a change late in a field is invisible.
  - The dead can still file a report.
  - Non-Combatant offers are lost on reload and refused silently after a restart.
  - A gilded keep after a restart shows a false outcome.
  - Leaving and rejoining resets the spend count.
- **The Lightkeeper cannot see what players have pending:** an open burn (her open roll silently ends it), a mark held for Death Defy, or a spent once-per-assignment ability.
- **Blind play never reached a scar, an incapacitation or an advance** (Cass ended at Body 3 of 3, Illumination at 6 of 12). Only the side checks cover those paths.
- **Totals:** 84 clusters from 180 findings. 42 are new and confirmed, 31 are new low items seen once and not verified, 7 are repeats or decided behaviour, and 3 were not reproduced.

## Fix these first
| # | Change | Keys |
|---|---|---|
| 1 | Store the owed scar in the database so a restart cannot erase it. | scar-owed-lost-on-restart |
| 2 | After Robert's call, show one resource maximum on every desk at a death, sent live, never with a pool above it. | death-lowers-resource-max-silently |
| 3 | The players' chapter house wins at the seal, and the Lightkeeper's charter is read-only until then. | lk-charter-editable-before-seal |
| 4 | The Edit sheet log line shows the part of a text field that changed. | edit-sheet-log-truncates-identically |
| 5 | Refuse a report from the dead and hide the form on a dead desk. | dead-can-file-report |
| 6 | A reconnecting desk drops outcomes and burn offers the server no longer holds, and says so. | gilded-keep-after-restart-shows-outcome, live-desk-burn-after-restart |
| 7 | Treat Non-Combatant like the other ally offers on reload, reconnect and refusal, and log only what came back. | non-combatant-not-resent-on-reload, non-combatant-silent-refusal, non-combatant-logs-full-drive |
| 8 | Show the Lightkeeper what a player has pending: an open burn, and a held mark on the roster card. | lk-cannot-see-open-burn, lk-roster-card-no-held-mark |
| 9 | One pass bringing touch controls under 44px up to size. | touch-targets-under-44 |
| 10 | A Used or Ready marker for once-per-assignment abilities on both desks. | lk-sheet-no-ability-used |

After these: leave-rejoin-resets-spend-count (once decision 4 is made) and server-takes-roll-over-gilded-choice.

## Decisions for Robert
1. **A death and the resource maximum** (death-lowers-resource-max-silently). Do the dead count toward 1 plus members until a replacement is approved? Or does a death lower the maximum and the pools at once, as a release does (decisions_fix4 1)?
2. **The charter before the seal** (lk-charter-editable-before-seal). Should the Lightkeeper's name, chapter house and ability be read-only until the seal? When both wrote a chapter house, whose wins: the players' (suggested) or the Lightkeeper's (today)?
3. **Add Illumination** (add-illumination-one-press). Keep the single press the FAQ documents, or add a two-press confirm only while reports are unfiled? The "existing confirm step" wording in decisions_fix4 5 implies a confirm, so today the decision text and the build disagree.
4. **Leave and rejoin** (leave-rejoin-resets-spend-count). Does a member who comes back in the same assignment keep their spend count, as a replacement does under #41, or start again at 0?
5. **Who revives** (player-can-self-revive). Only the Lightkeeper, or the player too under detection, not prevention? If the player may, update the FAQ and name who revived in the log.
6. **A mark dealt beside a stored Death Defy hold** (dealt-mark-beside-held-death-defy). Should the held mark land first and its offer close (WEBSOCKET.md 4.5), or should the new mark join the offer?
7. **An open-burn hint for the Lightkeeper** (lk-cannot-see-open-burn). A short live note by Roll, or only a mark on the felt slip, to keep #16's help on demand?
8. **The burn preview wording** (burn-preview-omits-drive-die, by design). Keep "Survey: 2 dice" with its i, or relabel it "Reroll: Survey, 2 dice"? Four reports from three seats read it as a mistake.
9. **Spending after End Assignment** (spending-open-after-end). Stay open (and say so in End's i), or close with the assignment?
10. **+1 Illumination at 12** (illumination-past-12). Stop at 12, or show the carry-over as Add Illumination already does?

## Did the fixes hold
| Area | Fixed | Partly | Not fixed | Not checked | Notes |
|---|---|---|---|---|---|
| A: Circle page, Illumination, reports | 15 | 0 | 0 | 0 | Ring, resources at 1 plus members, earn-back, log lines, Keys wording, report line and Well-Read all held. |
| A: Dice and rolls | 16 | 2 | 0 | 1 | Partly: the 60.5 dice still shimmy on touch; the 45.15 scar form from marks was not reproduced. Not checked: focus in a second tab. |
| A: Release, leave, sheet edits, the dead | 19 | 1 | 0 | 0 | Partly: a rejoin in the same assignment resets the spend count. |
| A: The Lightkeeper's desk | 17 | 1 | 0 | 0 | Partly: the join pop-up and Requests count stay stale in a second Lightkeeper tab. |
| A: Notebook, hub, creator, sign-in | 15 | 4 | 0 | 1 | Partly: #21 (the original bug does not reproduce in headless Chromium), 60.10, 60.4 (the mark shows only in one browser), 60.24 (the Google frame cannot render in the sandbox). Not checked: 60.25. |
| A: Restarts, held marks, the tray | 12 | 0 | 0 | 0 | Log in the database, held marks back with the same offer id, #23, #43, #19, #40, 60.7, 45.10 and #59 all held. |
| B: Advancement near 12 | 8 | 0 | 0 | 1 | Not checked: the roster card while picks wait. |
| B: Scars up to a death | 16 | 2 | 1 | 0 | Not fixed: the dead can file a report. Partly: the maximum at a death, and a scar owed across a restart. |
| B: Timed windows and restarts | 14 | 2 | 1 | 1 | Not fixed: a gilded choice across a restart. Partly: Non-Combatant after a restart, and Burn after a live reconnect. Not checked: #23 after a restart. |
| **Total** | **132** | **12** | **2** | **4** | |

## The side checks
**Advancement near 12.** Five live desks, no reloads, and it held:
- Four reports were filed.
- Add Illumination across 12 showed "12 / 12 (+2 carried over)".
- Advance refilled each resource to 1 plus members.
- The dialog offered four kinds of pick, with Later.
- A double press or a second tab never applied picks twice.

Only small wording items remain:
- The dialog says the track "is full" after it rolled over.
- The advance writes no refill line.
- The receipt and the log word a drive pick differently.

**Scars up to a death.** All of these held: the scar flow, Death Defy, the fourth scar, death shown live on every desk, refusals for the dead (including crafted frames), the Fallen card and Registry section, and a replacement that keeps its predecessor's spend count. Three problems were found:
- The dead can still file a report.
- A death lowers the maximum silently.
- A scar owed is lost on a restart.

Players can also Revive themselves, which the FAQ does not describe.

**Timed windows and restarts.** These held, timed with real waits:
- Ally offers land at 1:50 and are refused at 2:05.
- Lapse lines reach the right desks.
- Timers agree to the second on five desks.
- Desks reconnect by themselves with backoff.
- Held marks, drafts and the armed End confirm survive an outage.

These did not hold:
- A gilded choice across a restart.
- Burn after a live reconnect.
- Non-Combatant: not resent on reload, refused silently after a restart, and a false "recovered 1" log line when the drive was full.

## The session
**The Ferryman's Psalm.** The circle, The Whistlers, took Nobody Left Behind, the Candlelight insignia and the old chain-ferry toll shed as chapter house. Its members:
- Ada Quill, Scholar (Professor), on the desktop
- Bram Okafor, Muscle (Soldier), on the phone
- Cass Moreau, Slink (Criminal), on the laptop
- Dev Lindqvist, Weird (Occultist), on the tablet

On the estuary flats they found a psalm stamped on the ferry chain, footprints ending at the channel, and a bell that was a recording of a ring with a man counting coins under it. The thing in the fog tasted Cass, and Death Defy turned it aside.

In the ferryman's cottage, Ada knew the changing hand on the psalm sheet as the marginalia in her own tome. Cass sprang the tide-ledger, forty years of fares. Dev found the chain's stamp on Absalom Hode's scratched-out portrait.

On the ferry, with a ten-minute timer running:
- Bram jammed the windlass.
- Dev's salt ward stopped the counting at forty-one.
- Ada found her own name drying last in the fare column.
- The tide threw Cass into the hold until she was at Body 3 of 3.

Cass cut the ferryman's empty coat from the bell, Bram hauled her out, and Ada read the first fare, which was Hode's own. He was carried over with 3:42 left on the timer. Nobody was scarred. Two questions answered yes plus a key from every investigator made 6 Illumination (6 of 12). The hook for next time: Ada's name is still last in the ledger.

| Phase | What happened |
|---|---|
| Campaign (22:10 to 22:14) | The Lightkeeper created The Gullhaven Chapter (gullhaven-r4) and toured the desk. |
| Investigators (22:14 to 22:21) | Four investigators were built on four devices and asked to join. |
| Approval (22:22 to 22:25) | Requests arrived live. Each sheet was read with View sheet and approved. Formation papers opened without a reload. Resources 5/5/5. |
| Circle formation (22:25 to 22:30) | Votes, a tie broken by the rule, the chapter house and eleven relationships, all live. |
| Seal (22:30 to 22:31) | Finalize in two presses, the first dispatch, "The fog comes in" at 1 of 4. |
| Round 1, the flats (22:31 to 22:36) | Gilded rolls, a photo entry, a Bleed mark held for Death Defy, open and secret Lightkeeper rolls, a private note. |
| Round 2, the cottage (22:36 to 22:44) | Death Defy, Learn from My Mistakes, three marks, spending opened, a sketch map, tension 3, a 10:00 timer. |
| Round 3, the ferry (22:44 to 22:51) | Adrenaline Rush, Great Wards, Stitch, Train, an Edit sheet change, the tide roll of 6, reports opened. |
| Wrap (22:51 to 22:56) | Four reports (one amended), Add 6 Illumination, End Assignment at 22:55. |
| After (22:56 to 23:00) | Spends during downtime, and the ward moved to Ada. |

## New bugs
Ranked by harm to a real session: wrong numbers and lost data first, then blocked actions, then visible defects. "Verified" means reproduced on a fresh local copy. "Re-check" and "side check" mean the agent that logged it saw it on a local copy.

| # | Key | Severity | Area | Evidence |
|---|---|---|---|---|
| 1 | death-lowers-resource-max-silently | high | circle page | side check |
| 2 | scar-owed-lost-on-restart | high | marks and scars | side check |
| 3 | lk-charter-editable-before-seal | medium | circle formation | verified |
| 4 | edit-sheet-log-truncates-identically | medium | player desk | verified |
| 5 | dead-can-file-report | medium | circle page | side check |
| 6 | leave-rejoin-resets-spend-count | medium (rules) | campaign management | re-check |
| 7 | gilded-keep-after-restart-shows-outcome | medium | dice | side check |
| 8 | non-combatant-not-resent-on-reload | medium | abilities | side check |
| 9 | non-combatant-silent-refusal | medium | abilities | re-check and side check |
| 10 | server-takes-roll-over-gilded-choice | low | dice | re-check |
| 11 | non-combatant-logs-full-drive | low | abilities | side check |
| 12 | dealt-mark-beside-held-death-defy | low (rules) | marks and scars | re-check |
| 13 | player-can-self-revive | low (rules) | marks and scars | side check |
| 14 | lk-second-tab-stale-request | low | Lightkeeper's desk | re-check |
| 15 | let-in-button-name | low | accessibility | re-check |
| 16 | websocket-doc-says-no-reconnect | low (doc) | connection | side check |

### 1. A death lowers the resource maximum silently (high)
**What happens:** In a sealed circle of 3 with every resource at max 4, a fourth scar kills one member. Live, every desk still reads "Stitch 4 · max 4". After a reload the Lightkeeper reads "Stitch: 4 of 3 available.", while players read 4 of 4 until they reload. Approving the replacement restores 4. Seen on a tablet and a laptop.

**Cause:** handle_apply_scar (backend/vtt/ws/handlers/character.py) sends no circle_update and does not lower the pools. resource_pool (vtt/circle_queries.py) counts only the living.

**Fix:** after decision 1, either count the dead until they are replaced, or lower the pools as a release does. Send a circle_update in both cases.

### 2. A scar owed is lost on a restart (high)
**What happens:** Deal a fourth mark, press Decide later, then restart. Both desks read only "Incapacitated". The player's "A scar is waiting" banner survives only in that one browser. On any other device the scar is gone, and the Lightkeeper can Revive with no scar recorded. Seen on a laptop and a phone.

**Why it matters:** this breaks decisions_fix6 1 (a restart loses nothing a player can see).

**Cause:** awaiting_scar is an in-memory set (backend/vtt/serializers.py:16-17).

**Fix:** store it on the character, as held_mark is stored.

### 3. The Lightkeeper's charter overrides the players' chapter house (medium, verified)
**What happens:** Before the seal, the Lightkeeper can edit the name, chapter house and ability with no hint that the players are deciding them, and the server accepts all three. At the seal, the votes overwrite her name and ability, but her chapter house wins. The players' saved text is dropped without a word.

**Cause:**
- backend/vtt/routers/circles.py:271-281 copies the players' answer only "if not circle.chapter_house_location".
- gm.py:521-527 and CirclePage.jsx have no is_finalized guard.

**Fix:** a non-empty formation answer wins at the seal, and these fields are read-only until the seal.

### 4. The Edit sheet log hides late changes (medium, verified)
**What happens:** Appended words in a long Style field logged as "...a b... to ...a b...", which shows no change.

**Cause:** SHOWN_MAX = 40 with the same prefix cut applied to old and new text (backend/vtt/sheet_edits.py:42, 133-136).

**Fix:** for free-text fields, show the part that differs, and add a test with a change after character 40.

### 5. The dead can file a report (medium)
**What happens:** Send report stays live on a dead desk. The report is stored and logged, and a crafted amendment is accepted too. A "Report filed" card sits beside "0 of 2 filed". The tally seems to skip the dead, so no wrong Illumination was seen.

**Fix:** add submit_assignment_report to DEAD_REFUSED (backend/vtt/ws/access.py) and hide the form on a dead desk.

### 6. Leave and rejoin resets the spend count (medium, rules)
**What happens:** a player who used both spends leaves, is approved back, and can spend two more. Pools are not refilled, and it needs the Lightkeeper's approval.

**Cause:** release calls end_assignment_for, which zeroes the count.

**Fix:** after decision 4.

### 7. A gilded keep after a restart shows a false outcome (medium)
**What happens:** the keep is refused, but the slip still reads "kept the gilded 4 / MIXED SUCCESS" and offers Burn. Seen at 1920x1080.

**Why it matters:** this breaks decisions_fix6 2 (the tray tells the truth).

**Cause:** the action_rejected path in gameStore.js (around line 1170) keeps the result the desk computed locally.

### 8. Non-Combatant is not resent on reload (medium)
**What happens:** when an ally reloads inside the offer window, Behind Me comes back but the Non-Combatant card does not, so the point cannot be claimed. Seen on a phone.

**Cause:** send_open_intercepts (backend/vtt/ws/handlers/marks.py) resends only Behind Me and Premonitions.

### 9. Non-Combatant outlives a restart and is refused silently (medium)
**What happens:** the Non-Combatant card stays up after a restart. Use is refused and the card closes with nothing shown. A lapsed answer in normal play is also refused silently. The control build does the same, so this is not a regression. Seen on a phone and a tablet.

**Fix:** drop the card on reconnect and show the refusal the way "PREMONITIONS NOT USED" is shown.

## Repeats of open issues and decided behaviour
| Key | Issue | What this run added |
|---|---|---|
| sketch-label-scale | #60: 60.10 | Labels about 1.4x larger. Still partly open. |
| signin-google-frame | #60: 60.24 | The forms fit in 768 px. The Google frame still cannot render in the sandbox. |
| newcomer-misses-earlier-log | #29 | F021: works as built. Log lines go only to members active when they were written. |
| illumination-hint-at-12 | #60 idea | Three players at 6 of 12 could not tell what 12 brings. |
| finalize-armed-no-preview | decided: fix7 69.4, fix5 wording | Works as decided. The waiting-relationships note disappears while Finalize is armed. |
| illumination-milestones-on-lk-ring | decided: fix6 #67, #16 | The i explains the milestones. |
| player-edits-own-marks | decided: fix5 #64 | Exactly what decision 1 chose. |

**Not counted** (by design, not reproduced, or a harness artifact):
- **burn-preview-omits-drive-die:** by design (FAQ.md:74, DESIGN.md:489, #16). Its wording is decision 8.
- **death-defy-focus (F058):** likely a harness artifact. The seat blurred focus before testing the keyboard path.
- **pips-before-roll-conflicting (F036):** the same seat saw it correct in round 3 (F073).
- **F106 (Great Wards should clear at the end):** the ward persists by the rules, p. 27.
- **F025:** a timing effect from seats acting minutes apart.
- **F092's rules doubt:** the harness handbook is wrong; the site and the book scar on the mark after a full track.
- **R029's Behind Me expiry:** designed.
- **R008's "no scar form at 3 of 3":** correct by the rules.

## UX
**Confirmed** (ranked):
1. **lk-cannot-see-open-burn (medium, verified):** nothing on the Lightkeeper's desk shows that a player's burn is still open.
2. **touch-targets-under-44 (medium):** controls at 22, 28, 30 and 39px on touch.
3. **lk-roster-card-no-held-mark:** the roster card is blank while a mark is held.
4. **lk-sheet-no-ability-used (with F108, F115):** no Used or Ready state on any desk.
5. **add-illumination-one-press:** decision 3.
6. **formation-parts-no-done-state:** no tick for each part a player has done, and the phone strip's numerals have no names.
7. **live-desk-burn-after-restart:** Burn is still offered after a live reconnect.
8. **keep-dice-shimmy-on-touch:** 60.5 is only partly fixed.
9. **notebook-contents-phone-density:** 4 lines per page where 5 fit. The control showed 5, so this is a small regression.
10. **let-in-mark-browser-only:** 60.4 is only partly fixed.
11. **owed-scar-banner-says-full:** says the track is full while it shows 0 of 3.
12. **advancement-dialog-track-full-wording:** says the track is full at 2 / 12.
13. **advance-log-no-refill:** the advance writes no refill line.
14. **advancement-receipt-log-wording:** the receipt and the log word a drive pick differently.
15. **illumination-past-12:** +1 at 12 stores 13 behind "12 / 12".
16. **ally-card-no-mark-named:** ally cards do not say which mark they answer.
17. **stale-tab-confirm-silent:** a stale tab's Confirm does nothing and says nothing.
18. **superseded-lk-tab-no-way-back:** a superseded Lightkeeper tab has no Use this tab.
19. **join-popup-size:** the join pop-up covers too much of the screen.
20. **closed-request-note-stays:** a withdrawn request's note survives another player's request.
21. **about-about-reset:** the Reset info button is named "About About Reset".
22. **refused-edit-double-alert:** a refused edit is announced twice.
23. **chapter-house-draft-hides-save:** an unsaved draft overwrites a newer save.
24. **join-dialog-buttons-indent:** the Join dialog buttons are indented on a tablet.

**Seen once in blind play, not verified** (all low):
- **Great Wards:** great-wards-persist-unexplained, great-wards-in-play-state.
- **Formation and relationships:** relationship-two-way-unclear, formation-name-counter-unlabelled.
- **What the Lightkeeper's copy shows:** lk-full-track-no-scar-hint.
- **Reports, keys and the wrap-up:** keys-bare-names, phone-report-form-far-down, report-card-no-amended-mark, amend-without-change-logged, spending-open-after-end.
- **Circle spends:** circle-spend-not-announced.
- **The Lightkeeper's dice and log:** lk-secret-roll-stays-ticked, lk-log-wording-nits.
- **Dispatch and empty states:** empty-dispatch-labels, dispatch-card-small-nits, field-notes-empty-toc.
- **Phone and dice details:** adrenaline-offer-phone-abbrev, phone-roll-bar-crops-dice, burn-no-keep-choice, keep-slip-equal-failures, tray-pool-breakdown.
- **Keyboard and screen-reader names:** take-mark-beside-roll-tab, illumination-heading-name, creator-control-names.
- **Hub and joining:** waiting-row-self-update-hint, join-dialog-slow-open.
- **Notebook:** photo-caption-under-title, sketch-text-enter-log-alt.

## Ideas
- **report-line-behind-flip (R004):** mark the front of the Lightkeeper's report card when a line was filed.
- **handwriting-only-in-join (F013):** offer the handwriting in the creator, with the rest of the look.
- **stitch-with-no-marks (F114):** say when a Stitch would clear nothing.
- **clock-name-kept-at-zero (F096):** clear the clock name when tension drops to 0.

## Keep
- **Joining and approval:** clear on both sides.
- **The creator:** works on every device.
- **Circle formation:** live on every device.
- **Live desks:** stay current without reloads, even after a trip to the hub mid-scene.
- **Rolls:** correct and safe against double presses, and they work from the keyboard.
- **The Lightkeeper's tools:** they chain together cleanly.
- **Circle resources:** arm, then confirm, then log.
- **Reports and the notebook:** solid.
- **Restarts and the dead (side checks):** restarts are now survivable, and the dead are a thorough record.

## The players' view
- **Lightkeeper (1440x900 laptop):** ran the whole session without fighting the interface. Every complaint was about seeing what players have pending. She held back Add Illumination on purpose until every report was in.
- **Ada (1920x1080 desktop):** every number she audited matched the book. What slowed her was wording: bare key names, the burn preview, and no Ready state.
- **Bram (390x844 phone):** found everything he needed on his own. Long scrolls, a cropped dice bar, a half-screen offer card and an unexplained ward slowed him.
- **Cass (1366x768 laptop):** nothing was duplicated or lost under abuse. She found the log truncation and the keyboard reach problems.
- **Dev (820x1180 tablet):** the notebook served him well. Friction: the photo caption, greyed fields with no reason, and ward state.

## Method notes
- **Fix the handbook:** README.md:120 says the third mark makes a scar, which caused F092's doubt.
- **Reach the late game:** blind play needs two assignments or a circle seeded near 12 to reach scars and advances.
- **Timing:** seats act minutes apart, so keep timing claims to the side checks.
- **seat.js:**
  - It should match names exactly or warn when several match.
  - Focus checks must record the focused element on arrival.
  - Run scripts lack touch on the tablet.
  - The scroll command does not move the desk's inner scroll area at 1366x768.
- **finding.js:** should check that screenshot paths exist. Ada's F076 and F077 point to missing files; the real ones are shots/ada/061_r3stitch2.png and 062_r3sheet.png.
- **Watch for:** the Lightkeeper's dice tray count went from 2 to 1 by itself. It was not logged.
- **Next re-check:**
  - 45.15 on a phone.
  - Focus in a second tab.
  - #21 on Safari or a real phone.
  - The Google sign-in lines, with a test client id.
  - The roster card while advancements wait.
  - #23 after a restart.