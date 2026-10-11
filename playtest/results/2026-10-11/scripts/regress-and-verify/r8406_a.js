// offline-roll-double: a roll during a stall that does not close the socket (tablet 820x1180)
const L = require('./r8406_lib');
const H = require('./r8406_h');
const { sleep, shot, state } = L;
const out = {};
const B = state.chars.b.id;
const live = (seat) => seat.sockets.filter(r => !r.closedAt).slice(-1)[0];
const trayText = (page) => page.evaluate(() => {
  const v = document.querySelector('[data-desk="dice"]') || document.body;
  return [...document.querySelectorAll('[data-result-slip], [role=alert], [role=status]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
});
const rollLines = (lines) => lines.filter(l => /rolled|Move|Survey|Strike|Control|Sway|Read|Sense|Hide|Sneak/.test(l));
(async () => {
  const b = await L.launch();
  await L.fresh('b', 'pb', { nerve_current: 3, intuition_current: 3, cunning_current: 3 });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const pb = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  await shot(pb.page, 'a00_bram_desk');
  const lkLog0 = await H.log(lk.page);
  // Case 1: the roll reaches the server, the replies stall (no close) for the reconnect
  await pb.page.getByRole('button', { name: 'Spend one more Nerve for +1d' }).first().click();
  const s1 = live(pb);
  s1.stallIn = true;
  const t0 = Date.now();
  await H.rollBtn(pb.page, 'Move').click();
  await sleep(3000);
  out.c1_at3 = await trayText(pb.page);
  await shot(pb.page, 'a01_stall_3s');
  await sleep(4500);
  out.c1_at7_5 = await trayText(pb.page);
  await shot(pb.page, 'a02_stall_7s');
  await sleep(4000);
  out.c1_at11 = await trayText(pb.page);
  await shot(pb.page, 'a03_after_reconnect');
  out.c1_sockets = pb.sockets.map(r => ({ n: r.n, closed: r.closedAt ? r.closedAt - t0 : null }));
  out.c1_rollFramesOut = L.parsed(pb, 'out').filter(x => x.m.type === 'roll').map(x => ({ sock: x.sock, id: x.m.payload.roll_id, held: x.held }));
  out.c1_rollResultsIn = L.framesOf(pb, 'roll_result').map(x => ({ sock: x.sock, id: x.m.payload.roll_id, out: x.m.payload.roll?.outcome }));
  out.c1_db = H.char(B);
  out.c1_lkLogNew = (await H.log(lk.page)).slice(lkLog0.length);
  out.c1_bramLog = (await H.log(pb.page)).slice(-6);
  await shot(lk.page, 'a04_lk_log_case1');
  // Case 2: both ways held for 8 s; the held roll reaches the server late, as the old socket closes
  await sleep(1500);
  const lk1 = (await H.log(lk.page)).length;
  const n2 = pb.frames.length;
  const s2 = live(pb);
  s2.stalled = true; s2.stallIn = true; s2.flushOnClose = true;
  await H.rollBtn(pb.page, 'Move').click();
  await sleep(500);
  // a double-click/tap while waiting
  const tc = Date.now(); await H.rollBtn(pb.page, 'Move').click({ timeout: 2000 }).catch((e) => { out.c2_click2 = 'refused: ' + e.message.split('\n')[0]; }); out.c2_click2_ms = Date.now() - tc;
  await sleep(10000);
  out.c2_at10 = await trayText(pb.page);
  await shot(pb.page, 'a05_case2_after');
  out.c2_rollFramesOut = L.parsed(pb, 'out', n2).filter(x => x.m.type === 'roll').map(x => ({ sock: x.sock, id: x.m.payload.roll_id, held: x.held }));
  out.c2_rollResultsIn = L.framesOf(pb, 'roll_result', 'in', n2).map(x => ({ sock: x.sock, id: x.m.payload.roll_id, out: x.m.payload.roll?.outcome }));
  out.c2_db = H.char(B);
  out.c2_lkLogNew = (await H.log(lk.page)).slice(lk1);
  // Case 3: the network gone (every socket stalls) for 40 s: the tray gives up honestly
  const lk2 = (await H.log(lk.page)).length;
  const n3 = pb.frames.length;
  pb.stallAll = true;
  const s3 = live(pb); s3.stalled = true; s3.stallIn = true;
  await H.rollBtn(pb.page, 'Move').click();
  const marks = [];
  for (const t of [4, 8, 15, 25, 33]) {
    await sleep((t - (marks.length ? [4, 8, 15, 25, 33][marks.length - 1] : 0)) * 1000);
    marks.push({ t, tray: await trayText(pb.page) });
  }
  out.c3 = marks;
  await shot(pb.page, 'a06_case3_gave_up');
  pb.stallAll = false;
  for (const r of pb.sockets) { if (!r.closedAt) { r.flushOut(); r.flushIn(); } }
  await sleep(12000);
  out.c3_after = await trayText(pb.page);
  out.c3_rollFramesOut = L.parsed(pb, 'out', n3).filter(x => x.m.type === 'roll').map(x => ({ sock: x.sock, id: x.m.payload.roll_id, held: x.held }));
  out.c3_db = H.char(B);
  out.c3_lkLogNew = (await H.log(lk.page)).slice(lk2);
  out.c3_sockets = pb.sockets.map(r => ({ n: r.n, closed: !!r.closedAt }));
  await shot(pb.page, 'a07_case3_restored');
  // Case 4: a gilded roll (Survey) whose reply stalls; keep the die after the reconnect
  await sleep(2000);
  const lk3 = (await H.log(lk.page)).length;
  const n4 = pb.frames.length;
  const db4 = H.char(B);
  const s4 = live(pb); s4.stallIn = true;
  await H.rollBtn(pb.page, 'Survey').click();
  await sleep(9000);
  out.c4_tray = await trayText(pb.page);
  out.c4_keep = await H.keepLabels(pb.page);
  await shot(pb.page, 'a08_gilded_after_reconnect');
  out.c4_kept = await H.keep(pb.page, 'gilded');
  await sleep(3000);
  out.c4_tray2 = await trayText(pb.page);
  await shot(pb.page, 'a09_gilded_kept');
  out.c4_out = L.parsed(pb, 'out', n4).filter(x => /roll|keep|gilded/.test(x.m.type)).map(x => ({ sock: x.sock, type: x.m.type, id: x.m.payload?.roll_id }));
  out.c4_in = L.parsed(pb, 'in', n4).filter(x => /roll_result|rejected/.test(x.m.type)).map(x => ({ sock: x.sock, type: x.m.type, id: x.m.payload?.roll_id, need: x.m.payload?.roll?.needs_gilded_choice, d: x.m.payload?.detail }));
  out.c4_db = [db4.intuition_current, H.char(B).intuition_current];
  out.c4_lkLogNew = (await H.log(lk.page)).slice(lk3);
  out.c4_bramLog = (await H.log(pb.page)).slice(-3);
  out.errors = pb.errors.slice(0, 10);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
