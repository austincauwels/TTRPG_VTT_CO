export const meta = {
  name: 'fix5-final-check',
  description: 'App-wide confirm wording sweep, then a final Opus review and three browser checks against 770a2ed, then one repair',
  phases: [
    { title: 'Sweep', detail: 'one agent applies the confirm wording rule across the app' },
    { title: 'Check', detail: 'one final reviewer and three browser checkers, read-only' },
    { title: 'Repair', detail: 'one Opus agent fixes what the checks found, on the session branch' },
  ],
}
const PT = '/home/user/pt5'
const BR = 'claude/pensive-babbage-eo1v57'
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const TRAILER = `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ETKqHLvkfH9k99JTnJzzKA`
const BASE = `Candela VTT (React + FastAPI, a web app for the tabletop RPG Candela Obscura). Fix round 5 (Robert's hand-filed issues #62 to #66) is merged on branch ${BR} in /home/user/TTRPG_VTT_CO (HEAD), on top of 770a2ed (the build live today). Change under test: git -C /home/user/TTRPG_VTT_CO diff 770a2ed..HEAD. The full backend suite passed after the merge (1982 passed). Robert's binding decisions and his issues verbatim: ${PT}/decisions.md (read it first); earlier binding decisions: ${PT}/decisions_fix4.md and GitHub issue #16. Never ask for a decision to be removed or weakened. The per-group implementer, reviewer and repair results: ${PT}/fix_groups_result.json (their 'choices' list the open calls each group made). Rules: DESIGN.md (Lightkeeper never GM on screen, 44px touch targets, help on demand only), FAQ.md, docs/refactor/RULES_CHECK.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. No em dashes anywhere. Never pkill -f a pattern; stop processes by PID. If PostgreSQL (port 5433) is down run bash ${PT}/start_all.sh. Playwright: require('${PT}/node_modules/playwright'), executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/verify/ holds earlier verifiers' helper scripts (v84NN_lib.js, v84NN_setup.js): they build a table over the API (register, /campaign/create, forge, join, approve), seal it in SQL, and open seats by seeding the store's candela-vtt-storage in an init script; copy and adapt ports, database and output folder. Use X-Forwarded-For with a fresh address per request.`

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
      control: { type: 'string', description: 'what the 770a2ed control showed (browser checks), or n/a' },
      fixed: { type: 'string', description: 'what HEAD showed, or for the review whether the claim exists in code' },
      verdict: { type: 'string', enum: ['fixed', 'partly', 'not fixed', 'not checked'] },
      shots: { type: 'array', items: { type: 'string' } },
    }, required: ['item', 'control', 'fixed', 'verdict'] } },
    summary: { type: 'string' },
  },
  required: ['issues', 'items', 'summary'],
}

phase('Sweep')
const sweep = await agent(`${RELAY}

${BASE}

You are applying Robert's wording rule (decision 4) across the whole app. Work in /home/user/TTRPG_VTT_CO on branch ${BR}. Do not push.
The rule, from issue #66: "Circle Ability removal too wordy: 'Press again to remove every circle ability listed above, including ones gained by advancing. You then choose one again from the list.' Shorten to 'Press again to remove all circle abilities.', and change 'Yes, Clear' to 'Remove'. Use these language rules everywhere else where applicable." So: a confirm is one short sentence saying what will happen; its button is one verb for the action; no "Yes, X" buttons, no restating what is listed above, no explaining the follow-up in the confirm. The same spirit covers permanent sublines (#62): short, or behind the "i" (DESIGN.md's InfoTerm and ConfirmAction's armedInfo prop, added this round).
Find every confirm and armed button in frontend/src (ConfirmAction uses, "Press again", "Yes, ", confirm dialogs, window.confirm) and rewrite those that break the rule. Keep information a player must have before an irreversible act (a death, a release, losing a resource) but say it in a few words, or move it behind the "i". Do not change behaviour, only words, and keep the 'Lightkeeper' wording. Update DESIGN.md with the rule as a short paragraph where it describes confirms, and any doc that quotes a changed string. Backend strings in refusals are out of scope unless a confirm shows them. If a backend test or a QUIRKS test pins a changed string, update it.
Then build (cd frontend && npx vite build --outDir /tmp/build_main5; other agents will use this build of HEAD, so it must be your final state), and check a few changed confirms in Chromium (servers: ${servers('sweep', 8051, '/home/user/TTRPG_VTT_CO', '/tmp/build_main5')}). Commit as you go: a short title, a body listing old and new strings and how it was checked, no em dashes, no AI model names, ending with exactly:
${TRAILER}
Return what you changed under fixed (issue = the file and old string), and anything you left under skipped with why.`, { label: 'sweep', phase: 'Sweep', schema: IMPL, model: 'opus', effort: 'high' })
log(`sweep: ${sweep ? sweep.fixed.length : 0} strings changed`)

const browser = (name, items, fp, cp) => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are an Opus browser checker. For each item below, first see the problem on the unfixed control (770a2ed), then see it fixed on HEAD, at phone (390x844), tablet (820x1180) and laptop (1366x768) sizes and on both desks where it applies. Also try the obvious neighbouring paths (reload, the other desk, a second tab) and look for anything the change broke. Items:
${items}

Servers (ports yours alone):
- HEAD: ${servers(name + '_head', fp, '/home/user/TTRPG_VTT_CO', '/tmp/build_main5')}   (/tmp/build_main5 is a build of HEAD; do not rebuild it.)
- Control: ${servers(name + '_ctl', cp, '/home/user/wt/control', '/tmp/build_control')}   (/home/user/wt/control is a detached worktree at 770a2ed.)
Save screenshots under /tmp/bc_${name}/shots and look at every one. Stop your servers by PID and drop your databases at the end.
Report per item: what the control showed, what HEAD showed, a verdict, screenshot paths. Report each problem found on HEAD as an issue: blocking (item not fixed, broken, against a decision, a crash), should (a real gap), nit.`, { label: `browser:${name}`, phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

const review = () => agent(`${RELAY}

${BASE}
Do not edit, commit or push anything in this stage.

You are the final Opus reviewer before the pull request. Items: #64 edit the whole sheet with a logged change and a roster dot (decision 1, gear editable); #66.3 one navigation for both desks (decision 2); #66.1 join requests as a pop-up plus a tab (decision 6); #66.2 Dispatch button fits; #66.7 insignia changed by clicking (decision 7); #66.4 circle resources start and refill at 1 plus members, no Refill button, Resource Management earn-back asked in one press, logged adjust (decision 3); #66.5 Keys and Illumination questions explained (decision 8); #66.6 and the app-wide confirm wording (decision 4, a sweep commit after the merge); #63 free-text ability questions (decision 5); #62 shorter leave subline; #65 Account menu (decision 9).
Review the whole merged diff as the last line before real players. In particular:
- Each decision is built in full, and nothing Robert asked for, this round or earlier, was removed or weakened.
- Seams between the four groups, which were built separately and merged by hand (conflicts in access.py, handlers/__init__.py, handlers/character.py imports, test_surface.py, test_00_startup.py, WEBSOCKET.md, DESIGN.md): edit_sheet against the earn-back and circle maximums (a player raising a drive maximum, a released member, a sheet edit while a Resource Management ask waits), the sheet's change log lines against the desk group's new navigation and log placement, the insignia rule now on update_circle against the circle group's locked re-read in update_circle, the Account card (words renamed the link "Edit account", desk moved Retire onto the card at every size), DESIGN.md and WEBSOCKET.md rows merged from both sides (counts such as "The 35 types in this table"), the sweep's string changes against tests and docs.
- Choices the groups made that Robert may not expect (fix_groups_result.json 'choices'), notably: sheet edit log lines go to the whole table rather than only the Lightkeeper; a fourth scar is still refused in the editor; the Account menu was kept with Edit account and Sign out. Say whether each fits decisions.md.
- Races and double presses, data loss, the WebSocket protocol (every new or changed message in WEBSOCKET.md, AUTH.md and test_surface.py), schema and openapi pins, QUIRKS.md tests flipped not deleted, docs consistent with each other and the code, no em dashes in added lines, no AI model names in files.
- Every item the group reports claim exists in the merged code.
Run targeted backend tests if useful (own throwaway database, drop it after), not the full suite. Report per item whether the code does what is claimed, and every issue with a level.`, { label: 'final-review', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'high' })

const checks = await parallel([
  () => review(),
  () => browser('sheet', '#64 (decision 1): a player in a sealed campaign opens Edit sheet on their own desk and changes a drive maximum, an action rating, a mark, an ability, a scar, the name; changes gear (take off a starting item, add a fourth past the slots: soft warning only). The Lightkeeper sees one log line per save naming the change from what to what, and a dot on that player\'s roster card that clears when the sheet is opened. Rolls and spends still work after an edit. On the control, gear is locked and there is no editor.', 8011, 8012),
  () => browser('desk', '#66.3 one navigation for both desks (decision 2): the Lightkeeper desk uses the investigator desk\'s header, tabs and phone drawer, with extra entries for the Lightkeeper\'s tools; every Lightkeeper tool reachable at each size, including the dice, Dice and log and Pass notes on a phone while the Circle or Join requests page is open. #66.1 join requests (decision 6): no longer on the front of the desk; a pop-up when a request comes in, and a tab with a count that survives a reload; Invite player reachable. #66.2 the Dispatch button fits at 1024x768, 1280x720, 1366x768, 1440x900, 1920x1080, 820x1180 both orientations and a phone. #66.7 the Lightkeeper changes the circle insignia by clicking it. #65 the Account button no longer opens a menu holding only its own name.', 8021, 8022),
  () => browser('circle_words', '#66.4 (decision 3): a new circle starts each resource at 1 plus the members; no Refill button; a circle with Resource Management passing a milestone (and two at once through the tally) is asked once per earn-back in one press and the resource rises; the adjust control writes a log line. #66.5 the Keys line and the Illumination questions are clear to a Lightkeeper at a glance. #66.6 and the sweep (decision 4): the circle ability removal reads "Press again to remove all circle abilities." with "Remove"; spot-check other confirms on both desks for "Yes, X" buttons and long text. #63 (decision 5): Scout and the other question abilities take a free typed question, with the book\'s questions as optional examples, the cost spent and the question in the log. #62 the Leave campaign confirm is short.', 8031, 8032),
])
const ok = checks.filter(Boolean)
const all = ok.flatMap((c) => c.issues || [])
const needs = all.filter((x) => x.level !== 'nit').length || ok.some((c) => (c.items || []).some((i) => i.verdict === 'not fixed' || i.verdict === 'partly'))
log(`checks: ${ok.length}/4 returned; ${all.filter((x) => x.level === 'blocking').length} blocking, ${all.filter((x) => x.level === 'should').length} should, ${all.filter((x) => x.level === 'nit').length} nit`)
if (!needs) return { sweep, checks, repair: null }

const repair = await agent(`${RELAY}

${BASE}

You are the repair agent. Work in /home/user/TTRPG_VTT_CO on branch ${BR}. Do not push. The final checks found these (a final review and three browser checks): ${JSON.stringify(checks)}

Fix every blocking and should issue and every item marked not fixed or partly, unless you can show the finding is wrong or the fix would go against decisions.md (then say why under skipped). Where a finding questions a choice Robert might not expect, but the choice fits decisions.md, leave it and say so under skipped so the organiser can ask him. Apply nits only where plainly right and cheap. Keep each fix minimal. A backend test for every server change; docs updated where they describe the behaviour; flip QUIRKS tests, never delete them. Then run the backend tests that cover your changes (own throwaway database: DATABASE_URL=postgresql://postgres@localhost:5433/<db> SECRET_KEY=<64 hex> CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files> in backend/; drop it after), rebuild the frontend (cd frontend && npx vite build --outDir /tmp/build_main5), and re-check each changed screen in Chromium by replaying the finding's steps (servers: ${servers('repair', 8041, '/home/user/TTRPG_VTT_CO', '/tmp/build_main5')}). Commit as you go: a short title, a body with what changed and how it was checked, no em dashes, no AI model names, ending with exactly:
${TRAILER}`, { label: 'repair', phase: 'Repair', model: 'opus', effort: 'high', schema: IMPL })
return { sweep, checks, repair }
