# Fix round 7: the low UX checklists (13 October 2026, overnight)

Robert chose this set before bed: the unticked lines of #69, #45 and the UX section of #60 (not #60's Ideas, not the idea issues #27-#34). Base: main e5356d4 (fix round 6, PR 70, merged). Earlier decisions stay binding: `decisions.md` (round 6), `decisions_fix5.md`, `decisions_fix4.md` and issue #16 (behaviour kept on purpose). Never remove or weaken what they ask for.

Line ids follow `/home/user/pt6/triage7.md` (an Opus triage on 98dbc0b, the same code as e5356d4): 69.1-69.8, 45.1-45.20, 60.4-60.25 (unticked lines only).

## Out of the round
- 60.20 is already fixed (maxLength 80 and a counter): tick it only.
- 45.16 (open a waiting investigator's sheet from the hub) needs Robert's decision: it is a new view, not a missing handler. Leave it unticked.

## Decisions (defaults the triage recommended; the PR flags them for Robert)
1. Follow the triage's smallest fix for each line unless the code shows a better one. Keep DESIGN.md: 44px touch targets, help on demand behind an "i", a confirm is one short sentence with a one-verb button, "Lightkeeper" never "GM".
2. 69.4: the Finalize confirm keeps both loss warnings, in one short sentence.
3. 45.3 and 45.13: one Illumination line per addition; a milestone is named in it only where it gives something (Resource Management), saying what.
4. 60.9: after a private note the recipient stays selected but is shown loudly; the receiver's line is marked private.
5. 60.13: End Assignment clears and hides the timer.
6. Server changes stay small (gm.py, access.py, rolls.py, one circles column for 69.3); no new WebSocket message types. A new optional field is fine if documented in WEBSOCKET.md and covered in tests.
