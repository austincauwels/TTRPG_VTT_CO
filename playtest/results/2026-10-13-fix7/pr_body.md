Fix round 7: the low UX checklists, #69, #45 and the UX lines of #60. Built to `playtest/results/2026-10-13-fix7/decisions.md` (decisions7) on `playtest-harness`. Line ids such as 45.7 follow the triage there, `triage7.md`.

Fixes #69

Part of #45 and #60. Lines are ticked by hand after the merge. Left open:
- **45.16:** opening a waiting investigator's sheet from the hub. This needs a decision from Robert, because it is a new view.
- **60.10:** a posted sketch's labels are about 11px on a wide laptop drawing. The fix in scope is in.
- **60.14:** the recipient list with a tablet keyboard up. The fix can't be driven in headless Chromium, and the control did not reproduce the bug.
- **60.24:** the dark band under the sign-in map. The map does not load in the sandbox.

60.20 was already fixed, and is ticked.

## What changed

**Lightkeeper's desk**
- 45.1: the table strip has tension - and + and the timer's Start or Pause, so they work while a sheet, the Circle page or the Notebook is open. This is on tablet and up; the phone strip stays read-only.
- 45.4 and 45.5: from xl the Dispatch and End Assignment stamps sit in a sticky row at the foot of the paper, with the receipt in view. The End stamp no longer moves when it arms.
- 69.8b: both desk headers put the title above the buttons below xl, so the title no longer touches Back to chapter hub.
- 45.6: an empty requests list says "No one waiting to join. New players ask with the campaign code <code>." Invite player is reworded.
- 45.7: when a request is withdrawn while its sheet is open, the sheet stays open read-only with a note. A new request clears that state.
- 60.6: End Assignment says drives carry over and a Refresh restores them. Reset has an "i".
- 60.13: End Assignment clears and hides the timer.
- 60.19: every waiting name has its count, for example "Ada (1 relationship)".
- 69.4: the Finalize confirm is one sentence with both losses. From three empty parts it counts them instead of naming them.

**Server**
- 69.3: a new column `circles.milestones_earned` counts each Resource Management milestone once, including across a fall and a rise. A milestone that earned nothing (every resource full) is not used up. When the column is added, older circles are set to the milestones their track already stands past.
- 69.7: an insignia change before the seal is refused (409).
- 45.2: a long place name in the log is cut on a space.
- 45.3 and 45.13: one Illumination line per addition. A milestone is named only on circles with Resource Management, saying what it earns back.
- 60.7: End Assignment clears the player's tray, and no roll is replayed into the next assignment (a held gilded roll is kept, settled).
- 45.10: `roll_result` gains an optional field `roll.abilities`, so the slip and the log name Open Book and Interrogation after the roll.

**Player's sheet, Circle page and Notebook**
- 69.1: a refused Edit sheet save keeps the draft. The gear dialog writes back only its own changes.
- 69.2: a refused ability use keeps the typed question.
- 69.5 and 69.6: the long trauma Edit subline and the Circle Resources paragraph move behind an "i".
- 69.8a: the ability card is headed by the ability's own role after a role change.
- 45.11: the empty gear note fits, and Change Gear is not clipped on a tablet.
- 45.12: your own Your Circle card shows Incapacitated and scars.
- 45.14: closing reports with a kept amendment shows the sent report.
- 45.15: the sheet scrolls to a new scar.
- 60.10: posted sketch labels are larger, and Keep drawing stays in view.
- 60.11: "1 Nerve spent" shows after a roll.
- 60.16: a Skip to actions link, and the disabled stepper takes no focus.
- 60.17: a proposed relationship is marked Proposed.
- 60.18: Chapter House says Saved, and that the box is shared.
- 60.21: Preview turns to Edit while previewing.
- 60.22: the gear limit shows by the finger on a phone.

**Dice, log, hub, creator and sign-in**
- 45.8: Burn and reroll is a few Tabs from a keyboard roll, and focus stays put when the next roll closes it.
- 45.9: the reroll slip no longer covers Burn and reroll.
- 60.5: the keep-a-die choice stays still and is announced once.
- 60.8: an optional burn no longer shows as a waiting choice.
- 60.12: Learn from My Mistakes is not offered when every drive is full.
- 60.9: private notes are marked clearly for the sender and the receiver.
- 60.4: the hub keeps a "Let in: press Play" mark after approval, a reload included.
- 45.17: Check again is 44px on a phone.
- 45.18: the locked Last Played tome explains itself on tap and focus.
- 45.19 and 60.23: the creator's path arrows clear the sticky footer, and the summary shows where drive points came from.
- 45.20 and 60.15: the Handwriting help says the word once, and the list stays inside the Join dialog.
- 60.24 and 60.25: the sign-in buttons fit above the fold at 1366x768. The Google frame has a name, and sign-up says "Sign up with Google".

## Calls Robert may want to change
- **60.9:** after a private note, the recipient stays selected with a loud Private tag, instead of going back to @Circle.
- **45.10:** the roll names every ability the player toggled, including one that changed nothing on that roll.
- **60.16:** the skip link is the 3rd Tab stop on a phone and the 6th on a laptop, after the header controls.
- **69.3:** a waiting earn-back that a manual refill made pointless still counts its milestone as used.
- **60.7:** the Lightkeeper's felt keeps the last scene's roll after End Assignment. Only the player's tray clears.
- **45.16 is not built:** a sheet view from the hub would be a new view.

## Deploy notes
At startup the server adds one column, `circles.milestones_earned`, and once fills it for existing circles from their Illumination track. Nothing else in stored data changes.

## How it was checked
- **Triage:** an Opus triage read all 50 unticked lines against main e5356d4.
- **Groups:** three groups (desk, sheet, dice) were each implemented, reviewed and repaired in their own worktree, then merged by hand. Conflicts were in QUIRKS.md and one WEBSOCKET.md row.
- **Backend suite:** after the final repair, 2015 passed, 1 skipped.
- **Final checks:** a final Opus code review found nothing blocking. Three browser checks replayed every line on e5356d4 (the control) and then on this branch, at 390x844, 820x1180 and 1366x768 on both desks.
- **Last fixes:** the checks found four gaps, fixed in the last two commits. A milestone that earned nothing is no longer used up, the Chapter House status no longer says "Not saved yet" after another member's edit, the Let in mark lasts, and a mouse roll no longer moves focus to Burn and reroll (a keyboard roll still does).
- **Other:** the frontend build passes. The only em dashes in added lines are in the existing roll log format, which the client parser and tests depend on.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WaLz6UBTQ5XaTKSYwqeMKA
