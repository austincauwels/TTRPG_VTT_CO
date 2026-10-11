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
