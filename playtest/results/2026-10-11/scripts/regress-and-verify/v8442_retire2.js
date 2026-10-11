const L = require('./v8442_lib');
const { sleep, shot, state } = L;
(async () => {
  const browser = await L.launch();
  const cass = await L.openSeat(browser, 'laptop');
  await L.signIn(cass.page, 'cass');
  console.log('tome after retire (fresh sign-in):', await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label'));
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await shot(cass.page, 'ret_09_cass_ledger_reload');
  const t = await cass.page.locator('body').innerText();
  console.log('ledger has Mina?', t.includes('Mina Vale'), '| retired section?', /retired/i.test(t));
  const gm = await L.openSeat(browser, 'wide');
  await L.signIn(gm.page, 'lk');
  await gm.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await shot(gm.page, 'ret_10_gm_ledger');
  const gt = await gm.page.locator('body').innerText();
  console.log('GM ledger: Side Case?', gt.includes('Side Case'), 'Main Watch?', gt.includes('The Main Watch'), 'Open Doors?', gt.includes('Open Doors'), 'retired?', /retired/i.test(gt));
  const inv = await L.api('GET', `/api/investigators?user_id=${state.users.cass.userId}`, state.users.cass.token).catch((e) => e.message);
  console.log('API investigators:', JSON.stringify(Array.isArray(inv) ? inv.map((c) => [c.name, c.status]) : inv).slice(0, 400));
  // Can Mina join another campaign?
  try { await L.api('POST', `/campaign/join?character_id=${state.chars.mina.id}&code=${state.camps.J.code}`, state.users.cass.token); console.log('mina join J: ok'); } catch (e) { console.log('mina join J:', e.message); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
