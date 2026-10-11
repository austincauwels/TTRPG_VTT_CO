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
