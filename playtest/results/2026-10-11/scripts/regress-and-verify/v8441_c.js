// A dead investigator's spend, with the circle's resources open to spends
const L = require('./v8441_lib');
const { sleep, sql, state } = L;
(async () => {
  const B = state.chars.bram.id, C = state.camps.S.circleId;
  await L.fresh('bram', 'bram', { scars_count: 4, scars_list: `'["a","b","c","d"]'`, is_dead: true, incapacitated: true, nerve_current: 0, resources_spent_assignment: 0 });
  sql(`update circles set resources_editable=true, refresh=1 where id=${C}`);
  console.log('before', sql(`select refresh from circles where id=${C}`), sql(`select nerve_current,is_dead from characters where id=${B}`));
  const s = await L.wsOpen(B, state.users.bram.token);
  await sleep(800);
  s.send('spend_resource', { circle_id: C, resource_type: 'refresh' });
  await sleep(1500);
  s.send('roll', { action: 'focus', drive_spend: 0 });
  await sleep(2000);
  console.log('after', sql(`select refresh from circles where id=${C}`), sql(`select nerve_current,is_dead from characters where id=${B}`));
  console.log(JSON.stringify(s.frames.map((f) => f.type + (f.payload?.message ? ':' + f.payload.message : f.payload?.detail ? ':' + f.payload.detail : ''))));
  s.close();
  sql(`update circles set resources_editable=false, refresh=2 where id=${C}`);
})().catch((e) => { console.error(e); process.exit(1); });
