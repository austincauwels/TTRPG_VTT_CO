const L = require('./r8404_lib');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const s = await L.openSeat(b, 'phone', { store: await L.storeFor('lke', null, 'E') });
  await sleep(4500);
  const ip = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  await ip.page.getByRole('button', { name: /^Dice and log/ }).click(); await sleep(1000);
  const i = ip.page.getByRole('button', { name: /How to roll/ }).first();
  console.log('i count', await i.count(), await i.getAttribute('aria-label').catch(() => ''));
  await i.tap(); await sleep(800);
  console.log('after tap', await ip.page.evaluate(() => [...document.querySelectorAll('[role=tooltip], [role=note], [role=dialog], p, span')].filter((e) => e.getClientRects().length && /roll|action/i.test(e.textContent) && e.textContent.length < 200 && e.children.length < 3).map((e) => e.textContent.trim()).slice(0, 6)));
  await shot(ip.page, 'I01_phone_tray_info');
  // LK empty desk at phone width: investigators frame
  console.log('lk phone empty lines', await s.page.evaluate(() => [...document.querySelectorAll('button, p, span')].filter((e) => e.getClientRects().length && /No investigators yet|Nothing logged yet|No one waiting/.test(e.textContent) && e.textContent.length < 60).map((e) => e.tagName + ':' + e.textContent.trim())));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
