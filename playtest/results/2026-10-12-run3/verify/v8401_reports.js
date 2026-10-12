const L = require('./v8401_lib');
const { api, state, sql, sleep, shot } = L;
(async () => {
  const G = state.camps.G, lk = state.users.lk;
  await api('POST', '/campaign/finalize-roster', lk.token, { campaign_id: G.id, circle_id: G.circleId });
  console.log('circle after seal:', sql(`select id,is_finalized,stitch,refresh,train from circles where id=${G.circleId}`));
  // open reports from the Lightkeeper's socket, four of five file a report with a key
  const gm = await L.wsOpen(G.code, lk.token); await sleep(800);
  gm.send('gm_toggle_reports', { circle_id: G.circleId, role: 'GM' }); await sleep(800);
  for (const k of ['p1', 'p2', 'p3', 'p4']) {
    const c = await L.wsOpen(String(state.chars[k].id), state.users[k].token); await sleep(500);
    c.send('submit_assignment_report', { circle_id: G.circleId, character_id: state.chars[k].id, responses: { keys_detail: { 0: true } } });
    await sleep(700); c.close();
  }
  gm.close();
  console.log('reports filed:', sql(`select jsonb_object_keys((backstory_answers::jsonb)->'reports') from circles where id=${G.circleId}`).replace(/\n/g, ','));

  const b = await L.launch();
  const seat = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'G') });
  await sleep(5000);
  await shot(seat.page, 'r01_desk_sealed');
  await seat.page.getByRole('button', { name: /^Circle$/i }).first().click();
  await sleep(3000);
  await shot(seat.page, 'r02_circle');
  // the unfiled card
  const pont = seat.page.locator('[aria-label^="Pontius Aganus:"]').first();
  console.log('pontius card label:', await pont.getAttribute('aria-label'));
  await pont.scrollIntoViewIfNeeded(); await sleep(500);
  await pont.screenshot({ path: L.DIR + '/out_8401/r03_pontius_card.png' });
  const tallyBox = seat.page.locator('[aria-label="Illumination questions"]').first();
  await tallyBox.scrollIntoViewIfNeeded(); await sleep(400);
  await tallyBox.screenshot({ path: L.DIR + '/out_8401/r04_tally.png' });
  console.log('tally text:', (await tallyBox.innerText()).replace(/\n+/g, ' | '));
  // End Assignment, first press only, before Add
  await seat.page.getByRole('button', { name: /^Roster$/i }).first().click(); await sleep(1500);
  const end = seat.page.getByRole('button', { name: /End Assignment/i }).first();
  await end.scrollIntoViewIfNeeded(); await end.click(); await sleep(1000);
  await shot(seat.page, 'r05_end_armed_before_add');
  const confirmTxt = await seat.page.evaluate(() => document.body.innerText.match(/[^\n]*(will be lost|clears|Yes, end it)[^\n]*/g));
  console.log('END confirm (before add):', JSON.stringify(confirmTxt));
  await seat.page.keyboard.press('Escape'); await sleep(800);
  // Add Illumination
  await seat.page.getByRole('button', { name: /^Circle$/i }).first().click(); await sleep(2000);
  const add = seat.page.getByRole('button', { name: /^Add \d+ Illumination$/ }).first();
  console.log('add label:', await add.innerText());
  let dialogSeen = null; seat.page.on('dialog', async (d) => { dialogSeen = d.message(); await d.dismiss(); });
  await add.click(); await sleep(1500);
  console.log('dialog on Add:', dialogSeen);
  await tallyBox.screenshot({ path: L.DIR + '/out_8401/r06_tally_added.png' });
  console.log('tally after add:', (await tallyBox.innerText()).replace(/\n+/g, ' | '));
  await seat.page.getByRole('button', { name: /^Roster$/i }).first().click(); await sleep(1500);
  const end2 = seat.page.getByRole('button', { name: /End Assignment/i }).first();
  await end2.scrollIntoViewIfNeeded(); await end2.click(); await sleep(1000);
  await shot(seat.page, 'r07_end_armed_after_add');
  const confirm2 = await seat.page.evaluate(() => document.body.innerText.match(/[^\n]*(will be lost|clear|Yes, end it|report)[^\n]*/gi));
  console.log('END confirm (after add):', JSON.stringify(confirm2));
  console.log('errors:', JSON.stringify(seat.errors.slice(0, 5)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
