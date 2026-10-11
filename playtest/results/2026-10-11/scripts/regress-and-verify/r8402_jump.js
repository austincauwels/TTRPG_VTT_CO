// name-vote-reorders on the phone: does a player's own vote move the row under the finger?
const L = require('./r8402_lib');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  await sleep(5000);
  const p = seat.page;
  const geo = () => p.evaluate(() => {
    const d = document.querySelector('[role=dialog]');
    return { scrollTop: Math.round(d.scrollTop), rows: [...d.querySelectorAll('button[aria-label^="Vote for"]')].map((btn) => ({ n: btn.getAttribute('aria-label').slice(9, 25), y: Math.round(btn.getBoundingClientRect().y), rowH: Math.round(btn.parentElement.getBoundingClientRect().height) })) };
  });
  for (const target of ['The Ninth Night', 'The Harrow Watch', 'ZZZZZZZZZZ']) {
    const btn = p.getByRole('button', { name: new RegExp('^Vote for ' + target) });
    await btn.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await sleep(400);
    const g0 = await geo();
    const bb = await btn.boundingBox();
    await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await sleep(1200);
    const g1 = await geo();
    console.log(`vote ${target}: before`, JSON.stringify(g0), '\n   after', JSON.stringify(g1));
    await p.screenshot({ path: `${L.DIR}/jump_${target.slice(0, 8).replace(/ /g, '_')}.png` });
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
