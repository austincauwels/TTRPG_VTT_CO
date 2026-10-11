const L = require('./r8404_lib');
const { sleep, shot, sql, state } = L;
const dots = (page) => page.evaluate(() => [...document.querySelectorAll('[data-new-dot]')].filter((e) => e.getClientRects().length).map((e) => { const b = e.closest('button'); return b ? (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim() : 'dot'; }));
const last = (page) => page.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')));
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const iris = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  const bram = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  await lk.page.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  await lk.page.getByRole('button', { name: /^Open reports/i }).click(); await sleep(2500);
  console.log('dots iris', await dots(iris.page), 'bram', await dots(bram.page));
  console.log('strip iris', await last(iris.page), 'lk', await last(lk.page));
  await shot(bram.page, 'R01_bram_reports_open');
  // reload the tablet: does the dot persist until looked at?
  await bram.page.reload({ waitUntil: 'domcontentloaded' }); await sleep(4500);
  console.log('bram dots after reload', await dots(bram.page));
  await bram.page.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  await bram.page.getByRole('button', { name: /^Investigator/ }).first().click(); await sleep(800);
  console.log('bram dots after looking', await dots(bram.page));
  await lk.page.getByRole('button', { name: /^Close reports/i }).click().catch((e) => console.log('no close', e.message.slice(0, 60))); await sleep(2000);
  console.log('strip lk after close', await last(lk.page));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
