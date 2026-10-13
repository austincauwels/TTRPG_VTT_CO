Fix round 7 triage: low UX checklists #69, #45 and #60 (13 October 2026)

Read on HEAD 98dbc0b (branch claude/loving-fermi-2giawj: main 77452a3 plus fix round 6). Read only: nothing was edited, run or started. Line numbers are from that HEAD; confirm them in the code before editing. Binding: decisions.md (round 6), decisions_fix5.md, decisions_fix4.md and issue #16 (behaviour kept on purpose). Nothing below removes or weakens any of them.

Ids: 69.n and 45.n count the unticked lines of each issue in order. 60.n counts the lines of #60's UX section in order, ticked ones included, so the unticked lines are 60.4 to 60.25 (60.1 to 60.3 are ticked). #60's Ideas section is skipped.

Counts (50 lines): still present 48 (four of them only partly, and three not yet seen in a browser: 60.10, 60.14, 60.24), fixed 1 (60.20), needs a decision 1 (45.16), no longer applies 0.

Server or WebSocket: 69.3 (new circles column), 69.7, 45.2, 45.3, 45.13 and 60.13 (gm.py and access.py, group A), and 45.10 and 60.7 (rolls.py, group C). Only 45.10 touches the protocol: it adds one optional field to roll_result. No new message type.


==================================================================
Issue #69 (left after fix round 5)
==================================================================

69.1 Edit sheet loses the draft on a refused save; the gear dialog writes back the whole list it took when it opened
Status: still present.
Cause: SheetEditor.jsx:166-172 closes the dialog as soon as the message goes out (onSave returns true when the socket is open). A later action_rejected for edit_sheet only sets sheetEditError (gameStore.js:1150-1152), which shows under the sheet (InvestigatorDossier.jsx:832-834), so the draft is gone. Gear: openGearModal copies the gear (InvestigatorDossier.jsx:754-758) and sendGearUpdate sends that whole list (:620-622), so an item added or removed at the table while the dialog was open is reverted.
Fix: In the Dossier, keep the last changes sent from the editor; when sheetEditError arrives for them, reopen the editor with that draft and the server's reason in its error line (SheetEditor takes an initial draft prop). For gear, record what the player added and removed against the list taken at open, and on Save apply that diff to the live character.gear.
Size: M. Files: SheetEditor.jsx, InvestigatorDossier.jsx (reads the store, no store change).

69.2 A refused ability use clears the typed question
Status: still present.
Cause: AbilityUse.send clears the question when the message is sent, not when it is taken (InvestigatorDossier.jsx:113-120). A refusal sets abilityUseError (gameStore.js:1175-1177) after the text is gone.
Fix: Clear the question (and the item and split) in an effect on usedAt, the server's abilityUsed for this ability (already read at :73), instead of on send. A refusal then leaves the text in the box.
Size: S. File: InvestigatorDossier.jsx.

69.3 Resource Management can count an earn-back twice across a milestone (-1 then +1)
Status: still present (capped by cap_earn_backs, so never above what is missing).
Cause: _count_earn_backs (backend vtt/ws/handlers/gm.py:92-112) counts every milestone a rise passes. Once an earn-back has been applied (earn_backs back to 0), a fall below the milestone takes nothing away and the next rise counts it again.
Fix: New column circles.milestones_earned (0 to 9, the highest milestone already counted). A rise counts only milestones above max(old, milestones_earned) and raises it. A fall removes a waiting earn-back for each milestone it crosses only while one is waiting, and lowers milestones_earned only then; an applied one stays counted. Reset it to 0 when the track resets at the circle advance. Column in models.py and vtt/db.py add_columns; pin it in test_00_startup.py; tests in test_ws_circle.py.
Size: M. Server and database, no protocol change. Could be left for a later round if group A runs long; the cap keeps it harmless.

69.4 The Finalize confirm runs to three short sentences
Status: still present.
Cause: FinalizeRosterSlip.jsx:34-38 joins three sentences (the press, the empty parts, the turned-away requests).
Fix: One sentence that keeps both losses in view: "Press again to seal the circle for good with 3 investigators, leaving Lead empty and turning away 2 waiting requests." (the clauses drop out when empty). The button stays "Finalize". Nothing is hidden behind an "i", so no product call is needed.
Size: S. File: FinalizeRosterSlip.jsx.

69.5 The Lightkeeper's trauma Edit subline is long
Status: still present.
Cause: InvestigatorDossier.jsx:1521-1524, a permanent paragraph while editing.
Fix: Keep "Editing <name>'s trauma record." and put the rest behind an InfoTerm "i" beside it (label "How editing works"), as decision 4 of fix 5 and #16 ask.
Size: S. File: InvestigatorDossier.jsx.

69.6 The permanent paragraph under Circle Resources on the player's Circle page
Status: still present.
Cause: CircleView.jsx:1015-1017 prints refillRule(...) as a permanent italic paragraph.
Fix: Make the "Circle Resources" heading (:892-895) an InfoTerm whose slip holds refillRule's text, and drop the paragraph. Keep the Resource Management "to earn back" status line (:1009-1014).
Size: S. File: CircleView.jsx.

69.7 The server accepts an insignia change before the seal
Status: still present.
Cause: backend vtt/ws/access.py:174-181 (_gm_update_circle_fields) checks only that the insignia is one of the eight.
Fix: When "insignia" is in the payload, read Circle.is_finalized for the circle and raise Rejected(409, "The insignia is chosen by the circle's vote until the seal."). test_ws_circle.py:873 test_update_circle_insignia must mark its circle finalized first; add a refusal test.
Size: S. Server only.

69.8 (a) After a role change the role ability card is headed by the new role; (b) at lg to xl the desk header title touches Back to chapter hub
Status: both still present.
Cause: (a) InvestigatorDossier.jsx:978-983 heads the pane with character.role whatever the ability's own role. (b) Both desks' title headers use a three-column grid from lg (MainDeskView.jsx:140, GMDeskHeader.jsx:76) whose right column holds Back to chapter hub and Account; between 1024 and 1279 the centred 36px title and that column meet. The header is screen-reader only from xl.
Fix: (a) Head the pane with ROLE_FROM_ABILITY[character.role_ability] || character.role (same for the specialty pane with SPECIALTY_FROM_ABILITY). Detection, not prevention: nothing else changes. (b) Below xl drop the three columns: title centred, the two buttons centred under it (remove lg:grid-cols-[1fr_auto_1fr], the empty spacer div and lg:justify-end), in both headers. Check at 1024, 1180 and 1279 wide.
Size: S. Files: (a) InvestigatorDossier.jsx (group B); (b) MainDeskView.jsx and GMDeskHeader.jsx (group A).


==================================================================
Issue #45 (left after the 11 October re-check)
==================================================================

45.1 With a sheet open (and on Circle, Notebook, Map) the Lightkeeper has no tension or timer controls (F013)
Status: still present.
Cause: The tension clock with its +/- is TensionSection, drawn only on the bare roster (OperationsPanel.jsx:260-313, :313). Elsewhere the desk shows TableStrip (:226-227), which is read-only (TableStrip.jsx:17-57). The phone has its Hourglass drawer part, so this is tablet and up.
Fix: Give TableStrip a gm prop: on the Lightkeeper's desk it shows "-" and "+" beside the tension (sending gm_update_circle tension_clock as SceneManager.jsx:70-83 does) and, when a timer is set, a Start or Pause button (gm_timer). 44px on touch, 36px with a mouse. OperationsPanel passes gm.
Size: M. Files: TableStrip.jsx, OperationsPanel.jsx.

45.2 A long dispatch location is cut mid-word in the log ("in the Newfa...") (F015)
Status: still present.
Cause: _clip (backend vtt/ws/handlers/gm.py:37-40) cuts at 80 characters wherever it lands. Also used for renames, tension names and the seal line (routers/circles.py:314).
Fix: Cut at the last space at or before the limit (a hard cut only when there is none in the last 20 characters), then "...". Update test_ws_circle.py:1795, which pins the hard cut.
Size: S. Server (log text only).

45.3 Illumination still writes a line per milestone after its gains line (F014)
Status: still present.
Cause: _say_illumination writes "X gains n Illumination (a to b)." (gm.py:505-515), then _log_illumination writes "X milestone 3 reached!" per milestone and a Resource Management line after each (:115-141). End Assignment's Meticulous Notes path calls _log_illumination directly (:443).
Fix (with 45.13): One line per change, the milestones folded in: "The Moths gains 4 Illumination (1 to 5), past milestone 3." A milestone is named only when the circle has Resource Management (it gives nothing otherwise; the ring shows it and its "i" says so). The Resource Management line stays its own line, once per change ("earns back 2 ..., the circle's choice"). "Track is full" stays. Update the pinned strings in test_ws_circle.py (:670, :754, :919, :931, :948, :970, :997, :1553).
Size: S. Server (log text only).

45.4 On a 1440x900 laptop the Dispatch and End Assignment stamps are below the fold with no cue (F016)
Status: still present (no scroll cue anywhere in the app).
Cause: From xl the left column scrolls inside itself (OperationsPanel.jsx:233) and the stamps sit at the letter's foot (SceneManager.jsx:391-426).
Fix (with 45.5): From xl make the stamp row sticky at the foot of that scrolling column (xl:sticky xl:bottom-0, the letter's paper behind it and a short top fade), so both stamps are always in view and the letter scrolls above them.
Size: M (with 45.5). Files: SceneManager.jsx, OperationsPanel.jsx. Check at 1440x761, 1280x720, 1920x1080.

45.5 When End Assignment arms, the side column scrolls to show the warning, so the stamp moves from under the pointer
Status: still present, smaller (the armed line is one sentence since fix 5).
Cause: ConfirmAction scrolls the armed hint row into view (ConfirmAction.jsx:78-84); under a stamp at the column foot that moves the stamp.
Fix: With 45.4's sticky stamp row, lay End Assignment's hint row above its stamp (flex-col-reverse in the className SceneManager passes at :398), so arming grows the row upward, the hint is already in view and nothing scrolls. ConfirmAction itself is not changed.
Size: in 45.4.

45.6 Invite player on a campaign nobody has joined still says "The player rejoins..." and nothing points to the campaign code (F006)
Status: still present.
Cause: InvitePlayer.jsx:76-78 has the rejoin sentence only. CorrespondenceStack receives campaignCode (:16) but never uses it; its empty state is "No one waiting to join" (:27-32).
Fix: Empty state: "No one waiting to join. New players ask with the campaign code <code>." In the invite slip: "Brings back a player who has played here, with a new investigator, without your approval." While there, the request pager's arrows (:51-65) are 40px: 44px on touch.
Size: S. Files: CorrespondenceStack.jsx, InvitePlayer.jsx.

45.7 A withdrawn join request vanishes with no word, closing the Lightkeeper's open sheet of it (F023)
Status: still present.
Cause: OperationsPanel.jsx:89-94 closes the request's sheet as soon as it leaves pending_investigators. Withdraw sends the same investigator_rejected as a reject (routers/campaigns.py:346-352).
Fix: Client only. If the open request disappears and this desk did not approve or reject it, keep the sheet open read-only with a status line "<Name>'s request is no longer waiting." and only Back to requests (hide Approve and Reject). GMCharacterSheet takes a closed flag.
Size: S. Files: OperationsPanel.jsx, GMCharacterSheet.jsx.

45.8 Burn and reroll is about 25 Tab presses after a keyboard roll, and focus falls to the page when the next roll closes it (F009)
Status: still present.
Cause: Nothing moves focus to After the roll (RollModifications.jsx); FocusFollowsRoll (DiceTray.jsx:141-156) only handles the gilded choice. When the panel unmounts with focus inside, focus drops to body.
Fix: Extend the same pattern in DiceVault: when this desk's own roll lands with focus on its roll row and a burn is offered, move focus to Burn and reroll; when the panel closes with focus in it, move focus to the result slip ([data-result-slip], tabIndex -1 already). Also give Burn and reroll 44px on touch (it is min-h-[36px] at RollModifications.jsx:85).
Size: M. Files: DiceVault.jsx, RollModifications.jsx.

45.9 At 1366x768 the "what a reroll throws" slip covers Burn and reroll (F010)
Status: still present.
Cause: The InfoTerm at RollModifications.jsx:76-79 uses the default slip below the term, where the button sits.
Fix: Pass slipClassName so the slip opens above the line ("left-0 bottom-full mb-1 w-[min(18rem,calc(100vw-2.5rem))]").
Size: S. File: RollModifications.jsx.

45.10 Open Book and Interrogation untoggle after the roll with no word; the slip and log never name the ability (F011)
Status: still present.
Cause: The chips reset on roll (InvestigatorDossier.jsx:1218); the server applies the mods (rolls.py:481-483) but neither the roll payload nor the log line (:597) names them; rollPoolText says only "+2d" (outcomes.js:60-63).
Fix: The server adds roll.abilities, the names of the mods that added dice, to the roll it sends, and the log line gets " (Open Book)" after the action. rollPoolText prints "Sway +2d (Open Book): 3 dice". WEBSOCKET.md roll_result row; test_ws_rolls.py.
Size: M. Server and protocol (one optional, additive field in roll_result; old desks ignore it).

45.11 The "Why empty" slip on an empty gear tag is cut off; on a tablet the empty tag also clips Change Gear (F018)
Status: still present.
Cause: The InfoTerm sits inside .gear-tag, whose clip-path (index.css:919) cuts the slip (InvestigatorDossier.jsx:890); its label also crowds Change gear (:891-898), which is 40px on touch.
Fix: Drop the InfoTerm from the tag head. When the gear is empty, the items area shows one short line, "Cleared when the assignment ended." (an empty state, gone once gear is chosen). Change gear 44px on touch.
Size: S. File: InvestigatorDossier.jsx.

45.12 The player's own "You" card in Your Circle shows no Incapacitated or scars (F020)
Status: still present.
Cause: TactileSidebar.jsx:220-231, the self card, has no Standing; the others have it (:110).
Fix: Add <Standing inv={character} className="mt-0.5" /> after the role line.
Size: S. File: TactileSidebar.jsx.

45.13 The milestone log line says nothing of what it gives (F024)
Status: still present.
Cause: gm.py:128, "X milestone 3 reached!".
Fix: Done by 45.3: a milestone is named in the log only when the circle has Resource Management, where its line says what is earned back.
Size: in 45.3. Server (log text only).

45.14 With an amendment kept in the draft, closing the reports leaves the card showing the unsent ticks, with no Report sent stamp (F025)
Status: still present.
Cause: CircleView.jsx:524-525, showFiled = !!myReport && !amending, whatever reports_open says.
Fix: showFiled = !!myReport && (!amending || !circle?.reports_open), so a closed report shows the filed ticks and the stamp. The draft stays stored and comes back if the reports reopen.
Size: S. File: CircleView.jsx.

45.15 The "scroll to the new scar" never runs on the player's sheet (F005)
Status: still present.
Cause: scarLinesRef is attached only to the edit-mode list (InvestigatorDossier.jsx:1477); the read list (:1496) has no ref, so the effect at :567-575 finds null.
Fix: Put ref={scarLinesRef} on the read-mode scars-lines div too (the two are never drawn together).
Size: S. File: InvestigatorDossier.jsx.

45.16 The waiting investigator's sheet cannot be opened from the hub (F021)
Status: needs a decision.
Cause: PlayerRegistryPage.jsx:152 is a plain <p>. The hub has no sheet view for any investigator outside a desk (unaffiliated ones neither), so this is a new read-only sheet on the hub, not a missing handler.
Recommendation: Leave it out and add to #16: "An investigator waiting to join, or not in a campaign, has no sheet view on the hub; the sheet opens on the desk." If Robert wants it, it is a separate item: InvestigatorDossier readOnly in a dialog from the Registry rows (M, and the Dossier reads desk state).

45.17 On a phone the waiting row's Check again is 30px tall beside the 44px Withdraw (F022)
Status: still present.
Cause: PlayerRegistryPage.jsx:158-165 has no min-height.
Fix: Add "min-h-[36px] [@media(pointer:coarse)]:min-h-[44px]", as Withdraw has.
Size: S. File: PlayerRegistryPage.jsx.

45.18 The locked Last Played tome explains itself only in a hover title (F027)
Status: still present.
Cause: LastPlayedTome.jsx:26-31, role img with a title attribute; not focusable, a tap shows nothing.
Fix: Put an InfoTerm under the locked tome ("Last Played" with the slip "Opens here once you have played a session."), or make the tome a button with aria-disabled that toggles that caption. Keep the aria-label.
Size: S. File: LastPlayedTome.jsx (and its place in CampaignSelector.jsx if the term sits outside the tome).

45.19 The path card's arrows and "1 / 10" are under the sticky footer on 360x705, 375x667 and 390x667 (F028)
Status: still present (the sizes were last changed before the re-check).
Cause: At 360 wide "Choose Your Path" (CharacterCreator.jsx:819-821, text-3xl with wide tracking) wraps to two lines, and the deck's short-screen size (:827, 140px under 760px tall) is not small enough under about 700px.
Fix: Title text-[26px] below 400px wide so it stays on one line, mb-6 to mb-3 on short screens, and add max-lg:[@media(max-height:700px)]:[--card-w:120px]. Check at 360x705, 375x667, 390x667 and 1366x768.
Size: S. File: CharacterCreator.jsx.

45.20 The Handwriting help prints the word twice, and on a phone its slip is cut off at the dialog's edge (F029)
Status: still present.
Cause: JoinCampaignForm.jsx:60-63, a "Handwriting" label span and an InfoTerm also labelled "Handwriting"; default slip width overflows the dialog.
Fix: One label: make the InfoTerm the label (keep the id on a wrapping span for the trigger's aria-labelledby), and give it slipClassName "left-0 top-full mt-1 w-[min(16rem,calc(100vw-5rem))]".
Size: S. File: JoinCampaignForm.jsx.


==================================================================
Issue #60, UX section (third playtest, 12 October)
==================================================================

60.4 Approval reaches the hub only as a 12-second notice (hub-approval-feedback)
Status: still present.
Cause: usePendingApprovalWatch.js:34-35 sets a passing hub notice; the investigator then sits in the Active list like any other.
Fix: Remember the ids that just went from pending to active (a small set in the hook or the store, cleared by Play) and mark that row in the Registry with "Let in: press Play" (a stamp, not a subline). On the waiting row, the Withdraw-style title or an "i" says the hub checks by itself every few seconds.
Size: S. Files: usePendingApprovalWatch.js, PlayerRegistryPage.jsx.

60.5 The keep-a-die choice is a moving target and each choice is announced twice (keep-die-moving-duplicate)
Status: still present.
Cause: While a gilded choice waits, each candidate die is a role=button with the same label as its line in the slip (DiceTray.jsx:184-207 and :63-72), and it shimmies (animate-liftShimmy) under the pointer.
Fix: The slip's lines are the one named control: the dice become aria-hidden and leave the tab order (still clickable for a pointer), data-keep-die moves to the first line so FocusFollowsRoll (:148-149) still lands there, and the shimmy stops on hover and focus (hover:animate-none).
Size: S. File: DiceTray.jsx.

60.6 Nothing says drives do not refill at End Assignment; the Lightkeeper's Reset has no rule beside it (drive-refill-unexplained)
Status: still present.
Cause: SceneManager.jsx:20, the ENDS text behind End Assignment's "What ending does" i, does not mention drives; GMCharacterSheet.jsx:353-369 Reset has no help.
Fix: Add "Drives carry over; a Refresh restores them." to the End Assignment i. Beside Reset, an InfoTerm "i": "Refills this investigator's drives and resistance and clears ability uses. For a correction or a new session; the rules restore drives with a Refresh." Reset 44px on touch (min-h-[40px] now).
Size: S. Files: SceneManager.jsx, GMCharacterSheet.jsx.

60.7 After End Assignment the player's tray still shows the last scene's roll and "Roll settled" (tray-old-roll-after-end)
Status: still present.
Cause: On the assignment change the store sets lastRollSettled true and keeps the roll (gameStore.js:998-1000). After a reload the server replays it, marked settled (rolls.py send_held_roll :113-131), because End Assignment leaves _shown_roll.
Fix: In that circle_update branch, clear lastRoll, lastRollKept and the dismissed prompts instead (leave a pending gilded choice alone). On the server, settle_rolls(held=True) also drops the campaign's _shown_roll entries that are not a held gilded roll (store campaign_id in the entry at rolls.py:261). Flip or extend the replay tests in test_ws_rolls.py.
Size: M. Files: gameStore.js, rolls.py. No protocol change.

60.8 "A choice is waiting" stays on Dice and log when only the optional burn is left (choice-waiting-badge-burn)
Status: still present.
Cause: postRollChoiceWaiting (gameStore.js:293-304) returns true for a burn as for a gilded die; DeskDrawer.jsx:184-193 shows the dot and "a choice is waiting".
Fix: Return 'keep', 'burn' or false. 'keep' keeps the oxblood dot and the words; 'burn' gets a hollow dot and the label "Dice and log, burn and reroll available".
Size: S. Files: gameStore.js, DeskDrawer.jsx.

60.9 Private pass notes are not marked clearly (private-note-cues)
Status: still present.
Cause: PassNotes keeps To: on the last recipient (PassNotes.jsx:9) with nothing loud; the store's logLine drops the payload's target (gameStore.js:272-279), so ActivityLog draws a private note like any line.
Fix: Keep target in logLine; ActivityLog marks a chat line whose target is not @Circle or @Environment with a small "Private" tag and a dashed rule. In PassNotes, when To: is a private recipient, show "Private" in oxblood beside it. Keep the recipient after sending (safer than switching back to @Circle, which could send a follow-up to everyone).
Size: S. Files: gameStore.js, ActivityLog.jsx, PassNotes.jsx.

60.10 A posted sketch is scaled down so its text labels are about 8px and Keep drawing is cut off (sketch-label-scale)
Status: still present in the code; not re-checked in a browser.
Cause: Text is drawn at Excalidraw's default size (SketchPad.jsx:132-141 sets no currentItemFontSize) and the picture is shrunk to fit 66cqh (NotebookView.jsx:255, :275-308); the Keep drawing row is not counted in that height.
Fix: Start text at a larger size (currentItemFontSize 28 in initialData) and make the picture's limit calc(66cqh - 3rem) so Keep drawing stays on the page. Check on the tablet and at 1366x768.
Size: M (needs a browser check). Files: SketchPad.jsx, NotebookView.jsx.

60.11 After a roll the drive stepper goes back to +0d and only the pips show a point was spent (nerve-stepper-spent-cue)
Status: still present.
Cause: The roll press resets preSpend (InvestigatorDossier.jsx:1217) and nothing says what went.
Fix: Keep {drive, n, at} when a roll spends drive and show "1 Nerve spent" beside that stepper for SPENT_SHOWN_MS, as AbilityUse does (:73-81); clear it if the roll is refused.
Size: S. File: InvestigatorDossier.jsx.

60.12 Learn from My Mistakes is offered even when every drive is full (lfmm-offer-drives-full)
Status: still present.
Cause: usePostRollPrompts.js:30-31 checks only the result.
Fix: Offer it only when some drive's current is below its max, and its drive picker (RollModifications.jsx:107-113) lists only those drives.
Size: S. Files: usePostRollPrompts.js, RollModifications.jsx.

60.13 End Assignment leaves the Timer switch on with an empty 0:00 face (timer-switch-after-end)
Status: still present.
Cause: handle_gm_end_assignment (gm.py:394-443) resets tension and dispatch but not the countdown.
Fix: Call countdown.apply_action(target_circle, "clear", None) and the hide action before the commit, so the circle_update it already sends turns the switch off. Test in test_ws_circle.py (or the timer tests).
Size: S. Server only.

60.14 On the upright tablet the recipient list opens upward, mostly off the screen (recipient-menu-offscreen-tablet)
Status: not reproduced in code; probably still present on a real tablet.
Cause: TargetDropdown.jsx:16-31 places and clamps the fixed list against window.innerHeight, the layout viewport; with the tablet keyboard up or the page zoomed, the visible area is smaller and offset.
Fix: Measure against window.visualViewport (height and offsetTop) when it exists, and prefer opening downward when there is room. Check once on a real tablet, as the line asks.
Size: S. File: TargetDropdown.jsx.

60.15 On the tablet the Handwriting list runs past the Join dialog and covers the sample line (handwriting-select-overflow-tablet)
Status: still present, partly: in the code the list is in flow (max-h-52, scrolling) inside a scrolling dialog, so it pushes the sample down rather than covering it, but it can run below the dialog's visible edge with no cue.
Cause: JoinCampaignForm.jsx:74-97; the dialogs are CharacterCreator.jsx:1604-1607 and UnaffiliatedCharacterRow.jsx.
Fix: On open, scroll the list into view (block nearest), cap it at max-h-40 on short screens, and keep the sample line above Cancel and Ask to join.
Size: S. File: JoinCampaignForm.jsx.

60.16 With a keyboard it takes 12 Tabs to reach the first drive stepper; no skip link; the disabled "one less" stepper takes focus (keyboard-path-to-actions)
Status: still present.
Cause: No skip link to the Actions header (InvestigatorDossier.jsx:1008-1011). The steppers use aria-disabled on purpose (keyboard-focus-dropped, :1045-1051), so they stay in the tab order at 0.
Fix: A visually hidden "Skip to actions" link at the top of the sheet, shown on focus, to the Actions heading (tabIndex -1). Give "one less" tabIndex -1 while at 0 (it keeps focus if it is pressed down to 0, so the old bug does not come back). While there: the steppers are 32px on phones (w-8 h-8 below md); make them 44px.
Size: S. File: InvestigatorDossier.jsx.

60.17 A Your Circle card shows a proposed relationship almost as if agreed (pending-rel-looks-agreed)
Status: still present.
Cause: TactileSidebar.jsx:116-121 marks it only with sepia pencil, an empty stamp outline and an sr-only "(not yet accepted)".
Fix: Print "Proposed" in small capitals inside the empty stamp outline (visible), and drop the sr-only text.
Size: S. File: TactileSidebar.jsx.

60.18 The shared Chapter House box saves silently (chapter-house-no-saved)
Status: still present, partly: the "Shared" i is there (CircleCreationPopup.jsx:399-401).
Cause: The box saves on blur (:173-177, :403-411) with no status, unlike the personal answer (:291).
Fix: Under the box, a role=status line like the personal answer's: "Saved" once the circle's chapter_house equals what this desk sent, "Not saved yet" while the draft differs, nothing before anything is typed.
Size: S. File: CircleCreationPopup.jsx.

60.19 The Lightkeeper's "Waiting for an answer from" line gives counts for some names only (rel-waiting-line-counts)
Status: still present.
Cause: CircleFormationStatus.jsx:102-105 adds "(k relationships)" only when k > 1.
Fix: Every name gets its count: "Waiting for an answer from Ada (1), Bram (2)" (no-break spaces kept).
Size: S. File: CircleFormationStatus.jsx.

60.20 A long circle name suggestion is cut to about 80 characters with no counter (circle-name-silent-cut)
Status: fixed. CircleCreationPopup.jsx:304 has maxLength 80 and :321 shows "n/80 characters" from 60. Tick the line.

60.21 The notebook's Preview button keeps its label while previewing (notebook-preview-label)
Status: still present (the pressed look was there at run 3 and players still missed it).
Cause: PreviewToggle (MarkdownMarks.jsx:159-170) always reads "Preview".
Fix: Read "Edit" while previewing (aria-pressed stays).
Size: S. File: MarkdownMarks.jsx.

60.22 On a phone, a tap on a fourth gear item shows nothing where the finger is; the limit message is off-screen (gear-limit-feedback-offscreen)
Status: still present in a new form: since #64 (detection, not prevention) the fourth item does tick, but the only over-limit sign is "4 / 3 selected" in the footer, below the fold.
Cause: InvestigatorDossier.jsx:1606-1660, footer in normal flow at the foot of a long scrolling dialog.
Fix: Make the footer (count, Cancel, Save gear) sticky at the dialog's foot on the dialog's paper, and when the count is over, say "Over the limit of 3" there in oxblood. Nothing blocks.
Size: S. File: InvestigatorDossier.jsx.

60.23 The creator summary shows drive totals without their sources (creator-drive-breakdown)
Status: still present.
Cause: CharacterCreator.jsx:1492, "Nerve 4, Cunning 3, Intuition 2".
Fix: "Nerve 4 (2 from Soldier, 2 placed), ..." from the specialty's start values the drive step already uses (:1358).
Size: S. File: CharacterCreator.jsx.

60.24 The sign-in page leaves a dark band under the map, and at 1366x768 Create an account is below the fold (signin-fold-band)
Status: probably still present (only text changed in LoginScreen since run 3); needs a browser check.
Cause: LoginScreen.jsx:611 main py-10 sm:py-14 plus the slip's own padding (:616); the band is likely the page growing past the fixed map on short screens.
Fix: Tighter padding on short screens ([@media(max-height:820px)]:py-4 on main, smaller slip padding), so the slip with both buttons fits 1366x768; the map stays fixed inset-0, and the body background stays the map's night.
Size: S (browser check at 1366x768 and 1440x900). File: LoginScreen.jsx.

60.25 The Google button's frame has no accessible name, and the sign-up screen still says "Sign in with Google" (google-frame-unnamed)
Status: still present.
Cause: GoogleButton (googleSignIn.jsx:65-72) leaves Google's iframe untitled; LoginScreen.jsx:576-579 uses signin_with and "or sign in with Google" on both screens.
Fix: After renderButton, set the iframe's title ("Sign in with Google" or "Sign up with Google"). On the Enlist screen pass text="signup_with" and head it "or sign up with Google".
Size: S. Files: googleSignIn.jsx, LoginScreen.jsx.


==================================================================
Decision lines (left out of the round)
==================================================================

45.16 Waiting investigator's sheet from the hub. Recommendation: do not build it now; add to #16 that an investigator outside a desk (waiting or not in a campaign) has no sheet view on the hub. Robert may instead want a read-only sheet dialog from the Registry rows, as its own M item.

Calls made here without asking, for the PR to flag: 69.4 keeps both loss warnings in one sentence (nothing behind an "i"); 45.3/45.13 name a milestone in the log only for a circle with Resource Management; 60.9 keeps the private recipient after sending and marks it loudly rather than switching To: back to @Circle; 60.13 clears and hides the timer at End Assignment.


==================================================================
Groups for parallel worktrees
==================================================================

Group A: the Lightkeeper's desk and the server (15 lines)
Lines: 69.3, 69.4, 69.7, 69.8(b), 45.1, 45.2, 45.3, 45.4, 45.5, 45.6, 45.7, 45.13, 60.6, 60.13, 60.19.
Files: gm/OperationsPanel.jsx, shared/TableStrip.jsx, gm/SceneManager.jsx, gm/desk/GMDeskHeader.jsx, pc/MainDeskView.jsx (title header only, :136-171), gm/desk/InvitePlayer.jsx, gm/desk/CorrespondenceStack.jsx, gm/GMCharacterSheet.jsx, gm/desk/FinalizeRosterSlip.jsx, gm/desk/CircleFormationStatus.jsx. Server: vtt/ws/handlers/gm.py, vtt/ws/access.py, models.py, vtt/db.py. Tests: test_ws_circle.py, test_00_startup.py (69.3 column), test_access.py if 69.7's refusal is tested there.
Server: yes (gm.py log text, End Assignment timer, access refusal, one new column). No protocol change.

Group B: the player's sheet, Circle page and Notebook (16 lines)
Lines: 69.1, 69.2, 69.5, 69.6, 69.8(a), 45.11, 45.12, 45.14, 45.15, 60.10, 60.11, 60.16, 60.17, 60.18, 60.21, 60.22.
Files: pc/InvestigatorDossier.jsx (most lines), pc/SheetEditor.jsx, pc/CircleView.jsx, pc/TactileSidebar.jsx, pc/CircleCreationPopup.jsx, shared/NotebookView.jsx, shared/sketch/SketchPad.jsx, shared/MarkdownMarks.jsx.
Server: none. Reads the store, does not change gameStore.js.

Group C: dice and log, hub, creator and sign-in (18 lines)
Lines: 45.8, 45.9, 45.10, 45.17, 45.18, 45.19, 45.20, 60.4, 60.5, 60.7, 60.8, 60.9, 60.12, 60.14, 60.15, 60.23, 60.24, 60.25.
Files: pc/DiceVault.jsx, pc/dice/RollModifications.jsx, pc/dice/DiceTray.jsx, game/outcomes.js, pc/dice/usePostRollPrompts.js, pc/DeskDrawer.jsx, pc/dice/PassNotes.jsx, pc/dice/ActivityLog.jsx, pc/dice/TargetDropdown.jsx, store/gameStore.js, campaignSelector/PlayerRegistryPage.jsx, campaignSelector/usePendingApprovalWatch.js, campaignSelector/LastPlayedTome.jsx, CharacterCreator.jsx, shared/JoinCampaignForm.jsx, LoginScreen.jsx, shared/googleSignIn.jsx. Server: vtt/ws/handlers/rolls.py. Tests: test_ws_rolls.py.
Server: yes (rolls.py). Protocol: 45.10 adds one optional field (roll.abilities) to roll_result; WEBSOCKET.md row.

Shared between groups
- No source file is edited by two groups. 69.8 is split by file: (a) InvestigatorDossier.jsx in B, (b) the two headers in A. 45.10's chip reset (InvestigatorDossier.jsx:1218) is left alone; C works from the server's field.
- gm.py and access.py are A only; rolls.py is C only (60.7's server half lives in settle_rolls there, not in End Assignment).
- gameStore.js is C only (60.7, 60.8, 60.9). A and B must not edit it.
- Docs may meet at merge: WEBSOCKET.md (A for the 69.7 refusal, C for 45.10), QUIRKS.md and FAQ.md (A for the log lines and End Assignment, C for the tray), DESIGN.md (any group adding a pattern, such as A's sticky stamp row or B's skip link). Each group should touch only its own paragraphs; conflicts there are text-only.
- test_ws_circle.py is A only; test_ws_rolls.py is C only.

Order of merge: any; A carries the only database change (69.3), which is independent.

Browser checks the implementers should run: 45.4/45.5 at 1440x761 and 1280x720; 69.8(b) at 1024 to 1279 wide; 45.19 at 360x705, 375x667, 390x667; 60.10 tablet and 1366x768; 60.24 at 1366x768; 60.14 on a real tablet if one is to hand (otherwise flag it as unchecked).
