// LK 1440: Dev's sheet copy (Role tab), and drain Bram's held offer
const L = require('./r8407_lib');
const { sleep, state } = L;
(async () => {
  await L.drain('b', 'pb');
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(4500);
  await lk.page.getByText('Dev Okafor').first().click(); await sleep(1500);
  await L.shot(lk.page, 'j01_lk_dev_card');
  const vs = lk.page.getByRole('button', { name: /sheet/i });
  console.log('sheet buttons', await vs.allInnerTexts());
  if (await vs.count()) { await vs.first().click(); await sleep(1500); }
  const txt = await lk.page.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => /^WEIRD ABILITY$/i.test(e.textContent.trim()) && e.children.length === 0); return h ? h.parentElement.innerText.replace(/\s+/g, ' ').slice(0, 300) : 'no weird pane'; });
  console.log('LK role pane:', txt);
  await L.shot(lk.page, 'j02_lk_dev_sheet');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
