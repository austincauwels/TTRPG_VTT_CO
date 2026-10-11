const fs = require('fs'); const L = require('./r8406_lib');
(async () => { const s = L.state;
  for (const [k, u] of Object.entries(s.users)) { const r = await L.api('POST', '/api/auth/login', null, { username: u.username, password: L.PW }); s.users[k] = { ...u, ...r }; }
  fs.writeFileSync(L.STATE, JSON.stringify(s, null, 1)); console.log('ok', Object.keys(s.users[ 'pb']));
})().catch(e => { console.error(e); process.exit(1); });
