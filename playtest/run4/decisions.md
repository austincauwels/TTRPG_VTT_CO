# Fourth playtest: what is decided (read before calling anything a bug)

Build under test: main 1bc48a0 (PRs 61, 68, 70 and 71 merged). Control (none of those PRs): 2d86b77, the third playtest's build.

Binding product decisions, oldest first. Behaviour these describe is not a bug, even if it surprises you:
- decisions_fix4.md (PR 61: release and leave, Train dice, spend confirm, report line, missing reports, ally offers)
- decisions_fix5.md (PR 68: Edit sheet with logged edits, the Lightkeeper's desk, circle resources and earn-back, short confirms)
- decisions_fix6.md (PR 70: the log and held marks in the database, the tray after reload, the dead as a record, the Illumination ring)
- decisions_fix7.md (PR 71: the low UX lines 69.x, 45.x and 60.x)
- issue16.md (GitHub #16, behaviour kept on purpose)

Calls flagged to Robert and kept as built (14 October). Report them only if they break something else:
- Sheet edit lines go to the whole table. The editor refuses a fourth scar. The Account card keeps its menu.
- Fallen at the foot of the Registry. Sign out clears that account's drafts. The ring layout as built. A dead investigator can still Accept a proposal made before the death. A held mark is not cleared at End Assignment or on release or retire (a death drops it). When the server loses a held mark its card closes with no word. Two candles on the Circle pages.
- After a private note the recipient stays selected. A roll names every ability toggled on. The skip link sits after the header controls. The Lightkeeper's felt keeps the last roll after End Assignment.
- 45.16 (open a waiting investigator's sheet from the hub) is not built, on purpose for now.

Known and still open: #45 line 45.16; #60 lines 60.10 (partly), 60.14 (needs a real tablet), 60.24 (map does not load in the sandbox) and the Ideas section; ideas #27 to #32 and #34.
