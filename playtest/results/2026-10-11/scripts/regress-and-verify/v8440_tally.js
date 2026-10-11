// Tally: added on device A, then device B (fresh browser) and a second tab of A
const L = require('./v8440_lib');
const { sleep, shot, state } = L;
const out = {};
const circ = state.camps.R.circleId;
const illum = () => L.sql(`select illumination from circles where id=${circ}`);
(async () => {
  L.sql(`update circles set reports_open=true, illumination=0 where id=${circ}`);
  const ws = await L.wsOpen(state.chars.ada.id, state.users.ada.token);
  await sleep(500);
  ws.send('submit_assignment_report', { circle_id: circ, character_id: state.chars.ada.id, responses: { keys_fulfilled: 'some', keys_detail: { k1: true } } });
  await sleep(1200); ws.close();
  out.reports = L.sql(`select backstory_answers->'reports' from circles where id=${circ}`).slice(0, 200);
  const b = await L.launch();
  const store = await L.storeFor('lk', null, 'R');
  // Device A, with two tabs opened before the Add
  const ctxA = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxA.addInitScript((s) => { try { if (!localStorage.getItem('candela-vtt-storage')) localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); } catch {} }, store);
  const a1 = await ctxA.newPage();
  const logs = [];
  a1.on('websocket', w => w.on('framereceived', f => { if (/activity_log/.test(f.payload)) { try { logs.push(JSON.parse(f.payload).payload.message); } catch {} } }));
  await a1.goto(L.SITE + '/'); await sleep(3500);
  await a1.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const qA = a1.locator('section[aria-label="Illumination questions"]');
  await qA.locator('input[type=checkbox]').first().check(); await sleep(300);
  out.a1Before = (await qA.innerText()).replace(/\n+/g, ' | ').slice(-120);
  await qA.getByRole('button', { name: /^Add \d+ Illumination/ }).click(); await sleep(1500);
  out.illumAfterA = illum();
  out.a1After = (await qA.innerText()).replace(/\n+/g, ' | ').slice(-80);
  await shot(a1, 'tally_01_deviceA_added');
  // Device B: a fresh browser (another laptop)
  const ctxB = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxB.addInitScript((s) => { try { if (!localStorage.getItem('candela-vtt-storage')) localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); } catch {} }, store);
  const bp = await ctxB.newPage();
  await bp.goto(L.SITE + '/'); await sleep(3500);
  await bp.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const qB = bp.locator('section[aria-label="Illumination questions"]');
  out.bBefore = (await qB.innerText()).replace(/\n+/g, ' | ').slice(-120);
  out.bIllumShown = await bp.evaluate(() => (document.body.innerText.match(/\d+ \/ 12/) || [])[0]);
  await shot(bp, 'tally_02_deviceB_fresh_live_add');
  const addB = qB.getByRole('button', { name: /^Add \d+ Illumination/ });
  out.bAddCount = await addB.count();
  if (out.bAddCount && await addB.isEnabled()) { await addB.click(); await sleep(1500); }
  out.illumAfterB = illum();
  out.bAfter = (await qB.innerText()).replace(/\n+/g, ' | ').slice(-80);
  await shot(bp, 'tally_03_deviceB_added_again');
  await sleep(1000);
  out.logs = logs.filter(m => /Illumination|milestone/.test(m));
  out.ticksSentOverWs = 'see code: setIllumTally is local only';
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
