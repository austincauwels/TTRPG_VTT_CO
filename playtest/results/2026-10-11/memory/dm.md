# dm (Lightkeeper Rue) memory

## Turn 1, Campaign phase (2026-10-11)
- Signed up lightkeeper_rue / lightkeeper_rue@example.test / password correct-horse-battery-staple (unchanged). Worked first try.
- Created campaign "The Lantern Ward", code **lantern-ward** (the code is typed by hand; nothing is suggested from the name). Told the table (table #1).
- Toured the desk: Roster (dispatch slip, Join Requests, Invite player, Finalize the circle, formation papers, hourglass+timer, dice, Activity Log, Pass Notes), Circle, Notebook, Map. Story NOT started; nothing dispatched; tension 0; timer switch left ON at 0:00 (cleared).
- Wrote prep notes in Notebook > Lightkeeper Resources (autosaved).
- Findings: F001 praise signup, F002 Invite player wording, F003 Dispatch below fold, F004 timer praise, F005 resources editor spacing, F006 BUG dispatch draft wiped by section switch, F007 pass-notes targets, F008 map idea.
- Desk notes: the left column scrolls on its own (mouse wheel over x~180); Dispatch stamp is just below the fold. End Assignment needs two presses. Non-Roster sections show a table strip (tension/timer/newest log line), only when there is something to show.
- Watching for: join requests arriving live (no reload), roster cards keeping pronouns/catalyst after approval (first report), timer/tension strip on Circle/Notebook/Map during play, dispatch draft loss (type and send without leaving Roster), whether Activity Log survives a reload/hub trip now.
- Investigator: none (Lightkeeper).

## Turn 2, Approval phase (2026-10-11)
- The user's own request this turn was only "What is the gold ball on the top left?", so I answered that and did NOT do the approval steps. Join requests still pending (desk shows 1 of 4: Ada, Bram, Cass Detective, Cass Magician "Mina Vale"; Dev has not sent one yet). No approvals or rejections, nothing posted at the table.
- Answer: the gold ball top left of the Chapter Hub is the CandleCluster (frontend/src/components/campaignSelector/CandleCluster.jsx), candles seen from above. 3 pillars always lit for the chapter, plus 1 small candle per active investigator or campaign you run, up to 6 (CampaignSelector.jsx line 100). Unlit ones show a cold pool and smoke. Purely decorative, aria-hidden. Already logged by cass as F022.
- Went hub -> back to desk via the Lantern Ward tome; desk open on Roster. Password unchanged.
- Next turn: still to do the approvals (open each sheet first), reject the Cass Magician in character, check the desk after, start circle formation.

## Turn 3, Ready phase (2026-10-11)
- Again the user's own request this turn was only "What is the gold ball on the top left?", so I answered it and did NOT do the Ready steps (no approvals, no formation or seal, no rename, no dispatch, no hourglass/timer change, no opening narration). Nothing posted at the table, no findings logged.
- Answer (re-checked in source): the gold ball top left of the Chapter Hub is the CandleCluster (frontend/src/components/campaignSelector/CandleCluster.jsx, used at CampaignSelector.jsx line 166 with lit={litCandles}), candles seen from above: 3 pillars lit for the chapter plus 1 smaller candle per investigator in play or campaign you run, up to 6; unlit ones show a cold pool, dark wick and smoke. Decorative, aria-hidden, no click action. Already F022 (cass), F031 (dev, tablet).
- Desk state at look: Lightkeeper desk on Roster, timer cleared, no dice thrown, activity log last lines are the 03:22 timer set/start/clear. Join requests still pending (Ada, Bram, Cass Detective, Cass Magician "Mina Vale", Dev Lindqvist now too). Password unchanged.
- Still to do when a turn asks for it: approve Ada, Bram, Cass (Detective), Dev; reject Mina Vale in character; formation and seal; rename circle; first dispatch (Wick Street, Hollin Cross, after midnight); opening narration with one roll per player.

## Turn 4, Approval phase (2026-10-11)
- Did the approvals this time. Opened every sheet first (View sheet; Back to roster keeps the pager position). Approved Dev, Ada, Bram, Cass *Moreau* (Detective). Rejected Mina Vale (Cass's Face/Magician) with the two-press Reject ("Yes, reject" / "Keep request"). Desk now: "No one waiting to join", four roster polaroids (Ada, Bram, Cass, Dev), "Finalize the circle 4 in the circle (up to 5)".
- Pressed Finalize ONCE to read the armed hint, then "Not yet": circle NOT sealed. Formation papers open on all four desks, 0 of 4 voted on every part, chapter house not written, no relationships.
- Told the table (#9, #10): welcome, Mina Vale turned back (one investigator per player), what to fill in on the formation papers; I seal once everyone has voted.
- The relayed user line this turn ("no, a tack pushed into a desk is not realistic") was off-table chat for the organiser; not acted on.
- Findings: F033 praise View sheet + details kept, F034 requests don't name the player, F035 approvals/rejection not in Activity Log, F036 'Unlisted' pronouns, F037 Yes-reject looks like Approve / no reason, F038 Finalize arms with nothing voted and no warning, F039 praise formation status, F040 no Approve/Reject on the pending sheet view.
- Sheets seen: Ada Face/Journalist N1 C6 I2, Cunning res 2; Bram Muscle/Explorer N5 C2 I2, Nerve res 1, Move/Strike gilded; Cass Slink/Detective N3 C3 I3, res 1/1/1, Control/Survey gilded; Dev Weird/Medium N1 C3 I5, Cunning/Intuition res 1, Survey/Sense gilded.
- Next: watch the formation papers fill live (votes, ticks, name), then Finalize (two presses; check the circle name/ability/insignia that come out), rename the circle via Edit if needed, dispatch Wick Street, opening narration.

## Turn 5, Ready phase (2026-10-11)
- Desk was live at start: formation papers showed 4 of 4 voted on every part (no reload). Pressed Finalize, then "Yes, finalize the circle": sealed as The Lantern Ward Circle (2-2 tie went to first voted, matching the papers), ability In This Together, insignia Compass, chapter house The Empty Office (+ Ada darkroom, Dev spirit board lines). 4 relationships still waiting (can be accepted after the seal).
- Circle page: Edit circle name (no Save/Cancel, Enter saves) -> renamed **The Green Lamp Society**. ws showed circle_update broadcast; NO Activity Log line for the seal or the rename (F058).
- Circle state: Illumination 0/12, Stitch/Refresh/Train 5/5 each, spending locked, reports closed 0 of 4.
- Dispatch sent with Template at 03:46: location "Wick Street, Hollin Cross, after midnight", atmosphere green gas lamps/deserted/hissing mains/shutters closed. Logged.
- Hourglass at 0 of 4 (start), clock named "The green lamps" (logged). Timer switch turned OFF (no countdown for the opening; plan to use it in the gasworks). Switching it off writes no log line.
- Opening narration posted (#16-18): Ada Sway the man on the step of no. 14; Bram Move up the ladder to the lamp; Cass Survey the cobbles for the lamplighter's traces; Dev Sense the green light.
- Findings: F058 seal/rename not logged, F059 name Edit no Save/hint and text scrolled, F060 praise tie seal matches papers, F061 praise template + logging.
- Relayed user line again "no, a tack pushed into a desk is not realistic": organiser chat, not acted on.
- Next: watch the four rolls arrive live in the Activity Log/tray, narrate outcomes, consider tension raise on failures, check players' desks show The Green Lamp Society (ask at table), then the gasworks scene (timer?).

## Turn 6, Round 2 (2026-10-11)
- Desk was current at start without reload (all four rolls, Commune line, Dev's photograph line, tray showing Dev's Sense).
- Narrated round 1 outcomes (#26-27): Ada got the name Ebenezer Marrow (lamplighter's assistant); Bram's lamp holds a burning ledger page; Cass failed -> ink in her palm = Bleed mark; Dev: lamps turn to face the gasworks.
- Dealt Cass 1 Bleed (From an enemy ticked, default). Open LK roll 2d: 4 (Marrow opens the gasworks gate, drops snuffer-hook). Secret LK roll 2d: 6,6 critical (unrevealed: Marrow knows they are coming / the ledger is ready; use later). Tension raised to 1 of 4 (The green lamps). Private pass note to Dev: St. Brede's debtors' ward, bed eleven, ledger under the mattress, "do not let the big one sign anything". New dispatch 03:53: the Hollin Cross gasworks, Wick Street's dead end.
- OOC line said (#29): Bram's death agreed. Story: the ledger page in Bram's pocket in his handwriting.
- BLOCKER: the trauma record Edit CANNOT add scars (only reword/remove; backend refuses longer list). So no 3 scars written. Instead dealt Bram 4 Body marks with Deal a mark: 3 filled, 4th -> track reset to 0, INCAPACITATED, scar form on Bram's phone (his FIRST scar, 0/4). Told the table (#31) the death will come over more mark cycles.
- No ability offers seen on my desk (ws shows none). Desk while scar pending: marks 0/0/0, INCAPACITATED tag, Scars 0/4, nothing says a scar is owed, Deal a mark still active; roster card shows no status (F079).
- Findings: F078 idea Edit cannot add scars, F079 scar pending invisible on LK desk, F080 hourglass hidden while a sheet is open, F081 two log lines per dealt mark, F082 praise secret roll/private note/new dispatch.
- Sheets now: Ada Face/Journalist (no marks seen); Bram Muscle/Explorer, Body 0 (reset), incapacitated, scar 1 pending, 0/4 scars; Cass Slink/Detective Bleed 1/3; Dev Weird/Medium Brain 1/3, Intuition 4/5.
- Prompts given (#32): Ada Read the snuffer-hook; Cass Hide and follow Marrow inside; Dev Focus to hold Bram; all react to Bram's fall. Bram: write scar on phone.
- Next: watch Bram's scar arrive live (scars 1/4, action shift), revive him? (revive_character clears incapacitated + marks) then repeat 4-mark cycles for scars 2,3,4 -> death. Check what the desk shows on is_dead. Consider the timer in the gasworks. Pass-notes dropdown still on @Dev Lindqvist (private): reset to Circle before speaking to all.
- Investigator: none (Lightkeeper).

## Turn 7, Round 3 (2026-10-11)
- Desk current at start without reload (Ada's Read+burn, Cass's Hide, Dev's Focus 5, Dev's note to Ada (the LK log shows players' private notes), Dev's field entry; Bram's scar 1 on his sheet with text and -1 Control +1 Focus).
- DEATH NOT REACHED: Bram has only 1 of 4 scars, so the take-back test (remove 4th scar) could not be done. Edit opened and closed with Done, no change (no Cancel; Remove/Done semantics unclear; F103). LK desk has NO Revive button (F101).
- Dealt Bram 4 Bleed marks (From an enemy) at 04:00 while still incapacitated: Bleed 1,2,3 -> 0, log "took a fourth Bleed mark" + "has been incapacitated!" again; scar 2 form should be on his phone; LK sheet still Scars 1/4 (F102). Do NOT deal more marks until he records it: the frontend keeps only one pendingScar, a second trigger_scar would overwrite.
- Invite player NOT sent: opened the slip and closed it. invite_rejoin has no check for a living investigator, and once a new investigator is on the roster the death cannot be lifted by Edit (gm.py) -> invite only after the 4th scar, and do the take-back test BEFORE the invite (F104). Told Bram (#46).
- Story: Marrow opened the ledger (secret 6,6 paid off), Dev's board cracked (Focus mixed cost), second line of debt on Bram. Final rolls called (#44): Ada Sway (name the debt, 'one evening, owing'), Cass Hide (take the ledger), Dev Focus (hold the page shut). Ending to narrate next turn from those rolls.
- Tension lowered to 0 of 4 (The green lamps), logged. Timer off.
- Circle page: reports OPEN (logged), three Illumination questions ticked (local-only ticks, F105), Total +3, NOT yet added (wait for reports/keys, then 'Add N Illumination'). Illumination 0/12, resources 5/5 locked.
- Findings F101-F107.
- Next: narrate the ending from the three final rolls; watch reports arrive (keys), add Illumination; Bram scars 2->3->4 (revive not needed: marks land while incapacitated; one cycle per Bram turn); at death: check desk/circle/roster, Edit remove 4th scar (take-back), then put death back by another 4-mark cycle + Bram's 4th scar form; THEN Invite bram_okafor; End Assignment (two presses).
- Pass-notes dropdown still on @Dev Lindqvist (private).
- Investigator: none (Lightkeeper).

## Turn 8, Wrap (2026-10-11)
- Desk current at start, no reload: all four reports filed, Dev's photograph line newest.
- Roster: NO join request, no new investigator, no death. Bram (Explorer) still INCAPACITATED with 2 of 4 scars; the death never completed in assignment one. Told the table (#56): last two wounds come at the start of the Glass Orchard, then the invite; do not build the Professor yet.
- Reports read (cards flip, Ticked/Not ticked announced): Ada Gather Statements; Bram Run into Danger; Dev Sense Phenomena; Cass none. Total +5 (3 questions + 2 some keys) = p. 55. Pressed Add 5 Illumination (0 -> 5, questions locked, log).
- Set Illumination to 12 (log: gains 7, milestone 6, milestone 9, track full), then 'Track full: advance the circle' -> dialog, picked **Nobody Left Behind** -> circle abilities: In This Together + Nobody Left Behind. Track 0/12. Resources refilled (already 5/5 = 1 + 4 members). Each investigator has advancement_picks = 2 (DB read), not visible on my desk (F129).
- End Assignment (two presses): dispatch, template fields, hourglass (0, clock name gone), ability uses, reports (all 'No report yet', reports closed), ALL gear lists emptied (F130). Drives NOT refilled: Ada Cunning 5/6 res 1/2; Dev Intuition 3/5; Cass Nerve 3 Cunning 3 Intuition 3 (Cunning res burned); Bram N5 C2 I2.
- Allowed spending (Spending open, no log line, F131). Stitch/Refresh/Train 5/5. Each player up to two spends.
- Told the table (#54-56): ending narration, bookkeeping, what their screens show, asked Ada to confirm 3+2 and two advancements each.
- Findings: F127, F128 praise; F129-F132 ux.
- Next (Glass Orchard): watch players' Refresh spends and advancement picks arrive live; check gear re-pick; new dispatch Kettering Park hothouse at dawn; Bram's scars 3 and 4 by mark cycles (one at a time, wait for each form), take-back test, then Invite bram_okafor; check roster shows the dead Explorer kept on record and the new Professor. Pass-notes dropdown still on @Dev Lindqvist (private).
- Investigator: none (Lightkeeper).

## Stress-engineer turn, Death (2026-10-11, driven by stress, not Rue)
- Server restarted 04:15:29-04:15:59; desk reconnected by itself (ws_open 04:15:59 + circle_update), current, no banner.
- On Bram's sheet dealt 4 Body (04:17-04:18) -> scar 3 written on his phone (-1 Move +1 Sway); 4 Body again (04:19) -> scar 4 (-1 Survey +1 Focus): Bram Okafor (Explorer) is DEAD, Scars 4/4, tag DEAD.
- Desk now: Roster shows Ada, Cass, Dev, then '† Deceased' with Bram's card (black band, DECEASED stamp). Circle page still shows Bram's report card 'No report yet' and his Circle History entry (F159). Activity Log newest death-related line is still 'Bram Okafor has been incapacitated!' (no death line, F156), then a test roll 'Bram Okafor rolled Focus, a 6: Critical success' at ~04:21 (test, not play, F157). Deal a mark still live on his dead sheet.
- Last view: Circle page. Pass-notes dropdown still on @Dev Lindqvist (private). Resources Stitch 4, Refresh 1, Train 5, spending open. Tension 0, no dispatch.
- NOT done: take-back test (Edit remove 4th scar) and Invite bram_okafor. Do take-back BEFORE invite (F104).

## Turn 9, Orchard (2026-10-11)
- Start (no reload, after the 04:15 restart): desk current and connected (pings/pongs, no errors), Circle page last view, roster with Bram under '† Deceased', log ending at the 04:21 test roll. Nothing stale beyond known F156/F159.
- TAKE-BACK TEST done (04:23): Bram's sheet > trauma record Edit > Remove scar 4 > armed 'Yes, remove' + Cancel with warning 'With three scars, Bram Okafor is alive again, and incapacitated until revived.' After: Status Incapacitated, 3/4, Bram moved back into the living roster live, log line 'removed a scar ... (3 of 4). Bram Okafor is alive, and incapacitated until revived.' Removed scar's shift (-1 Survey +1 Focus) stays. F163 praise, F164 (log revives a death nobody saw), F165 (shift stays; new 4th scar will shift again), F166 (scar 3 text shows its shift note twice).
- DEATH PUT BACK (partly): dealt 4 Body marks at 04:24 -> fourth mark, incapacitated again, scar form should be on Bram's phone. UNTIL BRAM WRITES IT the Explorer is ALIVE (3/4, incapacitated) on my desk. Asked him (#63) to write the 4th scar FIRST, then accept the invite.
- Invite sent to bram_okafor at ~04:25 ('Invite sent to bram_okafor.'), no warning while he is alive, no log line (F167, confirms F104).
- Second campaign: 'Side Case', code side-case (I chose it). Empty desk, Unnamed Circle. Told Cass (#64). Hub's 'Last Played' now points at Side Case; get back via Case Ledger > The Lantern Ward Run.
- Glass Orchard opened: Template dispatch 04:26 'the disused hothouse at Kettering Park, at dawn' / atmosphere fogged glass, glass fruit with faces. Hourglass named 'The glass ripens', 0 of 4, timer off. Called rolls (#65-66): Ada Read (gardener's planting ledger, whose faces), Cass Survey (tracks on the gravel), Dev Sense (nearest fruit). F169, F170 praise.
- Pass-notes dropdown now on @Circle (everyone) (reset after visiting the hub). Dice tray reset to 1 die.
- Next: confirm on my desk Bram goes back to Deceased (4/4) once he writes the scar; check whether a death line reaches my log this time; watch the Professor's arrival (no approval needed for an invite?) and roster showing dead Explorer + Professor; narrate the three rolls; gardener's cottage scene; consider tension/timer; Side Case approvals for Cass's Magician.
- Investigator: none (Lightkeeper).

## Turn 10, Climax (2026-10-11)
- Start (no reload): desk current. Roster now Dev, Ada, Cass, Tobias Okafor-Reyes (Scholar/Professor, he/him). NO '† Deceased' section any more: the dead Explorer is gone from roster and Circle History once replaced (status retired, is_dead in DB). No log line for the 4th scar/death or for Tobias joining (F200). He came in by the invite, so no approval was needed. Welcomed him at the table (#74).
- Tobias's sheet (LK view): Nerve 2 (res 0), Cunning 4 (res 1), Intuition 3 (res 1); Sway 1, Read 2 gilded, Survey 2, Focus 2 gilded, Sense 2; gear Thick Reference Tome, Chemical Kit, University Keys; 0 marks, 0 scars; spends 0/2.
- Side Case: hub > Case Ledger > Side Case Run; approved Mina Vale (Face/Magician, Cass) in one click; desk shows her card, formation papers open on her desk, 1 in circle, not finalized, nothing dispatched, no log line for the approval. Back via Case Ledger > The Lantern Ward Run ('Last Played' now points at Side Case). F201.
- Glass Orchard story: Ada's crit -> ledger is gardener Abel Thorne's; every planting named for someone lost to the fever ward in '71; last line his own name. Cass's 1 -> footsteps behind her. Dev's 4 -> face wants Marit's voice. Tension raised to 2 of 4 (The glass ripens), two log lines.
- CLIMAX CALLED (#75-76): first fruit at the centre with Abel's face. Final rolls: Ada Sway (speak to Abel), Cass Hide (or Strike), Dev Focus (hold the faces), Tobias Survey (fault line, tome). A failed roll gets a mark (Bleed/Body from the glass), not yet dealt: players have not rolled.
- Circle page: reports OPEN (log line 04:36), three questions ticked (still local only, F105), Total +3, NOT added yet. Told players to file reports (#77). Report cards/history reordered on opening (F202).
- Findings: F200 (dead vanishes, no join line), F201 (switching), F202 (reorder).
- Next: read the four final rolls in the log; deal a mark on each failed roller's sheet (Roster card > sheet > Deal a mark); narrate the fruit breaking (or the cost); tension down; read reports (keys), add 3 + keys; consider End Assignment; lock spending? (still OPEN since last break). Side Case: Mina alone, circle not finalized.
- Last view: Roster. Pass-notes dropdown on @Circle (everyone). Investigator: none (Lightkeeper).

## Turn 11, Close (2026-10-11)
- Start (no reload): desk current (all 8 climax rolls, 4 reports, Dev's sketch, tension 2/4 'The glass ripens'). No stale state.
- Narrated the climax (#89): Ada 6 success, Tobias/Cass/Dev 4 mixed; dealt Cass a Bleed mark (now 1 of 3) via sheet > Deal a mark. One face slipped into Dev's board (open thread for Marit).
- Circle page: total +5 (3 questions + keys 2 for 3 of 4; dead Explorer not counted, Tobias counted) = book p.55. Add 5 Illumination: 0 -> 5 of 12, milestone 3 line, button locks to 'Added 5 Illumination' (F217). Pip a11y nit F218.
- End Assignment 04:43: tension 0, clock name and dispatch blank, reports closed 0 of 4, spends 0/2, gear 'No gear' (by design), marks and drives kept (Cass Bleed 1; Tobias Intuition 2/3), spending Open (F219).
- Side Case RETIRED from its desk (hub only offers Delete). Gone from the Ledger with no trace; hub 'Case Ledger: 1 campaign', Last Played The Lantern Ward (F220). Mina Vale should be unaffiliated in Cass's registry (told her, #90).
- Exit notes F221 (call-for-a-roll card still missing), F222 (roster cards show no state), F223 praise Deal a mark, F224 praise live desk. Session closed at the table (#90).
- Last view: The Lantern Ward Roster, tension 0/4, Illumination 5/12, Stitch 4 / Refresh 1 / Train 5, spending Open, no dispatch. Investigator: none (Lightkeeper).
- Watching: whether Cass's desk got Mina back (registry), whether players' desks show the Bleed mark and the End Assignment reset live; Ada's Sway log reads dice '6 gilded, 4, 5, 3' while she reported '6, 5, 3, 2' at the table (unchecked).
