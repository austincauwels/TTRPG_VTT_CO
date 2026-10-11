export const meta = {
  name: 'playtest2-fix-groups',
  description: 'Fix the second playtest\'s confirmed high and medium problems in groups: implement, review, repair, each group in its own worktree',
  phases: [
    { title: 'Implement', detail: 'one implementer per group, on its own branch and worktree' },
    { title: 'Review', detail: 'one Opus reviewer per group, read-only' },
    { title: 'Repair', detail: 'the group\'s implementer model applies the review' },
  ],
}

const PT = '/home/user/pt2'
const GROUPS = args.groups   // [{ name, model, items, port }]

const RULES = `Repository rules (Candela VTT, a React + FastAPI web app for the tabletop RPG Candela Obscura):
- DESIGN.md holds the look and wording rules ("Lightkeeper", never "GM", on screen; 44px touch targets; no permanent help text under items, help on demand behind an "i", hover or focus is fine). FAQ.md holds the rules as implemented. docs/refactor/WEBSOCKET.md lists every message. docs/refactor/QUIRKS.md lists known odd behaviour pinned by tests: flip those tests when you fix one, never delete them. Update these files when you change what they describe.
- Schema changes: init_db adds columns at startup with add_columns; there is no Alembic. Update the pinned tests in backend/tests/test_00_startup.py, and backend/tests/test_surface.py for new WebSocket messages.
- Backend tests need PostgreSQL (running on port 5433). Use your own throwaway database: psql -h localhost -p 5433 -U postgres -c "create database DBNAME", then in backend/: DATABASE_URL=postgresql://postgres@localhost:5433/DBNAME SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <the test files you touched or that cover your change>. Drop the database after. Do not run the whole suite (about 6 minutes, and other groups share the machine); the organiser runs it after the merge. If PostgreSQL is down, run bash ${PT}/start_all.sh once.
- Frontend: node_modules is linked in. Check it builds: cd frontend && npx vite build --outDir /tmp/build_GROUP (never commit build output). There is no frontend test runner.
- Commits: a short title and a body saying what changed and how it was checked, no em dashes anywhere (code comments, docs, UI text and commit messages), never write any AI model name. End every commit message with these two lines exactly:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NVyHd7WyWQwbWErvoui4Fc
- Match the surrounding code: its comment density, naming and idiom. Keep each fix as small as the problem needs.`

const SOURCES = `Where each item is described (all read-only):
- ${PT}/triage_result.json: the clusters (a.clusters and b.clusters, by key): summary, steps, expected, actual, shots, first_report, notes.
- ${PT}/verify_heavy_result.json and ${PT}/verify_light_result.json: per key, the verifier's evidence, root_cause (file:line in the tested build, which is your branch's starting point) and proposed fix, and for some a 'refute' second opinion. Prefer the refuter's fix when it disagrees.
- ${PT}/regress_result.json: the regression agents' evidence for items that continue a first-playtest item (first_report key); ${PT}/findings.jsonl for the member findings (by F-id).
- The first playtest's report (for the original intent of a first_report item): /home/user/harness/playtest/results/2026-10-08/report.json.
- Screenshots: paths in those files are relative to ${PT}.`

const IMPL = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, what: { type: 'string', description: 'what you changed, files' }, checked: { type: 'string', description: 'how you checked it: tests, build, browser' } }, required: ['item', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, why: { type: 'string' } }, required: ['item', 'why'] } },
    choices: { type: 'array', items: { type: 'string' }, description: 'every product or wording choice you made where the sources left it open, one line each' },
    commits: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string', description: 'which test files you ran and the result' },
  },
  required: ['done', 'skipped', 'choices', 'commits', 'tests'],
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
    items_ok: { type: 'array', items: { type: 'string' }, description: 'items whose fix you judge complete and correct' },
    items_incomplete: { type: 'array', items: { type: 'string' }, description: 'items not fixed or only partly, with why' },
    summary: { type: 'string' },
  },
  required: ['issues', 'items_ok', 'items_incomplete', 'summary'],
}

const env = (g, port) => `Your workspace: the git worktree /home/user/wt/${g.name}, on branch fix2-${g.name} (it starts at commit 63d80f4, the build the playtest tested). Work only there; never touch /home/user/TTRPG_VTT_CO, /home/user/sut or another group's worktree, and never push.
For a browser check: backend on ${port} (cd /home/user/wt/${g.name}/backend && DATABASE_URL=postgresql://postgres@localhost:5433/fix_${g.name}_${port} SECRET_KEY=<hex> CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/fix_api_${port}.log 2>&1 &), a fresh build (npx vite build --outDir /tmp/build_${g.name}), then cd frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir /tmp/build_${g.name} > /tmp/fix_preview_${port}.log 2>&1 & (the config exists and is git-excluded). Playwright: require('${PT}/node_modules/playwright'), Chromium /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/checks/ (setup.js, lib.js) and ${PT}/verify/*.js have scripts that build a table over the API and open seats with a seeded store; copy and change ports and database. Look at every screenshot you take. Stop your servers by PID when done (never pkill) and drop your databases.`

const implement = (g) => agent(`You are fixing problems found by Candela VTT's second AI playtest. Your group: "${g.name}". Fix these items:
${g.items.map((it, i) => `${i + 1}. ${it}`).join('\n')}

${SOURCES}

${RULES}

${env(g, g.port)}

How to work: for each item read its cluster, the verifier's root cause and fix, and the code; confirm the cause in your branch; make the smallest correct fix, with a backend test for every server change and docs updated where they describe the behaviour. Where the sources leave a product or wording choice open, take the least surprising default that fits DESIGN.md and FAQ.md, and list it under choices. If an item turns out to be wrong, already fixed or far bigger than its description, skip it and say why. After your changes, run the relevant backend tests, build the frontend, and, if you changed what a screen shows, open that screen once in Chromium at the device size the item was seen on, to be sure it renders and works (the last phase's build passed while a screen crashed on an undeclared prop). Commit on fix2-${g.name} in one or a few commits. Return what you did.`, { label: `implement:${g.name}`, phase: 'Implement', schema: IMPL, ...(g.model === 'opus' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' }) })

const review = (g, impl) => agent(`You are reviewing a fix branch for Candela VTT before it goes into a pull request. Group "${g.name}", branch fix2-${g.name} in the worktree /home/user/wt/${g.name}; the change is git -C /home/user/wt/${g.name} diff 63d80f4..fix2-${g.name}. Do not edit, commit or push anything.
The items it was meant to fix:
${g.items.map((it, i) => `${i + 1}. ${it}`).join('\n')}
The implementer's report: ${JSON.stringify(impl)}

${SOURCES}

${RULES}

Review hard, as the last line before real players: does each change fix the item's root cause, on every path (both desks, reload, reconnect, a second tab, a phone)? Races and double presses, data loss, rules (FAQ.md and the Candela Obscura rulebook as FAQ.md cites it), WebSocket messages documented and tested, pinned tests flipped rather than deleted, DESIGN.md wording and 44px touch targets, no em dashes, nothing broken nearby (read the callers of what changed). Run the group's backend tests yourself, and build the frontend. Where a change alters what a screen shows, check that screen in Chromium yourself.
${env(g, g.port + 10)}
Return each issue with a level: blocking (wrong, broken or unsafe; must be fixed before merge), should (a real gap a reviewer would ask for), nit (optional).`, { label: `review:${g.name}`, phase: 'Review', schema: REVIEW, model: 'opus', effort: 'high' })

const repair = (g, impl, rev) => agent(`You are finishing a fix branch for Candela VTT after review. Group "${g.name}", branch fix2-${g.name} in /home/user/wt/${g.name}. The items:
${g.items.map((it, i) => `${i + 1}. ${it}`).join('\n')}
What the implementer did: ${JSON.stringify(impl)}
The review: ${JSON.stringify(rev)}

Fix every blocking and should issue, and every item the reviewer found incomplete, unless you can show the reviewer is wrong (then say why under skipped). Apply nits only where they are plainly right and cheap. Then run the relevant backend tests and build the frontend again, re-check changed screens in Chromium, and commit on fix2-${g.name}.

${SOURCES}

${RULES}

${env(g, g.port + 20)}`, { label: `repair:${g.name}`, phase: 'Repair', schema: IMPL, ...(g.model === 'opus' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' }) })

const results = await pipeline(GROUPS,
  (g) => implement(g).then((impl) => ({ g, impl })),
  ({ g, impl }) => review(g, impl).then((rev) => ({ g, impl, rev })),
  ({ g, impl, rev }) => {
    const needs = rev && ((rev.issues || []).some((x) => x.level !== 'nit') || (rev.items_incomplete || []).length)
    if (!needs) return { group: g.name, impl, rev, repair: null }
    return repair(g, impl, rev).then((rep) => ({ group: g.name, impl, rev, repair: rep }))
  })
for (const r of results.filter(Boolean)) log(`${r.group}: ${r.impl ? r.impl.done.length : 0} done, ${r.impl ? r.impl.skipped.length : 0} skipped; review ${r.rev ? r.rev.issues.filter((x) => x.level === 'blocking').length : '?'} blocking; repair ${r.repair ? 'ran' : 'not needed'}`)
return results
