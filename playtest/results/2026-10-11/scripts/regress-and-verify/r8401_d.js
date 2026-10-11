// Phase D: a fresh LK device after Add; End Assignment with Bram's desk cut off; forms afterwards
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = {};
const repOf = (p) => p.locator('section[aria-labelledby="circle-report-title"]');
(async () => {
  const b = await L.launch();
  // fresh device for the LK
  const lk = await openDesk(b, 'wide', 'lk', null, 'R');
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const q = lk.page.locator('section[aria-label="Illumination questions"]');
  out.freshDeviceTally = (await q.innerText()).match(/Questions[\s\S]*?(Added[^\n]*|ADD[^\n]*)/)?.[0].replace(/\n+/g, ' | ');
  await shot(lk.page, 'd01_lk_fresh_device_after_add');
  // Bram's desk with a socket we can cut
  const store = await L.storeFor('bram', 'bram', 'R');
  const ctx = await b.newContext({ ...L.DEVICES.phone });
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('sd')) { localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); sessionStorage.setItem('sd', '1'); } } catch {} }, store);
  const bp = await ctx.newPage();
  let dropIn = false; const socks = [];
  await bp.routeWebSocket(/\/ws\//, (ws) => {
    const server = ws.connectToServer(); socks.push(ws);
    ws.onMessage(m => server.send(m));
    server.onMessage(m => { if (!dropIn) ws.send(m); });
    ws.onClose(() => server.close()); server.onClose(() => { try { ws.close(); } catch {} });
  });
  await bp.goto(L.SITE + '/'); await sleep(4000);
  await goTab(bp, 'Circle');
  out.bramBefore = await repOf(bp).innerText().then(t => t.slice(-120).replace(/\n+/g, ' | '));
  dropIn = true;
  // End Assignment on the LK desk (two presses)
  await lk.page.getByRole('button', { name: 'Roster', exact: true }).first().click().catch(() => {}); await sleep(1000);
  let end = lk.page.getByRole('button', { name: /End Assignment/ });
  out.endCount = await end.count();
  if (!out.endCount) { await lk.page.getByRole('button', { name: 'Map', exact: true }).first().click().catch(() => {}); await sleep(800); end = lk.page.getByRole('button', { name: /End Assignment/ }); }
  await end.first().click(); await sleep(500);
  await lk.page.getByRole('button', { name: /Yes, end it/ }).first().click(); await sleep(1500);
  out.dbAfterEnd = L.sql(`select reports_open, backstory_answers->'assignment', backstory_answers->'reports' from circles where id=${state.camps.R.circleId}`);
  // Bram's socket drops and comes back
  socks.at(-1).close({ code: 4000, reason: 'drop' });
  await sleep(500);
  dropIn = false;
  await sleep(8000);
  await repOf(bp).scrollIntoViewIfNeeded().catch(() => {});
  out.bramAfterReconnect = await repOf(bp).innerText().then(t => t.slice(-140).replace(/\n+/g, ' | '));
  await repOf(bp).screenshot({ path: L.DIR + '/out_8401/d02_bram_after_end_reconnect.png' });
  // LK opens reports for assignment 2
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1000);
  out.lkAfterEnd = (await q.innerText()).replace(/\n+/g, ' | ');
  await lk.page.getByRole('button', { name: 'Open reports' }).click(); await sleep(1500);
  out.bramAfterOpen = await repOf(bp).innerText().then(t => t.slice(-140).replace(/\n+/g, ' | '));
  await repOf(bp).screenshot({ path: L.DIR + '/out_8401/d03_bram_reports_open_a2.png' });
  await shot(lk.page, 'd04_lk_assignment2');
  // Reload Bram
  await bp.reload(); await sleep(4500); await goTab(bp, 'Circle');
  out.bramAfterReload = await repOf(bp).innerText().then(t => t.slice(-140).replace(/\n+/g, ' | '));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
