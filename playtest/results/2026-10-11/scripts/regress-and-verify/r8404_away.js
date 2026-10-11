// silent-table-changes: changes made while a phone was away (socket down, or a reload)
const L = require('./r8404_lib');
const { sleep, shot, sql, state } = L;
const dots = (page) => page.evaluate(() => [...document.querySelectorAll('[data-new-dot]')].filter((e) => e.getClientRects().length).map((e) => { const b = e.closest('button'); return b ? (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim() : 'dot'; }));
const strip = (page) => page.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')));
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const iris = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(5000);
  console.log('start dots', await dots(iris.page));
  // Phone away: block and drop its sockets
  iris.block = true;
  for (const s of iris.sockets) { try { s.ws.close({ code: 1011, reason: 'drop' }); } catch {} }
  await sleep(1500);
  const P = lk.page;
  await P.getByRole('button', { name: 'Own words' }).click();
  await P.locator('#dispatch-location').fill('The lighthouse on Gull Rock');
  await P.getByLabel('Your dispatch').fill('Come at dusk.');
  await P.getByRole('button', { name: 'Dispatch', exact: true }).click(); await sleep(1200);
  await P.getByRole('button', { name: 'Raise tension by one' }).click({ force: true }); await sleep(1200);
  await shot(iris.page, 'W01_iris_offline');
  iris.block = false;
  await sleep(15000);
  console.log('after reconnect dots', await dots(iris.page), 'strip', await strip(iris.page), 'sockets', iris.sockets.length);
  await shot(iris.page, 'W02_iris_reconnected');
  // Reload case
  await P.locator('#dispatch-location').fill('The mill at Hollow Bend');
  await P.getByRole('button', { name: 'Dispatch', exact: true }).click(); await sleep(800);
  await iris.page.reload({ waitUntil: 'domcontentloaded' }); await sleep(5000);
  console.log('after reload dots', await dots(iris.page), 'strip', await strip(iris.page));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
