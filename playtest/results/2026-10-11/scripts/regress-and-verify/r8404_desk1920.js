const L = require('./r8404_lib');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const ctxOpts = { viewport: { width: 1920, height: 1080 } };
  L.DEVICES.desk = ctxOpts;
  const ada = await L.openSeat(b, 'desk', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(5000);
  await lk.page.locator('#dispatch-location').fill('The orchard at Wren Hollow');
  await lk.page.getByRole('button', { name: 'Dispatch', exact: true }).click(); await sleep(3000);
  await shot(ada.page, 'X01_1920_redispatch');
  console.log(await ada.page.evaluate(() => ({ log: [...document.querySelectorAll('[data-desk=log] p')].slice(-1).map((e) => e.innerText), dots: [...document.querySelectorAll('[data-new-dot]')].filter((e) => e.getClientRects().length).length })));
  await b.close();
})();
