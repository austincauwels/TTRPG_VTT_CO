// path-cards-tablet-navigation: a real touch swipe on the card stack (tablet 820x1180)
const L = require('./r8402_lib');
const { sleep } = L;
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, 'tablet', {});
  const p = seat.page;
  await L.signIn(p, 'pb');
  await p.getByText(/New character/i).first().click();
  await sleep(2500);
  const cdp = await p.context().newCDPSession(p);
  const cardName = () => p.evaluate(() => (document.body.innerText.match(/\b(Doctor|Professor|Journalist|Magician|Explorer|Soldier|Criminal|Detective|Medium|Occultist)\b/) || [])[0]);
  const stack = p.locator('div[style*="pan-y"]').first();
  const bb = await stack.boundingBox();
  console.log('stack', JSON.stringify(bb));
  const swipe = async (dx, dy = 0) => {
    const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] }); await sleep(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const seen = [await cardName()];
  for (let i = 0; i < 9; i++) { await swipe(-200); await sleep(750); seen.push(await cardName()); }
  console.log('after 9 left swipes:', JSON.stringify(seen));
  await p.screenshot({ path: `${L.DIR}/swipe_tablet_9.png` });
  await swipe(220); await sleep(750); console.log('after a right swipe:', await cardName());
  const y0 = await p.evaluate(() => scrollY);
  await swipe(10, -300); await sleep(750); console.log('vertical drag: card', await cardName(), 'scrollY', y0, '->', await p.evaluate(() => scrollY));
  // fast double swipe inside the 600ms lock
  const c0 = await cardName(); await swipe(-200); await sleep(100); await swipe(-200); await sleep(900); console.log('two quick swipes from', c0, 'to', await cardName());
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
