Fix round 5: Robert's hand-filed issues #62 to #66, built to his decisions of 13 October (`playtest/results/2026-10-13-fix5/decisions.md` on `playtest-harness`).

Fixes #62
Fixes #63
Fixes #64
Fixes #65
Fixes #66

## What changed

**#64: edit your own sheet, logged (detection, not prevention)**
- New **Edit sheet** button on the player's dossier. It opens a dialog covering name and profile, role and specialty, abilities, action ratings and gilds, drive maximums and amounts, resistances, the three mark tracks, and scars. Rules show as soft warnings; none of them blocks a save.
- **Gear unlocked**: items can come off, written-in items too, and going past the slots shows a soft warning instead of stopping.
- **The log**: each save writes one line, like "Mara: Nerve maximum 5 to 6, gear Lantern removed, Revolver added." A dot appears on the player's roster card and clears when the Lightkeeper opens the sheet.
- **Protocol**: new messages `edit_sheet` and `gm_sheet_seen`, and a new column `characters.sheet_edited`. The server checks only the shape of an edit, not the rules.

**#66: Lightkeeper's desk**
- **One navigation**: the Lightkeeper's desk now uses the investigator desk's header, tabs and phone drawer, with extra entries for the Lightkeeper's tools.
- **Join requests** move off the front of the desk. A pop-up appears when one arrives, and a Requests tab with a count survives a reload. Invite player is still reachable.
- **Dispatch button** fits at every size tried, from phone up to 1920x1080, tablet in both orientations included.
- **Insignia**: the Lightkeeper changes it by clicking it, like a portrait. The change is logged and can be undone.
- **Circle resources** (p. 41):
  - A circle starts at 1 plus the members in each resource. The Refill button is gone; resources refill when the track fills.
  - With Resource Management, each milestone asks for the circle's choice under Add Illumination and applies it in one press.
  - The manual squares stay as a logged correction.
  - New message `gm_earn_back` and new column `circles.earn_backs`.
- **Keys line and Illumination questions** are reworded so a Lightkeeper understands them at a glance. The long rule stays behind the "i".
- **Short confirms across the app** (decision 4): "Press again to remove all circle abilities." with a **Remove** button. Every "Yes, X" button is gone, and long confirms are cut to one sentence or moved behind the "i". DESIGN.md now states the rule.

**#63**: Scout, Uncanny Eye and Tactician take a free typed question, with the book's questions as tap-to-fill examples. The question appears in the log. Desks loaded before this change still work.

**#62**: Leave and Release confirms are one short sentence, with the detail behind the "i".

**#65**: the Account card now has real choices: **Edit account**, Sign out, and on the Lightkeeper's desk Retire.

## Calls Robert may want to change
- **Who sees sheet-edit lines**: the whole table, not only the Lightkeeper. Drive pip and gear lines already reached everyone. It can be narrowed to the Lightkeeper if you prefer.
- **A fourth scar** is the one edit the editor refuses. It is a death, and #16 and round 4 send deaths through the scar form.
- **#65 keeps the menu** and renames its link instead of making the button go straight to the page, because the card also holds Sign out and Retire.

## How it was checked
- Each of the four groups was implemented, reviewed by a separate agent, and repaired in its own worktree. The groups were then merged.
- The confirm-wording sweep ran after the merge.
- A final code review ran, plus three Chromium checks that replayed every item on the unfixed build 770a2ed and then on this head. They used phone (390x844), tablet (820x1180) and laptop (1366x768) sizes, both desks and the hub.
- The checks found no blocking issues. Six smaller gaps were fixed in the last three commits: touch heights, a crash on a malformed edit, the request sheet's back label, and the sketch confirms.
- Full backend suite on the final head: 1986 passed, 1 skipped. Frontend build passes. No em dashes in added lines.

Deploy note: on startup the server adds the two new columns, `characters.sheet_edited` and `circles.earn_backs`. Nothing else in stored data changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01ETKqHLvkfH9k99JTnJzzKA
