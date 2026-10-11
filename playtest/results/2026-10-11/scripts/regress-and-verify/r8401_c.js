// Phase C: the tally, Add N, log lines; a second LK tab; End Assignment and fresh forms
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = {};
const logs = (seat) => L.parsed(seat, 'in').filter(x => x.m.type === 'activity_log').map(x => x.m.payload.message);
(async () => {
  const b = await L.launch();
  const store = await L.storeFor('lk', null, 'R');
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((s) => { try { if (!localStorage.getItem('candela-vtt-storage')) localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); } catch {} }, store);
  const p1 = await ctx.newPage();
  const frames1 = [];
  p1.on('websocket', ws => ws.on('framereceived', f => frames1.push(f.payload)));
  await p1.goto(L.SITE + '/'); await sleep(3500);
  await p1.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const q = p1.locator('section[aria-label="Illumination questions"]');
  await q.locator('label').first().click(); await sleep(300);
  out.tallyBefore = (await q.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  // second tab, same browser, opened before the Add
  const p2 = await ctx.newPage();
  await p2.goto(L.SITE + '/'); await sleep(3500);
  await p2.getByRole('button', { name: 'Circle', exact: true }).first().click().catch(() => {}); await sleep(1200);
  await shot(p2, 'c01_lk_tab2');
  const q2 = p2.locator('section[aria-label="Illumination questions"]');
  out.tab2Tally = (await q2.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  // Add in tab 2 (it holds the socket now)
  await q2.locator('label').first().click().catch(() => {}); await sleep(300);
  out.tab2TallyTicked = (await q2.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  await q2.getByRole('button', { name: /^Add \d+ Illumination/ }).click(); await sleep(1500);
  out.illumAfterTab2 = L.sql(`select illumination from circles where id=${state.camps.R.circleId}`);
  out.tab2After = (await q2.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  await shot(p2, 'c02_lk_tab2_added');
  // back to tab 1
  await p1.bringToFront(); await sleep(800);
  await shot(p1, 'c03_lk_tab1_after');
  out.tab1Text = (await q.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  out.tab1Banner = await p1.evaluate(() => document.body.innerText.match(/[^\n]*(another tab|Use this tab)[^\n]*/g));
  const useTab = p1.getByRole('button', { name: 'Use this tab' });
  if (await useTab.count()) { await useTab.first().click(); await sleep(2500); }
  out.tab1AfterUse = (await q.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  const addBtn = q.getByRole('button', { name: /^Add \d+ Illumination/ });
  if (await addBtn.count() && await addBtn.isEnabled()) {
    await addBtn.click(); await sleep(1500);
    out.tab1PressedAdd = true;
  }
  out.illumAfterTab1 = L.sql(`select illumination from circles where id=${state.camps.R.circleId}`);
  await shot(p1, 'c04_lk_tab1_add_again');
  out.logLines1 = frames1.filter(f => /activity_log/.test(f)).map(f => JSON.parse(f).payload.message).filter(m => /Illumination|milestone/.test(m));
  // Reload p1: added persists?
  await p1.reload(); await sleep(3500);
  await p1.getByRole('button', { name: 'Circle', exact: true }).first().click().catch(() => {}); await sleep(1000);
  out.afterReload = (await q.innerText()).match(/TOTAL[^\n]*\n[^\n]*/)?.[0];
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
