// Builds one sealed table over the API for the dice/abilities/marks regression batch.
const fs = require('fs');
const L = require('./r8405_lib');
const { api, sql } = L;
const base = { pronouns: 'she/her', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const DOCTOR = { role: 'Scholar', specialty: 'Doctor', role_ability: 'Well-Read', specialty_ability: 'Patch Up',
  move: 1, strike: 0, control: 2, hide: 0, sneak: 1, sway: 0, survey: 2, read: 2, sense: 1,
  gilded_read: true, gilded_sneak: true,
  nerve_max: 2, nerve_current: 2, cunning_max: 2, cunning_current: 2, intuition_max: 5, intuition_current: 5, gear: ['Surgical Tools'] };
const SOLDIER = { role: 'Muscle', specialty: 'Soldier', role_ability: 'Behind Me', specialty_ability: 'Tactician',
  move: 2, strike: 2, control: 2, hide: 1, sneak: 0, sway: 1, survey: 1, read: 0, sense: 0,
  gilded_control: true, gilded_strike: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 1, cunning_current: 1, intuition_max: 4, intuition_current: 4, gear: ['Trench Whistle'] };
const SLINK = { role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Born in the Shadows',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
  gilded_hide: true, gilded_move: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 4, cunning_current: 4, intuition_max: 2, intuition_current: 2, gear: ['Lantern'] };
const MEDIUM = { role: 'Weird', specialty: 'Medium', role_ability: 'Let Them In', specialty_ability: 'Premonitions',
  move: 1, strike: 0, control: 1, hide: 0, sneak: 2, sway: 0, survey: 2, read: 1, sense: 2,
  gilded_sense: true, gilded_survey: true,
  nerve_max: 2, nerve_current: 2, cunning_max: 2, cunning_current: 2, intuition_max: 5, intuition_current: 5, gear: ['Tarot Deck'] };
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'pa', 'pb', 'pc', 'pd']) {
    const username = `${k}r5${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username, name: r.name || r.username || username };
  }
  const camps = {};
  const code = `rg5-${stamp}`;
  const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Regress Table')}&code=${code}`, users.lk.token);
  camps.S = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Regress Table', lk: 'lk' };
  const chars = {};
  const forge = async (key, owner, name, kind) => {
    const ch = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...kind, user_id: users[owner].userId });
    await api('POST', `/campaign/join?character_id=${ch.id}&code=${code}`, users[owner].token);
    await api('POST', `/campaign/approve/${ch.id}`, users.lk.token);
    chars[key] = { id: ch.id, name, owner, camp: 'S' };
  };
  await forge('a', 'pa', 'Imogen Thale', DOCTOR);
  await forge('b', 'pb', 'Jonah Hale', SOLDIER);
  await forge('c', 'pc', 'Cass Moreau', SLINK);
  await forge('d', 'pd', 'Edda Rook', MEDIUM);
  const st = await api('GET', `/campaign/${camps.S.id}/circle-creation-state`, users.lk.token);
  camps.S.circleId = st.circle_id;
  sql(`update circles set is_finalized=true, name='The Lantern Watch' where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  fs.writeFileSync(L.STATE, JSON.stringify({ stamp, users, camps, chars }, null, 1));
  console.log(JSON.stringify({ camps, chars, users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, { id: v.userId, name: v.name, username: v.username }])) }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
