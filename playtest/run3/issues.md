# Open GitHub issues on austincauwels/TTRPG_VTT_CO (12 October 2026)

## #16 Behaviour kept on purpose (not bugs, label known)
- The circle formation papers stay a blocking dialog.
- Let Them In stays a notice with only Close.
- The hourglass shows sand only, no number.
- An action rated 0 has no gold pip; the star beside the name marks a gild.
- The Lightkeeper's trauma record Edit cannot add a scar. A scar from the story takes four marks and the player's scar form.
- An Illumination tally that was never added is dropped at End Assignment. The confirm warns about it first; it is not added automatically.
- Retiring a campaign frees its living investigators; the dead stay with the campaign.
- Restore (the ledger's Retired list) brings back the campaign and its dead only.
- A replaced dead investigator gets a Fallen card on the Lightkeeper's roster and a Fallen line in Circle History.
- Only the Lightkeeper sees players' usernames on join requests.
- Help is on demand (hover, focus, a tap on an "i"), never a permanent subline under every item.
- On screen it is always "Lightkeeper", never "GM".

## Bugs and UX still open
- #17 Activity log history and held ally offers live in server memory, so a restart empties them
- #18 After a server restart, declining a stale ally offer card still lands its mark
- #19 After Flourish, the result slip still shows the old outcome
- #20 Notebook drafts stay in the browser after Sign out
- #21 A sketch in progress is lost on Back after a reload
- #22 A dead investigator's player gets a 403 in the console opening a retired campaign's desk
- #23 The Lightkeeper's copy of a sheet does not show held marks
- #24 The sheet's ability tab resets to Role ability on every tab switch
- #25 Some Notebook controls are under 44px on a phone
- #26 The creator's step 3 row overflows on screens narrower than about 356px
- #38 The server still accepts a scar from a dead investigator, and relationship proposals to or from the dead
- #39 A rejoin from another device leaves the replaced investigator's open desk live, with the used invite banner
- #40 A reload after an open roll empties the tray and hides Burn and reroll, though the server still takes the burn
- #41 A replacement approved through a join request starts with 0 spends used, so a player can spend four in one break
- #42 With the Case Ledger open when a campaign is retired, Play still opens a desk for it
- #43 A mark held during a silent outage is lost if the page is reloaded before the desk reconnects
- #44 Notebook Heading, List and Quote on an empty line leave the mark selected, so typing erases it
- #45 Low UX items left after the 11 October re-check (a checklist)
- #46 Approve, View sheet and Reject on a join request card are 40px tall on a phone
- #47 The player Registry keeps no record of a fallen investigator

## Ideas
- #27 Lightkeeper "Call for a roll" card
- #28 Gear that changes rolls
- #29 Tell a newcomer what the circle already holds (Robert: a short welcome pop-up with the circle's key facts before play)
- #30 Editable field notes
- #31 Relationship proposals that remind or expire (Robert: an end-of-assignment "interview" reviewing goals and relationships, with a chance to propose a new one)
- #32 Account security emails
- #34 Add custom maps (Robert: drawn live with the existing sketch tools, light enough to improvise)

## #45 checklist (low UX items already filed; a repeat is not new)
- With a sheet open (and on Circle, Notebook, Map) the Lightkeeper has no tension or timer controls
- A long dispatch location is cut mid-word in the log (gm.py _clip, also renames and tension names)
- Illumination writes a line per milestone after its gains line
- On a 1440x900 laptop the Dispatch and End Assignment stamps are below the fold with no cue
- When End Assignment arms, the side column scrolls about 220px so the stamp moves from under the pointer
- Invite player on a campaign nobody has joined says "The player rejoins..." and nothing points to the code
- A withdrawn join request vanishes from the Lightkeeper's desk with no word, closing her open sheet
- Burn and reroll is about 25 Tab presses after a keyboard roll; focus falls to the page after
- At 1366x768 the "what a reroll throws" i slip covers Burn and reroll
- Open Book and Interrogation untoggle after the roll with no word; slip and log never name the ability
- The "Why empty" slip on an empty gear tag is cut off; on a tablet the empty tag clips Change Gear
- The player's own "You" card in Your Circle shows no Incapacitated or scars
- The milestone log line says nothing of what it gives
- With an amendment kept in the draft, closing reports leaves unsent ticks under "Reports closed"
- The "scroll to the new scar" never runs on the player's sheet
- The waiting investigator's sheet cannot be opened from the hub (the name is a plain <p>)
- On a phone the waiting row's Check again is 30px tall beside the 44px Withdraw
- The locked Last Played tome's explanation is a hover title only
- The creator's path card arrows and "1 of 10" counter are under the sticky footer on small phones
- The Handwriting help prints the word twice, and on a phone its slip is cut off
