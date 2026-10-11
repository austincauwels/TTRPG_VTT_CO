// Phone (Jonah): gilded roll, reload during the choice, double reload, second tab
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const rowState = (p) => p.$$eval('button[data-roll-row]', bs => bs.map(b => b.getAttribute('aria-disabled')).join(','));
const barKeeps = (p) => p.$$eval('button[aria-label^="Keep the"]', bs => bs.map(b => b.getAttribute('aria-label')));
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.b.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = j.page;
  const logs0 = { lk: (await H.log(lk.page)).length, a: (await H.log(a.page)).length, j: (await H.log(p)).length };
  await p.locator('button[aria-label="Spend one more Nerve for +1d"]').tap();
  await sleep(300);
  await H.roll(p, 'Control', { tap: true, wait: 2500 });
  console.log('rows', await rowState(p), 'bar keeps', await barKeeps(p));
  console.log('nerve after roll', H.char(state.chars.b.id).nerve_current);
  await L.shot(p, 'd01_phone_keep_bar');
  const dice1 = L.framesOf(j, 'roll_result').slice(-1)[0]?.m.payload.roll.dice;
  // Reload before keeping
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  const dice2 = L.framesOf(j, 'roll_result').slice(-1)[0]?.m.payload.roll.dice;
  console.log('same dice after reload', JSON.stringify(dice1) === JSON.stringify(dice2), JSON.stringify(dice2));
  console.log('after reload rows', await rowState(p), 'bar keeps', await barKeeps(p));
  await L.shot(p, 'd02_after_reload');
  // A roll attempt now must not go out
  const outBefore = L.framesOf(j, 'roll', 'out').length;
  await H.roll(p, 'Strike', { tap: true, wait: 1500 }).catch(e => console.log('strike tap err', e.message));
  console.log('roll frames sent while held', L.framesOf(j, 'roll', 'out').length - outBefore);
  // Second reload
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  console.log('after 2nd reload rows', await rowState(p), 'bar keeps', await barKeeps(p));
  console.log('logs (no line yet expected)', { lk: (await H.log(lk.page)).length - logs0.lk, a: (await H.log(a.page)).length - logs0.a });
  // Second tab of the same player
  const j2 = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  console.log('tab2 rows', await rowState(j2.page), 'bar keeps', await barKeeps(j2.page));
  await L.shot(j2.page, 'd03_tab2');
  await L.shot(p, 'd04_tab1_after_tab2');
  console.log('tab1 rows', await rowState(p), 'bar keeps', await barKeeps(p));
  // Keep the gilded die in tab 2
  const k = j2.page.locator('button[aria-label^="Keep the gilded"]').first();
  if (await k.count()) { await k.tap(); } else { console.log('no gilded keep on tab2'); }
  await sleep(3000);
  console.log('tab2 slip', await H.slip(j2.page));
  await L.shot(j2.page, 'd05_tab2_kept');
  const lkLog = await H.log(lk.page), aLog = await H.log(a.page);
  console.log('LK new lines', lkLog.slice(logs0.lk));
  console.log('A new lines', aLog.slice(logs0.a));
  console.log('nerve after keep', H.char(state.chars.b.id).nerve_current);
  // Tab 1: try to keep the stale choice
  console.log('tab1 rows', await rowState(p), 'bar keeps', await barKeeps(p), 'conn frames', j.frames.filter(f => f.dir === 'close').map(f => f.msg));
  const k1 = p.locator('button[aria-label^="Keep the"]').first();
  if (await k1.count()) { await k1.tap().catch(e => console.log('tap1', e.message)); await sleep(2000); }
  console.log('tab1 after stale keep: alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)), 'slip', await H.slip(p));
  await L.shot(p, 'd06_tab1_stale');
  console.log('LK lines total new', (await H.log(lk.page)).slice(logs0.lk).length);
  // Reload tab 2 after the keep: nothing held
  await j2.page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  console.log('tab2 after keep+reload rows', await rowState(j2.page), 'bar keeps', await barKeeps(j2.page));
  console.log('errors', j.errors, j2.errors);
  await b.close();
})();
