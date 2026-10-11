# Re-check of the second report on main (36f001c), 11 October

Six Opus agents re-tested all 81 bugs and UX items of the second report (`results/2026-10-11/report.md`) in Chromium on private copies, at the sizes they were seen on. Findings: `findings.jsonl` (F001-F030).

| Result | Items |
|---|---|
| fixed | 56 |
| partly | 14 |
| fixed-but-new-problem | 7 |
| not-fixed | 4 |

| Item | Result | Finding | Problem |
|---|---|---|---|
| bugs#8 dead-investigator-still-acts | partly | F002 | Two gaps remain, both reachable only by a crafted request. (1) apply_scar from the dead investigator's own socket is accepted: a fifth scar is stored and Move is lowered 1->0 on the dead record. (2) REST POST /circle/relationship/propose stores a proposal from a dead investigator. FAQ.md:141 promises both are refused. Not checked: finishing a gilded roll made in life after the death. |
| bugs#9 invite-silently-retires-living-investigator | fixed-but-new-problem | F007 | If the player accepts on another device, the replaced investigator's open phone desk gets no frame or log line. It keeps showing Bram's live sheet and the now-used invite banner, although Bram is retired. |
| bugs#11 lightkeeper-has-no-revive | fixed-but-new-problem | F003 | A double press on Revive revives twice and logs 'has been revived and is operational.' twice on every desk: the handler does not check incapacitated first. |
| ux#26 scar-recorded-no-confirmation | fixed-but-new-problem | F005 | Commit 9738faa says the sheet scrolls to the scars list after a new scar, but it does not: scrollY stays 0 with the scars at y=2349. scarLinesRef is attached only to the Lightkeeper's edit-mode list, so scrollIntoView never runs on the player's sheet. The report said no scrolling was needed, so this is low. |
| ux#53 invite-player-reads-as-onboarding | not-fixed | F006 | The copy is unchanged and nothing points new players to the campaign code. Neither PR touched it and decisions.md records no decision, so it is still waiting on Robert (DESIGN.md:377 pins the wording). |
| bugs#2 silent-socket-loses-mark | partly | F001 | A held mark is still lost without a word if the player reloads the page before the desk reconnects. heldMarks is not persisted, so the unanswered take_mark dies with the page. |
| ux#15 burn-offer-closes-on-anyones-roll | partly | F009 | Burn is still far down the tab order after a keyboard roll, and focus falls to the page when the next roll closes it. The wording and dot parts are fixed. |
| ux#20 bonus-dice-vanish-silently | fixed-but-new-problem | F010 | At 1366 the new i slip covers Burn and reroll (F010). The used chips are still not named in the slip or log (F011). |
| ux#42 dice-tray-empty-after-reload | not-fixed | F012 | The tray is still empty after reloading an open roll, and the desk drops Burn and reroll while the server still accepts the burn. |
| bugs#1 spend-back-unguarded-past-maximum | partly | F008 | A person's double-click on Give a spend back still returns two spends. The Lightkeeper has no way to take the extra spend away. |
| ux#22 sheet-view-drops-tension-controls | not-fixed | F013 | The tension and timer controls still disappear when a sheet (or Circle, Notebook or Map) is open. |
| ux#32 log-lines-doubled-per-event | partly | F014 | The Illumination half is not merged: it still writes the gains line plus one line per milestone. This may be an unrecorded product choice. |
| ux#44 dispatch-log-cut-at-80 | partly | F015 | A long location is still cut mid-word ('Newfa...'). |
| ux#54 lk-dispatch-stamp-below-fold | not-fixed | F016 | On a 1440x900 laptop the stamps are still below the fold, with no cue that the column scrolls. |
| bugs#5 end-assignment-drops-unadded-tally | partly | F017 | A double-click on End Assignment (a habit for some users) skips the new warning, and the unadded Illumination is lost exactly as before. |
| bugs#14 spend-limit-resets-with-new-investigator | partly | F019 | A replacement that comes in through a join request the Lightkeeper approves still starts at 0/2, so the player gets two more spends in the same break. |
| ux#9 circle-page-blind-to-status | partly | F020 | The player's own Your Circle card has no Incapacitated or scars stamp. The dead investigator's relationship paper says only '4 scars' (covered by F004). |
| ux#10 end-assignment-gear-wording | fixed-but-new-problem | F018 | The new 'Why empty' slip is cut off by the gear tag at every size, and on a tablet the empty tag also clips the Change Gear label. |
| ux#34 report-amend-draft-lost | fixed-but-new-problem | F025 | A held amendment plus Close reports leaves the card showing the unsent ticks with no stamp. Because the draft now persists, this can last the rest of the assignment. |
| ux#35 milestones-unexplained-on-touch | partly | F024 | The milestone log line still says nothing about what the milestone gives (related to F014). |
| bugs#17 | partly | F026 | If the Case Ledger is already open when the campaign is retired, it stays stale, and Play opens a desk for the retired campaign without saying it was retired. |
| ux#29 | partly | F027 | On touch and keyboard the lock is still unexplained, and the candles look unchanged. |
| ux#36 | partly | F021 | The waiting investigator's sheet still cannot be opened from the hub. |
| ux#28 pen-font-and-portrait-hidden | fixed-but-new-problem | F029 | The duplicated 'Handwriting' label, and the help slip clipped by 59px on a phone, covering the pen picker while it is open. |
| ux#30 creator-path-arrows-below-fold-phone | partly | F028 | The arrows and counter are still hidden under the sticky footer on a 360-wide phone and on phones shorter than about 700px of visible height. |
