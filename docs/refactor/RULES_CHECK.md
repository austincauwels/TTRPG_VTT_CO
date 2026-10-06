# Rules check: where the app may differ from the rulebook (2026-10-04)

This list compares the app's game mechanics with the Candela Obscura Core Rulebook. It was written before any of them changed. On 2026-10-06 the suggested fixes were made on the branch claude/nice-franklin-fjdpgh, each in its own commit with its tests, and each item says what was done in a "Done" line. Some differences may be house rules: the game's owner can drop any of those commits before the branch is merged. Page numbers are the printed page numbers of the rulebook. Code references are to backend/ unless a path says otherwise.

Each entry gives what the app does, what the rulebook says, and a suggested fix.

## Action names

The code uses different names for two actions. The code's `sneak` is the rulebook's Read (a Cunning action), and the code's `read` is the rulebook's Focus (an Intuition action) (p. 50 and 51). The character creator and the circle view label them Read and Focus, but `frontend/src/components/pc/ActionModule.jsx` still shows the label "Sneak". This document uses the rulebook names, with the code name in brackets where it matters.

- Suggested fix: show "Read" in ActionModule.jsx too. Renaming the columns is not needed.
- Done (2026-10-06): ActionModule.jsx was never imported and is removed; every screen players see labels the actions Read and Focus.

## Rolls

### 1. A zero-rating roll can be a critical success

- App: with no dice in the pool, `engine.roll_dice` rolls two dice and takes the lower one, then `calculate_outcome` counts two sixes as a critical success.
- Rulebook (p. 11): a zero-rating roll takes the lowest of two dice, and "you can't get a critical success on this (even if you get two 6s)." The GM reference repeats it (p. 198).
- Suggested fix: in the zero branch of `roll_dice`, call `calculate_outcome(result_val)` without the dice, so two sixes give a full success. This also covers a resistance reroll of a zero-rating action (p. 13).
- Done (2026-10-06): the zero branch takes its outcome from the lower die alone, so two sixes are a full success. A resistance reroll of a zero-rating action follows the same rule.

### 2. A gilded die on a zero-rating roll never earns back drive

- App: the zero branch marks the first die as gilded but never refreshes drive.
- Rulebook (p. 11): you cannot choose the gilded die as your result, but if it is the lowest die (the result), you still earn back drive.
- Suggested fix: in the zero branch, when the gilded die's value equals the result, set `auto_gilded_refresh` so the roll handler refreshes 1 point in the action's drive.
- Done (2026-10-06): when the gilded die is the lower die (equal values included), the roll carries auto_gilded_refresh and the action's drive gets 1 point back.

### 3. A roll where the player chooses between the gilded die and the highest die can never be critical

- App: `resolve_gilded` calls `calculate_outcome(chosen_value)` without the dice, so two sixes are never a critical success on a gilded action with two or more dice.
- Rulebook (p. 10): "On multiple 6s, the roll is a critical success." Taking the gilded die is a choice of result, so a chosen 6 with another 6 in the pool is still multiple sixes.
- Suggested fix: when the chosen value is 6, count the sixes in the rolled dice. The server would need to keep the dice it rolled (it currently trusts the client's `chosen_value`, see QUIRKS.md bug D8), which also stops a replayed or invented result.
- Done (2026-10-06): the server keeps the dice of a roll waiting for a choice (_pending_gilded in vtt/ws/handlers/rolls.py) and reads the kept die from them; chosen_value is ignored. A kept 6 among two or more 6s is a critical success. A choice with no roll waiting, a second choice, or a choice after a server restart is refused (action_rejected 409) and the desk says to roll again. This also closes QUIRKS.md D8.

### 4. Only one die can ever be gilded

- App: `roll_dice` gilds at most the first die. An ability that gilds a die (`extra_gild`) on an action that is already gilded changes nothing.
- Rulebook: several abilities "gild an additional die", for example Inspection (p. 31), Born in the Shadows (p. 31), Lie Detector (p. 28), Tenacious (p. 29) and Dissection (p. 30). With a gilded action that means two gilded dice.
- Suggested fix: count gilded dice (gilded action plus one per gilding ability, capped by the pool) and let the player choose any gilded die. Only one point of drive is refreshed per roll either way, since only one die is taken as the result.
- Done (2026-10-06): each gild adds a gilded die (the action's own plus one per gilding ability), up to the pool. The choice offers the best gilded die and the best regular die; when every die is gilded the best one counts and refreshes drive.

### 5. Drive can be spent past the Rule of Six and past what the character has

- App: the roll handler takes the whole `drive_spent` from the drive (floored at 0) but caps the pool at 6. A player can spend more than they have and still get every die, and drive spent past six dice is lost. A negative `drive_spent` used to raise the drive (QUIRKS.md D15); since 2026-10-06 it is refused with 422, and the rest of this item is unchanged.
- Rulebook (p. 8): "When your drive is empty, you cannot spend any more points." The Rule of Six (p. 11) caps any roll at six dice.
- Suggested fix: refuse a spend that is negative or larger than the current drive, and cap the spend at what fits under six dice.
- Done (2026-10-06): a spend larger than the drive holds (with any cost from the same drive, such as Sharpshooter's Nerve) is refused (422, "Not enough Nerve for that roll."). Only the drive points that fit under six dice are taken, after the free dice (rating, ability dice, Train): spending 5 on a rating of 3 takes 3.

### 6. Gilded refresh and Well-Read are skipped on some rolls

- App: on a secret roll (`is_secret`) neither the single gilded die refresh nor the Well-Read refund happens (QUIRKS.md D7). Well-Read is also never checked on a roll resolved through `resolve_gilded`.
- Rulebook: taking the gilded result refreshes 1 drive point (p. 8), and Well-Read refunds spent Intuition on a result of 3 or less (p. 27). Neither depends on whether the roll is shown to others.
- Suggested fix: apply both on secret rolls (without the public log line) and apply Well-Read in `resolve_gilded` when the chosen value is 3 or less and Intuition was spent.
- Done (2026-10-06): a secret roll applies the gilded refresh and Well-Read and only keeps its log line to itself; resolve_gilded checks Well-Read on the kept die, and a secret roll's choice no longer reaches the table's log.

### 7. The Lightkeeper's roll

- App: a GM socket with no character makes a "Lightkeeper" roll where `drive_spent` is the pool size, with the same outcome tiers and criticals as a player roll.
- Rulebook: action rolls are made by players when the GM calls for them (p. 10); the GM's own dice mechanic is countdown dice (p. 166). No GM action roll is described.
- Suggested fix: likely a deliberate house feature. Confirm it is wanted; no change otherwise.

## Resistance

### 8. The client picks which drive's resistance to burn

- App: `burn_resistance` takes `drive_key` from the client and accepts any drive for any action. It also does not check that there was a roll to resist.
- Rulebook (p. 13): you burn "1 resistance point from the drive related to that action", then reroll a number of dice equal to the action rating (drive and assist dice are not included, a gilded action still rolls its gilded die, and a zero rating rolls two dice and takes the lowest).
- Suggested fix: derive the drive from the action, as the roll handler does. The reroll itself matches the rulebook.
- Done (2026-10-06): burn_resistance burns the action's own drive (engine.drive_for_action); the client's drive_key is ignored and an unknown action is refused (422).

## Marks, incapacitation and scars

### 9. Reviving clears every mark track

- App: `revive_character` clears the incapacitated flag and sets Body, Brain and Bleed marks to 0.
- Rulebook (p. 14): when a fourth mark becomes a scar you erase the marks "in the category you overfilled", and you return to play when your circle gets you somewhere safe. Other categories keep their marks; marks are only healed by resources, abilities or gear.
- Suggested fix: revive should only clear `incapacitated`. The overfilled category is already cleared when the scar is taken.
- Done (2026-10-06): revive_character clears incapacitated only; the other tracks keep their marks.

### 10. Some ways of taking a mark never incapacitate

- App: Back Against the Wall's roll cost (`rolls.py`) and Bending Spoons (`use_post_roll_ability`) add a mark with `min(3, marks + 1)`, so a fourth mark is dropped instead of causing incapacitation and a scar. The interceptor's mark in Behind Me (`intercept_mark`) does incapacitate, but skips Endurance and Death Defy.
- Rulebook (p. 14): whenever you would take a mark in a category that already has 3, you drop incapacitated and take the fourth mark as a scar.
- Suggested fix: route every mark through one function (the take_mark logic) so the fourth mark, Endurance, soaks and Adrenaline Rush apply the same way everywhere.
- Done (2026-10-06): every mark lands through apply_mark in vtt/ws/handlers/marks.py (take_mark, a declined offer, the Behind Me interceptor, and from rules batch 3 the Back Against the Wall cost and Bending Spoons), so the fourth mark, Endurance, Let Them In, Adrenaline Rush and the allies' offers apply the same way everywhere.

### 11. A declined soak or Death Defy offer loses the mark

- App: when a soak ability (Compartmentalization, Steel Mind, In the Trenches, Back Against the Wall) or Death Defy is available, `take_mark` sends an offer and returns without applying the mark. If the player declines or ignores the offer, the mark is never taken (QUIRKS.md D5). The soak branch of `resolve_ability_mark` also does not check that a resistance point is left.
- Rulebook: soaking is a choice (p. 14: a soaked mark "leaves no damage"); not using the ability means taking the mark.
- Suggested fix: apply the mark when the offer is declined (a decline message, or a timeout), and check the resistance point before soaking.
- Done (2026-10-06): a soak or Death Defy offer holds the mark (_pending_marks) until it is answered. Declining, which the desk sends from its "Take the mark" button or when the offer's countdown runs out, lets the mark land, after a declined soak still offering Death Defy for an enemy's mark. A soak is refused (409) once it is used for the assignment or its resistance is gone, and the held mark then lands.

### 12. Hardened is not checked

- App: `apply_scar` skips the action shift for anyone who sends `skip_shifts`.
- Rulebook (p. 31): Hardened lets you choose not to shift action points when you take a scar. Not Again (p. 29) also takes a scar without a shift. Otherwise a scar always shifts a point (p. 14).
- Suggested fix: honor `skip_shifts` only for a character with Hardened, or for a Not Again scar.
- Done (2026-10-06): a scar that keeps the ratings is refused (422) unless the character has Hardened, the scar is a Not Again scar (payload not_again, once per assignment, counted in ability_uses), or it is the fatal fourth scar. The desk only offers it to Hardened characters, now including one whose Hardened came from an advancement.

### 13. Death at the fourth scar

- App: `apply_scar` marks the character dead when `scars_count` reaches 4.
- Rulebook (p. 74): after three scars, the risk of "a fourth and fatal scar" is high.
- Matches. Listed so the owner can confirm the fourth scar is always fatal at this table.

## Drives and advancement

### 14. Advancement has no limits

- App: `engine.apply_advancement` can be called any number of times. Add drive gives +2 to one drive with no maximum. A new ability is free text appended to `specialty_ability` with "; ", after which exact-name ability checks stop working (QUIRKS.md D12). Gilding does not check that the action is not already gilded.
- Rulebook (p. 55): when the Illumination Track fills, each player chooses two different options: add 1 action point, add 2 drive points (the example splits them across two drives), take a new ability from their role or specialty, or gild an additional action. Drives range from 0 to 9 (p. 8).
- Suggested fix: allow two different choices per circle advancement, let the 2 drive points be split, cap each drive at 9, store new abilities as a list, and check that a gilded action is not already gilded. Interdisciplinary (p. 41) allows one ability from outside the character's role and specialty once per campaign.
- Done (2026-10-06): the Lightkeeper's circle advance gives each active member two picks (characters.advancement_picks, a new column), which wait on the character until chosen, so a player who was away still gets them; the dialog opens while picks are waiting and "Later" hides it until the next advance or visit. engine.apply_advancement refuses a pick with none waiting, the same option twice in one advancement, an action above 3, drive points past 9, an ability the character has, and an action already gilded. The 2 drive points can be split ("nerve,cunning"). New abilities are still appended to specialty_ability after "; ", and every ability check splits it (vtt/abilities.py, game/abilities.js), so exact-name checks work after an advancement (QUIRKS.md D12); the dossier lists each one with its text. Not done: Interdisciplinary's one ability from outside the role and specialty is not offered by the dialog, which lists the role's and specialty's abilities.

### 15. Character creation is not checked by the server

- App: `POST /api/investigators/forge` accepts any action ratings, drives and gilded flags (QUIRKS.md); only the frontend's character creator follows the rules.
- Rulebook (p. 25 and 26): action ratings from role and specialty, drives start at 3 fixed points plus 6 more with none above 6, resistances from drive maximums, and two gilded actions.
- Suggested fix: validate the totals on forge, or accept that the creator is trusted.
- Done (2026-10-06): forge refuses (422, with the rule broken in words) any sheet the character creator could not make: vtt/creation.py holds the creator's roles, specialties, starting ratings and drives, gilded actions, gear and abilities, and checks the raise of a zero action plus 3 points with no action above 2, 6 more drive points with no drive above 6, full drives with no resistance spent, the specialty's gild and one other, up to 3 items of the specialty's gear and the standard issue, and no marks or scars. The creator now stops a drive at 6, which it let reach 9, and shows the server's reason if a sheet is refused. tests/test_creation.py checks that the server's table matches the creator's. The tests' forge helper sends a valid sheet and then sets the row to the stats each test needs.

## Circle resources and illumination

### 16. Resource points are counted per resource, not in total

- App: a new circle gets Stitch 1, Refresh 1 and Train 1. The GM's refill sets each of the three to 1 plus the number of active members, so the circle gets three times the rulebook's total.
- Rulebook (p. 41): at circle creation, "assign a number of resource points equal to 1 plus the number of circle members", shared across Stitch, Refresh and Train. Resources are only replenished when the Illumination Track is filled. Each player may spend up to two between assignments (the app's limit of 2 per assignment matches).
- Suggested fix: refill to a total of 1 plus members and let the circle (or GM) split it, and tie the refill to circle advancement.
- Done (2026-10-06): the pool is 1 plus the campaign's active members (vtt/circle_queries.py resource_pool, counted by campaign since members stay on circle 1), shared across the three. Finalize, the Lightkeeper's refill and the circle advance all fill it split as evenly as it goes, Stitch first (5 points: 2, 2, 1), and the Lightkeeper can move points afterwards. The advance replenishes the resources, as the rulebook says; the refill button stays for the Lightkeeper's own calls. max_capacity is the pool, so any one resource can hold all of it.

### 17. Train is spent automatically on the next roll

- App: spending Train sets `train_bonus`, and the very next roll of that character (any roll, secret or not) gets +1d. `gm_end_assignment` clears an unused bonus.
- Rulebook (p. 41): Train is "a d6 that may be used on any roll in the next assignment."
- Suggested fix: let the player choose the roll (a flag on the roll message), and keep the bonus until it is used in the next assignment.
- Done (2026-10-06): Train is a chip the player picks on a roll ("Train" in ability_mods, or use_train); it adds a die once and is otherwise kept until the Lightkeeper ends the assignment.

### 18. Refresh also resets ability uses

- App: spending Refresh restores drives and resistances and also clears `ability_uses`.
- Rulebook (p. 41): Refresh recoups "all used drives and resistances for one PC". Once-per-assignment abilities reset with the assignment.
- Suggested fix: leave `ability_uses` to `gm_end_assignment`. This is minor, since Refresh is spent between assignments.
- Done (2026-10-06): Refresh restores drives and resistances and leaves ability_uses to gm_end_assignment.

### 19. Illumination track size and milestones

- App: advancing the circle subtracts 12 and carries the rest over. The milestone log fires at 3, 6 and 9 when illumination goes up.
- Rulebook (p. 55): when the track fills, clear it and carry leftover points into the next cycle (matches). The track length and milestone positions are printed on the circle sheet, not in the text; the example on p. 62 says seven Illumination "gets you a milestone and leaves the track just over half full", which fits a track of 12.
- Suggested fix: confirm 12 and the milestone positions against the circle sheet. Meticulous Notes (p. 27) adds 1 Illumination after an assignment, which the app leaves to the GM.
- Done (2026-10-06): the track stays 12 with milestones at 3, 6 and 9 (TRACK and MILESTONES in vtt/ws/handlers/gm.py), as the p. 62 example fits. Each milestone the illumination passes gets its own log line (it used to need the value to land on one), and a full track logs that the circle can advance. Ending an assignment logs a reminder for each investigator with Meticulous Notes; the point stays the Lightkeeper's call.

### 20. Circle abilities have no effect in the app

- App: circle abilities are stored as text (`circle_ability`); none of them changes a roll or a resource.
- Rulebook (p. 41): Stamina Training (three shared gilded dice per assignment), Nobody Left Behind, In This Together, Interdisciplinary, Resource Management (a resource back at each milestone) and One Last Run all have mechanical effects.
- Suggested fix: decide which ones the app should automate. Resource Management and Stamina Training are the easiest to add; the rest can stay with the GM.
- Done (2026-10-06): Stamina Training gives the circle three gilded dice for each assignment (circles.stamina_dice_used, a new column; stamina_dice_left in the circle dict). A player picks the chip on a roll, the die is gilded, and the count is locked on the circle row so two players cannot take the last one. Ending the assignment brings them back. Resource Management logs a resource of the circle's choice at each milestone, which the Lightkeeper adds on the circle page. Nobody Left Behind, In This Together, Interdisciplinary and One Last Run stay with the table: each is a choice in the story rather than a number the app holds.

## Abilities

### 21. Back Against the Wall

- App: it is offered as a Brain mark soak in `take_mark` (the soak list includes it with no resistance cost), and there is no resolve branch for it, so a character with this ability never takes a Brain mark through `take_mark` (QUIRKS.md D5). As a roll mod it adds a Brain mark (capped at 3, see item 10) and gives no extra dice; the roll screen's label promises Nerve worth +2d.
- Rulebook (p. 31): on a high-stakes roll, "you may take a Brain mark to make any Nerve you spend worth +2d instead of +1d."
- Suggested fix: remove it from the soak list in `take_mark`. In the roll handler, when it is used, take the Brain mark through the normal mark logic and add one extra die per Nerve point spent (within the Rule of Six).
- Done (2026-10-06): Back Against the Wall is no longer offered as a soak, so its characters take Brain marks again. On a roll that spends Nerve, each Nerve point is worth +2d (within the Rule of Six) and the Brain mark is taken through apply_mark, so a fourth one incapacitates; with no Nerve spent it does nothing and costs nothing.

### 22. Endurance

- App: fixed in this stage (it used to end the socket, bug D1). On a fourth mark it rolls one die per Nerve resistance point left; a 6 keeps the marks at 3 and no scar is taken. It only runs in `take_mark`.
- Rulebook (p. 27): when you take enough marks to become incapacitated, roll d6 equal to your current Nerve resistance; on a 6 you are not incapacitated and do not take a scar.
- Matches. Suggested fix: apply it on every path that can incapacitate (item 10).
- Done (2026-10-06): Endurance runs on every path that lands a mark (item 10).

### 23. Premonitions

- App: the offer goes out after the ally's mark is already applied. Using it burns the seer's Intuition resistance but does not remove the ally's mark (QUIRKS.md D6).
- Rulebook (p. 32): when an ally is about to take marks, burn an Intuition resistance to warn them, "then, soak one of these marks."
- Suggested fix: remove one mark from the ally when Premonitions is used (as Behind Me does), and send the offer before the mark lands.
- Done (2026-10-06): Premonitions removes one mark of that track from the ally (409 when the ally has none). Not done: sending the offer before the mark lands. That needs the mark held across several players' desks with a timeout, and the mark already being removable afterwards gives the same result except for a fourth mark, which the Lightkeeper can undo by hand.

### 24. Behind Me

- App: after the ally's mark is applied, a member with Behind Me and at least 1 Nerve gets an offer for any mark. Using it spends 1 Nerve, removes the mark from the ally and gives it to the interceptor. No offer is sent when the mark incapacitated the ally, because offers are only sent on the non-incapacitating path. The interceptor's own soak offer has no options list and does not apply the mark.
- Rulebook (p. 27): spend 1 Nerve to choose an ally in the same scene "who is about to take a mark from a phenomenon", and take the mark instead.
- Suggested fix: offer it before the mark is applied, including for a fourth mark, and let the GM say whether the source is a phenomenon (as `is_from_enemy` does for Death Defy).
- Done (2026-10-06): the interceptor now takes the mark through the normal flow, with soak options that hold it. Not done, for the reason in item 23: offering before the mark lands (including a fourth mark), and asking the Lightkeeper whether the source is a phenomenon. Death Defy has the same gap: the desk never sends is_from_enemy, so Death Defy is only offered when that flag is set.

### 25. Abilities whose conditions the server does not check

The roll screen (`frontend/src/components/pc/DiceVault.jsx`) checks some conditions, but the server applies the bonus whenever the ability is listed in `ability_mods`:

- Meticulous Notes (p. 27): +1d to Focus [code `read`] only "if your current Cunning resistance is 2 or more". The server always adds it.
- Tenacious (p. 29): gild a die on Move, Strike and Control only with 1 or more Bleed marks and while in danger. The server always gilds.
- Sharpshooter (p. 29): spend 1 Nerve for +2d on a ranged attack. The server allows it with 0 Nerve (the cost floors at 0), and only on Strike, while the rulebook puts shooting under Control (p. 50).
- Suggested fix: check the same conditions on the server, and allow Sharpshooter on Control (and Strike, if the table treats thrown weapons that way).
- Done (2026-10-06): the server checks Meticulous Notes (2 Cunning resistance left), Tenacious (a Bleed mark; being in danger is the player's call, so it is a chip, not automatic) and Sharpshooter (1 Nerve to pay, on Strike and Control). The desk shows the same conditions.

### 26. Abilities whose "+2d for the first drive point" is missing or wrong

- Misdirection (p. 28): the first Cunning spent on the Hide roll is worth +2d. The app gives +1d on every Hide roll, even with no Cunning spent.
- Lie Detector (p. 28): gild an additional die and the first Cunning spent is worth +2d. The app only gilds.
- Better Part of Valor (p. 30): gild a die and the first Nerve spent is worth +2d. The app only gilds.
- Suggested fix: add one extra die when at least 1 point of the named drive is spent, and none otherwise.
- Done (2026-10-06): Misdirection, Lie Detector and Better Part of Valor add one more die when at least 1 point of their drive is spent on the roll, and none otherwise.

### 27. Street Smarts does nothing on the server

- App: its `drive_substitute` is "any", which the roll handler skips, so a Survey roll still spends Intuition.
- Rulebook (p. 31): on a Survey roll you may spend any drive instead of only Intuition.
- Suggested fix: let the roll message name the drive to spend, and accept it for Street Smarts.
- Done (2026-10-06): with Street Smarts on a Survey roll, the roll's "drive" names the drive to spend; the desk sends the drive the player put a spend on.

### 28. Post-roll abilities do not check the roll

- Flourish (p. 28): on a failed or mixed roll where you could spend Cunning, spend 2 Cunning to push the result up one tier. The app takes 2 Cunning (or what is left) without checking the roll or the cost, and only announces the new tier in the log.
- Learn from My Mistakes (p. 30): on a result of 3 or less, refresh 1 drive of your choice. The app refreshes without checking the result, and it can be repeated.
- Bending Spoons (p. 32): on a mixed success on a Sense roll to control an object, take a Bleed mark to make it a full success. The app adds the Bleed mark (capped at 3, item 10) without checking the roll.
- Suggested fix: keep the last roll's result on the server and check it before applying these.
- Done (2026-10-06): the server keeps each character's last roll (_last_roll in vtt/ws/handlers/rolls.py) and checks it: Flourish on a failed or mixed roll that could take Cunning, with 2 Cunning (and the new tier is logged); Learn from My Mistakes on a 3 or less; Bending Spoons on a mixed Sense roll, its Bleed mark taken through apply_mark. Each works once per roll; anything else is refused (409). The desk's prompts follow the same checks, and now refresh with each roll: they were keyed on a roll id the server never sent, so they never appeared.

### 29. Once-per-assignment limits for roll abilities are not counted

- App: the roll handler's use counter only counts abilities that are also in `ABILITY_MOD_DEFS`, and none are, so nothing is counted (QUIRKS.md D11). An ability named twice in `ability_mods` is applied twice.
- Rulebook: I Know a Guy and Death Defy (p. 27), Field Experience and Not Again (p. 29) are once per assignment, and Saw This Coming (p. 27) three times per assignment.
- Suggested fix: count uses where each ability is applied, refuse uses past the limit, and ignore duplicate names in `ability_mods`.
- Done (2026-10-06): a mod named twice is applied once, and the use counter that never counted is gone. None of the roll abilities is limited per assignment. The limited abilities the app runs are counted where they are used: the soaks and Death Defy (rules batch 2) and Not Again. I Know a Guy, Field Experience, Saw This Coming and University Resources are told at the table and have nothing to count in the app.

### 30. Abilities that match the rulebook

These were checked and match: Sweet Talk (p. 27, code `sneak`), Cool Under Pressure (p. 27), Adrenaline Rush (p. 27, offered after each mark that is not a fourth one), Death Defy (p. 27), Let Them In (p. 27, an information prompt), Well-Read (p. 27, apart from item 6), Open Book and Practiced Patter and In the Trenches (p. 28), Basic Training and Compartmentalization (p. 29), Steel Mind (p. 30), Interrogation (p. 31), Extend Your Senses (p. 32). Dice equal to "current resistance" are computed as maximum drive divided by 3 minus resistance burned, which matches p. 13.
