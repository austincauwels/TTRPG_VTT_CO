const L = require('./lib'); const { sleep, shot, state, check } = L;
(async () => {
  const b = await L.launch();
  const lk = await L.desk(b, 'wide', 'lk', null, 'S'); const P = lk.page;
  const loc = () => P.getByLabel(/Location/i).first(); const txt = () => P.getByLabel(/Your dispatch/i).first();
  console.log('start', await loc().inputValue(), '|', await txt().inputValue());
  await loc().fill('Draft place'); await txt().fill('Draft words.'); await sleep(400);
  await P.getByRole('button', { name: /^Map$/i }).first().click(); await sleep(800);
  const tag = Date.now().toString(36);
  const sock = await L.wsOpen(state.camps.S.code, state.users.lk.token); await sleep(600);
  sock.send('update_circle', { circle_id: state.camps.S.circleId, location: 'Pier ' + tag, dispatch_text: 'Fog ' + tag });
  await sleep(1500); sock.close();
  console.log('db', L.sql(`select location, dispatch_text from circles where id=${state.camps.S.circleId}`));
  await P.getByRole('button', { name: /Use this tab/i }).click(); await sleep(3000);
  await P.getByRole('button', { name: /^Roster$/i }).first().click(); await sleep(1500);
  const after = { loc: await loc().inputValue(), txt: await txt().inputValue() };
  await shot(P, 'd13_lk_newer_dispatch');
  check('dispatch-draft-dropped-on-section-switch', 'a newer dispatch replaces the stale draft', after.loc === 'Pier ' + tag && after.txt === 'Fog ' + tag, after);
  // reload: draft gone (documented)
  console.log('errors', lk.errors);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
