export const meta = {
  name: 'fix7-groups',
  description: 'Fix round 7 (low UX checklists #69, #45, #60) in three groups: implement, review, repair, each in its own worktree',
  phases: [
    { title: 'Implement', detail: 'one implementer per group, own branch and worktree' },
    { title: 'Review', detail: 'one reviewer per group, read-only, with decisions7.md' },
    { title: 'Repair', detail: 'the group model applies the review' },
  ],
}

const PT = '/home/user/pt6'
const BASE = 'e5356d4'
const GROUPS = args.groups
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'

const RULES = `Repository rules (Candela VTT, a React + FastAPI web app for the tabletop RPG Candela Obscura):
- DESIGN.md holds the look and wording rules ("Lightkeeper", never "GM", on screen; 44px touch targets; help on demand behind an "i", hover or focus, never permanent sublines; a confirm is one short sentence with a one-verb button). FAQ.md holds the rules as implemented. docs/refactor/RULES_CHECK.md records rules reading against the rulebook. docs/refactor/WEBSOCKET.md lists every message. docs/refactor/QUIRKS.md lists odd behaviour pinned by tests: flip those tests when you fix one, never delete them; add your changes under a subsection "Fix round 7, <your group>" to keep the merge simple. Update these files when you change what they describe.
- Schema changes: init_db adds columns at startup with add_columns (and creates new tables with create_all); no Alembic. Update backend/tests/test_00_startup.py (both the columns test and the legacy-upgrade test), backend/tests/test_surface.py for new or changed WebSocket messages (its message list must stay in the same order as WS_CASES, with its count), and the openapi snapshot (find tests/data/openapi.json) when an API shape changes.
- Backend tests need PostgreSQL on port 5433 (if it is down, run bash ${PT}/start_all.sh). Use your own throwaway database: psql -h localhost -p 5433 -U postgres -c "create database DBNAME", then in backend/: DATABASE_URL=postgresql://postgres@localhost:5433/DBNAME SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <the test files you touched or that cover your change>. Drop the database after. Do not run the whole suite (other groups share a 4-CPU machine); the organiser runs it after the merge.
- Frontend: node_modules is linked in. Check it builds: cd frontend && npx vite build --outDir /tmp/build_GROUP (never commit build output). No frontend test runner exists.
- Commits: a short title and a body saying what changed and how it was checked. No em dashes anywhere (code comments, docs, UI text, commit messages). Never write any AI model name into a file or commit. End every commit message with exactly these two lines:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WaLz6UBTQ5XaTKSYwqeMKA
- Commit as you go (a worker restart loses uncommitted work). Never push.
- Match the surrounding code: comment density, naming, idiom. Keep each change as small as the problem and the decision need.
- Never pkill -f a pattern (it can kill your own shell); stop processes by PID.`

const SOURCES = `Sources (read-only):
- ${PT}/decisions7.md: the round's scope and binding decisions (read it first). ${PT}/decisions.md (round 6), ${PT}/decisions_fix5.md, ${PT}/decisions_fix4.md and GitHub issue #16 ("behaviour kept on purpose") are earlier binding decisions: never remove or weaken behaviour they ask for.
- ${PT}/triage7.md: an Opus triage of every checklist line against ${BASE}, by line id, with causes (file:line), the smallest fix and the size. It is advice: confirm in the code, and choose better where you find better. The checklist issues themselves (#69, #45, #60 on austincauwels/TTRPG_VTT_CO; ToolSearch "select:mcp__github__issue_read") and the findings they name under /home/user/harness/playtest/results/ have the original steps.`

const BOUNDS = `Three groups work in parallel on separate branches that are merged afterwards by hand: desk (the Lightkeeper's desk and the server: OperationsPanel, TableStrip, SceneManager, the desk headers, InvitePlayer, CorrespondenceStack, GMCharacterSheet, FinalizeRosterSlip, CircleFormationStatus, gm.py, access.py, a circles column), sheet (the player's sheet, Circle page and Notebook: InvestigatorDossier, SheetEditor, CircleView, TactileSidebar, CircleCreationPopup, NotebookView, SketchPad, MarkdownMarks; no server work), dice (dice, log, hub, creator and sign-in: the dice components, gameStore.js, the hub Registry, LastPlayedTome, CharacterCreator, JoinCampaignForm, LoginScreen, googleSignIn, rolls.py). Stay inside your group's lines, and change files another group owns only as far as a line needs, so the merge stays clean. Docs (WEBSOCKET.md, QUIRKS.md, FAQ.md, DESIGN.md) are shared: add, do not rewrite others' text. These are low-severity items: keep each fix small.`

const IMPL = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, what: { type: 'string', description: 'what you changed, files' }, checked: { type: 'string', description: 'how you checked it: tests, build, browser' } }, required: ['item', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, why: { type: 'string' } }, required: ['item', 'why'] } },
    choices: { type: 'array', items: { type: 'string' }, description: 'each product or wording choice you made where the decisions left it open, one line each' },
    protocol: { type: 'array', items: { type: 'string' }, description: 'each new or changed WebSocket message, API route, DB table or column' },
    commits: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string', description: 'which test files you ran and the result' },
  },
  required: ['done', 'skipped', 'choices', 'protocol', 'commits', 'tests'],
}
const REVIEW = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      level: { type: 'string', enum: ['blocking', 'should', 'nit'] },
      where: { type: 'string', description: 'file:line' },
      problem: { type: 'string' },
      fix: { type: 'string' },
    }, required: ['level', 'where', 'problem', 'fix'] } },
    items_ok: { type: 'array', items: { type: 'string' } },
    items_incomplete: { type: 'array', items: { type: 'string' }, description: 'items not fixed or only partly, with why' },
    summary: { type: 'string' },
  },
  required: ['issues', 'items_ok', 'items_incomplete', 'summary'],
}

const modelOf = (g) => (g.model === 'opus' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })
const reviewModelOf = (g) => modelOf({ model: g.reviewModel || 'opus' })

const env = (g, port) => `Your workspace: the git worktree /home/user/wt/${g.name}, on branch fix7-${g.name} (it starts at ${BASE}, main today). Work only there; never touch /home/user/TTRPG_VTT_CO, /home/user/harness or another group's worktree.
Browser check setup, ports yours alone: backend on ${port}: cd /home/user/wt/${g.name}/backend && psql -h localhost -p 5433 -U postgres -c "create database fix_${g.name}_${port}" ; DATABASE_URL=postgresql://postgres@localhost:5433/fix_${g.name}_${port} SECRET_KEY=<64 hex> CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/fix_api_${port}.log 2>&1 &  Then a build (cd frontend && npx vite build --outDir /tmp/build_${g.name}_${port}) and nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir /tmp/build_${g.name}_${port} > /tmp/fix_preview_${port}.log 2>&1 &  (the config exists and is git-excluded; it proxies /api, /campaign and /ws to ${port}). Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds earlier verifiers' scripts (v84NN_lib.js and v84NN_setup.js are the useful ones): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL (circles.is_finalized, campaigns.roster_finalized), and open seats by seeding the store's candela-vtt-storage in an init script. Copy what you need into /tmp/${g.name}_${port}/ and change the site port, API port, database name and output folder. Use X-Forwarded-For with a fresh address per request to avoid the sign-up limit. To test a restart, stop the backend by PID and start it again on the same port and database. A stall can be made with page.routeWebSocket. Look at every screenshot you take. Stop your servers by PID when done and drop your databases.`

const itemsText = (g) => g.items.map((it, i) => `${i + 1}. ${it}`).join('\n')

const implement = (g) => agent(`${RELAY}

You are fixing low-severity UX checklist lines on Candela VTT. Your group: "${g.name}". Items:
${itemsText(g)}

${SOURCES}

${BOUNDS}

${RULES}

${env(g, g.port)}

How to work: for each item read decisions.md and the triage, then the code; reproduce the problem on your branch (with a failing backend test for server behaviour, or in Chromium where it is visual or client-side); build what the decision says, with a backend test for every server change and docs updated where they describe the behaviour. Where the decisions leave a choice open, take the least surprising option that fits DESIGN.md and FAQ.md, and list it under choices. If a line proves already fixed, say why under skipped. If it is bigger than expected, still build it, in clean steps, committing as you go. Then run the relevant backend tests, build the frontend, and for every change to what a screen shows or how a desk behaves, check it in Chromium at phone (390x844), tablet (820x1180) and laptop (1366x768) sizes on both desks where it applies (a past build passed while a screen crashed on an undeclared prop). Commit on fix7-${g.name}. Return what you did.`, { label: `implement:${g.name}`, phase: 'Implement', schema: IMPL, ...modelOf(g) })

const review = (g, impl) => agent(`${RELAY}

You are reviewing a fix branch for Candela VTT before it goes into a pull request. Group "${g.name}", branch fix7-${g.name} in the worktree /home/user/wt/${g.name}; the change is git -C /home/user/wt/${g.name} diff ${BASE}..fix7-${g.name}. Do not edit, commit or push anything.
Items it was meant to fix:
${itemsText(g)}
The implementer's report: ${JSON.stringify(impl)}

${SOURCES}

${BOUNDS}

${RULES}

Review hard, as the last line before real players. Check each change against decisions.md first: it must build what was decided, in full, and must not remove or weaken anything decided now or earlier. Then: does each change work on every path (both desks, reload, reconnect, a server restart, a second tab, a phone)? Races and double presses, data loss, rules (FAQ.md, RULES_CHECK.md), WebSocket messages documented in WEBSOCKET.md and covered in test_surface.py, schema changes in test_00_startup.py, pinned tests flipped rather than deleted, DESIGN.md wording and 44px touch targets, no em dashes, nothing broken nearby (read the callers of what changed). Confirm every item the implementer claims exists in the diff. Run the group's backend tests yourself and build the frontend. Where a change alters a screen or desk behaviour, check it in Chromium yourself.
${env(g, g.port + 10)}
Return each issue with a level: blocking (wrong, broken, unsafe, or against a decision; must be fixed before merge), should (a real gap a reviewer would ask for), nit (optional).`, { label: `review:${g.name}`, phase: 'Review', schema: REVIEW, ...reviewModelOf(g) })

const repair = (g, impl, rev) => agent(`${RELAY}

You are finishing a fix branch for Candela VTT after review. Group "${g.name}", branch fix7-${g.name} in /home/user/wt/${g.name}. Items:
${itemsText(g)}
What the implementer did: ${JSON.stringify(impl)}
The review: ${JSON.stringify(rev)}

Fix every blocking and should issue and every item the reviewer found incomplete, unless you can show the reviewer is wrong or the change would go against decisions.md (then say why under skipped). Apply nits only where plainly right and cheap. Then run the relevant backend tests, build the frontend, re-check changed screens in Chromium, and commit on fix7-${g.name}.

${SOURCES}

${BOUNDS}

${RULES}

${env(g, g.port + 20)}`, { label: `repair:${g.name}`, phase: 'Repair', schema: IMPL, ...modelOf(g) })

const results = await pipeline(GROUPS,
  (g) => implement(g).then((impl) => ({ g, impl })),
  ({ g, impl }) => review(g, impl).then((rev) => ({ g, impl, rev })),
  ({ g, impl, rev }) => {
    const needs = !rev || (rev.issues || []).some((x) => x.level !== 'nit') || (rev.items_incomplete || []).length
    if (!needs) return { group: g.name, impl, rev, repair: null }
    return repair(g, impl, rev).then((rep) => ({ group: g.name, impl, rev, repair: rep }))
  })
for (const r of results.filter(Boolean)) log(`${r.group}: ${r.impl ? r.impl.done.length : 0} done, ${r.impl ? r.impl.skipped.length : 0} skipped; review ${r.rev ? r.rev.issues.filter((x) => x.level === 'blocking').length : '?'} blocking; repair ${r.repair ? 'ran' : 'not needed'}`)
return results
