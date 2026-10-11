const L = require('./lib'); const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const pl = await L.desk(b, 'phone', 'bram', 'bram', 'S');
  await shot(pl.page, 'x01_phone_desk');
  const names = async (p) => p.$$eval('button,[role=tab],a', es => es.filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.innerText).replace(/\s+/g, ' ').trim().slice(0, 50)));
  console.log('PHONE', JSON.stringify(await names(pl.page)));
  await pl.page.getByRole('button', { name: /^Menu/ }).first().click(); await sleep(800);
  await shot(pl.page, 'x02_phone_menu');
  console.log('MENU', JSON.stringify(await pl.page.getByRole('dialog', { name: 'Menu' }).locator('button').allInnerTexts()));
  const lk = await L.desk(b, 'wide', 'lk', null, 'S');
  await shot(lk.page, 'x03_lk_desk');
  console.log('LK', JSON.stringify(await names(lk.page)));
  console.log('errors', pl.errors, lk.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
