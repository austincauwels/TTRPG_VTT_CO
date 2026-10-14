export const meta = {
  name: 'playtest4-session',
  description: 'Fourth playtest blind play on beta: every step of the session in order (35 agents, Lightkeeper Opus high, players Sonnet medium)',
  phases: [
    { title: 'Setup', detail: 'campaign, investigators, approval, circle, ready' },
    { title: 'Play', detail: 'rounds 1 to 3' },
    { title: 'Close', detail: 'wrap and after' },
  ],
}

const S = '/tmp/claude-0/-home-user-TTRPG-VTT-CO/91398814-49c0-553a-8328-1aa23d75058c/scratchpad/play4.js'
const out = {}
const step = async (name, a) => {
  const r = await workflow({ scriptPath: S }, a)
  out[name] = r
  const dm = r && r.dm
  log(`${name}: ${dm ? (dm.blocked ? `BLOCKED: ${dm.blocked}` : (dm.state || dm.summary || '').slice(0, 200)) : `${(r && r.players || []).filter(Boolean).length} player turns`}`)
  return r
}
const heard = (rs) => (rs || []).map((r, j) => `${['ada', 'bram', 'cass', 'dev'][j]}: ${r ? `${r.summary}${r.blocked ? ` (blocked: ${r.blocked})` : ''}` : 'turn failed'}`).join('\n')

phase('Setup')
const c = await step('campaign', { step: 'campaign' })
const code = c && c.code
if (!code) return { stopped: 'no campaign code', out }
await step('investigators', { step: 'investigators', code })
const ap = await step('approval', { step: 'approval', code, last: out.investigators && null })
if (!ap || !ap.dm) return { stopped: 'approval failed', code, out }
const ci = await step('circle', { step: 'circle', code, last: ap.dm })
const rd = await step('ready', { step: 'ready', code, last: ap.dm, heard: heard(ci && ci.players) })
if (!rd || !rd.dm || rd.dm.blocked) return { stopped: `ready blocked: ${rd && rd.dm && rd.dm.blocked}`, code, out }

phase('Play')
let last = rd.dm
for (const n of [1, 2, 3]) {
  const r = await step(`round${n}`, { step: 'round', round: n, code, last })
  if (r && r.dm) last = r.dm
}

phase('Close')
const w = await step('wrap', { step: 'wrap', code, last })
if (w && w.dm) last = w.dm
await step('after', { step: 'after', code, last })
return { code, out }
