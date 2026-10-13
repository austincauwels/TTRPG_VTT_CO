export const meta = {
  name: 'fix7-final-check',
  description: 'Fix round 7: a final Opus review and three Sonnet browser checks against e5356d4, then one repair',
  phases: [
    { title: 'Check', detail: 'one final reviewer and three browser checkers, read-only' },
    { title: 'Repair', detail: 'one Opus agent fixes what the checks found, on the session branch' },
  ],
}
const PT = '/home/user/pt6'
const BR = 'claude/loving-fermi-2giawj'
const BASEC = 'e5356d4'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const TRAILER = `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WaLz6UBTQ5XaTKSYwqeMKA`
const BASE = `Candela VTT (React + FastAPI, a web app for the tabletop RPG Candela Obscura). Fix round 7 (the low UX checklist lines of issues #69, #45 and #60's UX section, by line id 69.1-69.8, 45.1-45.20, 60.4-60.25) is merged on branch ${BR} in /home/user/TTRPG_VTT_CO (HEAD), on top of ${BASEC} (main today, fix round 6). Change under test: git -C /home/user/TTRPG_VTT_CO diff ${BASEC}..HEAD. The full backend suite passed after the merge (2013 passed, 1 skipped). Binding decisions: ${PT}/decisions7.md (read it first); earlier binding decisions: ${PT}/decisions.md (round 6), ${PT}/decisions_fix5.md, ${PT}/decisions_fix4.md and GitHub issue #16. Never ask for a decision to be removed or weakened. Triage by line id: ${PT}/triage7.md. The per-group implementer, reviewer and repair results: ${PT}/fix7_groups_result.json (their 'choices' list the open calls; 'skipped' what each left, including states they did not drive in a browser). The groups (desk, sheet, dice) were built separately and merged by hand; conflicts were only in docs/refactor/QUIRKS.md and WEBSOCKET.md (the gm_end_assignment row). Rules: DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand only, confirms one short sentence with a one-verb button), FAQ.md, docs/refactor/RULES_CHECK.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. No em dashes anywhere. Never pkill -f a pattern; stop processes by PID. If PostgreSQL (port 5433) is down run bash ${PT}/start_all.sh. Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds earlier verifiers' helper scripts (v84NN_lib.js, v84NN_setup.js): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL, and open seats by seeding the store's candela-vtt-storage in an init script; copy and adapt ports, database and output folder. Use X-Forwarded-For with a fresh address per request. Seed states with SQL or the API where the UI path is long (a posted sketch, closed reports, a scar, relationships, a Resource Management circle near a milestone).`

const servers = (name, port, dir, build) => `backend from ${dir}/backend on ${port}: psql -h localhost -p 5433 -U postgres -c "create database bc_${name}_${port}"; cd ${dir}/backend && DATABASE_URL=postgresql://postgres@localhost:5433/bc_${name}_${port} SECRET_KEY=<64 hex> CORS_ORIGINS=http://127.0.0.1:${port - 4000} nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port ${port} > /tmp/bc_${port}.log 2>&1 & ; site: cd ${dir}/frontend && nohup npx vite preview --config .vite.preview.${port}.config.mjs --host 127.0.0.1 --port ${port - 4000} --strictPort --outDir ${build} > /tmp/bcp_${port}.log 2>&1 &`

const IMPL = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, what: { type: 'string' }, checked: { type: 'string' } }, required: ['issue', 'what', 'checked'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } },
    commits: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
  },
  required: ['fixed', 'skipped', 'commits', 'tests'],
}
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
      control: { type: 'string', description: 'what the control showed (browser checks), or n/a' },
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
Do not edit, commit or push anything in this stage.

You are a browser checker. For each item below, replay the issue's original steps (read it on GitHub via ToolSearch "select:mcp__github__issue_read" if you need them): first see the problem on the unfixed control (${BASEC}), then see it fixed on HEAD, at phone (390x844), tablet (820x1180) and laptop (1366x768) sizes and on both desks where it applies. Also try the obvious neighbouring paths (reload, the other desk, a second tab, a server restart where the item is about restarts) and look for anything the change broke. Items:
${items}

Servers (ports yours alone):
- HEAD: ${servers(name + '_head', fp, '/home/user/TTRPG_VTT_CO', '/tmp/build_main7')}   (/tmp/build_main7 is a build of HEAD; do not rebuild it.)
- Control: ${servers(name + '_ctl', cp, '/home/user/wt/control', '/tmp/build_control7')}   (/home/user/wt/control is a detached worktree at ${BASEC}.)
Save screenshots under /tmp/bc7_${name}/shots and look at every one. Stop your servers by PID and drop your databases at the end.
Report per item: what the control showed, what HEAD showed, a verdict, screenshot paths. Report each problem found on HEAD as an issue: blocking (item not fixed, broken, against a decision, a crash), should (a real gap), nit.`, { label: `browser:${name}`, phase: 'Check', schema: FINDINGS, model: 'sonnet', effort: 'medium' })

const review = () => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are the final Opus reviewer before the pull request. Review the whole merged diff as the last line before real players. In particular:
- Each line is fixed as decisions7.md and the triage describe, and nothing decided this round or earlier was removed or weakened (round 6's decisions too: the Illumination ring, held marks, the roll replay).
- Server changes: circles.milestones_earned and the earn-back count (69.3) on new and legacy circles and across the advance; the insignia refused before the seal (69.7); the whole-word clip (45.2); one Illumination line per addition (45.3, 45.13); End Assignment clearing the timer (60.13) and dropping shown rolls (60.7) against round 6's replay on connect; roll.abilities in roll_result (45.10); docs and tests (test_00_startup, test_surface, WEBSOCKET.md, QUIRKS.md).
- Seams between groups: the dice group's gameStore.js against the sheet group's spent cue and refused ability question (69.2, 60.11); the desk group's sticky stamps and header against the sheet group's skip link (60.16).
- Choices Robert may not expect (fix7_groups_result.json 'choices'): say whether each fits decisions7.md.
- 44px touch targets, help on demand, short confirms, no em dashes in added lines, no AI model names in files.
Run targeted backend tests if useful (own throwaway database, drop it after), not the full suite. Report per item whether the code does what is claimed, and every issue with a level.`, { label: 'final-review', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

phase('Check')
const checks = await parallel([
  () => review(),
  () => browser('desk', 'Lightkeeper desk lines from triage7.md: 69.3 (Resource Management earn-back counted once when the track goes -1 then +1 across a milestone), 69.4 (Finalize confirm one sentence), 69.7 (no insignia change before the seal), 69.8b (desk header title clear of Back to chapter hub at 1024 to 1279 wide), 45.1 (tension and timer controls while a sheet, Circle or Notebook is open), 45.2 (long dispatch location cut on a space), 45.3 and 45.13 (one Illumination line per addition; the milestone named only with Resource Management), 45.4 (Dispatch and End Assignment stamps in view at 1440x900 and 1366x768), 45.5 (End Assignment stamp does not move when armed), 45.6 (empty requests point to the campaign code; Invite player wording), 45.7 (a withdrawn request leaves a note, the open sheet read-only), 60.6 (drives carry over line; Reset has an i), 60.13 (End Assignment clears and hides the timer), 60.19 (every waiting name has its count).', 8011, 8012),
  () => browser('sheet', 'Player sheet, Circle and Notebook lines from triage7.md: 69.1 (Edit sheet keeps the draft on a refused save; gear writes a diff), 69.2 (a refused ability use keeps the typed question), 69.5 (Lightkeeper trauma Edit subline behind an i), 69.6 (Circle Resources paragraph behind an i), 69.8a (role ability card heading after a role change), 45.11 (Why empty slip not cut off; Change Gear not clipped on a tablet), 45.12 (own You card shows Incapacitated and scars), 45.14 (closing reports with a kept amendment shows the sent report), 45.15 (scroll to the new scar on the player sheet), 60.10 (posted sketch labels readable; Keep drawing not cut off), 60.11 (a spent drive point is said after the roll), 60.16 (skip link to Actions; disabled stepper not focusable), 60.17 (proposed relationship marked proposed), 60.18 (Chapter House shows Saved and that it is shared), 60.21 (Preview toggles to Edit), 60.22 (fourth gear item tap shows the limit by the finger on a phone).', 8021, 8022),
  () => browser('dice', 'Dice, log, hub, creator and sign-in lines from triage7.md: 45.8 (Burn and reroll reachable by keyboard in a few Tabs; focus kept when the next roll closes it), 45.9 (the reroll slip does not cover Burn and reroll at 1366x768), 45.10 (Open Book and Interrogation named on the slip and log after the roll), 45.17 (Check again 44px on a phone), 45.18 (locked Last Played tome explains itself on tap and focus), 45.19 (creator path arrows and counter clear of the sticky footer at 360x705, 375x667, 390x667), 45.20 (Handwriting help says the word once; slip inside the dialog on a phone), 60.4 (a lasting cue on the hub after approval), 60.5 (keep-a-die choice steady and announced once), 60.7 (tray cleared after End Assignment), 60.8 (no waiting badge for an optional burn), 60.9 (private notes marked for sender and receiver), 60.12 (Learn from My Mistakes not offered when drives are full), 60.14 (recipient list on an upright tablet stays on screen), 60.15 (Handwriting list inside the Join dialog on a tablet), 60.23 (creator summary shows drive sources), 60.24 (sign-in buttons above the fold at 1366x768), 60.25 (Google frame named; sign-up says Sign up with Google).', 8031, 8032),
])
const ok = checks.filter(Boolean)
const all = ok.flatMap((c) => c.issues || [])
const needs = all.filter((x) => x.level !== 'nit').length || ok.some((c) => (c.items || []).some((i) => i.verdict === 'not fixed' || i.verdict === 'partly'))
log(`checks: ${ok.length}/4 returned; ${all.filter((x) => x.level === 'blocking').length} blocking, ${all.filter((x) => x.level === 'should').length} should, ${all.filter((x) => x.level === 'nit').length} nit`)
if (!needs) return { checks, repair: null }

const repair = await agent(`${RELAY}

${BASE}

You are the repair agent. Work in /home/user/TTRPG_VTT_CO on branch ${BR}. Do not push. The final checks found these (a final review and three browser checks): ${JSON.stringify(checks)}

Fix every blocking and should issue and every item marked not fixed or partly, unless you can show the finding is wrong or the fix would go against decisions.md (then say why under skipped). Where a finding questions a choice Robert might not expect, but the choice fits decisions.md, leave it and say so under skipped so the organiser can ask him. Apply nits only where plainly right and cheap. Keep each fix minimal. A backend test for every server change; docs updated where they describe the behaviour; flip QUIRKS tests, never delete them. Then run the backend tests that cover your changes (own throwaway database: DATABASE_URL=postgresql://postgres@localhost:5433/<db> SECRET_KEY=<64 hex> CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files> in backend/; drop it after), rebuild the frontend (cd frontend && npx vite build --outDir /tmp/build_main7), and re-check each changed screen in Chromium by replaying the finding's steps (servers: ${servers('repair', 8041, '/home/user/TTRPG_VTT_CO', '/tmp/build_main7')}). Commit as you go: a short title, a body with what changed and how it was checked, no em dashes, no AI model names, ending with exactly:
${TRAILER}`, { label: 'repair', phase: 'Repair', model: 'opus', effort: 'high', schema: IMPL })
return { checks, repair }
