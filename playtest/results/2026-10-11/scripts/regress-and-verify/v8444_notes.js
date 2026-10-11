const L = require('./v8444_lib');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const dv = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(5000);
  const pad = dv.page.locator('[data-desk="passnotes"]');
  await pad.scrollIntoViewIfNeeded();
  const opener = pad.locator('button').first();
  console.log('pad buttons', await pad.locator('button').allInnerTexts());
  await opener.tap(); await sleep(800);
  const opts = await dv.page.$$eval('[role=option], [role=listbox] li, [data-desk="passnotes"] li', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  console.log('options', opts);
  await L.shot(dv.page, 'n01_dev_to_list');
  // the server already routes a note with a target that names no character to sender + Lightkeeper
  const ws = await L.wsOpen(state.chars.c.id, state.users.pc.token); await sleep(600);
  ws.send('chat_message', { target: '@Lightkeeper', message: 'Only for you, Lightkeeper.' }); await sleep(1500);
  const lkLog = await lk.page.$$eval('[data-desk="log"] p', ps => ps.map(p => p.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
  console.log('LK log tail', lkLog.slice(-2));
  const iris = await L.wsOpen(state.chars.a.id, state.users.pa.token); await sleep(600);
  ws.send('chat_message', { target: '@Lightkeeper', message: 'Second private line.' }); await sleep(1200);
  console.log('Iris got', iris.frames.filter(f => f.type === 'activity_log').map(f => f.payload.message));
  ws.close(); iris.close();
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
