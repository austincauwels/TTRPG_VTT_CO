const fs = require('fs');
const L = require('./v8405_lib');
const { api, sql } = L;
const SLINK = {
  pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?',
  role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
  gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1,
  gear: ['Lantern'],
};
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'pa', 'pj']) {
    const username = `${k}v5${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const code = `salt-${stamp}`;
  const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Saltmere Chapter')}&code=${code}`, users.lk.token);
  camps.S = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Saltmere Chapter', lk: 'lk' };
  const ch = await api('POST', '/api/investigators/forge', users.pa.token, { ...SLINK, name: 'Iris Vane', user_id: users.pa.userId });
  await api('POST', `/campaign/join?character_id=${ch.id}&code=${code}`, users.pa.token);
  await api('POST', `/campaign/approve/${ch.id}`, users.lk.token);
  const st = await api('GET', `/campaign/${camps.S.id}/circle-creation-state`, users.lk.token);
  camps.S.circleId = st.circle_id;
  sql(`update circles set is_finalized=true, name='The Lantern Watch' where id=${st.circle_id}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  const chars = { a: { id: ch.id, name: 'Iris Vane', owner: 'pa', camp: 'S' } };
  fs.writeFileSync(L.STATE, JSON.stringify({ stamp, users, camps, chars }, null, 1));
  console.log(JSON.stringify({ users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, v.username])), camps, chars }));
})().catch((e) => { console.error(e); process.exit(1); });
