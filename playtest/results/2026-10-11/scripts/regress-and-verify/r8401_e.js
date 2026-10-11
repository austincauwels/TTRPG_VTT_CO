// Phase E: circle resources. Cass laptop double-click / 180ms / Enter twice; phone, tablet, 1920 looks; LK pip names
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = {};
const cid = state.camps.R.circleId;
const pool = () => L.sql(`select stitch||'/'||refresh||'/'||train from circles where id=${cid}`);
const spent = (k) => L.sql(`select resources_spent_assignment from characters where id=${state.chars[k].id}`);
const resOf = (p) => p.locator('section[aria-labelledby="circle-resources-title"]');
(async () => {
  const b = await L.launch();
  const lk = await openDesk(b, 'wide', 'lk', null, 'R');
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const lres = lk.page.locator('section[aria-label="Circle resources"]');
  out.lkPips = await lres.locator('[role=button]').evaluateAll(a => a.slice(0, 9).map(e => e.getAttribute('aria-label')));
  out.lkDotted = await lres.locator('[aria-hidden=true][title]').evaluateAll(a => a.slice(0, 2).map(e => e.getAttribute('title')));
  await lres.screenshot({ path: L.DIR + '/out_8401/e00_lk_resources.png' });
  // Locked look on the phone
  const bram = await openDesk(b, 'phone', 'bram', 'bram', 'R');
  await goTab(bram.page, 'Circle');
  const bres = resOf(bram.page); await bres.scrollIntoViewIfNeeded();
  await bres.screenshot({ path: L.DIR + '/out_8401/e01_bram_locked_phone.png' });
  out.bramLocked = (await bres.innerText()).replace(/\n+/g, ' | ');
  await bres.getByRole('button', { name: /Spend 1 Refresh/ }).tap({ force: true }); await sleep(400);
  out.bramLockedTap = { pool: pool(), text: (await bres.innerText()).slice(0, 200).replace(/\n+/g, ' | ') };
  await lk.page.getByRole('button', { name: 'Allow spending' }).click(); await sleep(1200);
  const cass = await openDesk(b, 'laptop', 'cass', 'cass', 'R');
  await goTab(cass.page, 'Circle');
  const cres = resOf(cass.page); await cres.scrollIntoViewIfNeeded();
  await cres.screenshot({ path: L.DIR + '/out_8401/e02_cass_open.png' });
  const btn = cres.getByRole('button', { name: /Refresh/ });
  // 1. a fast double-click
  out.p0 = pool();
  await btn.dblclick(); await sleep(1200);
  out.afterDbl = { pool: pool(), spent: spent('cass'), label: await btn.innerText() };
  await cres.screenshot({ path: L.DIR + '/out_8401/e03_cass_after_dblclick.png' });
  await sleep(4500); // the question lapses
  out.afterLapse = { label: await btn.innerText() };
  // 2. two clicks 180ms apart
  await btn.click(); await sleep(180); await btn.click(); await sleep(1200);
  out.after180 = { pool: pool(), spent: spent('cass'), label: await btn.innerText() };
  await sleep(4500);
  // 3. Enter twice
  await btn.focus(); await cass.page.keyboard.press('Enter'); await sleep(120); await cass.page.keyboard.press('Enter'); await sleep(1200);
  out.afterEnter2 = { pool: pool(), spent: spent('cass'), label: await btn.innerText() };
  await sleep(4500);
  // 4. deliberate: press, wait 700ms, double-click (armed then a double-click)
  await btn.click(); await sleep(700); await btn.dblclick(); await sleep(1500);
  out.afterArmedDbl = { pool: pool(), spent: spent('cass'), label: await btn.innerText() };
  await cres.screenshot({ path: L.DIR + '/out_8401/e04_cass_spent1.png' });
  // 5. Enter held: press, then hold Enter ~1.2s (auto-repeat)
  const train = cres.getByRole('button', { name: /Train/ });
  await train.focus();
  await cass.page.keyboard.down('Enter');
  for (let i = 0; i < 30; i++) { await sleep(40); await cass.page.keyboard.down('Enter'); } // repeat events
  await cass.page.keyboard.up('Enter'); await sleep(1500);
  out.afterHeldEnter = { pool: pool(), spent: spent('cass') };
  await cres.screenshot({ path: L.DIR + '/out_8401/e05_cass_after_held_enter.png' });
  out.cassText = (await cres.innerText()).replace(/\n+/g, ' | ');
  out.cassLogs = L.parsed(cass, 'in').filter(x => x.m.type === 'activity_log').map(x => x.m.payload.message).filter(m => /used/.test(m));
  // Tablet and 1920 looks
  const dev = await openDesk(b, 'tablet', 'dev', 'dev', 'R');
  await goTab(dev.page, 'Circle');
  const dres = resOf(dev.page); await dres.scrollIntoViewIfNeeded();
  await dev.page.screenshot({ path: L.DIR + '/out_8401/e06_dev_tablet_resources.png' });
  out.devBtnH = await dres.getByRole('button').evaluateAll(a => a.map(e => Math.round(e.getBoundingClientRect().height)));
  await dres.getByRole('button', { name: /Stitch/ }).tap(); await sleep(300);
  await dres.screenshot({ path: L.DIR + '/out_8401/e07_dev_asked.png' });
  const ada = await openDesk(b, 'desktop', 'ada', 'ada', 'R');
  await goTab(ada.page, 'Circle');
  await shot(ada.page, 'e08_ada_1920_circle');
  out.bramOpenText = (await bres.innerText()).slice(0, 300).replace(/\n+/g, ' | ');
  await bres.screenshot({ path: L.DIR + '/out_8401/e09_bram_open_phone.png' });
  out.bramBtnH = await bres.getByRole('button').evaluateAll(a => a.map(e => Math.round(e.getBoundingClientRect().height)));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
