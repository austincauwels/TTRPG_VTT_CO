## Turn 1 (Campaign) - BLOCKED
- Signed up lightkeeper_rue_r3 (email lightkeeper_rue_r3@example.test, pw correct-horse-battery-staple). Account was created (user id 33 per API URLs), but I cannot stay signed in.
- Cause: every authenticated API call (Authorization: Bearer) returns 401 with header x-proxy-error "upstream auth failed: connection CANDELA_BETA, rule *.gatergrid.com" from the sandbox egress proxy (the proxy injects the beta site password and fails requests that carry their own Authorization header). Login POST itself is 200. Retried after 60 s: same. No CANDELA_BETA_USER/PASS env vars, so lib.js httpCredentials is off; the proxy does the site password. Will hit every AI seat.
- Campaign "The Saltmere Chapter" NOT created. No code. Desk not explored. Told the table (in character) the code will come later.
- Logged F001 (silent bounce to blank sign-in on 401, no message), F002 (Google iframe unnamed; says Sign in on sign-up screen).
- Next turn: look first; if sign-in now holds, sign in (do NOT re-register), create the campaign, explore the desk, post the code.
- No investigator (I am the Lightkeeper).

## Turn 2 (Campaign) - campaign created
- Seat was already signed in as lightkeeper_rue_r3 (sign-in block fixed). Did not re-register.
- Created "The Saltmere Chapter", code **saltmere-r3** (code is not auto-suggested from the name). Posted the code to the table (#2).
- Toured the desk (no story yet): Roster (dispatch card Own words/Template, Join Requests, Invite player, Finalize the circle, Circle formation papers I-VI, hourglass + Clock name + Timer switch with min/sec and start/reset/clear, dice tray with Secret, Activity Log, Pass Notes to @Circle or @Environment). Circle page: name Edit, chapter house, Illumination 0/12 (gold milestones 3/6/9), circle ability select, Illumination questions + Open reports, resources Stitch/Refresh/Train 1 each, Spending locked/Allow spending, Refill. Notebook: Field Notes (Sketch, Photo, Markdown), Private Notes (text only), Lightkeeper Resources (text). Map: Fairelands map image.
- Dispatch/End Assignment stamps are below the fold in the left column at 1440x900: scroll with mouse wheel over the left column (x~180). End Assignment asks for a second press.
- Timer switched on then off again; tension still 0; nothing dispatched; activity log empty. Dispatch card left in Template mode, empty.
- Findings: F003 (dispatch below fold), F004 (Invite wording 'rejoins'), F005 (praise sketch), F006 (no private sketch), F007 (no code suggestion).
- No investigator (I am the Lightkeeper).
- Next: approve join requests as they come (Robert, bram, cass, dev), watch circle formation, Finalize the circle, then dispatch to the Saltmere flats (Template: location 'the mudflats of Saltmere', atmosphere). Send Robert a pass note at some point. Watch: do join requests appear live without reload?

## Turn 3 (Approval) - all four approved, formation open
- Machine had restarted: seat.js could not reach CDP 9301, ran start_all.sh once (desk reloaded by that, not by me). Desk then showed 4 join requests correctly.
- Opened each sheet (View sheet) and approved from the sheet: Cass Moreau (Slink/Criminal, Nerve3 Cun4 Int2, gilded Sway+Hide), Bram Okafor (Muscle/Soldier, Nerve5 Cun1 Int3, gilded Move+Strike, Behind Me), Pontius Aganus (Robert/Chilly, Scholar/Professor, Nerve max 0 Cun3 Int6, gilded Survey+Focus, Well-Read, gear Thick Reference Tome/University Keys/Bleed Detector), Dev Lindqvist (Weird/Occultist, Nerve0 Cun3 Int6, gilded Read+Focus, Ritual). Activity Log has 4 approval lines 03:42-03:44.
- NOTE code naming: 'sneak' = Read, 'read' = Focus in code (Professor/Occultist gild 'read' = Focus). Not a bug.
- There is NO 'start circle formation' button: papers open on each player's desk automatically on approval (modal 'Circle Formation Papers', no close until sealed). My Roster shows 'Circle formation so far' with ticks per player. Finalize the circle = two presses (first arms with warning, 'Not yet' cancels). I armed once and cancelled; NOT finalized. 4 in the circle.
- Welcomed all four at the table (#6-9), told the table what to do (#10-11).
- Findings: F021 (drive max 0 shown as '0 of 1', serializers.py `or 1`; Pontius and Dev), F022 praise (approve from sheet flow), F023 praise (finalize warning).
- No investigator (I am the Lightkeeper).
- Next: watch formation panel fill live (ticks, name, question, house, ability, insignia, relationships) without reload; when every part has a choice, Finalize (two presses); check players' papers close; then dispatch Template: location 'the mudflats of Saltmere', atmosphere. Send Robert a pass note. Watch whether Pontius/Dev Nerve '0 of 1' causes trouble on a Refresh.
