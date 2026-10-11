const L = require('./v8442_lib');
const { sleep, shot, state } = L;
(async () => {
  const browser = await L.launch();
  const gm = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'J') });
  await sleep(4000);
  await shot(gm.page, 'join_01_desk');
  const body = await gm.page.locator('body').innerText();
  const u = state.users.cass.username;
  console.log('cass username on GM desk text?', body.includes(u), 'dev?', body.includes(state.users.dev.username));
  // texts around join request cards
  const idx = body.indexOf('Join');
  console.log(body.slice(Math.max(0, idx - 200), idx + 800));
  // page through requests
  for (let i = 0; i < 3; i++) {
    const t = await gm.page.locator('body').innerText();
    for (const n of ['Tess Arden', 'Wren Hale', 'Dev Marsh']) if (t.includes(n)) console.log('page', i, 'shows', n);
    await shot(gm.page, `join_02_req${i}`);
    const view = gm.page.getByRole('button', { name: /^View/ }).first();
    if (await view.count()) {
      await view.click(); await sleep(1500);
      await shot(gm.page, `join_03_view${i}`);
      const vt = await gm.page.locator('body').innerText();
      console.log('view', i, 'has cass username?', vt.includes(u), 'has "cass"?', /cass/i.test(vt.replace(/Cassandra/g, '')));
      await gm.page.keyboard.press('Escape'); await sleep(800);
    }
    const next = gm.page.getByRole('button', { name: /next/i }).first();
    if (await next.count()) { await next.click(); await sleep(800); } else break;
  }
  const btns = await gm.page.getByRole('button').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.innerText).trim()).filter(Boolean));
  console.log(JSON.stringify(btns));
  // player hub
  const p = await L.openSeat(browser, 'laptop');
  await L.signIn(p.page, 'cass');
  await shot(p.page, 'join_10_hub');
  await p.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1500);
  await shot(p.page, 'join_11_ledger');
  console.log('PLAYER LEDGER:', (await p.page.locator('body').innerText()).slice(0, 2500));
  console.log('errors', gm.errors, p.errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
