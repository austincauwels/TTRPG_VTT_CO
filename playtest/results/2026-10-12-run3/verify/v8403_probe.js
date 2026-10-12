const L = require('./v8403_lib');
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const p = seat.page;
  await L.sleep(4000);
  await L.shot(p, 'p01_lk');
  await p.getByRole('button', { name: /^Notebook$/ }).first().click().catch(e => console.log('nb', e.message));
  await L.sleep(2000);
  await L.shot(p, 'p02_lk_nb');
  console.log(seat.errors.slice(0,5));
  await b.close();
})();
