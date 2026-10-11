// End Assignment with filed reports whose Illumination was never added (LK 1440x900)
const L = require('./v8444_lib');
const { sleep, sql, state } = L;
const clickTab = async (p, name) => { const t = p.getByRole('tab', { name: new RegExp(`^${name}`, 'i') }); if (await t.count()) await t.first().click(); else await p.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).first().click(); await sleep(900); };
(async () => {
  const b = await L.launch();
  sql(`update characters set advancement_picks=0 where campaign_id=${state.camps.S.id}`);
  sql(`update circles set illumination=0 where id=${state.camps.S.circleId}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(4500);
  await clickTab(lk.page, 'Circle');
  if (await lk.page.getByRole('button', { name: 'Open reports' }).count()) { await lk.page.getByRole('button', { name: 'Open reports' }).click(); await sleep(1500); }
  for (const [k, o] of [['a', 'pa'], ['b', 'pb']]) {
    const ws = await L.wsOpen(state.chars[k].id, state.users[o].token); await sleep(800);
    ws.send('submit_assignment_report', { circle_id: state.camps.S.circleId, character_id: state.chars[k].id, responses: { keys_fulfilled: 'some', keys_detail: { 1: true } } });
    await sleep(1200); console.log(k, ws.frames.filter(f => /report|rejected/.test(f.type)).map(f => f.type)); ws.close();
  }
  await sleep(1500);
  const addBtn = lk.page.getByRole('button', { name: /^Add \d+ Illumination/ });
  console.log('tally button', await addBtn.allInnerTexts());
  await addBtn.first().scrollIntoViewIfNeeded().catch(() => {});
  await L.shot(lk.page, 'e01_lk_tally_waiting');
  console.log('DB before', sql(`select illumination, reports_open, backstory_answers->'reports' is not null, backstory_answers->'assignment' from circles where id=${state.camps.S.circleId}`));
  await clickTab(lk.page, 'Roster');
  await lk.page.getByRole('button', { name: /^End Assignment$/ }).click(); await sleep(600);
  console.log('armed hint:', await lk.page.getByText(/Press again to end it/).innerText().catch(() => 'none'));
  await L.shot(lk.page, 'e02_lk_end_armed');
  await lk.page.getByRole('button', { name: /Yes, end it/ }).click(); await sleep(2500);
  console.log('receipt:', await lk.page.getByText(/Assignment ended at/).innerText().catch(() => 'none'));
  await clickTab(lk.page, 'Circle');
  console.log('tally button after', await lk.page.getByRole('button', { name: /^Add \d+ Illumination/ }).allInnerTexts());
  console.log('ledger', await lk.page.evaluate(() => { const dt = [...document.querySelectorAll('dt')].find(d => d.textContent.trim() === 'Reports'); return dt ? dt.parentElement.innerText.replace(/\s+/g, ' ') : 'no ledger'; }));
  await L.shot(lk.page, 'e03_lk_circle_after_end', { fullPage: true });
  console.log('DB after', sql(`select illumination, reports_open, backstory_answers->'reports', backstory_answers->'assignment' from circles where id=${state.camps.S.circleId}`));
  console.log('errors', lk.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
