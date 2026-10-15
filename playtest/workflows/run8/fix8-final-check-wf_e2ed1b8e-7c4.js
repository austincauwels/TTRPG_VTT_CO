export const meta = {
  name: 'fix8-final-check',
  description: 'Fix round 8: a final Opus review and three Sonnet browser checks against 1bc48a0, then one repair',
  phases: [
    { title: 'Check', detail: 'one final reviewer and three browser checkers, read-only' },
    { title: 'Repair', detail: 'one Opus agent fixes what the checks found, on the session branch' },
  ],
}
const PT = '/home/user/pt8'
const BR = 'claude/fix-round-8'
const BASEC = '1bc48a0'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const TRAILER = `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A1wzsfAj4Qm2nbUqe2spTn`
const BASE = `Candela VTT (React + FastAPI, a web app for the tabletop RPG Candela Obscura). Fix round 8 (bugs #72 to #85, UX #86 and #87, lines of #88 by id 88.1-88.21, 88.uN, 88.iN, and D10 the burn preview label) is merged on branch ${BR} in /home/user/TTRPG_VTT_CO (HEAD), on top of ${BASEC} (main today, fix round 7). Change under test: git -C /home/user/TTRPG_VTT_CO diff ${BASEC}..HEAD. The full backend suite passed after the merge (2052 passed, 1 skipped). Binding decisions: ${PT}/decisions8.md (read it first; Robert's 10 decisions this round); earlier binding decisions: ${PT}/decisions_fix4.md, decisions_fix5.md, decisions_fix6.md, decisions_fix7.md, decisions_run4.md and issue16.md. Never ask for a decision to be removed or weakened. Triage by id: ${PT}/triage8.md. The per-group implementer, reviewer and repair results: ${PT}/fix8_groups_result.json (their 'choices' list the open calls; 'skipped' what each left, including states they did not drive in a browser). The five groups (death, restarts, charter, papers, ux) were built separately and merged by hand with no conflicts; after the merge one commit added amended_at to the store's assignment_report_submitted handler (88.u12). Rules: DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand only, confirms one short sentence with a one-verb button), FAQ.md, docs/refactor/RULES_CHECK.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. No em dashes anywhere. Never pkill -f a pattern; stop processes by PID. If PostgreSQL (port 5433) is down run bash ${PT}/start_all.sh. Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds earlier verifiers' helper scripts (v84NN_lib.js, v84NN_setup.js): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL (circles.is_finalized, campaigns.roster_finalized), and open seats by seeding the store's candela-vtt-storage in an init script guarded by sessionStorage; copy and adapt ports, database and output folder. Use X-Forwarded-For with a fresh address per request. Seed states with SQL or the API where the UI path is long. A server restart: stop the backend by PID and start it again on the same port and database. A gilded die waiting for its choice wobbles: press Enter on it. A stall: page.routeWebSocket.`

const servers = (name, port, dir, build) => `backend from ${dir}/backend on ${port}: psql -h localhost -p 5433 -U postgres -c "create database bc_${name}_${port}"; cd ${dir}/backend && DATABASE_URL=postgresql://postgres@localhost:5433/bc_${name}_${port} SECRET_KEY=$(cat ${PT}/secret_key) CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/bc_${port}.log 2>&1 & ; site: cd ${dir}/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir ${build} > /tmp/bcp_${port}.log 2>&1 &`

const IMPL = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, what: { type: 'string' }, checked: { type: 'string' } }, required: ['issue', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } },
    commits: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
  },
  required: ['fixed', 'skipped', 'commits', 'tests'],
}
const FINDINGS = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      level: { type: 'string', enum: ['blocking', 'should', 'nit'] },
      item: { type: 'string' },
      where: { type: 'string', description: 'file:line or screen' },
      problem: { type: 'string' },
      fix: { type: 'string' },
    }, required: ['level', 'item', 'where', 'problem', 'fix'] } },
    items: { type: 'array', items: { type: 'object', properties: {
      item: { type: 'string' },
      control: { type: 'string', description: 'what the control showed (browser checks), or n/a' },
      fixed: { type: 'string', description: 'what HEAD showed, or for the review whether the claim exists in code' },
      verdict: { type: 'string', enum: ['fixed', 'partly', 'not fixed', 'not checked'] },
      shots: { type: 'array', items: { type: 'string' } },
    }, required: ['item', 'control', 'fixed', 'verdict'] } },
    summary: { type: 'string' },
  },
  required: ['issues', 'items', 'summary'],
}

const browser = (name, items, fp, cp) => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are a browser checker. For each item below, replay the issue's original steps (read it on GitHub via ToolSearch "select:mcp__github__issue_read", owner austincauwels, repo TTRPG_VTT_CO, and the fourth playtest's findings under /home/user/harness/playtest/results/2026-10-14-run4/): first see the problem on the unfixed control (${BASEC}), then see it fixed on HEAD, at phone (390x844), tablet (820x1180) and laptop (1366x768) sizes and on both desks where it applies. Also try the obvious neighbouring paths (reload, the other desk, a second tab, a server restart where the item is about restarts) and look for anything the change broke. Items:
${items}

Servers (ports yours alone):
- HEAD: ${servers(name + '_head', fp, '/home/user/TTRPG_VTT_CO', '/tmp/build_main8')}   (/tmp/build_main8 is a build of HEAD; do not rebuild it.)
- Control: ${servers(name + '_ctl', cp, '/home/user/wt/control', '/tmp/build_control8')}   (/home/user/wt/control is a detached worktree at ${BASEC}.)
Save screenshots under /tmp/bc8_${name}/shots and look at every one. Stop your servers by PID and drop your databases at the end.
Report per item: what the control showed, what HEAD showed, a verdict, screenshot paths. Report each problem found on HEAD as an issue: blocking (item not fixed, broken, against a decision, a crash), should (a real gap), nit.`, { label: `browser:${name}`, phase: 'Check', schema: FINDINGS, model: 'sonnet', effort: 'medium' })

const review = () => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are the final Opus reviewer before the pull request. Review the whole merged diff as the last line before real players. In particular:
- Each item is fixed as decisions8.md and triage8.md describe, and nothing decided this round or earlier was removed or weakened (round 6's held marks, the roll replay and the dead as a record; decisions_fix4's release rules).
- Server and protocol: characters.scar_pending and let_in columns (test_00_startup, both tests), the death lowering pools (#73) inside the death's commit with the circle lock, departed_spends (#77) across release, rejoin, approve and End Assignment, the revive refusal (#82), DEAD_REFUSED for reports (#76) in access.py and circle.py, the charter refusal before the seal and the finalize rule (#74), spending_paused (88.u11: closed at End, reopened at the next dispatch, players cannot write the flag), +1 Illumination at 12 (88.12), amended_at and the no-change refusal (88.u12, 88.u13), activity_history on every connect and the restart paths of #78, #79, #80, #81 (a held Death Defy mark lands first and its offer closes), the felt burn stamp (#86). Races: two sockets, a double press, a death during a held mark, a restart between frames. Every new or changed message and refusal in WEBSOCKET.md and test_surface.py; openapi.json for held_marks and let_in.
- Seams between groups: death's character.py and access.py against charter's circle.py (#76 is in both); restarts' gameStore.js spendRefusal against papers' CircleView.jsx; death's revive refusal against ux's InvestigatorDossier.jsx Revive removal; death's endpoint.py let_in block against restarts' activity_history change; charter's spending_paused against papers' spending line and refillRule wording on both Circle pages; tests/support.py edited by two groups.
- Choices Robert may not expect (fix8_groups_result.json 'choices', 56 of them): say whether each fits decisions8.md, and list any he should be asked about.
- 44px touch targets, help on demand, short confirms, no em dashes in added lines, no AI model names in files (commit trailers aside).
Run targeted backend tests if useful (own throwaway database, drop it after), not the full suite. Report per item whether the code does what is claimed, and every issue with a level.`, { label: 'final-review', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

phase('Check')
const checks = await parallel([
  () => review(),
  () => browser('server', 'Death, restarts and reports (server paths): #72 (a scar owed survives a server restart: roster card and sheet), #73 (a death lowers the circle pools and maximum live on every desk, with one log line; reload agrees), #76 (a dead investigator cannot file or amend a report; no form on the dead desk), #77 (leave and rejoin in one assignment keeps the circle spend count), #82 (a player cannot Revive; the Lightkeeper can, and the log names it), #78 (after a restart a refused gilded keep shows no outcome and no Burn), #79 (Non-Combatant offers survive a reload; after a restart they are explained; no offer logged for a full drive), #80 (no new roll while a gilded choice waits), #81 (a mark dealt beside a stored Death Defy hold: the held mark lands first and the old offer does not come back), 88.7 (Let in: press Play shows in a second browser and goes after Play), #84 (the let-in Play button name starts with Play).', 8011, 8012),
  () => browser('desk', 'Lightkeeper desk, charter, dice and felt: #74 (charter read-only before the seal; the players chapter house wins at the seal), #75 (Edit sheet log shows a change late in a long field), #83 (a second Lightkeeper tab drops a handled request pop-up and count), #86 (a player open burn shows as a mark on her slip on the felt; it goes when the burn is used or the roll closes), D10 (burn preview reads Reroll: Survey, 2 dice), #87 (in-play controls 44px on touch: roll modifications, ability mark offer, scar dialog, relationship negotiation), 88.1 (roster card line for a held mark), 88.3 (Add Illumination confirm only while reports are unfiled), 88.10 (advance log line names the refill), 88.12 (+1 Illumination stops at 12), 88.13 (ally cards name the mark), 88.16 and 88.17 (join request toast; a new request clears the old note), 88.18 (Reset info button name), 88.u8 (Secret armed state is loud), 88.u12 and 88.i1 (report card shows Amended and line filed on its front, live), 88.u13 (an amendment with no change is refused), 88.u17 and 88.u26 (keep slip and log wording), 88.5 (keep-a-die dice still on touch).', 8021, 8022),
  () => browser('player', 'Player sheet, Circle page, papers and small UX: 88.2 (Used this assignment for once-per-assignment abilities on both sheets), 88.4 (formation parts show a done tick, also on the phone strip), 88.6 (Notebook Contents lines per page on a phone), 88.8 (owed-scar banner wording), 88.9 and 88.11 (advancement dialog and receipt wording after a rollover), 88.14 (stale tab Confirm advancement points to Use this tab), 88.15 (superseded Lightkeeper tab has Use this tab), 88.19 (a refused sheet edit announced once), 88.20 (Chapter House draft says another member changed it), 88.21 (Join dialog buttons aligned on a tablet), 88.u3 (relationship two-way hint), 88.u7 (circle spend announced; Train die held note), 88.u9 (empty dispatch says No dispatch yet), 88.u11 (spending closed after End Assignment with the reason on the player Circle page and the refusal shown; open again after the next dispatch), 88.u14 (Adrenaline Rush full drive names), 88.u20 and 88.u21 (Illumination heading name; name counter labelled), 88.u25 (Field Notes empty contents line), 88.u27 (chosen Raise pressed), 88.i3 (Stitch with no marks says so).', 8031, 8032),
])
const ok = checks.filter(Boolean)
const all = ok.flatMap((c) => c.issues || [])
const needs = all.filter((x) => x.level !== 'nit').length || ok.some((c) => (c.items || []).some((i) => i.verdict === 'not fixed' || i.verdict === 'partly'))
log(`checks: ${ok.length}/4 returned; ${all.filter((x) => x.level === 'blocking').length} blocking, ${all.filter((x) => x.level === 'should').length} should, ${all.filter((x) => x.level === 'nit').length} nit`)
if (!needs) return { checks, repair: null }

const repair = await agent(`${RELAY}

${BASE}

You are the repair agent. Work in /home/user/TTRPG_VTT_CO on branch ${BR}. Do not push. The final checks found these (a final review and three browser checks): ${JSON.stringify(checks)}

Fix every blocking and should issue and every item marked not fixed or partly, unless you can show the finding is wrong or the fix would go against decisions8.md or an earlier decision (then say why under skipped). Where a finding questions a choice Robert might not expect, but the choice fits the decisions, leave it and say so under skipped so the organiser can ask him. Apply nits only where plainly right and cheap. Keep each fix minimal. A backend test for every server change; docs updated where they describe the behaviour; flip QUIRKS tests, never delete them. Then run the backend tests that cover your changes (own throwaway database: DATABASE_URL=postgresql://postgres@localhost:5433/<db> SECRET_KEY=$(cat ${PT}/secret_key) CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files> in backend/; drop it after), rebuild the frontend (cd frontend && npx vite build --outDir /tmp/build_main8), and re-check each changed screen in Chromium by replaying the finding's steps (servers: ${servers('repair', 8041, '/home/user/TTRPG_VTT_CO', '/tmp/build_main8')}). Commit as you go: a short title, a body with what changed and how it was checked, no em dashes, no AI model names, ending with exactly:
${TRAILER}`, { label: 'repair', phase: 'Repair', model: 'opus', effort: 'high', schema: IMPL })
return { checks, repair }