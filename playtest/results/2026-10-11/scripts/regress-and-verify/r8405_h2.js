// Cass (laptop, keyboard): where focus is during the Undo, when Death Defy opens, and after Use / Take the mark
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const active = (p) => p.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName} ${e.getAttribute('aria-label') || e.innerText?.slice(0, 30).replace(/\s+/g,' ')}` : null; });
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.c.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const c = await L.openSeat(b, 'laptop', { store: await L.storeFor('pc', 'c', 'S') });
  await sleep(4500);
  const p = c.page;
  for (const [type, answer] of [['Body', 'Use'], ['Brain', 'Take the mark']]) {
    const take = p.locator(`button[aria-label="Take ${type} mark 1 of 3"]`);
    await take.scrollIntoViewIfNeeded(); await take.focus(); await p.keyboard.press('Enter');
    await sleep(300);
    console.log(type, 'focus during Undo', await active(p));
    await sleep(5800);
    console.log(type, 'focus when offer open', await active(p));
    await p.locator('[role=alertdialog] button', { hasText: answer }).focus();
    await p.keyboard.press('Enter');
    await sleep(2500);
    console.log(type, 'after', answer, 'focus', await active(p), 'cards', await p.$$eval('[role=alertdialog]', d => d.length));
    await L.shot(p, `h06_after_${answer.replace(/ /g, '_')}`);
  }
  console.log('LK tail', (await H.log(lk.page)).slice(-3));
  await b.close();
})();
