export const meta = {
  name: 'playtest2-regression-sweep',
  description: 'Second playtest: check that every fix from the first playtest report holds, on private copies of the site',
  phases: [{ title: 'Regression', detail: 'one Opus agent per area batch, each with its own server, database and browser' }],
}

const SP = '/home/user/pt2'
const SRC = '/home/user/sut'
const R1 = '/home/user/harness/playtest/results/2026-10-08'
const BATCHES = args.batches

const VERDICTS = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          verdict: { type: 'string', enum: ['fixed', 'partly', 'not-fixed', 'fixed-but-new-problem', 'left-alone', 'not-checked'] },
          how_checked: { type: 'string', enum: ['browser', 'browser-and-code', 'code-only', 'none'] },
          evidence: { type: 'string', description: 'what you did and saw: steps, device size, screenshots you looked at (paths), code lines' },
          problem: { type: 'string', description: 'empty when fixed; else what is still wrong, concretely' },
          finding: { type: 'string', description: 'the F-id you logged for a problem, or empty' },
        },
        required: ['key', 'verdict', 'how_checked', 'evidence', 'problem'],
      },
    },
    new_findings: { type: 'array', items: { type: 'string' }, description: 'F-ids of every finding you logged' },
    notes: { type: 'string' },
  },
  required: ['results', 'new_findings'],
}

const ACCEPTED = `Known and accepted, not regressions (say "left-alone" or note them, do not log them): the formation papers stay a blocking dialog; Let Them In stays a notice with only Close; the hourglass stays sand only (no number); an action rated 0 has no gold pip (the star beside the name marks a gild); the creator's step 3 row overflows below about 356px; the Lightkeeper's copy of a sheet does not show held marks (a log line tells her); a few rare multi-mark timings can clear a held box one round trip early; after a server restart a stale offer card's decline still lands its mark; Notebook drafts stay in the browser after Sign out under that account's key; a sketch drawing is lost on Back after a reload; Back from the hub after a reload can pass one older hub entry; a player stays on a dead desk when the campaign is retired (QUIRKS D3); after Flourish the result slip shows the old outcome; some notebook phone controls are under 44px; the sheet's ability tab resets on a tab switch; activity history and held offers live in server memory, so a restart empties them.`

const run = (b, i) => {
  const port = 8401 + i
  const site = port - 4000
  return agent(`You are checking for regressions in Candela VTT, a React + FastAPI web app for the tabletop RPG Candela Obscura. Three days ago an AI playtest found problems; its verified report is ${R1}/report.json (full detail per item: what_happens, steps, root_cause, fix, shots) and ${R1}/report.md. Since then five pull requests fixed them. Your job: for each item in YOUR BATCH, find out whether the fix holds on the build under test, and whether fixing it broke something nearby.

The build under test: ${SRC} (commit 63d80f4; read-only: never edit it). The rules as implemented: ${SRC}/FAQ.md. Look-and-wording rules: ${SRC}/DESIGN.md. Known odd behaviour pinned by tests: ${SRC}/docs/refactor/QUIRKS.md. git log in ${SRC} shows the fix commits (search them by the item's words).

YOUR BATCH is the entry named "${b.name}" in ${SP}/regress_batches.json: ${b.count} items (list = bugs or ux; rank = its number in that list of the first report; left_alone, when set, says it was deliberately not changed).

For each item: read its full entry in report.json, read the code where the root cause was, then reproduce the ORIGINAL steps in a real browser on your own copy of the site, at the device size the item was seen on (phone 390x844 with hasTouch and isMobile, tablet 820x1180 the same, laptops 1366x768 or 1440x900, desktop 1920x1080). Every bug item must be checked in the browser; a ux item may be checked by a screenshot at the right size; use code-only only when a browser check is impossible, and say why. Try hard to make the old problem happen again (the edge the first report described, a double-click, a reload, a second tab), not just the happy path. Look at every screenshot you take before relying on it.
If an item is still broken, or the fix brought a new problem, log it the moment you see it: cd ${SP} && node finding.js --seat regress --phase Regression --kind bug|rules|ux --sev high|medium|low --title "..." --where "..." --steps "..." --expected "..." --actual "..." --shots <paths relative to ${SP} or absolute>. Put the first report's key in the title, like "[report-forgets-sent] ...". Check node finding.js --list first so you do not log what someone else already logged.
${ACCEPTED}

If the playtest's site or your own servers stop answering because the machine restarted, run bash ${SP}/start_all.sh once (it starts only what is down, for the playtest) and start your own servers again.
Your own environment (never touch the playtest's servers on 8300/4300, its seats daemon or its browsers on CDP 9301-9305; they are a live session):
- Database: psql -h localhost -p 5433 -U postgres -c "create database candela_r${port}" (drop it when done).
- Backend on ${port}: cd ${SRC}/backend && SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://127.0.0.1:${site} DATABASE_URL=postgresql://postgres@localhost:5433/candela_r${port} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > ${SP}/verify/api_${port}.log 2>&1 &   (note its PID)
- Site on ${site}: cd ${SRC}/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${site} --strictPort --outDir /home/user/build_sut > ${SP}/verify/preview_${port}.log 2>&1 &   (the config and the build exist; do not rebuild, do not edit tracked files)
- Browsers: require('${SP}/node_modules/playwright'), Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome. Write your scripts as ${SP}/verify/r${port}_*.js and screenshots under ${SP}/verify/out_${port}/.
- Building a table fast: ${SP}/checks/ has helpers from the last recheck (setup.js builds sealed and unsealed tables over the API; lib.js opens a seat with a seeded store, reads WebSocket frames, runs SQL). Copy what you need into your own files and change its ports (4310/8310) and database (bc_recheck) to yours. Sending X-Forwarded-For with a fresh address per request avoids the per-IP sign-up limit (uvicorn trusts it from 127.0.0.1). Seal a circle in SQL (circles.is_finalized, campaigns.roster_finalized, reports_open) when formation is not what you are checking. Open a desk by writing the store's candela-vtt-storage in an init script (see lib.js storeFor/openSeat).
- For a real network drop, stop and restart YOUR backend, or stall one socket with page.routeWebSocket; Playwright's setOffline does not close an open WebSocket. A gilded die waiting for its choice wobbles, so press Enter on it rather than clicking.
- When done: stop your servers by PID (kill <pid>, never pkill), and drop your database.

Return one result per item key in your batch, and the F-ids you logged.`, { label: `regress:${b.name}`, phase: 'Regression', schema: VERDICTS, model: 'opus', effort: 'high' })
}

const results = await parallel(BATCHES.map((b, i) => () => run(b, i)))
const flat = results.filter(Boolean).flatMap((r) => r.results)
const count = (v) => flat.filter((x) => x.verdict === v).length
log(`Regression: ${flat.length} items checked: ${count('fixed')} fixed, ${count('partly')} partly, ${count('not-fixed')} not fixed, ${count('fixed-but-new-problem')} fixed with a new problem, ${count('not-checked')} not checked`)
const short = BATCHES.filter((b, i) => !results[i] || results[i].results.length < b.count).map((b) => b.name)
if (short.length) log(`Batches with fewer results than items: ${short.join(', ')}`)
return { results: results.map((r, i) => ({ batch: BATCHES[i].name, ...(r || { failed: true }) })), short }
