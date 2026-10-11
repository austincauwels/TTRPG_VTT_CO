const L = require('./r8406_lib'); const H = require('./r8406_h'); const { sleep, shot } = L;
(async () => { const b = await L.launch(); L.DEVICES.l629 = { viewport: { width: Number(process.argv[2] || 1366), height: Number(process.argv[3] || 629) } };
  const s = await L.openSeat(b, 'l629', { store: await L.storeFor('fd', 'fd', 'F') }); await sleep(5000);
  if (await s.page.locator('[data-keep-die]').count()) { await H.keep(s.page, 'regular'); await sleep(2000); }
  await H.rollBtn(s.page, 'Control').click(); await sleep(4000);
  const pre = await s.page.evaluate(() => { const e = [...document.querySelectorAll('[data-desk="log"] *')].find(e => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return e ? { st: Math.round(e.scrollTop), ch: e.clientHeight, sh: e.scrollHeight } : null; }); console.log('pre', JSON.stringify(pre));
  const d = s.page.locator('[data-desk="dice"]'); const bb = await d.boundingBox();
  await s.page.mouse.move(bb.x + bb.width / 2, bb.y + 100); for (let i = 0; i < 6; i++) { await s.page.mouse.wheel(0, 300); await sleep(150); }
  await sleep(400);
  const info = await s.page.evaluate(() => { const sc = [...document.querySelectorAll('[data-desk="log"] *')].filter(e => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => ({ st: Math.round(e.scrollTop), ch: e.clientHeight, sh: e.scrollHeight, bottom: Math.round(e.getBoundingClientRect().bottom) })); const last = [...document.querySelectorAll('[data-desk="log"] p')].pop().getBoundingClientRect(); const l = document.querySelector('[data-desk="log"]').getBoundingClientRect(); const p = document.querySelector('[data-desk="passnotes"]').getBoundingClientRect(); return { sc, last: [Math.round(last.top), Math.round(last.bottom)], log: [Math.round(l.top), Math.round(l.bottom)], pass: [Math.round(p.top), Math.round(p.bottom)], vh: innerHeight }; });
  console.log(JSON.stringify(info)); await shot(s.page, 'h_log_' + (process.argv[3] || 629) + '_dice_scrolled'); await b.close(); })();
