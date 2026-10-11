// Crossing proposals: Dev and Cass each propose Rival to the other; Cass accepts Dev's
const L = require('./v8440_lib');
const { goTab } = require('./v8440_nav');
const { sleep, shot, state, api, sql } = L;
const circ = state.camps.R.circleId;
(async () => {
  const c = state.chars;
  await api('POST', '/circle/relationship/propose', state.users.dev.token, { circle_id: circ, from_character_id: c.dev.id, to_character_id: c.cass.id, rel_type: 'Rival', lore: 'Dev: she reads gravel the way I read footnotes.' });
  await api('POST', '/circle/relationship/propose', state.users.cass.token, { circle_id: circ, from_character_id: c.cass.id, to_character_id: c.dev.id, rel_type: 'Rival', lore: 'Cass: he is always a step behind.' });
  const devRel = sql(`select id from relationships where from_character_id=${c.dev.id} and to_character_id=${c.cass.id}`);
  await api('POST', '/circle/relationship/respond', state.users.cass.token, { relationship_id: Number(devRel), action: 'accept' });
  console.log(sql(`select id,from_character_id,to_character_id,rel_type,status,lore from relationships where circle_id=${circ} and ${c.cass.id} in (from_character_id,to_character_id) and ${c.dev.id} in (from_character_id,to_character_id)`));
  const b = await L.launch();
  const seat = await L.openSeat(b, 'laptop', { store: await L.storeFor('cass', 'cass', 'R') });
  await sleep(4000);
  await goTab(seat.page, 'Circle'); await sleep(800);
  const h = seat.page.getByText(/Your relationship to Dev/i).first();
  if (await h.count()) await h.scrollIntoViewIfNeeded();
  await shot(seat.page, 'rel_01_cass_crossing');
  const t = await seat.page.evaluate(() => document.body.innerText);
  console.log((t.match(/YOUR RELATIONSHIP TO DEV[\s\S]{0,400}/i) || [''])[0]);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
