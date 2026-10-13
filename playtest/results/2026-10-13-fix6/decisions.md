# Fix round 6: the older-bug round (13 October 2026)

Robert picked the older-bug round ("recommended run"). Scope: bugs #17-#22 and #38-#44, medium UX #23-#26, #46, #47, and #67. Base: main 77452a3 (PR 68 merged). Earlier decisions stay binding: `decisions_fix5.md`, `decisions_fix4.md` and issue #16 (behaviour kept on purpose). Never remove or weaken what they ask for.

## The issues, short

- #17 Activity Log history and held ally offers live in server memory, so a restart empties them.
- #18 After a restart, declining a stale ally offer card still lands its mark.
- #19 After Flourish (or Bending Spoons), the result slip still shows the old outcome.
- #20 Notebook drafts stay in the browser after Sign out.
- #21 A sketch in progress is lost on Back after a reload.
- #22 A dead investigator's player gets a 403 in the console opening a retired campaign's desk.
- #23 The Lightkeeper's copy of a sheet does not show held marks.
- #24 The sheet's ability tab resets to Role ability on every tab switch.
- #25 Some Notebook controls (and sketch buttons) are under 44px on a phone.
- #26 The creator's step 3 row overflows on screens narrower than about 356px.
- #38 The server accepts a scar from a dead investigator, and relationship proposals to or from the dead (REST and WebSocket); the living player's Circle page offers Propose to the dead.
- #39 A rejoin from another device leaves the replaced investigator's open desk live, with the used invite banner.
- #40 A reload after an open roll empties the tray and hides Burn and reroll, though the server still takes the burn.
- #41 A replacement approved through a join request starts with 0 spends used.
- #42 With the Case Ledger open when a campaign is retired, Play still opens a desk for it.
- #43 A mark held during a silent outage is lost if the page is reloaded before the desk reconnects.
- #44 Notebook Heading, List and Quote on an empty line leave the mark selected, so typing erases it.
- #46 Approve, View sheet and Reject on a join request card are 40px tall on a phone (triage: already fixed by 7be39b1; verify at 390x844).
- #47 The player Registry keeps no record of a fallen investigator.
- #67 (Robert, verbatim) "Make the Illumination tracker a circle of pips around the candle icon".

## Decisions

1. **Restarts lose nothing a player can see (#17, #18, #23, #43).** The Activity Log is stored in the database (a table, pruned to the last 500 lines per campaign; a desk gets the last 100 addressed to it on connect, as today). A held mark (soak, Death Defy) survives a restart and comes back to the desk with the same offer id. An answer naming an offer the server no longer holds is ignored and the card is closed (`mark_offer_closed` dropped), never lands a mark. Ally offers that live only in memory (Behind Me, Premonitions, Adrenaline Rush, Non-Combatant) expire cleanly after a restart, with the existing refusal; QUIRKS.md says so. Recent mark ids are kept so a mark sent again after a reload or restart is taken once.
2. **The tray tells the truth (#19, #40).** When Flourish or another post-roll ability changes an outcome, the desk is told and the result slip shows the new outcome. After a reload, the last roll comes back to the tray with Burn and reroll while the server still holds it open (no dice sound on a replay).
3. **The dead are a record (#38, #22).** The server refuses a scar from the dead and a relationship proposal from or to the dead, on both REST and WebSocket. A dead investigator's relationship paper says Dead with no Propose. A player whose investigator is no longer active is not sent for the roster.
4. **Replaced or retired means gone from the desk (#39, #42, #41).** An open desk of an investigator retired by a rejoin is told and goes to the hub with a notice. Play on a campaign that was retired since the book opened stays on the hub with a notice. A replacement approved by a join request keeps its predecessor's spend count, as a rejoin already does.
5. **Fallen in the Registry (#47), default taken.** A "Fallen" section at the foot of the player's Registry lists each dead investigator with name, campaign and a Fallen stamp, no Play, Leave or Delete.
6. **Drafts on Sign out (#20), default taken.** An explicit Sign out clears that account's Notebook and creator drafts on the device. A session the server ends (forced re-login) keeps them.
7. **Illumination ring (#67), default taken.** On both Circle pages (player and Lightkeeper) the Illumination track is 12 pips in a ring around the candle icon, laid out like a clock face: pip 12 at the top, milestones 3, 6 and 9 at those clock positions, marked gold and larger. The candle warms as the track fills and is fully lit when full. The Lightkeeper's pips stay real buttons in order 1 to 12 with today's labels and toggle behaviour, 44px touch targets that never overlap, and the +1 and -1 controls stay. The player's ring is one image labelled "Illumination n of 12". The count line and Track full banner stay. Reduced motion is respected. The small summary card on the Lightkeeper's desk keeps its row of dots.
8. **Small UX (#24, #25, #26, #44, #21, #46).** The sheet remembers the ability tab per character and view; every Notebook and sketch control is 44px on touch; the creator's step 3 row fits down to 320px; marking an empty line puts the caret after the mark; Back after a reload keeps a sketch in progress (and warn before unload while strokes are unsaved); #46 is checked at 390x844 and closed if it holds.

Defaults 5, 6 and 7 were Claude's recommended answers to small open calls; the PR flags them for Robert.
