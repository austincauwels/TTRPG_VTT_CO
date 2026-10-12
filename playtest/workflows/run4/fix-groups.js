export const meta = {
  name: 'playtest3-fix-groups',
  description: 'Fix the third playtest items in five groups: implement, Opus review, repair, each in its own worktree',
  phases: [
    { title: 'Implement', detail: 'one implementer per group, own branch and worktree' },
    { title: 'Review', detail: 'one Opus reviewer per group, read-only, with decisions.md' },
    { title: 'Repair', detail: 'the group model applies the review' },
  ],
}

const PT = '/home/user/pt4'
const GROUPS = args.groups

const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'

const RULES = `Repository rules (Candela VTT, a React + FastAPI web app for the tabletop RPG Candela Obscura):
- DESIGN.md holds the look and wording rules ("Lightkeeper", never "GM", on screen; 44px touch targets; help on demand behind an "i", hover or focus, never permanent sublines). FAQ.md holds the rules as implemented. docs/refactor/WEBSOCKET.md lists every message. docs/refactor/QUIRKS.md lists odd behaviour pinned by tests: flip those tests when you fix one, never delete them. Update these files when you change what they describe.
- Schema changes: init_db adds columns at startup with add_columns; no Alembic. Update backend/tests/test_00_startup.py, backend/tests/test_surface.py for new WebSocket messages, and backend/tests/data/openapi.json (or tests/data/openapi.json, find it) when an API shape changes.
- Backend tests need PostgreSQL on port 5433 (if it is down, run bash ${PT}/start_all.sh). Use your own throwaway database: psql -h localhost -p 5433 -U postgres -c "create database DBNAME", then in backend/: DATABASE_URL=postgresql://postgres@localhost:5433/DBNAME SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <the test files you touched or that cover your change>. Drop the database after. Do not run the whole suite (about 5 minutes; other groups share the machine); the organiser runs it after the merge.
- Frontend: node_modules is linked in. Check it builds: cd frontend && npx vite build --outDir /tmp/build_GROUP (never commit build output). No frontend test runner exists.
- Commits: a short title and a body saying what changed and how it was checked. No em dashes anywhere (code comments, docs, UI text, commit messages). Never write any AI model name into a file or commit. End every commit message with exactly these two lines:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0111CtHbxPzvhZV8obkhBcp5
- Commit as you go (a worker restart loses uncommitted work). Never push.
- Match the surrounding code: comment density, naming, idiom. Keep each fix as small as the problem and the decision need.
- Never pkill -f a pattern (it can kill your own shell); stop processes by PID.`

const SOURCES = `Where each item is described (all read-only):
- ${PT}/decisions.md: Robert's product decisions for this round. They are binding: build exactly what they say, and never remove behaviour they or earlier decisions ask for.
- ${PT}/run3/report.md: the playtest report (each item: what happens, steps, why, fix, screenshots). ${PT}/run3/verify_result.json: per cluster key (verdicts[].key), the verifier's evidence, root cause (file:line in build 2d86b77, your branch's starting point) and proposed fix. ${PT}/run3/triage_result.json: every cluster by key (summary, steps, expected, actual, findings). ${PT}/run3/findings.jsonl: the raw findings by F-id. Screenshots under ${PT}/run3/shots/.
- The GitHub issue named on each item has the same text (no need to fetch it).`

const IMPL = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, what: { type: 'string', description: 'what you changed, files' }, checked: { type: 'string', description: 'how you checked it: tests, build, browser' } }, required: ['item', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, why: { type: 'string' } }, required: ['item', 'why'] } },
    choices: { type: 'array', items: { type: 'string' }, description: 'each product or wording choice you made where the sources left it open, one line each' },
    protocol: { type: 'array', items: { type: 'string' }, description: 'each new or changed WebSocket message, API route or DB column' },
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

const env = (g, port) => `Your workspace: the git worktree /home/user/wt/${g.name}, on branch fix4-${g.name} (it starts at 2d86b77, the build the playtest tested). Work only there; never touch /home/user/TTRPG_VTT_CO, /home/user/harness or another group's worktree.
Browser check setup, ports yours alone: backend on ${port}: cd /home/user/wt/${g.name}/backend && psql -h localhost -p 5433 -U postgres -c "create database fix_${g.name}_${port}" ; DATABASE_URL=postgresql://postgres@localhost:5433/fix_${g.name}_${port} SECRET_KEY=<64 hex> CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/fix_api_${port}.log 2>&1 &  Then a build (cd frontend && npx vite build --outDir /tmp/build_${g.name}_${port}) and nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir /tmp/build_${g.name}_${port} > /tmp/fix_preview_${port}.log 2>&1 &  (the config exists and is git-excluded; it proxies /api, /campaign and /ws to ${port}). Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds the playtest verifiers' scripts (v84NN_lib.js, v84NN_setup.js and per-item scripts): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL, and open seats by seeding the store's candela-vtt-storage in an init script. Copy the ones for your items into /tmp/${g.name}_${port}/ and change the site port, API port, database name and output folder. Use X-Forwarded-For with a fresh address per request to avoid the sign-up limit. Look at every screenshot you take. Stop your servers by PID when done and drop your databases.`

const itemsText = (g) => g.items.map((it, i) => `${i + 1}. ${it}`).join('\n')

const implement = (g) => agent(`${RELAY}

You are fixing problems found by Candela VTT's third AI playtest. Your group: "${g.name}". Items:
${itemsText(g)}

${SOURCES}

${RULES}

${env(g, g.port)}

How to work: for each item read decisions.md, its report entry, the verifier's root cause and fix, and the code; confirm the cause on your branch; make the smallest correct fix that meets the decision, with a backend test for every server change and docs updated where they describe the behaviour. Where the sources leave a wording choice open, take the least surprising default that fits DESIGN.md and FAQ.md, and list it under choices. If an item proves wrong, already fixed or far bigger than described, skip it and say why. Then run the relevant backend tests, build the frontend, and for every change to what a screen shows, open that screen in Chromium at the device size the item was seen on and replay the item's steps, to be sure it renders and works (a past build passed while a screen crashed on an undeclared prop). Commit on fix4-${g.name}. Return what you did.`, { label: `implement:${g.name}`, phase: 'Implement', schema: IMPL, ...modelOf(g) })

const review = (g, impl) => agent(`${RELAY}

You are reviewing a fix branch for Candela VTT before it goes into a pull request. Group "${g.name}", branch fix4-${g.name} in the worktree /home/user/wt/${g.name}; the change is git -C /home/user/wt/${g.name} diff 2d86b77..fix4-${g.name}. Do not edit, commit or push anything.
Items it was meant to fix:
${itemsText(g)}
The implementer's report: ${JSON.stringify(impl)}

${SOURCES}

${RULES}

Review hard, as the last line before real players. Check each change against decisions.md first: it must build what Robert decided, and must not remove or weaken anything he asked for (a reviewer once had a requested feature deleted; do not repeat that). Then: does each change fix the root cause on every path (both desks, reload, reconnect, a second tab, a phone)? Races and double presses, data loss, rules (FAQ.md), WebSocket messages documented in WEBSOCKET.md and covered in test_surface.py, pinned tests flipped rather than deleted, DESIGN.md wording and 44px touch targets, no em dashes, nothing broken nearby (read the callers of what changed). Confirm every item the implementer claims exists in the diff. Run the group's backend tests yourself and build the frontend. Where a change alters a screen, check that screen in Chromium yourself by replaying the item's steps.
${env(g, g.port + 10)}
Return each issue with a level: blocking (wrong, broken, unsafe, or against a decision; must be fixed before merge), should (a real gap a reviewer would ask for), nit (optional).`, { label: `review:${g.name}`, phase: 'Review', schema: REVIEW, model: 'opus', effort: 'high' })

const repair = (g, impl, rev) => agent(`${RELAY}

You are finishing a fix branch for Candela VTT after review. Group "${g.name}", branch fix4-${g.name} in /home/user/wt/${g.name}. Items:
${itemsText(g)}
What the implementer did: ${JSON.stringify(impl)}
The review: ${JSON.stringify(rev)}

Fix every blocking and should issue and every item the reviewer found incomplete, unless you can show the reviewer is wrong or the change would go against decisions.md (then say why under skipped). Apply nits only where plainly right and cheap. Then run the relevant backend tests, build the frontend, re-check changed screens in Chromium, and commit on fix4-${g.name}.

${SOURCES}

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
