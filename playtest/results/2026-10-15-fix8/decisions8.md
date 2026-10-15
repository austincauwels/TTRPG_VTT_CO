# Fix round 8: scope and decisions (Robert, 15 October 2026)

Base: main 1bc48a0 (PR 71, fix round 7), which beta runs. Control for browser checks: 1bc48a0.

## Scope

- Bugs #72 to #85, medium UX #86 and #87 (GitHub, austincauwels/TTRPG_VTT_CO).
- The 21 lines of #88 "seen on a local copy" (verified). The 28 lines "seen once in play, not verified" and the 4 Ideas only where cheap (a small, local change) and plainly right; skip the rest and say so.
- Source of every item: the fourth playtest report, /home/user/harness/playtest/results/2026-10-14-run4/report.md and report.json (steps, screenshots, cluster ids).

## Decisions (binding; Robert took every recommendation)

1. #73 A death lowers the circle's resource maximum and the pools at once, exactly as a release does (the dead no longer count toward 1 plus members). Every desk updates live, and the log says so in one line.
2. #74 The Lightkeeper's charter (chapter house) is read-only until the seal. The players' chapter house answer wins; the Lightkeeper's desk shows it.
3. #77 A member who leaves and rejoins within one assignment keeps their circle spend count for that assignment, as #41 does for other cases.
4. #82 Only the Lightkeeper may Revive. The server refuses a player's Revive; the player's sheet does not offer it. The log names who revived.
5. #81 When a mark is dealt while a Death Defy hold is stored for that investigator, the held mark lands first and its offer closes, as WEBSOCKET.md 4.5 describes; then the new mark is dealt normally. The old offer never comes back.
6. #86 The Lightkeeper sees a player's open burn as a mark on that player's slip on the felt (not a line by Roll).
7. #88 add-illumination-one-press: Add N Illumination asks for a one-sentence confirm only while some reports are unfiled; with every report filed it stays one press. Update FAQ.md (about line 248).
8. #88 illumination-past-12: +1 Illumination stops at 12 (the button is disabled at 12, and the server refuses or clamps). Add N keeps its carry-over.
9. #88 spending-open-after-end: circle spending closes at End Assignment and opens again when the next assignment starts. The i and the refusal say so.
10. The burn preview "Survey: 2 dice" is relabelled "Reroll: Survey, 2 dice" (same pattern for other drives).

## Earlier decisions still binding

decisions_fix4.md, decisions_fix5.md, decisions_fix6.md, decisions_fix7.md, decisions_run4.md (calls kept as built on 14 October) and issue16.md (GitHub #16, behaviour kept on purpose). Never remove or weaken what they ask for.
