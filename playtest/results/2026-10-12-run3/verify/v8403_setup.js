const fs = require('fs');
const L = require('./v8403_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const PROF = {
  role: 'Scholar', specialty: 'Professor', role_ability: 'Well-Read', specialty_ability: 'Steel Mind',
  move: 1, strike: 0, control: 1, hide: 0, sneak: 0, sway: 2, survey: 2, read: 2, sense: 1,
  gilded_read: true, gilded_survey: true,
  nerve_max: 0, nerve_current: 0, cunning_max: 5, cunning_current: 5, intuition_max: 4, intuition_current: 4,
  gear: ['Thick Reference Tome'],
};
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'pa', 'pb']) {
    const username = `lightkeeper_${k}${stamp}`.replace('lightkeeper_p', 'player_p');
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username, name: r.name || username };
  }
  const camps = {};
  const code = `nb-${stamp}`;
  const c = await api('POST', `/campaign/create?name=${encodeURIComponent('Saltmere Verify')}&code=${code}`, users.lk.token);
  camps.S = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'Saltmere Verify', lk: 'lk' };
  const chars = {};
  const forge = async (key, owner, name) => {
    const ch = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...PROF, user_id: users[owner].userId });
    await api('POST', `/campaign/join?character_id=${ch.id}&code=${code}`, users[owner].token);
    await api('POST', `/campaign/approve/${ch.id}`, users.lk.token);
    chars[key] = { id: ch.id, name, owner, camp: 'S' };
  };
  await forge('a', 'pa', 'Ada Quill');
  await forge('b', 'pb', 'Dev Lindqvist');
  const st = await api('GET', `/campaign/${camps.S.id}/circle-creation-state`, users.lk.token);
  camps.S.circleId = st.circle_id;
  sql(`update circles set is_finalized=true, name='The Verify Watch' where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  fs.writeFileSync(L.STATE, JSON.stringify({ stamp, users, camps, chars }, null, 1));
  console.log(JSON.stringify({ users: Object.fromEntries(Object.entries(users).map(([k,v])=>[k,{u:v.username,name:v.name,id:v.userId}])), camps, chars }));
})().catch((e) => { console.error(e); process.exit(1); });
