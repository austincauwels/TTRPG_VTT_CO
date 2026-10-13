export const meta = {
  name: 'fix6-final-check',
  description: 'Fix round 6: a final Opus review and three Opus browser checks against 77452a3, then one repair',
  phases: [
    { title: 'Check', detail: 'one final reviewer and three browser checkers, read-only' },
    { title: 'Repair', detail: 'one Opus agent fixes what the checks found, on the session branch' },
  ],
}
const PT = '/home/user/pt6'
const BR = 'claude/loving-fermi-2giawj'
const BASEC = '77452a3'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const TRAILER = `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WaLz6UBTQ5XaTKSYwqeMKA`
const BASE = `Candela VTT (React + FastAPI, a web app for the tabletop RPG Candela Obscura). Fix round 6 (older bugs #17-#22, #38-#44, medium UX #23-#26, #46, #47, and #67) is merged on branch ${BR} in /home/user/TTRPG_VTT_CO (HEAD), on top of ${BASEC} (main today). Change under test: git -C /home/user/TTRPG_VTT_CO diff ${BASEC}..HEAD. The full backend suite passed after the merge (2008 passed, 1 skipped). Binding decisions: ${PT}/decisions.md (read it first); earlier binding decisions: ${PT}/decisions_fix5.md, ${PT}/decisions_fix4.md and GitHub issue #16. Never ask for a decision to be removed or weakened. Triage notes: ${PT}/triage.md. The per-group implementer, reviewer and repair results: ${PT}/fix_groups_result.json (their 'choices' list the open calls each group made; 'skipped' what each left). The groups (log, rolls, dead, ui) were built separately and merged by hand; conflicts were only in docs/refactor/QUIRKS.md and WEBSOCKET.md (connect steps 7 and 8, merged by hand), and gameStore.js merged automatically. Rules: DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand only, confirms one short sentence with a one-verb button), FAQ.md, docs/refactor/RULES_CHECK.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. No em dashes anywhere. Never pkill -f a pattern; stop processes by PID. If PostgreSQL (port 5433) is down run bash ${PT}/start_all.sh. Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds earlier verifiers' helper scripts (v84NN_lib.js, v84NN_setup.js): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL, and open seats by seeding the store's candela-vtt-storage in an init script; copy and adapt ports, database and output folder. Use X-Forwarded-For with a fresh address per request. To test a restart, stop the backend by PID and start it again on the same port and database. A stall can be made with page.routeWebSocket.`

const servers = (name, port, dir, build) => `backend from ${dir}/backend on ${port}: psql -h localhost -p 5433 -U postgres -c "create database bc_${name}_${port}"; cd ${dir}/backend && DATABASE_URL=postgresql://postgres@localhost:5433/bc_${name}_${port} SECRET_KEY=<64 hex> CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/bc_${port}.log 2>&1 & ; site: cd ${dir}/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir ${build} > /tmp/bcp_${port}.log 2>&1 &`

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

You are an Opus browser checker. For each item below, replay the issue's original steps (read it on GitHub via ToolSearch "select:mcp__github__issue_read" if you need them): first see the problem on the unfixed control (${BASEC}), then see it fixed on HEAD, at phone (390x844), tablet (820x1180) and laptop (1366x768) sizes and on both desks where it applies. Also try the obvious neighbouring paths (reload, the other desk, a second tab, a server restart where the item is about restarts) and look for anything the change broke. Items:
${items}

Servers (ports yours alone):
- HEAD: ${servers(name + '_head', fp, '/home/user/TTRPG_VTT_CO', '/tmp/build_main6')}   (/tmp/build_main6 is a build of HEAD; do not rebuild it.)
- Control: ${servers(name + '_ctl', cp, '/home/user/wt/control', '/tmp/build_control')}   (/home/user/wt/control is a detached worktree at ${BASEC}.)
Save screenshots under /tmp/bc6_${name}/shots and look at every one. Stop your servers by PID and drop your databases at the end.
Report per item: what the control showed, what HEAD showed, a verdict, screenshot paths. Report each problem found on HEAD as an issue: blocking (item not fixed, broken, against a decision, a crash), should (a real gap), nit.`, { label: `browser:${name}`, phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

const review = () => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are the final Opus reviewer before the pull request. Review the whole merged diff as the last line before real players. In particular:
- Each decision in decisions.md is built in full, and nothing decided this round or earlier was removed or weakened.
- Seams between the groups: the log group's stored held mark (characters.held_mark, taken_mark_ids, activity_lines, the connect sequence in ws/endpoint.py) against the rolls group's replayed roll_result and the Lightkeeper felt replay on connect (order of frames on connect, both in WEBSOCKET.md steps 7 and 8 and in code); the store's connect and reconnect handling in gameStore.js changed by log (resendMarks, keptOverReload in partialize), rolls (replayed rolls) and dead (investigator retired by a rejoin, roster fetch only when active); the dead group's refusals (DEAD_REFUSED, is_dead in character_facts) against the log group's held mark at a death; Sign out clearing drafts (ui) against gameStore logout changes from other groups.
- Data: the activity_lines write on every log line (its own session, no foreign key by choice, pruning), its cost and failure handling; startup on a legacy database (test_00_startup).
- Choices the groups made that Robert may not expect (fix_groups_result.json 'choices' and 'skipped'), for example: Accept on a relationship proposed before a death is still allowed; the Lightkeeper's felt also replays after her reload; End Assignment does not clear a held mark. Say whether each fits decisions.md.
- Races and double presses, the WebSocket protocol (every new or changed message in WEBSOCKET.md, AUTH.md and test_surface.py), schema and openapi pins, QUIRKS.md tests flipped not deleted, docs consistent with each other and the code, no em dashes in added lines, no AI model names in files.
- Every item the group reports claim exists in the merged code.
Run targeted backend tests if useful (own throwaway database, drop it after), not the full suite. Report per item whether the code does what is claimed, and every issue with a level.`, { label: 'final-review', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

phase('Check')
const checks = await parallel([
  () => review(),
  () => browser('log_rolls', '#17 the Activity Log survives a server restart (both desks). #18 a soak or Death Defy offer open across a restart comes back with the same card; declining it after the restart behaves as one answer, and a card whose offer the server no longer holds closes without landing a mark. #23 the Lightkeeper sees a held mark on her copy of the sheet, live. #43 a mark taken during a silent outage (page.routeWebSocket) survives a reload and is taken once. #19 after Flourish (or Bending Spoons) the result slip shows the new outcome, on the roller and on the table. #40 after a reload with an open roll, the tray shows the roll again with Burn and reroll (no dice sound), and the burn works; a settled roll comes back settled.', 8011, 8012),
  () => browser('dead', '#38 a dead investigator: the server refuses its scar, and relationship proposals (and counters) from or to it on REST and WebSocket; the living player sees the dead investigator\'s relationship paper say Dead with no Propose. #22 the player of a dead investigator opening a retired campaign\'s desk gets no 403 in the console. #39 a rejoin from another device: the replaced investigator\'s open desk (and the same desk after a reload) goes to the hub with a notice and the used invite banner is gone. #41 a replacement approved by join request keeps the predecessor\'s spend count. #42 with the Case Ledger open when the campaign is retired, Play (and the Last Played tome) stays on the hub with a notice. #47 the player Registry shows a Fallen section with name, campaign and a Fallen stamp, no Play, Leave or Delete.', 8021, 8022),
  () => browser('ui', '#67 the Illumination track is a ring of 12 pips around the candle on both Circle pages (pip 12 at top, gold milestones at 3, 6, 9, Lightkeeper pips are buttons with 44px non-overlapping touch targets plus +1 and -1, the player ring one labelled image; check 320, 360, 390, tablet and laptop; the desk summary card keeps its dots). #24 the ability tab is remembered across desk tab switches; its buttons are 44px on a phone. #25 every Notebook and sketch control is 44px on a phone. #26 the creator step 3 row fits at 320 and 360. #44 Heading, List and Quote on an empty line keep the mark and the caret after it. #20 Sign out clears that account\'s Notebook and creator drafts; a server-ended session keeps them. #21 Back after a reload keeps a sketch in progress; leaving warns while strokes are unsaved. #46 Approve, View sheet and Reject are 44px at 390x844.', 8031, 8032),
])
const ok = checks.filter(Boolean)
const all = ok.flatMap((c) => c.issues || [])
const needs = all.filter((x) => x.level !== 'nit').length || ok.some((c) => (c.items || []).some((i) => i.verdict === 'not fixed' || i.verdict === 'partly'))
log(`checks: ${ok.length}/4 returned; ${all.filter((x) => x.level === 'blocking').length} blocking, ${all.filter((x) => x.level === 'should').length} should, ${all.filter((x) => x.level === 'nit').length} nit`)
if (!needs) return { checks, repair: null }

const repair = await agent(`${RELAY}

${BASE}

You are the repair agent. Work in /home/user/TTRPG_VTT_CO on branch ${BR}. Do not push. The final checks found these (a final review and three browser checks): ${JSON.stringify(checks)}

Fix every blocking and should issue and every item marked not fixed or partly, unless you can show the finding is wrong or the fix would go against decisions.md (then say why under skipped). Where a finding questions a choice Robert might not expect, but the choice fits decisions.md, leave it and say so under skipped so the organiser can ask him. Apply nits only where plainly right and cheap. Keep each fix minimal. A backend test for every server change; docs updated where they describe the behaviour; flip QUIRKS tests, never delete them. Then run the backend tests that cover your changes (own throwaway database: DATABASE_URL=postgresql://postgres@localhost:5433/<db> SECRET_KEY=<64 hex> CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files> in backend/; drop it after), rebuild the frontend (cd frontend && npx vite build --outDir /tmp/build_main6), and re-check each changed screen in Chromium by replaying the finding's steps (servers: ${servers('repair', 8041, '/home/user/TTRPG_VTT_CO', '/tmp/build_main6')}). Commit as you go: a short title, a body with what changed and how it was checked, no em dashes, no AI model names, ending with exactly:
${TRAILER}`, { label: 'repair', phase: 'Repair', model: 'opus', effort: 'high', schema: IMPL })
return { checks, repair }
