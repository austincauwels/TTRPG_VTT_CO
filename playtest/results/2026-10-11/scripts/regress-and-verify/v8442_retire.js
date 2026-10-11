const L = require('./v8442_lib');
const { sleep, shot, state } = L;
const ledgerText = async (page) => (await page.locator('body').innerText());
(async () => {
  const browser = await L.launch();
  const cass = await L.openSeat(browser, 'laptop');
  await L.signIn(cass.page, 'cass');
  await shot(cass.page, 'ret_00_cass_hub_before');
  const tomeBefore = await cass.page.getByRole('button', { name: /Case Ledger/ }).first().innerText().catch(() => '');
  console.log('tome before:', tomeBefore.replace(/\n/g, ' | '), '| aria:', await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label'));
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await shot(cass.page, 'ret_01_cass_ledger_before');
  await cass.page.getByRole('button', { name: /Close book/i }).first().click(); await sleep(800);

  const gm = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'B') });
  await sleep(4000);
  await gm.page.getByRole('button', { name: /Retire campaign/i }).first().click(); await sleep(600);
  await shot(gm.page, 'ret_02_gm_armed');
  console.log('armed hint:', (await gm.page.locator('body').innerText()).match(/Press again to retire[^\n]*/g));
  await gm.page.getByRole('button', { name: /Yes, retire campaign/i }).first().click(); await sleep(3000);
  await shot(gm.page, 'ret_03_gm_after');
  console.log('DB:', L.sql(`select c.name,c.status,c.campaign_id from characters c where campaign_id=${state.camps.B.id} order by id`));

  // cass did not reload
  await sleep(2000);
  console.log('tome after (no reload):', await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label'), '|', (await cass.page.getByRole('button', { name: /Case Ledger/ }).first().innerText()).replace(/\n/g, ' | '));
  await shot(cass.page, 'ret_04_cass_hub_noreload');
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await shot(cass.page, 'ret_05_cass_ledger_noreload');
  console.log('no-reload ledger has Mina?', (await ledgerText(cass.page)).includes('Mina Vale'));
  // Press Play on Mina
  const row = cass.page.locator('li, div').filter({ hasText: /^Mina Vale/ }).first();
  await cass.page.getByText('Mina Vale').first().click().catch((e) => console.log('click mina', e.message));
  await sleep(1500);
  const play = cass.page.getByRole('button', { name: /Play/ });
  console.log('play buttons', await play.count());
  await shot(cass.page, 'ret_06_cass_mina_clicked');
  const afterClick = await ledgerText(cass.page);
  console.log('after click mina text:', afterClick.slice(0, 600).replace(/\n/g, ' | '));
  await sleep(3000);
  await shot(cass.page, 'ret_07_cass_after_play');
  console.log('stage after play:', await cass.page.evaluate(() => JSON.parse(localStorage.getItem('candela-vtt-storage') || '{}').state?.stage));
  console.log('body after play:', (await ledgerText(cass.page)).slice(0, 500).replace(/\n/g, ' | '));
  console.log('cass errors', cass.errors, 'frames', L.parsed(cass).map((x) => x.m.type).slice(-10));
  // reload
  await cass.page.goto(L.SITE + '/'); await sleep(4000);
  await shot(cass.page, 'ret_08_cass_hub_reload');
  console.log('tome after reload:', await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label'));
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await shot(cass.page, 'ret_09_cass_ledger_reload');
  console.log('reload ledger has Mina?', (await ledgerText(cass.page)).includes('Mina Vale'));
  // GM hub
  await gm.page.getByRole('button', { name: /Back to chapter hub/i }).first().click().catch(() => {}); await sleep(2500);
  await gm.page.getByRole('button', { name: /Case Ledger/ }).first().click().catch((e) => console.log(e.message)); await sleep(1200);
  await shot(gm.page, 'ret_10_gm_ledger');
  const gt = await ledgerText(gm.page);
  console.log('GM ledger has Side Case?', gt.includes('Side Case'), 'Main Watch?', gt.includes('The Main Watch'), 'retired mention?', /retired/i.test(gt));
  // API: what does the user list return for Mina
  const inv = await L.api('GET', `/api/investigators?user_id=${state.users.cass.userId}`, state.users.cass.token).catch((e) => e.message);
  console.log('API investigators:', JSON.stringify(Array.isArray(inv) ? inv.map((c) => [c.name, c.status]) : inv).slice(0, 400));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
