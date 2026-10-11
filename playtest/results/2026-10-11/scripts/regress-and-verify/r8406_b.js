// activity-log-not-persisted + stale-connection-slips (laptop 1366x768)
const L = require('./r8406_lib');
const H = require('./r8406_h');
const { sleep, shot, state } = L;
const out = {};
const slips = (page) => page.evaluate(() => [...document.querySelectorAll('[data-result-slip], [role=alert], [role=status]')]
  .map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const pb = await L.openSeat(b, 'laptop', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  // a few lines: Bram rolls, Iris (over a socket) sends a private note to Bram and a circle note
  const iris = await L.wsOpen(state.chars.a.id, state.users.pa.token);
  await H.rollBtn(pb.page, 'Sway').click(); await sleep(3000);
  iris.send('chat_message', { target: '@Bram Holt', message: 'Private: the key is under the third stair.' });
  iris.send('chat_message', { target: '@Circle', message: 'Meet at the bell tower.' });
  await sleep(1500);
  out.before = await H.log(pb.page);
  await shot(pb.page, 'b01_log_before');
  // 1. reload
  await pb.page.reload(); await sleep(5000);
  out.afterReload = await H.log(pb.page);
  await shot(pb.page, 'b02_log_after_reload');
  // 2. reload mid-roll
  await H.rollBtn(pb.page, 'Read').click(); await sleep(900);
  await pb.page.reload(); await sleep(5000);
  out.afterMidRollReload = await H.log(pb.page);
  out.lkAfterMidRoll = (await H.log(lk.page)).slice(-2);
  out.trayAfterMidRoll = await slips(pb.page);
  await shot(pb.page, 'b03_after_midroll_reload');
  // 3. hub trip
  await pb.page.getByRole('button', { name: /Back to chapter hub/i }).first().click(); await sleep(2500);
  await shot(pb.page, 'b04_hub');
  await pb.page.getByRole('button', { name: /^Last Played/ }).first().click(); await sleep(5000);
  out.afterHub = await H.log(pb.page);
  await shot(pb.page, 'b05_after_hub');
  // 4. second tab, then in tab A roll and note, roll in B, Use this tab in A
  const pageB = await pb.ctx.newPage();
  await pageB.goto(L.SITE + '/'); await sleep(5000);
  out.tabB_log = await H.log(pageB);
  await shot(pageB, 'b06_tabB');
  const pa = pb.page;
  await sleep(1000);
  out.tabA_banner = await slips(pa);
  await H.rollBtn(pa, 'Move').click(); await sleep(1500);
  await pa.getByRole('textbox', { name: 'Message' }).fill('From tab A, should wait');
  await pa.getByRole('button', { name: /Send/ }).click(); await sleep(800);
  out.tabA_afterRollAndNote = await slips(pa);
  await shot(pa, 'b07_tabA_replaced_roll_note');
  await H.rollBtn(pageB, 'Survey').click(); await sleep(3000);
  if (await pageB.locator('[data-keep-die]').count()) { await H.keep(pageB, 'regular'); await sleep(2000); }
  iris.send('chat_message', { target: '@Bram Holt', message: 'Second private note while tab B had it.' });
  await sleep(1500);
  out.tabB_logEnd = (await H.log(pageB)).slice(-3);
  await pa.getByRole('button', { name: 'Use this tab' }).click(); await sleep(4000);
  out.tabA_afterUse = await slips(pa);
  out.tabA_logAfterUse = (await H.log(pa)).slice(-4);
  await shot(pa, 'b08_tabA_after_use');
  await pageB.close();
  // 5. a real drop: close Bram's socket from the server side, log a line meanwhile, see it after
  const n0 = pb.frames.length;
  const live = pb.sockets.filter(r => !r.closedAt).slice(-1)[0];
  live.stalled = true; live.stallIn = true;   // the page hears nothing while we log a line
  iris.send('chat_message', { target: '@Circle', message: 'Said during the drop.' });
  await sleep(800);
  live.server.close({ code: 1006 }).catch?.(() => {});
  try { live.ws.close({ code: 4000, reason: 'drop' }); } catch {}
  await sleep(500);
  await H.rollBtn(pa, 'Move').click().catch(() => {});
  await sleep(600);
  out.dropSlips = await slips(pa);
  await shot(pa, 'b09_drop');
  await sleep(8000);
  out.afterDropSlips = await slips(pa);
  out.afterDropLog = (await H.log(pa)).slice(-4);
  await shot(pa, 'b10_after_drop');
  out.errors = pb.errors.slice(0, 8);
  iris.close();
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
