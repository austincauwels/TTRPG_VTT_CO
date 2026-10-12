export const meta = {
  name: 'fix4-final-check',
  description: 'Final Opus review of the merged fix round, Opus browser checks replaying each item against 2d86b77, then one repair',
  phases: [
    { title: 'Check', detail: 'one final reviewer and three browser checkers, read-only' },
    { title: 'Repair', detail: 'one Opus agent fixes what the checks found, on the session branch' },
  ],
}
const PT = '/home/user/pt4'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const BASE = `Candela VTT (React + FastAPI, a web app for the tabletop RPG Candela Obscura). The fix round for the third playtest is merged on branch claude/fervent-wozniak-rlk7su in /home/user/TTRPG_VTT_CO (HEAD), on top of 2d86b77 (the build the playtest tested, live today). Change under test: git -C /home/user/TTRPG_VTT_CO diff 2d86b77..HEAD. The full backend suite passes on HEAD (1936 passed). Robert's binding product decisions: ${PT}/decisions.md (read it first; never ask for one to be removed or weakened). Item sources: ${PT}/run3/report.md (each item: what happens, steps, device size, why, fix), ${PT}/run3/verify_result.json (verdicts[] by key: evidence, root cause, fix), ${PT}/run3/triage_result.json, screenshots in ${PT}/run3/shots/. The per-group implementer and reviewer results: ${PT}/fix_groups_result.json. Rules: DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand only), FAQ.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. No em dashes anywhere. Do not edit, commit or push anything in this stage. Never pkill -f a pattern; stop processes by PID. If PostgreSQL (port 5433) is down run bash ${PT}/start_all.sh.`

const ITEMS = `Items in the round: #49 release a member / leave a campaign (decision 1); #50 Train die kept until used and spend wording (decision 2); #51 drive maximum 0; #55 Well-Read refund log when capped; #60 spend 'Press again' stays armed (decision 3); #58 report text line (decision 4); missing-report warning at Add Illumination and End Assignment (decision 5); #59 ally offer logged and lapse logged (decision 6); #60 key info slip covers the keys; #52 sketch Text tool; #53 notebook Contents; #54 Lightkeeper's login name hidden from players; #56 Lightkeeper sees relationships after the seal; #57 session-ended notice on a refused session; #60 first-person join notice.`

const FINDINGS = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      level: { type: 'string', enum: ['blocking', 'should', 'nit'] },
      item: { type: 'string' },
      where: { type: 'string', description: 'file:line or screen' },
      problem: { type: 'string' },
      fix: { type: 'string' },
    }, required: ['level', 'item', 'where', 'problem', 'fix'] } },
    items: { type: 'array', items: { type: 'object', properties: {
      item: { type: 'string' },
      control: { type: 'string', description: 'what the 2d86b77 control showed (browser checks), or n/a' },
      fixed: { type: 'string', description: 'what HEAD showed, or for the review whether the claim exists in code' },
      verdict: { type: 'string', enum: ['fixed', 'partly', 'not fixed', 'not checked'] },
      shots: { type: 'array', items: { type: 'string' } },
    }, required: ['item', 'control', 'fixed', 'verdict'] } },
    summary: { type: 'string' },
  },
  required: ['issues', 'items', 'summary'],
}

const browser = (name, items, fp, cp) => agent(`${RELAY}

${BASE}

You are an Opus browser checker. Replay the ORIGINAL steps of each item below in Chromium, at the original device size from the report, first against the unfixed control (2d86b77) to see the problem, then against HEAD to see it fixed. Also try the obvious neighbouring paths (reload, the other desk, a phone size) and look for anything the fix broke. Items:
${items}

Servers (ports yours alone):
- HEAD: backend from /home/user/TTRPG_VTT_CO/backend on ${fp}: psql -h localhost -p 5433 -U postgres -c "create database bc_${name}_head"; cd /home/user/TTRPG_VTT_CO/backend && DATABASE_URL=postgresql://postgres@localhost:5433/bc_${name}_head SECRET_KEY=<64 hex> CORS_ORIGINS=http://127.0.0.1:${fp - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${fp} > /tmp/bc_${fp}.log 2>&1 & ; site: cd /home/user/TTRPG_VTT_CO/frontend && nohup npx vite preview --config .vite.preview.${fp}.config.mjs --host 127.0.0.1 --port ${fp - 4000} --strictPort --outDir /tmp/build_main4 > /tmp/bcp_${fp}.log 2>&1 &   (/tmp/build_main4 is a build of HEAD.)
- Control: the same from /home/user/wt/control (a detached worktree at 2d86b77) on ${cp}, database bc_${name}_ctl, site port ${cp - 4000}, config .vite.preview.${cp}.config.mjs in /home/user/wt/control/frontend, --outDir /tmp/build_control.
Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds the playtest verifiers' scripts for these items (v84NN_lib.js, v84NN_setup.js, per-item scripts): copy them into /tmp/bc_${name}/ and change ports, database and output folder (save screenshots under /tmp/bc_${name}/shots). They build a table over the API, seal it in SQL, and open seats by seeding the store's candela-vtt-storage. Use X-Forwarded-For with a fresh address per request. Look at every screenshot. Stop your servers by PID and drop your databases at the end.
Report per item: what the control showed, what HEAD showed, a verdict, screenshot paths. Report each problem found on HEAD as an issue: blocking (item not fixed, broken, against a decision, a crash), should (a real gap), nit.`, { label: `browser:${name}`, phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

const review = () => agent(`${RELAY}

${BASE}

You are the final Opus reviewer before the pull request. ${ITEMS}
Review the whole merged diff as the last line before real players. In particular:
- Each decision in decisions.md is built in full, and nothing Robert asked for (this round or earlier, see decisions.md) was removed.
- Seams between the five groups, which were built separately and merged: the release route (#49) against the report line (#58), the missing-report warning (decision 5), the Train change (#50: release_from_campaign now drops Train dice on release and retire; end_assignment_for keeps them), the spend count, the offers held in memory (#59) when a member is released mid-offer, the author name change (#54) for a released member, the Lightkeeper relationships view (#56) after a release.
- Races and double presses, data loss, the WebSocket protocol (every new or changed message in WEBSOCKET.md and test_surface.py), schema and openapi pins, QUIRKS.md tests flipped not deleted, docs (FAQ.md, DESIGN.md) consistent with each other and the code, no em dashes in added lines, no AI model names in files.
- Every item the group reports claim (${PT}/fix_groups_result.json) exists in the merged code.
Run targeted backend tests if useful (own throwaway database, drop it after), not the full suite. Report per item whether the code does what is claimed, and every issue with a level.`, { label: 'final-review', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

const checks = await parallel([
  () => review(),
  () => browser('roster_circle', '#49 (Lightkeeper releases a ghost member after the seal from the sheet; a player leaves from the desk and from the hub; counts, resources, log lines, every desk live; v8401_ghost.js), #50 (Train die bought mid-assignment survives End Assignment, wording agrees; v8404_train.js), #51 (Nerve 0 Professor/Occultist; v8402_drive.js), #55 (Well-Read refund at a full drive; v8402_wr.js), #60 spend Press again (stays armed past 4 seconds, disarms on a press elsewhere, double-click guard still works).', 8011, 8012),
  () => browser('reports', '#58 (optional report line, about 280 chars, amend changes it, Lightkeeper reads it on the report card), decision 5 missing-report warning (Add Illumination and End Assignment confirm names who has not filed, non-blocking; v8401_reports.js), #59 (Behind Me offer logged to the Lightkeeper and the ally, lapse logged after 2 minutes; you may shorten the wait only by reading the code path, but try one real lapse if feasible), #60 key info slip no longer covers the keys (v8404_keys.js).', 8021, 8022),
  () => browser('notebook_session', '#52 sketch Text tool (v8403_sketch*.js), #53 notebook Contents brings the entry into view, on desktop and phone (v8403_nb.js), #54 players never see the Lightkeeper login name (notebook entries, author filter, sketch log line, payloads; v8403_players.js), #56 the Lightkeeper sees relationships after the seal (v8404_rel.js), #57 refused session shows a notice on sign-in (v8405_logout.js), #60 first-person join notice (v8405_join.js).', 8031, 8032),
])
const ok = checks.filter(Boolean)
const all = ok.flatMap((c) => c.issues || [])
const needs = all.filter((x) => x.level !== 'nit').length || ok.some((c) => (c.items || []).some((i) => i.verdict === 'not fixed' || i.verdict === 'partly'))
log(`checks: ${ok.length}/4 returned; ${all.filter((x) => x.level === 'blocking').length} blocking, ${all.filter((x) => x.level === 'should').length} should, ${all.filter((x) => x.level === 'nit').length} nit`)
if (!needs) return { checks, repair: null }

const repair = await agent(`${RELAY}

${BASE.replace('Do not edit, commit or push anything in this stage.', '')}

You are the repair agent. Work in /home/user/TTRPG_VTT_CO on branch claude/fervent-wozniak-rlk7su. Do not push. The final checks found these (a final review and three browser checks): ${JSON.stringify(checks)}

Fix every blocking and should issue and every item marked not fixed or partly, unless you can show the finding is wrong or the fix would go against decisions.md (then say why under skipped). Apply nits only where plainly right and cheap. Keep each fix minimal. A backend test for every server change; docs updated where they describe the behaviour; flip QUIRKS tests, never delete them. Then run the backend tests that cover your changes (own throwaway database: DATABASE_URL=postgresql://postgres@localhost:5433/<db> SECRET_KEY=<64 hex> CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files> in backend/; drop it after), rebuild the frontend to /tmp/build_main4 (cd frontend && npx vite build --outDir /tmp/build_main4), and re-check each changed screen in Chromium by replaying the finding's steps (servers as the browser checkers did: backend on 8041, site 4041 with frontend/.vite.preview.8041.config.mjs). Commit as you go: a short title, a body with what changed and how it was checked, no em dashes, no AI model names, ending with exactly:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0111CtHbxPzvhZV8obkhBcp5`, { label: 'repair', phase: 'Repair', model: 'opus', effort: 'high', schema: {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, what: { type: 'string' }, checked: { type: 'string' } }, required: ['issue', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } },
    commits: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
  },
  required: ['fixed', 'skipped', 'commits', 'tests'],
} })
return { checks, repair }
