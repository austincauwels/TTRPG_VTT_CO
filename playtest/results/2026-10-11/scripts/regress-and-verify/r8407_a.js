// Advancement on the tablet (Dev), LK at 1440x900, Iris at 1366: log wording, gild picker, role ability tab, dialogs explain
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
const logText = (page) => page.evaluate(() => [...document.querySelectorAll('*')].filter(e => /has advanced/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()));
(async () => {
  const b = await L.launch();
  sql(`update circles set illumination=12 where id=${state.camps.S.circleId}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const dv = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  const ir = await L.openSeat(b, 'laptop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4000);
  await lk.page.getByRole('button', { name: /^Circle$/i }).first().click();
  await sleep(1500);
  await lk.page.getByRole('button', { name: /Track full/ }).click();
  await sleep(800);
  await L.shot(lk.page, 'a01_lk_advance_dialog');
  // the i
  const info = lk.page.getByRole('button', { name: /What advancing does/ });
  console.log('LK info button count', await info.count());
  if (await info.count()) { await info.first().click(); await sleep(400); await L.shot(lk.page, 'a02_lk_advance_info'); await info.first().click(); await sleep(300); await lk.page.locator('#gm-advance-title').click(); await sleep(300); }
  await lk.page.getByLabel(/Stamina Training/).check().catch(async () => { await lk.page.locator('input[value="Stamina Training"]').check(); });
  await lk.page.getByRole('button', { name: 'Advance the circle', exact: true }).click();
  await sleep(2500);
  await L.shot(lk.page, 'a03_lk_after_advance');
  await L.shot(dv.page, 'a04_dev_dialog');
  // Dev: gild an additional action
  const dlg = dv.page.getByRole('dialog');
  await dlg.getByText('Gild an additional action', { exact: false }).first().click();
  await sleep(500);
  const gildBtns = await dv.page.evaluate(() => {
    const g = [...document.querySelectorAll('[role=dialog] [role=group]')][0];
    return [...g.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled, w: Math.round(r.width), h: Math.round(r.height), fs: getComputedStyle(b).fontSize }; });
  });
  console.log('GILD', JSON.stringify(gildBtns));
  await L.shot(dv.page, 'a05_dev_gild_open');
  await dv.page.getByRole('button', { name: /^Read/ }).first().tap();
  await sleep(300);
  console.log('Read pressed:', await dv.page.getByRole('button', { name: /^Read/ }).first().getAttribute('aria-pressed'));
  await dlg.getByText('Add 1 action point', { exact: false }).first().click().catch(e => console.log('no add action label', e.message));
  await sleep(500);
  const addBtns = await dv.page.evaluate(() => {
    const gs = [...document.querySelectorAll('[role=dialog] [role=group]')];
    return gs.map(g => [...g.querySelectorAll('button')].map(b => `${b.getAttribute('aria-label') || b.textContent}|${b.getAttribute('aria-pressed')}|${b.disabled}`));
  });
  console.log('GROUPS', JSON.stringify(addBtns));
  // Focus in the add-action group (second group)
  const groups = dv.page.locator('[role=dialog] [role=group]');
  const n = await groups.count();
  console.log('group count', n);
  for (let i = 0; i < n; i++) {
    const btn = groups.nth(i).getByRole('button', { name: /^Focus, rating/ });
    if (await btn.count()) { await btn.tap(); console.log('tapped Focus in group', i); }
  }
  await sleep(300);
  await L.shot(dv.page, 'a06_dev_picks_ready', { fullPage: false });
  await dv.page.getByRole('button', { name: /Confirm Advancement/ }).tap();
  await sleep(2500);
  await L.shot(dv.page, 'a07_dev_applied');
  console.log('applied dialog text:', await dv.page.getByRole('dialog').innerText().catch(() => 'none'));
  await dv.page.getByRole('button', { name: /^Close$/ }).click().catch(() => {});
  await sleep(1000);
  for (const [nm, s] of [['dev', dv], ['iris', ir], ['lk', lk]]) console.log('LOG', nm, JSON.stringify(await logText(s.page)));
  await L.shot(ir.page, 'a08_iris_log');
  await L.shot(lk.page, 'a09_lk_log');
  const row = sql(`select sneak, read, gilded_sneak, gilded_read, advancement_picks from characters where id=${state.chars.c.id}`);
  console.log('DB dev sneak,read,gilded_sneak,gilded_read,picks', row);
  console.log('errors', dv.errors, lk.errors, ir.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
