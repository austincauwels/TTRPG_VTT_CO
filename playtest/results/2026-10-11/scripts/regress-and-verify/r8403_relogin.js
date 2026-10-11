const fs = require('fs'); const L = require('./r8403_lib'); const { api, state } = L;
(async () => { for (const [k, u] of Object.entries(state.users)) { const r = await api('POST', '/api/auth/login', null, { username: u.username, password: L.PW }); state.users[k] = { ...u, ...r, username: u.username }; }
  fs.writeFileSync(L.STATE, JSON.stringify(state, null, 1)); console.log('ok', Object.keys(state.users).join(',')); })().catch(e => { console.error(e.message); process.exit(1); });
