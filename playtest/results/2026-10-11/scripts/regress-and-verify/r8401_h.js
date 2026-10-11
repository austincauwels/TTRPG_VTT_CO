const L = require('./r8401_lib');
const { sleep, shot, state } = L;
const out = {};
(async () => {
  const b = await L.launch();
  const store = await L.storeFor('cass', 'cass', 'R');
  store.stage = 'HOME';
  const ctx = await b.newContext({ ...L.DEVICES.laptop });
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('sd')) { localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); sessionStorage.setItem('sd', '1'); } } catch {} }, store);
  const p = await ctx.newPage();
  await p.goto('data:text/html,<h1>before the site</h1>');
  await p.goto(L.SITE + '/'); await sleep(3500);
  await shot(p, 'h01_hub');
  const state1 = async () => p.evaluate(() => ({ url: location.href, hub: !!document.querySelector('.hub-tomes'), desk: /Investigator's Desk|MEMBER ID/i.test(document.body.innerText), len: history.length }));
  out.hub = await state1();
  // Open the desk from the hub: the Case Ledger, then Cass's character
  await p.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1000);
  await shot(p, 'h02_ledger');
  await p.getByRole('button', { name: /Cass Morrow/ }).first().click(); await sleep(3500);
  out.desk = await state1();
  await shot(p, 'h03_desk');
  await p.goBack(); await sleep(2500);
  out.afterBack = await state1();
  await shot(p, 'h04_after_back');
  await p.goForward(); await sleep(3000);
  out.afterForward = await state1();
  // reload on the desk, then Back
  await p.reload(); await sleep(4000);
  out.afterReload = await state1();
  await p.goBack(); await sleep(2500);
  out.afterReloadBack = await state1();
  await shot(p, 'h05_after_reload_back');
  // Leave by the button, then Back once more
  await p.goForward(); await sleep(3000);
  const btn = p.getByRole('button', { name: /Back to chapter hub/i });
  if (await btn.count()) { await btn.first().click(); await sleep(2500); out.afterButton = await state1(); await p.goBack(); await sleep(2500); out.afterButtonBack = await state1(); await shot(p, 'h06_after_button_back'); }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
