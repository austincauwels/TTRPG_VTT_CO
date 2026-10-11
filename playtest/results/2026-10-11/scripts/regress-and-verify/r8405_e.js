// Phone (Jonah): Burn and reroll settles when another player rolls; server refuses a stale burn;
// the Lightkeeper's open roll; a gilded choice that waits while someone else rolls; the phone dot
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const dot = (p) => p.$eval('button[aria-label^="Dice and log"]', b => ({ label: b.getAttribute('aria-label'), dot: !!b.querySelector('[data-new-dot]') })).catch(() => null);
const lastOutcome = (seat) => { const r = L.framesOf(seat, 'roll_result').slice(-1)[0]; return r && r.m.payload.roll.outcome; };
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.b.id, {}); L.resetChar(state.chars.a.id, { intuition_current: 5 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = j.page;
  const rollTillMixed = async () => {
    for (let i = 0; i < 10; i++) {
      await H.roll(p, 'Move', { tap: true, wait: 2200 });
      const o = lastOutcome(j);
      if (o === 'mixed_success' || o === 'failure') return o;
    }
    return null;
  };
  console.log('Jonah outcome', await rollTillMixed());
  await sleep(10000); // the bar fades
  console.log('dot after fade', await dot(p));
  await L.shot(p, 'e01_faded_dot', { clip: { x: 0, y: 0, width: 390, height: 120 } });
  await L.shot(p, 'e01b_faded_full');
  await p.locator('button[aria-label^="Dice and log"]').tap();
  await sleep(1000);
  console.log('AFTER on dice part', await H.after(p));
  await L.shot(p, 'e02_dice_part_offer');
  // Imogen rolls Survey (not gilded)
  await H.roll(a.page, 'Survey', { wait: 3000 });
  console.log('AFTER after Imogen rolled', await H.after(p));
  await L.shot(p, 'e03_after_other_roll');
  // A stale desk's burn: server must refuse
  H.inj(j, 'burn_resistance', { action: 'move', drive_key: 'nerve' });
  await sleep(1500);
  console.log('stale burn answer', L.framesOf(j, 'action_rejected').map(f => f.m.payload.detail), 'resist spent', H.char(state.chars.b.id).nerve_resistance_spent);
  // The Lightkeeper's open roll after a fresh Mixed
  if (await p.locator('button[aria-label^="Dice and log"][aria-pressed=true]').count()) { await p.locator('button[aria-label^="Dice and log"]').tap(); await sleep(800); }
  const o2 = await rollTillMixed();
  await p.locator('button[aria-label^="Dice and log"]').tap().catch(() => {});
  await sleep(800);
  console.log('Jonah 2nd outcome', o2, 'AFTER', await H.after(p));
  await lk.page.getByRole('button', { name: /^Roll \d+ di/i }).click();
  await sleep(2500);
  console.log('AFTER after LK open roll', await H.after(p));
  const rej0 = L.framesOf(j, 'action_rejected').length;
  const rr0 = L.framesOf(j, 'roll_result').length;
  H.inj(j, 'burn_resistance', { action: 'move', drive_key: 'nerve' });
  await sleep(1500);
  console.log('burn after LK roll: rejected', L.framesOf(j, 'action_rejected').slice(rej0).map(f => f.m.payload.detail), 'new roll_result', L.framesOf(j, 'roll_result').length - rr0, 'resist spent', H.char(state.chars.b.id).nerve_resistance_spent);
  console.log('LK log tail', (await H.log(lk.page)).slice(-2));
  await L.shot(p, 'e04_after_lk_roll_burn');
  console.log(j.errors);
  await b.close();
})();
