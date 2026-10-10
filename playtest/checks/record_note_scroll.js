// After the fix: the desk opens at its top; a mark's Undo strip at 1366x768 still brings the record's foot into view
const L = require('./lib');
(async () => {
  const browser = await L.launch();
  await L.fresh('b', 'pb');
  const seat = await L.openSeat(browser, 'laptop', { store: await L.storeFor('pb', 'b', 'S') });
  const p = seat.page;
  await p.waitForSelector('.trauma-record');
  await p.waitForTimeout(2000);
  const col = () => p.evaluate(() => { const c = document.querySelector('[data-desk=sheet]'); const r = document.querySelector('.trauma-record').getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { scrollTop: Math.round(c.scrollTop), max: c.scrollHeight - c.clientHeight, recordBottomBelowCol: Math.round(r.bottom - cr.bottom) }; });
  const open = await col();
  await p.getByRole('button', { name: 'Take a Body mark', exact: true }).click({ force: true });
  await p.waitForTimeout(500);
  const withStrip = await col();
  const strip = await p.evaluate(() => document.querySelector('.mark-undo')?.textContent);
  await p.locator('.mark-undo').getByRole('button').click();
  await p.waitForTimeout(800);
  const afterUndo = await col();
  console.log(JSON.stringify({ open, withStrip, strip, afterUndo, errors: seat.errors }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
