#!/usr/bin/env node
// The playtest's stand-in for an email inbox. The site's outgoing emails (password reset,
// email change) are caught by the harness and kept in outbox.jsonl instead of being sent.
//   node mail.js <address>      every email sent to that address, newest last
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'outbox.jsonl');
const to = (process.argv[2] || '').toLowerCase();
if (!to) { console.error('usage: node mail.js <address>'); process.exit(1); }
const all = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const mine = all.filter((m) => (m.to || '').toLowerCase() === to);
if (!mine.length) console.log(`(no email to ${to})`);
for (const m of mine) console.log(`--- ${m.t}  To: ${m.to}\nSubject: ${m.subject}\n\n${m.text}\n`);
