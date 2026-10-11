// S "The Sealed Hours" (lk): Iris Vane (pa), Bram Holt (pb). Sealed.
// D "The Drowned Bell" (lkd) code drowned-bell-<stamp>: Cora Lune (pc) approved+sealed? no: open formation.
// Users pj, pk: unaffiliated, for joining
const fs = require('fs');
const L = require('./r8403_lib');
const { api, sql } = L;
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
  for (const k of ['lk', 'pa', 'pb', 'lkd', 'pj', 'pk']) {
    const username = `${k}rc${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const mk = async (key, lk, name, code) => {
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent(name)}&code=${code}`, users[lk].token);
    camps[key] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name, lk };
  };
  await mk('S', 'lk', 'The Sealed Hours', `src-${stamp}`);
  await mk('D', 'lkd', 'The Drowned Bell', `drowned-bell-${stamp}`);
  const chars = {};
  const forge = async (key, owner, name, camp, approve = true) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...SLINK, user_id: users[owner].userId });
    if (camp) {
      await api('POST', `/campaign/join?character_id=${c.id}&code=${camps[camp].code}`, users[owner].token);
      if (approve) await api('POST', `/campaign/approve/${c.id}`, users[camps[camp].lk].token);
    }
    chars[key] = { id: c.id, name, owner, camp };
  };
  await forge('a', 'pa', 'Iris Vane', 'S');
  await forge('b', 'pb', 'Bram Holt', 'S');
  await forge('j', 'pj', 'Jonah Hale', null);
  await forge('k', 'pk', 'Kit Marlowe', null);
  for (const k of ['S']) {
    const st = await api('GET', `/campaign/${camps[k].id}/circle-creation-state`, users[camps[k].lk].token);
    camps[k].circleId = st.circle_id;
  }
  sql(`update circles set is_finalized=true, name='The Lantern Watch' where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  const out = { stamp, users, camps, chars };
  fs.writeFileSync(L.STATE, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 3000));
})().catch((e) => { console.error(e); process.exit(1); });
