// info-slip-covers-keys: player's Circle page, reports open; the keys heading's "i" slip
// against the key checkboxes, by mouse (pinned and hover) and by a finger on a phone.
const L = require('./v8404_lib');
const { state, sleep, sql } = L;

const probe = (p) => p.evaluate(() => {
  const term = [...document.querySelectorAll('.info-term')].find(t => /illumination keys/i.test(t.innerText));
  const slip = term?.querySelector('[role=tooltip]');
  const sr = slip && getComputedStyle(slip).display !== 'none' ? slip.getBoundingClientRect() : null;
  const boxes = [...(term?.closest('div.border-t')?.querySelectorAll('input[type=checkbox]') || [])].map(cb => {
    const r = cb.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const lbl = cb.closest('label');
    const lr = lbl.getBoundingClientRect();
    // the label's text centre too
    const tx = lbl.querySelector('span').getBoundingClientRect();
    const thit = document.elementFromPoint(tx.x + tx.width / 2, tx.y + tx.height / 2);
    return { text: lbl.innerText.trim(), checked: cb.checked, cx: Math.round(cx), cy: Math.round(cy),
      boxHitIsSlip: !!hit?.closest('[role=tooltip]'), textHitIsSlip: !!thit?.closest('[role=tooltip]'), labelRight: Math.round(lr.right) };
  });
  return { shown: !!sr, slip: sr && { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) }, boxes };
});

async function circleTab(p) {
  await p.getByRole('button', { name: /^Circle\b/ }).first().click();
  await sleep(2500);
}

(async () => {
  const S = state.camps.S;
  sql(`update circles set reports_open=true where id=${S.circleId}`);
  const browser = await L.launch();

  // Desktop 1920x1080, mouse
  L.DEVICES.desk = { viewport: { width: 1920, height: 1080 } };
  const seat = await L.openSeat(browser, 'desk', { store: await L.storeFor('pa', 'a', 'S') });
  const p = seat.page;
  await sleep(5000);
  await circleTab(p);
  const termBtn = p.getByRole('button', { name: /About Criminal Illumination Keys/ });
  await termBtn.scrollIntoViewIfNeeded();
  await sleep(500);
  console.log('before', JSON.stringify(await probe(p)));
  // A) click the term (pins), move away, then click the first box where it is
  await termBtn.click();
  await p.mouse.move(5, 5);
  await sleep(600);
  const a = await probe(p);
  console.log('A pinned', JSON.stringify(a));
  await L.shot(p, 'keys_01_pinned');
  const b0 = a.boxes[0];
  await p.mouse.click(b0.cx, b0.cy);
  await sleep(500);
  const a2 = await probe(p);
  console.log('A after click on box 0 position', JSON.stringify(a2));
  await L.shot(p, 'keys_02_after_click');
  // second click at the same place
  await p.mouse.click(b0.cx, b0.cy);
  await sleep(500);
  console.log('A after 2nd click', JSON.stringify(await probe(p)));
  // Escape to clear; reset
  await p.keyboard.press('Escape');
  await p.mouse.move(5, 5);
  await sleep(600);
  // B) hover only: point at the term, then move down to the first box in steps (as a hand would)
  const tb = await termBtn.boundingBox();
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 5 });
  await sleep(400);
  const bState = await probe(p);
  console.log('B hovered', JSON.stringify(bState));
  const target = bState.boxes[0];
  await p.mouse.move(target.cx, target.cy, { steps: 10 });
  await sleep(150);
  const b2 = await probe(p);
  console.log('B moved to box', JSON.stringify(b2));
  await L.shot(p, 'keys_03_hover_moved');
  await p.mouse.down(); await p.mouse.up();
  await sleep(500);
  console.log('B after click', JSON.stringify(await probe(p)));
  await sleep(800);
  console.log('B 800ms later', JSON.stringify(await probe(p)));
  await L.shot(p, 'keys_04_hover_clicked');

  // C) phone, finger
  const ph = await L.openSeat(browser, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  const q = ph.page;
  await sleep(5000);
  // phone: Circle may be behind a menu
  const circleBtn = q.getByRole('button', { name: /^Circle\b/ }).first();
  if (await circleBtn.isVisible().catch(() => false)) await circleBtn.click();
  else {
    await q.getByRole('button', { name: /Menu/ }).first().click(); await sleep(800);
    await q.getByRole('button', { name: /Circle/ }).first().click();
  }
  await sleep(2500);
  const pterm = q.getByRole('button', { name: /About Criminal Illumination Keys/ });
  await pterm.scrollIntoViewIfNeeded();
  await sleep(400);
  await pterm.tap();
  await sleep(500);
  const c = await probe(q);
  console.log('C phone pinned', JSON.stringify(c));
  await L.shot(q, 'keys_05_phone_pinned');
  await q.touchscreen.tap(c.boxes[0].cx, c.boxes[0].cy);
  await sleep(500);
  const c2 = await probe(q);
  console.log('C phone after tap box', JSON.stringify(c2));
  await L.shot(q, 'keys_06_phone_after_tap');
  console.log('errors', seat.errors.slice(0, 3), ph.errors.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
