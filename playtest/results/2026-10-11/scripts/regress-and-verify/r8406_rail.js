// left-rail-squeezed + log-squeezed-by-slip: four-member table, a dispatch and a running timer
const L = require('./r8406_lib');
const H = require('./r8406_h');
const { sleep, shot, state } = L;
const out = {};
const F = state.camps.F;
const railInfo = (page) => page.evaluate(() => {
  const circle = document.querySelector('[data-desk="circle"]');
  const rail = circle?.parentElement;
  const watch = document.querySelector('[data-desk="watch"]');
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  const cards = [...(circle?.querySelectorAll('p.font-serif.font-bold') || [])].map(p => ({ name: p.innerText.trim().slice(0, 14), ...r(p) }));
  const ticket = watch ? [...watch.querySelectorAll('*')].filter(x => /\d+:\d\d/.test(x.innerText || '') && x.children.length === 0).map(x => ({ t: x.innerText, ...r(x) })) : [];
  return { vh: innerHeight, docScroll: document.documentElement.scrollHeight - innerHeight,
    rail: rail ? { ...r(rail), st: Math.round(rail.scrollTop), scrollH: rail.scrollHeight, clientH: rail.clientHeight, oy: getComputedStyle(rail).overflowY } : null,
    circle: circle ? { ...r(circle), scrollH: circle.scrollHeight, clientH: circle.clientHeight } : null, cards, watch: r(watch), ticket };
});
const logInfo = (page) => page.evaluate(() => {
  const log = document.querySelector('[data-desk="log"]');
  const pn = document.querySelector('[data-desk="passnotes"]');
  if (!log) return null;
  const b = log.getBoundingClientRect(); const p = pn?.getBoundingClientRect();
  const lines = [...log.querySelectorAll('p')];
  const visible = lines.filter(l => { const x = l.getBoundingClientRect(); const top = Math.max(b.top, 0); const bot = Math.min(b.bottom, p ? p.top : innerHeight, innerHeight); return x.top >= top - 2 && x.bottom <= bot + 2; }).length;
  return { logTop: Math.round(b.top), logBottom: Math.round(b.bottom), logH: Math.round(b.height), passTop: p ? Math.round(p.top) : null, lines: lines.length, fullyVisible: visible };
});
(async () => {
  const lk = await L.wsOpen(F.code, state.users.lkf.token);
  lk.send('gm_update_circle', { circle_id: F.circleId, location: 'The drowned belfry at Saint Ives, east of the tide mill', atmosphere: 'Fog off the estuary; the bells ring at the wrong hours' });
  lk.send('gm_timer', { action: 'set', duration_ms: 1800000, circle_id: F.circleId });
  await sleep(300);
  lk.send('gm_timer', { action: 'start', circle_id: F.circleId });
  await sleep(300);
  lk.send('gm_timer', { action: 'show', circle_id: F.circleId });
  await sleep(800);
  const b = await L.launch();
  const sizes = [['laptop629', { viewport: { width: 1366, height: 629 } }], ['laptop', L.DEVICES.laptop], ['desk941', { viewport: { width: 1920, height: 941 } }], ['desk1080', { viewport: { width: 1920, height: 1080 } }]];
  for (const [name, dev] of sizes) {
    L.DEVICES[name] = dev;
    const s = await L.openSeat(b, name, { store: await L.storeFor('fd', 'fd', 'F') });
    await sleep(5000);
    if (await s.page.locator('[data-keep-die]').count()) { await H.keep(s.page, 'regular'); await sleep(2000); }
    const info = await railInfo(s.page);
    await shot(s.page, `h_${name}_01_rail`);
    // scroll the rail with the wheel over the circle box
    const c = s.page.locator('[data-desk="circle"]');
    const bb = await c.boundingBox();
    if (bb) { await s.page.mouse.move(bb.x + bb.width / 2, bb.y + Math.min(bb.height / 2, 40)); for (let i = 0; i < 8; i++) { await s.page.mouse.wheel(0, 300); await sleep(150); } }
    // and over the hourglass (the rail itself)
    const w = s.page.locator('[data-desk="watch"]');
    const wb = await w.boundingBox();
    if (wb) { await s.page.mouse.move(wb.x + wb.width / 2, Math.min(wb.y + 20, info.vh - 5)); for (let i = 0; i < 8; i++) { await s.page.mouse.wheel(0, 300); await sleep(150); } }
    await sleep(400);
    const after = await railInfo(s.page);
    await shot(s.page, `h_${name}_02_rail_scrolled`);
    // keyboard: Tab until focus lands in the watch, or 60 Tabs
    out[name] = { before: info, afterWheel: { rail: after.rail, ticket: after.ticket, cards: after.cards.map(x => `${x.name}:${x.top}-${x.bottom}`) } };
    if (name.startsWith('laptop')) {
      // log under a slip: lines from a pass note, then a roll
      for (let i = 0; i < 6; i++) lk.send('chat_message', { target: '@Circle', message: `Line ${i + 1} of the long note: the bell rope is frayed, mind the third landing, and keep your lanterns low.` });
      await sleep(1500);
      out[name].logBeforeRoll = await logInfo(s.page);
      await H.rollBtn(s.page, 'Control').click(); await sleep(4000);
      out[name].logAfterRoll = await logInfo(s.page);
      await shot(s.page, `h_${name}_03_log_after_roll`);
      out[name].diceCol = await s.page.evaluate(() => { const d = document.querySelector('[data-desk="dice"]'); return d ? { scrollH: d.scrollHeight, clientH: d.clientHeight, oy: getComputedStyle(d).overflowY } : null; });
    }
    await s.ctx.close();
  }
  // the Lightkeeper's 1440x900 log after her own roll
  const g = await L.openSeat(b, 'wide', { store: await L.storeFor('lkf', null, 'F') });
  await sleep(5000);
  await g.page.getByRole('button', { name: /^Roll \d+ di/i }).first().click(); await sleep(4000);
  out.lk = await logInfo(g.page);
  await shot(g.page, 'h_lk_log_after_roll');
  lk.close();
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
