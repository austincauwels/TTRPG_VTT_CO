// One unsealed campaign: Lightkeeper lk; four players p1..p4 and a fifth, gh (the one who leaves)
const fs = require('fs');
const L = require('./v8401_lib');
const { api } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const SLINK = {
  role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
  gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1,
  gear: ['Lantern'],
};
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'p1', 'p2', 'p3', 'p4', 'gh']) {
    const username = `${k}v${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const code = `gh-${stamp}`;
  const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Ghost Hours')}&code=${code}`, users.lk.token);
  const camps = { G: { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Ghost Hours', lk: 'lk' } };
  const chars = {};
  const names = { p1: 'Ada Lark', p2: 'Bram Holt', p3: 'Cass Reed', p4: 'Dev Okafor', gh: 'Pontius Aganus' };
  for (const k of ['p1', 'p2', 'p3', 'p4', 'gh']) {
    const ch = await api('POST', '/api/investigators/forge', users[k].token, { ...base, name: names[k], ...SLINK, user_id: users[k].userId });
    await api('POST', `/campaign/join?character_id=${ch.id}&code=${code}`, users[k].token);
    await api('POST', `/campaign/approve/${ch.id}`, users.lk.token);
    chars[k] = { id: ch.id, name: names[k], owner: k, camp: 'G' };
  }
  const st = await api('GET', `/campaign/${camps.G.id}/circle-creation-state`, users.lk.token);
  camps.G.circleId = st.circle_id;
  fs.writeFileSync(L.STATE, JSON.stringify({ stamp, users, camps, chars }, null, 1));
  console.log(JSON.stringify({ camps, chars }));
})().catch((e) => { console.error(e); process.exit(1); });
