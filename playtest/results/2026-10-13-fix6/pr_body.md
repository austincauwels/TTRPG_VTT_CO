Fix round 6: the older bugs, medium UX items and the Illumination ring. Built to the decisions in `playtest/results/2026-10-13-fix6/decisions.md` on `playtest-harness`.

Fixes #17
Fixes #18
Fixes #19
Fixes #20
Fixes #21
Fixes #22
Fixes #23
Fixes #24
Fixes #25
Fixes #26
Fixes #38
Fixes #39
Fixes #40
Fixes #41
Fixes #42
Fixes #43
Fixes #44
Fixes #46
Fixes #47
Fixes #67

## What changed

**Restarts and reloads lose nothing a player can see (#17, #18, #23, #43)**
- The Activity Log is stored in the database: a new table `activity_lines` keeps each campaign's last 500 lines. A desk gets its last 100 when it opens, a restart included.
- A held mark (soak, Circle of Protection, Death Defy) is stored on the character (`characters.held_mark`). It comes back after a restart with the same offer card.
- An answer to an offer the server no longer holds lands nothing; that card just closes. Before, declining a stale card landed the mark.
- Ally offers (Behind Me, Premonitions, Adrenaline Rush, Non-Combatant) still live in memory. After a restart they expire with the usual refusal.
- The Lightkeeper's copy of a sheet shows held marks live, as dashed boxes with a "held for" line.
- A mark taken during a silent outage is kept in the browser and sent again after a reload. The server keeps the last 16 mark ids (`characters.taken_mark_ids`), so the mark is taken once, even across a restart.
- A kept mark more than 10 minutes old is dropped with a plain notice to check the trauma record.
- Two desks answering the same held mark at once can no longer both act on it.

**The tray tells the truth (#19, #40)**
- After Flourish or Bending Spoons, a new message `roll_outcome` updates the result slip on the roller and on the table. A secret roll's new outcome goes to the roller only.
- After a reload, the last roll comes back to the tray with its current outcome, its kept die and Burn and reroll while the server still takes the burn. It plays no dice sound.
- The Lightkeeper's felt also shows its newest roll again after her reload.
- `roll_settled` is retired: a settled roll now comes back marked settled.

**The dead are a record (#38, #22)**
- The server refuses a scar from a dead investigator.
- It also refuses relationship proposals and counters from or to the dead, on REST and WebSocket.
- A dead investigator's paper says Dead with no Propose.
- A player whose investigator is no longer active is not sent for the roster, so there is no 403.

**Replaced or retired means gone from the desk (#39, #41, #42)**
- A desk whose investigator a rejoin retired goes to the hub with a notice, and the used invite banner clears. This holds on a reload too.
- A replacement approved by a join request keeps its predecessor's spend count.
- Play and the Last Played tome on a campaign retired since the book opened stay on the hub with a notice, and the book refreshes. A double press opens one desk.

**Fallen in the Registry (#47).** The player's Registry has a Fallen section at its foot: name, campaign and a Fallen stamp, with no buttons.

**Illumination ring (#67)**
- On both Circle pages, the track is 12 pips in a ring around the candle, laid out like a clock face. Pip 12 is at the top, and the milestone pips at 3, 6 and 9 are gold and larger.
- The candle warms as the track fills.
- The Lightkeeper's pips stay buttons with 44px touch targets that do not overlap, and +1 and -1 stay. The player's ring reads as one labelled image.
- The ring fits at 320px.
- The small summary card on the desk keeps its row of dots.

**Small UX**
- #24: the sheet remembers the ability tab, and its tab buttons are 44px.
- #25: every Notebook and sketch control is 44px on touch.
- #26: the creator's step 3 row fits at 320px.
- #44: Heading, List and Quote on an empty line keep the mark, with the caret after it.
- #20: Sign out clears that account's Notebook and creator drafts on the device. A session the server ends keeps them.
- #21: Back after a reload keeps a sketch in progress, and leaving warns while strokes are unsaved.
- #46: already 44px since 7be39b1; measured at 390x844.

## Calls Robert may want to change
- **Defaults taken on three small calls:** the Fallen section at the foot of the Registry (#47), what Sign out clears (#20), and the ring's layout (#67).
- **A dead investigator can still Accept** a relationship proposed before the death. Decision 3 names proposals only, so this stays; QUIRKS.md and AUTH.md say so. Making the record strict is a one-line follow-up.
- **End Assignment does not clear a held mark** (unchanged behaviour). A held mark also stays with an investigator who is released or retired, while a death drops it. Dropping it in those cases too would match the death path.
- **When the server loses a held mark**, its card closes with no word to the player.
- **Two candles on the Circle pages:** the heading's small icon above the ring's candle.

## Deploy notes
- At startup the server creates the table `activity_lines` and adds two columns: `characters.held_mark` and `characters.taken_mark_ids`.
- Log lines from before this deploy were only in memory, so desks start with an empty log once. Offers open at the moment of the deploy are dropped.

## How it was checked
- **Triage:** one agent read every issue against main 77452a3. #46 was already fixed; the rest were still present.
- **Groups:** four groups (log, rolls, dead, ui) were each implemented, reviewed by a separate agent and repaired in their own worktree, then merged by hand. Conflicts were in QUIRKS.md and WEBSOCKET.md only.
- **Backend suite:** the full suite after the merge gave 2008 passed, 1 skipped. The final repair changed no backend code.
- **Final checks:** a final code review found nothing blocking. Three Chromium checks replayed every item on 77452a3 (the control) and then on this branch, at 390x844, 820x1180 and 1366x768 on both desks, with server restarts and stalled sockets where the item needed them.
- **Last fixes:** the checks found three gaps, fixed in the last two commits. A replaced dead investigator's desk now goes to the hub after a reload, AUTH.md now documents the dead refusals, and two small controls were sized up.
- **Other:** the frontend build passes. No em dashes in added lines.
