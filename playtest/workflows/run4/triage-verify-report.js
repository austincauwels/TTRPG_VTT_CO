export const meta = {
  name: 'playtest4-triage-verify-report',
  description: 'Fourth playtest stage D: triage all findings (play plus re-check and side checks), reproduce new play problems locally, adversarially re-check serious ones, write the report',
  phases: [
    { title: 'Triage', detail: 'two Opus triagers: serious items, then low items and praise' },
    { title: 'Verify', detail: 'up to 4 verifiers by area on local copies of 1bc48a0 (Opus high for server and rules, Sonnet medium for UI)' },
    { title: 'Refute', detail: 'an Opus skeptic per confirmed high or rules finding' },
    { title: 'Report', detail: 'one Opus writer' },
  ],
}

const PT = '/home/user/play4'
const CK = '/home/user/pt4'
const SRC = '/home/user/wt/main'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const NF = args.nf
const NR = args.nr
const AREAS = ['accounts', 'creator', 'hub', 'joining', 'campaign-management', 'circle-formation', 'gm-desk', 'player-desk', 'dice', 'abilities', 'marks-scars', 'circle-page', 'notebook', 'pass-notes', 'hourglass-timer', 'advancement-wrap', 'connection-sync', 'phone-tablet', 'accessibility', 'other']

const CONTEXT = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura. Build under test: main 1bc48a0 (read-only source: ${SRC}; rules as implemented: ${SRC}/FAQ.md; look and wording: ${SRC}/DESIGN.md; odd behaviour pinned by tests: ${SRC}/docs/refactor/QUIRKS.md; protocol: ${SRC}/docs/refactor/WEBSOCKET.md). This is its FOURTH AI playtest (14 October 2026), after four fix rounds (PRs 61, 68, 70, 71). It had three stages:
- A, re-check (local copies, control 2d86b77): six agents replayed every item those PRs fixed. B, side checks (local): advancement near 12 with Resource Management, scars up to a death, and timed windows plus server restarts. Their results: ${CK}/../harness/playtest/results/2026-10-14-run4/recheck/*.json, i.e. /home/user/harness/playtest/results/2026-10-14-run4/recheck/ (items with verdicts, findings, method). Their ${NR} findings and non-fixed items are flattened, with ids R001 onward, in ${PT}/recheck_findings.jsonl. They were all SEEN ON A LOCAL COPY OF THIS BUILD by the agent that logged them (already reproduced once).
- C, blind play on the real beta site (candela-beta.gatergrid.com, build 1bc48a0; you cannot reach its database): a Lightkeeper (dm, 1440x900 laptop) and four AI players (ada 1920x1080 desktop, bram 390x844 phone, cass 1366x768 laptop, dev 820x1180 tablet) played one assignment, The Ferryman's Psalm, in a new campaign, The Gullhaven Chapter: sign-up, investigators, join requests, circle formation, three rounds of play, reports, End Assignment, advancement. They logged ${NF} findings, ids F001 onward, in ${PT}/findings.jsonl (id, seat, kind bug|rules|ux|idea|praise, sev, title, where, steps, expected, actual, shots, phase). How it worked: ${PT}/README.md, ${PT}/personas.md. Screenshots ${PT}/shots/<seat>/. Table talk ${PT}/table.md. Seat notes and exit notes ${PT}/memory/<seat>.md. Turn summaries ${PT}/results/*.json. Browser logs ${PT}/logs/.
DECIDED: ${CK}/decisions.md (binding decisions of every round, the calls Robert kept as built, what is known and open) with ${CK}/decisions_fix4.md to decisions_fix7.md and ${CK}/issue16.md. OPEN ISSUES: ${PT}/issues.md. A finding that repeats an open issue or line is NOT new: name it. A decided behaviour or a #16 item is never a bug.
Harness quirks: seat.js matches names as substrings (a click can hit a similar control); animated dice make Playwright say "element is not stable" (judge whether a real tap would also miss); headless Chromium hides scrollbars; agents sometimes cite each other's finding ids wrongly in summaries, so trust the jsonl files. Play seats acted minutes apart, so time windows they report are mismeasured. ${RELAY}`

const CLUSTER = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'short kebab-case id, unique' },
    title: { type: 'string', description: 'one plain sentence naming the problem or idea' },
    kind: { type: 'string', enum: ['bug', 'rules', 'ux', 'idea'] },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    area: { type: 'string', enum: AREAS },
    members: { type: 'array', items: { type: 'string' }, description: 'every finding id (F0xx, R0xx) this cluster covers' },
    seats: { type: 'array', items: { type: 'string' }, description: 'play seats and/or re-check sources' },
    issue: { type: 'string', description: 'the open issue or line this repeats ("#60: 60.10"), "#16" or "decided: <which>" if kept on purpose, or empty when new' },
    summary: { type: 'string', description: 'what happens, merged from all members, with the device sizes it was seen on' },
    steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' },
    shots: { type: 'array', items: { type: 'string' } },
    reproduce: { type: 'boolean', description: 'true for a NEW bug or rules cluster, or a new medium/high ux cluster with a checkable claim, whose members are ONLY play findings (F); false when an R member already shows it on a local copy, for repeats of open issues, decided items and pure taste' },
    notes: { type: 'string', description: 'for a verifier: suspected harness artifact, conflicting reports, the code you suspect' },
  },
  required: ['key', 'title', 'kind', 'severity', 'area', 'members', 'seats', 'issue', 'summary', 'reproduce'],
}
const TRIAGE = {
  type: 'object',
  properties: {
    clusters: { type: 'array', items: CLUSTER },
    praise: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, members: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['title', 'members', 'summary'] } },
    covered: { type: 'array', items: { type: 'string' }, description: 'every finding id you placed in a cluster or praise theme, or set aside as covered' },
  },
  required: ['clusters', 'covered'],
}

phase('Triage')
const ta = await agent(`${CONTEXT}

You are triaging. YOUR SET: every F finding whose kind is bug or rules, every F ux or idea finding with sev high or medium, and EVERY R finding (all of them, any severity, including the recheck-item rows). Read ALL findings in both files first so you see duplicates across kinds and stages. Group your set into clusters: one per distinct underlying problem or idea, merging duplicates across seats, devices and stages. You may absorb low or praise F findings that are plainly the same problem. Set 'issue' for repeats and decided items. Re-rate severity on the evidence: high = blocks play, loses data, lets the rules be broken or shows a wrong number; medium = a visible defect or real friction in a common case; low = a nit. Check screenshots of anything high or surprising, and the code when a claim is about rules or data (for example Cass at Body 3 of 3 with no scar: what does FAQ.md and the code say about when a scar comes). Mark reproduce as the schema says. Leave praise empty. 'covered' lists every id you placed.`, { label: 'triage:main', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
if (!ta) return { error: 'triage A failed' }
log(`Triage A: ${ta.clusters.length} clusters (${ta.clusters.filter((c) => c.reproduce).length} to reproduce) from ${ta.covered.length} findings`)

const tb = await agent(`${CONTEXT}

You are the second triager. The first triager clustered every R finding, every F bug and rules finding and the medium or high F ux and ideas. Their clusters (key, title, members): ${JSON.stringify(ta.clusters.map((c) => ({ key: c.key, title: c.title, members: c.members })))}
YOUR SET: every F finding NOT in their members: mostly low ux and idea findings, and praise. Read ${PT}/issues.md first. Group your ux and idea findings into clusters (duplicates merged, devices noted, severity re-judged, 'issue' set for repeats and decided items) and praise into themes (what works well and should be kept). If one of yours is really the same as one of their clusters, leave it out of your clusters but list it in 'covered'. If one of yours is really a bug, make it a bug cluster with reproduce=true. Use keys that differ from theirs. 'covered' lists every id in your set.`, { label: 'triage:low-praise', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
log(`Triage B: ${tb ? tb.clusters.length : 0} clusters, ${tb && tb.praise ? tb.praise.length : 0} praise themes`)
const covered = new Set([...ta.covered, ...((tb && tb.covered) || [])])
const ids = [...Array(NF).keys()].map((i) => `F${String(i + 1).padStart(3, '0')}`).concat([...Array(NR).keys()].map((i) => `R${String(i + 1).padStart(3, '0')}`))
const uncovered = ids.filter((id) => !covered.has(id))
if (uncovered.length) log(`Not covered by either triager: ${uncovered.join(', ')}`)
const clusters = [...ta.clusters, ...((tb && tb.clusters) || [])]

// Batches by area: server/rules-heavy areas on Opus, UI areas on Sonnet; at most 4 per batch, at most 4 batches
const SERVER = new Set(['marks-scars', 'abilities', 'dice', 'connection-sync', 'advancement-wrap', 'circle-page', 'campaign-management'])
const todo = clusters.filter((c) => c.reproduce)
const groups = { server: todo.filter((c) => SERVER.has(c.area) || c.kind === 'rules'), ui: todo.filter((c) => !(SERVER.has(c.area) || c.kind === 'rules')) }
const batches = []
for (const [kind, list] of Object.entries(groups)) {
  const n = Math.min(2, Math.ceil(list.length / 4))
  for (let i = 0; i < n; i++) batches.push({ kind, items: list.filter((_, j) => j % n === i) })
}
const overflow = batches.filter((b) => b.items.length > 6)
if (overflow.length) log(`Large batches: ${overflow.map((b) => `${b.kind} ${b.items.length}`).join(', ')}`)

const ENV = (port) => `Your own environment (never use the beta site):
- bash ${CK}/up.sh main ${port} starts a backend with its own database and the built site of 1bc48a0 on ${port - 4000}; bash ${CK}/restart_api.sh main ${port} restarts the backend; bash ${CK}/down.sh ${port} --drop pt4_main_${port} at the end. Never pkill -f; stop by PID. PostgreSQL down: bash ${CK}/start_all.sh.
- Playwright: require('${CK}/node_modules/playwright'), executablePath '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'. Worked examples (build and seal tables over the API and SQL, open a desk with a seeded store, sizes, stalled sockets): ${CK}/verify/v8401_lib.js and the folders under ${CK}/verify/ from stages A and B (copy, never edit). X-Forwarded-For with a fresh address per request avoids sign-up limits. Press Enter on a wobbling gilded die.
- Work in ${CK}/verify/d_${port}/. Look at every screenshot you rely on.`

const VERDICT = {
  type: 'object',
  properties: {
    results: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' },
      verdict: { type: 'string', enum: ['confirmed', 'partly', 'not-reproduced', 'harness-artifact', 'by-design'] },
      severity: { type: 'string', enum: ['high', 'medium', 'low'] },
      evidence: { type: 'string', description: 'what you did and saw: steps, screenshots, logs, DB rows' },
      root_cause: { type: 'string', description: 'file:line and why, if found' },
      fix: { type: 'string', description: 'the smallest correct fix; say if it needs a product decision' },
      effort: { type: 'string', enum: ['S', 'M', 'L'] },
    }, required: ['key', 'verdict', 'severity', 'evidence', 'root_cause', 'fix', 'effort'] } },
  },
  required: ['results'],
}
const REFUTE = {
  type: 'object',
  properties: {
    key: { type: 'string' }, stands: { type: 'boolean' },
    reasoning: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    fix_ok: { type: 'boolean' },
  },
  required: ['key', 'stands', 'reasoning', 'severity'],
}

let vport = 8210
let rport = 8250
const verified = await pipeline(batches,
  (b) => {
    const p = vport
    vport += 10
    return agent(`${CONTEXT}

You are an independent verifier. Reproduce each cluster below on a FRESH local copy of the build, and try hard to show it is NOT a real problem (a harness artifact, a misreading, decided behaviour, the rulebook agreeing with the site, a #16 item) before calling it confirmed. Default to not-reproduced if you cannot make it happen. For each confirmed one find the root cause (file:line) and the smallest correct fix. Budget about 120 tool calls. Return one result per key.
Clusters: ${JSON.stringify(b.items)}
${ENV(p)}`, { label: `verify:${b.kind}:${b.items.map((c) => c.key).join('+')}`.slice(0, 80), phase: 'Verify', schema: VERDICT, ...(b.kind === 'server' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' }) })
      .then((r) => ({ b, results: (r && r.results) || [] }))
  },
  async ({ b, results }) => {
    const rows = []
    for (const v of results) {
      const c = b.items.find((x) => x.key === v.key) || { key: v.key }
      let check = null
      if ((v.verdict === 'confirmed' || v.verdict === 'partly') && (v.severity === 'high' || c.kind === 'rules')) {
        const p = rport
        rport += 1
        check = await agent(`${CONTEXT}

Adversarial check. A verifier confirmed this finding; find the strongest reason it should NOT be in the report as stated: decided behaviour, the rulebook agreeing with the site, an unrealistic setup, a harness artifact, overstated severity, or a wrong root cause or fix. Read the code yourself and reproduce minimally if that settles it. stands=true only if the case against it fails.
The cluster: ${JSON.stringify(c)}
The verifier's result: ${JSON.stringify(v)}
${ENV(p)}`, { label: `refute:${c.key}`.slice(0, 60), phase: 'Refute', schema: REFUTE, model: 'opus', effort: 'high' })
      }
      rows.push({ ...v, refute: check })
    }
    const missing = b.items.filter((c) => !results.some((r) => r.key === c.key)).map((c) => c.key)
    if (missing.length) log(`No verdict for: ${missing.join(', ')}`)
    return rows
  })
const verdicts = verified.flat().filter(Boolean)
log(`Verified: ${verdicts.filter((v) => v.verdict === 'confirmed').length} confirmed, ${verdicts.filter((v) => v.verdict === 'partly').length} partly, ${verdicts.filter((v) => !['confirmed', 'partly'].includes(v.verdict)).length} not`)

phase('Report')
const report = await agent(`${CONTEXT}

Write the report of Candela VTT's FOURTH AI playtest for Austin (who wrote the app) and Robert (who runs the server and the group). Inputs (read them all): the stage A and B result files (items and verdicts per area, findings, method), ${PT}/findings.jsonl, ${PT}/recheck_findings.jsonl, ${PT}/table.md, ${PT}/results/*.json, ${PT}/memory/*.md (exit notes), ${PT}/issues.md, ${CK}/decisions.md, and these:
TRIAGE (clusters and praise): ${JSON.stringify({ clusters, praise: (tb && tb.praise) || [], uncovered })}
VERDICTS on the clusters marked reproduce (with an adversarial refute on confirmed high or rules ones): ${JSON.stringify(verdicts)}
Clusters with reproduce=false and R members count as seen on a local copy (say "seen in the re-check" or "seen in a side check"); those with only F members and reproduce=false are repeats, decided items or unverified low items (say so).
Write two files:
1. ${PT}/report.json: { "stats": { "recheck_items": {fixed, partly, not_fixed, not_checked}, "findings_play", "findings_checks", "clusters", "new_confirmed", "repeats", "not_reproduced" }, "recheck": [ per area { area, fixed, partly, not_fixed, not_checked, notes } ], "story": short recap of The Ferryman's Psalm as played, "timeline": [ { phase, what } ], "bugs": [ ranked new bugs and rules problems { key, title, severity, area, devices, what_happens, steps, root_cause, fix, effort, evidence: "verified" | "seen in re-check" | "seen in side check" | "unverified", members, shots } ], "repeats": [ { key, issue, what_this_run_added } ], "not_reproduced": [ { key, title, why } ], "ux": [ ranked new ux clusters { key, title, severity, area, devices, what_happens, suggestion, evidence, members } ], "ideas": [ { key, title, why, members, issue } ], "keep": [ praise themes ], "personas": { dm, ada, bram, cass, dev: a few sentences each }, "decisions_for_robert": [ product questions only he can answer, one sentence each with the options ], "top_fixes": [ the 10 changes that would most improve the next real session, referencing keys ], "method_notes": [ what to do differently next time ] }.
2. ${PT}/report.md: the same as a readable document, plain language, short sections, no em dashes, most important first: "The short version" (5 to 7 bullets), "Fix these first", "Decisions for Robert", "Did the fixes hold" (the re-check table by area), the side checks, the session and its timeline, new bugs (a ranked table, then a short section per high and medium one), repeats of open issues, UX, ideas, keep, the players' view, method notes.
Rank bugs by harm to a real session (data loss and wrong numbers first, then blocked actions, then visible defects). Use the verifier's severity, or the refuter's where it differs. Leave out anything found by-design, not reproduced or a harness artifact (list it under not_reproduced with why). Only claims the evidence supports. Never write model names. Return a 10-line summary.`, { label: 'report', phase: 'Report', model: 'opus', effort: 'high' })

return { triage: { a: ta, b: tb, uncovered }, verdicts, report }
