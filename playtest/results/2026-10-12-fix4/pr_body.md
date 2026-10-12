The fix round for the third playtest (12 October, beta, build 2d86b77). It covers every confirmed item from that playtest plus the six product decisions Robert made on 12 October. Raw findings, the decisions and the check results are on `playtest-harness` in `playtest/results/2026-10-12-run3/` and `playtest/results/2026-10-12-fix4/`.

## Robert's decisions, built here

- **Releasing a member and leaving (#49).** The Lightkeeper can release a member from the member's sheet, and a player can leave from the desk or the hub. Either works at any time and uses a two-press confirm that says what will happen.
  - After the seal, the member's votes, relationships and current report are dropped. The Stitch, Refresh and Train maximums become 1 + members, and current amounts are lowered to fit with no refund.
  - The character is kept and freed. Its spends, gear, ability uses and Train dice end, as at Retire.
  - Every desk is told live, and the log says who was released or left.
  - New route `POST /campaign/release/{id}` and new message `investigator_released`.
- **Train dice (#50).** A bought Train die lasts until a roll uses it; End Assignment no longer clears it. The spend count still resets at End Assignment. The card, log, roll chip, Circle page, the Lightkeeper's sheet and FAQ now use one wording.
- **Spend confirm (#60).** "Press again" stays armed until a press elsewhere. There is no 4-second lapse, and the double-click guard stays.
- **Report line (#58).** An optional line of up to 280 characters goes with the key. An amended report can change it, and the Lightkeeper reads it on the report card.
- **Missing reports.** End Assignment's confirm, and the Add Illumination area, name who has not filed once reports are due. Neither blocks.
- **Ally offers (#59).** The 2-minute window stays. The log tells the Lightkeeper and the offered ally about the offer, and says when it lapsed. This covers Behind Me, Premonitions and the Non-Combatant drive point.

## Other fixes

- #51 A drive with a maximum of 0 is sent and shown as 0 ("none", no pip).
- #55 The log names only the Intuition that Well-Read actually gave back.
- #52 Each click with the sketch Text tool commits the open label and starts a new one, and Escape no longer makes the next click overwrite.
- #53 A notebook Contents line brings its entry into view, also on a phone under the sticky header, and a contents page holds only the lines that fit, with the arrows paging through the rest (no hidden lines).
- #54 Players see "The Lightkeeper" in place of her login name on notebook entries, the author filter and the sketch log line. This includes the payloads. At startup the server re-signs her older notebook entries the same way (rows with author type gm and no character), so this changes stored data once on deploy.
- #56 After the seal the Lightkeeper sees the circle's relationships, agreed and pending.
- #57 A refused session lands on the sign-in form with a note saying the session ended.
- #60 The join notice is in the first person, and the keys info slip opens above its heading so it no longer covers the checkboxes.

## How it was checked

- The work was split into five area groups. Each was implemented, reviewed by a separate reviewer against the decisions, and repaired.
- After the merge: the full backend suite, a final review of the whole diff (all 15 items and every claimed change found in the code), and browser checks. The browser checks replayed each item's original steps at the original device size, first on 2d86b77 as the control and then on this branch.
- The final checks found one phone scroll problem in #53 and a few release seams (doc wording, a released ally taking a Non-Combatant point, a report sent mid-release, flaky timing tests). All are fixed in the last commits.
- Full backend suite on the final head: 1938 passed, 1 skipped.
- Left as is, with reasons in the check results: the Well-Read log keeps its em dash because `outcomes.js` parses that token, and a few optional nits. There is no Release button on the roster card itself, because the card opens the sheet, which has it.

Fixes #49
Fixes #50
Fixes #51
Fixes #52
Fixes #53
Fixes #54
Fixes #55
Fixes #56
Fixes #57
Fixes #58
Fixes #59

On #60 this ticks three lines: spend-confirm-lapses-fast, join-notice-third-person and info-slip-covers-keys.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0111CtHbxPzvhZV8obkhBcp5
