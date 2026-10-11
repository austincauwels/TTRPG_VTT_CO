const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { sleep, shot, api, state } = L;
const hubStore = (who) => { const u = state.users[who]; return { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'HOME' }; };
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: hubStore('pj') }); await sleep(3500);
  const p = bram.page;
  await shot(p, 'p01_hub_phone');
  await p.getByRole('button', { name: /Case Ledger/ }).first().tap(); await sleep(1500);
  await p.getByRole('button', { name: /Join a campaign/i }).first().tap(); await sleep(800);
  await p.getByRole('button', { name: 'Handwriting' }).first().tap(); await sleep(1500);
  const list = p.getByRole('group');
  await list.getByRole('button', { name: 'Reenie Beanie' }).scrollIntoViewIfNeeded();
  await shot(p, 'p02_pens_reenie');
  await list.getByRole('button', { name: 'Moon Dance' }).scrollIntoViewIfNeeded();
  await shot(p, 'p03_pens_moon');
  const fam = await list.locator('button').evaluateAll(a => a.map(x => [x.textContent, document.fonts.check(`20px "${x.textContent}"`)]).filter(([, ok]) => !ok));
  console.log('pens not loaded:', JSON.stringify(fam));
  await list.getByRole('button', { name: 'Moon Dance' }).tap(); await sleep(300);
  await p.getByRole('textbox', { name: /Campaign code/i }).first().fill('DROWNED-BELL-' + state.stamp.toUpperCase());
  await p.getByRole('button', { name: /^Ask to join$/i }).first().tap(); await sleep(2500);
  console.log('after ask', L.sql(`select status, pen_font, campaign_id from characters where id=${state.chars.j.id}`), 'error text:', JSON.stringify(await p.locator('[role=alert]').allInnerTexts()));
  await shot(p, 'p04_waiting');
  // Close the book and wait on the hub
  await p.getByRole('button', { name: /Close book/i }).first().tap().catch(() => {}); await sleep(800);
  await api('POST', `/campaign/approve/${state.chars.j.id}`, state.users.lkd.token);
  const t = Date.now(); let got = null;
  for (let i = 0; i < 40 && !got; i++) { await sleep(1000); const n = (await p.locator('[role=status]').allInnerTexts()).find(x => /let /.test(x)); if (n) got = { n, after: Math.round((Date.now() - t) / 1000) }; }
  console.log('phone approval notice', JSON.stringify(got));
  await shot(p, 'p05_notice_phone');
  console.log('errors', bram.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
