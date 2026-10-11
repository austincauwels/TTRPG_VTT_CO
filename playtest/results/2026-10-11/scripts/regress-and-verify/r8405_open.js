const L = require('./r8405_lib');
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await L.sleep(5000);
  console.log(await L.shot(lk.page, 'open_lk'));
  console.log(await L.shot(a.page, 'open_a'));
  console.log(lk.errors, a.errors);
  console.log(L.parsed(a).map(x => x.m.type).join(','));
  await b.close();
})();
