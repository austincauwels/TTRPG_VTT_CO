// Phone dialogs: Circle Advancement and A New Scar, at 390x844 and at the seat's visible 390x705
const L = require('./v8444_lib');
const { sleep, sql, state } = L;
const H = process.argv[2] ? Number(process.argv[2]) : 844;
L.DEVICES.ph = { viewport: { width: 390, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const geom = (page, sel) => page.evaluate((s) => {
  const dlg = [...document.querySelectorAll('[role=dialog], .fixed.inset-0 > div')].filter(d => d.offsetParent !== null || getComputedStyle(d).position === 'fixed').pop();
  const out = { vh: innerHeight };
  if (dlg) { const r = dlg.getBoundingClientRect(); out.dialog = [Math.round(r.top), Math.round(r.bottom)]; out.scrollH = dlg.scrollHeight; out.clientH = dlg.clientHeight; out.scrollbarW = dlg.offsetWidth - dlg.clientWidth; }
  out.buttons = [...document.querySelectorAll('button')].filter(b => s.test(b.innerText)).map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.replace(/\s+/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.top >= 0 && r.bottom <= innerHeight }; });
  return out;
}, sel);
(async () => {
  const b = await L.launch();
  const ch = state.chars.b;
  // Advancement: two picks waiting
  L.resetChar(ch.id, {});
  sql(`update characters set advancement_picks=2 where id=${ch.id}`);
  const br = await L.openSeat(b, 'ph', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  console.log('ADV first view', JSON.stringify(await geom(br.page, /Confirm Advancement|^Later/i)));
  await L.shot(br.page, `p${H}_01_adv_first`);
  // tick first option
  const boxes = br.page.locator('[role=dialog] input[type=checkbox]');
  console.log('adv checkboxes', await boxes.count());
  if (await boxes.count()) { await boxes.nth(0).tap(); await sleep(600); }
  console.log('ADV after tick 1', JSON.stringify(await geom(br.page, /Confirm Advancement|^Later/i)));
  if (await boxes.count()) { await boxes.nth(1).tap(); await sleep(600); }
  console.log('ADV after tick', JSON.stringify(await geom(br.page, /Confirm Advancement|^Later/i)));
  await L.shot(br.page, `p${H}_02_adv_ticked`);
  console.log('adv text', (await br.page.locator('[role=dialog]').first().innerText()).replace(/\s+/g, ' ').slice(0, 900));
  await br.ctx.close();
  // Scar: Dev Okafor (Weird), Body track 2 of 3, take a third on the own sheet
  const cc = state.chars.c;
  await L.drain('c', 'pc');
  L.resetChar(cc.id, { body_marks: 3 });
  const br2 = await L.openSeat(b, 'ph', { store: await L.storeFor('pc', 'c', 'S') });
  await sleep(5000);
  const add = br2.page.locator('button[aria-label^="Take a Body mark"]').first();
  console.log('label', await add.getAttribute('aria-label'));
  await add.scrollIntoViewIfNeeded(); await add.tap(); await sleep(2500);
  const take = br2.page.getByRole('button', { name: /^Take the mark/i });
  if (await take.count()) { await take.first().tap(); }
  await sleep(7000);
  console.log('SCAR first view', JSON.stringify(await geom(br2.page, /Decide later|Record scar/i)));
  await L.shot(br2.page, `p${H}_03_scar_first`);
  const radios = br2.page.locator('input[type=radio]');
  console.log('radios', await radios.count());
  if (await radios.count() > 10) { await radios.nth(0).tap().catch(() => {}); await radios.nth(16).tap().catch(() => {}); }
  const ta = br2.page.locator('[role=dialog] textarea, .fixed.inset-0 textarea').first();
  if (await ta.count()) { await ta.tap(); await ta.fill('My legs shake whenever I try to run from a debt; the guide I left on the ice walks with me.'); await sleep(500); }
  console.log('SCAR typed', JSON.stringify(await geom(br2.page, /Decide later|Record scar/i)));
  await L.shot(br2.page, `p${H}_04_scar_typed`);
  await br2.page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  console.log('errors', br2.errors.slice(0, 3));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
