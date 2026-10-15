Fix round 8 triage: issues #72 to #87 and the lines of #88 (15 October 2026)

Read on main 1bc48a0 (fix round 7, PR 71). Read only: nothing was edited, run or started. Line numbers are from that commit; confirm them before editing. Binding: decisions8.md (this round), decisions_fix4.md, decisions_fix5.md, decisions_fix6.md, decisions_fix7.md, decisions_run4.md and issue16.md. Nothing below removes or weakens any of them. No issue has comments.

Ids: #72 to #87 by issue number. #88: 88.1 to 88.21 are the 21 verified lines in order; 88.u1 to 88.u28 the unverified lines in order; 88.i1 to 88.i4 the ideas. D10 is decision 10 of decisions8.md (the burn preview label), which has no issue of its own. Each #88 line carries its cluster id from the fourth playtest report.

Counts
- #72 to #87 (16): still present 15 (#73, #74, #77, #81, #82, #86 with Robert's decision now taken); #84 still present as reported, but the code at 1bc48a0 already has "Play" twice in the button's content, so read the computed name in a browser first.
- 88.1 to 88.21: still present 20 (88.3 and 88.12 decided); 88.15 probably fixed already in code (the Lightkeeper's desk renders the same ConnectionBanner with Use this tab), needs a browser check.
- 88.u1 to 88.u28: 88.u11 decided (decision 9, in scope); cheap 13 (u3, u7, u8, u9, u12, u13, u14, u17, u20, u21, u25, u26, u27); skip 14.
- Ideas: cheap 2 (i1, i3); skip 2 (i2, i4).

Server, protocol and schema at a glance
- Database columns (characters): scar_pending (#72), let_in (88.7). Both by add_columns in vtt/db.py, as held_mark was. No new table.
- REST response schema: CharacterRosterItem gains held_marks (88.1) and let_in comes with the character dict (88.7); tests/data/openapi.json and the field lists in tests/support.py and test_investigators.py follow.
- WebSocket: no new message type. Changed behaviour, all documented in WEBSOCKET.md: activity_history is sent on every connect, empty included (#78, the end of the connect replay); open Non-Combatant points are sent again on connect (#79); new refusals on roll (#80), revive_character from a player (#82), submit_assignment_report from the dead (#76), update_circle charter fields before the seal (#74), spend_resource while closed (decision 9, it was silent); new optional fields: let_in on the character (88.7), amended_at on a report (88.u12).
- JSON inside existing columns, no migration: departed members' spend counts (#77) and the "spending closed by End Assignment" flag (decision 9) in circles.backstory_answers.


==================================================================
Issues #72 to #87
==================================================================

#72 A scar owed is lost on a server restart (scar-owed-lost-on-restart)
Status: still present.
Cause: backend/vtt/serializers.py:16-17, awaiting_scar is a module set in memory. It is added at marks.py:298 (apply_mark, fourth mark), cleared at character.py:111 (handle_apply_scar), read at serializers.py:104 (scar_pending), campaigns.py:671 (roster to_item) and rolls.py:857 (Resuscitation counts an owed scar).
Fix: A Boolean column characters.scar_pending (models.py beside held_mark; db.py add_columns "BOOLEAN DEFAULT FALSE"). marks.py:298 sets character.scar_pending = True before its commit (move the set above db.commit() at :296); handle_apply_scar sets it False in its commit; a death (is_dead) clears it. serializers.py:104, campaigns.py:671 and rolls.py:857 read the column; delete awaiting_scar and its imports. Keep the browser's pendingScar banner as is (it now agrees with the server after any reload). Test: deal a fourth mark, Decide later, clear the module state as the restart tests do, reconnect, and scar_pending is still true on the sheet and the roster item; recording the scar clears it.
Size: M. Server and DB schema (one column). No protocol change (scar_pending keeps its name and shape).
Note: the Lightkeeper's trauma Edit of scars (gm_update_scars) and the player's Edit sheet scars (sheet_edits.apply_edit) do not clear it today either; leave them (the scar form is the way an owed scar is recorded, issue16.md), but a scar_pending left true on a dead sheet is cleared by the death.

#73 A death lowers the resource maximum without telling any desk (death-lowers-resource-max-silently)
Status: still present. Decided (decisions8 1): a death lowers the maximum and the pools at once, exactly as a release does; every desk updates live; one log line.
Cause: character.py:99-160 handle_apply_scar commits the death and sends character_update, member_status and the death line, but never lowers the pools or sends circle_update. resource_pool (circle_queries.py:26-39) already counts the living only, so the next reader sees "4 of 3".
Fix: In handle_apply_scar, when the character dies now (is_dead and not was_dead) and belongs to a campaign: lock the campaign's circle (db.query(Circle).filter(Circle.campaign_id == ctx.camp_id).populate_existing().with_for_update().first()) before the commit, and if circle.is_finalized call lower_resources_to_pool(circle, db) (it already runs cap_earn_backs). After the commit, broadcast circle_update to the campaign (always, even when nothing was above the new pool, so every desk shows the new maximum). If any pool came down, one line after the death line: "Stitch, Refresh and Train now hold at most 3 each." (n from resource_pool). announce_downed's own circle_update can then be skipped for a death to avoid two frames, or left (harmless). Test: sealed circle of 3 at 4/4/3, a fourth scar kills one: every socket gets circle_update with 3/3/3 and the line; a reload reads 3 of 3.
Size: M. Server only. No protocol change.
Notes: Nothing goes up when a death is lifted (the Lightkeeper's scar Edit removing the fourth scar) or when the replacement is approved, as after a release (decisions_fix4 1: nothing is refunded and nothing goes up). Say so in FAQ.md beside the release paragraph.

#74 The Lightkeeper's chapter house before the seal replaces the players' answer (lk-charter-editable-before-seal)
Status: still present. Decided (decisions8 2): the charter (name, chapter house, ability) is read-only on the Lightkeeper's desk until the seal; the players' chapter house answer wins and the desk shows it.
Cause: routers/circles.py:271-281 copies the formation answer only "if not circle.chapter_house_location"; gm.py:512-529 handle_update_circle has no is_finalized check; gm/CirclePage.jsx:390-406 (EditableLine for name and house) and :471-484 (ability select and Clear) have no guard. InsigniaStamp.jsx:20 already waits for the seal.
Fix: (1) circles.py finalize: house = formation answer stripped; if house: circle.chapter_house_location = house (the players' non-empty answer always wins; a Lightkeeper's text stays only when they wrote nothing). (2) gm.py handle_update_circle: before the seal, refuse a payload that names name, chapter_house_location, circle_ability or insignia with action_rejected 409 "Decided in the formation papers until the seal." (the other fields, illumination and resources, go on as today). (3) CirclePage.jsx: before the seal the name, house and ability are text, not controls: the name from the leading suggestion or "Not named yet", the house from circleCreation.backstoryAnswers.chapter_house (as CircleFormationStatus.jsx:87 reads it), the ability "Chosen by vote", and one line "Decided in the formation papers until the seal." behind an "i" on the paper's head (help on demand). Tests: test_circle_rest.py finalize with both texts keeps the players'; test_ws_circle.py update_circle before the seal is refused.
Size: M. Server (circles.py, gm.py) and protocol (a new refusal on update_circle; WEBSOCKET.md 4.2 row).

#75 The Edit sheet log line hides a change late in a long field (edit-sheet-log-truncates-identically)
Status: still present.
Cause: sheet_edits.py:42 SHOWN_MAX = 40; _shown (:132-136) cuts each value on its own; apply_edit (:211) shows both cut halves, which are equal when the change is past character 40.
Fix: A helper _changed_part(old, new) for TEXT_FIELDS (and role, specialty, ability names as text): drop the common prefix and suffix (on word boundaries), and show "..." plus the differing middle of each (each clipped to SHOWN_MAX), so "style ...many pockets to ...many pockets, a brass key". When the old part is empty say "added ...". Lists (gear, abilities, scars) keep _added_removed with the 40 cut. Test in test_ws_sheet_edits.py with a change after character 40, and one in the middle.
Size: S. Server only (log text).

#76 A dead investigator can still file and amend a report (dead-can-file-report)
Status: still present.
Cause: ws/access.py:551-556 DEAD_REFUSED lacks submit_assignment_report; circle.py:52-57 re-reads the reporter under the circle's lock but checks only status and campaign; pc/CircleView.jsx (the report form around :844) shows Send report on a dead desk.
Fix: Add "submit_assignment_report" to DEAD_REFUSED (409 "<name> is dead: the sheet is a record.", the existing wording). In the handler's re-read add "or reporter.is_dead" with the same refusal (the death can commit between the access check and the lock). CircleView: no report form on a dead desk (a filed report still shows as filed). Keep game/roster.js:12-13 reportingMembers as it is: a report filed before the death keeps its card on purpose (aa23d98); after this fix nothing new can be filed. FAQ.md:147's refusal list gains the report.
Size: S. Server and protocol (a refusal; WEBSOCKET.md 4.6 report row). Split by file: access.py in group A, circle.py in group C, CircleView.jsx in group D.

#77 Leaving and rejoining in one assignment resets the spend count (leave-rejoin-resets-spend-count)
Status: still present. Decided (decisions8 3): a member who leaves and rejoins within one assignment keeps their spend count for that assignment.
Cause: routers/campaigns.py:388 release_member calls release_from_campaign (assignment.py:95-100), which calls end_assignment_for (:83-92) and zeroes resources_spent_assignment; engine.py:79-115 approve_investigator and campaigns.py:509-522 rejoin carry a count only from a predecessor still active (#41).
Fix: In release_member, before release_from_campaign, store the leaver's count in the circle's answers for the current assignment: answers["departed_spends"][str(char.id)] = count (assignment.py helpers, a new dict as answers_of does, only when count > 0). clear_paperwork (assignment.py:~60) pops "departed_spends", so End Assignment ends it. On approval (approve_investigator) and on rejoin, read the campaign circle's answers and take max(current, departed_spends[str(id)]), then pop that entry. Keep release_from_campaign zeroing the character (it may join another campaign). Strip "departed_spends" in without_reports (assignment.py) so players' circle frames do not carry it. Test in a new test file: spend two, leave, ask again, approve: count 2; across End Assignment: 0.
Size: M. Server only. No DB or protocol change (JSON key in backstory_answers).
Interaction: same rule as #41's predecessor carry-over; End Assignment's reset is unchanged (decisions_fix4 2).

#78 After a restart a refused gilded keep still shows an outcome and offers Burn; Burn offered after a live reconnect (gilded-keep-after-restart-shows-outcome, live-desk-burn-after-restart)
Status: still present.
Cause: store/gameStore.js:1166-1171 on a refused resolve_gilded clears pendingGildedChoice only; DiceVault.jsx:96-125 keeps its local kept state (handleDieClick setKept) and shows the locally kept die and outcome, and canResist (:79) still offers Burn. After a reconnect, endpoint.py:155-166 sends the held roll only when the server has one (rolls.py:91-130 send_held_roll); when it has none the desk keeps its tray as it was, and nothing tells it the roll is gone.
Fix: (1) On the resolve_gilded refusal: lastRollKept null, lastRollSettled true, rollError the server's words, and bump a rollLost counter that DiceVault watches to clear its local kept state; the slip then shows the dice with no outcome and "Roll settled". (2) Server: endpoint.py sends activity_history on every connect, entries possibly empty (change "if history:" at :163). Store: on socket open with keepLog remember the roll the tray shows (lastRoll id); a roll_result replay clears that memory; when activity_history arrives with the memory still set, the server holds no roll for this desk: set lastRollSettled true and say once "That roll was lost when the server restarted." (no dice sound, the dice stay). A keepLog connect that gets an empty history keeps its lines (do not empty the log for an empty list). WEBSOCKET.md section 1/5 says activity_history always closes the connect frames.
Size: M. Client (gameStore.js, DiceVault.jsx), server one line (endpoint.py) and protocol (activity_history always sent).
Interaction: #72 and #79 are the other restart holes (decisions_fix6 1 and 2). #80's guard lives in memory too: after a restart nothing is held and the desk is told by this fix.

#79 Non-Combatant drive point offers: lost on reload, silent after a restart, logged for a full drive
Status: still present (all three parts).
Cause: marks.py:111-113 _non_combatant keeps only deadlines per ally; send_open_intercepts (:473-495) re-sends Behind Me and Premonitions only. gameStore.js:109-115 withoutIntercepts drops only offers with intercept set, so on socket open (:848) the Non-Combatant card stays; the refusal ("No Non-Combatant drive point is waiting.", marks.py:698) reaches the store, but abilityMarkRefused is set only while markAnswerOut (:1176-1179), so the card closes with no word. marks.py:690-706 clamps the drive but logs "recovered 1" and uses the point whatever came back.
Fix: (1) Server: keep each point as {deadline, doctor_id, doctor_name, mark_type} (adjust _offer_non_combatant :336-361, forget_points :363, _point_waiting :370 and the resolve branch to read deadlines from the dicts). send_open_intercepts also sends each open point to that ally as ability_mark_offer (ability Non-Combatant, action drive_refresh, expires_in = seconds left). (2) Server: a drive already at its maximum is refused 409 "<Drive> is already full." and the point stays waiting; the log says only what came back. (3) Store: on socket open drop Non-Combatant cards with the intercept cards (a separate predicate; intercept_offer_closed must keep dropping intercepts only); a refused resolve_ability_mark for Non-Combatant shows on the card's place as interceptRefused does ("NON-COMBATANT NOT USED" plus the reason, as Premonitions, FAQ.md:120). (4) AbilityMarkOffer.jsx:243-258: a full drive is shown full and cannot be picked (Adrenaline Rush's picker too). Tests: a reload inside the window gets the card back with the time left; a full drive is refused and the point kept. QUIRKS.md: after a restart a Non-Combatant point expires like the other ally offers (decisions_fix6 1).
Size: M. Server (marks.py), client (gameStore.js, AbilityMarkOffer.jsx), protocol (offers re-sent on connect, a new refusal; WEBSOCKET.md 4.5).

#80 The server takes a new roll while a gilded choice is waiting (server-takes-roll-over-gilded-choice)
Status: still present.
Cause: rolls.py:473-497 handle_roll checks the roll_id replay (:477-481) and the action, never _pending_gilded.
Fix: After the ACTION_KEYS check (:496-498), if character.id in _pending_gilded: refuse 409 "Keep a die from your last roll first." (the roll_id replay stays first, so a resend of the held roll is still answered). The store's failRoll already shows a roll refusal. Test in a new test file. FAQ.md:18 already says the server holds the dice; add the refusal.
Size: S. Server and protocol (a refusal on roll).

#81 A mark dealt beside a stored Death Defy hold lands, and the old offer comes back (dealt-mark-beside-held-death-defy)
Status: still present. Decided (decisions8 5): the held mark lands first and its offer closes (WEBSOCKET.md 4.5), then the new mark is dealt normally; the old offer never comes back.
Cause: marks.py:643-651, the Lightkeeper's take_mark when no desk is open, calls apply_mark directly and leaves held_mark stored; mark_or_offer (:593-632) is the path that lands a held mark first, but it is skipped here.
Fix: In that branch, before apply_mark: held = _take_held(ctx, character, commit=True); if held, send mark_offer_closed to the character's channel (harmless with no desk) and await _land(ctx, character, held, key); then the existing dealt line and apply_mark. A held "escape" stage is landed too, not joined (the decision). Test: hold for Death Defy, close the desk, deal a mark: both land, held_mark is None, a desk that opens gets no offer.
Size: S. Server only.
Interaction: the landed held mark can be the fourth: its owed scar is then stored by #72.

#82 A player can Revive their own investigator (player-can-self-revive)
Status: still present. Decided (decisions8 4): only the Lightkeeper may Revive; the server refuses a player's; the player's sheet does not offer it; the log names who revived.
Cause: InvestigatorDossier.jsx:1467-1474 shows Revive when !readOnly; ws/access.py lets a player's own revive_character through (it is in GM_MAY_TARGET :89-92, and a player's own socket passes check_target); character.py:163-185 logs "<name> has been revived and is operational." for either.
Fix: access.py: a player socket sending revive_character is refused 403 "Only the Lightkeeper revives an investigator." (a small check in check_message, beside _dead_sheet). character.py: the line becomes "The Lightkeeper revived <name>." (only she can now). InvestigatorDossier.jsx: show Revive only when readOnly && traumaEdit?.revive. FAQ.md:137 and :147 already describe it as the Lightkeeper's; say the player cannot. Tests: refused from a player; the log line.
Size: S. Server, client, protocol (a refusal). Split by file: access.py and character.py in group A, InvestigatorDossier.jsx in group E.

#83 A second Lightkeeper tab keeps a request pop-up and count already handled (lk-second-tab-stale-request)
Status: still present.
Cause: gameStore.js:1328-1353 investigator_approved updates active_investigators but leaves pending_investigators; OperationsPanel.jsx:88-100 expects the pending list to shrink.
Fix: In investigator_approved, also filter the approved character's id out of campaignRoster.pending_investigators. The pop-up (useNewRequests over pending), the Requests count and the open sheet's "no longer waiting" line then follow.
Size: S. Client only (gameStore.js).

#84 The let-in Play button has no "Play" in its accessible name (let-in-button-name)
Status: still present as reported in the re-check; but at 1bc48a0 PlayerRegistryPage.jsx:117-141 has "Let in: press Play" in the stamp and "Play" in the trailing span, so the computed name should hold Play twice. Read the name in a browser first.
Fix (either way, it makes the name clean): give the button aria-label "Play <name>, <campaign>" and aria-describedby the stamp's id, so the stamp is extra text, not the name.
Size: S. Client only.

#85 WEBSOCKET.md still says the desk never reconnects (websocket-doc-says-no-reconnect)
Status: still present (WEBSOCKET.md:321 and R7 :358).
Fix: Section 7: connect() closes the previous socket; onclose reconnects with backoff 1, 2, 4, 8, 15 s, a heartbeat ping (pong) finds a dead socket, 1001 means replaced (banner with Use this tab), 4401 ends the session, 4403 and 4404 stop. R7: a restart drops every socket; the desks reconnect by themselves; what survives a restart is listed in QUIRKS.md (log, held marks, owed scar after #72). Also note #78's activity_history in section 1.
Size: S. Docs only.

#86 The Lightkeeper cannot see a player's open burn (lk-cannot-see-open-burn)
Status: still present. Decided (decisions8 6): a mark on that player's slip on the felt, not a line by Roll.
Cause: DiceVault.jsx:53 shows the newest table roll (tableRoll) with no burn state; gameStore.js keeps no flag for whether that roll is still open.
Fix: Store: tableRollSettled, false when dice_thrown sets tableRoll (:1083-1110), true at the assignment change in circle_update (:995-1000, where lastRollSettled is set) and when a replayed dice_thrown carries settled. DiceVault: on the Lightkeeper's felt, when the shown roll is a player's (character_id set), its outcome is below full success, and not tableRollSettled, stamp the slip "Burn open" (a small stamp beside the roller's name, with an "i": "An open roll from you ends it."). Her own open roll replaces the felt roll (tableRoll null), so the stamp goes; End Assignment keeps the roll on the felt (decisions_run4) but takes the stamp.
Size: M. Client only (gameStore.js, DiceVault.jsx).

#87 Several in-play controls are under 44px on touch (touch-targets-under-44)
Status: still present.
Cause: RollModifications.jsx:107-135 Use, Skip and the drive picker (py-0.5); ScarModal.jsx radios (:138) and Lower/Raise rows (:205-213); RelationshipNegotiation.jsx:156 Accept (primaryButton); AbilityMarkOffer.jsx:243-258 drive picker (py-1.5).
Fix: "[@media(pointer:coarse)]:min-h-[44px]" on each (min-w-[44px] for the small ones); ScarModal rows as 44px labels with the radio inside. No visual change on a mouse.
Size: S. Client only. Split by file: RollModifications.jsx and AbilityMarkOffer.jsx in group B; ScarModal.jsx and RelationshipNegotiation.jsx in group E.

D10 Burn preview label (decisions8 10, report decision 8, burn-preview-omits-drive-die)
Status: decided, to build.
Cause: RollModifications.jsx:76-80, the InfoTerm label `${action}: ${pool}`.
Fix: label `Reroll: ${action}, ${pool}` ("Reroll: Survey, 2 dice"; "Reroll: Move, 2 dice, lowest counts"), ariaLabel to match. FAQ.md:74 and DESIGN.md:489 name the label.
Size: S. Client only.


==================================================================
Issue #88, verified lines (88.1 to 88.21)
==================================================================

88.1 The roster card shows nothing while a dealt mark is held (lk-roster-card-no-held-mark)
Status: still present.
Cause: campaigns.py:664-671 to_item has no held marks; schemas.py CharacterRosterItem has no field; glanceOf (InvestigatorBusinessCard.jsx:22-33) reads none. Live member_update sheets already carry held_marks (serializers.py:110), so only the REST roster lacks it.
Fix: to_item adds held_marks=held_marks(c) for the Lightkeeper; CharacterRosterItem held_marks: list = []; glanceOf adds "Bleed mark held: Death Defy?" (type and ability from held_marks). openapi.json snapshot.
Size: S. Server and REST schema.

88.2 No desk shows that a once-per-assignment ability is used (lk-sheet-no-ability-used)
Status: still present.
Cause: InvestigatorDossier.jsx:498-509 renderAbilityUse returns null on a read-only sheet and handles only ABILITY_USES and SCAR_ABILITIES; Death Defy (counted at marks.py:779) has no Use button, so nothing reads ability_uses for it.
Fix: A small ONCE_SHOWN set in game/abilityUses.js: the ABILITY_USES and SCAR_ABILITIES names with once, plus Death Defy. On both the player's sheet and the read-only copy, an ability in it with ability_uses[name] >= 1 shows "Used this assignment." under its text (the line ScarAbilityUse already uses at :210). Learn from My Mistakes is not per assignment in the app (once per roll), so it gets nothing.
Size: S. Client only.

88.3 Add N Illumination is one press while reports are unfiled (add-illumination-one-press)
Status: still present. Decided (decisions8 7).
Cause: gm/CirclePage.jsx:552-557, a plain button.
Fix: While notFiled is non-empty, the button is a ConfirmAction: "Press again to add 2 Illumination without their keys." / "Add" (the Not filed line stays above it); with every report filed it stays one press. FAQ.md:248 ("adds it with one press") says so.
Size: S. Client and docs.

88.4 The formation papers show no done mark per part (formation-parts-no-done-state)
Status: still present.
Cause: CircleCreationPopup.jsx:51-60 Section has no done state; the phone strip's numerals name nothing.
Fix: Section takes done; a part is done for this player when they have voted (name, ability, insignia, question), saved the chapter house or a personal answer, or proposed or answered every relationship owed; draw the TickMark beside the title and on the phone strip's numeral, with an sr-only name ("I, Name, done").
Size: M. Client only.

88.5 Keep-a-die dice keep shimmying on touch (keep-dice-shimmy-on-touch)
Status: still present.
Cause: DiceTray.jsx:185 relies on hover:animate-none.
Fix: add "[@media(hover:none)]:animate-none" (and motion-reduce:animate-none) to those classes.
Size: S. Client only.

88.6 Notebook Contents shows 4 lines on a phone where 5 fit (notebook-contents-phone-density)
Status: still present.
Cause: NotebookView.jsx:230-248 useLinesThatFit divides by a fixed row height (TOC_ROW_NARROW) that is taller than a real row on a phone.
Fix: measure the first rendered row (offsetHeight) when there is one and use it, falling back to the constant.
Size: S. Client only.

88.7 The Let in mark lives only in one browser (let-in-mark-browser-only)
Status: still present.
Cause: gameStore.js:2634-2649 letInIds and noteAwaiting live in browser storage; the server has no "approved and never played".
Fix: Column characters.let_in (BOOLEAN DEFAULT FALSE): set True in engine.approve_investigator and campaigns.py rejoin, False on release, retire and when that character's own socket opens as an active member (endpoint.py, after the connect frames, one small commit). Serialize let_in in get_char_dict. PlayerRegistryPage.jsx shows the stamp when char.let_in or letInIds holds it (no store change needed).
Size: M. Server, DB schema (one column), protocol (one optional character field).

88.8 The owed-scar banner says the track "is full" over a cleared track (owed-scar-banner-says-full)
Status: still present.
Cause: MainDeskView.jsx:262-263.
Fix: "A scar is waiting. <name> took a fourth <Brain> mark; the track is cleared and a scar is owed." (ScarModal.jsx:177's words).
Size: S. Client only.

88.9 The advancement dialog says the track is full after it rolled over (advancement-dialog-track-full-wording)
Status: still present.
Cause: CircleView.jsx:275.
Fix: "<strong>2</strong> advancements for Ada Lark."
Size: S. Client only.

88.10 The circle advance writes no refill line (advance-log-no-refill)
Status: still present.
Cause: gm.py:399-405 writes only "<circle> has advanced and gained <ability>!".
Fix: append " Its resources are back to 5 each." with resource_pool(target_circle, db) after fill_resources.
Size: S. Server (log text). Flip any test pinning the old line.

88.11 The advancement receipt and the log word a drive pick differently (advancement-receipt-log-wording)
Status: still present.
Cause: CircleView.jsx:220-221 uses the lower-case drive key; character.py:285-287 capitalizes.
Fix: capitalize in the receipt: "+2 Nerve drive", "+1 Nerve and +1 Cunning drive" (the log's form).
Size: S. Client only.

88.12 +1 Illumination at 12 stores 13 behind "12 / 12" (illumination-past-12)
Status: still present. Decided (decisions8 8): +1 stops at 12; Add N keeps its carry-over.
Cause: CirclePage.jsx:447 setIllum(illum + 1) with no limit; gm.py:520-524 stores any illumination.
Fix: CirclePage: +1 disabled when illum >= 12. gm.py handle_update_circle: a raise that would end above 12 is clamped to max(old, 12) (a carried-over value from Add or Meticulous Notes is never cut; -1 still works from it); no log line when nothing changed. gm_add_tally (:584-614) and End Assignment's Meticulous Notes keep their carry-over.
Size: S. Server and client.

88.13 Behind Me and Premonitions cards do not name the mark (ally-card-no-mark-named)
Status: still present.
Cause: AbilityMarkOffer.jsx:61 and :67, descriptions take only the name.
Fix: description(name, markType): "Take Finn Ash's Brain mark instead (spend 1 Nerve)." and "Soak Finn Ash's Brain mark (burn 1 Intuition resistance)." from offer.mark_type.
Size: S. Client only.

88.14 A stale tab keeps a live-looking Confirm advancement (stale-tab-confirm-silent)
Status: still present.
Cause: the advancement dialog's Confirm in CircleView.jsx sends nothing while connectionState is 'replaced'.
Fix: while connectionState is not 'open', Confirm is aria-disabled and one line says "This desk is open in another tab. Use this tab, then confirm." (SheetEditor.jsx:349's pattern, with its Use this tab button).
Size: S. Client only.

88.15 A superseded Lightkeeper tab has no way back (superseded-lk-tab-no-way-back)
Status: probably fixed already in code: OperationsPanel.jsx:213 and :221 render ConnectionBanner, whose button reads Use this tab for 'replaced' (ConnectionBanner.jsx:42) and calls reconnect. Needs a browser check with two Lightkeeper tabs at 1440x900 and 390x844.
Fix: only if the check fails: find why the button is missing or does not reconnect (reconnect() needs socketGameId, set by OperationsPanel's connect) and fix that; otherwise tick the line.
Size: S. Client only.

88.16 The join-request pop-up covers too much (join-popup-size)
Status: still present.
Cause: JoinRequestPopup.jsx:44-80 holds the whole PlayerRosterCard (md:w-[26rem], full width on a phone).
Fix: a slim toast: the investigator's name and role in one line, Approve, View and Later (Reject and the card behind View, on the Requests page); md:w-80, and on a phone one row above the bottom edge.
Size: S. Client only.

88.17 A closed request's note stays when another player's request arrives (closed-request-note-stays)
Status: still present.
Cause: OperationsPanel.jsx:88-100 clears goneId only when the same id asks again.
Fix: remember the pending ids last seen; when an id arrives that was not there, clear goneId and close the gone sheet (setSelectedInvestigator(null)), as 45.7 intended.
Size: S. Client only.

88.18 The Reset info button is named "About About Reset" (about-about-reset)
Status: still present.
Cause: GMCharacterSheet.jsx:379 passes label "About Reset" to ArmedDetail, which adds "About".
Fix: label "Reset".
Size: S. Client only.

88.19 A refused sheet edit is announced twice (refused-edit-double-alert)
Status: still present.
Cause: InvestigatorDossier.jsx:873-874 shows sheetEditError as role=alert under the sheet while the reopened editor shows it too.
Fix: hide the line under the sheet while the editor holds a restored draft (restoreDraft set), or drop its role=alert.
Size: S. Client only.

88.20 An unsaved Chapter House draft hides another member's newer save (chapter-house-draft-hides-save)
Status: still present.
Cause: CircleCreationPopup.jsx:126, :176-185, :415-428: the draft wins over a newer backstoryAnswers.chapter_house with no word.
Fix: when chapter_house changes from another desk while houseDraft is set, show "<name> changed this. Leaving the box replaces it." in the status line (the author from the backstory_update payload if it carries one, else "Another member").
Size: S. Client only.

88.21 The Join dialog buttons are indented on a tablet (join-dialog-buttons-indent)
Status: still present.
Cause: JoinCampaignForm.jsx:112 "flex gap-2 justify-end".
Fix: "justify-between" from sm (Cancel at the left padding, Ask to join at the right).
Size: S. Client only.


==================================================================
Issue #88, unverified lines (88.u1 to 88.u28)
==================================================================

Only cheap lines go into groups. Cheap: small, local and plainly right.

88.u1 great-wards-persist-unexplained: skip. Needs a design for who holds the ward on two sheets (roster lookup, wording); correct by p. 27.
88.u2 great-wards-in-play-state: skip. Same design as u1 (holder, effect, disabling the picker).
88.u3 relationship-two-way-unclear: cheap. RelationshipNegotiation.jsx (~:70): placeholder "Pick a relationship first" on the disabled answer, and an "i" by the heading: "Each direction is its own relationship: yours to them, and theirs to you." Group E.
88.u4 lk-full-track-no-scar-hint: skip. The player's line is an aria-label only (InvestigatorDossier.jsx:1381-1383); a visible hint on the Lightkeeper's copy is a new subline (help on demand, #16).
88.u5 keys-bare-names: skip. Needs a description for every specialty's keys from the book (data, not small).
88.u6 phone-report-form-far-down: skip. A layout reorder of the Circle page on phones; not plainly right.
88.u7 circle-spend-not-announced: cheap. CircleView.jsx: a role=status line "Spent 1 Stitch." when the spend's circle_update lands, and "Train die held" on the Circle page while train_dice > 0. Group D.
88.u8 lk-secret-roll-stays-ticked: cheap, the loud half only. GmDiceControls.jsx:13-39: while Secret is ticked the Roll button reads "Roll in secret" in oxblood. Resetting after a roll is a behaviour call; not done. Group B.
88.u9 empty-dispatch-labels: cheap. DispatchNote.jsx (:83, :113, :145) and CircleView: with no location, atmosphere or text, one line "No dispatch yet." Group D.
88.u10 dispatch-card-small-nits: skip. Four separate nits, one a design call (form number).
88.u11 spending-open-after-end: decided (decisions8 9), in scope.
  Cause: gm.py:425-470 End Assignment leaves resources_editable as it was; circle.py:77-91 handle_spend_resource returns silently when closed.
  Fix: End Assignment sets resources_editable False and, if it was open, answers["spending_paused"] = True (set after clear_paperwork). The next assignment starts with the Lightkeeper's first dispatch: handle_gm_update_circle (gm.py:301-317), when the circle had no location and the payload sets one (or dispatch_text), and spending_paused is set, opens spending again, clears the flag and logs "Spending is open again: up to two each." The Lightkeeper's own toggle (gm.py:333-343) clears the flag. handle_spend_resource refuses while closed: 409 "Spending is closed until the next assignment starts." when paused, else "Spending is locked until the Lightkeeper opens it." (CircleView.jsx:579's words). The i's: End Assignment's ENDS (SceneManager.jsx:20) gains "Circle spending closes until the next assignment's dispatch."; the player's spending i (CircleView.jsx:579) the same. FAQ.md:295 and the spending paragraph, QUIRKS.md:191 area, in decisions_fix4 2's one wording (the Train die is still kept until a roll uses it). Flag for Robert: "opens again" read as "opens again if End Assignment closed it, at the first dispatch". Size M. Server (gm.py, circle.py), protocol (a refusal), client text.
88.u12 report-card-no-amended-mark: cheap. circle.py:61-66 adds amended_at (UTC ISO) to an amended report; CirclePage.jsx ReportFlipCard front shows "Amended" with the time. One optional field. Group C.
88.u13 amend-without-change-logged: cheap. circle.py: an amendment whose responses equal the filed ones and whose note (trimmed) is equal is refused 409 "Nothing changed." (the form already shows reportError). Group C.
88.u14 adrenaline-offer-phone-abbrev: cheap, the names half. AbilityMarkOffer.jsx:256: full drive names as aria-labels (aria-pressed for the chosen one) and "Pick a drive" beside a disabled Use. The card's size is not touched. Group B.
88.u15 phone-roll-bar-crops-dice: skip. Unverified layout at one size; needs a browser check before any change.
88.u16 burn-no-keep-choice: skip. A "Keep the result" control is a new behaviour (settling by hand); not plainly right.
88.u17 keep-slip-equal-failures: cheap. DiceTray.jsx keep slip: both failures read "Failure", and the gilded one adds "(1 <drive> back)" while the other adds "(no drive back)". Group B.
88.u18 tray-pool-breakdown: skip. Needs the roll to carry drive and ability dice apart; more than a label.
88.u19 take-mark-beside-roll-tab: skip. A focus-order redesign of the sheet.
88.u20 illumination-heading-name: cheap. The Illumination h3 on CircleView.jsx (and CirclePage.jsx:418-423) gets aria-label "Illumination 3 of 12" while the InfoTerm keeps its own button name. Split by file: CircleView in D, CirclePage in C.
88.u21 formation-name-counter-unlabelled: cheap. CircleCreationPopup.jsx name suggestions: "Your suggestions: 2 of 5" and at the limit "You have made 5 suggestions." Group D.
88.u22 waiting-row-self-update-hint: skip. Showing it always would be a permanent subline; it is behind an "i" on purpose (45.18, #16).
88.u23 photo-caption-under-title: skip. Notebook picture layout, needs a browser check against DESIGN.md "Pictures in the notebook".
88.u24 sketch-text-enter-log-alt: skip. Excalidraw's own Enter behaviour plus two other changes.
88.u25 field-notes-empty-toc: cheap. NotebookView.jsx Contents: "No field entries yet." when the list is empty. Group E.
88.u26 lk-log-wording-nits: cheap. rolls.py:612 "The Lightkeeper rolled ..."; DiceTray.jsx:52-53 "Secret: only you saw this" (no space before the colon). Flip the test that pins the old line. Group B.
88.u27 creator-control-names: cheap, the Raise half only: aria-pressed on the chosen Raise button in CharacterCreator.jsx. The portrait input is likely the seat.js matcher. Group E.
88.u28 join-dialog-slow-open: skip. Timed by a harness seat, likely network or harness delay; not reproduced.


==================================================================
Issue #88, ideas (88.i1 to 88.i4)
==================================================================

88.i1 report-line-behind-flip: cheap. CirclePage.jsx ReportFlipCard: a small "Line filed" mark on the front when report.note is set. Group C.
88.i2 handwriting-only-in-join: skip. A new field in the creator's look step; not small.
88.i3 stitch-with-no-marks: cheap. CircleView.jsx Stitch card: while the investigator has no marks, its armed line reads "No marks to clear. Press again to spend it anyway." (nothing blocks; detection, not prevention). Group D.
88.i4 clock-name-kept-at-zero: skip. A Lightkeeper may name the clock at 0 before raising it (the seal set "The fog comes in" at 1 of 4); clearing it is not plainly right.


==================================================================
Interactions
==================================================================

- Restarts (#72, #78, #79): the three holes left in decisions_fix6 1 and 2. #72 stores the owed scar (DB), #78 tells the tray a roll is gone, #79 re-sends or drops Non-Combatant points. QUIRKS.md's restart section (around :204-217) gets one line from each. #80's pending-gilded guard is in memory, so after a restart there is nothing to guard and #78 covers the desk.
- Death (#73, #76, #82, #72): handle_apply_scar's death branch gets #73's pool lowering and circle_update; #76 closes the report to the dead; #82 makes Revive the Lightkeeper's alone; #72 clears scar_pending at the death. #81 can land a fourth mark at a closed desk, whose owed scar #72 stores. Nothing goes up when a death is lifted or a replacement approved (decisions_fix4 1).
- Spending and spend counts (#77, 88.u11): both touch the per-assignment spend rule. End Assignment still resets the count (decisions_fix4 2); #77 keeps a leaver's count only within the assignment (the key is cleared by clear_paperwork). Decision 9 closes spending at End and reopens at the next dispatch; the Train die stays kept until used. Every place that words spending says the same (decisions_fix4 2).
- Illumination (88.3, 88.10, 88.12): Add N keeps its carry-over and gets a confirm only while reports are unfiled (decisions_fix4 5's "existing confirm step"); +1 stops at 12; the advance line names the refill (the same resource_pool number #73's line uses).
- The charter and the papers (#74, 88.4, 88.20, 88.u21): the players decide the charter until the seal; CirclePage.jsx in group C, CircleCreationPopup.jsx in group D.
- Join requests (#83, 88.16, 88.17): #83 is the store half (pending list), 88.16 and 88.17 the components. Same behaviour for the pop-up after #83 lands.
- Registry (#84, 88.7): the same row; one group.
- Dice (#86, D10, #87, 88.5, 88.u17): all in the dice components; #86 must respect decisions_run4 (the felt keeps the last roll after End Assignment; only the stamp goes).
- Offers (#79, 88.13, 88.u14, #87): all in AbilityMarkOffer.jsx; one group.


==================================================================
Groups
==================================================================

Group A: death, scars and the roster on the server (opus)
Items: #72, #73, #76 (access.py), #77, #82 (access.py, character.py), 88.1, 88.7, 88.8, #84.
Owns: backend models.py, vtt/db.py, vtt/serializers.py, vtt/schemas.py, vtt/ws/handlers/character.py, vtt/ws/access.py, vtt/routers/campaigns.py, engine.py, vtt/assignment.py; one line each in vtt/ws/handlers/marks.py (:298) and rolls.py (:857) and one block in vtt/ws/endpoint.py (88.7, after the connect frames). Frontend: gm/desk/InvestigatorBusinessCard.jsx, pc/MainDeskView.jsx, campaignSelector/PlayerRegistryPage.jsx. Tests: new tests/test_fix8_death.py; field lists in test_investigators.py, tests/support.py, tests/data/openapi.json, test_00_startup.py (columns); flip in place any test pinning awaiting_scar or the revive line.
Server: yes. Schema: two columns, one roster field. Protocol: refusals (revive, dead report), let_in field.

Group B: restarts, rolls, offers and the store (opus)
Items: #78, #79, #80, #81, #83, #85, #86, D10, #87 (RollModifications.jsx, AbilityMarkOffer.jsx), 88.5, 88.13, 88.u8, 88.u14, 88.u17, 88.u26; and the store half of 88.u11: action_rejected for spend_resource sets spendRefusal {detail, at} for group D to show.
Owns: vtt/ws/handlers/marks.py (all but :298), vtt/ws/handlers/rolls.py (all but :857), vtt/ws/endpoint.py (the activity_history line), store/gameStore.js (only group to edit it), pc/DiceVault.jsx, pc/dice/RollModifications.jsx, pc/dice/DiceTray.jsx, pc/dice/GmDiceControls.jsx, pc/AbilityMarkOffer.jsx. Docs: WEBSOCKET.md sections 1, 4.3, 4.5, 5, 7, 9; FAQ.md :18, :74, :78, :120; DESIGN.md :482-489. Tests: new tests/test_fix8_restarts.py; flip in place the replay and log-wording tests in test_ws_rolls.py and test_ws_connect.py.
Server: yes. Protocol: activity_history always on connect, Non-Combatant re-sent, refusals (roll, full drive).

Group C: the charter, the Lightkeeper's circle page and the circle's server rules (opus)
Items: #74, #75, #76 (circle.py re-check), 88.3, 88.10, 88.12, 88.u11 (server, SceneManager, docs), 88.u12, 88.u13, 88.u20 (CirclePage.jsx), 88.i1.
Owns: vtt/routers/circles.py, vtt/ws/handlers/gm.py, vtt/ws/handlers/circle.py, vtt/sheet_edits.py; gm/CirclePage.jsx, gm/SceneManager.jsx. Docs: WEBSOCKET.md 4.2 and 4.6 rows (including the dead-report refusal sentence for group A's change); FAQ.md :244-248 and :295 and the spending paragraph; QUIRKS.md around :191. Tests: new tests/test_fix8_circle.py; flip test_ws_sheet_edits.py and the advance-line test in place.
Server: yes. Protocol: refusals (update_circle charter before the seal, spend_resource closed, nothing changed), amended_at field.

Group D: the player's Circle page and formation papers (sonnet)
Items: #76 (CircleView.jsx form), 88.4, 88.9, 88.11, 88.14, 88.20, 88.u7, 88.u9, 88.u11 (CircleView text and spendRefusal display), 88.u20 (CircleView.jsx), 88.u21, 88.i3.
Owns: pc/CircleView.jsx, pc/CircleCreationPopup.jsx, pc/DispatchNote.jsx.
Server: none. Reads the store (spendRefusal from group B, connectionState); uses group C's refusal and i wording exactly as written above.

Group E: small UX, sheets, hub and touch targets (sonnet)
Items: #82 (InvestigatorDossier.jsx Revive), #87 (ScarModal.jsx, RelationshipNegotiation.jsx), 88.2, 88.6, 88.15, 88.16, 88.17, 88.18, 88.19, 88.21, 88.u3, 88.u25, 88.u27.
Owns: pc/InvestigatorDossier.jsx, game/abilityUses.js, pc/ScarModal.jsx, pc/relationships/RelationshipNegotiation.jsx, shared/NotebookView.jsx, gm/OperationsPanel.jsx, gm/desk/JoinRequestPopup.jsx, shared/ConnectionBanner.jsx (only if 88.15's check fails), gm/GMCharacterSheet.jsx, shared/JoinCampaignForm.jsx, CharacterCreator.jsx.
Server: none.

Shared files and how to avoid conflicts
- gameStore.js: group B only. Groups D and E read store fields and never edit it (D reads spendRefusal, which B adds).
- marks.py and rolls.py: B owns; A changes exactly marks.py:298 and rolls.py:857 (the awaiting_scar reads), small hunks far from B's.
- endpoint.py: A adds one block after the connect frames (88.7); B changes "if history:" at :163. Adjacent; merge B first or keep A's block after the history send.
- access.py: A only (#76's DEAD_REFUSED entry and #82's refusal). circle.py: C only.
- campaigns.py, engine.py, assignment.py: A only. gm.py: C only.
- WEBSOCKET.md: B owns sections 1, 4.3, 4.5, 5, 7, 9; A edits only the 4.4 revive_character row and the character fields in section 5's character_update; C edits only 4.2 rows and the 4.6 spend and report rows. Edit rows in place, do not reflow.
- QUIRKS.md: A adds one line to the fix 6 restart block after :207; B adds its lines after :217; C edits around :191. No group appends at the end of the file.
- FAQ.md: A edits :137, :147 and the release and rejoin paragraph; B :18, :74, :78, :120; C :244-248, :295 and the spending paragraph.
- Tests: each server group puts new tests in its own new file (test_fix8_death.py, test_fix8_restarts.py, test_fix8_circle.py) so no two groups append to the same test file; existing tests are flipped in place only by the group that owns the behaviour.
- Merge order: A, B, C, then D and E. D's spend refusal display waits for B's store field.

Calls made here without asking (for the PR to flag)
- #74: the Lightkeeper's charter fields are refused by the server before the seal, insignia included.
- #76: a report filed before a death keeps its card (roster.js, aa23d98); only new reports from the dead are refused.
- #78: activity_history is sent on every connect, empty included, as the end of the connect frames.
- #79: a Non-Combatant pick of a full drive is refused and the point kept.
- 88.12: a +1 past 12 is clamped (no refusal); a carried-over value is never cut.
- 88.u11: spending reopens at the first dispatch of the next assignment, and only if End Assignment closed it.
