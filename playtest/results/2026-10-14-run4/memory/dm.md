# Lightkeeper (dm) memory, playtest 4

## Turn 1 (Campaign phase): account + campaign
- Signed up lightkeeper_rue_r4 (new account, sign-up form, password correct-horse-battery-staple). Landed on Chapter Hub.
- Created campaign "The Gullhaven Chapter", code **gullhaven-r4** (Hub > New campaign ticket). Went straight to the Lightkeeper's Desk.
- Told the table the code (table #1). Story NOT started: nothing dispatched, tension 0/4, timer off, no clock name.
- Desk tour: nav = Roster (main desk: dispatch card w/ Own words/Template, Finalize the circle, Circle formation papers, investigators strip, hourglass + clock name + timer, dice tray w/ Secret, Activity Log, Pass Notes), Circle (charter, Illumination ring 0/12 with milestones 3/6/9, Illumination Questions + Open reports, Circle Resources Stitch/Refresh/Train 1 each, Spending locked / Allow spending, Circle History), Notebook (Field Notes / Private Notes / Lightkeeper Resources, Sketch, Photo), Map (Fairelands image), Requests (join requests, Invite player). Non-Roster tabs show a compact tension strip at top; Notebook/Map hide the dice tray and log.
- End Assignment is two-press (End / Keep going). I armed it once and pressed Keep going.
- Findings logged: F001 praise (code visible), F002 End Assignment live on empty campaign + popover covers counter, F003 Illumination milestones unexplained/aria, F004 empty Field Notes TOC.
- No console errors so far.

## Watching for
- Join requests should appear on Requests tab (and nav badge?) live without reload.
- Per FAQ: once members are approved, circle resources should become 1 + members each (5 with four players), including before the seal.
- Whether Notebook/Map tabs hide incoming rolls/log during play (possible idea finding).
- Next: approve Ada, Bram, Cass, Dev; circle formation; finalize; dispatch scene 1 (estuary flats at dusk).

## Turn 2 (Approval): approvals + circle formation opened
- Start-of-turn look (no reload): Requests badge "4 waiting" + "New join request" toast (Bram first) had arrived live. Not stale.
- Requests tab: opened each sheet (View sheet) before approving. All four legal per creation.py: 9 action points, drives total 9, resistance = 1 per 3 in a drive.
  - Bram Okafor (he/him) Muscle/Soldier: Move 2g, Strike 2g, Control 2, Sway/Read/Hide 0, Survey 2, Focus 0, Sense 1. Nerve 5, Cunning 1, Intuition 3. Res: Nerve 1, Intuition 1. Gear Heavy Firearm, Tactical Armor, Trench Whistle. Adrenaline Rush; Geared Up.
  - Ada Quill (she/her) Scholar/Professor: Move/Strike/Control 0, Sway 1, Read 2g, Hide 0, Survey 2, Focus 2g, Sense 2. Nerve 1, Cunning 4, Intuition 4. Res: Cunning 1, Intuition 1. Gear Thick Reference Tome, Lantern, Bleed Detector. Well-Read.
  - Cass Moreau (she/her) Slink/Criminal: Move 2, Strike 0, Control 1, Sway 2g, Read 0, Hide 2g, Survey 1, Focus 1, Sense 0. Nerve 3, Cunning 5, Intuition 1. Res: Nerve 1, Cunning 1. Gear Advanced Lockpicks, Concealed Blade, Lantern. Death Defy. Catalyst: brother Jory vanished off the wharf; question "Who was paid to look away the night he went?"
  - Dev Lindqvist (he/they) Weird/Occultist: Move/Strike 0, Control 2, Sway 1, Read 1, Hide 0, Survey 2g, Focus 1g, Sense 2. Nerve 2, Cunning 2, Intuition 5. Res: Intuition 1 only. Gear Arcane Texts, Occult Supplies, Ritual Dagger. Great Wards.
  - Source note: internal keys sneak = Read, read = Focus (not a bug).
- Approved all four (Approve on the sheet; log lines "X was approved into the circle." 22:22-22:23). Welcomed each at table (#6). Told the table formation steps (#7).
- Circle formation: no start button; papers open on players' desks on approval. Roster shows "Circle formation so far" with per-player ticks (0 of 4 voted everywhere). Armed Finalize once ("Press again to seal ... leaving 4 parts empty.") and pressed Not yet: NOT finalized.
- Circle tab: Unnamed Circle, Illumination 0/12, resources Stitch/Refresh/Train 5/5 each, Spending locked. Reports closed.
- Findings: F015 praise (join review flow), F016 ux med (LK charter editable pre-seal; seal overrides name/ability, LK chapter house beats players'), F017 ux low (no start step; Finalize armable with 0 votes; "4 parts" unnamed), F018 praise (resources 5 each pre-seal). Small inaccuracy in F015: after Approve the desk returned to the request list with the next card, not straight to the next sheet.
- No console errors.

## Left for me / watching for
- Wait for all six parts ticked on Roster formation paper (question + personal answers, name, chapter house text, ability, insignia, relationships). Check the ticks arrive live. Then Finalize (two presses) and confirm the slip counts waiting relationships.
- Do NOT edit charter name/house/ability on the Circle tab before seal (F016).
- After seal: check circle name/ability/insignia on Circle tab, resources still 5, then dispatch scene 1 (estuary flats at dusk), Location "Gullhaven estuary flats".

## Turn 3 (Ready): sealed + dispatched + opening
- Start look (no reload): Roster formation paper showed all live: I-V 4 of 4 voted, four answers, toll shed text, VI 7 of 11 relationships (waiting: Bram 1 = Cass's Champion, Ada 2 = Dev's + Cass's Confidant, Dev 1 = Cass's Stranger). My log DOES show Bram's approval (F021 is player-side only).
- Finalize twice -> sealed: The Whistlers, Nobody Left Behind, Candlelight, toll shed, heroic question. Log line names the result. Resources 5/5/5 max 5, Illumination 0/12, Spending locked, Reports closed.
- Dispatch sent (Own words), Location "Gullhaven, the estuary flats at dusk", 609 chars. "Dispatched at 10:30 PM".
- Tension clock named "The fog comes in", raised to 1 of 4. Timer OFF (saving it for scene 3, the ferry mid-channel).
- Opening narration posted (table #13-14). Asked: Bram Move (follow footprints), Ada Focus (stamped verse on chain links), Cass Hide (along the chain toward the bell), Dev Sense (listen to the bell).
- Findings: F032 ux low (armed Finalize gives no preview, drops waiting-relationships note), F033 praise (seal), F034 ux low (12h vs 24h time; dispatch form No. changed 8318 -> 1836).
- No console errors.

## Watching for
- Players' rolls arriving live in my log/dice tray; check pool sizes vs sheets (Bram Move 2g Nerve 5; Ada Focus 2g Intuition 4; Cass Hide 2g Cunning 5; Dev Sense 2 Intuition 5).
- Whether waiting relationships can still be accepted after the seal (players to try).
- Deal marks for failures (Body/Brain/Bleed). Next scene after rolls: footprints end at channel, bell; then scene 2 cottage. Timer in scene 3.

## Turn 4 (Round 1): answered scene 1 rolls, moved to scene 2
- Start look (no reload): desk current. Log had Ada Focus 6 Success, Bram Move gilded 5 Mixed (+1 Nerve back), Dev Sense (Extend Your Senses) 6,4,5,6 Critical, Cass Hide gilded 1 Failure (+1 Cunning back), Dev photo. Tray slip showed Cass's failure. Not stale.
- Narrated outcomes (table #24): Ada = psalm on every 7th chain link "Bear me over, ferryman, for I have no coin", last line filed half away. Bram = prints end at channel edge, deeper at toe (lifted). Dev = bell is a replayed recording + man's voice counting coins 1-40. Cass = the thing in the fog heard her.
- Marks: Cass Bleed (From an enemy ticked) -> HELD for Death Defy ("Bleed mark held for Death Defy."). Not yet resolved; watch whether she uses Death Defy (1/assignment) or takes it. Her sheet: Nerve 3/3, Cunning 5/5, Intuition 1/1, res Nerve 1, Cunning 1.
- LK open roll 3 dice: 3,3,1 Failure (thing reaches for Cass and misses). LK secret roll 2 dice: 3,3 Failure (my secret: the thing's hold on the far bank is weak tonight / ferryman not yet aware of them). Secret then unticked by hand.
- Tension raised to 2 of 4 (clock "The fog comes in"). Timer still OFF (for scene 3).
- Pass note PRIVATE to Ada: counting voice said her name between 39 and 40; the filed line's hand = marginalia in her own reference tome. (Pass Notes To: still set to Ada private: switch back to @Circle before next public note.)
- Dispatch resent: Location "Gullhaven, the ferryman's cottage on the far bank", 637 chars, names ferryman Absalom Hode, drowned 1886, no body. Log "sent a new dispatch". 22:35.
- Scene 2 narrated (table #26): cottage, psalm sheet changing hand, tarred tide-ledger with swollen brass lock, portrait face scratched out, something wet trying the latch.
- Asked: Bram Control (brace door; Control 2, Nerve 5), Ada Read (psalm sheet; Read 2g, Cunning 4), Cass Control (ledger lock; Control 1, Nerve 3), Dev Survey (portrait; Survey 2g, Intuition 4).
- Findings: F046 praise (Death Defy hold), F047 ux med (open roll silently closes a player's burn window), F048 ux low (Secret + private recipient stay armed), F049 ux low (log/slip wording), F050 ux low (roster card blind to held mark).
- No console errors. Did not need start_all.sh.

## Watching for
- Cass's Death Defy decision arriving live on my desk (log line, sheet box from held to clear or filled).
- Scene 2 rolls: deal a mark for EVERY failure (Bram door -> Body; Cass lock -> Body/Bleed; Ada Read -> Brain; Dev -> Brain/Bleed). Push toward a scar for Cass or Bram.
- Pool checks: Bram Control 2 (+Nerve), Ada Read 2g (+Cunning), Cass Control 1 (+Nerve), Dev Survey 2g (+Intuition).
- Circle page: Illumination still 0/12; reports closed. Notebook sketch of the cottage (persona: once, quickly) maybe scene 2 or 3.
- Scene 3 = ferry mid-channel, turn the timer on then.

## Turn 5 (Round 2): answered scene 2, marks, spending, map, scene 3 started
- Start look (no reload): desk current. Log had Bram Control 5 Mixed (3 dice 2,5,4), Ada Read gilded 3 Failure + Learn from My Mistakes, Cass Death Defy used (held Bleed cleared), Cass Control 4 Mixed (2 dice), Dev Survey gilded 4 Mixed, Dev photo, Dev private note to Ada (LK sees it, by design). Not stale.
- Opened Cass, Bram, Ada sheets from roster; each matched what its player reported. Dealt: Cass Bleed (From an enemy UNticked: the lock's brass needle) 1 of 3; Bram Body (from enemy, the thing leaning on the door) 1 of 3; Ada Brain (failed Read, the slant reads her back) 1 of 3. Dev mixed: no mark. Roster cards now show "Marks: 1 Body" etc.
- No third mark possible this round, so no scar flow yet. NOTE: FAQ says the scar triggers when a track would reach 4 (track holds 3), README says the third mark becomes a scar: watch which the site does when someone is at 2-3 (Ada may log rules).
- Circle page: Allow spending pressed -> "opened spending: up to two each". Resources still 5/5/5. Told the table (#35).
- Notebook sketch posted: Field entry "Map: the Gullhaven estuary" (banks, channel, chain arrow, toll shed, cottage, footprints, fog), caption "The estuary at the crossing". Log: "added a sketch".
- Scene 3: tension raised from the Circle page strip to 3 of 4; clock renamed "The tide turns"; timer ON, 10:00, started 22:43 (should run out ~22:53); dispatch #3 sent, Location "Gullhaven, the ferry mid-channel as the tide turns". Pass Notes To: now shows @Circle (everyone) again.
- Narrated (table #34 outcomes, #36 scene 3). Asked: Bram Strike (break windlass; Strike 2g, Nerve 4/5), Ada Focus (next name in fare column; Focus 2g, Intuition 4/4), Cass Move (down the hatch to the bell, water coming in; Move 2, Nerve 2/3), Dev Control (ward against the counting voice; Control 2, Nerve 2).
- Findings: F066 ux med (LK sheet does not show Death Defy used), F067 praise (marks/roster/sheets match), F068 praise (scene change chain: strip, clock, timer, dispatch), F069 ux low (sketch Text Enter, 'added a sketch' no title, img 'preview').
- Oddity not logged: the dice tray count went from 2 to 1 at some point during this turn without me touching it (maybe keyboard input from the sketch or Tab). Watch whether it happens again.
- No console errors. seat.js worked; no start_all.sh.

## State now
- Marks: Cass Bleed 1, Bram Body 1, Ada Brain 1, Dev none. Scars none. Cass's Death Defy USED. Ada used Learn from My Mistakes.
- Tension 3 of 4 "The tide turns", timer running (10:00 from 22:43). Illumination 0/12, reports closed, spending OPEN, Stitch/Refresh/Train 5/5/5.

## Watching for
- Scene 3 rolls: mark every failure, two marks for a bad failure in the water (Cass is the one to push to a scar: Bleed 1). Third/fourth mark -> scar modal on the player's screen; check LK copy reads "Incapacitated: scar owed" and Revive button.
- Timer running out: what happens on desks at 0:00 (log line? sound?). Then tension to 4 of 4.
- Whether players spend Stitch/Refresh/Train and the counts/log update live on my Circle page.
- End of assignment: open reports, Illumination questions, End Assignment.

## Turn 6 (Round 3): climax on the ferry, assignment resolved, reports opened
- Start look (no reload): desk current. Log had Adrenaline Rush (Bram), Ada Focus gilded 4 Mixed, Bram Strike gilded 6 Success, Ada Stitch (marks cleared, Stitch 4/5), Cass Move 5 Mixed, Dev Great Wards on Bram + Control 6 Success, Cass Edit-sheet style line, Dev Train (Train 4/5). Timer was live (5:43). Cass's card says "changed by the player". Not stale.
- Dealt: Ada Brain (from enemy; the name in the fare column is hers) -> Brain 1/3. Cass Body (From an enemy UNticked, the water) -> 1/3.
- LK open roll 3 dice for the tide: 2,4,6 = 6, the water wins: Cass two more Body (unticked) -> Body 3/3, Bleed 1/3, still "Able to act", no scar (site scars on a 4th mark per FAQ).
- Ending narrated (table #48-51): windlass jammed, ward held, Cass cut the empty ferryman's coat from the bell, Bram hauled her out, Ada read the first fare "Absalom Hode": he is carried over. LAID TO REST. Hook: soaked fare ledger kept, Ada's own name still last in the slanting hand.
- Timer paused at 3:42 then Cleared (log lines). Tension lowered 3 -> 0 (three log lines). Clock name still "The tide turns".
- Circle page: Open reports pressed ("opened the assignment reports"). Ticked Q1 (contain source of bleed) and Q3 (brought something back: ledger). Q2 comfort NOT ticked. Card: +2 questions, keys none of 4 +0, "Not filed: all four". Did NOT press Add 2 Illumination (it is one press, once per assignment: wait for reports!).
- Told table (#52) to file reports; told Bram Cass's Champion still waits.
- Findings: F090 ux med (Add N Illumination live with 0 filed, no confirm, once only), F091 praise (scene-end chain logged), F092 ux low (3/3 track no "next mark scars" hint; handbook 3rd vs FAQ 4th), F093 ux low ("About About Reset").
- No console errors. No restart needed.

## State now
- Marks: Cass Body 3/3 + Bleed 1/3 (one more Body = scar/incapacitated), Ada Brain 1/3, Bram Body 1/3, Dev none. Scars none. Cass Death Defy used. Ada Stitch spend 1/2, Dev Train spend 1/2 (Train die held by Dev).
- Tension 0/4, timer cleared. Illumination 0/12. Reports OPEN, 0 of 4 filed. Spending open. Stitch 4/5, Refresh 5/5, Train 4/5.
- LK dice tray set to 3.

## Next / watching for
- Reports arriving live on the Circle page (cards turn, keys tally changes, "Not filed" shrinks). Read each report's back (line text).
- Then press Add N Illumination (expect 2 + keys: +2 if some, +4 if all). Check log "The Whistlers gains N Illumination (0 to N)."
- Then End Assignment (two-press): check its confirm (unadded tally warning), tray empties, timer hidden, spend counts reset, Train die kept.

## Turn 7 (Wrap): Illumination added, assignment ended
- Start look (no reload): Circle page current: all 4 reports filed, Cass's amend in ticker, Cass->Bram Champion now Agreed (all 11 relationships agreed). Total +6 shown. Not stale.
- Read report backs: Bram (Violence of Action, Protect Someone), Ada (Reference Research), Cass (Do Something Illegal, emoji line), Dev (Act Bizarre). All honest.
- Add 6 Illumination: 0 -> 6/12 (log "The Whistlers gains 6 Illumination (0 to 6)."), matches FAQ p.55 (2 questions + 4 all keys). No milestone line (no Resource Management, correct). No advance (needs 12).
- End Assignment (two-press; 'i' says "Drives carry over; a Refresh restores them."). 22:55. After: dispatch blank, tray empty, timer gone, hourglass 0 and name cleared, gear cleared on all sheets (live on open sheet), spends 0/2, ability uses reset, Train die kept on Dev, reports cleared + closed, Illumination 6 kept, resources unchanged (Stitch 4/5, Refresh 5/5, Train 4/5). Spending still OPEN (F104).
- Told the table (#55) what changed on their desks.
- Findings: F102 praise (tally + add), F103 praise (End Assignment), F104 ux low (spending stays open after End), F105 ux low (report card doesn't show amended).
- No console errors. No restart needed.

## State now
- Illumination 6/12. Tension 0/4, no clock name, timer cleared/hidden. Reports closed, empty. Spending open. Stitch 4/5, Refresh 5/5, Train 4/5. No dispatch.
- Marks: Cass Body 3/3 + Bleed 1/3; Ada Brain 1/3; Bram Body 1/3; Dev none. No scars. Ability uses all reset (Death Defy available again).
- Drives seen: Cass Nerve 1/3, Cunning 5/5, Intuition 1/1; Dev Nerve 1/2, Cunning 2/2, Intuition 4/5, Train die held. Gear: all cleared.

## Watching for
- Whether players' desks reflect the End live (gear empty, spends 0/2, ability uses back, Death Defy usable).
- Any Stitch/Refresh spends between assignments arriving on my Circle page.
- If play continues: new dispatch, gear re-selection flow for players.
