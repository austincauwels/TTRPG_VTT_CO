const L = require('./r8407_lib');
const { sleep } = L;
(async () => {
  const b = await L.launch();
  const s = await L.openSeat(b, 'laptop');
  await L.signIn(s.page, 'solo');
  await s.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await L.shot(s.page, 'f00_ledger');
  console.log(await s.page.getByRole('button').allInnerTexts());
  await b.close();
})();
