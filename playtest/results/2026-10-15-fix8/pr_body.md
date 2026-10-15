Fix round 8: the bugs and medium UX items from the fourth playtest, plus the #88 checklist lines. Built to Robert's decisions in `playtest/results/2026-10-15-fix8/decisions8.md` on `playtest-harness`. Line ids such as 88.u11 follow the triage there, `triage8.md`.

Fixes #72
Fixes #73
Fixes #74
Fixes #75
Fixes #76
Fixes #77
Fixes #78
Fixes #80
Fixes #81
Fixes #82
Fixes #83
Fixes #84
Fixes #85
Fixes #86
Fixes #87

Part of #79: the restart case stays open (see below).

Part of #88. Lines are ticked by hand after the merge. All 21 verified lines are in, except 88.15, which already worked: a superseded Lightkeeper tab has Use this tab. Of the unverified lines, 14 small ones are in, plus 2 ideas. The other 14 lines and 2 ideas are left open, because each needs a design or more than a small change (see `triage8.md`).

## Robert's decisions, as built
- **#73:** a death lowers the circle's resource maximum and the pools at once, as a release does. Every desk updates live, with one line: "Stitch, Refresh and Train now hold at most 3 each." Nothing goes back up when the death is undone.
- **#74:** before the seal, the Lightkeeper's charter (name, chapter house, ability) is read-only, and the server refuses a change. At the seal, the players' chapter house wins.
- **#77:** a member who leaves and rejoins within one assignment keeps their circle spend count. The count follows the player.
- **#82:** only the Lightkeeper can Revive. The server refuses a player (403), and the player's sheet no longer offers it. The log says "The Lightkeeper revived Ada."
- **#81:** a mark dealt while a Death Defy mark is held lands the held mark first and closes its offer. The old offer does not come back.
- **#86:** a player's open burn shows as a "Burn open" stamp on her slip on the felt.
- **88.3:** Add N Illumination asks for a confirm only while some reports are unfiled.
- **88.12:** +1 Illumination stops at 12. Add N keeps its carry-over.
- **88.u11:** circle spending closes at End Assignment and opens again with the next assignment's dispatch. The "i" and the refusal say so.
- **D10:** the burn preview reads "Reroll: Survey, 2 dice".

## What changed

**Server and data**
- #72: an owed scar is stored in a new column, `characters.scar_pending`, so it survives a restart.
- 88.7: "Let in: press Play" comes from the server (a new column, `characters.let_in`), so every browser shows it.
- 88.1: the roster item gains `held_marks`, and the Lightkeeper's card reads "Bleed mark held: Death Defy?".
- #76: the dead cannot file or amend a report. The server refuses it in two places, and the dead desk shows no form.
- #78: after a restart, a refused gilded keep or a lost roll says so in one line and offers no Burn. `activity_history` is now sent on every connect, an empty one included.
- #79: Non-Combatant offers come back on a reload, and a full drive is refused with "Nerve is already full." After a restart the card still goes with no word (documented in FAQ.md).
- #80: a roll is refused while a gilded choice waits.
- #75: the Edit sheet log shows the changed words, with one word of context on each side.
- 88.u12 and 88.u13: an amended report keeps its first filing date and is marked Amended live. An amendment that changes nothing is refused.
- 88.10: the circle advance line names the refill.

**Lightkeeper's desk**
- #83: a second Lightkeeper tab drops a request once it is handled.
- 88.16 and 88.17: the join request is a small toast with Approve, View and Later. A new request clears the old note.
- 88.18: the Reset "i" is no longer named "About About Reset".
- 88.u8: an armed Secret roll is loud.
- 88.u26: small log wording fixes.
- 88.i1: the front of the report card marks a filed line.
- 88.u20: the Illumination heading's name no longer includes the whole "i" text.

**Player's sheet, Circle page and papers**
- 88.2: "Used this assignment." for once-per-assignment abilities, on both sheets.
- 88.4: the formation papers show a done tick on each part, also on the phone strip.
- 88.8, 88.9 and 88.11: the owed-scar banner, the advancement dialog and the receipt are reworded.
- 88.14: a stale tab's Confirm advancement points to Use this tab.
- 88.20: a Chapter House draft says when another member changed the box.
- 88.u7: a circle spend is announced, and a held Train die shows.
- 88.u9: an empty dispatch reads "No dispatch yet."
- 88.u21: the name counter is labelled.
- 88.i3: Stitch says so when there are no marks to clear.
- 88.u3: the relationship two-way hint.
- 88.u25: an empty Field Notes contents page has a line.
- 88.6: the Notebook Contents fits more lines on a phone.
- 88.19: a refused edit is announced once.
- 88.21: the Join dialog buttons are aligned.

**Dice and touch**
- #87: in-play controls are 44px on touch, including the roll modifications, the ability mark offer, the scar dialog, relationship negotiation and the Use this tab banner.
- 88.5: keep-a-die dice stay still on touch.
- 88.13: ally cards name the mark they answer.
- 88.u14: the Adrenaline Rush picker spells out drive names.
- 88.u17: the keep slip wording.

**Docs:** WEBSOCKET.md (every new refusal and field; #85 reconnects rewritten), FAQ.md, QUIRKS.md and DESIGN.md.

## Protocol and schema
- New columns, added at startup by `add_columns`: `characters.scar_pending` and `characters.let_in`.
- New fields: `held_marks` on the roster item, `let_in` on the character and the character summary (openapi.json updated), `amended_at` on a report, and `settled` on a replayed felt roll.
- New refusals:
  - `roll` while a gilded die waits (409).
  - `revive_character` from a player (403).
  - `submit_assignment_report` from the dead (409) or with no change (409).
  - `update_circle` charter fields before the seal (409).
  - `spend_resource` while closed (409, where it was silent before).
  - Non-Combatant on a full drive (409).
- No new message types. `departed_spends` and `spending_paused` are kept in `circles.backstory_answers`, and players cannot write them.
- At deploy: an investigator let in before the deploy loses the "Let in" mark, since the new column starts false.

## Calls to confirm
These fit the decisions, but Robert may not expect them:
1. An investigator outside any campaign can never be revived. The player can't do it, and there is no Lightkeeper.
2. After End Assignment, spending reopens on the Lightkeeper's next dispatch write. Spending she locked herself stays locked.
3. The kept spend count follows the player, so it also carries over to a different investigator of the same player.
4. A secret roll does not clear the Burn open stamp until the Lightkeeper reloads, because a live signal would reveal the secret roll.
5. The join toast has no Reject. It is behind View, on the Requests page.
6. +1 at 12 is clamped rather than refused.
7. The roll log lines keep their existing em dash ("The Lightkeeper rolled — 5 ...").

## How it was checked
- The Opus triage, five groups (each implemented, reviewed and repaired), and a hand merge with no conflicts.
- The full backend suite: 2055 passed, 1 skipped.
- A final Opus review of the whole diff, and three browser checks that replayed each issue's original steps against 1bc48a0 as the control, at phone, tablet and laptop sizes. The browser checks found 48 items fixed and 3 partly fixed. The repair finished #86 (the stamp after a reload) and 88.u3 (the hint cut off on a phone). For #79, a Non-Combatant card open during a restart still goes with no word, and FAQ.md now says so; a notice like Premonitions' would be a follow-up. The repair also closed every other "should" finding.
- The vite build is clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01A1wzsfAj4Qm2nbUqe2spTn
