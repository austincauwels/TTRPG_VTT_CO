// Tables for the four clusters:
// M "The Main Watch" (lk): Ada Lark (ada), Bram Okafor (bram), Cass Moreau (cass). Sealed.
// B "Side Case" (lk): Mina Vale (cass), Ivo Pell (ada). Sealed.
// J "Open Doors" (lk): not sealed; cass sends two join requests (Tess Arden, Wren Hale), dev sends one (Dev Marsh).
const fs = require('fs');
const L = require('./v8442_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const SLINK = {
  role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
  gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'],
};
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'ada', 'bram', 'cass', 'dev']) {
    const username = `${k}_v${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const mk = async (key, name) => {
    const code = `${key.toLowerCase()}v42-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent(name)}&code=${code}`, users.lk.token);
    camps[key] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name, lk: 'lk' };
  };
  await mk('M', 'The Main Watch'); await mk('B', 'Side Case'); await mk('J', 'Open Doors');
  const chars = {};
  const forge = async (key, owner, name, camp, approve = true) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...SLINK, user_id: users[owner].userId });
    if (camp) {
      await api('POST', `/campaign/join?character_id=${c.id}&code=${camps[camp].code}`, users[owner].token);
      if (approve) await api('POST', `/campaign/approve/${c.id}`, users.lk.token);
    }
    chars[key] = { id: c.id, name, owner, camp };
  };
  await forge('ada', 'ada', 'Ada Lark', 'M');
  await forge('bram', 'bram', 'Bram Okafor', 'M');
  await forge('cass', 'cass', 'Cass Moreau', 'M');
  await forge('mina', 'cass', 'Mina Vale', 'B');
  await forge('ivo', 'ada', 'Ivo Pell', 'B');
  await forge('tess', 'cass', 'Tess Arden', 'J', false);
  await forge('wren', 'cass', 'Wren Hale', 'J', false);
  await forge('devm', 'dev', 'Dev Marsh', 'J', false);
  await forge('bram2', 'bram', 'Bram Second', null);
  for (const k of ['M', 'B', 'J']) {
    const st = await api('GET', `/campaign/${camps[k].id}/circle-creation-state`, users.lk.token);
    camps[k].circleId = st.circle_id;
  }
  for (const k of ['M', 'B']) {
    sql(`update circles set is_finalized=true, name='Watch ${k}', reports_open=false where id=${camps[k].circleId}`);
    sql(`update campaigns set roster_finalized=true where id=${camps[k].id}`);
  }
  const out = { stamp, users, camps, chars };
  fs.writeFileSync(L.STATE, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, v.username])), camps, chars }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
