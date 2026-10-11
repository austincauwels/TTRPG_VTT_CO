// Jonah's held burn reroll (from an earlier check): keep it and read the burn line; then Behind Me across a reload;
// Edda taps a Premonitions card whose mark Jonah already took
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const card = (p) => p.$$eval('[role=alertdialog]', ds => ds.map(d => d.innerText.replace(/\s+/g, ' ')));
(async () => {
  const b = await L.launch();
  for (const k of ['a', 'b', 'd']) L.resetChar(state.chars[k].id, k === 'a' ? { intuition_current: 5 } : {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  const d = await L.openSeat(b, 'tablet', { store: await L.storeFor('pd', 'd', 'S') });
  await sleep(4500);
  const n0 = (await H.log(lk.page)).length;
  const keeps = await j.page.$$eval('button[aria-label^="Keep the"]', bs => bs.map(b => b.getAttribute('aria-label')));
  console.log('Jonah held keeps', keeps);
  if (keeps.length) { await j.page.locator('button[aria-label^="Keep the gilded"]').tap(); await sleep(2500); }
  console.log('LK lines after keeping the burn reroll', (await H.log(lk.page)).slice(n0));
  await L.shot(lk.page, 'g06_lk_burn_line', { clip: { x: 1100, y: 380, width: 340, height: 360 } });
  // Behind Me across a reload
  await a.page.locator('button[aria-label="Take Body mark 1 of 3"]').click();
  await sleep(7000);
  console.log('Jonah card before reload', await card(j.page));
  await j.page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(5000);
  console.log('Jonah card after reload', await card(j.page));
  await L.shot(j.page, 'g07_jonah_after_reload');
  // the server still takes it
  H.inj(j, 'intercept_mark', { ability: 'Behind Me', target_character_id: state.chars.a.id, mark_type: 'body' });
  await sleep(2500);
  console.log('server after reload intercept: Imogen', H.char(state.chars.a.id).body_marks, 'Jonah', H.char(state.chars.b.id).body_marks);
  // Edda's Premonitions card for the mark Jonah took
  console.log('Edda card', await card(d.page));
  const ep = d.page.locator('[role=alertdialog] button', { hasText: 'Intercept' });
  if (await ep.count()) { await ep.tap(); await sleep(2000); }
  console.log('Edda after tap: rejections', L.framesOf(d, 'action_rejected').map(f => f.m.payload.detail), 'cards', await card(d.page), 'alerts', await d.page.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  await L.shot(d.page, 'g08_edda_after_tap');
  console.log('LK new lines', (await H.log(lk.page)).slice(n0));
  await b.close();
})();
