export const meta = {
  name: 'playtest2-final-check',
  description: 'Final Opus review of the merged fix branch and one Opus real-browser check of every fixed item',
  phases: [{ title: 'Check', detail: 'a code review of the whole merged diff, and a browser check on the real build, side by side' }],
}
const REPO = '/home/user/TTRPG_VTT_CO'
const PT = '/home/user/pt2'
const ITEMS = args.items
const ISSUES = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      level: { type: 'string', enum: ['blocking', 'should', 'nit'] },
      item: { type: 'string', description: 'the playtest item key it concerns, or "other"' },
      where: { type: 'string', description: 'file:line, or the screen and device' },
      problem: { type: 'string' },
      evidence: { type: 'string', description: 'what you ran or saw (screenshot paths you looked at)' },
      fix: { type: 'string' },
    }, required: ['level', 'item', 'where', 'problem', 'evidence', 'fix'] } },
    checked_ok: { type: 'array', items: { type: 'string' }, description: 'items you checked and found working' },
    not_checked: { type: 'array', items: { type: 'string' }, description: 'items you could not check, with why' },
    summary: { type: 'string' },
  },
  required: ['issues', 'checked_ok', 'not_checked', 'summary'],
}
const CTX = `Candela VTT is a React + FastAPI web app for the tabletop RPG Candela Obscura. Its second AI playtest found problems; six groups fixed 33 of them on separate branches, each implemented, reviewed and repaired, then merged into branch claude/candela-vtt-dev-qrp3w6 at ${REPO} (HEAD 39acbbd). The merge base is 63d80f4 (the playtested build). The change: git -C ${REPO} diff 63d80f4..HEAD (61 files). The items, grouped: ${JSON.stringify(ITEMS)}. Each item's description, the verifier's root cause and proposed fix: ${PT}/triage_result.json (a.clusters, b.clusters), ${PT}/verify_heavy_result.json, ${PT}/verify_light_result.json, ${PT}/regress_result.json. The groups' own reports and reviews: ${PT}/fixA_result.json and ${PT}/fixB_result.json. Rules of the repo: DESIGN.md (wording, "Lightkeeper" on screen, 44px touch targets, no permanent help text), FAQ.md (the rules as implemented), docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md. The full backend suite passes (1,861) and the frontend builds. Do not edit, commit or push anything; report only. Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish your task.`

phase('Check')
const [review, browser] = await parallel([
  () => agent(`${CTX}

You are the final code reviewer before this becomes a pull request that real players will use. The groups were reviewed one by one; your job is what those reviews could not see: how the six groups' changes interact after the merge (several touched gameStore.js, InvestigatorDossier.jsx, GMCharacterSheet.jsx, CircleView.jsx, SceneManager.jsx, backend/vtt/ws/handlers/gm.py and access.py, and the merge resolved conflicts in those), and anything wrong that slipped through: a race or double press, a message one desk sends and another never handles, a dead investigator path that a newer change reopened, a WebSocket message missing from WEBSOCKET.md or test_surface.py, a pinned QUIRKS test deleted instead of flipped, wording against DESIGN.md, an em dash anywhere new, a model name anywhere. Read the merge commits' resolutions closely (git log --merges 63d80f4..HEAD, then git show <merge> for each). Run any backend test you want against a throwaway database (psql -h localhost -p 5433 -U postgres -c "create database final_rev"; in ${REPO}/backend: DATABASE_URL=postgresql://postgres@localhost:5433/final_rev SECRET_KEY=<64 hex> CORS_ORIGINS=http://localhost:5173 /root/.venv-candela/bin/python -m pytest -q <files>; drop it after). Levels: blocking (wrong, broken, unsafe or data-losing: must be fixed before the PR), should (a real gap), nit.`, { label: 'final:review', phase: 'Check', schema: ISSUES, model: 'opus', effort: 'high' }),
  () => agent(`${CTX}

You are the real-browser check, the step that caught a crash every review missed last time. Build the merged frontend and drive it in Chromium against a fresh backend, and check every fixed item on the device sizes it was seen on (phone 390x844 and 390x705 with hasTouch and isMobile, tablet 820x1180, laptops 1366x768 and 1440x900, desktop 1920x1080). Also open every main screen once on a phone and on the Lightkeeper's laptop (hub, creator, join, formation papers, player desk tabs, the Lightkeeper's desk sections, Circle page, Notebook) and watch the console for errors: a crash anywhere is blocking.
Your environment: database: psql -h localhost -p 5433 -U postgres -c "create database final_bc" (drop it when done). Backend on 8530: cd ${REPO}/backend && SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))") CORS_ORIGINS=http://127.0.0.1:4530 DATABASE_URL=postgresql://postgres@localhost:5433/final_bc nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8530 > /tmp/final_api.log 2>&1 &. Build: cd ${REPO}/frontend && npx vite build --outDir /tmp/build_final. Site on 4530: cd ${REPO}/frontend && nohup npx vite preview --config .vite.preview.8530.config.mjs --host 127.0.0.1 --port 4530 --strictPort --outDir /tmp/build_final > /tmp/final_preview.log 2>&1 & (the config exists and is git-excluded; if you need a second backend, 8531 has one too). Playwright: require('${PT}/node_modules/playwright'), Chromium /opt/pw-browsers/chromium-1194/chrome-linux/chrome. ${PT}/checks/ (setup.js builds tables over the API; lib.js opens seats with a seeded store, reads WebSocket frames, runs SQL) and ${PT}/verify/*.js have scripts to copy: change their ports and database to yours. Sending X-Forwarded-For with a fresh address per request avoids the sign-up limit. A gilded die waiting for its choice wobbles, so press Enter on it. For a silent network drop use page.routeWebSocket to stall one socket. Write scripts and screenshots under /tmp/final_bc/. Look at every screenshot before you rely on it. When done, stop your servers by PID (never pkill) and drop your database. Levels: blocking (a crash, a fix that does not work, data loss), should, nit.`, { label: 'final:browser', phase: 'Check', schema: ISSUES, model: 'opus', effort: 'high' }),
])
const all = [review, browser].filter(Boolean)
log(`review: ${review ? review.issues.filter((i) => i.level === 'blocking').length : '?'} blocking, ${review ? review.issues.filter((i) => i.level === 'should').length : '?'} should; browser: ${browser ? browser.issues.filter((i) => i.level === 'blocking').length : '?'} blocking, ${browser ? browser.issues.filter((i) => i.level === 'should').length : '?'} should`)
return { review, browser }
