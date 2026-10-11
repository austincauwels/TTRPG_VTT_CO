// Tables for the advancement-accessibility regression batch (site 4407, API 8407)
const fs = require('fs');
const L = require('./v8444_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const SLINK = { role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0, gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'] };
const JOURNALIST = { role: 'Face', specialty: 'Journalist', role_ability: 'Cool Under Pressure', specialty_ability: 'In the Trenches',
  move: 1, strike: 0, control: 1, hide: 1, sneak: 1, sway: 1, survey: 2, read: 1, sense: 1, gilded_survey: true, gilded_read: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 3, cunning_current: 3, intuition_max: 3, intuition_current: 3, gear: ['Lantern'] };
const WEIRD = { role: 'Weird', specialty: 'Occultist', role_ability: 'Let Them In', specialty_ability: 'Ghostblade',
  move: 1, strike: 0, control: 1, hide: 0, sneak: 1, sway: 0, survey: 2, read: 2, sense: 2, gilded_read: true, gilded_sense: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 2, cunning_current: 2, intuition_max: 4, intuition_current: 4, gear: ['Arcane Texts'] };
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'pa', 'pb', 'pc', 'lkf', 'fi', 'fb', 'fc', 'fd', 'solo']) {
    const username = `${k}v4${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const mk = async (key, lk, name) => {
    const code = `${key.toLowerCase()}v4-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent(name)}&code=${code}`, users[lk].token);
    camps[key] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name, lk };
  };
  await mk('S', 'lk', 'The Sealed Hours');
  await mk('F', 'lkf', 'The Formation Hours');
  const chars = {};
  const forge = async (key, owner, name, kind, camp) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...kind, user_id: users[owner].userId });
    await api('POST', `/campaign/join?character_id=${c.id}&code=${camps[camp].code}`, users[owner].token);
    await api('POST', `/campaign/approve/${c.id}`, users[camps[camp].lk].token);
    chars[key] = { id: c.id, name, owner, camp, specialty: kind.specialty };
  };
  await forge('a', 'pa', 'Iris Vane', SLINK, 'S');
  await forge('b', 'pb', 'Bram Holt', JOURNALIST, 'S');
  await forge('c', 'pc', 'Dev Okafor', WEIRD, 'S');
  await forge('fi', 'fi', 'Iris Ashe', SLINK, 'F');
  await forge('fb', 'fb', 'Bram Ashby', SLINK, 'F');
  await forge('fc', 'fc', 'Cassandra Fairweather', WEIRD, 'F');
  await forge('fd', 'fd', 'Dev Okoro', SLINK, 'F');
  for (const k of ['S', 'F']) {
    const st = await api('GET', `/campaign/${camps[k].id}/circle-creation-state`, users[camps[k].lk].token);
    camps[k].circleId = st.circle_id;
  }
  sql(`update circles set is_finalized=true, name='The Ninth Night' where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  for (const from of ['fb', 'fd']) for (const to of ['fi', 'fc']) {
    await api('POST', '/circle/relationship/propose', users[from].token, {
      circle_id: camps.F.circleId, from_character_id: chars[from].id, to_character_id: chars[to].id, rel_type: 'Stranger', lore: 'We met on the night train.' });
  }
  fs.writeFileSync(L.STATE, JSON.stringify({ stamp, users, camps, chars }, null, 1));
  console.log(JSON.stringify({ camps, chars }));
})().catch((e) => { console.error(e); process.exit(1); });
