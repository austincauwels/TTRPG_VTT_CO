const L = require('./c8460/lib'); const { sleep, shot, state } = L;
(async () => {
  const b = await L.launch();
  const store = await L.storeFor('pa','a','S');
  const s = await L.openSeat(b,'tablet',{store}); const p = s.page; await sleep(4500);
  await p.getByRole('button',{name:/^Account/}).first().click(); await sleep(600);
  console.log(await p.locator('body').ariaSnapshot().then(t=>t.split('\n').filter(l=>/Account|Sign out|dialog|Chapter/.test(l)).join('\n')));
  await shot(p,'acct');
  await b.close();
})();
