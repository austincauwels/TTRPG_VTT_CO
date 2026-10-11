export const meta = {
  name: 'playtest2-verify',
  description: 'Second playtest: reproduce each problem cluster on a fresh copy of the site, find its cause, and adversarially re-check the serious ones',
  phases: [
    { title: 'Verify', detail: 'one Opus verifier per batch of up to 4 clusters from one area, each with its own server' },
    { title: 'Refute', detail: 'a second, adversarial check of each confirmed high-severity or rules finding' },
  ],
}

const PT = '/home/user/pt2'
const SRC = '/home/user/sut'
const BATCHES_IN = args.batches
const VMODEL = args.model || 'opus'
const VEFFORT = args.effort || 'high'
const VBASE = args.vbase
const RBASE = args.rbase

const CONTEXT = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura (the build under test, read-only: ${SRC}, commit 63d80f4; the rules as the site implements them: ${SRC}/FAQ.md; look and wording rules: ${SRC}/DESIGN.md; odd behaviour pinned by tests: ${SRC}/docs/refactor/QUIRKS.md). Its second AI playtest just ran: a Lightkeeper (1440x900 laptop) and four players (ada 1920x1080 desktop, bram 390x844 phone, cass 1366x768 laptop, dev 820x1180 tablet) played a two-assignment campaign on a private copy of the site, a test engineer ("stress") drove a death sequence, and seven "regress" agents re-checked the first playtest's report (/home/user/harness/playtest/results/2026-10-08/report.json; their verdicts: ${PT}/regress_result.json). Findings: ${PT}/findings.jsonl. How the playtest worked: ${PT}/README.md. Screenshots: ${PT}/shots/<seat>/ and ${PT}/verify/out_<port>/. Table talk ${PT}/table.md, notes ${PT}/memory/<seat>.md, browser logs ${PT}/logs/<seat>.events.jsonl, server log ${PT}/logs/api.log, the playtest database (read-only): psql -h localhost -p 5433 -U postgres candela_playtest.
Known and accepted, never confirm these as new: the formation papers stay a blocking dialog; Let Them In stays a notice; the hourglass stays sand only; an action rated 0 has no gold pip; the creator's step 3 row overflows below about 356px; the Lightkeeper's copy of a sheet does not show held marks; rare multi-mark timings can clear a held box early; after a server restart a stale offer card's decline still lands its mark; Notebook drafts stay in the browser after Sign out; a sketch is lost on Back after a reload; Back from the hub after a reload can pass one older hub entry; a player stays on a dead desk when the campaign is retired (QUIRKS D3); after Flourish the result slip shows the old outcome; some notebook phone controls are under 44px; the sheet's ability tab resets on a tab switch; activity history and held offers live in server memory, so a restart empties them. The Lightkeeper's trauma record Edit cannot add scars, on purpose.
Harness quirks: seat.js matched names as substrings, so a click could hit a similar control; the AI seats acted seconds after a screenshot; the gilded keep die wobbles, so automation needs force or Enter; headless Chromium hides scrollbars; Playwright's setOffline does not close an open WebSocket.`

const ENV = (port) => `Your own environment (the playtest's servers on 8300/4300 may be up; never touch them, but you may read its database, logs and screenshots):
- Database: psql -h localhost -p 5433 -U postgres -c "create database candela_v${port}" (drop it when done).
- Backend on ${port}: cd ${SRC}/backend && SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://127.0.0.1:${port - 4000} DATABASE_URL=postgresql://postgres@localhost:5433/candela_v${port} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > ${PT}/verify/api_${port}.log 2>&1 &   (note its PID)
- Site on ${port - 4000}: cd ${SRC}/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir /home/user/build_sut > ${PT}/verify/preview_${port}.log 2>&1 &   (the config and the build exist; do not rebuild, do not edit tracked files)
- Browsers: require('${PT}/node_modules/playwright'), Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome. Write scripts as ${PT}/verify/v${port}_*.js and screenshots under ${PT}/verify/out_${port}/. Phone: viewport 390x844 with hasTouch and isMobile; tablet 820x1180 the same.
- Building a table fast: ${PT}/checks/ has helpers (setup.js builds sealed and unsealed tables over the API; lib.js opens a seat with a seeded store, reads WebSocket frames, runs SQL); the regress agents' scripts in ${PT}/verify/r84*_*.js do much of what you need. Copy what you need and change the ports and database to yours. Sending X-Forwarded-For with a fresh address per request avoids the per-IP sign-up limit. Seal a circle in SQL (circles.is_finalized, campaigns.roster_finalized, reports_open) when formation is not what you are checking.
- For a real network drop, stop and restart YOUR backend, or stall one socket with page.routeWebSocket. A gilded die waiting for its choice wobbles, so press Enter on it.
- If the machine restarted and PostgreSQL is down, run bash ${PT}/start_all.sh once.
- Look at every screenshot you take before you rely on it. When done: stop your servers by PID (one kill each, never pkill) and drop your database.`

const VERDICT = {
  type: 'object',
  properties: {
    results: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' },
      verdict: { type: 'string', enum: ['confirmed', 'partly', 'not-reproduced', 'harness-artifact', 'by-design'] },
      severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'your severity after reproducing' },
      evidence: { type: 'string', description: 'what you did and saw: steps, screenshots you looked at, logs, DB rows' },
      root_cause: { type: 'string', description: 'file:line and why, if found' },
      fix: { type: 'string', description: 'the smallest correct fix, concretely (files, functions, what changes); say if it needs a product decision' },
      effort: { type: 'string', enum: ['S', 'M', 'L'] },
    }, required: ['key', 'verdict', 'severity', 'evidence', 'root_cause', 'fix', 'effort'] } },
  },
  required: ['results'],
}

const batchesOf = (clusters) => {
  const byArea = {}
  for (const c of clusters) (byArea[c.area] = byArea[c.area] || []).push(c)
  const out = []
  for (const list of Object.values(byArea)) for (let i = 0; i < list.length; i += 4) out.push(list.slice(i, i + 4))
  return out
}

const verify = (batch, port) => agent(`${CONTEXT}

You are an independent verifier. Reproduce each of these clusters on a FRESH copy of the site, and try hard to show it is NOT a real problem (a harness artifact, a misreading, intended behaviour per FAQ.md or DESIGN.md, the rulebook agreeing with the site, a known accepted limitation) before you call it confirmed. Default to not-reproduced if you cannot make it happen. For a cluster from the regress seat that already has a browser reproduction in its evidence, a short re-check plus the root cause is enough. For each confirmed one, find the root cause in the source (file:line) and propose the smallest correct fix. Return one result per cluster key.
Clusters to check (keys): ${JSON.stringify(batch.map((c) => c.key))}. Read each one's full entry (title, summary, steps, expected, actual, shots, first_report, notes) in ${PT}/triage_result.json (under a.clusters or b.clusters).
${ENV(port)}`, { label: `verify:${batch.map((c) => c.key).join('+')}`.slice(0, 80), phase: 'Verify', schema: VERDICT, model: VMODEL, effort: VEFFORT })

const REFUTE = {
  type: 'object',
  properties: {
    key: { type: 'string' }, stands: { type: 'boolean' },
    reasoning: { type: 'string', description: 'why it does or does not stand: the strongest case against it and whether it held' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    fix_ok: { type: 'boolean', description: 'whether the proposed fix is right; if not, say the better one in reasoning' },
  },
  required: ['key', 'stands', 'reasoning', 'severity'],
}
const refute = (c, v, port) => agent(`${CONTEXT}

Adversarial check. A verifier confirmed this finding; your job is to find the strongest reason it should NOT be in the report as stated: it is intended behaviour, the Candela Obscura rulebook agrees with the site, it needs an unrealistic setup, it was a harness artifact, the severity is overstated, or the root cause or fix is wrong. Read the code paths yourself (${SRC}) and reproduce minimally if that settles it. Default to stands=true only if the case against it fails.
The finding: cluster "${c.key}" in ${PT}/triage_result.json (under a.clusters or b.clusters); read its full entry.
The verifier's result: ${JSON.stringify(v)}
If you reproduce, use this environment:
${ENV(port)}`, { label: `refute:${c.key}`.slice(0, 60), phase: 'Refute', schema: REFUTE, model: 'opus', effort: 'high' })

let vport = VBASE
let rport = RBASE
const batches = BATCHES_IN
log(`${batches.flat().length} clusters in ${batches.length} batches (${VMODEL} ${VEFFORT})`)
const out = await pipeline(batches,
  (batch) => { const p = vport++; return verify(batch, p).then((r) => ({ batch, results: (r && r.results) || [] })) },
  async ({ batch, results }) => {
    const rows = []
    for (const v of results) {
      const c = batch.find((x) => x.key === v.key) || { key: v.key }
      let check = null
      if (v.verdict === 'confirmed' && (v.severity === 'high' || c.kind === 'rules')) check = await refute(c, v, rport++)
      rows.push({ ...v, refute: check })
    }
    const missing = batch.filter((c) => !results.some((r) => r.key === c.key)).map((c) => c.key)
    if (missing.length) log(`No verdict for: ${missing.join(', ')}`)
    return rows
  })
const verdicts = out.flat().filter(Boolean)
log(`Verified: ${verdicts.filter((v) => v.verdict === 'confirmed').length} confirmed, ${verdicts.filter((v) => v.verdict === 'partly').length} partly, ${verdicts.filter((v) => !['confirmed', 'partly'].includes(v.verdict)).length} not`)
return { verdicts }
