const L = require('./r8406_lib'); const { sleep, shot } = L;
(async () => { const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') }); await sleep(5000);
  const el = lk.page.locator('p', { hasText: 'The tide took' }).first();
  const n = await el.count(); let card = null;
  if (n) { await el.scrollIntoViewIfNeeded(); card = await el.evaluate(e => ({ text: e.innerText, ws: getComputedStyle(e).whiteSpace, h: e.getBoundingClientRect().height })); }
  console.log(JSON.stringify({ n, card, join: await lk.page.getByText('Join Requests').count() }));
  await shot(lk.page, 'f07_lk_join_card'); await b.close(); })();
