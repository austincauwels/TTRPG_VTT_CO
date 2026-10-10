// R6: a refused soak says why on the record (role=alert), and the next mark tap puts it away
const L = require('./lib');
const S = L.state;
const alerts = (p) => p.evaluate(() => [...document.querySelectorAll('[role=alert]')].map((a) => ({
  text: a.textContent.trim(), inRecord: !!a.closest('.trauma-record'), afterMarks: !!a.closest('[data-desk=marks]'),
  cls: a.className.slice(0, 60),
})));
(async () => {
  await L.fresh('b', 'pb');
  const browser = await L.launch();
  const seat = await L.openSeat(browser, 'wide', { store: await L.storeFor('pb', 'b', 'S') });
  const p = seat.page;
  await p.waitForSelector('.trauma-record');
  await p.waitForTimeout(2500);
  const sheet = L.sql(`select cunning_max, cunning_resistance_spent, specialty_ability from characters where id=${S.chars.b.id}`);
  await p.getByRole('button', { name: 'Take a Body mark', exact: true }).click();
  await p.waitForSelector('[role=alertdialog]', { timeout: 15000 });
  await p.waitForTimeout(500);
  const card = await p.locator('[role=alertdialog]').getAttribute('aria-label');
  const cardText = (await p.locator('[role=alertdialog]').textContent()).replace(/\s+/g, ' ');
  L.sql(`update characters set cunning_resistance_spent=3 where id=${S.chars.b.id}`);
  await p.locator('[role=alertdialog]').getByRole('button', { name: 'Use' }).click();
  await p.waitForTimeout(1500);
  const refused = L.framesOf(seat, 'action_rejected').map((f) => f.m.payload);
  const a1 = await alerts(p);
  const body1 = await L.trackState(p, 'Body');
  const dialogAfter = await p.locator('[role=alertdialog]').count();
  await L.shot(p, 'r6_refused_alert');
  const geo = await p.evaluate(() => {
    const a = [...document.querySelectorAll('[role=alert]')].find((x) => /cannot soak/.test(x.textContent));
    const marks = document.querySelector('[data-desk=marks] [role=group]');
    const scars = document.querySelector('[data-desk=scars]');
    const r = (e) => e && Math.round(e.getBoundingClientRect().top);
    return { alertTop: r(a), firstTrackTop: r(marks), scarsTop: r(scars) };
  });
  await p.getByRole('button', { name: 'Take a Brain mark', exact: true }).click();
  await p.waitForTimeout(300);
  const a2 = await alerts(p);
  const want = 'In the Trenches cannot soak this mark: it is used for this assignment or no Cunning resistance is left.';
  const ev = { sheet, card, cardText, refused, alertsAfterUse: a1, alertGeo: geo, bodyAfterUse: body1, offerCardAfterUse: dialogAfter, alertsAfterNextMarkTap: a2,
    db: L.sql(`select body_marks, cunning_resistance_spent from characters where id=${S.chars.b.id}`), errors: seat.errors };
  L.check('R6', 'In the Trenches with no Cunning resistance left: Use is refused, a role=alert with the reason shows under the marks, and the next mark tap removes it',
    a1.some((a) => a.text === want && a.inRecord && a.afterMarks) && geo.alertTop > geo.firstTrackTop && geo.alertTop < geo.scarsTop
      && body1.label === 'Body marks: 1 of 3' && !a2.some((a) => /cannot soak/.test(a.text)), ev);
  // let the Brain Undo run out and clean up
  await p.waitForTimeout(6000);
  L.saveResults('r6.json');
  await browser.close();
  await L.fresh('b', 'pb');
})().catch((e) => { console.error(e); process.exit(1); });
