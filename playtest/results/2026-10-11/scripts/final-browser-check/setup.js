// Tables for the final browser check (site 4530, API 8530, db final_bc)
// S "The Final Watch" (lk): Ada Lark (ada, Scholar/Doctor, Patch Up, she/her), Bram Okafor (bram, Slink/Detective,
//   Death Defy, he/him), Cass Moreau (cass, Weird/Medium, Premonitions), Dev Marsh (dev, Muscle/Soldier, Behind Me). Sealed.
// B "Side Case" (lk): Mina Vale (cass), Ivo Pell (ada). Sealed.
// J "Open Doors" (lk): not sealed; cass sends two join requests (Tess Arden, Wren Hale), dev one (Dev Junior).
// F "The Formation Hours" (lkf): fi, fb, fc, fd approved, not finalized.
const fs = require('fs');
const L = require('./lib');
const { api, sql } = L;
const START = {
  Doctor: { actions: { control: 1, sneak: 1, survey: 1, read: 2 }, drives: { intuition: 3 }, gild: 'sneak', role: 'Scholar' },
  Detective: { actions: { control: 1, hide: 1, survey: 2, read: 1 }, drives: { nerve: 2, cunning: 1 }, gild: 'control', role: 'Slink' },
  Medium: { actions: { sneak: 2, survey: 1, sense: 2 }, drives: { cunning: 1, intuition: 2 }, gild: 'sense', role: 'Weird' },
  Soldier: { actions: { move: 2, strike: 2, control: 1 }, drives: { nerve: 1, intuition: 2 }, gild: 'strike', role: 'Muscle' },
  Criminal: { actions: { control: 1, hide: 2, survey: 1, read: 1 }, drives: { nerve: 1, cunning: 2 }, gild: 'hide', role: 'Slink' },
};
const ACTS = ['move', 'strike', 'control', 'hide', 'sneak', 'sway', 'survey', 'read', 'sense'];
function sheet(spec, roleAb, specAb, pronouns = '') {
  const s = START[spec];
  const a = Object.fromEntries(ACTS.map((k) => [k, s.actions[k] || 0]));
  const zero = ACTS.find((k) => a[k] === 0); a[zero] = 1;
  let pts = 3;
  for (const k of ACTS) { while (pts > 0 && a[k] < 2 && k !== zero) { a[k] += 1; pts -= 1; } }
  const d = { nerve: s.drives.nerve || 0, cunning: s.drives.cunning || 0, intuition: s.drives.intuition || 0 };
  let dp = 6; for (const k of ['nerve', 'cunning', 'intuition']) { while (dp > 0 && d[k] < 4) { d[k] += 1; dp -= 1; } }
  const other = ACTS.find((k) => k !== s.gild);
  const g = Object.fromEntries(ACTS.map((k) => [`gilded_${k}`, k === s.gild || k === other]));
  return { pronouns, style: 'Tidy', catalyst: 'A fire', question: 'Why?', role: s.role, specialty: spec, role_ability: roleAb, specialty_ability: specAb,
    ...a, ...g, nerve_max: d.nerve, nerve_current: d.nerve, cunning_max: d.cunning, cunning_current: d.cunning, intuition_max: d.intuition, intuition_current: d.intuition,
    gear: ['Lantern'] };
}
(async () => {
  const stamp = Date.now().toString(36).slice(-4);
  const users = {};
  for (const k of ['lk', 'ada', 'bram', 'cass', 'dev', 'lkf', 'fi', 'fb', 'fc', 'fd']) {
    const username = `${k}_f${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const camps = {};
  const mk = async (key, lk, name) => {
    const code = `${key.toLowerCase()}f-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent(name)}&code=${code}`, users[lk].token);
    camps[key] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name, lk };
  };
  await mk('S', 'lk', 'The Final Watch'); await mk('B', 'lk', 'Side Case'); await mk('J', 'lk', 'Open Doors'); await mk('F', 'lkf', 'The Formation Hours');
  const chars = {};
  const forge = async (key, owner, name, sh, camp, approve = true) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { ...sh, name, user_id: users[owner].userId });
    if (camp) {
      await api('POST', `/campaign/join?character_id=${c.id}&code=${camps[camp].code}`, users[owner].token);
      if (approve) await api('POST', `/campaign/approve/${c.id}`, users[camps[camp].lk].token);
    }
    chars[key] = { id: c.id, name, owner, camp };
  };
  await forge('ada', 'ada', 'Ada Lark', sheet('Doctor', 'Well-Read', 'Patch Up', 'she/her'), 'S');
  await forge('bram', 'bram', 'Bram Okafor', sheet('Detective', 'Death Defy', 'Interrogation', 'he/him'), 'S');
  await forge('cass', 'cass', 'Cass Moreau', sheet('Medium', 'Ritual', 'Premonitions', 'they/them'), 'S');
  await forge('dev', 'dev', 'Dev Marsh', sheet('Soldier', 'Behind Me', 'Basic Training', 'he/him'), 'S');
  await forge('mina', 'cass', 'Mina Vale', sheet('Criminal', 'Scout', 'Street Smarts'), 'B');
  await forge('ivo', 'ada', 'Ivo Pell', sheet('Criminal', 'Scout', 'Street Smarts'), 'B');
  await forge('tess', 'cass', 'Tess Arden', sheet('Criminal', 'Scout', 'Street Smarts'), 'J', false);
  await forge('wren', 'cass', 'Wren Hale', sheet('Criminal', 'Scout', 'Street Smarts'), 'J', false);
  await forge('devj', 'dev', 'Dev Junior', sheet('Criminal', 'Scout', 'Street Smarts'), 'J', false);
  await forge('fi', 'fi', 'Iris Ashe', sheet('Criminal', 'Scout', 'Street Smarts'), 'F');
  await forge('fb', 'fb', 'Bram Ashby', sheet('Criminal', 'Scout', 'Street Smarts'), 'F');
  await forge('fc', 'fc', 'Cassia Fen', sheet('Medium', 'Ritual', 'Premonitions'), 'F');
  await forge('fd', 'fd', 'Dov Okoro', sheet('Doctor', 'Well-Read', 'Patch Up'), 'F');
  for (const k of ['S', 'B', 'J', 'F']) {
    const st = await api('GET', `/campaign/${camps[k].id}/circle-creation-state`, users[camps[k].lk].token);
    camps[k].circleId = st.circle_id;
  }
  sql(`update circles set is_finalized=true, name='The Lantern Watch', stitch=2, refresh=2, train=2 where id=${camps.S.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.S.id}`);
  sql(`update circles set is_finalized=true, name='Watch B' where id=${camps.B.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camps.B.id}`);
  const out = { stamp, users, camps, chars };
  fs.writeFileSync(L.STATE, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, v.username])), camps, chars: Object.fromEntries(Object.entries(chars).map(([k, v]) => [k, v.id])) }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
