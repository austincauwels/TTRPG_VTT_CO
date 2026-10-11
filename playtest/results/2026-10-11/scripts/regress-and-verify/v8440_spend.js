// Spends per assignment: Bram spends 1, dies, rejoins with a new investigator, spends 2 more
const L = require('./v8440_lib');
const { goTab } = require('./v8440_nav');
const { sleep, shot, state, api, sql } = L;
const out = {};
const circ = state.camps.R.circleId;
(async () => {
  sql(`update characters set is_dead=false, scars_count=0, resources_spent_assignment=0 where id=${state.chars.bram.id}`);
  sql(`update circles set resources_editable=true, stitch=5, refresh=5, train=5 where id=${circ}`);
  const bram = state.chars.bram;
  sql(`update characters set nerve_current=0 where id=${bram.id}`);
  let ws = await L.wsOpen(bram.id, state.users.bram.token); await sleep(600);
  ws.send('spend_resource', { resource_type: 'refresh' }); await sleep(1200);
  out.afterFirst = sql(`select id,name,resources_spent_assignment,status,is_dead from characters where id=${bram.id}`);
  ws.close();
  // Bram dies (fourth scar), as in the playtest's death sequence
  sql(`update characters set is_dead=true, scars_count=4 where id=${bram.id}`);
  const SLINK = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?', role: 'Face', specialty: 'Journalist', role_ability: 'Cool Under Pressure', specialty_ability: 'In the Trenches',
  move: 1, strike: 0, control: 1, hide: 1, sneak: 1, sway: 1, survey: 2, read: 1, sense: 1, gilded_survey: true, gilded_read: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 3, cunning_current: 3, intuition_max: 3, intuition_current: 3, gear: ['Lantern'] };
  const nc = await api('POST', '/api/investigators/forge', state.users.bram.token, { ...SLINK, name: 'Tobias Reyes', user_id: state.users.bram.userId });
  await api('POST', '/campaign/rejoin', state.users.bram.token, { character_id: nc.id, campaign_code: state.camps.R.code });
  state.chars.tobias = { id: nc.id, name: 'Tobias Reyes', owner: 'bram', camp: 'R' };
  require('fs').writeFileSync(L.STATE, JSON.stringify(state, null, 1));
  out.afterRejoin = sql(`select id,name,resources_spent_assignment,status,is_dead from characters where user_id=${state.users.bram.userId} order by id`);
  const b = await L.launch();
  const seat = await L.openSeat(b, 'phone', { store: await L.storeFor('bram', 'tobias', 'R') });
  await sleep(4000);
  await goTab(seat.page, 'Circle');
  await sleep(800);
  const txt = await seat.page.evaluate(() => document.body.innerText);
  out.spendsLine = (txt.match(/[^\n]*spends?[^\n]*\n?[^\n]*/gi) || []).slice(0, 4);
  const res = seat.page.getByText(/Your spends/i).first();
  if (await res.count()) await res.scrollIntoViewIfNeeded();
  await shot(seat.page, 'spend_01_tobias_fresh_count');
  await b.close();
  // Two more spends from the new investigator
  ws = await L.wsOpen(nc.id, state.users.bram.token); await sleep(600);
  ws.send('spend_resource', { resource_type: 'stitch' }); await sleep(1000);
  ws.send('spend_resource', { resource_type: 'train' }); await sleep(1000);
  ws.send('spend_resource', { resource_type: 'train' }); await sleep(1000);
  ws.close();
  out.afterMore = sql(`select id,name,resources_spent_assignment from characters where user_id=${state.users.bram.userId} order by id`);
  out.pool = sql(`select stitch,refresh,train from circles where id=${circ}`);
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
