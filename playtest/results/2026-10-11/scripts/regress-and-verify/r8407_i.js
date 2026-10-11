// Desktop 1920: a mark's Undo window, screen-reader names
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const names = (p) => p.evaluate(() => {
  const g = [...document.querySelectorAll('[role=group]')].find(e => /^Body marks:/.test(e.getAttribute('aria-label') || ''));
  return { group: g?.getAttribute('aria-label'), buttons: [...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || '').filter(n => /Body/.test(n)) };
});
(async () => {
  sql(`update characters set body_marks=0, brain_marks=0, bleed_marks=0 where id=${state.chars.b.id}`);
  const b = await L.launch();
  const s = await L.openSeat(b, 'desktop', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = s.page;
  if (await p.locator('#advancement-title').count()) { await p.keyboard.press('Escape'); await sleep(400); }
  console.log('before', JSON.stringify(await names(p)));
  await p.getByRole('button', { name: 'Take Body mark 1 of 3' }).click();
  await sleep(600);
  console.log('during undo', JSON.stringify(await names(p)));
  await L.shot(p, 'i01_undo_window');
  await p.getByRole('button', { name: 'Take Body mark 2 of 3' }).click().catch(e => console.log('second', e.message.slice(0, 80)));
  await sleep(500);
  console.log('two pending', JSON.stringify(await names(p)));
  await L.shot(p, 'i02_two_pending');
  await sleep(7000);
  console.log('after undo window', JSON.stringify(await names(p)), 'DB', sql(`select body_marks from characters where id=${state.chars.b.id}`));
  await L.shot(p, 'i03_after');
  for (let k = 0; k < 4; k++) { await sleep(3000); console.log('later +' + (k + 1) * 3 + 's', JSON.stringify(await names(p)), 'DB', sql(`select body_marks from characters where id=${state.chars.b.id}`), await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => /Undo|held|mark:/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()).slice(0, 4))); }
  await L.shot(p, 'i04_later');
  console.log('errors', s.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
