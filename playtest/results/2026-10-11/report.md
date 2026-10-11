# Candela VTT playtest report: The Lantern Ward (second playtest)

For Austin (who wrote the app) and Robert (who runs the server and the group). Five AI playtesters ran a session of Candela Obscura on a private copy of the site on 11 October 2026, on the build at commit 63d80f4 (PR 13's head): the Lightkeeper Rue on a 1440x900 laptop, Ada on a 1920x1080 desktop, Bram on a 390x844 phone, Cass on a 1366x768 laptop and Dev on an 820x1180 tablet, plus a test engineer for the death. Alongside the session, seven agents re-checked all 111 items of the first report (8 October). The playtesters logged 246 findings; the problems were grouped into 106 clusters, and 68 of those were reproduced on fresh copies of the site with the cause traced in the code.

## The short version

- **The session ran end to end on every device.** Two assignments, a death and a replacement investigator, a second campaign, and a server restart nobody noticed. Every desk stayed live all night without a reload, and every dice pool, gilded choice and Illumination total checked against the book came out right.
- **Most of the first report's fixes held.** Of 111 items, 83 are fixed, 10 partly fixed, 3 not fixed and 3 were left alone on purpose. 12 were fixed but brought a new problem, and two of those are high: 'Give a spend back' ignores double-clicks and the pool's maximum, and Patch Up can no longer be used at all.
- **Illumination bookkeeping can still go wrong.** The tally can be added a second time from another tab or device, and End Assignment silently throws away filed reports whose Illumination was not yet added.
- **Death is the weakest area.** A dead investigator can still roll and spend the circle's Refresh, only the dying player sees a death line, the Lightkeeper can neither add a scar nor revive, and a replaced investigator vanishes from every screen.
- **Campaign management has sharp edges.** Invite player retires a living investigator without a word, retiring a campaign hides its investigators instead of freeing them, and join requests never say which player sent them.
- **On the phone, long dialogs hide their buttons.** The scar form and the advancement dialog put Record and Confirm below the fold with no cue; it was Bram's most common friction.
- **Keep:** the live desk, the quiet recovery from a restart, the creator, the Notebook, the double-press guards, the report and advancement flow, and the invite-and-rejoin path after a death.

## Fix these first

The ten changes that would most improve the next real session, in order:

1. Give 'Give a spend back' a busy guard and cap the returned resource at the pool's maximum (S). (`spend-back-unguarded-past-maximum`)
2. Let the Patch Up chip through the roll-mods filter so a Doctor can use Patch Up again (S). (`patch-up-chip-never-shown`)
3. Store the Illumination tally on the circle and add it through one server message that refuses a second add, and have End Assignment warn about filed reports whose Illumination was not added (M). (`illumination-tally-added-twice`, `end-assignment-drops-unadded-tally`)
4. Make a dead investigator's sheet a record: refuse rolls, marks and spends on the server, lock the controls, and log the death to every desk (M). (`dead-investigator-still-acts`, `death-not-announced-to-table`)
5. Settle every roll on the server at End Assignment and keep a settled roll settled across reconnects, so no old Burn and reroll can land (S to M). (`stale-burn-offer-after-end-assignment`, `roll-settling-client-server-mismatch`)
6. Name the player's living investigator on Invite player and on the invite banner, log the invite, and show the player's username on join requests (S). (`invite-silently-retires-living-investigator`, `join-requests-hide-the-player`)
7. Free a retired campaign's living investigators (unaffiliated, as delete does) and refresh the hub lists when the Ledger or Registry opens (S). (`retire-hides-its-investigators`, `hub-stale-after-campaign-retired`)
8. Give the Lightkeeper a Revive that reaches the player's desk, a 'scar owed' state on her sheet, and a log line for each recorded scar (S). (`lightkeeper-has-no-revive`, `scar-pending-invisible-to-lightkeeper`)
9. Add '@Lightkeeper only' to Pass Notes, drop the sender from the list and say that private notes are also read by the Lightkeeper (S). (`pass-notes-no-lightkeeper-recipient`)
10. Pin the main buttons of the phone's scar and advancement dialogs in a footer, and keep the Lightkeeper's unsent dispatch draft across section switches (S). (`phone-dialog-buttons-below-fold`, `dispatch-draft-dropped-on-section-switch`)

Also high, but rare: a mark taken while the network is silently down is still lost without a word (`silent-socket-loses-mark`, M).

## What the first playtest's fixes look like now

Seven agents re-tested every one of the first report's 111 items in a browser on fresh copies of the site, on the same five device sizes, and read the code where it helped.

| Result | Items |
|---|---|
| Fixed | 83 |
| Fixed, but the fix brought a new problem | 12 |
| Partly fixed | 10 |
| Not fixed | 3 |
| Left alone on purpose (PR 13) | 3 |

The 28 items that did not plainly hold, most serious first. The cluster key is where this report covers the problem now.

| # | First report item | Result | What is wrong now | Covered as |
|---|---|---|---|---|
| 1 | The Lightkeeper can put a resource back only silently and cannot restore a player's spend count (`lk-resource-repair`) | Fixed, new problem | Give a spend back has no double-press guard and no pool cap. A double-click returns two spends and two resources, and a returned resource can push the pool past its maximum. | `spend-back-unguarded-past-maximum` |
| 2 | Patch Up is offered as a rider on every Focus roll, so one investigation roll also heals an ally (`patch-up-free-rider`) | Fixed, new problem | The Patch Up chip never renders, so a Doctor can no longer declare or use Patch Up from the desk. | `patch-up-chip-never-shown` |
| 3 | Nothing totals the assignment reports, the book's key rule is missing, and the circle advanced about 5 Illumination early (`report-questions-tally`) | Fixed, new problem | The same assignment's reports can be added to the track twice, from a second tab or another Lightkeeper device, because the tally's 'added' state is not stored on the circle. | `illumination-tally-added-twice` |
| 4 | End Assignment leaves reports open with the finished assignment's reports still filed (`end-assignment-reports-open`) | Fixed, new problem | The armed hint and the receipt still say nothing about reports. End Assignment silently discards filed reports whose tally was never added: the 'Add 2 Illumination' waiting on the Circle page was lost and Illumination stayed 0. | `end-assignment-drops-unadded-tally` |
| 5 | 'Burn and reroll' stays offered long after the roll was settled, and the server still accepts it (`burn-offer-stale`) | Fixed, new problem | A Lightkeeper's roll does not settle a roll on the server, so a desk that reconnects after her roll can still burn. A gilded roll kept after someone else's roll loses its Burn offer on the desk while the server still accepts it, and the dot disappears while the choice waits. | `stale-burn-offer-after-end-assignment`, `roll-settling-client-server-mismatch`, `burn-offer-closes-on-anyones-roll` |
| 6 | When the network goes quiet without closing the socket, the desk shows nothing, and in a longer drop a mark is lost silently (`offline-not-shown`) | Partly fixed | A mark is still lost with no word. Take a Body mark at 6 s; take_mark goes into the silent socket at 11 s. The box is drawn held (pink) until 30 s, then silently empties when the heartbeat replaces the socket. The mark is never sent again: sheet 0 of 3, database body_marks 0, no log line or message (F154). | `silent-socket-loses-mark` |
| 7 | A roll during a short connection stall is reported 'Not thrown, roll again' but still reaches the table, so the player rolls twice (`offline-roll-double`) | Fixed, new problem | In case 3 the roll bar's large heading still reads 'Not thrown' above 'The roll may have counted' (RollResultBar.jsx:115-117 uses that heading for any rollError). That roll did count once the network was back, so a player who trusts the heading still rolls twice (F124). | `offline-roll-headed-not-thrown` |
| 8 | A long circle name suggestion runs off its row, and the field has no length limit (`long-name-overflow`) | Fixed, new problem | On a 390 phone, the leading name with tags collapses to one letter per line and its 'leading' tag is clipped. | `leading-name-row-collapses-on-phone` |
| 9 | After 'Later' or Escape on the Circle Advancement dialog, nothing brings the picks back without a reload (`advancement-later-no-way-back`) | Fixed, new problem | The fixed-position button floats over the sheet for as long as picks wait. On the phone it covers ability chips under the actions, and on the desktop it covers the strip under the hourglass. After Later or Escape, focus goes to the page body (the next Tab lands on the button). | `choose-advancements-button-covers-sheet` |
| 10 | Pass Notes: no Lightkeeper-only choice, yourself offered as a recipient, and 'private' notes neither say the Lightkeeper reads them nor look private (`pass-notes-recipients`) | Not fixed | The sender is offered as a recipient, there is no '@Lightkeeper only' choice, '(private)' does not say the Lightkeeper reads it, and private lines are not tagged. | `pass-notes-no-lightkeeper-recipient` |
| 11 | Drive pips only go up: a mistaken tap cannot be undone, and refilling a drive leaves no log line (`drive-pips-one-way`) | Not fixed | Same as reported: a filled pip cannot be cleared, a refill writes no log line, and the Lightkeeper cannot set a drive (F155). | `drive-pips-still-one-way` |
| 12 | A roll's result slip pushes the Activity Log behind Pass Notes, leaving zero to four lines visible (`log-squeezed-by-slip`) | Partly fixed | After a roll that brings the slip and the After the roll panel, the log is no longer pinned to its foot. The new roll's line is hidden below the box while an older line shows: scroller 285 px short of the end at 1366x768, 45 px at 629 (new line half cut), 116 px at 700, 90 px at 1920x941 (F199). | `log-unpinned-after-roll-slip` |
| 13 | The dispatch card's 'Dispatched at' receipt vanishes on a section switch, and dispatches leave no trace in the log (`dispatch-record-lost`) | Fixed, new problem | The dispatch log line silently truncates a long location into a different-looking place name, ended with a full stop. Separately, an unsent draft is still wiped by a section switch, already logged by the dm seat as F006. The receipt and the log line themselves are fixed. | `dispatch-log-cut-at-80`, `dispatch-draft-dropped-on-section-switch` |
| 14 | The gilded choice never says that keeping the gilded die refreshes a drive, and the phone bar mislabels the other die (`gilded-choice-unexplained`) | Fixed, new problem | The new label promises '1 <drive> back' even when the drive is full and nothing comes back. | `gilded-refund-promised-at-full-drive`, `keep-die-choices-unclear-final` |
| 15 | Behind Me and Death Defy offers vanish on a 20-second client timer, though the server would accept them for 2 minutes (`ability-offers-expire`) | Partly fixed | A Behind Me offer still vanishes on a reload while the server's window is open. The longer window leaves stale ally cards with a silent refusal. Death Defy still leaves keyboard focus on the page. | `ally-offer-cards-lost-or-stale`, `death-defy-focus-returns-to-page` |
| 16 | Empty desk slots look blank because their words are screen-reader-only (`desk-empty-states-blank`) | Fixed, new problem | The new 'How to roll' slip on the phone's empty tray runs off the right edge of the screen (16 px cut at 390 wide, 31 px at 360). The Activity Log header at 1440 still truncates to 'FORM C.O. 9 · TABL…', but it is decorative and hidden from screen readers. | `how-to-roll-slip-off-phone` |
| 17 | *Italic* emphasis is invisible in cursive pen fonts (`italic-invisible-cursive`) | Fixed, new problem | Italics are now visible, but as a solid underline that reads like a link; the dotted link underline is only slightly different at that size. Dev logged the same thing in the session (F072, F117). The verifier judged the underline deliberate (see not_reproduced). | `field-note-italic-as-underline` |
| 18 | The screen-reader timer status keeps saying 'Time's up.' after the timer is cleared or switched off (`timer-status-stale`) | Partly fixed | The first report's fix asked for the status to empty on reset as well. After Reset the status keeps 'Time's up.' (or 'Timer paused.') on every desk while the timer reads its full time again. | `timer-status-kept-after-reset` |
| 19 | Gear limits are silent: a fourth pick does nothing, Add greys out with its reason a screen away, and a write-in is cut at 60 characters (`gear-limits-silent`) | Partly fixed | In play, with all slots marked, the unticked items in Change Gear keep full opacity and a tap on one (Matches & Candles) silently does nothing. The '3 / 3 selected' line is still below the phone dialog's fold, and the reason shows only after typing a write-in (F171). | `gear-cap-tap-silent` |
| 20 | The dispatch field the Lightkeeper calls 'Atmosphere' is 'Conditions' for players, and the letter and the card carry different serial numbers (`dispatch-letter-mismatch`) | Partly fixed | For the same dispatch the serial numbers still differ: the Lightkeeper's form reads No. 7842 (SceneManager.jsx:247 hashes 'dispatch-<circle id>') and the players' card reads No. 9468 (DispatchNote.jsx:36 hashes location/atmosphere) (F168). | `dispatch-serial-numbers-differ` |
| 21 | A waiting player's hub never learns of the approval, and a pending request cannot be opened or withdrawn (`pending-join-not-live`) | Partly fixed | The pending row still offers only Check again and an aria-disabled Delete. A request sent with the wrong code or investigator cannot be withdrawn, and the name is a plain truncated <p> that does not open the sheet. No withdraw route exists. The first report deferred this as a separate medium change, but it is part of this item's title. | `pending-join-cannot-withdraw` |
| 22 | Game terms go unexplained, and hover tooltips never reach a touch screen (`report-and-terms-unexplained`) | Partly fixed | Milestones are still unexplained on touch, and the player's report gives no worth; the milestone log line is unchanged. | `milestones-unexplained-on-touch` |
| 23 | The charter's insignia is an uncaptioned glyph: 'Compass' appears nowhere and screen readers hear just 'Insignia' (`insignia-no-caption`) | Partly fixed | 'Compass' is printed nowhere for sighted or touch users, and the player's charter badge still has no name. | `insignia-name-not-printed` |
| 24 | Advancement dialogs never say what advancing does or what was applied (`advancement-dialogs-explain`) | Partly fixed | After a reload, a hub trip or on another device, the player's dialog no longer names the circle's new ability; the New Circle Ability box is gone (b09_iris_reload.png). | `advancement-reopen-drops-ability` |
| 25 | A '## ' heading in a field entry renders as h5 under the entry's h3 title, skipping h4 (`entry-heading-levels`) | Not fixed | The toolbar's heading is still h5 under the h3 title, so heading navigation skips h4. | `note-heading-skips-level` |
| 26 | The Circle Formation Papers lock the whole desk until the seal, with no way to fold them once you are done (`papers-lock-desk`) | Left alone | Left alone on purpose in PR 13: the formation papers still block the desk until the seal and Escape does not close them; they close by themselves after the seal. In a second campaign they also cover the hub button (papers-block-return-to-hub, judged by design). | `papers-block-return-to-hub` |
| 27 | The hourglass shows tension only as sand, with no visible number (`tension-level-unreadable`) | Left alone | Left alone on purpose in PR 13 and DESIGN.md: the hourglass still shows tension only as sand, with 'Tension n of 4' in its spoken name; the new table strip on the phone, tablet and the Lightkeeper's other pages prints 'n/4'. | not re-filed |
| 28 | Abilities and reports that ask a question give it nowhere to go: Let Them In is a toast with only Close (`question-abilities-no-home`) | Left alone | Left alone on purpose in PR 13: Let Them In is still a notice with only Close, so the question it grants has nowhere to go on the site. Tactician now asks its question. | not re-filed |

Confirmed fixed in the session itself, among others: the fresh-database sign-up (no 500), join requests keeping their details after an approval, the 2-2 name tie sealing on the leading name, case and spacing duplicate names refused, the report form locking after Send with Amend, double-clicks on resource spends, the Activity Log surviving reloads and restarts, timer lines in the log, and End Assignment closing the reports.

## The session

The Lantern Ward, run by the Lightkeeper Rue. Four investigators joined with the code lantern-ward: Ada Quill (Ada, a Face/Journalist), Bram Okafor (Bram, a Muscle/Explorer), Cass Moreau (Cass, a Slink/Detective) and Dev Lindqvist (Dev, a Weird/Medium). Cass also sent a second investigator, Mina Vale (a Face/Magician); Rue turned Mina back (one investigator per player at this table) and later gave her a side table. The name vote tied 2-2, the charter sealed as The Lantern Ward Circle and Rue renamed it The Green Lamp Society, with In This Together, the Compass and The Empty Office (the Herald's back-room darkroom) as chapter house.

Assignment one, The Lamplighter's Debt. On Wick Street in Hollin Cross the gas lamps burn green after midnight and sleepers wake with a stranger's name inked inside the wrist. Ada sat beside the frightened man on the step of number 14 and, with Open Book, got the name off his wrist: Ebenezer Marrow, the lamplighter's assistant, and the debt, 'one evening, owing'. Bram climbed a ladder to a lamp in which a ledger page burned without burning up; Cass found only her own heel prints and took ink into her palm (a Bleed mark); Dev opened Commune and learned the lamps are not lighting the street but collecting it. Marrow slipped into the gasworks, and there the ledger collected Bram: as agreed before the session, the Explorer was to pay the debt in full. Rue dealt his wounds as marks and Bram wrote each scar on his phone (the ledger took his footing, then his fists). Ada's reading of Marrow's snuffer-hook failed even after a burn, Cass's Hide failed and Marrow turned to smile at her hiding place, and Dev's Focus held Bram on the cobbles at the cost of a cracked spirit board. In the last round Ada declared the debt paid in print (mixed), Cass twice failed to take the ledger, and Dev's aunt Marit closed the book: every green lamp went out, Ada's column ran in the morning edition, and the Chapter took the ledger, and Bram, into its keeping. The circle earned 5 Illumination (three questions, plus 2 because some investigators fulfilled a key). Rue then filled the track by hand, advanced the circle with Nobody Left Behind, and everyone took two advancements.

Between the assignments the Explorer died. The Lightkeeper's Edit cannot add a scar, so each scar took four Body marks and a scar form on Bram's phone; scars 3 and 4 were written at 04:17 to 04:19 and the Explorer died. Rue then tested taking the death back (removing the fourth scar brought him back, incapacitated), dealt the marks again, and Bram wrote the ledger's last line a second time. Rue invited him back and he returned, built on his phone, as Tobias Okafor-Reyes, a Scholar/Professor and the Explorer's younger brother.

Assignment two, The Glass Orchard, a week later in a disused hothouse at Kettering Park, where fruit of clear glass holds the faces of people who are not in the room. Ada's critical Read (with Sweet Talk) showed the planting ledger was the gardener Abel Thorne's: a name for every person Kettering Park lost to the fever ward in '71, and his own name last. Cass's Survey failed and footsteps followed her on gravel she had already read; Dev's Sense found a face that wanted Marit's voice. At the climax Ada spoke to Abel through the glass (success), Tobias found the graft seam with his tome (mixed), Cass reached the heart under the chiming vines and was cut (a Bleed mark), and Dev held every face but one, which slipped into the cracked board. Tobias pressed, Cass's bleeding hand closed round the first fruit, and it broke; every fruit went dark. The circle earned 5 Illumination (5 of 12), Rue ended the assignment, retired the side table and closed the campaign.

### Timeline

Times are the table clock (UTC) on 11 October 2026.

| Phase | What happened |
|---|---|
| Campaign (03:20) | Rue signs up on the fresh database (first try, the first report's 500 is gone), creates The Lantern Ward (code lantern-ward) and tours the desk: dispatch in both modes, Invite player, a test timer, Notebook, Map, Circle, Pass Notes. One real bug: an unsent dispatch draft is wiped by a section switch. |
| Investigators (03:26-03:34) | Ada (desktop), Bram (phone), Cass (laptop, with a second investigator, Mina Vale) and Dev (tablet) build investigators in the reworked creator and ask to join. An off-table question from the organiser (what the gold ball on the hub is) was relayed into every running agent; every seat answered it, and the Approval, Circle and Ready turns that followed were lost. Bram used Forgot password on his phone; the reset worked. |
| Approval, re-run (03:40) | Rue views each sheet, approves Ada, Bram, Cass and Dev and rejects Mina Vale with the two-press Reject. Approval reaches every hub live without a reload. Nothing tells Rue which player sent which request, and the approvals leave no log line. |
| Circle (03:41-03:45) | Formation papers on every desk: question 1, a 2-2 name tie with the tie rule shown, In This Together, the Compass, The Empty Office as chapter house, eleven relationship proposals. Case and spacing duplicates are refused; four rapid votes settle on one. |
| Ready (03:47) | Rue seals the charter (the leading name wins the tie, so the first report's tie bug is fixed), renames the circle The Green Lamp Society, sends the Wick Street dispatch with the template and names the hourglass 'The green lamps'. The seal and the rename write no log line. |
| Round 1, Wick Street (03:48-03:51) | Ada's Sway with Open Book (5 dice, gilded 6, success, Cunning refunded), Bram's Move (mixed), Cass's Survey (failure, a Bleed mark), Dev's Commune and Sense (success). Every desk stays current without a reload. |
| Round 2, the gasworks (03:53-03:57) | Rue rolls for Marrow in the open (4) and in secret (double six), raises tension to 1 of 4, sends a private note and a new dispatch. Her Edit cannot add scars, so she deals Bram four Body marks: his first scar, written on the phone. Ada's Read fails, burn and reroll fails; Cass's Hide fails in a keyboard-only round; Dev's Focus is mixed. Dev cannot answer Rue's private note: Pass Notes has no Lightkeeper choice. |
| Round 3, the ledger (04:00-04:05) | Four Bleed marks give Bram his second scar. Tension back to 0, reports opened, questions ticked on Rue's desk (stored only in her browser). Ada's Sway mixed, Cass's Hide fails twice, Dev's Focus closes the book. Reports filed: Ada, Bram and Dev tick a key each, Cass none; Send locks the form and offers Amend. |
| Wrap (04:09-04:15) | Add 5 Illumination (3 + 2, by p. 55). Rue sets the track to 12 by hand and advances: Nobody Left Behind. End Assignment clears dispatch, hourglass, ability uses, reports and all gear; spending opened (no log line). Each player takes two advancements and spends Refresh or Stitch. An old Burn and reroll offer reappears on Cass's and Dev's trays. |
| Server restart (04:15:29-04:15:59) | The organiser restarts the server as a deploy would. Every desk reconnects by itself with nothing lost and no leftover banner. |
| Death (04:17-04:21) | Driven by the test engineer from Rue's and Bram's seats: two more four-mark cycles, scars 3 and 4, and the Explorer dies at 04:19 with a clear death dialog on the phone and a Deceased section on Rue's roster. No other desk gets a death line. A test roll from the dead sheet goes through to every log. |
| Take-back, invite, side table (04:23-04:27) | Rue removes the fourth scar (warned, logged: 'Bram Okafor is alive'), deals four Body marks again, sends Invite player to bram_okafor with no warning that his investigator is alive, creates a second campaign, Side Case, and opens The Glass Orchard with a new dispatch and the hourglass 'The glass ripens'. |
| Orchard (04:27-04:36) | Ada's critical Read, Cass's failed Survey, Dev's mixed Sense. Bram writes the fourth scar again (no death dialog this time), accepts the invite and builds Tobias Okafor-Reyes on his phone; Save and rejoin puts him straight into the circle, and the dead Explorer vanishes from every screen. Cass asks to join Side Case with Mina; Rue approves her there. Dev changes the account email. Tension 2 of 4, climax called, reports opened. |
| Climax (04:37-04:40) | Ada's Sway success, Tobias's Survey mixed, Cass's Hide mixed, Dev's Focus mixed (a mis-aimed keep, final). Reports: Ada, Tobias and Dev tick a key, Cass none. Mina's formation papers in Side Case cover the hub button; only browser Back gets Cass out. |
| Close (04:42-04:48) | Cass takes a Bleed mark, Add 5 Illumination (5 of 12), End Assignment (marks and spent drive stay, gear empties). Rue retires Side Case: Mina vanishes from Cass's registry and the hub stays stale until a reload. Exit notes and goodbyes. |
| After the session | Seven agents re-checked all 111 items of the first report on fresh copies of the site (run alongside the session). The 246 findings were grouped into 106 clusters and 16 praise themes; 68 clusters were reproduced on fresh copies with the cause traced in the source, and the most serious confirmed ones got an adversarial second check. |

### In numbers

- 246 findings: 26 bugs, 2 rules problems, 129 confusing or awkward moments, 19 ideas and 70 things to keep.
- By seat: Lightkeeper 56, Bram 47, Dev 40, Ada 34, Cass 34, regression agents 28, test engineer 7.
- 106 clusters plus 16 praise themes. 68 clusters were reproduced on a fresh copy by a verifier; the rest were reproduced in a browser by the regression agents or seen in the playtesters' screenshots, apart from the 13 ideas. Overall: 57 confirmed, 24 partly confirmed, 10 working as designed, 2 not reproduced or a harness artifact.
- In this report: 19 bugs and rules problems (3 high, 10 medium, 6 low), 62 UX items, 13 ideas, 16 praise themes, and 12 claims that proved deliberate or did not hold up.
- About 1 h 28 min of table time (03:20:40 to 04:48:28 UTC), 94 table messages.

## Bugs and rules problems, ranked

Ranked by harm to a real session: severity first, then within it lost data and wrong numbers, then blocked actions, then visible defects; ties go to the bug more seats hit. Severity is the verifier's, or the adversarial check's where it differs. Three items triage filed as UX are counted here because the check found they lose or hide data or contradict the FAQ (`retire-hides-its-investigators`, `invite-silently-retires-living-investigator`, `lightkeeper-has-no-revive`).

| # | Severity | Bug | Seen on | Effort |
|---|---|---|---|---|
| 1 | High | Give a spend back has no double-press guard and no cap: a double-click returns two spends, and a pool can go past its maximum (Refresh 4 of 3) (`spend-back-unguarded-past-maximum`) | Lightkeeper laptop 1440x900, phone 390x844 (the member who spent) | S |
| 2 | High | A mark taken while the network is silently down is lost without a word (`silent-socket-loses-mark`) | laptop 1366x768 | M |
| 3 | High | Patch Up cannot be used at all: its Focus-roll chip never renders, and the server refuses it undeclared (`patch-up-chip-never-shown`) | desktop 1920x1080 | S |
| 4 | Medium | The assignment's Illumination tally can be added twice from a second tab or device (`illumination-tally-added-twice`) | Lightkeeper laptop 1440x900 (two tabs or two browsers) | M |
| 5 | Medium | End Assignment silently discards filed reports whose Illumination was never added, and its confirm says nothing about reports (`end-assignment-drops-unadded-tally`) | Lightkeeper laptop 1440x900 | S |
| 6 | Medium | An old roll's Burn and reroll comes back after End Assignment, and the server can still accept it (`stale-burn-offer-after-end-assignment`) | laptop 1366x768, tablet 820x1180, desktop 1920x1080 (fresh copy) | S |
| 7 | Medium | Retiring a campaign hides its living investigators from their players instead of freeing them (`retire-hides-its-investigators`) | laptop 1366x768, Lightkeeper laptop 1440x900 | S |
| 8 | Medium | A dead investigator can still roll, take marks, change gear and spend the circle's Stitch, Refresh or Train (`dead-investigator-still-acts`) | phone 390x844, Lightkeeper laptop 1440x900 | M |
| 9 | Medium | Invite player ignores the player's living investigator: accepting it retires that investigator without a word, and the invite is not logged (`invite-silently-retires-living-investigator`) | Lightkeeper laptop 1440x900, phone 390x844 | S |
| 10 | Medium | An unsent dispatch draft (location and text) is wiped when the Lightkeeper visits Map, Notebook or Circle and comes back (`dispatch-draft-dropped-on-section-switch`) | Lightkeeper laptop 1440x900 | S |
| 11 | Medium | The Lightkeeper cannot revive an incapacitated investigator, and a revive she sends would not reach the player's desk (`lightkeeper-has-no-revive`) | Lightkeeper laptop 1440x900 | S |
| 12 | Medium | A death is announced only on the dying player's own desk (`death-not-announced-to-table`) | phone 390x844, Lightkeeper laptop 1440x900, desktop 1920x1080, tablet 820x1180, laptop 1366x768 | S |
| 13 | Medium | On a phone the leading suggested circle name collapses to one letter per line and its 'leading' tag is cut off (`leading-name-row-collapses-on-phone`) | phone 390x844, phone 360 wide | S |
| 14 | Low | A player's two spends per break reset when they come back with a new investigator (`spend-limit-resets-with-new-investigator`) | phone 390x844 | S |
| 15 | Low | The desk and the server disagree on when a roll is settled, in two narrow timing cases (`roll-settling-client-server-mismatch`) | phone 390x844 | M |
| 16 | Low | Ally offers are lost on a reload though the server still takes them, and a second ally's card stays up for a mark already taken (`ally-offer-cards-lost-or-stale`) | phone 390x844, tablet 820x1180 | M |
| 17 | Low | The hub does not notice a retired campaign: it lists the investigator with Play and '2 in play' until a reload (`hub-stale-after-campaign-retired`) | laptop 1366x768 | S |
| 18 | Low | Reset leaves 'Time's up.' or 'Timer paused.' in the timer's screen-reader status (`timer-status-kept-after-reset`) | Lightkeeper laptop 1440x900, tablet 820x1180 | S |
| 19 | Low | Keyboard: after Death Defy's Use or Take the mark, focus drops to the top of the page (`death-defy-focus-returns-to-page`) | laptop 1366x768, keyboard only | S |

### 1. Give a spend back has no double-press guard and no cap: a double-click returns two spends, and a pool can go past its maximum (Refresh 4 of 3)

`spend-back-unguarded-past-maximum` · High · wrong numbers · effort S · first report: `lk-resource-repair`

**What happens.** On a member's sheet, the Lightkeeper's Give a spend back with 'Put back in the pool: Refresh' answers a double-click twice: the member goes from 2 to 0 spends used and Refresh from 1 to 3, though only one Refresh was spent, with two log lines. With Refresh already at 3 of 3, one give-back makes it 4 of 3 on every desk. This came in with the fix for the first report's lk-resource-repair.

**Steps.** 1. Open spending; a member spends 1 Refresh and 1 Stitch. 2. The Lightkeeper opens that member's sheet, picks Refresh under Put back in the pool and double-clicks Give a spend back. 3. Separately, with Refresh at 3 of 3, give one back with Refresh.

**Cause.** backend/vtt/ws/handlers/gm.py:416-448 (handle_gm_return_spend) adds 1 to the chosen resource with no cap at the circle's maximum and refuses only when the member has no spend left. The button has no busy or repeat guard, while the player's own Spend has a 500 ms guard and a two-press confirm.

**Fix.** Server: cap the returned resource at the circle's maximum (skip the pool part, or refuse with a 409, when it is full). Client: give the button the same busy guard as the player's Spend, or a two-press confirm, so a double-click sends one message.

**Check.** Confirmed (regression check in the browser; cause read in the source). Findings: F075. Screenshots: `verify/out_8404/B12_lk_spendback.png`, `verify/out_8404/C02_lk_circle_refresh_over_cap.png`.

### 2. A mark taken while the network is silently down is lost without a word

`silent-socket-loses-mark` · High · data loss · effort M · first report: `offline-not-shown`

**What happens.** With the socket silent both ways (no close) and reconnects failing, a Body mark taken at 6 s is drawn as held until the heartbeat replaces the socket at about 30 s. The new 'The connection to the table dropped. Reconnecting...' banner then shows (an improvement on the first build), but the held box empties and the mark is never sent again: sheet 0 of 3, database body_marks 0, no log line, no message. A rare network condition, but silent data loss.

**Steps.** 1. Player desk. 2. Make the socket go silent without a close for about 45 s (a TCP stall). 3. At 6 s take a Body mark and let the Undo window run out. 4. Restore the network; read the sheet, the database and the log.

**Cause.** frontend/src/store/gameStore.js forgetUnanswered (line 163) drops unanswered messages when the heartbeat replaces the socket; a held take_mark is not queued for resend.

**Fix.** Queue state-changing messages that got no answer (take_mark at least) with an id, resend them on the new socket and let the server de-duplicate by id as it already does for rolls. If that is too much, tell the player plainly that the mark was not recorded.

**Check.** Confirmed (regression check in the browser). Findings: F154. Screenshots: `verify/out_8406/c01_silent_18s.png`.

### 3. Patch Up cannot be used at all: its Focus-roll chip never renders, and the server refuses it undeclared

`patch-up-chip-never-shown` · High · blocked action · effort S · first report: `patch-up-free-rider`

**What happens.** A Doctor with Patch Up and an ally with a Body mark: there is no Patch Up chip under Focus (no chip anywhere on the sheet), the Specialty tab has only text, and after the roll only Burn and reroll is offered. A post-roll Patch Up gets 'Patch Up is chosen before the roll: pick it on your Focus roll, then roll.' The first report's fix moved Patch Up to a before-the-roll chip that never appears, so a whole specialty ability is dead. A declared roll sent straight over the socket heals correctly, so only the chip is missing.

**Steps.** 1. A Doctor with Patch Up, an ally with a Body mark. 2. Look under Focus for a Patch Up chip. 3. Roll Focus and read After the roll.

**Cause.** frontend/src/game/rollMods.js:86: getAvailableRollMods skips any mod with no extra dice and no gild, drive substitute, Brain mark or first point. The Patch Up entry (rollMods.js:60) is exactly that, so it never becomes a chip.

**Fix.** Let the filter keep declared-only mods (for example a 'declare: true' flag on the Patch Up entry that the check at line 86 accepts), and add a test that a Doctor's Focus row offers the chip.

**Check.** Confirmed (regression check in the browser; cause read in the source). Findings: F100. Screenshots: `verify/out_8405/b01_spec_tab.png`, `verify/out_8405/a02_focus_rolled.png`.

### 4. The assignment's Illumination tally can be added twice from a second tab or device

`illumination-tally-added-twice` · Medium · wrong numbers · effort M · first report: `report-questions-tally`

**What happens.** The tally's question ticks and its 'added' flag live only in the browser that pressed Add. A second tab or another browser shows blank ticks and a live 'ADD 2 ILLUMINATION' (the keys counted again), and pressing it adds again: 0 to 3 to 5 on a fresh copy, 0 to 2 to 5 in the regression check. In the session the ticks Rue made were never sent to anyone (F105). The verifier rated it high; the adversarial check stood by the defect but lowered it to medium because it needs the same Lightkeeper to press Add again on a second desk, the log already shows the first add, the extra is limited to the keys, and the track can be set back by hand.

**Steps.** 1. Open reports; a player files a report with a key. 2. The Lightkeeper opens the Circle page in tab A, then in tab B. 3. In B tick a question and press Add N Illumination. 4. In A press 'Use this tab' and press Add again. 5. Or open the desk in a fresh browser after the Add.

**Cause.** frontend/src/components/gm/CirclePage.jsx:309-316 reads the answers and the 'added' flag from illumTallies[circId]; gameStore.js:1608-1613 (setIllumTally) writes only to the local store, which is persisted to localStorage (gameStore.js:2144). The server gets only update_circle with an absolute value (backend/vtt/ws/handlers/gm.py:383-412), so it cannot refuse a second add.

**Fix.** Keep the tally on the circle (backstory_answers['tally'] = {answers, added}), cleared by clear_paperwork at End Assignment. Add gm_set_tally_answers (refused once added) and gm_add_tally, which locks the circle row, refuses with 409 if already added, computes the total server-side from the filed reports and adds it. CirclePage then reads the circle's tally, and illumTallies leaves the store.

**Check.** Confirmed at high by the verifier; the adversarial check upheld it at medium. Findings: F010, F105. Screenshots: `verify/out_8401/c04_lk_tab1_add_again.png`, `verify/out_8401/d01_lk_fresh_device_after_add.png`, `verify/out_8401/c02_lk_tab2_added.png`.

### 5. End Assignment silently discards filed reports whose Illumination was never added, and its confirm says nothing about reports

`end-assignment-drops-unadded-tally` · Medium · data loss · effort S · first report: `end-assignment-reports-open`

**What happens.** With 'Add 2 Illumination' waiting on the Circle page, End Assignment's armed hint and receipt mention the dispatch, ability uses, the hourglass and marked gear, but not reports. Afterwards the reports are gone ('Closed, 0 of 3 filed'), Illumination stays 0 of 12 and the +2 can no longer be added; only the later log line says 'The reports have been reset.' The book adds Illumination at the end of the assignment, which is exactly when a Lightkeeper presses End Assignment, so this is likely to happen in play.

**Steps.** 1. Open reports; two players file keys. 2. Do not press Add N Illumination. 3. Press End Assignment, read the hint, confirm. 4. Go to the Circle page.

**Cause.** backend/vtt/ws/handlers/gm.py:325 calls clear_paperwork (backend/vtt/assignment.py:47-53), which pops the reports whether or not the tally was added. frontend/src/components/gm/SceneManager.jsx:343 (armed hint) and :221 (receipt) never mention reports.

**Fix.** Always say 'The reports close and are cleared' in the hint and receipt, and when filed reports have not been added, warn: 'N filed reports' Illumination (+X) has not been added and will be lost; add it on the Circle page first.' Once the tally lives on the server (illumination-tally-added-twice), the server can warn too.

**Check.** Confirmed. Findings: F186, F130. Screenshots: `verify/out_8407/d04_lk_card_turned.png`, `shots/dm/110_endarm.png`, `verify/out_8444/e03_lk_circle_after_end.png`.

### 6. An old roll's Burn and reroll comes back after End Assignment, and the server can still accept it

`stale-burn-offer-after-end-assignment` · Medium · wrong numbers · effort S · first report: `burn-offer-stale`

**What happens.** On Cass's laptop and Dev's tablet, after End Assignment, advancements and a Refresh, the tray showed the first assignment's roll with 'After the roll' and a live Burn and reroll. The verifier found two routes. Re-entering the desk from the hub brings a settled offer back; the server refuses it with a 409 but the button stays live. And when that roll was the last one at the table, Burn and reroll pressed after End Assignment was accepted, and the log shows a reroll after the 'Assignment ended' line.

**Steps.** 1. Roll a non-success. 2. Either have nobody roll after it, or have someone roll and then leave the desk for the hub and come back through the Case Ledger. 3. The Lightkeeper ends the assignment; spend a Refresh. 4. Look at the tray; press Burn and reroll.

**Cause.** Client: gameStore.js:600 (connect with keepLog false) sets tableRoll to null but keeps lastRoll for the same desk, and DiceVault.jsx:58 treats a roll as settled only while tableRoll is set, so a settled roll reads as open again; a 409 refusal does not settle it. Server: handle_gm_end_assignment (gm.py:302-350) never clears the in-memory _last_roll in rolls.py, so the last roller can still burn.

**Fix.** Server: at End Assignment, drop every active character's _last_roll and _pending_gilded (a small settle helper in rolls.py). Client: clear lastRoll and the offers when the assignment number changes (gameStore.js:758), keep a roll settled across a same-desk reconnect, and settle the offer when a burn is refused.

**Check.** Confirmed. Findings: F144, F149. Screenshots: `shots/cass/095_gear4.png`, `shots/dev/090_t6m.png`, `verify/out_8444/a02_iris_after_burn.png`.

### 7. Retiring a campaign hides its living investigators from their players instead of freeing them

`retire-hides-its-investigators` · Medium · data loss (hidden) · effort S

**What happens.** When Rue retired Side Case, Cass's Mina Vale disappeared from her Player Registry: not free, not retired, nowhere, so she cannot join another campaign. The confirm read 'Every investigator leaves it and no one can join. Nothing is deleted.' and did not name Mina. The database keeps Mina as status 'retired' with her campaign; the API still returns her. FAQ.md:167 says retiring makes members unaffiliated, and deleting a campaign already does that. The other half of the report, the campaign leaving the Lightkeeper's Ledger with no retired list, matches the FAQ and is by design.

**Steps.** 1. A player has an investigator in campaign B. 2. The Lightkeeper retires B (two presses). 3. The player reloads the hub and opens the Registry.

**Cause.** backend/vtt/routers/campaigns.py:223-228 (retire_campaign) sets every active and pending character to 'retired' and keeps campaign_id (pinned by backend/tests/test_campaigns.py:373-376). PlayerRegistryPage.jsx and CaseLedgerTome.jsx show only active, pending and unaffiliated investigators.

**Fix.** Release living characters as delete does (status unaffiliated, no campaign, ink colour cleared), leave the dead as retired, send campaign_retired to their own channels, and update the test. Optionally name them in the armed hint.

**Check.** Partly confirmed: the vanishing investigator holds; the campaign leaving the Ledger is by design. Findings: F242, F220, F244. Screenshots: `shots/cass/133_close4.png`, `verify/out_8442/ret_09_cass_ledger_reload.png`.

### 8. A dead investigator can still roll, take marks, change gear and spend the circle's Stitch, Refresh or Train

`dead-investigator-still-acts` · Medium · wrong numbers · effort M

**What happens.** After 'Stay and look at the sheet' on Bram's phone, all nine Roll buttons, the drive controls, Take mark and Change gear stayed live, and a Focus roll from the dead sheet reached every desk's log. The Circle page still offered Spend 1 Stitch, Refresh and Train; on a fresh copy the server accepted a dead investigator's spend of the circle's last Refresh. The Lightkeeper's copy of the dead sheet still offers Deal a mark. The sheet already disables ability Use for the dead, so locking the rest was intended. The playtester rated it high; the verifier put it at medium because the player has to choose to stay on the sheet and act.

**Steps.** 1. Record a fourth scar. 2. Tap 'Stay and look at the sheet'. 3. Tap a Roll button. 4. Menu, Circle: look at the Spend buttons.

**Cause.** Frontend: InvestigatorDossier.jsx:1104 (rollBlocked) ignores is_dead, and so do the mark boxes, drive controls and Change gear; CircleView.jsx renders Spend without checking the player's own death. Server: vtt/ws/access.py check_message (:449-458) has no is_dead rule, and circle.py:65 (spend) and rolls.py:329 (roll) act for a dead character.

**Fix.** Server: refuse rolls, burns, marks, spends, drive and gear changes, advancements, ability uses and relationship proposals for a dead character (409 'X is dead: the sheet is a record'), and a Lightkeeper's mark on the dead. Client: treat a dead sheet as read-only apart from 'Create a new investigator', disable Spend for a dead player, hide Deal a mark on a dead sheet, and update FAQ.md:139.

**Check.** Confirmed (severity lowered from high to medium). Findings: F157. Screenshots: `shots/bram/109_bram_dead_roll.png`, `shots/bram/108_bram_dead_sheet.png`, `shots/dm/127_dm_dead_roll.png`.

### 9. Invite player ignores the player's living investigator: accepting it retires that investigator without a word, and the invite is not logged

`invite-silently-retires-living-investigator` · Medium · data loss (hidden) · effort S

**What happens.** Rue sent Invite player to bram_okafor while the Explorer was alive (3 of 4 scars, incapacitated, during the take-back test). The slip said only 'Invite sent to bram_okafor.'; no warning, no log line. On a fresh copy the verifier invited a player whose investigator was alive and unhurt: the banner on his desk gave no warning, accepting it retired the living investigator, who then vanished from the player's Registry, and the Lightkeeper's roster simply swapped the card. Retiring on rejoin is deliberate (a test pins it); telling nobody is the bug.

**Steps.** 1. A player has a living investigator in the campaign. 2. The Lightkeeper uses Invite player with that username. 3. The player accepts and builds a new investigator.

**Cause.** backend/vtt/routers/campaigns.py:411-432 (invite_rejoin) only sets pending_rejoin_campaign_id, never looks at the invitee's living investigator and writes no log line; rejoin() (campaigns.py:325-334) retires every other active or dead investigator of that player. InvitePlayer.jsx:91, MainDeskView.jsx:306-311, RejoinInviteBanner.jsx and CharacterCreator.jsx:1537 never mention it.

**Fix.** Return the living investigator's name from invite_rejoin and log 'The Lightkeeper invited X back'. Say 'Their investigator <name> will be retired when they rejoin' on the slip, on the player's banner and in the creator's rejoin box. Whether to refuse such an invite is a product decision.

**Check.** Confirmed. Findings: F104, F167. Screenshots: `shots/dm/138_invited.png`, `shots/dm/092_invite_open.png`, `verify/out_8442/inv_02_slip_sent.png`.

### 10. An unsent dispatch draft (location and text) is wiped when the Lightkeeper visits Map, Notebook or Circle and comes back

`dispatch-draft-dropped-on-section-switch` · Medium · data loss · effort S · first report: `dispatch-record-lost`

**What happens.** Rue typed a location and dispatch text, did not press Dispatch, visited another section and came back to Roster: both fields were empty (0 / 2000), with no warning. It happened twice in the session and again on a fresh copy. The Notebook keeps unsent writing, so the desk is inconsistent.

**Steps.** 1. Lightkeeper desk, Roster. 2. Type a Location and dispatch text; do not press Dispatch. 3. Click Map (or Notebook, Circle). 4. Click Roster.

**Cause.** frontend/src/components/gm/SceneManager.jsx:147-149 keeps the fields in component state seeded from the last sent dispatch, and OperationsPanel.jsx:155-159 mounts SceneManager only on the Roster tab, so leaving it drops the draft. Only the Own words / Template choice is saved.

**Fix.** Keep the draft in the store or in localStorage keyed by user and campaign (as Notebook drafts are), clear it on send, seed the fields from it, and overwrite it only when a new dispatch arrives.

**Check.** Confirmed. Findings: F006. Screenshots: `shots/dm/024_draft_lost.png`, `shots/dm/008_ownwords.png`, `verify/out_8443/d03_Roster.png`.

### 11. The Lightkeeper cannot revive an incapacitated investigator, and a revive she sends would not reach the player's desk

`lightkeeper-has-no-revive` · Medium · blocked action · effort S

**What happens.** Rue's copy of Bram's sheet showed INCAPACITATED with Deal a mark and Edit but no Revive; only the player's own sheet has one, though FAQ.md:129 and :139 say a GM can revive. After the take-back the log said 'incapacitated until revived' and she still had no Revive. The verifier found the server accepts a Lightkeeper's revive_character but sends the update to her channel instead of the player's, so the player's desk would keep showing Incapacitated until a reload.

**Steps.** 1. An investigator is incapacitated. 2. The Lightkeeper opens that sheet and looks for Revive.

**Cause.** InvestigatorDossier.jsx:1327 shows Revive only when not read-only; GMCharacterSheet.jsx:213 renders the sheet read-only with no revive in traumaEdit; gameStore.js:1486-1490 sends no character_id; backend/vtt/ws/handlers/character.py:100 broadcasts to ctx.channel instead of the character's own channel.

**Fix.** Add a gmRevive(characterId) store action, pass it in traumaEdit and show Revive beside the stamp when the investigator is incapacitated and alive; broadcast the character_update to the character's channel in character.py:100.

**Check.** Confirmed. Findings: F101. Screenshots: `shots/dm/086_scars_area.png`, `verify/out_8441/a05_lk_after_scar.png`.

### 12. A death is announced only on the dying player's own desk

`death-not-announced-to-table` · Medium · missing information · effort S

**What happens.** When Bram recorded his fourth scar, only his phone logged 'Bram Okafor is deceased.', a line his own browser makes. Rue's newest line stayed 'has been incapacitated!'; Ada, Cass and Dev got no line, and their Your Circle panels just dropped Bram. After the take-back every desk logged 'Bram Okafor is alive, and incapacitated until revived.', the undoing of a death nobody else had seen. After the second death, Ada's and Dev's panels again lost Bram with no line. Incapacitation, by contrast, is announced to everyone.

**Steps.** 1. An investigator with 3 scars. 2. The Lightkeeper deals four Body marks; the player records the fourth scar. 3. Read the log on every desk. 4. The Lightkeeper removes the fourth scar; read again.

**Cause.** backend/vtt/ws/handlers/character.py:79-80 (handle_apply_scar) only calls announce_death, which (circle.py:274-286) sends member_status to the players, leaves out the Lightkeeper and writes no activity_log. The only death line comes from frontend/src/store/gameStore.js:740-748, on the owner's desk.

**Fix.** Broadcast an activity_log to the whole campaign, Lightkeeper included ('X has died: a fourth scar.'), and drop the local line in gameStore.js so the dying player does not see it twice.

**Check.** Confirmed. Findings: F156, F164, F176, F189. Screenshots: `shots/bram/106_death_bram.png`, `shots/dm/123_death_dm_sheet.png`, `shots/ada/066_death_ada.png`.

### 13. On a phone the leading suggested circle name collapses to one letter per line and its 'leading' tag is cut off

`leading-name-row-collapses-on-phone` · Medium · visible defect · effort S · first report: `long-name-overflow`

**What happens.** In the formation papers on a 390 phone, a suggested name carrying several tags (yours, suggested 2 times, a vote count, leading) gets a name span 0 px wide: 'The Ninth Night' is drawn one letter per line (364 px tall) and the tags run 53 px past the row, so 'leading' reads 'lea' (101 px past at 360 wide). 820 and 1366 are fine. It came with the fix for the first report's long-name-overflow.

**Steps.** 1. Formation with four players. 2. On a 390 phone suggest 'The Ninth Night'; another player suggests 'the ninth night' (they merge). 3. Make a 2-2 tie so it shows leading. 4. Look at its row on the phone.

**Cause.** CircleCreationPopup.jsx:336-350: min-w-0 plus overflow-wrap:anywhere on the name span, with shrink-0 tags in the same row.

**Fix.** Let the tags wrap onto their own line on narrow screens (flex-wrap on the row) and give the name a minimum width.

**Check.** Confirmed (regression check in the browser). Findings: F009. Screenshots: `verify/out_8402/namerow_fb_phone.png`.

### Low-severity bugs in brief

- **A player's two spends per break reset when they come back with a new investigator** (`spend-limit-resets-with-new-investigator`, phone 390x844). Bram's Explorer spent 1 Refresh after End Assignment (1 of 2); after the death his new investigator Tobias showed 'Your spends 0 / 2', so one player could take three resources from the pool in one break. The site's own rule text says 'Each player may spend up to two between assignments' (the circle sheet and FAQ.md:263). Low: it needs a death while spending is open, and the Lightkeeper can give a spend back or fix the pool. Fix: In rejoin(), before retiring the old investigators, set the new one's count to the highest of theirs; add a test (spend 1, die, rejoin, expect 1 of 2).
- **The desk and the server disagree on when a roll is settled, in two narrow timing cases** (`roll-settling-client-server-mismatch`, phone 390x844). (1) The Lightkeeper's open roll settles players' rolls on their desks but not on the server, so a phone that drops and reconnects during her roll still offers Burn and the burn is accepted and logged after her roll. (2) If a player keeps a gilded die after another player has rolled, the desk never offers Burn and the 'choice waiting' dot goes, yet the server accepts a burn. Fix: Settle on the server for the Lightkeeper's rolls too, and send the desks a 'roll settled' message so both sides use one rule.
- **Ally offers are lost on a reload though the server still takes them, and a second ally's card stays up for a mark already taken** (`ally-offer-cards-lost-or-stale`, phone 390x844, tablet 820x1180). A Behind Me offer disappears on a reload while the server still accepts the intercept for the rest of its two minutes (only offers about one's own marks are resent on connect). Once one ally intercepts, another ally's Premonitions card keeps counting for nearly two minutes; its Intercept gets 'There is no such mark to soak.' and the card just closes. Fix: Resend open ally offers on connect with the time left; when one ally answers, close the others' cards with a line saying who took it; show any refusal.
- **The hub does not notice a retired campaign: it lists the investigator with Play and '2 in play' until a reload** (`hub-stale-after-campaign-retired`, laptop 1366x768). Sitting on the hub while Side Case was retired, Cass still saw Mina Vale under 'In a campaign: Side Case' with Play and 'Case Ledger: 2 in play' until she reloaded. On a fresh copy, pressing Play there opened a desk for the retired campaign. The hub has no socket and polls only while a request is pending. Fix: Refetch the lists whenever the Case Ledger or Registry opens and on visibilitychange; re-check status before entering a desk; send campaign_retired to the released investigators' players.
- **Reset leaves 'Time's up.' or 'Timer paused.' in the timer's screen-reader status** (`timer-status-kept-after-reset`, Lightkeeper laptop 1440x900, tablet 820x1180). After the timer runs out (or is paused) and the Lightkeeper presses Reset, the screen-reader status still says 'Time's up.' (or 'Timer paused.') ten seconds later while the ticket shows the full time again. Clear and switching the timer off now empty it, as the first report asked. Fix: Empty the status (or say 'Timer reset') whenever the timer is reset.
- **Keyboard: after Death Defy's Use or Take the mark, focus drops to the top of the page** (`death-defy-focus-returns-to-page`, laptop 1366x768, keyboard only). Enter on 'Take Body mark 1 of 3' replaces that button, so focus sits on the BODY label during the Undo; the Death Defy card takes focus as it opens, but on Use or Take the mark it hands focus back to BODY, which leaves the user at the top of the page. Fix: When the card closes, return focus to the mark track's take button (or the next interactive control in the track).

### Left out after checking

These were reported but a verifier found them deliberate, could not reproduce them, or traced them to the test harness.

| Item | Result | Why |
|---|---|---|
| The gilded keep-one-die choice keeps wobbling, so automated clicks and taps time out and needed force. (`keep-die-button-never-stable`) | by-design | By design. The wobble is the 'this die waits for you' cue, it honours reduced motion, and Enter works. All nine member findings were the browser automation's stability check timing out on a moving element, not a person's click or tap. The human-facing part (the choice lines are not buttons, a keep is final) is kept as keep-die-choices-unclear-final. |
| In a second campaign the Circle Formation Papers cover 'Back to chapter hub', ignore Escape and the backdrop, and survive a reload, so only browser Back leaves. (`papers-block-return-to-hub`) | by-design | By design: the formation papers stay a blocking dialog until the seal (the first report's papers-lock-desk, left alone on purpose in PR 13); browser Back leaves. The new angle is a player with a second campaign; if the owner reopens it, the smallest change is to keep the hub button above the overlay or add a Later that does not mark the papers done. |
| Investigator names typed with Markdown or emoji show raw asterisks and link brackets everywhere, and wrap into a wall of capitals on a phone. (`markdown-in-names-shown-raw`) | by-design | By design: names render as plain text, which is the safe choice, and nothing breaks. The empty dashed box beside a relationship is the outline of a stamp not yet pressed. |
| *Italic* in a field note is drawn as an underline in the handwriting font, so it reads like a link or a correction. (`field-note-italic-as-underline`) | by-design | By design: italics are underlined on purpose because the pen fonts have no italic face (index.css:511-513, DESIGN.md:481); this is the first report's italic-invisible-cursive fix. Links get a dotted underline to stay distinct. |
| The shared chapter house box shows no author and an example click replaces the whole text, wiping someone else's lines. (`chapter-house-box-overwrites`) | by-design | By design: the box carries a 'Shared' note that says what you save replaces what anyone else wrote, and the examples are starting texts. |
| The player's desk header keeps showing the campaign name after the circle is renamed; the circle's name is not on the main desk. (`desk-header-shows-campaign-not-circle`) | by-design | By design: the header prints the campaign name on purpose; the circle's name is on the Circle tab charter. A label could make it clearer. |
| Keyboard: the Take a Body/Brain/Bleed mark buttons sit in the tab order one Enter from a self-inflicted mark. (`self-mark-buttons-in-tab-order`) | by-design | By design: a self-taken mark is held five seconds with Undo, so one Enter is not a silent permanent mark. Only nit: two tab stops per track. |
| The Lightkeeper Ledger with no campaigns shows three empty ruled boxes and no hint. (`empty-ledger-blank-boxes`) | by-design | By design: DESIGN.md's No Instructions Rule specifies blank ruled rows for an empty ledger, with 'No campaigns' for screen readers. |
| The Account menu's items are missing from the screen-reader outline; 'Account' is a link inside a dialog. (`account-menu-hidden-from-sr`) | not-reproduced | Not reproduced: the Account card is a labelled dialog and its link and Sign out are announced inside it; the seat's outline missed the dialog because it is portaled to the end of the page. |
| A circle-question vote was recorded on the tablet that the player says they never cast. (`stray-question-vote-through-papers`) | harness-artifact | Harness artifact: seat.js --tap sends a raw touch at a covered element's coordinates without checking what is on top, so a tap aimed at the Circle tab under the modal papers landed on the question I card. A tap on the backdrop does not vote. |
| When two players propose the same relationship at once, accepting one leaves the other pending beside 'Confirmed by you both'. (`mutual-rival-proposal-duplicated`) | by-design | By design: relationships are directional, one per direction, each with its own words. Cass's waiting card holds her own answer; dropping it on accept would lose what she wrote. |
| A Lightkeeper's manual Illumination change is logged like an earned gain ('gains 7 (5 to 12)'), with no sign it was an override. (`manual-illumination-edit-unmarked`) | by-design | By design: FAQ.md:224 documents that every change to the track logs 'gains N Illumination (a to b)'. A separate tally message (see illumination-tally-added-twice) would allow different wording. |

## Confusing or awkward (UX), ranked

Ranked by severity, then by how much it got in the way and how many seats hit it. Where a check only partly held, the note says what held.

### Medium

#### 1. Pass Notes still offers the sender as a recipient, has no Lightkeeper-only choice, and never says the Lightkeeper reads private notes, so a player cannot reply privately to the Lightkeeper.

`pass-notes-no-lightkeeper-recipient` · phone 390x844, tablet 820x1180 · first report: `pass-notes-recipients`

Phone 390x844 (Bram) and tablet 820x1180 (Dev): the To: list is '@Circle (everyone)' plus '@Name (private)' for every member including the sender himself; no '@Lightkeeper' entry, so Dev could not answer a private note from the Lightkeeper. Nothing says the Lightkeeper also sees private notes, and ActivityLog.jsx tags nothing as private. PassNotes.jsx targetOptions is unchanged since the first report.

**Suggestion.** Sender left out, an '@Lightkeeper only' choice, private options labelled '(and the Lightkeeper)', private lines tagged on the receiving desk.

**Check.** Confirmed on a fresh copy. Findings: F023, F093.

#### 2. Join requests never name the player who sent them, so two requests from one player look like two players, and the player gets no warning either.

`join-requests-hide-the-player` · Lightkeeper laptop 1440x900, laptop 1366x768

Lightkeeper 1440x900: the Join Requests card and its View sheet show investigator name, pronouns, role, specialty and catalyst but no account; Cass's two requests (Cass Moreau and Mina Vale) read as two players, so the 'one investigator per player' call relied on table talk (CorrespondenceStack.jsx / PlayerRosterCard.jsx render no username). On the player side (laptop 1366x768) both requests sit 'Waiting for the Lightkeeper' with no warning.

**Suggestion.** Each request names the player (e.g. 'from cass_moreau') and flags a second request from the same player.

**Check.** Confirmed on a fresh copy. Findings: F034, F020.

#### 3. When the table never answers a roll that did leave, the roll bar still heads it 'Not thrown' above 'The roll may have counted'.

`offline-roll-headed-not-thrown` · tablet 820x1180 · first report: `offline-roll-double`

Tablet 820x1180: with the network stalled after a roll left the desk, at 33 s the roll bar shows in large type 'Not thrown' and under it 'The table has not answered. The roll may have counted, so check the log before you roll again.' When the network came back the roll had counted. A player who reads only the heading and rolls again rolls twice. RollResultBar.jsx heads any rollError with no lastRoll as 'Not thrown'.

**Suggestion.** A roll that left the desk is never called not thrown; the heading says 'No answer yet' or 'May have counted'.

**Check.** Confirmed by the regression check in a browser. Findings: F124.

#### 4. After a roll the Activity Log is no longer pinned to its foot: the roll just made is hidden below the box and an older line shows instead.

`log-unpinned-after-roll-slip` · laptop 1366x768, desktop 1920x941 · first report: `log-squeezed-by-slip`

Player desk 1366x768: after a non-full-success roll the slip and After the roll panel shrink the log, which pinned to the bottom before shrinking and is not pinned again; scroller 285 px above its end, showing the previous roll while the slip reads the new result. Also 45 px short at 1366x629 (new line half cut), 116 px at 1366x700, 90 px at 1920x941. The 9rem floor works.

**Suggestion.** The newest line stays in view after the log shrinks.

**Check.** Confirmed by the regression check in a browser. Findings: F199.

#### 5. A filled drive pip still cannot be cleared, a refill writes no log line, and the Lightkeeper's copy shows drives read-only.

`drive-pips-still-one-way` · laptop 1366x768, Lightkeeper laptop 1440x900 · first report: `drive-pips-one-way`

Laptop 1366x768: filled pips are disabled, aria-hidden buttons (InvestigatorDossier.jsx:1007-1024), so a mistaken tap cannot be undone; a refill to 3 of 3 saves but neither log gets a line (handle_update_drive logs nothing). Lightkeeper 1440x900: all drive rows have 0 enabled pips; only 'Reset drive and ability uses'.

**Suggestion.** The last filled pip clears one point, a refill is logged, the Lightkeeper can set a drive (the server already accepts update_drive from her).

**Check.** Confirmed by the regression check in a browser. Findings: F155.

#### 6. The floating 'Choose advancements (N)' button covers sheet controls on a phone and the hourglass strip on a desktop for as long as picks wait.

`choose-advancements-button-covers-sheet` · phone 390x844, desktop 1920x1080 · first report: `advancement-later-no-way-back`

After Later or Escape on the Circle Advancement dialog, a fixed 241x44 px button sits 96 px above the bottom of the screen (z-index 400). On a phone 390x844 the Stamina Training and Cool Under Pressure chips under Read and Sense scroll beneath it and cannot be tapped there; on a desktop 1920x1080 it sits over the strip under the hourglass. It stays until both picks are made, which can be a whole session. The way back itself works (tap reopens, reload or hub round trip reopens).

**Suggestion.** A way back to the picks that does not sit over the sheet's own controls (header, Menu, or a cleared spot).

**Check.** Confirmed by the regression check in a browser. Findings: F185.

### Low

| # | Problem | Seen on | Suggestion |
|---|---|---|---|
| 7 | While a player's scar form is open the Lightkeeper's desk shows only 'Incapacitated' with 0 marks, keeps Deal a mark live, and a second incapacitation is logged again with no word of the scar owed. (`scar-pending-invisible-to-lightkeeper`) | Lightkeeper laptop 1440x900, tablet 820x1180 | 'Scar pending: Bram is writing it' on the sheet and roster card, the fourth mark shown until the scar is written, a log line for a recorded scar, and a note when marks land on an incapacitated investigator. |
| 8 | On a phone the long dialogs and pages hide their main buttons below the fold with no hint to scroll. (`phone-dialog-buttons-below-fold`) | phone 390x844 | A dialog's primary buttons stay visible (sticky footer) or the dialog shows that it scrolls; long pages offer a way to jump to their parts. |
| 9 | The Circle page and the 'Your Circle' sidebar show nothing of an investigator being incapacitated, scarred or dead; the dead keep a report card and count in 'Reports 0 of 4'. (`circle-page-blind-to-status`) | tablet 820x1180, phone 390x844, Lightkeeper laptop 1440x900 | Circle cards show status (incapacitated, scars, deceased); a dead investigator's report card is removed or marked and not counted. |
| 10 | End Assignment says 'marked gear is cleared' but every investigator's whole gear list empties, and the desks give no reason. (`end-assignment-gear-wording`) | Lightkeeper laptop 1440x900, phone 390x844, tablet 820x1180, desktop 1920x1080 | 'Everyone's gear is cleared: choose new gear for the next assignment', or a line on the sheet saying gear slots are empty again. |
| 11 | The gilded keep-one-die choices look like plain text lines, two can read 'Keep the X', and a mis-tap is final with no undo. (`keep-die-choices-unclear-final`) | desktop 1920x1080, tablet 820x1180 | Obvious buttons that show which die is best, and a message that a choice is pending. |
| 12 | The gilded keep choice promises '1 <drive> back' and the log says '1 refreshed' when the drive is already full and nothing comes back. (`gilded-refund-promised-at-full-drive`) | desktop 1920x1080, tablet 820x1180, laptop 1366x768 | The promise and the log say nothing comes back when the drive is full (or 'drive already full'). |
| 13 | Finalize the circle arms with no votes cast and does not warn that the seal will leave the circle with no name, ability or insignia. (`finalize-seals-empty-circle-silently`) | Lightkeeper laptop 1440x900 | The armed hint lists what is still empty ('No circle ability, insignia or name chosen yet; 0 of 4 have voted'), or Finalize waits for a vote on each part. |
| 14 | Once a dead investigator is replaced he vanishes from every screen (Lightkeeper roster, Circle History, player Registry), and the newcomer's arrival writes no log line. (`replaced-investigator-leaves-no-record`) | Lightkeeper laptop 1440x900, phone 390x844 | A Fallen card or memorial line keeping the dead investigator's record, and a join log line. |
| 15 | The 'Burn and reroll' offer disappears without a word as soon as anyone else at the table rolls, and the dice button's 'choice waiting' dot does not match it. (`burn-offer-closes-on-anyones-roll`) | laptop 1366x768, phone 390x844 | A short note that the next roll at the table closed the burn, a dot that matches what is offered, and Burn reachable next in the tab order after a roll. |
| 16 | Sealing the circle, renaming it, and approving or rejecting join requests write no Activity Log line. (`seal-rename-approvals-not-logged`) | Lightkeeper laptop 1440x900 | Log lines for the seal (name, ability, insignia), the rename and each approval/rejection. |
| 17 | At the gear limit a tap on another item does nothing and says nothing, on a phone in the creator and in play in Change Gear. (`gear-cap-tap-silent`) | phone 390x844, laptop 1366x768 | Items beyond the limit look disabled and a short visible reason says three is the limit; the intro talks about choosing gear. |
| 18 | Screen readers meet duplicate control names: scar-form radios, relationship comboboxes and the Illumination pips repeat the same label. (`duplicate-accessible-names`) | tablet 820x1180, phone 390x844, Lightkeeper laptop 1440x900 | Group-specific names ('Lower Control', 'Counter relationship to X'); pips as a radio group or with a current state. |
| 19 | The report card's wording does not follow its state: 'tick the keys you fulfilled' after filing, and 'Reports closed: the Lightkeeper opens them at the end of the assignment' right after End Assignment. (`report-card-wording-stale`) | desktop 1920x1080, tablet 820x1180 | Wording that fits the state: after End Assignment, say the new assignment's reports open when it ends; after filing, say the report is filed. |
| 20 | Bonus dice and ability chips vanish after a roll or a burn with no word: the spent drive die, Interrogation's +1d and Open Book. (`bonus-dice-vanish-silently`) | desktop 1920x1080, laptop 1366x768 | Before the burn, say the reroll uses only the action rating; chips say when they were used or why they went. |
| 21 | A rejected join request reaches the player with no word, and the Lightkeeper's 'Yes, reject' looks just like Approve and carries no reason. (`reject-gives-player-no-word`) | laptop 1366x768, Lightkeeper laptop 1440x900 | The player sees that the request was declined (optionally with a short reason); the destructive confirm looks different from Approve. |
| 22 | With an investigator's sheet open, the Lightkeeper has no tension or timer controls: the strip shows '1 / 4' but no + or -. (`sheet-view-drops-tension-controls`) | Lightkeeper laptop 1440x900 | Hourglass reachable, or + / - on the strip, while a sheet is open. |
| 23 | A second death (after a take-back) shows no death dialog, and the Lightkeeper's invite banner disappears the moment the scar is recorded. (`second-death-no-notice`) | phone 390x844 | The same death notice as the first time, and the invite still visible or pointed to. |
| 24 | The death dialog says 'Their sheet' for a he/him investigator and focuses 'Create a new investigator' without saying to wait for the Lightkeeper's invite. (`death-dialog-wording-and-focus`) | phone 390x844 | The sheet's pronouns; a line that the Lightkeeper will invite the player back. |
| 25 | A scar's action-shift note is shown twice when the player also typed it in the description. (`scar-shift-note-doubled`) | Lightkeeper laptop 1440x900, phone 390x844 | The note appears once (strip a typed duplicate, or warn). |
| 26 | After recording a scar the phone sheet lands mid-page with no line saying the scar was recorded. (`scar-recorded-no-confirmation`) | phone 390x844 | A confirmation or log line, and the view at the scar. |
| 27 | The personal answer box shows 'Saved' before anything is typed, and it answers the leading question rather than the one the player voted for without saying so. (`personal-answer-saved-early`) | phone 390x844, laptop 1366x768 | No status until something is saved; a line 'You answer the leading question; it may change if votes change.' |
| 28 | Handwriting is picked only in the Join dialog with no word of what it changes, and the Portrait control is a hidden file input. (`pen-font-and-portrait-hidden`) | desktop 1920x1080, phone 390x844 | Pen font chosen with the dossier, explained, full list visible; a visible Portrait control. |
| 29 | The hub's gold candle cluster looks clickable and the Last Played lock is unexplained; players asked the table what they are. (`hub-decor-looks-interactive`) | laptop 1366x768, tablet 820x1180 | Decoration that reads as decoration, or a label. |
| 30 | On a phone the creator's path card arrows sit below the fold, under the sticky bottom bar, and nothing says there are ten paths or that the card can be swiped. (`creator-path-arrows-below-fold-phone`) | phone 390x844 | Arrows visible on first view (or beside the card), or a hint such as '1 of 10, swipe'. |
| 31 | The Lightkeeper's inline Edits (circle name, chapter house, trauma record) have no Save or Cancel and do not say when a change is saved. (`lk-inline-edits-no-save-cancel`) | Lightkeeper laptop 1440x900 | Save and Cancel (or an 'Enter to save, Esc to cancel' hint), the field showing the start of the text, a scar box tall enough for the scar. |
| 32 | Single events write several Activity Log lines: each dealt mark writes two, and filling the track writes one line per milestone passed. (`log-lines-doubled-per-event`) | Lightkeeper laptop 1440x900 | One line per event, e.g. 'The Lightkeeper dealt Bram a Body mark (1 of 3).' and 'gains 7 Illumination (5 to 12): milestones 6 and 9; track full'. |
| 33 | Allow spending / Lock spending writes no Activity Log line, so players are not told they can spend. (`spending-toggle-not-logged`) | Lightkeeper laptop 1440x900 | A log line 'The Lightkeeper opened spending: up to two each'. |
| 34 | A half-made report amendment is lost on going to the chapter hub and back, with no warning. (`report-amend-draft-lost`) | laptop 1366x768 | Draft ticks kept, or a warning. |
| 35 | Illumination milestones are still explained by nothing a touch screen can reach, and the milestone log line says nothing of what it gives. (`milestones-unexplained-on-touch`) | phone 390x844 | A caption under the pips, the key's worth on the player's form, a milestone log line saying whether anything is owed. |
| 36 | A pending join request still cannot be withdrawn, and the waiting investigator's sheet cannot be opened from the hub. (`pending-join-cannot-withdraw`) | laptop 1366x768, phone 390x844 | A Withdraw on the waiting row that returns the investigator to Not in a campaign, and the name opens the sheet. |
| 37 | After a reload the player's Circle Advancement dialog no longer names the circle's new ability. (`advancement-reopen-drops-ability`) | desktop 1920x1080 | The reopened dialog still names the ability gained. |
| 38 | Browser Back on the Circle Advancement dialog leaves the desk for the hub and loses the half-made pick. (`advancement-dialog-back-leaves-desk`) | laptop 1366x768 | Back closes the dialog or keeps the pick. |
| 39 | Sweet Talk is a free +1d chip on any Read; nothing states its small-talk condition. (`sweet-talk-condition-unstated`) | desktop 1920x1080 | A short reminder of the book's condition on the chip. |
| 40 | Commune's Use only takes the Brain mark; the Sense roll it calls for is a separate step with no prompt. (`commune-use-not-tied-to-roll`) | tablet 820x1180 | A prompt or pre-selected Sense roll after Use, tied in the log. |
| 41 | The Nobody Left Behind chip is repeated under all nine actions while an ally is incapacitated. (`nobody-left-behind-chip-on-every-row`) | desktop 1920x1080 | One place to apply it, or the chip only where it applies. |
| 42 | After a reload the dice tray says 'No dice thrown yet' although the player's roll is in the log. (`dice-tray-empty-after-reload`) | laptop 1366x768 | The tray shows the last roll, or tray and log agree. |
| 43 | The empty tray's 'How to roll' slip runs off the right edge of a phone. (`how-to-roll-slip-off-phone`) | phone 390x844, phone 360 wide | The slip lies wholly on screen. |
| 44 | The dispatch log line cuts a long location (and tension name) at 80 characters with no ellipsis, so it reads as a wrong place name. (`dispatch-log-cut-at-80`) | every desk | The whole location, or a visible ellipsis. |
| 45 | The Lightkeeper's dispatch and the players' dispatch card carry different serial numbers for the same dispatch. (`dispatch-serial-numbers-differ`) | Lightkeeper laptop 1440x900, phone 390x844, desktop 1920x1080 | The same number on both. |
| 46 | A relationship counter identical to the offer is accepted and shown as a new 'Waiting for' the same thing. (`counter-equal-to-offer-accepted`) | tablet 820x1180 | A warning that the counter equals the offer, or the button disabled. |
| 47 | A long circle name suggestion is silently cut to about 80 characters with no counter or message. (`circle-name-cut-silently`) | laptop 1366x768 | A counter or max-length hint, or a message that it was shortened. |
| 48 | The Lightkeeper's formation status says 'has proposed one' for a player who proposed three. (`lk-formation-proposed-count`) | Lightkeeper laptop 1440x900 | 'proposed 3 of 3' or a true count. |
| 49 | The charter's insignia has a screen-reader name but its name ('Compass') is printed nowhere, and the player's charter badge has no name at all. (`insignia-name-not-printed`) | Lightkeeper laptop 1440x900, phone 390x844 | A visible caption under the badge. |
| 50 | The scar form for a second scar repeats 'Bleed track is full' while the marks read 0/0/0. (`scar-form-header-second-scar`) | phone 390x844 | Wording that explains why another scar is owed. |
| 51 | The Circle Resources note '1 plus the circle's members (now 5)' reads as five members when there are four. (`resources-note-member-count`) | Lightkeeper laptop 1440x900 | 'each refills to 5 (1 plus the circle's 4 members)'. |
| 52 | Report cards and Circle History change order on the Lightkeeper's Circle page when reports are opened. (`report-cards-reorder`) | Lightkeeper laptop 1440x900 | Cards keep their places. |
| 53 | 'Invite player' on a brand-new campaign reads like the way to bring players in, but only brings a player back; nothing says to share the campaign code. (`invite-player-reads-as-onboarding`) | Lightkeeper laptop 1440x900 | Label it 'Invite a player back' or hide it until someone has played; point new players to the campaign code. |
| 54 | At 1440x900 the Dispatch and End Assignment stamps sit just below the fold with no cue that the left column scrolls. (`lk-dispatch-stamp-below-fold`) | Lightkeeper laptop 1440x900 | Stamp visible or a scroll cue. |
| 55 | A pending request's sheet has no Approve or Reject and does not say it is a request. (`pending-request-sheet-no-decision`) | Lightkeeper laptop 1440x900 | Approve and Reject on the sheet view, or a 'Pending request' banner with them. |
| 56 | Blank pronouns are saved and shown as the word 'Unlisted'. (`blank-pronouns-shown-unlisted`) | Lightkeeper laptop 1440x900 | No pronouns line, or a muted dash. |
| 57 | Pass Notes: '@Circle (everyone)' and '@Environment (shown to everyone)' read as the same thing, and the picker's options sit outside the region for a screen reader. (`pass-notes-circle-vs-environment`) | Lightkeeper laptop 1440x900 | Labels that say what differs; options announced as the 'To:' control's list. |
| 58 | The Lightkeeper Resources editor double-spaces text off the ruled lines, touches the left edge, and its tab shows an unexplained '(1)'. (`lk-resources-editor-spacing`) | Lightkeeper laptop 1440x900 | One line per rule, inner margin, a meaningful tab label. |
| 59 | A field note's sketch always sits above the entry title and text, pushing them below the fold. (`sketch-above-entry-text`) | tablet 820x1180 | Sketch after the text, or a placement choice. |
| 60 | The creator's Gild step never says an action is already gilded by the specialty; it just omits it. (`gild-step-hides-specialty-gild`) | phone 390x844 | Say that Focus is already gilded by the specialty. |
| 61 | A '## ' heading from the Notebook toolbar renders as h5 straight under the entry's h3 title, skipping h4. (`note-heading-skips-level`) | tablet 820x1180 | Entry headings start one level under the h3 title. |
| 62 | The focused Password field on the sign-in card is a stark white block. (`signin-password-focus-style`) | phone 390x844 | Field styled like the username line. |

Where the check only partly held:

- `scar-pending-invisible-to-lightkeeper`: no 'scar owed' state on the Lightkeeper's sheet and no log line for a recorded scar are confirmed. The repeated 'has been incapacitated!' is accurate (a fourth mark on an incapacitated investigator is another scar), and clearing the track when the scar is taken is the rule as the site implements it.
- `keep-die-choices-unclear-final`: the slip's choice lines are plain text and only the dice are buttons (confirmed). The two labels never both read 'Keep the X' (the gilded one always says gilded). A keep being final is by design; Dev's wrong keep was their script's mis-aim.
- `replaced-investigator-leaves-no-record`: no Fallen card and no join log line confirmed (no join or approval path writes one); the Registry and Circle History follow from the retire step and were not re-shot.
- `burn-offer-closes-on-anyones-roll`: closing the burn on the next roll is the first report's fix working, and the dot matches the panel in the ordinary case. What remains is that it closes with no word and Burn is not next in the tab order; the real client and server mismatch is the bug roll-settling-client-server-mismatch.
- `duplicate-accessible-names`: the Illumination pips and the relationship comboboxes are confirmed; the scar-form radios are not a problem (each sits in its own labelled group). '+1 Illumination' staying live at 12 is intended (leftover Illumination, p. 55).
- `report-card-wording-stale`: the static 'tick the keys you fulfilled' after filing is confirmed; the 'Reports closed' line after End Assignment is accurate but ambiguous. Ada's missing Amend is explained by reports having closed.
- `bonus-dice-vanish-silently`: reproduced and rules-correct (a burn rerolls the action rating only); wording only.
- `reject-gives-player-no-word`: the player gets no notice (confirmed). 'Yes, reject' looks like Approve only when hovered.
- `sheet-view-drops-tension-controls`: reproduced (back to roster, raise, reopen the sheet: three clicks), but DESIGN.md:405 defines the strip as a display, so controls on it are a product decision rather than a defect.
- `scar-recorded-no-confirmation`: the page does not jump; it stays where the player was. The real gap is that an ordinary scar writes no log line.
- `personal-answer-saved-early`: 'Saved' on an empty box is confirmed on every device. Quoting the leading question follows the rules; whether to explain it is a copy decision.
- `pen-font-and-portrait-hidden`: the portrait claim did not hold (a visible photo mount and Add portrait button exist). The handwriting choice has no line saying what it changes; the list scrolls by design.
- `creator-path-arrows-below-fold-phone`: at 390x844 the arrows show above the footer; they are hidden only on a shorter visible area such as the 390x705 a phone has under its browser bars. Swiping works. The 'taps did nothing' was the automation tapping through the footer.
- `lk-inline-edits-no-save-cancel`: the circle name and chapter house Edit show no Save, Cancel or hint and scroll to the end of the name; the trauma Edit does show Save once text changes and arms Remove with a warning. The scar box is only two lines tall.
- `log-lines-doubled-per-event`: reproduced; each line is distinct and deliberate, so merging them is a product decision.
- `advancement-dialog-back-leaves-desk`: browser Back leaves the desk from every dialog; keeping the pick would be an app-wide product call.
- `sweet-talk-condition-unstated`: the chip's label has no condition, unlike other conditional chips; the Role Ability tab does print the full book text.
- `nobody-left-behind-chip-on-every-row`: the rule applies to any roll, so a chip per row is how roll mods work; a shorter label or one sheet-level toggle would help.
- `circle-name-cut-silently`: the field stops at 80 characters with no counter; a stored name is cut silently only through the API.
- `scar-form-header-second-scar`: the 'track is full' header appears for every scar, not only the second, next to an empty track (the track clears when the scar is owed).
- `invite-player-reads-as-onboarding`: the label and placement are pinned in DESIGN.md by the owner; only the word 'rejoins' reads oddly on a campaign nobody has joined. Needs the owner's say.
- `lk-dispatch-stamp-below-fold`: at a true 1440x900 viewport the stamp is visible; on a 1440x900 laptop the page is about 761 px tall under the browser bars and the stamp falls below with only a thin scrollbar as a cue.
- `gild-step-hides-specialty-gild`: Focus is shown with a locked gold star and 'Gilded: Focus' in the footer; only a visible reason is missing.

## Ideas

1. **The Lightkeeper still wants a 'Call for a roll' card that ties a called roll's result and cost back to her desk.** (`lk-call-for-roll-still-missing`) Four rolls called at the climax were asked for in table talk, read off the log and paid for through Roster, card, Deal a mark, Back: four clicks each. Three of four players ended their roll with 'what does it cost?'. The first report asked for the same card.
2. **Roster cards should show each investigator's state at a glance (drives, marks, scars, status, report, advancements waiting).** (`lk-roster-state-at-a-glance`) Roster cards show only name, role, specialty and number, so checking drives, marks, scars, status, reports or waiting advancements means opening each sheet. After the advance, nothing on the desk showed that each investigator had two picks waiting.
3. **Let authors edit their posted field notes (and link log lines into them).** (`field-notes-not-editable`) A posted field note can only be deleted, so a typo costs the entry's date and place. Dev named it one of the two things that got in the way most, and also asked to pin a log line or roll into an entry and to reorder entries.
4. **The Lightkeeper's trauma Edit cannot add a scar, so a story-given scar needs a full four-mark cycle, and removing a killing scar leaves its action shift behind.** (`lk-edit-cannot-write-scar`) The trauma Edit cannot add a scar (deliberately), so a story-given death took four full cycles of four marks and a scar form each, across three turns. Removing a killing scar leaves its action shift behind, and the next scar shifts again.
5. **A replacement investigator should be told what the circle already holds: the old answers, relationships and what is waiting.** (`newcomer-starts-with-blank-circle`) Tobias arrived to an empty Circle History row and no relationships, with nothing about the Explorer's answers or bonds, or about what the circle already shares.
6. **Pending relationship proposals never nag or expire, and 'Waiting for X' gives no hint of what happens next.** (`relationship-proposals-linger`) Dev's Muse proposal waited on Ada's Circle tab for nine turns; 'Response needed' is the only nudge, and 'Waiting for X' does not say whether X was told.
7. **The circle's advance and each member's picks should appear in Circle History or the Notebook, not only in the Activity Log.** (`circle-advance-not-in-history`) The circle's advance and each member's picks appear only in the Activity Log; Circle History and the Notebook keep nothing, and there is no case divider or recap at End Assignment.
8. **The killing (fourth) scar should skip the action shift and not offer 'Decide later'.** (`killing-scar-asks-for-shift`) The fourth scar still asks for an action shift (applied to a dead sheet) and offers Decide later, which leaves the death unrecorded.
9. **A campaign switcher on the Lightkeeper's desk, and a 'waiting' badge on the ledger for a campaign with join requests.** (`lk-campaign-switcher`) Switching between two running campaigns took three clicks through the hub each way, and the Case Ledger gives no hint that a campaign has a request waiting.
10. **No notice mail after a password or email change, and the reset email subject carries a confusing clock time.** (`account-security-emails`) No 'your password was changed' mail after a reset, nothing to the old address after an email change, and the reset subject carries a clock time in a different zone from the session.
11. **Gear such as the Thick Reference Tome cannot be applied to a roll; it is only a list of names.** (`gear-has-no-effect-on-rolls`) Gear is a list of names; the Thick Reference Tome the Lightkeeper said would help could not be applied to the roll.
12. **The Activity Log has no line for the opening scene, only the dispatch and tension.** (`opening-scene-not-logged`) The Activity Log carries the dispatch and the tension name but nothing of the scene's opening, which lives only in table talk.
13. **Let the Lightkeeper pin or label places on the Map, or upload a scene map.** (`map-cannot-be-marked`) The Map is one fixed picture of the Fairelands; the Lightkeeper cannot pin Wick Street or upload a scene map.

## Keep

- **The desk stays live without reloads.** On every device (phone 390, tablet 820, laptops, desktop 1920) approvals, marks, scars, dispatches, notes, reports, advancement dialogs and a newcomer's welcome dialog arrived live; players and the Lightkeeper never reloaded all night. Named as 'keep exactly as is' by four seats. F190 notes the welcome dialog grabbed the screen mid-action and swallowed a tap.
- **The server restart was invisible to the table.** Across the 04:15:29 to 04:15:59 restart every desk (laptop, phone, tablet, desktop) reconnected by itself, with no leftover banner, nothing lost, and later events arriving live.
- **Sign-up and account flows work end to end.** Fresh-database sign-up works first time (confirms the first report's 500-on-first-account fix); forgot-password works on a phone with the username prefilled; email change runs form to confirm page cleanly.
- **The reworked creator is clear on every screen.** Four locked steps, live counters, limits announced to screen readers, clear presets and join status at once; good on desktop, phone and tablet.
- **Join requests and the Lightkeeper's formation view.** View sheet before approving and requests keeping pronouns and catalyst after an approval (confirms first report #28 / join-requests-lose-details and the sheet-preview fix); Circle formation so far shows who has voted or answered (confirms lk-formation-status-thin); the hub shows Awaiting approval; a second campaign's code with stray spaces is accepted.
- **Formation papers handle ties and edge cases.** Ties are stated on screen with leading and your-vote markers; case and spacing duplicate names are refused with a pointer (confirms name-case-duplicates); seal kept the leading name in a 2-2 tie (confirms vote-tie-leading); counter form offers the relationship's questions; the dispatch template picks up the renamed circle.
- **Dispatch, timer and secret roll behave and log as a Lightkeeper expects.** Timer events reach the log and the screen-reader status clears with the timer (confirms first report #7 and #42); dispatches, locations and tension names each get a log line; secret rolls and private notes stay private.
- **Rolls and pools are right and clear.** Phone roll flow with drive spend and gilded refund is clear; Open Book pools match the FAQ; keyboard-only play works with a visible focus ring and announced results.
- **Double presses do exactly one thing.** Double-click and Enter-twice on keep-die, Pass Notes, Send report, votes and circle resource spends each did one thing (confirms first report report-forgets-sent and resource-double-click-double-spend fixes).
- **Scars, death and its take-back are handled with care.** Scar forms work on a phone and update the sheet at once; the fourth scar warns, shows a clear death dialog and a live Deceased section; removing the killing scar is warned and logged; the Lightkeeper's one-click Deal a mark is a keeper.
- **Assignment reports and the Illumination tally match the book.** Send locks the boxes with a REPORT SENT stamp and Amend (confirms report-forgets-sent); the next assignment's form starts empty; the tally follows p. 55, counts the newcomer and not the dead, and adds once on the desk that pressed Add (the first report's report-questions-tally; a second desk can still add it again, see illumination-tally-added-twice).
- **Advancement and End Assignment wrap up cleanly.** Track full offers a clear advancement dialog that arrives live on every device, Later leaves a way back, picks grey out at the limit; End Assignment says what stays and resets spends, reports closed 0 of 4 (confirms end-assignment-reports-open).
- **Circle resource spends are safe and live.** Two-tap confirm, counts and drives update live, a third spend is refused with a reason.
- **The Notebook feels like a real field journal.** Markdown preview, photographs and the sketch tool work first try on a tablet and kept all five entries through a restart, a death and two assignment closes.
- **Invite and Save and rejoin turn a death into a new start.** The invite banner follows the player into the creator, Save and rejoin is one tap, and the table gets a welcome dialog with the relationship form.
- **A second campaign is easy to start and leaves the first intact.** One small form; the Case Ledger lists both; returning to the first desk finds it current.

## The players' view

**Rue, the Lightkeeper (laptop 1440x900).** Rue ran both assignments, a death, a replacement and a second campaign from the 1440x900 laptop without a reload: approvals, rolls, marks, scars, reports, the advance and the 04:15 server restart all came and went on her desk by themselves, and her own tools (template dispatch, named hourglass, secret rolls, Deal a mark, the report tally, End Assignment) worked. She knew what her players' sheets said only by opening each one: roster cards show no drives, marks or status, the sheet view hides the hourglass controls, and nothing says a scar is owed or advancements are waiting. What cost her most was the death (her Edit cannot add a scar, so the agreed death took four mark cycles over three turns, and she has no Revive), bookkeeping that lives in one browser (the tally ticks), and events that write no log line (the seal, the rename, approvals, spending, invites and the death itself). Her standing wish is still a 'Call for a roll' card.

**Ada (desktop 1920x1080).** Ada checked every number on her 1920x1080 desktop and found the maths right: Open Book's pool and refund, a burn rerolling the action rating only, a critical on two sixes, the Illumination tally by p. 55 (three questions plus 2) and two advancements each when the circle advanced. What she flagged was wording: the gilded choice promises '1 Cunning back' at a full drive, Sweet Talk's chip states no condition, Open Book leaves no trace in the log, and a hand-set Illumination change logs like an earned gain. She also saw Bram drop out of her Your Circle panel with no line saying why. She named the wobbling keep-die control as what got in her way most, though that turned out to be her automation, not the site.

**Bram (phone 390x844).** Bram played everything on a 390x844 phone (about 705 px of page under the browser bars). For someone who never read the rulebook the roll flow, the password reset, the scar forms, the advancement dialog and the invite-and-rejoin flow all worked, and he built his replacement Professor and rejoined in one sitting. What hurt was length: the scar form and the advancement dialog hide their main buttons below the fold, the creator's card arrows sit under the sticky footer on a short screen, and the Circle tab is one long page. His first death had a clear dialog; the second had none, and once Tobias arrived the Explorer vanished from every screen, with nothing of his answers or bonds passed on.

**Cass (laptop 1366x768).** Cass spent the night on a 1366x768 laptop trying to break things, and most guards held: double-clicks, Enter twice, rapid votes, a triple-clicked spend, emoji and Markdown in names and fields, a keyboard-only round, reloads and a server restart all did one thing each. She got stuck in the second campaign: Mina Vale's formation papers covered the hub button and only browser Back got her out, and when Side Case was retired Mina vanished from her registry while the hub stayed stale until a reload. She also lost an unsent report amendment on a hub round trip, and a Burn and reroll from the first assignment came back after End Assignment.

**Dev (tablet 820x1180).** Dev kept the story on an 820x1180 tablet: five Markdown field notes, two photographs and a sketch survived a server restart, a death and two assignment ends, and an email change worked end to end. The gaps were in keeping the story tidy: field notes cannot be edited, the sketch always sits above the text, italics show as an underline, the circle's advance lives only in the Activity Log, and Pass Notes has no way to answer the Lightkeeper privately. On touch the keep-die needed a scripted click (an automation limit), and a keep their script aimed wrong was final.

## Method notes for a third playtest

- Relayed messages reach running agents. An off-table question from the organiser (what the gold ball on the hub is) was relayed into every seat mid-act; every seat answered it instead of playing, and the Approval, Circle and Ready turns were lost and had to be re-run as act 1b. Next time keep organiser chat out of the seats, or mark it as off-table so agents ignore it.
- The Lightkeeper's Edit cannot add scars (deliberately), so a scripted death takes four scar cycles of four marks each, one scar form at a time on the player's phone. The agreed death ran over three turns and needed a test-engineer turn to finish. Next time seed the doomed investigator with three scars in setup, or plan the cycles from the first scene.
- seat.js matches target names as case-insensitive substrings, so ambiguous controls were hit by mistake: Dev's relationship counter went out unchanged and their Lantern gear tap missed; separately, a keep-die script aimed at the wrong die kept it. Make exact matching the default and fail on more than one match.
- seat.js --tap sends a raw touch at the target's coordinates without checking what is on top. That produced a vote nobody cast (stray-question-vote-through-papers) and the 'arrows do nothing' tap on the creator's footer. Check document.elementFromPoint before tapping, as Playwright's click does.
- The keep-die wobble defeats Playwright's stability check, and nine findings were really that timeout. Give the seats a tested helper (Enter on the focused die) and tell them not to log automation timeouts as UX.
- Five cited screenshots were never saved (shots/dev/034_ctr.png, 035_done.png, 061_toc.png, shots/cass/043_t3_name.png, shots/dm/157_back_lw3.png) and a few findings point at the wrong frame. Have finding.js refuse a shot path that does not exist.
- Seats sometimes misreported numbers at the table: Ada posted her climax Sway as 6, 5, 3, 2, while the server rolled 6 (gilded), 4, 5, 3. The site was right. Seats should copy dice from the log line, and the report should trust the logs over table talk.
- Read-only database checks were refused by the permission system twice (the Lightkeeper's scar-text check and Cass's check on Mina Vale). Allow read-only psql in the seats' sandbox or give them a read-only helper.
- Test actions leaked into the story log: the 04:21 roll from the dead sheet and the take-back test sit in the campaign's log between real play. Run deliberate probes on a separate table, or tag them in the log.
- The phone seat's page is 390x705, not 390x844; some verifiers measured at 844 and got different answers (creator arrows, scar form). Fix one phone height for every check.
- Three high-severity clusters (spend-back-unguarded-past-maximum, silent-socket-loses-mark, patch-up-chip-never-shown) were seen only by the regression agents and got no separate verifier or adversarial check. Send every high item through the same verification.
- The second campaign got little play: Mina's papers trapped Cass and Side Case was never sealed. Give the second campaign its own planned turns, and test the hub's liveness on purpose (it has no socket).
