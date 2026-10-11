// suggest-button-offscreen-phone (formation papers at 390, 360 and 480) and the long-name roll slip
const L = require('./r8404_lib');
const { sql, sleep, shot, state } = L;
const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const b = await L.launch();
  for (const w of [390, 360, 480]) {
    const seat = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
    await seat.page.setViewportSize({ width: w, height: 844 });
    await sleep(5000);
    const P = seat.page;
    const nameInput = P.locator('input').filter({ hasNot: P.locator('[type=checkbox]') }).and(P.locator('[placeholder*="ame" i], [aria-label*="name" i]')).first();
    const found = await nameInput.count();
    log(`F${w} name input found`, found);
    if (!found) { await shot(P, `F${w}_papers_no_input`); log('inputs', await P.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.outerHTML.slice(0, 160)))); await seat.ctx.close(); continue; }
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.tap();
    await nameInput.fill('The Wardens of the Drowned Bell Tower');
    await sleep(500);
    const info = await P.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((x) => /^\s*Suggest\s*$/i.test(x.innerText));
      const r = btn ? btn.getBoundingClientRect() : null;
      const cnt = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^\s*\d+\s*\/\s*5\s*$/.test(e.textContent));
      const cr = cnt ? cnt.getBoundingClientRect() : null;
      const scrollers = [...document.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowX)).map((e) => `${e.tagName}.${(e.className || '').toString().slice(0, 40)} ${e.scrollWidth}/${e.clientWidth}`);
      return { vw: innerWidth, docSW: document.documentElement.scrollWidth, bodySW: document.body.scrollWidth, suggest: r && { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }, count: cnt && { text: cnt.textContent.trim(), left: Math.round(cr.left), right: Math.round(cr.right) }, sideScrollers: scrollers.slice(0, 6) };
    });
    log(`F${w} row`, info);
    await shot(P, `F${w}_name_row`);
    // Tap Suggest
    const sug = P.getByRole('button', { name: /^Suggest$/i }).first();
    if (await sug.count()) {
      await sug.tap(); await sleep(1500);
      log(`F${w} after Suggest`, await P.evaluate(() => ({ docSW: document.documentElement.scrollWidth, scrollX })));
      await shot(P, `F${w}_after_suggest`);
    }
    await seat.ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
