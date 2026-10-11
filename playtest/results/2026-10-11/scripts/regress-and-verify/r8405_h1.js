// Cass (laptop 1366x768, keyboard): Born in the Shadows preview; own Bleed mark with Undo then Death Defy
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const card = (p) => p.$$eval('[role=alertdialog]', ds => ds.map(d => d.innerText.replace(/\s+/g, ' ')));
const active = (p) => p.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName} ${e.getAttribute('aria-label') || e.innerText?.slice(0, 40)}` : null; });
const notes = (p) => p.$$eval('.trauma-record p', ps => ps.map(x => x.innerText.replace(/\s+/g, ' ')).filter(Boolean));
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.c.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const c = await L.openSeat(b, 'laptop', { store: await L.storeFor('pc', 'c', 'S') });
  await sleep(4500);
  const p = c.page;
  const hide = H.rollBtn(p, 'Hide');
  await hide.scrollIntoViewIfNeeded();
  console.log('Hide before chip', await hide.getAttribute('aria-label'), '|', await hide.innerText());
  const chip = p.locator('.mod-chip', { hasText: 'Born in the Shadows' });
  console.log('chip count', await chip.count());
  await chip.click();
  await sleep(300);
  console.log('Hide with chip', await hide.getAttribute('aria-label'), '|', (await hide.innerText()).replace(/\s+/g, ' '));
  await L.shot(p, 'h01_hide_chip', { clip: { x: 0, y: Math.max(0, (await hide.boundingBox()).y - 120), width: 1366, height: 260 } });
  await p.locator('button[aria-label="Spend one more Cunning for +1d"]').click();
  await sleep(300);
  console.log('Hide with chip +1 Cunning', await hide.getAttribute('aria-label'), '|', (await hide.innerText()).replace(/\s+/g, ' '));
  await L.shot(p, 'h02_hide_chip_spend', { clip: { x: 0, y: Math.max(0, (await hide.boundingBox()).y - 120), width: 1366, height: 260 } });
  await hide.click();
  await sleep(2500);
  console.log('slip', await H.slip(p), 'keeps', await H.keepLabels(p));
  if ((await H.keepLabels(p)).length) { await H.keep(p, 'gilded'); await sleep(2000); }
  // Own Bleed mark by keyboard
  const take = p.locator('button[aria-label="Take Bleed mark 1 of 3"]');
  await take.scrollIntoViewIfNeeded();
  await take.focus();
  await p.keyboard.press('Enter');
  await sleep(700);
  console.log('Undo phase', await L.trackState(p, 'Bleed'), await notes(p));
  await L.shot(p, 'h03_undo');
  await sleep(6000);
  console.log('Offer phase', await L.trackState(p, 'Bleed'), await notes(p));
  console.log('card', await card(p), 'focus', await active(p));
  await L.shot(p, 'h04_defy');
  await p.keyboard.press('Escape');
  await sleep(500);
  console.log('after Escape: card', (await card(p)).length, 'focus', await active(p));
  await p.keyboard.press('Tab');
  console.log('after Tab focus', await active(p));
  await p.locator('[role=alertdialog] button', { hasText: 'Take the mark' }).focus();
  await p.keyboard.press('Enter');
  const seen = [];
  for (let i = 0; i < 10; i++) { seen.push((await L.trackState(p, 'Bleed'))?.boxes); await sleep(100); }
  console.log('boxes right after Take the mark', seen.join(' '));
  await sleep(1500);
  console.log('Landed', await L.trackState(p, 'Bleed'), await notes(p), 'focus', await active(p));
  console.log('LK tail', (await H.log(lk.page)).slice(-3));
  await L.shot(p, 'h05_landed');
  console.log(c.errors);
  await b.close();
})();
