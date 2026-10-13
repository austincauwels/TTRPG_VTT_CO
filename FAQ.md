# Candela Obscura VTT — Mechanics & Implementation FAQ

---

## Rolls

### How are dice rolls handled?

All rolls are resolved server-side in `engine.py: roll_dice()` using Python's `secrets.randbelow()` (cryptographically random). The result is then broadcast over WebSocket to every connected client.

**Pool size** = action rating + drive spent, capped at 6 regardless of modifiers.

| Pool | Behavior |
|------|----------|
| 0 | Rolls 2d6, takes the **lower** value |
| 1–6 | Rolls Nd6, takes the **highest** value |
| Gilded, pool 1 | Rolls 1 gilded die; **auto-refreshes** 1 drive pip from the matching pool |
| Gilded, pool 2+ | Rolls normally but pauses for a **gilded choice** — player picks between the gilded die result and the highest regular die result before the outcome is resolved. The server holds the dice until a die is kept: a desk that reloads, or the player on another device, is shown the same choice again |

**Outcomes** (based on highest or chosen value):
- **Critical Success** — two or more dice show 6
- **Full Success** — result is 6
- **Mixed Success** — result is 4 or 5
- **Failure** — result is 1–3

### How are ability roll modifiers (mods) handled?

The frontend calculates which mods are *available* for the pending roll (based on the character's `role_ability` and `specialty_ability`) and sends the list of selected mod names with the roll message. The backend then **re-validates** every mod server-side before applying it — a mod is rejected if the character doesn't actually have that ability, or if the action doesn't match the mod's allowed action list.

Mod effects that can be stacked:

| Effect | Example abilities |
|--------|-------------------|
| Extra dice added to pool | Sharpshooter (+2 on Strike), Misdirection (+1 on Hide) |
| Gild the action (even if not gilded) | Lie Detector (Read), Inspection (Survey), Tenacious (Nerve actions) |
| Conditional gild | Sweet Talk (Read, if 2+ Cunning resistance remain) |
| Extra dice = resistance pips remaining | Open Book (Sway), Interrogation (Read), Extend Your Senses (Sense) |
| Drive substitution | Cool Under Pressure (Cunning instead of normal pool), Practiced Patter (Intuition on Sway/Hide) |
| Cost: take 1 Brain mark | Back Against the Wall (any action) |

The final pool is `min(6, action_rating + drive_spent + extra_dice)`.

### Are there per-assignment use limits on abilities?

Yes. The server tracks uses in `character.ability_uses` (a JSON dict). Limits:

| Ability | Uses per assignment |
|---------|---------------------|
| Death Defy | 1 |
| I Know a Guy | 1 |
| Field Experience | 1 |
| Not Again | 1 |
| In the Trenches | 1 |
| Steel Mind | 1 |
| Compartmentalization | 1 |
| Saw This Coming | 3 |

All use counts are reset to `{}` for every active character when the GM fires **End Assignment** (`gm_end_assignment`).

### How are the question abilities used?

Scout (1 Intuition), Uncanny Eye (1 Intuition) and Tactician (1 Nerve) each ask the Lightkeeper a question. Since 2026-10-13 (issue #63) it is any question the player writes: the rulebook's three are examples, not a list to choose from. On the sheet the player writes the question in the "Question to ask" box (up to 200 characters), or taps one of the book's questions shown under the empty box to fill it in, then presses Use; the server refuses a use with no question, and spends nothing. The Activity Log names the question as written, on one line: "Mira used Tactician: Where would the creature go to ground? (1 Nerve)." They have no use limit, so the box empties after each use, and a line after the button says "Spent 1 Nerve" for a few seconds once the server has paid. Until then the sheet offered only the three questions, in a select.

| Ability | The book's questions (examples) |
|---------|-----------|
| Scout | What do I notice here that others do not see? What in this place might be of use to us? What path should we follow? |
| Uncanny Eye | How can I leverage something here to my advantage? What here doesn't work the way it appears? What is out of place here? |
| Tactician | How do I get to safety? What poses the largest immediate threat to my circle? Where is the target going to move next? |

### How does resistance work?

Each drive pool has a **resistance track** equal to `drive_max ÷ 3` (e.g., a Drive 3 pool has 1 resistance pip; Drive 6 has 2).

Burning resistance: spends 1 pip and rerolls using **only the action rating** (no drive added). Some abilities scale on how many resistance pips remain unspent (e.g., Open Book adds those pips as bonus dice on Sway).

A burn answers your own last roll, until the table moves past it: another roll at the table whose dice everyone sees (the Lightkeeper's open roll too, and a gilded roll once its die is kept), or End Assignment. A secret roll does not. A gilded roll of yours whose die you keep after someone else's roll can still be burned on, until the next roll at the table or End Assignment. A gilded roll whose die is still to be kept when the Lightkeeper ends the assignment is scored when you keep it, but cannot be burned on. A desk that was away while your roll was settled is told so when it reconnects, and offers no burn for it.

Your last roll stays in your tray over a reload, or when you open your desk on another device (since 2026-10-13, issue #40): the same dice and the outcome as it stands now, with Burn and reroll while the table has not moved past it. It plays no dice sound and does not tumble in again, and on a phone the roll bar does not pop up for it (the dice button's dot says when a choice is waiting, a hollow one when only an optional burn is left; after End Assignment the tray starts empty). Abilities already used on it are not offered again. After a server restart the tray starts empty, since the server no longer holds the roll and would refuse a burn on it. The Lightkeeper's felt comes back too when she reloads: the newest roll on it, her own (secret or not) or the last player's roll the table saw, with its outcome as it stands now and no dice sound.

When Flourish or Bending Spoons changes a roll's outcome, the result slip shows the new outcome (since 2026-10-13, issue #19; it used to keep the old one): on your tray and on the Lightkeeper's, unless the roll was secret, when only your own desk is told.

### Can the GM roll dice?

Yes. When a GM client sends a `roll` message, no character is attached. Drive spent is interpreted directly as the pool size. GM rolls can be marked **secret**, in which case the result and its log line go to the Lightkeeper's own desk only, never to the players. Her result slip reads "Secret: only you saw this" and her own log keeps the line, "(Secret) Lightkeeper rolled a 4: Mixed success (2 dice: 1, 4)." (every roll line names its dice, since a tray shows only its owner's rolls), so the result is still on her desk after a player's roll takes the felt (since 2026-10-10; before that a secret roll wrote no line at all). The line goes to her channel alone and is kept only in her channel's history: no player's desk gets it, live, on a reload or on a first visit. It plays no result sound.

---

## Group Rolls

### Are group rolls supported?

**No.** Group rolls are not part of this VTT. Each player rolls individually using their own action rating and drive.

---

## Circle Abilities

### Are circle abilities mechanically integrated?

**Not in the way role/specialty abilities are.** Circle abilities (e.g., "The Hollow" or "Sight Beyond") are voted on during circle creation and stored as a plain string on the Circle record. They are displayed as static flavour text on the Circle tab — no server-side logic checks or applies them automatically.

Role and specialty abilities (e.g., Well-Read, Behind Me, Sharpshooter) are actively checked during rolls and mark events. Circle abilities are not.

The illumination track, Stitch, Refresh, and Train resources *are* tracked numerically and can be incremented/decremented by players (with GM permission controls).

---

## Marks, Scars, and Incapacitation

### How are marks applied?

Characters have three mark tracks: **Body**, **Brain**, and **Bleed** (0–3 each). When a mark event fires, the server checks for any abilities that could interrupt the mark *before* applying it:

1. **Soak offers (self):** Compartmentalization (Brain, costs Nerve resistance), Steel Mind (Brain, costs Intuition resistance), In the Trenches (Body, costs Cunning resistance). If an offer is available, a popup is sent to the player first; the mark is only applied if they decline.
2. **Death Defy:** If the mark comes from an enemy (`is_from_enemy: true`) and the character has this ability with a use remaining, they can escape the mark entirely (1 use/assignment).
3. **Cross-player intercepts:** If any *other* active character in the campaign has "Behind Me" (costs 1 Nerve current) or "Premonitions" (costs 1 Intuition resistance pip), they receive an intercept offer on their screen simultaneously. The first ally to answer takes the mark, and the other allies' offers for it close. An offer stays open for two minutes and comes back, with the time left, if the ally's page reloads in that time. Since 2026-10-12 (playtest 3, behind-me-offer-unseen) the Activity Log of the Lightkeeper and of each ally offered says who was offered what ("Bram Okafor is offered Behind Me for Ada Quill's Brain mark (2 minutes)."), and, if nobody used it in the two minutes, that the offer lapsed ("Bram Okafor's Behind Me offer for Ada Quill's Brain mark lapsed unused."; an ally's Not now only closes the card on their own desk, so the server cannot tell a declined offer from one not seen). The other players' logs get neither line. A Doctor's Non-Combatant drive point, offered to each ally for the same two minutes when the Doctor takes a mark, is logged the same way: "Bram Okafor is offered a Non-Combatant drive point from Ada Quill's Brain mark (2 minutes)." and, if not taken, "Bram Okafor's Non-Combatant drive point from Ada Quill's Brain mark lapsed unused."

If none of these apply (or the player declines), the mark is applied and the character sheet is updated in real time.

A mark held for a soak or Death Defy is stored with its offer, so a server restart (a deploy) keeps it: the desk gets the same offer again when it reconnects, and the Lightkeeper's copy of the sheet draws it held. An answer to an offer the server no longer holds lands nothing, and the card closes. The allies' offers (Behind Me, Premonitions, Non-Combatant's drive point) and Adrenaline Rush are not stored: after a restart they are gone, and an answer to one is refused as too late. A mark sent from the sheet and not yet answered is kept by the browser over a reload and sent again once the desk reconnects, taken once; one taken more than ten minutes before the reload is let go with a note under the marks, and so are the kept marks when another desk is opened first, the note naming whose they were. The Activity Log is stored too (each campaign's last 500 lines), so a restart empties no desk's log.

Since 2026-10-10 every mark that lands this way, taken on the player's own sheet or dealt by the Lightkeeper, writes one line in the Activity Log on every desk with the track's count ("Dr. Imogen Thale took a Body mark (1 of 3)."; a mark the Lightkeeper dealt that lands at once reads "The Lightkeeper dealt Dr. Imogen Thale a Body mark (1 of 3)."), and names the offer the player let go: "passed on Death Defy and took a Bleed mark (1 of 3)." when they pressed "Take the mark", "let Death Defy run out and took a Bleed mark (1 of 3)." when its countdown ran out. A mark an ability takes as its cost (Ritual, Occult Researcher, Back Against the Wall, Bending Spoons) is named in that ability's own line instead, so it is not logged twice.

### What happens on the 4th mark?

When any mark track would reach 4:

- **Endurance check (if applicable):** Characters with the Endurance ability roll Nd6, where N = remaining Nerve resistance pips. Any 6 prevents incapacitation — the mark stays at 3 and the character keeps acting.
- **If no Endurance or the roll fails:** Marks reset to 0 on that track, `incapacitated = true` is saved, and a `trigger_scar` event is sent to the character's screen.

### How does the scar sequence work?

The `trigger_scar` event opens the Scar Modal on the affected player's screen. The player writes their scar description and performs an **Action Point Shift**: move exactly 1 pip from any action down to 0 (minimum) into any other action up to 3 (maximum). The shift and the scar text are submitted together via `apply_scar`.

The server appends the scar text to `character.scars_list` (a JSON array) and increments `scars_count`. The Action Point Shift is applied to the two specified action columns.

While a scar is owed, the sheet carries `scar_pending` (the Lightkeeper's copy reads "Incapacitated: scar owed"), and recording it writes "<name> recorded a scar (n of 4)." to the table's log. The fourth scar asks for no action shift and cannot be put off with Decide later. After an incapacitation, **a GM can revive the character** (`revive_character` action, the Revive button on the Lightkeeper's copy of the sheet), which clears the `incapacitated` flag so the character can act again (a revive for someone already able to act does nothing, so a double press is one revive). The track that overfilled was already cleared when the scar was taken; the other tracks keep their marks.

---

## Death

### How is character death handled?

Death triggers automatically when a character's `scars_count` reaches **4** during `apply_scar`. The server sets both `is_dead = true` and `incapacitated = true`.

Once dead, the sheet is a record: the server refuses the dead investigator's own `roll`, `take_mark`, `update_gear`, `update_drive`, `edit_sheet`, `spend_resource`, `use_ability`, advancement, relationship proposals, a fifth scar and the rest of the sheet's actions (409, "<name> is dead: the sheet is a record."), a proposal to the dead from a living member, and a counter from or to the dead (a counter proposes new terms), over the WebSocket or `POST /circle/relationship/propose` and `/respond` (same 409; since fix round 6, issue #38), and the Lightkeeper's Deal a mark, and the desk shows the controls off: no ability Use, no Burn and reroll or post-roll ability. On a living player's Circle page the dead investigator's relationship paper is stamped Dead and offers no Propose and no Counter (a relationship agreed or proposed before the death still shows, and one still waiting can be accepted). A gilded roll made in life whose die is still to be kept when the fourth scar comes can still be kept (it is scored and logged, with no drive back), and a soak or Death Defy offer open at the death closes, its mark not taken. Chat, the notebook and Create a new investigator stay. The death is logged to every desk, the Lightkeeper's included ("<name> is deceased: a fourth scar."). A GM can still issue `revive_character` to clear `incapacitated` (e.g., for narrative resurrection), though `is_dead` remains `true` as a permanent record. The Lightkeeper's copy of an incapacitated investigator's sheet has a Revive button beside the status stamp. Dead characters remain in the campaign roster until their player's new investigator is approved; then the dead one is retired and stays on the Lightkeeper's desk as a Fallen card (a record, which does not open) and as a line in Circle History. The player's Registry on the hub keeps it too, in a Fallen section at its foot with the campaign's name (since fix round 6, issue #47), with no Play, Leave or Delete; so does a dead investigator left with a retired campaign. The Lightkeeper's roster cards show each living investigator's state at a glance: incapacitated, marks, scars and advancements waiting.

---

## Accounts, Characters, and Campaigns

### Can a player have multiple characters?

Yes. A user account can have any number of characters. Characters have one of three statuses:

| Status | Meaning |
|--------|---------|
| `unaffiliated` | Created but not attached to any campaign |
| `pending` | Join request submitted, waiting for GM approval |
| `active` | GM-approved member of a campaign |

A character is bound to exactly one campaign at a time. A user could theoretically have one character per campaign they participate in.

### Can a player change their investigator after creation?

Yes, everything, at any time (issue #64; detection, not prevention). The player's own sheet has Edit sheet: name, pronouns, role and specialty, abilities, action ratings and gilds, each drive's maximum, amount and resistance, the marks, the scars (up to three: the fourth is fatal and comes through the scar form) and the style, catalyst and question. Each box shows its maximum and an ability outside the role or specialty gets a soft warning; nothing is refused for the rules, only values the sheet cannot hold (a rating above 3, a drive above 9, an unknown ability). Change Gear works the same way: marked gear can be taken off, One Step Ahead's object too, and more items than the gear slots go on with a warning. A drive pip set by hand counts as such an edit.

Each edit writes one line in the table's Activity Log, the Lightkeeper's and every player's, naming the investigator and every change from what to what ("Mara: Nerve maximum 5 to 6, gear Lantern removed, Revolver added."). The Lightkeeper's business card for that investigator carries a red dot until the Lightkeeper opens the sheet. Rolls, spends, marks taken, scars recorded, abilities used and advancements keep their own lines and put no dot. The Lightkeeper's own corrections (trauma record Edit, drive pips on her copy, a gear correction) keep the table's line and put no dot. A pending or unaffiliated investigator can be edited too; its line goes to the player alone, as there is no Lightkeeper to tell yet. A dead investigator's sheet stays a record.

### Can a player be in multiple campaigns?

Each user can have multiple characters in multiple campaigns simultaneously. The campaign selector screen shows all of a player's characters and their associated campaigns, so they can pick which one to load into.

### How does the GM approve or reject players?

When a player submits a join request, the character appears on the GM's roster in the `pending` list. The GM can **approve** (status → `active`, character is broadcast to all active players) or **reject** (status → `unaffiliated`, character is detached from the campaign and returned to the player's unaffiliated pool).

On the Lightkeeper's desk the requests are on the Requests page (a tab, or Join requests in the phone's drawer), whose count says how many wait, with Invite player under them. A request the Lightkeeper has not been shown pops up at the foot of the screen with Approve, View sheet and Reject, and Later to put it away; it pops up once per browser, so one that came while the desk was closed pops up when it opens.

### Can an approved investigator leave, or be taken off the roster?

Yes, at any time, before or after the seal (`POST /campaign/release/{id}`). The Lightkeeper releases a member from the foot of that member's sheet, and a player leaves from the foot of their sheet on the desk or from the investigator's row in the hub's registry; both are two-press confirms that say what will happen: the armed line is one short sentence ("Press again to leave The Ghost Hours.", "Press again to release Ada Quill."), and what goes with the investigator (votes, relationships, the report, the resources and any Train die) is behind its "i", "What leaving does" or "What release does" (since 2026-10-13, issue #62). The investigator goes back to its player as `unaffiliated` (it is kept, so old log lines, notebook entries and the Circle History still read) and can join this or another campaign by the normal join flow. Its assignment ends as at Retire: its spend count, ability uses, gear and any Train dice it held are cleared. Its circle votes, its relationships (agreed and proposed, at both ends) and its report for the current assignment are dropped, so the "N of M filed" count and the key tally count only the members left. Each resource's maximum is 1 plus the members again: after the seal any of Stitch, Refresh and Train above it is lowered to it, nothing is refunded and nothing goes up; before the seal all three fill to it, as an approval fills them. Every desk is told live, and the Activity Log says "The Lightkeeper released <name> from the circle." or "<name> left the circle." (no reason shown). A dead investigator cannot be released: it stays with the campaign.

### Can campaigns be ended?

Yes. The GM can **retire** a campaign, which sets `is_retired = true` on the Campaign record and detaches all living active/pending characters (sets their `campaign_id` to null and status to `unaffiliated`, so their players can use them in another campaign; a dead one stays `retired` with the campaign). A retirement notice is broadcast via WebSocket to any connected players, and a hub reads its lists again when the tab comes back or the Case Ledger opens. Play on a Registry row, and the Last Played tome, read them again before they open a desk (since fix round 6, issue #42): an investigator no longer active in that campaign opens none, the hub says "<name> is no longer in <campaign>.", the book shows the lists as they are now and the tome lets the campaign go. While the lists are read the pressed row (or the tome's head) says Opening, and a second press, or Leave on that row, waits; closing the book meanwhile drops the press. Retired campaigns are excluded from the GM's campaign list but the data is not deleted: they lie in the Lightkeeper Ledger's Retired list, where Restore (`POST /campaign/{id}/unretire`, the campaign's Lightkeeper only) brings one back. It comes back with its dead (still `retired` with it, the desk's Fallen cards) and takes members again, but puts no living investigator back on its roster: the ones the retire let go stay with their players, and one that has joined another campaign since stays there. The Lightkeeper's open desks read the ledger again, and the campaign's Activity Log says "The Lightkeeper brought <name> back from retirement."

---

## Circle Creation

### How does circle creation work?

Circle creation is a collaborative, vote-based flow between all approved players and the GM before the first assignment begins.

Players vote on:
- **Circle name** — players suggest names (`name_suggest`) and then vote on a favourite (`name_vote`). The most-voted name wins; if no name vote exists, the most-suggested name is used.
- **Circle ability** — each player votes for one from the available list.
- **Insignia**: each player votes for a visual symbol. After the seal the Lightkeeper can change it on the Circle page by clicking the insignia (one of the same eight), as a player changes their portrait; the Activity Log says so.
- **Circle question** — a backstory question the group answers together.

All votes are stored in the `CircleVote` table. When the GM finalises the circle, the server tallies each category using a simple most-votes-wins algorithm and writes the winners to the Circle record. Players each provide a personal written answer to the chosen question, stored on their own character record (`personal_circle_answer`).

Players also propose and respond to **Relationships** with other circle members (stored in the `Relationship` table), which appear as flip-cards on the Tactile Sidebar during play.

A tie goes to the option voted for first, on every desk and at the seal. The formation papers open on a player's desk as soon as the Lightkeeper approves their investigator, and close for everyone when the Lightkeeper finalizes the circle.

### What does the Lightkeeper see while the circle forms?

Since 2026-10-10 the Lightkeeper's desk shows the formation papers as they stand, open until the seal (they fold with a press): whose desks they are open on, then each part in the papers' order. The circle question that leads, with its words; the name the seal would take (the name voted for most, or with no votes the name suggested most); the chapter house as written; the circle ability; the insignia, drawn; and the relationships, confirmed out of proposed, with who still has one to answer. A tie names the options tied and says the first voted for wins. Under each vote, every investigator has a tick once they have voted (or answered the question, or proposed a relationship) and an open ring until then. The chapter house has no ticks: any member may write it, and the server keeps the answer but not who wrote it. All of it comes from the circle creation state every member is sent, loaded again whenever the desk reconnects; nothing private to a player is added.

### What happens to relationships still waiting at the seal?

Nothing: finalizing leaves them as they are, and the player whose turn it is can still accept or counter them on the Circle tab afterwards. The Lightkeeper sees them too, read only, on the Circle page's Circle Relationships paper (who to whom, the type and lore, agreed or "waiting for <name>"). The Finalize slip counts them ("2 relationships still waiting; they can be accepted after the seal.") and reads "4 in the circle (up to 5)". Its second press is one sentence that also says any join request still waiting is turned away, since finalizing releases those characters, and names any part with nothing chosen (no question, insignia, ability or name voted or suggested), since the seal then leaves it empty; with three or more such parts it counts them instead ("leaving 4 parts empty"), so the sentence stays short.

---

## Advancement

### How does character advancement work?

Advancement is applied via `apply_advancement`. There are four options:

| Choice | Effect |
|--------|--------|
| `add_action` | +1 to a chosen action rating (max 3) |
| `add_drive` | +2 to a drive pool's max *and* current value |
| `new_ability` | Appends a new ability name to `specialty_ability` (semicolon-separated if multiple) |
| `gild_action` | Sets `gilded_{action} = true` on a chosen action |

Advancement is not gated by any point system in the VTT — it's applied whenever the GM or narrative calls for it.

---

## The Illumination Track

### How does the illumination track work?

The illumination track is a 0–12 numeric value on the Circle. Players can increment it (the GM can also edit it directly). Its milestones are 3, 6 and 9. Since 2026-10-13 (fix round 7) a milestone is named in the log only for a circle with Resource Management, in the one line that says what it earns back; before, every desk got a separate "milestone reached" line at each one, with or without it. At 12, the track rolls over: `new_value = current - 12`, representing the circle completing a full chapter of illumination.

### How do the circle's resources come back?

On their own, by the book (p. 41). A new circle starts with 1 plus its members in each of Stitch, Refresh and Train (since 2026-10-13 also when its desk was first opened after members were approved: it used to start at 1 each until the seal). Spent resources do not come back after an assignment: when the circle advances on a full Illumination track, each refills to 1 plus the members. There is no Refill button (Robert's issue #66.4, 2026-10-13). A circle with Resource Management earns one back at each milestone (3, 6 and 9): the change's one Resource Management log line names the milestone and says so (a circle without it logs no milestone line), the Lightkeeper's circle page, right under Add Illumination (and on a wide desk the charter abstract), asks "Resource Management: earn back one" with Stitch, Refresh and Train, and one press applies the circle's choice and logs it ("Resource Management: The Moths earns back a Stitch (2 of 4)."). A full resource cannot be picked; with every resource full when the milestone passes there is nothing to earn back, and the log says that instead. Several milestones passed at once wait as several only while that many points are missing: with one point missing a tally passing 3 and 6 earns one, and the one line says the rest have nowhere to go. A waiting earn-back never outlasts the points it is for: a correction, a spend given back or a member leaving that fills them takes it away, so none is banked for a later spend. Taking the track back past a milestone (a point added by mistake) takes its earn-back away while one waits (an applied one stays counted, and the milestone is not counted again on the way up; a milestone that earned nothing, every resource full, is not counted, so after a correction back past it the real rise earns it), and the advance's refill clears any still waiting. The players' circle page says when one waits. The Lightkeeper's squares on each resource stay for corrections, and each press writes a log line ("The Lightkeeper set the circle's Train to 3 (was 2).").

### What is an assignment's report worth?

By the book (p. 55): 1 Illumination for each of the circle's three Illumination questions answered yes, then for the Illumination Keys 2 if some of the investigators fulfilled one and 4 if every one of them did (nothing if none did). Since 2026-10-10 the Lightkeeper ticks the three questions once, for the circle, on their Circle page, and the players' reports carry only their keys. Since 2026-10-13 (Robert's issue #66.5) the page says what the questions are for, "Answered together at the end of an assignment: each yes adds 1 Illumination.", and the keys line says what they are and why they are worth what they are now: "Illumination Keys on the reports: 1 of 3 fulfilled one (some, not all)" with +2 beside it ("all 3 fulfilled one" +4, "none of 3 fulfilled one" +0, "no investigators to report yet" with no members); the full rule, with a specialty's keys as an example, is behind the "i" on "Illumination Keys". Under the report cards the page totals it (a living investigator with no report filed counts as no key) and adds it with one press, "Add N Illumination", once per assignment. The ticks and the added total are kept on the circle, so every Lightkeeper desk (another tab, another device) shows them and "Added N Illumination" once it is pressed; the server refuses a second add. End Assignment clears the reports and the tally, and its confirm warns when the reports' Illumination is not added yet, since it would be lost. Since 2026-10-12 (playtest 3, missing-report-silent) both name the living investigators who have not filed a report, "Not filed: Ada Quill.", once reports are due (the Lightkeeper has opened them, or someone has filed): over the Add N Illumination button until the tally is added, and in End Assignment's confirm. Before reports are due neither names anyone. Neither waits for them, and a report not filed still counts as no key. Every change to the track is logged, such as "The Ninth Night gains 2 Illumination (3 to 5)." Before, each player's report carried the three questions too, so one yes could come in four times, nothing totalled the reports, and the playtest's circle counted keys at 1 each and advanced about 5 Illumination early.

### What goes on an assignment report?

The investigator's Illumination Keys, each ticked or not, and since 2026-10-12 (playtest 3, report-text-line) an optional line on what happened, up to 280 characters, which the server enforces. The Lightkeeper reads the line on the back of that player's report card on their Circle page. An amended report replaces the line with whatever it carries, so sending it with the line emptied removes it. Like the keys, the line goes to the Lightkeeper and its author only, and End Assignment clears it with the report.

---

## Post-Roll Abilities

### Which abilities trigger after a roll result is known?

Some abilities are offered to the player as a prompt *after* the roll result is visible:

| Ability | Trigger | Effect |
|---------|---------|--------|
| **Bending Spoons** | Any roll | Spend 1 Bleed mark to upgrade result one tier (failure→mixed, mixed→full) |
| **Flourish** | Any roll | Spend 2 Cunning drive |
| **Saw This Coming** | Failure or mixed | Re-roll with 1 additional die (up to 3 uses/assignment) |
| **Well-Read** *(auto)* | Failure using Intuition | Drive spent on the roll is automatically refunded, with no prompt (never past the maximum: when a kept gilded die has already given a point back, the log names only what Well-Read gave, and nothing when the drive was full) |
| **Gilded auto-refresh** *(auto)* | Gilded roll, pool of 1 | Drive from the matching pool is automatically refreshed, no prompt (nothing comes back, and the log says nothing, when the drive is already full) |

Auto-applying effects (Well-Read, gilded refresh) are resolved server-side immediately after the roll without requiring any player input.

---

## The Notebook

### How does the notebook work?

Each campaign has a shared field notebook. Entries are paginated and ordered by `page_number` (assigned sequentially on creation). Players and the GM can each add entries with their own pen font and ink color. The Lightkeeper's entries are signed "The Lightkeeper" for everyone (byline, author filter, log lines); players never see her login name.

Entry types: `field_log`, `ephemeral`, `lightkeeper`, `sketch`, `photo`.

Visibility levels: `all` (everyone sees it), `gm_only` (only the GM), `self` (only the author). Images are stored as base64 data in the `image_data` column with a 2 MB size limit enforced on upload.

Entries are soft-deleted (`is_deleted = true`) rather than removed from the database, so the page numbering sequence stays intact.

Nothing reaches the server until it is pinned or added. Until then a private note and a field entry's title and text are kept in the browser's `localStorage` under the account, the campaign and the seat (`candela-notebook-draft:<user id>:<campaign id>:<character id, or lightkeeper>`), so leaving the notebook or reloading keeps them, and pinning or adding clears them, even when the notebook was left before the server answered. An explicit Sign out clears that account's Notebook drafts and its creator draft from the browser (issue #20, fix round 6); a session the server ends (it expired or was revoked) and the sign-out a password reset or an undone email change brings keep them, so the writer finds them after signing in again. Where the browser refuses storage (a private window, a full or blocked store), the writing is kept in the open page instead: leaving the notebook keeps it, a reload does not. A picture staged for an entry waits in the open page only (DESIGN.md, Notes in Markdown).

### Who reads a passed note?

A player's To: list offers @Circle, @Lightkeeper only and the other investigators (not the sender). A private note to an investigator is shown to the Lightkeeper too, and its label says so; a note to @Lightkeeper alone reaches no other player. The server reads @Lightkeeper as the Lightkeeper alone, even when an investigator is named Lightkeeper; nothing stops that name, but the To: list leaves such an investigator out, so no private note can be passed to them.

## What the Lightkeeper's changes look like on the players' desks (since 2026-10-10)

- The dispatch (with its location, "sent a dispatch: Docks."), the tension, the timer (set, start, pause, reset, clear), the reports opening and closing, spending opened or locked ("opened spending: up to two each."), the circle renamed, the insignia changed, the seal (name, ability and insignia), each approval and each decline of a join request (the decline names the character, never a reason), a filed or amended report and the Lightkeeper's edits of Stitch, Refresh and Train each write a line in the Activity Log. A phone shows a "new" dot on the Menu and the matching drawer row until the player has opened that part.
- A player spends a circle resource in two presses (the first asks, and keeps asking until the player presses elsewhere, presses Escape or moves focus away). A spend is used for the whole circle; each player may spend up to two each assignment, whenever the Lightkeeper opens spending, and the count starts again when the assignment ends; a replacement investigator keeps the count of the one it replaces, whether it came by a rejoin or by a join request the Lightkeeper approved (the second since fix round 6, issue #41). A Train is a d6 to add to any roll the player chooses, kept until a roll uses it: End Assignment does not clear it (retiring the campaign does, for each investigator it lets go, and so does a release or a leave). The Lightkeeper can give a member one back from the member's sheet, optionally returning the resource to the circle's pool (never past its maximum; a full resource cannot be picked), and the log says so. One press gives one back.
- An unsent dispatch (location, text) is kept while the Lightkeeper visits Map, Notebook or Circle, until the page is reloaded; if another dispatch arrives meanwhile, the letter shows that one instead.
- Reset empties the timer's screen-reader status, so the next start and run-out are announced again.
- Keeping the gilded die in a gilded roll gives one point back to the action's drive; keeping the regular die does not. The slip says what each choice does before it is made.

Fix round 7 (dice): after End Assignment the dice tray starts empty, and the Lightkeeper's timer is cleared and hidden (the Timer switch is off; End Assignment's "i" and its receipt say so). The hub marks an investigator the Lightkeeper let in with "Let in: press Play" until Play is pressed; the mark is kept over a reload, and an approval that came while the hub was closed is marked too, in a browser that saw the request waiting. Private pass notes are marked "Private". Learn from My Mistakes is offered only when a drive is short.
