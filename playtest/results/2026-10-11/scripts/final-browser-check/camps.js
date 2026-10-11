const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
(async () => {
  const b = await L.launch();
  // --- join requests (LK 1440 on Open Doors)
  const gm = await L.desk(b, 'wide', 'lk', null, 'J');
  await shot(gm.page, 'k01_join_desk');
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const t = await gm.page.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => /Join Requests?/i.test(e.textContent) && e.children.length === 0); const box = h?.closest('section,article,div[class*="relative"]'); return (box?.parentElement?.innerText || document.body.innerText).replace(/\s+/g, ' ').slice(0, 600); });
    seen.push(t);
    await shot(gm.page, `k02_join_req_${i}`);
    const next = gm.page.getByRole('button', { name: /next/i }).first();
    if (await next.count() && await next.isEnabled()) { await next.click(); await sleep(800); } else break;
  }
  const allTxt = seen.join(' || ');
  const cu = state.users.cass.username, du = state.users.dev.username;
  check('join-requests-hide-the-player', 'each request names the player and flags a second request', allTxt.includes(`from ${cu}`) && allTxt.includes(`from ${du}`) && /Sent another request too/.test(allTxt), seen.map(s => s.slice(0, 300)));
  // --- retire Side Case while Cass sits on the hub
  const cass = await L.openSeat(b, 'laptop');
  await L.signIn(cass.page, 'cass');
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  const before = (await cass.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await shot(cass.page, 'k03_cass_ledger_before');
  await cass.page.getByRole('button', { name: /Close book/i }).first().click().catch(() => {}); await sleep(800);
  const tomeBefore = await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label');
  const gmB = await L.desk(b, 'wide', 'lk', null, 'B');
  await gmB.page.getByRole('button', { name: /Retire campaign/i }).first().click(); await sleep(600);
  const armed = await gmB.page.evaluate(() => (document.body.innerText.match(/Press again to retire[^\n]*/) || [''])[0]);
  await shot(gmB.page, 'k04_gm_retire_armed');
  await gmB.page.getByRole('button', { name: /Yes, retire/i }).first().click(); await sleep(3500);
  const db = sql(`select name, status, coalesce(campaign_id::text,'null') from characters where name in ('Mina Vale','Ivo Pell') order by id`);
  await sleep(1500);
  const tomeAfter = await cass.page.getByRole('button', { name: /Case Ledger/ }).first().getAttribute('aria-label');
  await cass.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1500);
  const after = (await cass.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await shot(cass.page, 'k05_cass_ledger_after_noreload');
  const minaIdx = after.indexOf('Mina Vale');
  check('retire-hides-its-investigators', 'retire frees the living investigators (DB) and the confirm wording', /Mina Vale\|unaffiliated\|null|Mina Vale\|[a-z]+\|null/.test(db), { db, armed });
  check('hub-stale-after-campaign-retired', 'hub ledger updates without a reload', !/Side Case/.test(after) && minaIdx >= 0 && tomeAfter !== tomeBefore, { tomeBefore, tomeAfter, minaContext: after.slice(Math.max(0, minaIdx - 150), minaIdx + 150), sideCaseShown: /Side Case/.test(after) });
  // LK hub after
  await gmB.page.getByRole('button', { name: /Back to chapter hub/i }).first().click().catch(() => {}); await sleep(2500);
  await shot(gmB.page, 'k06_lk_hub_after_retire');
  console.log('errors', gm.errors, cass.errors, gmB.errors);
  L.saveResults('camps.json');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
