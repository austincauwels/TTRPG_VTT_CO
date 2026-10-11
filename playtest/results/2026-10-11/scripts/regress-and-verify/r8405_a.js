// Ada desktop: rule-of-six stepper, gilded choice wording
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.a.id, { intuition_current: 5 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4000);
  const p = a.page;
  for (let i = 0; i < 6; i++) { await p.locator('button[aria-label="Spend one more Intuition for +1d"]').click({ force: true }); await sleep(150); }
  const hdr = await p.locator('button[aria-label="Spend one more Intuition for +1d"]').evaluate(e => e.parentElement.innerText.replace(/\s+/g,' '));
  const plusDis = await p.locator('button[aria-label="Spend one more Intuition for +1d"]').getAttribute('aria-disabled');
  const rows = await p.$$eval('button[data-roll-row]', bs => bs.map(b => [b.getAttribute('aria-label'), b.innerText.replace(/\s+/g,' ')]));
  console.log('HEADER', hdr, 'plus disabled', plusDis);
  console.log('ROWS', JSON.stringify(rows.filter(r => /Survey|Focus|Sense/.test(r[0])), null, 0));
  await L.shot(p, 'a01_spend5', { clip: { x: 400, y: 480, width: 1020, height: 260 } });
  await H.roll(p, 'Focus');
  console.log('SLIP', await H.slip(p));
  console.log('KEEP', await H.keepLabels(p));
  console.log('CHAR after roll', H.char(state.chars.a.id));
  await L.shot(p, 'a02_focus_rolled');
  const kept = await H.keep(p, 'gilded');
  await sleep(2500);
  console.log('kept', kept, 'SLIP', await H.slip(p));
  console.log('AFTER', await H.after(p));
  console.log('CHAR after keep', H.char(state.chars.a.id));
  console.log('LOG a', await H.log(p));
  console.log('LOG lk', await H.log(lk.page));
  await L.shot(p, 'a03_kept');
  console.log(a.errors, lk.errors);
  await b.close();
})();
