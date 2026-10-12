const L = require('./v8401_lib');
const { sleep } = L;
(async () => {
  // reopen reports (End Assignment was not confirmed, so they are still open with the four filed)
  const b = await L.launch();
  const seat = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'G') });
  await sleep(5000);
  const row = seat.page.getByText('No report yet', { exact: true }).first();
  console.log('visible No report yet on roster:', await row.isVisible().catch(() => 'n/a'));
  await row.scrollIntoViewIfNeeded(); await sleep(600);
  await L.shot(seat.page, 'r08_roster_ledger');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
