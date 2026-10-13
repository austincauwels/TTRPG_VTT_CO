# Fix round 5: Robert's decisions (13 October 2026)

Robert filed issues #62 to #66 by hand on the live site (build 770a2ed) and took every recommendation below ("yes"). They are binding. Earlier decisions stay binding too: `decisions_fix4.md` (release or leave at any time, spending whenever the Lightkeeper opens it, Train die kept until used, the spend confirm stays armed, the optional report line, the "Not filed:" line, ally offers logged) and issue #16 (behaviour kept on purpose).

Scope: only #62 to #66. The older bugs (#17-#22, #38-#44) and medium UX (#23-#26, #46, #47) wait for the next round.

## The issues, verbatim

- **#62 Leave campaign subline**: "Leave campaign subline is too wordy"
- **#63 Slink Ability Scout Dropdown**: Scout lists three questions; "These are not restrictive options for the skill, the skill can be used to ask any question, and a dropdown is useless. Check other skills for this error."
- **#64 Character status and build edit too restrictive**: "Characters are too hard to make changes to after building. If a character in a campaign changes their build, have it alert the lightkeeper of the change. Work off a detection not prevention methodology across these disciplines, including statuses like bleed marks action points, etc. The player should have full ability to make changes with a log that keeps them honest." Comment: "Cant change gear, may be related".
- **#65 Account > Account**: "Having a button that opens a menu with only one button that says the same thing doesn't make sense"
- **#66 Lightkeeper's desk**:
  1. "Join Requests being front and center doesn't make sense, if anything it should be a popup when a request comes in"
  2. "At certain resolutions, the Dispatch button bleeds off the page"
  3. "Navigation for desks varies too much between the lightkeeper and the investigator. Choose one. Lightkeepers are players too, and should have something familiar to them in this desk with enhancements focused on their role"
  4. "Circle resources are built wrong on lightkeepers desk, review page 41 and remove the manual task of refilling resources to 1 by automating the process in tandem with Illumination milestones"
  5. The Keys line ("Keys: no investigators +0 / Keys are worth 2 when some of you fulfilled one, 4 when all of you did (p. 55). A report not filed counts as no key.") "is vague and the Illumination questions on the lightkeepers desk aren't clear as to their purpose for the lightkeeper."
  6. "Circle Ability removal too wordy: 'Press again to remove every circle ability listed above, including ones gained by advancing. You then choose one again from the list.' Shorten to 'Press again to remove all circle abilities.', and change 'Yes, Clear' to 'Remove'. Use these language rules everywhere else where applicable."
  7. "Insignia for circle should be modifyable by the lightkeeper by clicking it similar to a player portrait"

## Decisions

1. **Detection, not prevention (#64).** A player in a campaign can change everything on their own sheet at any time: drives and their maximums, resistances, marks (Body, Brain, Bleed), scars, abilities, gear, path and specialty, name and the rest of the build. Nothing the player edits on their own sheet is blocked by the app. Each change writes one line to the Lightkeeper's log naming the investigator, what changed and from what to what (for example "Mara: Nerve 2 to 3", "Mara: gear Lantern removed, Revolver added"), and puts a dot on that player's roster card until the Lightkeeper opens the sheet. Rolls, spends and the existing in-play flows keep working and keep their own log lines; the change log is for direct edits. The rules still guide (show maximums, warn softly), they do not stop. Gear must be changeable after creation.
2. **One navigation for both desks (#66.3).** The Lightkeeper's desk uses the investigator desk's navigation pattern, same placement and behaviour, with extra tabs or entries for the Lightkeeper's own tools. A Lightkeeper who has played should feel at home.
3. **Circle resources (#66.4).** Resources follow p. 41 as already recorded in docs/refactor/RULES_CHECK.md item 16: each of Stitch, Refresh and Train starts at, and refills to, 1 plus the campaign's active members, and refills when the Illumination track fills (the circle advance). Check that a new circle starts at that amount, not 1. Remove the manual "Refill each resource" button. Resource Management's earn-back at each milestone (3, 6, 9) happens through the app, not by hand editing: when a milestone passes, the app asks for the circle's choice (one press) and applies it. The Lightkeeper keeps a small adjust control for corrections; each use writes a log line.
4. **Wording rule, app wide (#66.6).** A confirm is one short sentence saying what will happen, and its button is one verb for the action ("Press again to remove all circle abilities." / "Remove"). No "Yes, X" buttons, no restating what is listed above, no explaining the follow-up in the confirm. Apply it across the whole app, not only the Lightkeeper's desk. The same spirit covers sublines (#62): short, or behind the "i".
5. **Free questions (#63).** Every ability that now offers a fixed list of questions (Scout and any other) becomes a free text box. The book's questions show as optional examples (tap to fill in, or placeholder). The cost is still spent and logged with the question asked.
6. **Join requests (#66.1).** Join requests leave the front of the desk. A pop-up (dialog or toast with an action) appears when a request comes in; pending requests stay reachable from a smaller place (a badge or a tab) so none is lost on a reload.
7. **Insignia (#66.7).** The Lightkeeper can change the circle's insignia by clicking it, the same way a player changes their portrait.
8. **Keys and Illumination questions (#66.5).** Rewrite the Keys line so a Lightkeeper understands it at a glance (what a key is, what the number means right now), and say on the Lightkeeper's desk what the Illumination questions are for (answered at the end of an assignment; each yes adds Illumination). Keep the long rule behind the "i".
9. **Account (#65).** The Account button goes straight to the account page, or the menu gets real choices. No menu holding only its own name.

Robert also said: the live site runs 770a2ed, nobody is playing, and this round can go straight to live when he deploys it. Claude never deploys.
