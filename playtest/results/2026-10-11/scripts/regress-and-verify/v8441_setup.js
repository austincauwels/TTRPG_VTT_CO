// One sealed table: lk + ada, bram, cass, dev
const fs = require('fs');
const L = require('./v8441_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const SLINK = {
  role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
  gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'],
};
const JOURNALIST = {
  role: 'Face', specialty: 'Journalist', role_ability: 'Cool Under Pressure', specialty_ability: 'Network',
  move: 1, strike: 0, control: 1, hide: 1, sneak: 1, sway: 1, survey: 2, read: 1, sense: 1,
  gilded_survey: true, gilded_read: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 3, cunning_current: 3, intuition_max: 3, intuition_current: 3, gear: ['Lantern'],
};
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'ada', 'bram', 'cass', 'dev']) {
    const username = `${k}v${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const code = `v41-${stamp}`;
  const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Death Watch')}&code=${code}`, users.lk.token);
  camps.S = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Death Watch', lk: 'lk' };
  const chars = {};
  const forge = async (key, owner, name, kind) => {
    let c;
    try { c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...kind, user_id: users[owner].userId }); }
    catch (e) { c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...SLINK, user_id: users[owner].userId }); }
    await api('POST', `/campaign/join?character_id=${c.id}&code=${code}`, users[owner].token);
    await api('POST', `/campaign/approve/${c.id}`, users.lk.token);
    chars[key] = { id: c.id, name, owner, camp: 'S' };
  };
  await forge('ada', 'ada', 'Ada Lark', SLINK);
  await forge('bram', 'bram', 'Bram Okafor', JOURNALIST);
  await forge('cass', 'cass', 'Cass Reed', SLINK);
  await forge('dev', 'dev', 'Dev Marsh', SLINK);
  const st = await api('GET', `/campaign/${camps.S.id}/circle-creation-state`, users.lk.token);
  camps.S.circleId = st.circle_id;
  sql(`update circles set is_finalized=true, name='The Lantern Watch', reports_open=false, refresh=2, stitch=2, train=2 where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  const out = { stamp, users, camps, chars };
  fs.writeFileSync(L.STATE, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ camps, chars }));
})().catch((e) => { console.error(e); process.exit(1); });
