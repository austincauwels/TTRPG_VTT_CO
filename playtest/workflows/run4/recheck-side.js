export const meta = {
  name: 'playtest4-recheck-side',
  description: 'Fourth playtest stages A and B: re-check PRs 61, 68, 70, 71 on main 1bc48a0 (control 2d86b77) and three scripted side checks',
  phases: [
    { title: 'Re-check', detail: '6 checkers by area: 2 Opus high (server state, lifecycle and death), 4 Sonnet medium' },
    { title: 'Side checks', detail: 'advancement near 12 (Sonnet medium), scars to death (Opus high), timed windows and a restart (Opus high)' },
  ],
}

const PT = '/home/user/pt4'
const H = '/home/user/harness/playtest'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const BASE = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura. This is the FOURTH playtest's checking pass, run locally in Chromium (Playwright), not on the live site.
- Build under test: main 1bc48a0, a detached worktree at /home/user/wt/main (frontend already built in frontend/dist). It holds PRs 61, 68, 70 and 71 (fix rounds 4 to 7).
- Control: 2d86b77 (none of those PRs), /home/user/wt/control (built too).
- Read first: ${PT}/decisions.md (what is decided, the calls kept as built, what is known and open), then as needed ${PT}/decisions_fix4.md to decisions_fix7.md, ${PT}/issue16.md, the four PR descriptions ${PT}/pr_body_fix4.md to pr_body_fix7.md, and the triage notes ${PT}/triage6.md (issues #17-#47) and ${PT}/triage7.md (lines 69.x, 45.x, 60.x). The third playtest's report, with the original steps for #49-#60: ${H}/results/2026-10-12-run3/report.md. Any issue on GitHub (austincauwels/TTRPG_VTT_CO) via ToolSearch "select:mcp__github__issue_read" (read only; never comment or file).
- Rules and wording: /home/user/wt/main/FAQ.md (rules as implemented), DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand, one-sentence confirms), docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. A behaviour a decision or a doc describes is not a bug; a doc that disagrees with the code is a finding.
- Servers, yours alone: bash ${PT}/up.sh <main|control> <api_port> starts a backend with its own database and the built site on api_port-4000; bash ${PT}/restart_api.sh <main|control> <api_port> restarts only the backend (a server restart mid-session; the database is kept); bash ${PT}/down.sh <api_port> --drop <db> stops and drops at the end. Never pkill -f a pattern (it kills your own shell): stop by PID. If PostgreSQL on 5433 is down: bash ${PT}/start_all.sh.
- Playwright: require('${PT}/node_modules/playwright'), executablePath '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless. Worked examples from earlier checks (build tables through the API, seal them in SQL, open a desk by seeding the store, stall a socket with page.routeWebSocket, sizes phone 390x844 touch, tablet 820x1180 touch, laptop 1366x768, wide 1440x900): ${PT}/verify/v8401_lib.js and the other v84*.js files there; copy and change the ports and paths, never edit those originals. Send X-Forwarded-For with a fresh address per request so sign-up limits do not bite. A gilded die waiting for its choice wobbles: press Enter on it. Animated dice can report "not stable": use force or a trial click and check by eye.
- Work in your own folder (given below): scripts, screenshots, notes. Look at every screenshot you cite. Never edit the repository or the worktrees (except the git-excluded preview configs up.sh writes), never commit or push.
- Budget: about 150 tool calls. If you run short, mark the remaining items "not checked" with why, rather than guessing. No em dashes in what you write.`

const RESULT = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: {
      item: { type: 'string', description: 'issue or line id and a few words, e.g. "#43 held mark across reload" or "45.8 Burn reachable by keyboard"' },
      control: { type: 'string', description: 'what the control 2d86b77 showed, or n/a (side checks)' },
      head: { type: 'string', description: 'what main 1bc48a0 showed, with sizes and desks tried' },
      verdict: { type: 'string', enum: ['fixed', 'partly', 'not fixed', 'regressed', 'not checked'] },
      shots: { type: 'array', items: { type: 'string' } },
    }, required: ['item', 'control', 'head', 'verdict'] } },
    findings: { type: 'array', description: 'every new problem seen on main (not on the control only), one per problem', items: { type: 'object', properties: {
      kind: { type: 'string', enum: ['bug', 'rules', 'ux', 'idea'] },
      sev: { type: 'string', enum: ['high', 'medium', 'low'] },
      title: { type: 'string' },
      where: { type: 'string', description: 'screen, device size, and file:line if you traced it' },
      steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' },
      related: { type: 'string', description: 'the item, issue or decision this touches, or empty' },
      shots: { type: 'array', items: { type: 'string' } },
    }, required: ['kind', 'sev', 'title', 'where', 'steps', 'expected', 'actual'] } },
    praise: { type: 'array', items: { type: 'string' }, description: 'things that work notably well, one line each' },
    method: { type: 'string', description: 'how you built your tables and anything a later checker should reuse or avoid; your folder' },
  },
  required: ['items', 'findings', 'method'],
}

const RECHECK = (dir, ports) => `You are a re-checker. For each item below, replay its ORIGINAL steps (from the issue, the triage notes or the third playtest report) at the size and on the desk it was seen on, first on the control to see the problem, then on main to see it fixed. Then try the neighbouring paths a real table would hit: a reload, the other desk, a second tab or device on the same account, a double press, and a server restart where the item is about state. Look hard for anything these four fix rounds broke or for seams between them (they were built in separate rounds, so an earlier fix may have been undone by a later one). Also log anything else wrong you notice on the way, as a finding.
Your folder: ${PT}/verify/${dir}. Ports: main api ${ports[0]} (site ${ports[0] - 4000}), control api ${ports[1]} (site ${ports[1] - 4000}). Use databases named after your ports.`

const SIDE = (dir, port) => `You are a side checker: you exercise, as a short scripted session, a flow the earlier playtests never reached in play. Drive it like real players and a real Lightkeeper would, through the desks in the browser (build and seal the table through the API and SQL to get there fast, then play on screen). Check what each desk shows live, without reloading, and then after a reload. Check every number against FAQ.md and the rulebook rules it quotes. Main only (no control needed): report each step you checked as an item with control "n/a" and verdict fixed (works as decided) or partly or not fixed (broken), and each problem as a finding.
Your folder: ${PT}/verify/${dir}. Ports: main api ${port} (site ${port - 4000}); a second backend if you need one on ${port + 1}.`

const GROUPS = [
  { dir: 'state', ports: [8110, 8111], model: 'opus', effort: 'high', items: `Server state across restarts and reloads (PR 70 and neighbours):
- #17 the Activity Log survives a server restart (last 100 lines on open; 500 kept); #18 declining or accepting a stale ally offer card after a restart lands nothing and the card closes; #23 the Lightkeeper's copy of a sheet shows held marks live (dashed boxes, "held for"); #43 a mark taken during a silent outage (stall the socket) survives a reload and is taken once, even across a restart; a kept mark older than 10 minutes is dropped with a notice; two desks answering the same held mark at once.
- Held marks (soak, Circle of Protection, Death Defy) stored on the character come back after a restart with the same offer card.
- #19 after Flourish or Bending Spoons the slip shows the new outcome on the roller and the table (a secret roll: roller only); #40 a reload after an open roll restores the tray with its outcome, kept die and Burn and reroll while the server still takes the burn; no dice sound on replay; the Lightkeeper's felt shows its newest roll after her reload.
- 60.7 End Assignment clears the player's tray and no roll is replayed into the next assignment (a held gilded roll is kept, settled); 45.10 the slip and the log name Open Book and Interrogation after the roll.
- #59 ally offers (Behind Me, Premonitions, Non-Combatant drive point): the log tells the Lightkeeper and the offered ally, and says when it lapsed; after a restart they expire with the usual refusal.` },
  { dir: 'lifecycle', ports: [8120, 8121], model: 'opus', effort: 'high', items: `Members, the dead, and sheet edits (PRs 61, 68, 70):
- #49 the Lightkeeper releases a member from the member's sheet, and a player leaves from the desk and from the hub, before and after the seal: votes, relationships and the current report dropped; Stitch, Refresh and Train maximums 1 + members with current amounts lowered and no refund; the character freed with spends, gear, ability uses and Train dice ended; every desk told live; the log line. #62 the Leave and Release confirms are one short sentence with the detail behind an i.
- #50 a bought Train die lasts until a roll uses it (End Assignment keeps it; the spend count resets); one wording on the card, log, roll chip, Circle page and the Lightkeeper's sheet.
- #38 the server refuses a scar from a dead investigator and proposals or counters from or to the dead (REST and WebSocket: try crafted requests); a dead investigator's paper says Dead with no Propose; #22 no 403 for a player whose investigator is no longer active.
- #39 a rejoin from another device sends the replaced investigator's open desk to the hub with a notice and clears the used invite banner, a reload included; #41 a replacement approved through a join request keeps its predecessor's spend count; #42 Play and the Last Played tome on a campaign retired while the Case Ledger is open stay on the hub with a notice, and a double press opens one desk.
- #47 the player's Registry has a Fallen section at its foot.
- #64 Edit sheet: every field it covers saves, rules show as soft warnings only, gear unlocked (items removed, written-in items, past the slots with a warning), one log line per save, the roster dot that clears when the Lightkeeper opens the sheet; a fourth scar is refused in the editor (kept on purpose); 69.1 a refused save keeps the draft and the gear dialog writes only its own changes; 69.8a the ability card is headed by the new role after a role change.
- 69.7 an insignia change before the seal is refused (409); #66 the Lightkeeper changes the insignia by clicking it after the seal, logged, with undo.` },
  { dir: 'lkdesk', ports: [8130, 8131], model: 'sonnet', effort: 'medium', items: `The Lightkeeper's desk (PRs 61, 68, 71), at 1440x900, 1366x768, 1024 to 1279 wide, tablet 820x1180 both orientations and phone 390x844:
- #66 one navigation (the investigator desk's header, tabs and phone drawer, with the Lightkeeper's extra entries); join requests: a pop-up when one arrives, a Requests tab with a count that survives a reload, Invite player still reachable; the Dispatch button fits at every size.
- 45.1 tension - and + and the timer's Start or Pause in the table strip while a sheet, the Circle page or the Notebook is open (tablet and up; the phone strip read-only); 45.4 and 45.5 from xl the Dispatch and End Assignment stamps in a sticky row with the receipt in view, the End stamp not moving when it arms; 69.8b the title above the buttons below xl, clear of Back to chapter hub.
- 45.6 an empty requests list points to the campaign code; Invite player wording; 45.7 a request withdrawn while its sheet is open leaves it read-only with a note, and a new request clears that.
- 60.6 End Assignment says drives carry over and a Refresh restores them; Reset has an i; 60.13 End Assignment clears and hides the timer; 60.19 every waiting name has its count; 69.4 the Finalize confirm is one sentence (counts from three empty parts).
- Missing reports: End Assignment's confirm and the Add Illumination area name who has not filed once reports are due, without blocking.
- #56 after the seal the Lightkeeper sees the circle's relationships, agreed and pending; #65 the Account card offers Edit account, Sign out and Retire; #57 a refused session lands on sign-in with a note that the session ended.
- Short confirms across the Lightkeeper's desk: one sentence and a one-verb button, no "Yes, X" buttons.` },
  { dir: 'circle', ports: [8140, 8141], model: 'sonnet', effort: 'medium', items: `The Circle page, Illumination and reports (PRs 61, 68, 70, 71), on both desks, phone, tablet and laptop:
- #67 the Illumination ring: 12 pips round the candle like a clock face, pip 12 at the top, gold larger milestone pips at 3, 6 and 9, the candle warming as the track fills; the Lightkeeper's pips are 44px non-overlapping buttons with +1 and -1; the player's ring reads as one labelled image; it fits at 320px; the desk's small summary card keeps its row of dots.
- #66 circle resources start at 1 + members, refill when the track fills (no Refill button), the manual squares are a logged correction; with Resource Management each milestone asks for the circle's earn-back choice under Add Illumination and applies it in one press; 69.3 each milestone earns once (try -1 then +1 across a milestone, and a milestone with every resource full, which is not used up); 45.3 and 45.13 one Illumination line per addition, the milestone named only with Resource Management and saying what it earns back. The keys line and Illumination questions wording.
- #58 the optional report line (up to 280 characters) with the key, changed by an amended report, read by the Lightkeeper on the report card; 45.14 closing reports with a kept amendment shows the sent report; the #60 keys info slip opens above its heading and does not cover the checkboxes.
- 45.12 your own Your Circle card shows Incapacitated and scars; 60.17 a proposed relationship is marked Proposed; 60.18 Chapter House says Saved and that the box is shared, also after another member's edit; 69.6 the Circle Resources paragraph behind an i.
- #55 the log names only the Intuition Well-Read actually gave back.` },
  { dir: 'dice', ports: [8150, 8151], model: 'sonnet', effort: 'medium', items: `Dice, the player's sheet and abilities (PRs 61, 68, 71), phone 390x844 touch, tablet 820x1180 touch, laptop 1366x768 mouse and keyboard only:
- #51 a drive with maximum 0 shows as 0 ("none", no pip); #60 spend confirm: Press again stays armed until a press elsewhere, no 4-second lapse, the double-click guard holds; 60.11 "1 Nerve spent" shows after a roll; 60.12 Learn from My Mistakes is not offered when every drive is full.
- 45.8 Burn and reroll is a few Tabs from a keyboard roll and focus stays put when the next roll closes it (a mouse roll does not move focus); 45.9 the reroll slip does not cover Burn and reroll at 1366x768; 60.5 the keep-a-die choice stays still and is announced once; 60.8 an optional burn does not show as a waiting choice.
- #63 Scout, Uncanny Eye and Tactician take a free typed question with the book's questions as tap-to-fill examples, and it shows in the log; 69.2 a refused ability use keeps the typed question.
- #24 the sheet remembers the ability tab, tab buttons 44px; 45.11 the empty gear note fits and Change Gear is not clipped on a tablet; 45.15 the sheet scrolls to a new scar; 60.16 a Skip to actions link, and the disabled stepper takes no focus; 60.22 the gear limit shows by the finger on a phone; 69.5 the trauma Edit subline behind an i.
- 60.9 private notes are marked clearly for the sender and the receiver (the recipient staying selected is kept on purpose).
- Rolls checked against the rules: pool size, a 0 rating (two dice, keep the lower), gilded dice, criticals, drive spends, resistance burns.` },
  { dir: 'notebook', ports: [8160, 8161], model: 'sonnet', effort: 'medium', items: `Notebook, sketch, hub, creator, joining and sign-in (PRs 61, 68, 70, 71), phone 390x844 and 360 wide, tablet 820x1180, laptop 1366x768:
- #52 each click with the sketch Text tool commits the open label and starts a new one; Escape does not make the next click overwrite; #53 a Contents line brings its entry into view (also on a phone under the sticky header) and a contents page holds only the lines that fit, the arrows paging the rest; #54 players see "The Lightkeeper" on her notebook entries, the author filter and the sketch log line (payloads too).
- #44 Heading, List and Quote on an empty line keep the mark with the caret after it; #25 every Notebook and sketch control 44px on touch; #21 Back after a reload keeps a sketch in progress and leaving warns while strokes are unsaved; #20 Sign out clears that account's Notebook and creator drafts, a session the server ends keeps them; 60.10 posted sketch labels larger, Keep drawing in view; 60.21 Preview turns to Edit while previewing.
- #26 the creator's step 3 row fits at 320px; 45.19 and 60.23 the creator's path arrows clear the sticky footer at 360x705, 375x667, 390x667 and the summary shows where drive points came from; 45.20 and 60.15 the Handwriting help says the word once and the list stays inside the Join dialog.
- The #60 join notice in the first person; 60.4 the hub keeps a "Let in: press Play" mark after approval, a reload included; 45.17 Check again is 44px on a phone; 45.18 the locked Last Played tome explains itself on tap and focus; #46 Approve, View sheet and Reject 44px on a phone.
- 60.24 and 60.25 the sign-in buttons above the fold at 1366x768 (the map may not load in the sandbox; say so), the Google frame named, sign-up says "Sign up with Google".` },
]

const SIDES = [
  { dir: 'advance', port: 8170, model: 'sonnet', effort: 'medium', task: `Advancement and the earn-back. Build a sealed table (Lightkeeper and four players at phone, tablet, laptop and wide sizes) whose circle has the Resource Management circle ability and stands at 10 of 12 Illumination with some resources spent (set in SQL; read backend/vtt for the columns, including circles.milestones_earned and circles.earn_backs). Open reports; each player files a report on screen (keys and the optional line); the Lightkeeper reads the cards and adds Illumination on the Circle page so the track crosses 12. Check: what the rules in FAQ.md say happens when the track fills (advancement for each investigator, resources refilling, the track resetting or not) and that the site does exactly that on every desk live; the advancement dialog for each player (each choice it offers, what Later does, that it comes back, and that it cannot be taken twice with a double press or two tabs); the earn-back prompt at a milestone and its one press; the log lines. Then End Assignment and check what resets and what stays on every sheet against FAQ.md; then a reload of each desk.` },
  { dir: 'death', port: 8180, model: 'opus', effort: 'high', task: `Scars, incapacitation and death. Build a sealed table (Lightkeeper laptop, players on phone and tablet and laptop) in an active assignment, with one investigator (a Slink with Death Defy) at 2 Body marks and 3 scars, and another at 2 Brain marks and none. Through the Lightkeeper's desk deal marks: the third mark of a kind runs the scar flow on the player's screen (take it on the phone); check what the scar changes against FAQ.md. Then take the first investigator to the fourth scar: Death Defy and its held mark, then death. Check on every desk live: the roster, the Fallen card and Circle History, the dead player's desk and hub, the player's Registry Fallen section, the log; that the dead cannot roll, spend, propose or file a report (try on screen and with crafted WebSocket and REST requests), while the decided exception (Accept of an old proposal) still holds; incapacitation and Revive (double press too). Then the replacement: the dead player builds a new investigator and joins; the Lightkeeper approves; check the spend count carries over, resources go to 1 + members, and what the circle shows. Finally release one living member mid-assignment and check everything the release decision says.` },
  { dir: 'timing', port: 8190, model: 'opus', effort: 'high', task: `Timed windows and a server restart mid-session. Build a sealed table in an active assignment with five desks open at once (Lightkeeper 1440x900, players at 390x844, 820x1180, 1366x768, 1920x1080), with investigators whose abilities make ally offers (Behind Me, Premonitions, Adrenaline Rush, the Non-Combatant drive point: read backend/vtt/abilities.py for which roles have them).
1. Timed script (use page.clock or real waits; say which): the 2-minute ally offer window: accept at about 1:50 and see it land; let one lapse and try to accept at about 2:05; check the log tells the Lightkeeper and the ally, and says when it lapsed; check the countdown shown, if any, against the server's window. The approval notice on the hub (its seconds) and the spend confirm staying armed.
2. The countdown timer: start it, pause and resume from the table strip with a sheet open, let it run out, and check every desk.
3. A server restart (bash ${PT}/restart_api.sh main ${8190}) while all of these are open at once: a held mark waiting for its answer, an ally offer, an open roll with Burn and reroll available, a gilded die waiting for its choice, a Notebook draft, a pending join request, the hourglass raised and the timer running, a report half filled. Check every desk: what it shows during the outage, that it reconnects by itself, and what survives, against decisions_fix6.md (what is meant to survive and what is meant to expire with a refusal). Then reload every desk and check again. Do it once more with a restart during End Assignment's confirm.` },
]

const run = (prompt, opts) => agent(`${RELAY}\n\n${BASE}\n\n${prompt}`, { schema: RESULT, ...opts })

const results = await parallel([
  ...GROUPS.map((g) => () => run(`${RECHECK(g.dir, g.ports)}\n\nYOUR ITEMS:\n${g.items}`, { label: `recheck:${g.dir}`, phase: 'Re-check', model: g.model, effort: g.effort }).then((r) => ({ stage: 'A', name: g.dir, ...(r || { failed: true }) }))),
  ...SIDES.map((s) => () => run(`${SIDE(s.dir, s.port)}\n\nYOUR SESSION:\n${s.task}`, { label: `side:${s.dir}`, phase: 'Side checks', model: s.model, effort: s.effort }).then((r) => ({ stage: 'B', name: s.dir, ...(r || { failed: true }) }))),
])
const all = results.filter(Boolean)
const count = (v) => all.reduce((n, r) => n + (r.items || []).filter((i) => i.verdict === v).length, 0)
log(`items: ${count('fixed')} fixed, ${count('partly')} partly, ${count('not fixed')} not fixed, ${count('regressed')} regressed, ${count('not checked')} not checked; findings: ${all.reduce((n, r) => n + (r.findings || []).length, 0)}`)
return { results: all }
