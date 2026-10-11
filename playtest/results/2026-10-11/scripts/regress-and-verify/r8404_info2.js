const L = require('./r8404_lib');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  for (const w of [390, 360]) {
  const ip = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  await ip.page.setViewportSize({ width: w, height: 844 });
  await sleep(4500);
  await ip.page.getByRole('button', { name: /^Dice and log/ }).click(); await sleep(1000);
  await ip.page.getByRole('button', { name: /How to roll/ }).first().tap(); await sleep(800);
  console.log(w, await ip.page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length <= 2 && /^No dice thrown yet: To roll/.test(e.textContent.trim()) && e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, docSW: document.documentElement.scrollWidth }; })));
  await ip.ctx.close();
  }
  await b.close();
})();
