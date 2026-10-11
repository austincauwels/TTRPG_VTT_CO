// lk-formation-status-thin and vote-tie-leading on the Lightkeeper's desk (1440x900)
const L = require('./r8402_lib');
const { sleep, sql } = L;
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lkf', null, 'F') });
  await sleep(6000);
  const p = lk.page;
  await p.screenshot({ path: `${L.DIR}/lk_desk.png` });
  const panel = p.locator('section,div', { hasText: /^CIRCLE FORMATION SO FAR|Circle formation so far/i }).first();
  const txt = await p.locator('body').innerText();
  const s = txt.search(/CIRCLE FORMATION SO FAR/i);
  console.log(txt.slice(s, s + 3500));
  const fin = txt.search(/FINALIZE THE CIRCLE/i);
  console.log('---- finalize:', JSON.stringify(txt.slice(fin - 50, fin + 300)));
  // expanded state of the panel toggle
  console.log('panel toggles', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')].map((b) => `${b.innerText.slice(0, 40)}=${b.getAttribute('aria-expanded')}`))));
  const head = p.getByText(/Circle formation so far/i).first();
  await head.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${L.DIR}/lk_formation_panel.png` });
  for (let i = 1; i <= 4; i++) { await p.mouse.wheel(0, 700); await sleep(400); await p.screenshot({ path: `${L.DIR}/lk_formation_panel_${i}.png` }); }
  console.log('errors', lk.errors.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
