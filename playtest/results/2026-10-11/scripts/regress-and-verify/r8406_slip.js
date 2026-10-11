// stale-connection-slips: a roll during a real drop, then the reconnect (laptop 1366x768)
const L = require('./r8406_lib'); const H = require('./r8406_h'); const { sleep, shot, state } = L;
const slips = (page) => page.evaluate(() => [...document.querySelectorAll('[data-result-slip], [role=alert], [role=status]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
(async () => { const b = await L.launch(); const out = {};
  const pb = await L.openSeat(b, 'laptop', { store: await L.storeFor('pb', 'b', 'S') }); await sleep(5000);
  pb.refuseNew = true;
  const live = pb.sockets.filter(r => !r.closedAt).slice(-1)[0];
  try { live.ws.close({ code: 4000, reason: 'drop' }); } catch {}
  await sleep(1500);
  await H.rollBtn(pb.page, 'Move').click().catch(e => out.click = e.message.slice(0, 80));
  await pb.page.getByRole('textbox', { name: 'Message' }).fill('Note during the drop');
  await pb.page.getByRole('button', { name: /Send/ }).click();
  await sleep(12000);
  out.during = await slips(pb.page);
  await shot(pb.page, 'k01_drop_slips');
  const iris = await L.wsOpen(state.chars.a.id, state.users.pa.token);
  iris.send('chat_message', { target: '@Circle', message: 'Logged while Bram was away.' }); await sleep(500); iris.close();
  pb.refuseNew = false;
  await sleep(10000);
  out.after = await slips(pb.page);
  out.log = (await H.log(pb.page)).slice(-2);
  out.noteField = await pb.page.getByRole('textbox', { name: 'Message' }).inputValue();
  await shot(pb.page, 'k02_after_reconnect');
  out.socks = pb.sockets.map(r => ({ n: r.n, refused: !!r.refused, open: r.openedAt % 100000, closed: r.closedAt ? r.closedAt % 100000 : null })); out.types = pb.frames.map(f => f.sock + f.dir[0] + ':' + (f.msg.match(/"type": ?"(\w+)"/) || [])[1]).join(' '); out.rolls = L.parsed(pb, 'out').filter(x => x.m.type === 'roll').map(x => ({ sock: x.sock, t: x.t % 100000 })); out.results = L.framesOf(pb, 'roll_result').map(x => ({ sock: x.sock, t: x.t % 100000 }));
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
