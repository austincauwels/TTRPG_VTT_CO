const L = require('./lib'); const { sleep, shot, state } = L;
const report = [];
const note = (seat, screen) => { report.push({ screen, device: seat.device, errors: seat.errors.slice() }); seat.errors.length = 0; };
const vis = async (p, re) => { const l = p.getByRole('button', { name: re }).first(); return (await l.count()) ? l : null; };
(async () => {
  const b = await L.launch();
  // ===== phone: hub, creator, join, desk tabs (Tobias), formation (fb)
  const ph = await L.openSeat(b, 'phone'); const p = ph.page;
  await L.signIn(p, 'cass'); await shot(p, 's01_phone_hub'); note(ph, 'hub');
  await p.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200); await shot(p, 's02_phone_ledger'); note(ph, 'case ledger');
  const join = await vis(p, /Join a campaign/i);
  if (join) { await join.click(); await sleep(1500); await shot(p, 's03_phone_join'); note(ph, 'join'); await p.goBack().catch(() => {}); await sleep(1500); }
  await p.goto(L.SITE + '/'); await sleep(3000);
  const nc = p.getByText(/New character/i).first();
  if (await nc.count()) {
    await nc.click(); await sleep(2500); await shot(p, 's04_phone_creator_1'); note(ph, 'creator step 1');
    // walk: pick the card, then any Next/Continue
    for (let i = 0; i < 6; i++) {
      const btn = p.getByRole('button', { name: /^(Choose|Select|Next|Continue|Take this|Use this)/i }).first();
      if (!(await btn.count())) break;
      await btn.scrollIntoViewIfNeeded().catch(() => {}); await btn.click().catch(() => {}); await sleep(1200);
      await shot(p, `s05_phone_creator_walk_${i}`);
    }
    note(ph, 'creator walk');
  }
  await ph.ctx.close();
  const tb = await L.desk(b, 'phone', 'bram', 'tobias', 'S'); const q = tb.page;
  const dlg = q.getByRole('button', { name: /^Later/ }); if (await dlg.count()) await dlg.first().click();
  await shot(q, 's06_phone_desk_investigator'); note(tb, 'desk investigator');
  for (const tab of ['Circle', 'Notebook', 'Dice and log', 'Pass notes', 'From the Lightkeeper', 'Hourglass', 'Account', 'Investigator']) {
    try { await L.goTab(q, tab); await sleep(1200); await shot(q, `s07_phone_tab_${tab.replace(/\s/g, '_')}`, { fullPage: tab === 'Circle' }); }
    catch (e) { report.push({ screen: 'tab ' + tab, device: 'phone', errors: ['NAV ' + e.message.split('\n')[0]] }); await q.keyboard.press('Escape').catch(() => {}); }
    note(tb, 'desk tab ' + tab);
    await q.keyboard.press('Escape').catch(() => {});
  }
  // notebook: open an entry form if any
  await tb.ctx.close();
  const fb = await L.desk(b, 'phone', 'fb', 'fb', 'F');
  await shot(fb.page, 's08_phone_formation'); 
  await fb.page.locator('[role=dialog]').first().evaluate(d => { const sc = [d, ...d.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = sc.scrollHeight; }).catch(() => {});
  await sleep(600); await shot(fb.page, 's09_phone_formation_end'); note(fb, 'formation papers');
  await fb.ctx.close();
  // ===== LK laptops
  for (const dev of ['wide', 'laptop']) {
    const lk = await L.desk(b, dev, 'lk', null, 'S'); const P = lk.page;
    await shot(P, `s10_${dev}_lk_roster`); note(lk, 'lk roster');
    for (const sec of ['Circle', 'Notebook', 'Map', 'Roster']) { await L.goTab(P, sec); await sleep(1500); await shot(P, `s11_${dev}_lk_${sec}`); note(lk, 'lk ' + sec); }
    await P.getByRole('button', { name: /Open Tobias Crane's investigator sheet/ }).first().click().catch(() => {}); await sleep(2000);
    await shot(P, `s12_${dev}_lk_sheet`); note(lk, 'lk sheet');
    await P.getByRole('button', { name: /Open the circle file/i }).first().click().catch(() => {}); await sleep(1500);
    await shot(P, `s13_${dev}_lk_circlefile`); note(lk, 'lk circle file');
    await P.keyboard.press('Escape').catch(() => {});
    await P.getByRole('button', { name: /Back to chapter hub/i }).first().click(); await sleep(3000);
    await shot(P, `s14_${dev}_lk_hub`); note(lk, 'lk hub');
    await P.getByRole('button', { name: /Case Ledger|Lightkeeper Ledger/ }).first().click().catch(() => {}); await sleep(1200);
    await shot(P, `s15_${dev}_lk_ledger`); note(lk, 'lk ledger');
    await lk.ctx.close();
  }
  const fl = await L.desk(b, 'wide', 'lkf', null, 'F');
  await shot(fl.page, 's16_lkf_formation_desk'); note(fl, 'lk formation desk');
  await L.goTab(fl.page, 'Circle'); await sleep(1500); await shot(fl.page, 's17_lkf_circle'); note(fl, 'lk formation circle');
  // desktop hub for the tack
  const dh = await L.openSeat(b, 'desktop'); await L.signIn(dh.page, 'ada'); await shot(dh.page, 's18_desktop_hub'); 
  const tack = await dh.page.evaluate(() => document.querySelectorAll('.paper-tack, [class*="tack"]').length);
  console.log('tack elements', tack); note(dh, 'desktop hub');
  console.log(JSON.stringify(report.filter(r => r.errors.length), null, 1));
  console.log('screens', report.length);
  require('fs').writeFileSync('sweep.json', JSON.stringify(report, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
