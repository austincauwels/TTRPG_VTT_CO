const L = require('./r8402_lib');
const { sleep } = L;
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, process.argv[3] || 'phone', { store: await L.storeFor(process.argv[2] || 'fb', process.argv[2] || 'fb', 'F') });
  await sleep(5000);
  await seat.page.screenshot({ path: L.DIR + `/explore_${process.argv[2]}.png`, fullPage: false });
  const dlg = seat.page.locator('[role=dialog]');
  console.log(await dlg.count());
  if (await dlg.count()) console.log((await dlg.first().innerText()));
  console.log(seat.errors.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
