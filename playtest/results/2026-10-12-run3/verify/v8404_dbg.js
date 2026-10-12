const L = require('./v8404_lib');
const { sleep } = L;
(async () => {
  const browser = await L.launch();
  L.DEVICES.desk = { viewport: { width: 1920, height: 1080 } };
  const seat = await L.openSeat(browser, 'desk', { store: await L.storeFor('pa', 'a', 'S') });
  const p = seat.page; await sleep(5000);
  await p.getByRole('button', { name: /^Circle\b/ }).first().click(); await sleep(2500);
  await L.shot(p, 'keys_00_circle');
  console.log(await p.evaluate(() => [...document.querySelectorAll('.info-term')].map(t => t.innerText.slice(0,60))));
  console.log(await p.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].map(c => c.closest('label')?.innerText)));
  await browser.close();
})();
