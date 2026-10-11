// timer-status-stale: Reset after time's up, a reload, and a second tab
const L = require('./r8404_lib');
const { sql, sleep, shot, state } = L;
const statusText = (page) => page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((e) => e.textContent).filter(Boolean).join(' | ') || '(empty)');
const timerText = (page) => page.evaluate(() => [...document.querySelectorAll('[role=timer], input[aria-label="Timer minutes"]')].map((e) => e.tagName === 'INPUT' ? 'fields ' + e.value + ':' + document.querySelector('input[aria-label="Timer seconds"]').value : e.textContent).join(' | '));
(async () => {
  const b = await L.launch();
  const cid = state.camps.S.circleId;
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const bram = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  const P = lk.page;
  // make sure the timer is showing and cleared
  const sw = P.getByRole('switch', { name: 'Timer beside the hourglass' });
  if ((await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await sleep(800); }
  const clear = P.getByRole('button', { name: 'Clear the timer' });
  if (await clear.isEnabled()) { await clear.click(); await sleep(800); }
  await P.getByLabel('Timer seconds').fill('04'); await P.getByLabel('Timer seconds').press('Enter'); await sleep(700);
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(5500);
  console.log('at 0:00', { lk: await statusText(P), bram: await statusText(bram.page), lkTimer: await timerText(P), bramTimer: await timerText(bram.page) });
  await P.getByRole('button', { name: /Reset the timer/ }).click(); await sleep(2500);
  console.log('after Reset', { lk: await statusText(P), bram: await statusText(bram.page), lkTimer: await timerText(P), bramTimer: await timerText(bram.page) });
  await P.locator('[role=img][aria-label^="Tension"]').scrollIntoViewIfNeeded();
  await shot(P, 'T01_lk_after_reset');
  await shot(bram.page, 'T01_bram_after_reset');
  await sleep(10000);
  console.log('10s later', { lk: await statusText(P), bram: await statusText(bram.page) });
  // Second tab of the tablet opened after Reset
  const bram2 = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  console.log('fresh tab after Reset', await statusText(bram2.page), await timerText(bram2.page));
  // Start, then pause mid-way, then reset: and set a new duration: status?
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(1500);
  await P.getByRole('button', { name: 'Pause the timer' }).click(); await sleep(1000);
  console.log('paused', { lk: await statusText(P), bram: await statusText(bram.page) });
  await P.getByRole('button', { name: /Reset the timer/ }).click(); await sleep(1500);
  console.log('reset after pause', { lk: await statusText(P), bram: await statusText(bram.page) });
  await P.getByRole('button', { name: 'Clear the timer' }).click(); await sleep(1000);
  console.log('cleared', { lk: await statusText(P), bram: await statusText(bram.page) });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
