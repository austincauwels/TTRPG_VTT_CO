const L = require('./r8407_lib');
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await L.sleep(4000);
  await L.shot(lk.page, 'smoke_lk');
  const dv = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  await L.sleep(4000);
  await L.shot(dv.page, 'smoke_dev');
  console.log(lk.errors, dv.errors);
  await b.close();
})();
