// Tables for the circle-page regression batch (site 4401, API 8401, db candela_r8401)
// R "The Ninth Night" (lk): ada (Journalist), bram (Criminal), cass (Occultist), dev (Criminal). Sealed.
//   Edda (ee, Doctor-ish -> use Journalist) also in R? no: 4 players.
//   Relationships: bram->ada, cass->ada, dev->ada proposed (pending) for ada's Accept test; cass->dev proposed.
// F "The Formation Hours" (lkf): fi, fb, fc, fd joined, PENDING (approve in the test).
// E "The Empty Chapter" (lke): no investigators.
const fs = require('fs');
const L = require('./r8401_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const SLINK = { role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0, gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'] };
const JOURNALIST = { role: 'Face', specialty: 'Journalist', role_ability: 'Cool Under Pressure', specialty_ability: 'In the Trenches',
  move: 1, strike: 0, control: 1, hide: 1, sneak: 1, sway: 1, survey: 2, read: 1, sense: 1, gilded_survey: true, gilded_read: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 3, cunning_current: 3, intuition_max: 3, intuition_current: 3, gear: ['Lantern'] };
const WEIRD = { role: 'Weird', specialty: 'Occultist', role_ability: 'Ritual', specialty_ability: 'Ghostblade',
  move: 1, strike: 0, control: 1, hide: 0, sneak: 1, sway: 0, survey: 2, read: 2, sense: 2, gilded_read: true, gilded_sense: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 2, cunning_current: 2, intuition_max: 4, intuition_current: 4, gear: ['Arcane Texts'] };
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'ada', 'bram', 'cass', 'dev', 'lkf', 'fi', 'fb', 'fc', 'fd', 'lke']) {
    const username = `${k}r8${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const mk = async (key, lk, name) => {
    const code = `${key.toLowerCase()}r8-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent(name)}&code=${code}`, users[lk].token);
    camps[key] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name, lk };
  };
  await mk('R', 'lk', 'The Ninth Night');
  await mk('F', 'lkf', 'The Formation Hours');
  await mk('E', 'lke', 'The Empty Chapter');
  const chars = {};
  const forge = async (key, owner, name, kind, camp, approve = true) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { ...base, name, ...kind, user_id: users[owner].userId });
    await api('POST', `/campaign/join?character_id=${c.id}&code=${camps[camp].code}`, users[owner].token);
    if (approve) await api('POST', `/campaign/approve/${c.id}`, users[camps[camp].lk].token);
    chars[key] = { id: c.id, name, owner, camp, specialty: kind.specialty };
  };
  await forge('ada', 'ada', 'Ada Pryce', JOURNALIST, 'R');
  await forge('bram', 'bram', 'Bram Holt', SLINK, 'R');
  await forge('cass', 'cass', 'Cass Morrow', WEIRD, 'R');
  await forge('dev', 'dev', 'Dev Okafor', SLINK, 'R');
  await forge('fi', 'fi', 'Iris Ashe', SLINK, 'F', false);
  await forge('fb', 'fb', 'Bram Ashby', SLINK, 'F', false);
  await forge('fc', 'fc', 'Cassia Fen', WEIRD, 'F', false);
  await forge('fd', 'fd', 'Dov Okoro', JOURNALIST, 'F', false);
  for (const k of ['R', 'F', 'E']) {
    const st = await api('GET', `/campaign/${camps[k].id}/circle-creation-state`, users[camps[k].lk].token);
    camps[k].circleId = st.circle_id;
  }
  for (const [from, to] of [['bram', 'ada'], ['cass', 'ada'], ['dev', 'ada'], ['cass', 'dev']]) {
    await api('POST', '/circle/relationship/propose', users[from].token, {
      circle_id: camps.R.circleId, from_character_id: chars[from].id, to_character_id: chars[to].id, rel_type: 'Champion', lore: 'We met on the night train.' });
  }
  sql(`update circles set is_finalized=true, name='The Ninth Night', insignia='GiCompass', stitch=5, refresh=5, train=5 where id=${camps.R.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.R.id}`);
  const out = { stamp, users, camps, chars };
  fs.writeFileSync(L.STATE, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ camps, chars: Object.fromEntries(Object.entries(chars).map(([k, v]) => [k, v.id])) }));
})().catch((e) => { console.error(e); process.exit(1); });
