export const meta = {
  name: 'playtest3-triage',
  description: 'Third playtest: cluster the findings into problems and ideas, each linked to an open GitHub issue when it repeats one',
  phases: [{ title: 'Triage', detail: 'two Opus triagers: bugs and medium items first, then low items and praise' }],
}

const PT = '/home/user/pt3'
const SRC = '/home/user/sut'
const N = args.n
const AREAS = ['accounts', 'creator', 'hub', 'joining', 'campaign-management', 'circle-formation', 'gm-desk', 'player-desk', 'dice', 'abilities', 'marks-scars', 'circle-page', 'notebook', 'pass-notes', 'hourglass-timer', 'advancement-wrap', 'connection-sync', 'phone-tablet', 'accessibility', 'other']
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
    issue: { type: 'string', description: 'the open GitHub issue this repeats ("#40", or "#45: <checklist line>"), "#16" if it is kept on purpose, or empty when new' },
    summary: { type: 'string', description: 'what happens, merged from all members, with the device/screen sizes it was seen on' },
    steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' },
    shots: { type: 'array', items: { type: 'string' }, description: 'the best 1 to 3 screenshot paths, relative to the playtest folder' },
    reproduce: { type: 'boolean', description: 'true for every NEW bug and rules cluster and for a new medium or high ux cluster whose claim is a checkable fact; false for a repeat of an open issue, for #16 items, and for pure taste' },
    notes: { type: 'string', description: 'anything a verifier should know: suspected harness artifact, conflicting reports, which open issue it overlaps' },
  },
  required: ['key', 'title', 'kind', 'severity', 'area', 'members', 'seats', 'issue', 'summary', 'reproduce'],
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

const CONTEXT = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura (the build under test, read-only: ${SRC}, commit 2d86b77; the rules as the site implements them: ${SRC}/FAQ.md; look and wording rules: ${SRC}/DESIGN.md; odd behaviour pinned by tests: ${SRC}/docs/refactor/QUIRKS.md). This was its THIRD AI playtest (12 October 2026), on the real beta site (candela-beta.gatergrid.com, its own database, which you cannot reach). A Lightkeeper (dm, 1440x900 laptop) and four players (ada 1920x1080 desktop, bram 390x844 phone, cass 1366x768 laptop, dev 820x1180 tablet) played one assignment, The Drowned Choir, in a new campaign, The Saltmere Chapter: sign-up, investigators, join requests, circle formation, three rounds of play (marks, a scar attempt, pass notes, the notebook and a sketch map, the hourglass and timer, circle resources), reports, End Assignment and advancement.
What happened at the start: Robert (a real person, account Chilly) was going to play; he built Pontius Aganus (Scholar, Professor), asked to join, and was approved. He then left before play, and Ada (an AI seat) took his place. The site has no way to take an approved investigator off a roster, so Pontius stayed as a ghost member for the whole session (counted in resources, the seal, reports). Robert's two findings are seat "robert". Before the run, a first attempt on 12 October was blocked by the sandbox proxy (F001's 401s came from that proxy, not from the site; judge F001 on the UI behaviour only).
They logged ${N} findings in ${PT}/findings.jsonl (one JSON per line: id, seat, kind bug|rules|ux|idea|praise, sev, title, where, steps, expected, actual, shots, phase). How the playtest worked: ${PT}/README.md and ${PT}/personas.md. Screenshots: ${PT}/shots/<seat>/ (paths in findings are relative to ${PT} or absolute). Table talk: ${PT}/table.md. Each seat's notes: ${PT}/memory/<seat>.md. Each step's turn summaries: ${PT}/results/*.json. Browser logs: ${PT}/logs/<seat>.events.jsonl.
OPEN ISSUES: ${PT}/issues.md lists every open GitHub issue, the #45 checklist of low UX items, and #16, the behaviour kept on purpose by Robert's decision. A finding that repeats one of those is NOT new: set 'issue' to it (and reproduce=false). A #16 item is never a bug.
Harness quirks: seat.js matches names as substrings (a click can hit a similar control); the gilded keep die animates, so automation needs force or Enter ("element is not stable" is partly a Playwright artifact: judge whether a real tap would also miss); headless Chromium hides scrollbars; the agents sometimes cited each other's finding IDs wrongly in their summaries, so trust findings.jsonl.`

phase('Triage')
const ta = await agent(`${CONTEXT}

You are triaging. YOUR SET: every finding whose kind is bug or rules, and every ux or idea finding with sev high or medium. Read ALL ${N} findings (so you can see duplicates logged under other kinds or severities) and ${PT}/issues.md. Group YOUR SET into clusters: one cluster per distinct underlying problem or idea, merging duplicates from every seat and device (say which devices in the summary). You may also absorb low-severity or praise findings that are plainly the same problem (list them in members). Set 'issue' when a cluster repeats an open issue or #16. Re-rate severity on the evidence: high = blocks play, loses data, lets the rules be broken or shows a wrong number; medium = a visible defect or real friction in a common case; low = a nit. Check the screenshots of anything high or surprising, and the code when a claim is about rules or data. Mark reproduce as the schema says. Leave praise themes empty. 'covered' must list every ID you placed.`, { label: 'triage:main', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
if (!ta) return { error: 'triage A failed' }
log(`Triage A: ${ta.clusters.length} clusters (${ta.clusters.filter((c) => c.reproduce).length} to reproduce) from ${ta.covered.length} findings`)

const tb = await agent(`${CONTEXT}

You are the second triager. Another triager has already clustered all bug/rules findings and the medium/high ux and idea findings; their clusters (keys, titles and members) are: ${JSON.stringify(ta.clusters.map((c) => ({ key: c.key, title: c.title, members: c.members })))}
YOUR SET: every finding NOT in their members. That is mostly ux and idea findings of low severity, and praise. Read ${PT}/issues.md first. Group your ux/idea findings into clusters (one per distinct problem or idea, duplicates merged, devices noted, severity re-judged on the evidence, 'issue' set when it repeats an open issue, a #45 line or #16) and the praise findings into themes (what works well and should be kept). If one of your findings is really the same as one of their clusters, do not make a new cluster: leave it out of yours and list its ID in 'covered' anyway. If one of yours is really a bug (something broken, not taste), make it a bug cluster with reproduce=true. Use keys that differ from theirs. 'covered' must list every ID in your set.`, { label: 'triage:low-praise', phase: 'Triage', schema: TRIAGE, model: 'opus', effort: 'high' })
log(`Triage B: ${tb ? tb.clusters.length : 0} clusters, ${tb && tb.praise ? tb.praise.length : 0} praise themes`)
const covered = new Set([...ta.covered, ...((tb && tb.covered) || [])])
const uncovered = [...Array(N).keys()].map((i) => `F${String(i + 1).padStart(3, '0')}`).filter((id) => !covered.has(id))
if (uncovered.length) log(`Not covered by either triager: ${uncovered.join(', ')}`)
return { a: ta, b: tb, uncovered }
