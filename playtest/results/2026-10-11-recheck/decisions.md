# What changed since the second report, and what Robert decided

The second playtest (11 October, on 63d80f4) produced `report.json` / `report.md` in this folder.
Two PRs then fixed its items; both are merged into the build under test (main, 36f001c).

## PR 14 (fixes all 19 bugs and the medium UX items)

- Death and scars: a dead investigator's sheet is a record. The server refuses its rolls, marks, spends, abilities and relationship proposals; the desk shows those controls off. A roll or offer made in life can still be finished after the death it led to. The death is logged on every desk; the death dialog starts on "Stay and look at the sheet". The Lightkeeper has Revive for an incapacitated member. Removing a scar with Edit undoes its action shift.
- Campaigns: retiring a campaign frees its living investigators, tells their desks, resets their per-assignment state; hub lists refresh. Join requests name the player (to the Lightkeeper only) and flag a second request. Invite player, the invite banner and the creator's rejoin step name the living investigator a rejoin retires; the invite is logged. A replacement investigator keeps its predecessor's spend count; its arrival is logged.
- Illumination and spends: the tally (three ticks and "added") lives on the circle; `gm_set_tally_answer` and `gm_add_tally`; a second add is refused under a row lock. End Assignment warns when a tally is not yet added and says every gear list is cleared. "Give a spend back" takes one press and never fills a pool past its maximum (to a full pool it returns the spend, not the resource, and the log says so).
- Rolls and connection: Patch Up can be declared again. A mark sent into a silent socket is sent again and taken once. An unanswered roll is headed "May have counted". A roll is settled on the server when other dice are thrown, at End Assignment, or when a burn is refused; a returning desk is told. A secret roll no longer settles others. Ally offers come back after a reload and close for the others once one ally answers.
- Lightkeeper's desk: an unsent dispatch survives a section switch (not a reload). Pass Notes gains "@Lightkeeper only", drops the sender, says the Lightkeeper reads private notes. Her drive edits reach the player's desk (her drive pips are live only while her trauma record's Edit is on).
- Player's desk on a phone: drive pips clear one point at a time with 44px targets; the log stays pinned to its foot; "Choose advancements" is a strip at the top; the scar and advancement dialogs keep their buttons in a footer.
- Hub: the brass tack is gone (Robert's decision: "a tack pushed into a desk is not realistic").

## PR 15 (the low UX items and picked ideas)

- Status and death: the Lightkeeper's sheet and roster card show "Incapacitated: scar owed" and a compact state line; players' Your Circle cards and relationship papers show Incapacitated and the scar count. The fatal fourth scar form drops the shift columns and Decide later. A recorded scar and a mark dealt to someone already down are logged.
- Dice and abilities: gilded keep choices read as buttons; refund line not promised at a full drive; the burn offer says why it closed; vanished bonus dice explained; Sweet Talk, Commune, Nobody Left Behind wording; the tray survives a reload; the How to roll slip fits a phone; a tap at the gear limit says so.
- Lightkeeper's desk and log: sealing, renaming and join decisions are logged; a dealt mark is one line; Allow/Lock spending and the opening scene are logged; dispatch lines not cut mid-word and share one serial number; inline Edits say Enter saves and Esc cancels; tension and timer controls stay with a sheet open.
- Campaigns and joining: a pending request can be withdrawn (`POST /campaign/withdraw/{id}`); a rejected player is told; a request's sheet says it is a request and has Approve/Reject; the ledger shows a waiting badge; Join Requests show on a sealed campaign while any wait.
- Circle and advancement: Finalize warns when nothing is voted; name and counter edge cases; resource pool leaves out the dead; insignia name printed (or "None chosen"); report cards keep their order; advancement picks survive Back; end of assignment wording.
- Creator, phone, Notebook, accessibility: pinned footers and scroll cues on phone dialogs and the path card; pen and portrait explained; blank pronouns not shown as "Unlisted"; Pass Notes wording; sketch placement; heading levels; duplicate accessible names.

## Robert's decisions (these are intended behaviour, not regressions)

- Retire frees living investigators; the dead stay with the campaign.
- The Lightkeeper alone sees players' usernames on join requests.
- A replaced dead investigator gets a **Fallen card** on the Lightkeeper's roster and a Fallen line in Circle History.
- An unadded Illumination tally is still dropped at End Assignment, with a **warning** (not added automatically).
- The Lightkeeper's ledger has a **Retired list with Restore**. Restore brings back the campaign and its dead only; freed living investigators return by a join or an invite.
- The formation papers get a **jump list on a phone** only.
- A dead sheet is a record (see PR 14). The Lightkeeper's trauma Edit cannot add a scar (on purpose).
- Help on demand only (hover, focus, a tap on an "i"), never permanent sublines under every item. "Lightkeeper", never "GM", on screen. 44px touch targets.

## Known and accepted (say "left-alone" if your item is one of these; do not log them)

- A newcomer is not told what the circle already holds (needs a product decision); the player Registry has no Fallen record.
- A dead investigator's player gets a 403 in the console opening a retired campaign's desk; Approve, View sheet and Reject on a request card are 40px tall on a phone; the creator's path arrows are just below the fold at 1366x768; the dice tray is empty after a reload that follows a settled roll.
- Ideas not built: Lightkeeper "Call for a roll" card, gear that changes rolls, editable field notes, relationship proposals that nag or expire, account security emails, map pins.
- Older list: the formation papers stay a blocking dialog; Let Them In stays a notice; the hourglass stays sand only; no gold pip on an action rated 0; the creator's step 3 row overflows below 356px; the Lightkeeper's copy does not show held marks; after a restart a stale offer card's decline still lands its mark; Notebook drafts stay after Sign out; a sketch is lost on Back after a reload; after Flourish the slip shows the old outcome; some notebook phone controls are under 44px; the sheet's ability tab resets on a tab switch; activity history and held offers live in server memory.
