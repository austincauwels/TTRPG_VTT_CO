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

Scout (1 Intuition), Uncanny Eye (1 Intuition) and Tactician (1 Nerve) each ask the Lightkeeper one of three questions, in the rulebook's words. On the sheet the player picks the question first ("Question to ask" starts blank), then presses Use; the server refuses a use without one of the three, and spends nothing. The Activity Log names the question: "Mira used Tactician: How do I get to safety? (1 Nerve)." They have no use limit, so the choice goes back to blank after each use, and the button says "Spent 1 Nerve" for a few seconds once the server has paid.

| Ability | Questions |
|---------|-----------|
| Scout | What do I notice here that others do not see? What in this place might be of use to us? What path should we follow? |
| Uncanny Eye | How can I leverage something here to my advantage? What here doesn't work the way it appears? What is out of place here? |
| Tactician | How do I get to safety? What poses the largest immediate threat to my circle? Where is the target going to move next? |

### How does resistance work?

Each drive pool has a **resistance track** equal to `drive_max ÷ 3` (e.g., a Drive 3 pool has 1 resistance pip; Drive 6 has 2).

Burning resistance: spends 1 pip and rerolls using **only the action rating** (no drive added). Some abilities scale on how many resistance pips remain unspent (e.g., Open Book adds those pips as bonus dice on Sway).

### Can the GM roll dice?

Yes. When a GM client sends a `roll` message, no character is attached. Drive spent is interpreted directly as the pool size. GM rolls can be marked **secret**, in which case the result is only sent to the GM's connection and not broadcast to the activity log or other players.

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
3. **Cross-player intercepts:** If any *other* active character in the campaign has "Behind Me" (costs 1 Nerve current) or "Premonitions" (costs 1 Intuition resistance pip), they receive an intercept offer on their screen simultaneously.

If none of these apply (or the player declines), the mark is applied and the character sheet is updated in real time.

Since 2026-10-10 every mark that lands this way, taken on the player's own sheet or dealt by the Lightkeeper, writes a line in the Activity Log on every desk with the track's count ("Dr. Imogen Thale took a Body mark (1 of 3)."), and names the offer the player let go: "passed on Death Defy and took a Bleed mark (1 of 3)." when they pressed "Take the mark", "let Death Defy run out and took a Bleed mark (1 of 3)." when its countdown ran out. A mark an ability takes as its cost (Ritual, Occult Researcher, Back Against the Wall, Bending Spoons) is named in that ability's own line instead, so it is not logged twice.

### What happens on the 4th mark?

When any mark track would reach 4:

- **Endurance check (if applicable):** Characters with the Endurance ability roll Nd6, where N = remaining Nerve resistance pips. Any 6 prevents incapacitation — the mark stays at 3 and the character keeps acting.
- **If no Endurance or the roll fails:** Marks reset to 0 on that track, `incapacitated = true` is saved, and a `trigger_scar` event is sent to the character's screen.

### How does the scar sequence work?

The `trigger_scar` event opens the Scar Modal on the affected player's screen. The player writes their scar description and performs an **Action Point Shift**: move exactly 1 pip from any action down to 0 (minimum) into any other action up to 3 (maximum). The shift and the scar text are submitted together via `apply_scar`.

The server appends the scar text to `character.scars_list` (a JSON array) and increments `scars_count`. The Action Point Shift is applied to the two specified action columns.

After an incapacitation, **a GM can revive the character** (`revive_character` action), which clears the `incapacitated` flag and resets all three mark tracks to 0 so the character can act again.

---

## Death

### How is character death handled?

Death triggers automatically when a character's `scars_count` reaches **4** during `apply_scar`. The server sets both `is_dead = true` and `incapacitated = true`.

There is no mechanical enforcement beyond those flags — the frontend reflects the dead state visually. A GM can still manually issue `revive_character` to clear `incapacitated` (e.g., for narrative resurrection), though `is_dead` remains `true` as a permanent record. Dead characters remain in the campaign roster; they are not deleted or removed.

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

### Can a player be in multiple campaigns?

Each user can have multiple characters in multiple campaigns simultaneously. The campaign selector screen shows all of a player's characters and their associated campaigns, so they can pick which one to load into.

### How does the GM approve or reject players?

When a player submits a join request, the character appears on the GM's roster in the `pending` list. The GM can **approve** (status → `active`, character is broadcast to all active players) or **reject** (status → `unaffiliated`, character is detached from the campaign and returned to the player's unaffiliated pool).

### Can campaigns be ended?

Yes. The GM can **retire** a campaign, which sets `is_retired = true` on the Campaign record and detaches all active/pending characters (sets their `campaign_id` to null and status to `unaffiliated`). A retirement notice is broadcast via WebSocket to any connected players. Retired campaigns are excluded from the GM's campaign list but the data is not deleted.

---

## Circle Creation

### How does circle creation work?

Circle creation is a collaborative, vote-based flow between all approved players and the GM before the first assignment begins.

Players vote on:
- **Circle name** — players suggest names (`name_suggest`) and then vote on a favourite (`name_vote`). The most-voted name wins; if no name vote exists, the most-suggested name is used.
- **Circle ability** — each player votes for one from the available list.
- **Insignia** — each player votes for a visual symbol.
- **Circle question** — a backstory question the group answers together.

All votes are stored in the `CircleVote` table. When the GM finalises the circle, the server tallies each category using a simple most-votes-wins algorithm and writes the winners to the Circle record. Players each provide a personal written answer to the chosen question, stored on their own character record (`personal_circle_answer`).

Players also propose and respond to **Relationships** with other circle members (stored in the `Relationship` table), which appear as flip-cards on the Tactile Sidebar during play.

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

The illumination track is a 0–12 numeric value on the Circle. Players can increment it (the GM can also edit it directly). Every time it hits a multiple of 3 (3, 6, 9), the server fires a campaign-wide milestone notification. At 12, the track rolls over: `new_value = current - 12`, representing the circle completing a full chapter of illumination.

### What is an assignment's report worth?

By the book (p. 55): 1 Illumination for each of the circle's three Illumination questions answered yes, then for the Illumination Keys 2 if some of the investigators fulfilled one and 4 if every one of them did (nothing if none did). Since 2026-10-10 the Lightkeeper ticks the three questions once, for the circle, on their Circle page, and the players' reports carry only their keys. Under the report cards the page totals it (a living investigator with no report filed counts as no key) and adds it with one press, "Add N Illumination", once per assignment. Every change to the track is logged, such as "The Ninth Night gains 2 Illumination (3 to 5)." Before, each player's report carried the three questions too, so one yes could come in four times, nothing totalled the reports, and the playtest's circle counted keys at 1 each and advanced about 5 Illumination early.

---

## Post-Roll Abilities

### Which abilities trigger after a roll result is known?

Some abilities are offered to the player as a prompt *after* the roll result is visible:

| Ability | Trigger | Effect |
|---------|---------|--------|
| **Bending Spoons** | Any roll | Spend 1 Bleed mark to upgrade result one tier (failure→mixed, mixed→full) |
| **Flourish** | Any roll | Spend 2 Cunning drive |
| **Saw This Coming** | Failure or mixed | Re-roll with 1 additional die (up to 3 uses/assignment) |
| **Well-Read** *(auto)* | Failure using Intuition | Drive spent on the roll is automatically refunded — no prompt |
| **Gilded auto-refresh** *(auto)* | Gilded roll, pool of 1 | Drive from the matching pool is automatically refreshed — no prompt |

Auto-applying effects (Well-Read, gilded refresh) are resolved server-side immediately after the roll without requiring any player input.

---

## The Notebook

### How does the notebook work?

Each campaign has a shared field notebook. Entries are paginated and ordered by `page_number` (assigned sequentially on creation). Players and the GM can each add entries with their own pen font and ink color.

Entry types: `field_log`, `ephemeral`, `lightkeeper`, `sketch`, `photo`.

Visibility levels: `all` (everyone sees it), `gm_only` (only the GM), `self` (only the author). Images are stored as base64 data in the `image_data` column with a 2 MB size limit enforced on upload.

Entries are soft-deleted (`is_deleted = true`) rather than removed from the database, so the page numbering sequence stays intact.

## What the Lightkeeper's changes look like on the players' desks (since 2026-10-10)

- The dispatch, the tension, the timer (set, start, pause, reset, clear), the reports opening and closing, a filed or amended report and the Lightkeeper's edits of Stitch, Refresh and Train each write a line in the Activity Log. A phone shows a "new" dot on the Menu and the matching drawer row until the player has opened that part.
- A player spends a circle resource in two presses (the first asks). A spend is used for the whole circle; each player has two per assignment. The Lightkeeper can give a member one back from the member's sheet, optionally returning the resource to the circle's pool, and the log says so.
- Keeping the gilded die in a gilded roll gives one point back to the action's drive; keeping the regular die does not. The slip says what each choice does before it is made.
