export const meta = {
  name: 'playtest5-recheck',
  description: 'Fifth playtest, re-check pass: round 8 items on main 1f0fbd4 against control 1bc48a0, locally (5 agents)',
  phases: [
    { title: 'Re-check', detail: '5 checkers by round 8 group: death and restarts Opus high, charter, papers and ux Sonnet medium' },
  ],
}

const PT = '/home/user/pt5'
const H = '/home/user/harness/playtest'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const BASE = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura. This is the FIFTH playtest's re-check pass, run locally in Chromium (Playwright), not on the live site. You are a separate checker: you did not build these fixes.
- Build under test: main 1f0fbd4 (PR 89, fix round 8), a detached worktree at /home/user/wt/main (frontend already built in frontend/dist).
- Control: 1bc48a0 (before round 8), /home/user/wt/control (built too).
- Read first: ${PT}/decisions8.md (round 8's binding decisions), ${PT}/pr_body.md (what PR 89 says it fixed, and its seven calls, all confirmed as built on 23 October except call 1, which a later PR changes: ignore call 1), and for each of your items its section in ${PT}/triage8.md (cause, file:line, the fix). The ORIGINAL steps of each item are in the fourth playtest report: ${H}/results/2026-10-14-run4/report.md and report.json (cluster ids, steps, screenshots), and in GitHub issues #72 to #88 (austincauwels/TTRPG_VTT_CO) via ToolSearch "select:mcp__github__issue_read" (read only; never comment, file or edit). Earlier decisions still binding: ${PT}/decisions_run4.md and ${PT}/issue16.md (behaviour kept on purpose: not bugs). Known and open: #79 (a Non-Combatant card open during a restart goes with no word; FAQ.md says so).
- How round 8's own final check did its browser checks (reuse its methods): ${H}/results/2026-10-15-fix8/fix8_final_check_result.json (large: grep it for your item ids, do not read it whole).
- Rules and wording: /home/user/wt/main/FAQ.md (rules as implemented), DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand, one-sentence confirms), docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. A behaviour a decision or a doc describes is not a bug; a doc that disagrees with the code is a finding.
- Servers, yours alone: bash ${PT}/up.sh <main|control> <api_port> starts a backend with its own database and the built site on api_port-4000; bash ${PT}/restart_api.sh <main|control> <api_port> restarts only the backend (a server restart mid-session; the database is kept); bash ${PT}/down.sh <api_port> --drop <db> stops and drops at the end (databases are named pt5_<tree>_<port>). Never pkill -f a pattern (it kills your own shell): stop by PID. If PostgreSQL on 5433 is down: bash ${PT}/start_all.sh.
- Playwright: require('${PT}/node_modules/playwright'), executablePath '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless. Worked examples (build tables through the API, seal them in SQL, open a desk by seeding the store's candela-vtt-storage in an init script guarded by sessionStorage, stall a socket with page.routeWebSocket): ${PT}/verify/v8401_lib.js and the other v84*.js files there; copy and change ports and paths, never edit the originals. Seal in SQL: circles.is_finalized, campaigns.roster_finalized, reports_open (SQL changes to reports_open do not broadcast). Send X-Forwarded-For with a fresh address per request so sign-up limits do not bite. Sizes: phone 390x844 touch, tablet 820x1180 touch, laptop 1366x768, wide 1440x900. A gilded die waiting for its choice wobbles: press Enter on it. Animated dice can report "not stable": use force or a trial click and check by eye. A Node socket on a character whose desk is open takes the desk over.
- Work in your own folder (given below): scripts, screenshots, notes. Look at every screenshot you cite. Never edit the repository or the worktrees (except the git-excluded preview configs up.sh writes), never commit or push.
- Budget: about 150 tool calls. If you run short, mark the remaining items "not checked" with why, rather than guessing. No em dashes in what you write.`

const RESULT = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: {
      item: { type: 'string', description: 'issue or line id and a few words, e.g. "#72 scar owed across restart" or "88.12 +1 stops at 12"' },
      control: { type: 'string', description: 'what the control 1bc48a0 showed' },
      head: { type: 'string', description: 'what main 1f0fbd4 showed, with sizes and desks tried' },
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

const RECHECK = (dir, ports) => `You are a re-checker. For each item below, replay its ORIGINAL steps (from the fourth playtest report, the issue or the triage notes) at the size and on the desk it was seen on, first on the control to see the problem, then on main to see it fixed. Then try the neighbouring paths a real table would hit: a reload, the other desk, a second tab on the same account, a double press, and a server restart where the item is about state. Look hard for anything round 8 broke, and for seams between its five groups (they were built in separate worktrees and merged by hand: one seam, the store dropping amended_at, was found and fixed, so look for others). Also log anything else wrong you notice on the way, as a finding.
Your folder: ${PT}/verify/${dir}. Ports: main api ${ports[0]} (site ${ports[0] - 4000}), control api ${ports[1]} (site ${ports[1] - 4000}).`

const GROUPS = args.groups

const run = (prompt, opts) => agent(`${RELAY}\n\n${BASE}\n\n${prompt}`, { schema: RESULT, ...opts })
const results = await parallel(GROUPS.map((g) => () =>
  run(`${RECHECK(g.dir, g.ports)}\n\nYOUR ITEMS:\n${g.items.map((i) => `- ${i}`).join('\n')}${g.note ? `\n${g.note}` : ''}`, { label: `recheck:${g.dir}`, phase: 'Re-check', model: g.model, effort: g.effort })
    .then((r) => ({ name: g.dir, ...(r || { failed: true }) }))))
const all = results.filter(Boolean)
const count = (v) => all.reduce((n, r) => n + (r.items || []).filter((i) => i.verdict === v).length, 0)
log(`items: ${count('fixed')} fixed, ${count('partly')} partly, ${count('not fixed')} not fixed, ${count('regressed')} regressed, ${count('not checked')} not checked; findings: ${all.reduce((n, r) => n + (r.findings || []).length, 0)}`)
return { results: all }
