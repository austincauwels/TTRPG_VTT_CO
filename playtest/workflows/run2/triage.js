export const meta = {
  name: 'playtest2-triage',
  description: 'Second playtest: cluster the findings into problems and ideas, linked to the first report and the regression sweep',
  phases: [{ title: 'Triage', detail: 'two Opus triagers: bugs and medium items first, then low items and praise' }],
}

const PT = '/home/user/pt2'
const SRC = '/home/user/sut'
const N = args.n
const AREAS = ['accounts', 'creator', 'hub', 'joining', 'campaign-management', 'circle-formation', 'gm-desk', 'player-desk', 'dice', 'abilities', 'marks-scars', 'death', 'circle-page', 'notebook', 'pass-notes', 'hourglass-timer', 'advancement-wrap', 'connection-sync', 'phone-tablet', 'accessibility', 'other']
const CLUSTER = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'short kebab-case id, unique, different from every key in the first report' },
    title: { type: 'string', description: 'one plain sentence naming the problem or idea' },
    kind: { type: 'string', enum: ['bug', 'rules', 'ux', 'idea'] },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    area: { type: 'string', enum: AREAS },
    members: { type: 'array', items: { type: 'string' }, description: 'every finding ID (F0xx) this cluster covers' },
    seats: { type: 'array', items: { type: 'string' } },
    first_report: { type: 'string', description: 'the first report key this continues (a fix that did not hold or brought this), or empty' },
    summary: { type: 'string', description: 'what happens, merged from all members, with the device/screen sizes it was seen on' },
    steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' },
    shots: { type: 'array', items: { type: 'string' }, description: 'the best 1 to 3 screenshot paths, relative to the playtest folder' },
    reproduce: { type: 'boolean', description: 'true for every bug and rules cluster and for a ux cluster whose claim is a checkable fact; false when every member came from the regress seat with a browser reproduction already in its evidence, or for pure taste' },
    notes: { type: 'string', description: 'anything a verifier should know: suspected harness artifact, conflicting reports, a known accepted limitation, a regression result that already reproduced it' },
  },
  required: ['key', 'title', 'kind', 'severity', 'area', 'members', 'seats', 'summary', 'reproduce'],
}
const TRIAGE = {
  type: 'object',
  properties: {
    clusters: { type: 'array', items: CLUSTER },
    praise: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, members: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['title', 'members', 'summary'] } },
    covered: { type: 'array', items: { type: 'string' }, description: 'every finding ID you placed in a cluster or praise theme, or set aside as covered' },
  },
  required: ['clusters', 'covered'],
}

const CONTEXT = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura (the build under test, read-only: ${SRC}, commit 63d80f4; the rules as the site implements them: ${SRC}/FAQ.md; look and wording rules: ${SRC}/DESIGN.md; odd behaviour pinned by tests: ${SRC}/docs/refactor/QUIRKS.md). This was its SECOND AI playtest (11 October 2026). A Lightkeeper (game master, 1440x900 laptop) and four players (ada 1920x1080 desktop, bram 390x844 phone, cass 1366x768 laptop, dev 820x1180 tablet) played a two-assignment campaign, The Lantern Ward, on a private copy of the site: sign-up, investigators, a rejected join request, a password reset, formation, a death by a fourth scar and its take-back, a new investigator invited back, a server restart mid-campaign, a second campaign created and retired. A "stress" test engineer drove the death sequence, and seven "regress" agents re-checked every item of the first playtest's report (${'/home/user/harness/playtest/results/2026-10-08/report.json'}) on their own copies; their per-item verdicts are in ${PT}/regress_result.json.
They logged ${N} findings in ${PT}/findings.jsonl (one JSON per line: id, seat, kind bug|rules|ux|idea|praise, sev, title, where, steps, expected, actual, shots, phase). How the playtest worked: ${PT}/README.md and ${PT}/personas.md. Screenshots: ${PT}/shots/<seat>/ and ${PT}/verify/out_<port>/ (paths in findings are relative to ${PT} or absolute). Table talk: ${PT}/table.md. Each seat's notes: ${PT}/memory/<seat>.md. Each act's turn summaries: ${PT}/act1_result.json, act2_result.json, act3_result.json. Browser logs: ${PT}/logs/<seat>.events.jsonl; server log ${PT}/logs/api.log; the game database (read-only): psql -h localhost -p 5433 -U postgres candela_playtest.
Run notes: act 1's first Approval, Circle and Ready turns were lost to an off-table question relayed into every agent and were re-run; the Lightkeeper's Edit cannot add scars (by design), so the death took four scar cycles. The organiser restarted the server at 04:15:29 to 04:15:59 UTC on purpose.
Known and accepted (not new problems; note them, do not count them as bugs): the formation papers stay a blocking dialog; Let Them In stays a notice; the hourglass stays sand only; an action rated 0 has no gold pip; the creator's step 3 row overflows below about 356px; the Lightkeeper's copy of a sheet does not show held marks; rare multi-mark timings can clear a held box early; after a server restart a stale offer card's decline still lands its mark; Notebook drafts stay in the browser after Sign out; a sketch is lost on Back after a reload; Back from the hub after a reload can pass one older hub entry; a player stays on a dead desk when the campaign is retired (QUIRKS D3); after Flourish the result slip shows the old outcome; some notebook phone controls are under 44px; the sheet's ability tab resets on a tab switch; the activity history and held offers live in server memory, so a restart empties them.
Harness quirks: seat.js matches names as substrings (a click can hit a similar control); the AI seats act seconds after a screenshot; the gilded keep die wobbles, so automation needs force or Enter; headless Chromium hides scrollbars; some agents' psql calls were refused by a permission check, not by the site.`

phase('Triage')
const ta = await agent(`${CONTEXT}

You are triaging. YOUR SET: every finding whose kind is bug or rules, and every ux or idea finding with sev high or medium. Read ALL ${N} findings (so you can see duplicates logged under other kinds or severities), and read regress_result.json. Group YOUR SET into clusters: one cluster per distinct underlying problem or idea, merging duplicates from every seat and device (say which devices in the summary). You may also absorb low-severity or praise findings that are plainly the same problem (list them in members). Set first_report to the first report's key when a cluster is a fix that did not hold or a problem a fix brought. Re-rate severity on the evidence: high = blocks play, loses data, lets the rules be broken or shows a wrong number; medium = a visible defect or real friction in a common case; low = a nit. Check the screenshots of anything high or surprising, and the code when a claim is about rules or data. Mark reproduce as the schema says. Note in 'notes' anything that looks like a harness artifact, a known accepted limitation, or a report contradicted by a later one. Leave praise themes empty. 'covered' must list every ID you placed.`, { label: 'triage:main', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
if (!ta) return { error: 'triage A failed' }
log(`Triage A: ${ta.clusters.length} clusters (${ta.clusters.filter((c) => c.reproduce).length} to reproduce) from ${ta.covered.length} findings`)

const tb = await agent(`${CONTEXT}

You are the second triager. Another triager has already clustered all bug/rules findings and the medium/high ux and idea findings; their clusters (keys, titles and members) are: ${JSON.stringify(ta.clusters.map((c) => ({ key: c.key, title: c.title, members: c.members })))}
YOUR SET: every finding NOT in their members. That is mostly ux and idea findings of low severity, and praise. Group your ux/idea findings into clusters (one per distinct problem or idea, duplicates merged, devices noted, severity re-judged on the evidence) and the praise findings into themes (what works well and should be kept; say when a praise confirms a first-report fix). If one of your findings is really the same as one of their clusters, do not make a new cluster: leave it out of yours and list its ID in 'covered' anyway. If one of yours is really a bug (something broken, not taste), make it a bug cluster with reproduce=true. Use keys that differ from theirs. 'covered' must list every ID in your set.`, { label: 'triage:low-praise', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
log(`Triage B: ${tb ? tb.clusters.length : 0} clusters, ${tb && tb.praise ? tb.praise.length : 0} praise themes`)
const covered = new Set([...ta.covered, ...((tb && tb.covered) || [])])
const uncovered = [...Array(N).keys()].map((i) => `F${String(i + 1).padStart(3, '0')}`).filter((id) => !covered.has(id))
if (uncovered.length) log(`Not covered by either triager: ${uncovered.join(', ')}`)
return { a: ta, b: tb, uncovered }
