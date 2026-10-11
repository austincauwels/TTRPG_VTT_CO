// Phone (Jonah): a real drop while the Lightkeeper rolls; Burn after the reconnect
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const lastOutcome = (seat) => { const r = L.framesOf(seat, 'roll_result').slice(-1)[0]; return r && r.m.payload.roll.outcome; };
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.b.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = j.page;
  let o;
  for (let i = 0; i < 10; i++) { await H.roll(p, 'Move', { tap: true, wait: 2200 }); o = lastOutcome(j); if (o !== 'full_success' && o !== 'critical_success') break; }
  console.log('Jonah', o);
  await p.locator('button[aria-label^="Dice and log"]').tap(); await sleep(800);
  console.log('AFTER before drop', await H.after(p));
  // the phone's connection drops; the Lightkeeper rolls meanwhile
  j.refuse = true;
  const live = j.sockets.filter(r => !r.closedAt).slice(-1)[0];
  live.ws.close({ code: 4000, reason: 'drop' });
  await sleep(500);
  await lk.page.getByRole('button', { name: /^Roll \d+ di/i }).click();
  await sleep(2500);
  j.refuse = false;
  await sleep(9000); // reconnect
  console.log('sockets', j.sockets.map(s => [s.n, !!s.closedAt]));
  console.log('AFTER after reconnect', await H.after(p));
  await L.shot(p, 'e05_after_reconnect_offer');
  const btn = p.getByRole('button', { name: 'Burn and reroll' });
  if (await btn.count()) { await btn.tap(); await sleep(2500); }
  console.log('rejections', L.framesOf(j, 'action_rejected').map(f => f.m.payload.detail), 'resist spent', H.char(state.chars.b.id).nerve_resistance_spent);
  console.log('LK log tail', (await H.log(lk.page)).slice(-3));
  await L.shot(p, 'e06_after_burn');
  await L.shot(lk.page, 'e07_lk_log');
  await b.close();
})();
