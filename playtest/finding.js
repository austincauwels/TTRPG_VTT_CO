#!/usr/bin/env node
// Log one finding the moment it happens.
//   node finding.js --seat ada --kind bug --sev high --title "..." --where "..." \
//     --steps "..." --expected "..." --actual "..." --shots shots/ada/012_x.png,shots/ada/013_y.png
// kind: bug (something broken or wrong), rules (the site disagrees with the Candela Obscura
// rules), ux (it works but is confusing, slow or awkward), idea (an improvement or missing
// feature), praise (something that works well and should be kept).
// sev: high (blocks play or loses data or shows a wrong number), medium (a visible defect or
// real friction in a common case), low (a nit).
//   node finding.js --list [--seat ada]     what has been logged so far (titles only)
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'findings.jsonl');
const argv = process.argv.slice(2);
const get = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const all = () => (fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
if (argv.includes('--list')) {
  const s = get('seat');
  for (const f of all().filter((x) => !s || x.seat === s)) console.log(`${f.id} [${f.seat}] ${f.kind}/${f.sev}: ${f.title}`);
  process.exit(0);
}
const KINDS = ['bug', 'rules', 'ux', 'idea', 'praise'];
const SEVS = ['high', 'medium', 'low'];
const f = {
  seat: get('seat'), kind: get('kind'), sev: get('sev') || 'low', title: get('title'), where: get('where') || '',
  steps: get('steps') || '', expected: get('expected') || '', actual: get('actual') || '',
  shots: (get('shots') || '').split(',').map((s) => s.trim()).filter(Boolean), phase: get('phase') || process.env.PT_PHASE || '',
};
const bad = [];
if (!f.seat) bad.push('--seat');
if (!KINDS.includes(f.kind)) bad.push(`--kind (${KINDS.join('|')})`);
if (!SEVS.includes(f.sev)) bad.push(`--sev (${SEVS.join('|')})`);
if (!f.title) bad.push('--title');
if (bad.length) { console.error(`missing or bad: ${bad.join(', ')}`); process.exit(1); }
for (const s of f.shots) if (!fs.existsSync(path.resolve(__dirname, s)) && !fs.existsSync(s)) console.error(`warning: no such screenshot ${s}`);
const id = `F${String(all().length + 1).padStart(3, '0')}`;
fs.appendFileSync(FILE, JSON.stringify({ id, t: new Date().toISOString(), ...f }) + '\n');
console.log(`logged ${id}`);
