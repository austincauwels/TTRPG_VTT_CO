// offline-not-shown: a silent network (no FIN/RST) for 45 s, a mark taken during it (laptop 1366x768)
const L = require('./r8406_lib');
const H = require('./r8406_h');
const { sleep, shot, state } = L;
const out = { timeline: [] };
const B = state.chars.b.id;
const banner = (page) => page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert]')]
  .map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(t => /connect|table|tab|mark|lost|sent/i.test(t)));
(async () => {
  const b = await L.launch();
  await L.fresh('b', 'pb');
  const pb = await L.openSeat(b, 'laptop', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  const t0 = Date.now();
  pb.stallAll = true; pb.refuseNew = true;
  for (const r of pb.sockets) if (!r.closedAt) { r.stalled = true; r.stallIn = true; }
  const mark = pb.page.getByRole('button', { name: /^Take a Body mark/ }).first();
  let marked = false;
  for (let t = 0; t <= 48; t += 3) {
    await sleep(Math.max(0, t0 + t * 1000 - Date.now()));
    if (!marked && t >= 6) { await mark.scrollIntoViewIfNeeded(); await mark.click(); marked = true; out.markAt = (Date.now() - t0) / 1000; }
    out.timeline.push({ t, banner: await banner(pb.page), track: (await L.trackState(pb.page, 'Body'))?.boxes, socks: pb.sockets.length });
    if (t === 18 || t === 33) await shot(pb.page, `c0${t === 18 ? 1 : 2}_silent_${t}s`);
  }
  out.outFrames = L.parsed(pb, 'out').filter(x => x.m.type !== 'ping').map(x => ({ sock: x.sock, type: x.m.type, held: x.held, t: (x.t - t0) / 1000 }));
  out.pings = L.parsed(pb, 'out').filter(x => x.m.type === 'ping').map(x => ({ sock: x.sock, t: (x.t - t0) / 1000 }));
  out.sockets = pb.sockets.map(r => ({ n: r.n, open: (r.openedAt - t0) / 1000, closed: r.closedAt ? (r.closedAt - t0) / 1000 : null }));
  // the network comes back: stalled sockets are dead (their held frames lost)
  pb.stallAll = false; pb.refuseNew = false;
  for (const r of pb.sockets) if (!r.closedAt) { try { r.ws.close({ code: 4000, reason: 'dead' }); } catch {} }
  await sleep(10000);
  out.after = { banner: await banner(pb.page), track: (await L.trackState(pb.page, 'Body')), db: H.char(B).body_marks, log: (await H.log(pb.page)).slice(-3) };
  await shot(pb.page, 'c03_after_restore');
  // the browser's offline event
  const pc = await L.openSeat(b, 'laptop', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  await pc.ctx.setOffline(true);
  await sleep(700);
  out.offlineEvent = await banner(pc.page);
  await shot(pc.page, 'c04_offline_event');
  await pc.ctx.setOffline(false);
  await sleep(6000);
  out.onlineAgain = await banner(pc.page);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
