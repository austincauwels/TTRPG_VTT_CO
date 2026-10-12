# Fix round 4: what Robert decided (12 October 2026)

The third playtest (12 October, beta, build 2d86b77) produced `run3/report.md`. Robert took every recommendation below. These are the intended behaviour: implementers build them, reviewers check against them and never remove one.

## Decisions

1. **Taking an investigator off a roster (#49).**
   - Both the Lightkeeper and the player may do it, at any time (before or after the seal, during or between assignments). The Lightkeeper releases a member from that member's roster card or sheet; the player leaves the campaign from their own desk or the hub. Both use the app's two-press confirm and say what will happen.
   - After the seal the release takes effect at once: the member's circle-formation votes, their relationships (agreed and pending, both ends), and their report for the current assignment are dropped; the "N of M" report count and the key tally use the new membership. The Stitch, Refresh and Train maximums are recomputed (1 + members) and each current amount is lowered to fit its new maximum. Nothing is refunded and nothing goes up.
   - The character itself is kept (released, like a retired campaign frees living investigators), so old log lines, notebook entries and Circle History still read correctly. The player can use the investigator elsewhere or rejoin by the normal join flow.
   - Every desk is told live and the Activity Log says who was released or left (no reason shown).
2. **When circle resources may be spent (#50).** Unchanged: whenever the Lightkeeper opens spending. A bought Train die lasts until a roll uses it; End Assignment no longer clears it. The spend count (two per player per assignment) still resets at End Assignment. Every place that describes this (the Train card, the log line, the roll chip, the Circle page, the Lightkeeper's sheet, FAQ.md, QUIRKS.md) uses one consistent wording.
3. **The circle spend "Press again" confirm (#60).** No 4-second lapse: it stays armed until the player presses elsewhere, like ConfirmAction.jsx and every other confirm. The double-click guard from PR 48 stays. DESIGN.md is updated to match.
4. **A text line on the report (#58).** Add an optional short line (up to about 280 characters) to the assignment report. The Lightkeeper reads it on that player's report card. An amended report can change it.
5. **Missing report warning.** Add Illumination and End Assignment name the members who have not filed ("Not filed: Ada Quill") in their existing confirm step. It does not block. FAQ.md is updated (today it says there is no warning).
6. **Behind Me and other ally offers (#59).** Keep the 2-minute window. The Activity Log tells the Lightkeeper and the offered ally who was offered, and says when an offer lapsed unanswered.

## Earlier decisions that still hold (do not undo)

- "Lightkeeper", never "GM", on screen. 44px touch targets. Help on demand (hover, focus, an "i"), never permanent sublines.
- The Lightkeeper alone sees players' usernames, and only on join requests. Players see character names and the Lightkeeper's role, never a login name (#54 is this rule applied).
- Retire frees living investigators; the dead stay with the campaign. A replacement investigator keeps its predecessor's spend count.
- An unadded Illumination tally is dropped at End Assignment, with a warning.
- A dead sheet is a record. "Give a spend back" takes one press and never fills a pool past its maximum.
- Issue #16 lists more behaviour kept on purpose; read it before calling something a bug.

## Not in this round

Everything else on #60 and the older issues stays open. Do not widen a group past its items.
