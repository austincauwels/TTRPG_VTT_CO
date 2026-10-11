const L = require('./lib'); const { sleep, shot, state, api } = L;
(async () => {
  const lk = state.users.lk, cs = state.users.cass;
  const code = 'tc-' + Date.now().toString(36).slice(-4);
  const c = await api('POST', `/campaign/create?name=Third%20Case&code=${code}`, lk.token);
  const cid = c.id ?? c.campaign?.id ?? c.campaign_id;
  const nc = await api('POST', '/api/investigators/forge', cs.token, { ...require('./sheet').sheet('Criminal', 'Scout', 'Street Smarts'), name: 'Nell Ward', user_id: cs.userId });
  await api('POST', `/campaign/join?character_id=${nc.id}&code=${code}`, cs.token);
  await api('POST', `/campaign/approve/${nc.id}`, lk.token);
  const b = await L.launch();
  const s = await L.openSeat(b, 'laptop'); await L.signIn(s.page, 'cass');
  const tome = () => s.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label');
  console.log('before', await tome());
  await api('POST', `/campaign/${cid}/retire`, lk.token); await sleep(4000);
  console.log('after retire, no action', await tome());
  // simulate the tab coming back
  await s.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(2500);
  console.log('after visibilitychange', await tome());
  await s.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1500);
  const t = (await s.page.locator('body').innerText()).replace(/\s+/g, ' '); const i = t.indexOf('Nell Ward');
  console.log('book:', t.slice(Math.max(0, i - 120), i + 60));
  await s.page.getByRole('button', { name: /Close book/i }).first().click(); await sleep(800);
  console.log('after book', await tome());
  await shot(s.page, 'k07_cass_hub_after_retire2');
  console.log(s.errors); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
