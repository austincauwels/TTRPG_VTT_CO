// Second advance: Dev takes Great Wards (role) + split drive on tablet; Role/Specialty tabs; LK copy. Bram phone button overlap; Iris Escape focus.
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
(async () => {
  const b = await L.launch();
  const lkws = await L.wsOpen(state.camps.S.code, state.users.lk.token);
  sql(`update circles set illumination=12 where id=${state.camps.S.circleId}`);
  await sleep(500);
  if (process.env.ADV) lkws.send('gm_advance_circle', { circle_id: state.camps.S.circleId, circle_ability: 'Nobody Left Behind', role: 'GM' });
  await sleep(1500);
  console.log('picks', sql(`select name, advancement_picks from characters where campaign_id=${state.camps.S.id}`));
  const dv = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  const br = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  const ir = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  // Dev
  const d = dv.page.getByRole('dialog');
  if (await dv.page.locator('#advancement-title').count()) {
  await d.getByText('Take a new ability').tap(); await sleep(300);
  const opts = await dv.page.locator('#adv-new-ability optgroup').evaluateAll(gs => gs.map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.value).join(',')));
  console.log('ability options', JSON.stringify(opts));
  await dv.page.locator('#adv-new-ability').selectOption('Great Wards');
  await d.getByText('Add 2 drive points').tap(); await sleep(300);
  await d.getByRole('button', { name: /^nerve/i }).tap(); await d.getByRole('button', { name: /^cunning/i }).tap();
  await L.shot(dv.page, 'c01_dev_picks');
  await d.getByRole('button', { name: /Confirm Advancement/ }).tap();
  await sleep(2500);
  await L.shot(dv.page, 'c02_dev_applied');
  await dv.page.getByRole('button', { name: /^Close$/ }).tap();
  await sleep(800);
  }
  for (const t of ['Role ability', 'Specialty ability']) {
    await dv.page.getByRole('button', { name: new RegExp('^' + t + '$', 'i') }).first().tap();
    await sleep(500);
    const panel = await dv.page.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => /^(WEIRD|OCCULTIST) ABILITY$/i.test(e.textContent.trim()) && e.children.length === 0); return h ? h.parentElement.innerText : '?'; });
    console.log('DEV TAB', t, '=>', panel.replace(/\s+/g, ' ').slice(0, 400));
    await L.shot(dv.page, `c03_dev_${t.split(' ')[0]}`);
  }
  console.log('dev abilities in DB', sql(`select role_ability, specialty_ability from characters where id=${state.chars.c.id}`));
  console.log('LOG lines', JSON.stringify(await ir.page.evaluate(() => [...document.querySelectorAll('*')].filter(e => /has advanced/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()))));
  // Iris Escape focus
  await sleep(500);
  console.log('iris dialog?', await ir.page.locator('#advancement-title').count());
  await ir.page.keyboard.press('Escape'); await sleep(600);
  console.log('iris focus after Escape:', await ir.page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.textContent || '').slice(0, 40)));
  await ir.page.keyboard.press('Tab'); await sleep(200);
  console.log('iris focus after Tab:', await ir.page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').slice(0, 40)));
  // Bram phone: Later, scroll through, look for overlap
  await br.page.getByRole('button', { name: /^Later$/ }).tap(); await sleep(600);
  for (const y of [900, 1500, 2200]) { await br.page.evaluate((yy) => window.scrollTo(0, yy), y); await sleep(400); await L.shot(br.page, `c04_bram_scroll_${y}`); }
  const covered = await br.page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Choose advancements/.test(b.textContent));
    const r = btn.getBoundingClientRect();
    const hits = [];
    for (const [x, y] of [[r.left + 10, r.top + 5], [r.right - 10, r.top + 5], [r.left + r.width / 2, r.bottom - 5]]) {
      btn.style.visibility = 'hidden'; const el = document.elementFromPoint(x, y); btn.style.visibility = '';
      hits.push(el ? el.tagName + ':' + (el.textContent || '').trim().slice(0, 30) : null);
    }
    return { box: [r.left, r.top, r.width, r.height], hits };
  });
  console.log('bram covered', JSON.stringify(covered));
  console.log('errors', dv.errors, br.errors, ir.errors);
  lkws.close();
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
