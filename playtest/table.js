#!/usr/bin/env node
// The table's spoken channel: what people say out loud at a real table (narration, "I
// search the desk", questions). The site carries the mechanics; this carries the talk.
//   node table.js say <seat> <text...>
//   node table.js read [--last N] [--since N]
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'table.jsonl');
const MD = path.join(__dirname, 'table.md');
const [cmd, ...rest] = process.argv.slice(2);
const lines = () => (fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const NAMES = { dm: 'LIGHTKEEPER', ada: 'ADA', bram: 'BRAM', cass: 'CASS', dev: 'DEV', director: 'DIRECTOR', stress: 'TEST ENGINEER' };
if (cmd === 'say') {
  const [seat, ...words] = rest;
  if (!NAMES[seat] || !words.length) { console.error('usage: say <seat> <text>'); process.exit(1); }
  const n = lines().length + 1;
  const entry = { n, t: new Date().toISOString(), seat, text: words.join(' ') };
  fs.appendFileSync(FILE, JSON.stringify(entry) + '\n');
  fs.appendFileSync(MD, `${n}. [${entry.t.slice(11, 19)}] **${NAMES[seat]}:** ${entry.text}\n`);
  console.log(`said (#${n})`);
} else if (cmd === 'read') {
  const i = rest.indexOf('--last'); const j = rest.indexOf('--since');
  let all = lines();
  if (j >= 0) all = all.filter((e) => e.n > Number(rest[j + 1]));
  if (i >= 0) all = all.slice(-Number(rest[i + 1]));
  for (const e of all) console.log(`${e.n}. [${e.t.slice(11, 19)}] ${NAMES[e.seat]}: ${e.text}`);
  if (!all.length) console.log('(nothing yet)');
} else {
  console.log('usage: table.js say <seat> <text> | read [--last N] [--since N]');
}
