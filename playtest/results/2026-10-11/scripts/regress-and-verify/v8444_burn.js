// Stale Burn and reroll after End Assignment (A: roller's roll is the last at the table) and after a hub trip (B: settled roll)
const L = require('./v8444_lib'); const H = require('./v8444_h');
const { sleep, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const lastOutcome = (seat) => { const r = L.framesOf(seat, 'roll_result').slice(-1)[0]; return r && r.m.payload.roll.outcome; };
const rollTill = async (seat, label, opts) => {
  for (let i = 0; i < 12; i++) {
    await H.roll(seat.page, label, opts);
    // gilded choice? keep the regular die
    if (await seat.page.locator('[data-keep-die]').count()) { await H.keep(seat.page, 'regular'); await sleep(2000); }
    const kept = L.framesOf(seat, 'roll_kept').slice(-1)[0];
    let o = lastOutcome(seat);
    const rr = L.framesOf(seat, 'roll_result').slice(-1)[0];
    if (rr && rr.m.payload.roll.needs_gilded_choice && kept) o = kept.m.payload.outcome;
    if (o === 'mixed_success' || o === 'failure') return o;
  }
  return null;
};
(async () => {
  const b = await L.launch();
  L.sql(`update characters set advancement_picks=0 where campaign_id=${state.camps.S.id}`);
  for (const k of ['a', 'b', 'c']) L.resetChar(state.chars[k].id, { nerve_current: 4, cunning_current: 3, intuition_current: 4 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const ir = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const dv = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  await sleep(5000);
  // B first: Dev rolls Sense to a non-success, then Iris rolls, then Dev goes to the hub and back
  console.log('B dev outcome', await rollTill(dv, 'Sense', { tap: true, wait: 2500 }));
  await sleep(1500);
  console.log('B dev AFTER (fresh)', await H.after(dv.page));
  await H.roll(ir.page, 'Survey', { wait: 3000 });
  if (await ir.page.locator('[data-keep-die]').count()) { await H.keep(ir.page, 'regular'); await sleep(2000); }
  console.log('B dev AFTER (after Iris rolled)', await H.after(dv.page));
  await L.shot(dv.page, 'b01_dev_after_other_roll');
  // hub trip with browser Back, back in via the ledger
  await dv.page.goBack(); await sleep(2500);
  await L.shot(dv.page, 'b02_dev_hub');
  console.log('B dev url/hub', dv.page.url(), await dv.page.locator('.hub-tomes').count());
  const lp = dv.page.getByRole('button', { name: /Last Played|Return to|Continue/i });
  console.log('B hub buttons', (await dv.page.getByRole('button').allInnerTexts()).slice(0, 20));
  try { await L.openFromLedger(dv.page, 'Dev Okafor', 4000); } catch (e) { console.log('ledger err', e.message); }
  await sleep(1500);
  console.log('B dev AFTER (after hub trip)', await H.after(dv.page));
  await L.shot(dv.page, 'b03_dev_after_hub');
  const burnB = dv.page.getByRole('button', { name: /Burn and reroll/i });
  console.log('B burn buttons', await burnB.count());
  if (await burnB.count()) {
    const rej0 = L.framesOf(dv, 'action_rejected').length, rr0 = L.framesOf(dv, 'roll_result').length;
    await burnB.first().scrollIntoViewIfNeeded(); await burnB.first().tap(); await sleep(2000);
    console.log('B burn answer: rejected', L.framesOf(dv, 'action_rejected').slice(rej0).map(f => f.m.payload), 'new roll_result', L.framesOf(dv, 'roll_result').length - rr0);
    await L.shot(dv.page, 'b04_dev_after_burn_tap');
    console.log('B dev slip/after', await H.slip(dv.page), await H.after(dv.page));
  }
  // A: Iris rolls Move to a non-success; nobody else rolls; LK ends the assignment
  console.log('A iris outcome', await rollTill(ir, 'Move', { wait: 2500 }));
  await sleep(1000);
  console.log('A iris AFTER before end', await H.after(ir.page));
  const clickTab = async (p, name) => { const t = p.getByRole('tab', { name: new RegExp(`^${name}`, 'i') }); if (await t.count()) await t.first().click(); else await p.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).first().click(); await sleep(900); };
  await clickTab(lk.page, 'Roster');
  await lk.page.getByRole('button', { name: /^End Assignment$/ }).click(); await sleep(500);
  await lk.page.getByRole('button', { name: /Yes, end it/ }).click(); await sleep(3000);
  console.log('A iris AFTER after End Assignment', await H.after(ir.page));
  await L.shot(ir.page, 'a01_iris_after_end');
  const burnA = ir.page.getByRole('button', { name: /Burn and reroll/i });
  console.log('A burn buttons', await burnA.count());
  if (await burnA.count()) {
    const rej0 = L.framesOf(ir, 'action_rejected').length, rr0 = L.framesOf(ir, 'roll_result').length;
    await burnA.first().click(); await sleep(2500);
    console.log('A burn answer: rejected', L.framesOf(ir, 'action_rejected').slice(rej0).map(f => f.m.payload), 'new roll_result', L.framesOf(ir, 'roll_result').length - rr0);
    console.log('A iris log tail', (await H.log(ir.page)).slice(-4));
    await L.shot(ir.page, 'a02_iris_after_burn');
  }
  console.log('errors', ir.errors.slice(0, 5), dv.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
