export const meta = {
  name: 'playtest-triage-verify-report',
  description: 'Dedupe the 277 playtest findings, reproduce every bug independently, adversarially re-check the high ones, and write the playtest report',
  phases: [
    { title: 'Triage', detail: 'cluster duplicates and re-rate: bugs and medium first, then low and praise' },
    { title: 'Verify', detail: 'reproduce each bug cluster on a fresh copy of the site, find its root cause' },
    { title: 'Refute', detail: 'a second, adversarial check of each confirmed high-severity or rules finding' },
    { title: 'Report', detail: 'write the playtest report' },
  ],
}

const SP = (args && args.sp) || '/path/to/scratch'  // set with Workflow args { sp, pt, src }
const PT = (args && args.pt) || `${SP}/playtest`
const SRC = (args && args.src) || '/path/to/checkout-under-test'

const AREAS = ['accounts', 'creator', 'hub', 'joining', 'circle-formation', 'gm-desk', 'player-desk', 'dice', 'abilities', 'marks-scars', 'circle-page', 'notebook', 'pass-notes', 'hourglass-timer', 'advancement-wrap', 'connection-sync', 'phone-tablet', 'accessibility', 'other']
const CLUSTER = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'short kebab-case id, unique' },
    title: { type: 'string', description: 'one plain sentence naming the problem or idea' },
    kind: { type: 'string', enum: ['bug', 'rules', 'ux', 'idea'] },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    area: { type: 'string', enum: AREAS },
    members: { type: 'array', items: { type: 'string' }, description: 'every finding ID (F0xx) this cluster covers' },
    seats: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'what happens, merged from all members, with the device/screen sizes it was seen on' },
    steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' },
    shots: { type: 'array', items: { type: 'string' }, description: 'the best 1 to 3 screenshot paths, relative to the playtest folder' },
    reproduce: { type: 'boolean', description: 'true for every bug and rules cluster, and for a ux cluster whose claim is a checkable fact (something off screen, a control that does not respond)' },
    notes: { type: 'string', description: 'anything a verifier should know: suspected harness artifact, conflicting reports, a fix someone already saw' },
  },
  required: ['key', 'title', 'kind', 'severity', 'area', 'members', 'seats', 'summary', 'reproduce'],
}
const TRIAGE = {
  type: 'object',
  properties: {
    clusters: { type: 'array', items: CLUSTER },
    praise: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, members: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['title', 'members', 'summary'] } },
    covered: { type: 'array', items: { type: 'string' }, description: 'every finding ID you placed in a cluster or praise theme' },
  },
  required: ['clusters', 'covered'],
}

const CONTEXT = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura (source, read-only: ${SRC}; the rules as the site implements them: ${SRC}/FAQ.md). Five AI playtesters (a Lightkeeper, i.e. the game master, on a 1440x900 laptop, and four players: ada on a 1920x1080 desktop, bram on a 390x844 phone, cass on a 1366x768 laptop, dev on an 820x1180 tablet, plus a "stress" test engineer) just played a full session on a private copy of the site and logged 277 findings in ${PT}/findings.jsonl (one JSON per line: id, seat, kind bug|rules|ux|idea|praise, sev, title, where, steps, expected, actual, shots, phase). How the playtest worked: ${PT}/README.md. Screenshots are under ${PT}/shots/<seat>/ (paths in findings are relative to ${PT}). The table talk is ${PT}/table.md, each seat's notes ${PT}/memory/<seat>.md, the browsers' automatic error and WebSocket logs ${PT}/logs/<seat>.events.jsonl, the server log ${PT}/logs/api.log, the game database: psql -h localhost -p 5433 -U postgres candela_playtest (read-only).
Known harness quirk: 'seat.js offline on' (Playwright context.setOffline) does not close a WebSocket that is already open in Chromium, so "network drop" findings may not reflect a real drop; findings about it need care.`

const ENV = (port) => `Your own environment (never touch the playtest's servers on 8300/4300, its browsers or its seats daemon; you may read its database, logs and screenshots):
- Database: psql -h localhost -p 5433 -U postgres -c "create database candela_v${port}" (drop it when done). On a fresh database the first sign-up fails once with a 500 (a known bug): just retry.
- Backend on port ${port}: cd ${SRC}/backend && SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://127.0.0.1:${port - 4000} DATABASE_URL=postgresql://postgres@localhost:5433/candela_v${port} nohup /home/user/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > ${PT}/verify/api_${port}.log 2>&1 &
- Site on port ${port - 4000}: cd /home/user/TTRPG_VTT_CO/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir ${SP}/build_head > ${PT}/verify/preview_${port}.log 2>&1 &   (the config exists; it is the same build the playtest used; do not rebuild, do not edit tracked files).
- Browsers: Playwright in ${SP}/pw (require('${SP}/pw/node_modules/playwright')), Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome. Write scripts as ${PT}/verify/v${port}_*.js and screenshots under ${PT}/verify/out_${port}/. Phone: viewport 390x844 with hasTouch and isMobile; tablet 820x1180 the same. Accounts via the sign-up form or POST /api/auth/register {username,email,password} (5 a minute per server). ${PT}/scripts and ${SP}/pw hold many example scripts for seeding a campaign, approving, finalizing the circle and opening desks (look at check_bars.js, hourglass_setup.js, final_smoke.js). For a real network drop, stop and restart your own backend, or close the socket from the page; Playwright's setOffline does not drop an open WebSocket.
- Look at every screenshot you take before you rely on it. When done: stop your servers by PID (one kill each, never pkill) and drop your database.`

phase('Triage')
const ta = await agent(`${CONTEXT}

You are triaging. YOUR SET: every finding whose kind is bug or rules, every ux or idea finding with sev high or medium. Read ALL 277 findings (so you can see duplicates logged under other kinds or severities), then group YOUR SET into clusters: one cluster per distinct underlying problem or idea, merging duplicates from every seat and device (say which devices in the summary). You may also absorb low-severity or praise findings that are plainly the same problem as one of your clusters (list them in members). Re-rate the severity of each cluster on the evidence: high = blocks play, loses data, lets the rules be broken or shows a wrong number; medium = a visible defect or real friction in a common case; low = a nit. Check the screenshots of anything high or surprising. Mark reproduce=true for every bug and rules cluster and for checkable ux facts. Note in 'notes' anything that looks like a harness artifact rather than a site problem, or a report contradicted by a later one (for example an issue a player later said no longer reproduced). Leave praise themes empty. 'covered' must list every ID you placed.`, { label: 'triage:main', phase: 'Triage', schema: TRIAGE })
if (!ta) return { error: 'triage failed' }
log(`Triage A: ${ta.clusters.length} clusters (${ta.clusters.filter((c) => c.reproduce).length} to reproduce) from ${ta.covered.length} findings`)

const tbP = agent(`${CONTEXT}

You are the second triager. Another triager has already clustered all bug/rules findings and the medium/high ux and idea findings; their clusters (titles and members) are: ${JSON.stringify(ta.clusters.map((c) => ({ key: c.key, title: c.title, members: c.members })))}
YOUR SET: every finding NOT in their members. That is mostly ux and idea findings of low severity, and praise. Group your ux/idea findings into clusters (one per distinct problem or idea, duplicates merged, devices noted, severity re-judged on the evidence) and the praise findings into themes (what works well and should be kept). If one of your findings is really the same as one of their clusters, do not make a new cluster: leave it out of yours and list its ID in 'covered' anyway (it is accounted for). If one of yours is really a bug (something broken, not a matter of taste), make it a bug cluster with reproduce=true. Use cluster keys that differ from theirs. 'covered' must list every ID in your set.`, { label: 'triage:low-praise', phase: 'Triage', schema: TRIAGE })

const VERDICT = {
  type: 'object',
  properties: {
    results: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' },
      verdict: { type: 'string', enum: ['confirmed', 'partly', 'not-reproduced', 'harness-artifact', 'by-design'] },
      severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'your severity after reproducing' },
      evidence: { type: 'string', description: 'what you did and saw: steps, screenshots you looked at, logs, DB rows' },
      root_cause: { type: 'string', description: 'file:line and why, if found' },
      fix: { type: 'string', description: 'the smallest correct fix, concretely' },
      effort: { type: 'string', enum: ['S', 'M', 'L'] },
    }, required: ['key', 'verdict', 'severity', 'evidence', 'root_cause', 'fix', 'effort'] } },
  },
  required: ['results'],
}

// Clusters to reproduce, in batches of up to 4 from the same area, so one verifier sets up
// the scene once for related problems
const batchesOf = (clusters) => {
  const byArea = {}
  for (const c of clusters.filter((x) => x.reproduce)) (byArea[c.area] = byArea[c.area] || []).push(c)
  const out = []
  for (const list of Object.values(byArea)) for (let i = 0; i < list.length; i += 4) out.push(list.slice(i, i + 4))
  return out
}

const verify = (batch, port) => agent(`${CONTEXT}

You are an independent verifier. Reproduce each of these clusters on a FRESH copy of the site, and try hard to show it is NOT a real problem (a harness artifact, a misreading, intended behaviour, the rulebook agreeing with the site) before you call it confirmed. Default to not-reproduced if you cannot make it happen. For each confirmed one, find the root cause in the source (file:line) and propose the smallest correct fix. Return one result per cluster key.
Clusters: ${JSON.stringify(batch)}
${ENV(port)}`, { label: `verify:${batch.map((c) => c.key).join('+')}`.slice(0, 80), phase: 'Verify', schema: VERDICT })

const REFUTE = {
  type: 'object',
  properties: {
    key: { type: 'string' }, stands: { type: 'boolean' },
    reasoning: { type: 'string', description: 'why it does or does not stand: the strongest case against it and whether it held' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['key', 'stands', 'reasoning', 'severity'],
}
const refute = (c, v, port) => agent(`${CONTEXT}

Adversarial check. A verifier confirmed this finding; your job is to find the strongest reason it should NOT be in the report as stated: it is intended behaviour, the Candela Obscura rulebook agrees with the site, it needs an unrealistic setup, it was a harness artifact, the severity is overstated, or the root cause or fix is wrong. Read the code paths yourself (${SRC}) and reproduce minimally if that settles it. Default to stands=true only if the case against it fails.
The finding: ${JSON.stringify(c)}
The verifier's result: ${JSON.stringify(v)}
If you reproduce, use this environment:
${ENV(port)}`, { label: `refute:${c.key}`.slice(0, 60), phase: 'Refute', schema: REFUTE })

let vport = 8401
let rport = 8440
const runVerify = (clusters) => pipeline(batchesOf(clusters),
  (batch) => { const p = vport++; return verify(batch, p).then((r) => ({ batch, results: (r && r.results) || [] })) },
  async ({ batch, results }) => {
    const out = []
    for (const v of results) {
      const c = batch.find((x) => x.key === v.key) || { key: v.key }
      let check = null
      if (v.verdict === 'confirmed' && (v.severity === 'high' || c.kind === 'rules')) check = await refute(c, v, rport--)
      out.push({ ...v, refute: check })
    }
    return out
  })

const vA = runVerify(ta.clusters)
const tb = await tbP
log(`Triage B: ${tb ? tb.clusters.length : 0} clusters, ${tb && tb.praise ? tb.praise.length : 0} praise themes`)
const vB = tb ? await runVerify(tb.clusters) : []
const verdicts = [...(await vA), ...vB].flat().filter(Boolean)
log(`Verified: ${verdicts.filter((v) => v.verdict === 'confirmed').length} confirmed, ${verdicts.filter((v) => v.verdict === 'partly').length} partly, ${verdicts.filter((v) => !['confirmed', 'partly'].includes(v.verdict)).length} not`)

phase('Report')
const allClusters = [...ta.clusters, ...((tb && tb.clusters) || [])]
const covered = new Set([...ta.covered, ...((tb && tb.covered) || [])])
const uncovered = [...Array(277).keys()].map((i) => `F${String(i + 1).padStart(3, '0')}`).filter((id) => !covered.has(id))
const report = await agent(`${CONTEXT}

Write the playtest report. Inputs:
- Clusters (problems and ideas, deduplicated): ${JSON.stringify(allClusters)}
- Verification results (reproduced on a fresh copy; refute = a second adversarial check): ${JSON.stringify(verdicts)}
- Praise themes: ${JSON.stringify((tb && tb.praise) || [])}
- How the session went: ${PT}/act1_result.json and ${PT}/act2_result.json (each turn's summary), ${PT}/table.md (the table talk, the story), ${PT}/memory/*.md.
- Findings not covered by any cluster: ${JSON.stringify(uncovered)} (check them in findings.jsonl; fold any real ones into the report).
Write two files:
1. ${PT}/report.json: { "session": { "story": a short recap of The Drowned Bell as played (who did what, how it ended), "stats": { findings, clusters, confirmed bugs, etc. }, "timeline": [ { "phase", "what happened" } ] }, "bugs": [ ranked: confirmed and partly-confirmed bugs and rules problems, each { key, title, severity, area, devices, what_happens, steps, root_cause, fix, effort, verdict, members, shots } ], "not_reproduced": [ { key, title, why } ], "ux": [ ranked ux clusters { key, title, severity, area, devices, what_happens, suggestion, members, shots } ], "ideas": [ ranked { key, title, why, members } ], "keep": [ praise themes { title, summary, members } ], "personas": { "dm"|"ada"|"bram"|"cass"|"dev": a few sentences on how the site felt for that player and their device, from their exit notes and memory }, "top_fixes": [ the 10 changes that would most improve the next real session, each one sentence, referencing keys ] }.
2. ${PT}/report.md: the same as a readable document for the developer (Austin, who wrote the app) and the group's organizer: plain language, short sections, no em dashes, ranked so the most important things come first.
Rank bugs by harm to a real session (data loss and wrong numbers first, then blocked actions, then visible defects), breaking ties by how many seats hit them. Only claims the evidence supports. Use the verifier's severity where it differs from triage, and leave out of "bugs" anything the refuter knocked down (list it under not_reproduced with the reason). Return a short summary of the report.`, { label: 'report', phase: 'Report' })
return { clusters: allClusters.length, verdicts, report }
