// Phone (Jonah): a gilded choice waits while another player rolls: the dot, the burn after the keep
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const dot = (p) => p.$eval('button[aria-label^="Dice and log"]', b => ({ label: b.getAttribute('aria-label'), dot: !!b.querySelector('[data-new-dot]') })).catch(() => null);
const barKeeps = (p) => p.$$eval('button[aria-label^="Keep the"]', bs => bs.map(b => b.getAttribute('aria-label')));
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.b.id, {}); L.resetChar(state.chars.a.id, { intuition_current: 5 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = j.page;
  let keeps = [];
  for (let i = 0; i < 12; i++) {
    await H.roll(p, 'Control', { tap: true, wait: 2200 });
    keeps = await barKeeps(p);
    // want: the regular die is a Failure or Mixed
    if (keeps.length === 2 && !/Success|Critical/.test(keeps.find(k => !/gilded/.test(k)) || 'Success')) break;
    if (keeps.length) { await p.locator('button[aria-label^="Keep the gilded"]').tap(); await sleep(2500); }
    L.resetChar(state.chars.b.id, {});
  }
  console.log('keeps', keeps);
  console.log('dot while choice waits', await dot(p));
  await L.shot(p, 'f01_choice_waits');
  await H.roll(a.page, 'Survey', { wait: 3000 });
  console.log('dot after Imogen rolled', await dot(p), 'bar keeps', await barKeeps(p));
  await L.shot(p, 'f02_after_other_roll');
  await p.locator('button[aria-label^="Keep the"]:not([aria-label*="gilded"])').tap();
  await sleep(2500);
  await p.locator('button[aria-label="Open the dice tray"]').tap().catch(() => console.log('no bar to open'));
  await sleep(800);
  console.log('AFTER after keep (sheet)', await H.after(p));
  await L.shot(p, 'f03_after_keep_sheet');
  const rej0 = L.framesOf(j, 'action_rejected').length;
  H.inj(j, 'burn_resistance', { action: 'control', drive_key: 'nerve' });
  await sleep(1500);
  console.log('server takes burn now?', L.framesOf(j, 'action_rejected').slice(rej0).map(f => f.m.payload.detail), 'resist spent', H.char(state.chars.b.id).nerve_resistance_spent);
  console.log('LK log tail', (await H.log(lk.page)).slice(-3));
  await b.close();
})();
