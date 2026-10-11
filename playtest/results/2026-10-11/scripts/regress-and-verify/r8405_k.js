// Tablet (Edda): gilded choice wording at full drive; log line dice for others
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.d.id, { intuition_current: 5 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const d = await L.openSeat(b, 'tablet', { store: await L.storeFor('pd', 'd', 'S') });
  await sleep(4500);
  const p = d.page;
  let labels = [];
  for (let i = 0; i < 6; i++) {
    await H.roll(p, 'Sense', { tap: true, wait: 2500 });
    labels = await p.$$eval('[aria-label^="Keep the"]', bs => bs.map(b => b.getAttribute('aria-label')));
    if (labels.length) break;
  }
  console.log('keep labels', [...new Set(labels)], 'intuition', H.char(state.chars.d.id).intuition_current, '/5');
  await L.shot(p, 'k01_tablet_keep');
  const g = p.locator('button[aria-label^="Keep the gilded"]').first();
  if (await g.count()) await g.tap(); else await H.keep(p, 'gilded');
  await sleep(2500);
  console.log('slip', await H.slip(p), 'intuition after', H.char(state.chars.d.id).intuition_current);
  console.log('LK tail', (await H.log(lk.page)).slice(-1));
  await L.shot(p, 'k02_tablet_kept');
  await b.close();
})();
