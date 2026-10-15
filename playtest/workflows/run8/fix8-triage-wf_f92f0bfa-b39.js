export const meta = {
  name: 'fix8-triage',
  description: 'Fix round 8: one Opus triage of #72-#87 and #88 lines against main 1bc48a0, with groups by files',
  phases: [{ title: 'Triage', detail: 'one Opus agent, read-only' }],
}
const RELAY = 'Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish.'
const SCHEMA = {
  type: 'object',
  properties: {
    triage_markdown: { type: 'string', description: 'the full triage document as Markdown (the organiser saves it as triage8.md)' },
    groups: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string', description: 'short lowercase name, used for branch fix8-<name>' },
      model: { type: 'string', enum: ['opus', 'sonnet'], description: 'opus for protocol, races, rules logic, data; sonnet for well-specified UI' },
      owns: { type: 'string', description: 'the files and areas this group owns' },
      items: { type: 'array', items: { type: 'string' }, description: 'one line per item: id, short title, then "(see triage8.md <id>)"' },
    }, required: ['name', 'model', 'owns', 'items'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, why: { type: 'string' } }, required: ['item', 'why'] } },
  },
  required: ['triage_markdown', 'groups', 'skipped'],
}
const r = await agent(`${RELAY}

You are triaging fix round 8 for Candela VTT (a React + FastAPI web app for the tabletop RPG Candela Obscura). Read only: edit, run or start nothing (you may read files, grep, and git log/show).

Code: /home/user/TTRPG_VTT_CO at main 1bc48a0 (fix round 7). Scope and binding decisions: /home/user/pt8/decisions8.md (read it first). Earlier binding decisions: /home/user/pt8/decisions_fix4.md, decisions_fix5.md, decisions_fix6.md, decisions_fix7.md, decisions_run4.md, issue16.md. Never propose a fix that removes or weakens any of them.
Items: GitHub issues #72 to #87 and the lines of #88 (read each with ToolSearch "select:mcp__github__issue_read", owner austincauwels, repo TTRPG_VTT_CO; read comments too). Their findings, steps and screenshots: /home/user/harness/playtest/results/2026-10-14-run4/report.md and report.json, findings.jsonl, recheck_findings.jsonl and recheck/*.json. The previous round's triage shows the expected form: /home/user/pt8/triage7.md.
Docs: DESIGN.md, FAQ.md, docs/refactor/WEBSOCKET.md, docs/refactor/QUIRKS.md, docs/refactor/RULES_CHECK.md.

For each item (ids: the issue number for #72-#87; for #88 use 88.1-88.21 for the 21 verified lines in order, 88.u1-88.u28 for the unverified lines, 88.i1-88.i4 for the ideas, each with its cluster id): status (still present / fixed already / needs a decision / no longer applies), cause with file:line, the smallest fix that builds the decision, size (S/M/L), files, and whether it touches the server, the WebSocket protocol or the schema. For the unverified #88 lines and ideas, mark each "cheap" (small, local, plainly right) or "skip" with why; only cheap ones go into groups. Point out interactions between items (for example #72, #78 and #79 on restarts; #73, #76, #82 on death).

Then propose 3 to 5 groups split by files so that branches merge cleanly (likely: server state and restarts; death, scars and reports; Lightkeeper desk and charter; small UX and touch targets). Each group: a name, model (opus for protocol, races, rules logic or data; sonnet for well-specified UI), the files it owns, and its items. Keep server-heavy groups balanced so no single group is huge. Note shared files (WEBSOCKET.md, QUIRKS.md, FAQ.md, gameStore.js) and how to avoid conflicts.

Return the whole triage as Markdown in triage_markdown (no em dashes), the groups, and the items you skipped with why.`, { label: 'triage', phase: 'Triage', schema: SCHEMA, model: 'opus', effort: 'high' })
return r