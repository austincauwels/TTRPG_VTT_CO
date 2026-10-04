# Quirks and suspected bugs found while pinning behavior (2026-10-04)

The characterization tests in backend/tests pin these AS THEY ARE, so the refactor
does not change them by accident. Each fix later gets its own commit and flips its test.

- On a fresh PostgreSQL database, users_id_seq and circles_id_seq start at (1, not called) because init_db inserts user 1 and circle 1 with explicit ids. The first register and the first auto-created campaign circle both return 500. The failed insert consumes the value, so the second attempt works.
- Seeded admin/admin can log in on every new database.
- Register always returns campaignCode 'fairelands-01' (hard-coded). Usernames are case-sensitive for register and login, but invite-rejoin matches them case-insensitively.
- Forge: a missing user_id, user_id 0, or an unknown user_id makes the character belong to user 1. The client sets every stat with no bounds. The character is always placed on circle 1.
- GET /api/investigators always reports is_dead False, pen_font 'Caveat' and ink_color '' (those fields are never filled in). GET /api/investigators/{id} returns 500 for a character whose circle_id is NULL.
- create_campaign: a duplicate code returns an unhandled 500, an unknown gm_user_id returns 500 (FK), all-digit codes are accepted, and the code is validated before the name.
- join has no status check, so it moves an active character out of its campaign and into pending in another one (the character keeps its old ink).
- rejoin needs no invite and no GM approval. Because the session does not autoflush, a dead predecessor that is being retired in the same request still counts when the ink color is picked (the new character gets INK_COLORS[1]).
- GET /campaign/{id}/circle-creation-state is a GET that writes, and for an unknown campaign it returns 500 (FK violation on PostgreSQL).
- REST /circle/vote with an unknown vote_type commits the vote, then returns 500 (KeyError). REST relationship counter sets status 'countered' and keeps the original terms, while the WebSocket counter rewrites the terms and sets status back to 'proposed'. REST propose does not set last_actor_id.
- Members stay on circle 1, so a campaign circle's max_capacity and refill_resources count 0 members (finalize still uses 1 + active members).
- Notebook: an unknown character_id or campaign_id returns 500 (FK). role=GM and character_id in the query are trusted. A soft-deleted entry can still be edited and deleted again, and it still counts for page numbers. Upload stores the client's content type in the data URI and its response has no author_type key. A self entry with no character, or an unknown visibility value, is never shown to anyone.
- campaign_retired reaches only the GM, and released pending characters never receive roster_finalized, because statuses change before the broadcast.
- Valid JSON that is not an object (a list, a string, or a list payload) ends the socket without a close frame.
- update_drive stores any value (99, -5). The character dict clamps negatives to 0 on output. An unknown pool still sends character_update.
- update_gear with a non-string item commits the gear, then the log join raises and ends the socket.
- apply_advancement has no gate. new_ability appends the text to specialty_ability with '; ', which breaks exact-name ability checks.
- spend_resource reads the circle object loaded at connect time. If the GM enables spending after the player connected, the spend is silently ignored until the player's session commits something. The GM socket likewise counts a cached member list in refill_resources: after a rejoin it sets stitch to 1 while the circle_update it sends already reports max_capacity 2.
- A zero-dice roll with two sixes counts as critical even though the lower die is the result. resolve_gilded trusts the client's value, can be replayed at any time, and can never give a critical. A non-numeric chosen_value ends the socket.
- A negative drive_spent raises the drive above its max, commits that, and then the empty pool raises roll_error. The roll action is not validated (for example action='nerve_max' uses nerve_max as the rating). The roll's ability-use counter never counts anything.
- burn_resistance with a pending gilded choice logs 'burned resistance on X - ? . .' (blank outcome label).
- take_mark: when a soak ability is available the mark is not applied (it is lost if the offer is declined). Back Against the Wall is always offered as a soak and has no resolve branch, so such a character never takes a brain mark. An unknown mark_type sends character_update and stores nothing.
- The Endurance branch calls secrets.randbelow but main.py never imports secrets. The NameError ends the socket and the mark is not applied (bug D1).
- Premonitions intercept spends the seer's resistance but does not remove the target's mark. Behind Me can target a character in any campaign. The resolve soak branches do not check remaining resistance pips.
- apply_scar shift names can be any numeric column (nerve_max and body_marks were shifted in the test).
- SceneManager's gm_update_circle with circle_id 1 edits the shared circle 1 and pushes circle 1's data to the campaign. The circle name is not settable through gm_update_circle (bug D2).
- GM powers rest on a client-claimed role: a player socket that sends role GM can toggle reports. resolve_circle falls back to an unscoped lookup, so one GM can toggle another campaign's circle.
- gm_update_tension's character_update goes only to the GM key, not to the player.
- submit_assignment_report has no ownership or reports_open check. Unknown ids are stored and reported as 'Unknown', and every player receives every report.
- update_circle: a non-GM may lower stitch, refresh and train and may set every other field. A string value for a resource ends the socket. The milestone log fires at illumination 3, 6 and 9 (not 12, and not when the value goes down).
- circle_creation_vote with an unknown vote_type commits the vote, then the KeyError ends the socket. circle_backstory_update can overwrite the reserved 'reports' key. circle_relationship_respond on a GM code socket raises (int(game_id)) and ends the socket.
- Chat: the whisper target is an ILIKE pattern (% and _ act as wildcards, case-insensitive). A pending sender does not get their own message echoed. sender_name is client-claimed. @Environment is not restricted to the GM.
- WS add_notebook_entry writes into the payload's campaign_id, but broadcasts to the socket's own campaign. Its activity_log payload has no log_type.
- A campaign whose all-digit code equals a character id makes that character's socket resolve to the campaign's circle.
- Likely live bug: submit_assignment_report loses every report once backstory_answers is not empty. It changes the loaded dict in place and assigns the same object back, so SQLAlchemy writes nothing. The report is broadcast but is gone after a reload. Reports from sockets that loaded an empty dict at connect each write a new dict holding only their own report, so the last report replaces the earlier ones. Any stored chapter house or selected question means even the first report is lost.
- New: WS circle_relationship_respond from a socket whose session still holds an older copy of the row can be silently lost. A counter after the other player accepted sets the values the stale copy already has, so no UPDATE runs and the relationship stays accepted. A second, identical counter then works. The same stale-session cause affects other handlers.
- The comment at main.py 1488 says the context is re-resolved per message, but camp_id, camp_code and the circle are fixed at connect. Even chat's per-message campaign lookup sees a REST join only after something on that socket commits, because the identity map keeps the character loaded at connect.
- A character_id of 0 turns a player's roll into a Lightkeeper roll. A character_id of 1.5 matches no character, so a campaign member's chat goes only to its own channel with no ink. A bad character_id ('abc', object, list, true) drops the whole frame, even for actions that need no character.
- intercept_mark's soak offer to the interceptor has no 'options' key and does not apply the mark, after the nerve spend and the target's mark removal are already committed. Its soak map has no Back Against the Wall, unlike take_mark.
- On the 'gm' fallback channel, gm_reset_character can reset any unaffiliated character (campaign_id IS NULL). gm_end_assignment resets every active character with a NULL campaign, not the members of the circle it was given, and clears the scene of any circle id (no scoping).
- finalize_roster ties go to the first vote stored, because the vote query has no ORDER BY.
- A whisper from a socket with no campaign matches names with ILIKE across every campaign.
- get_char_dict sends a string ability_uses through unparsed, while gear and scars are parsed. dict() on a string ability_uses closes the socket in take_mark and resolve_ability_mark. The dict() call in roll is unreachable.
- On a database that grew through init_db, the added columns are TEXT and INTEGER (backstory_answers and ability_uses are TEXT DEFAULT '{}', and the booleans are INTEGER DEFAULT 0). On such a database the seed rows (admin, circle 1) are never written, because the seed query runs before the ALTERs and fails on the missing columns.
- A roll mod listed twice in ability_mods is applied twice. An overspent drive floors at 0 but the whole spend still goes into the pool.
- Not testable without changing app code: the elif order between extra_dice_fn/extra_dice and extra_gild/extra_gild_condition.

## Changed by the login token stage (2026-10-04)

The list above is kept as it was found. These entries no longer hold, or hold only in part, because access is now checked (docs/refactor/AUTH.md has the rules); their tests were rewritten to pin the new behavior. Everything else above is unchanged and still pinned.

- Forge: a missing user_id gives the character to the caller; user_id 0 or an unknown id is 403. Stats and circle 1 are unchanged.
- create_campaign: the caller is the GM; an unknown user_id is 403, not a 500. The duplicate-code 500 and all-digit codes remain.
- join: still no status check, but only the character's owner can do it.
- rejoin: needs a rejoin invite or a dead character in that campaign (still no GM approval; the ink color quirk remains).
- circle-creation-state, roster and the notebook list: an unknown campaign is 404. Notebook writes with an unknown character or campaign are 404, not 500. role=GM and character_id in the notebook query are checked against the token.
- Behind Me can only target a character in the interceptor's campaign; an unknown target is 404 and costs nothing.
- Bug D2: gm_update_circle on circle 1 is 403 (circle 1 belongs to no campaign); SceneManager sends the campaign's circle id. The circle name is still not settable through it.
- GM powers come from the token, not payload.role, and GM circle messages only reach the GM's own campaign circle, so the resolve_circle fallback is no longer reachable that way.
- submit_assignment_report: only for the sender's own character (unknown ids are 404). There is still no reports_open check, and every player still receives every report.
- update_circle is GM only, so the non-GM "may lower resources" branch and the string-resource crash from a player are gone. The milestone quirk remains.
- circle_relationship_respond on a GM socket is rejected (403) instead of ending the socket (bug D9).
- Chat: sender_name is set by the server; @Environment is GM only; a socket with no campaign cannot chat, so the cross-campaign whisper is gone. The ILIKE wildcard and the pending-sender echo quirks remain.
- WS add_notebook_entry only writes into the sender's own campaign; Lightkeeper entries are GM only.
- All-digit campaign codes (D13): the character's owner gets the character channel with no campaign, the GM gets the campaign channel, and the connection manager keys them apart ("123" and "campaign:123"). With tokens a shared key was a real hole: either user could close the other's socket and receive its frames, including secret rolls and whispers. WS chat no longer looks up a campaign by the path segment either.
- apply_scar (D14): shift_down and shift_up must be two of the nine action ratings (engine.ALL_ACTIONS). Any other name is 403 and nothing is stored. With tokens the old behavior was a real hole: shifting campaign_id down, with scars_count as the other name, walked a player's own character into any lower-numbered campaign as an active member.
- A character_id of 0 or 1.5 is 404 (action_rejected). A bad character_id ('abc', object, list, true) still drops the frame.
- The 'gm' fallback channel no longer exists (closed with 4404), so its reset and end-assignment quirks are gone.
- The stale relationship-row quirk is still in the code, but whether the stale copy survives depends on when Python's garbage collector runs (the session's identity map holds weak references). The extra access-check queries changed that timing, so the test no longer pins it. ABILITY_MOD_DEFS is a local dict in the handler, and no current entry has both keys, so the order has no visible effect today. The real column types on the beta data copy were not checked either, because psql is not allowed here; the legacy-schema test pins what init_db produces instead.
