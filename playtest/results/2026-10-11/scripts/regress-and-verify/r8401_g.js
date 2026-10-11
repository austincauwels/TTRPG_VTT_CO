const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = {};
(async () => {
  const b = await L.launch();
  // 1. Pre-seal resources: LK of F at 1440 on Circle, approve four
  const lkf = await openDesk(b, 'wide', 'lkf', null, 'F');
  await lkf.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const res = lkf.page.locator('section[aria-label="Circle resources"]');
  out.preBefore = (await res.innerText()).replace(/\n+/g, ' | ');
  for (const k of ['fi', 'fb', 'fc', 'fd']) { await L.api('POST', `/campaign/approve/${state.chars[k].id}`, state.users.lkf.token); await sleep(700); }
  await sleep(1500);
  await shot(lkf.page, 'g01_lkf_after_4_approvals');
  out.preAfter = (await res.innerText()).replace(/\n+/g, ' | ');
  out.preAfterSr = await res.locator('.sr-only').allInnerTexts();
  await lkf.page.reload(); await sleep(4000);
  await lkf.page.getByRole('button', { name: 'Circle', exact: true }).first().click().catch(() => {}); await sleep(1200);
  out.preReloadSr = await res.locator('.sr-only').allInnerTexts();
  out.preReloadNote = (await res.innerText()).match(/Each player[^\n]*/)?.[0];
  await res.screenshot({ path: L.DIR + '/out_8401/g02_lkf_resources_reload.png' });
  // 2. Stray tape: empty campaign at 1440
  const lke = await openDesk(b, 'wide', 'lke', null, 'E');
  await lke.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1500);
  await shot(lke.page, 'g03_lke_empty_circle');
  out.tape = await lke.page.evaluate(() => [...document.querySelectorAll('section.circle-paper > span[aria-hidden].absolute')].map(t => { const r = t.getBoundingClientRect(); const s = t.parentElement.getBoundingClientRect(); return { tape: [Math.round(r.x), Math.round(r.y), Math.round(r.width)], paper: [Math.round(s.x), Math.round(s.y), Math.round(s.width)], rects: t.getClientRects().length }; }));
  // 3. Insignia close-up on R
  const lk = await openDesk(b, 'wide', 'lk', null, 'R');
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  const ins = lk.page.locator('[role=img][aria-label^="Insignia"]');
  out.insignia = { label: await ins.getAttribute('aria-label'), title: await ins.getAttribute('title'), visibleCompass: await lk.page.locator('section[aria-label="Circle charter"]').innerText().then(t => /Compass/i.test(t)) };
  await lk.page.locator('section[aria-label="Circle charter"]').screenshot({ path: L.DIR + '/out_8401/g04_lk_charter.png' });
  // Lightkeeper's Pass Notes
  await lk.page.getByRole('button', { name: 'Roster', exact: true }).first().click(); await sleep(1200);
  const lkTo = lk.page.locator('[data-desk="passnotes"]');
  out.lkPassNotesCount = await lkTo.count();
  if (out.lkPassNotesCount) {
    await lkTo.locator('button').first().click(); await sleep(500);
    out.lkTargets = await lk.page.evaluate(() => [...document.querySelectorAll('[role=option], [role=listbox] button, ul li button')].map(e => e.textContent.trim()).slice(0, 12));
    await shot(lk.page, 'g05_lk_passnotes');
    await lk.page.keyboard.press('Escape');
  }
  // 4. Bram phone Pass Notes
  const bram = await openDesk(b, 'phone', 'bram', 'bram', 'R');
  await goTab(bram.page, 'Pass notes');
  const pn = bram.page.locator('[data-desk="passnotes"]');
  await pn.locator('button').first().tap(); await sleep(600);
  out.bramTargets = await bram.page.evaluate(() => [...document.querySelectorAll('[role=option], [role=listbox] button, ul li button')].map(e => e.textContent.trim()).slice(0, 12));
  await shot(bram.page, 'g06_bram_passnotes_to');
  // 5. Bram phone circle charter: milestone pips, any caption
  await bram.page.keyboard.press('Escape').catch(() => {});
  await goTab(bram.page, 'Circle');
  const ch = bram.page.locator('section[aria-labelledby="circle-charter-name"]');
  await ch.screenshot({ path: L.DIR + '/out_8401/g07_bram_charter_phone.png' });
  out.bramCharter = (await ch.innerText()).replace(/\n+/g, ' | ');
  out.pipTitles = await ch.locator('[title]').evaluateAll(a => a.map(e => e.title).slice(0, 4));
  // 6. Dev tablet Your Circle cards
  const dev = await openDesk(b, 'tablet', 'dev', 'dev', 'R');
  await goTab(dev.page, 'Circle');
  const yc = dev.page.getByText('Your Circle', { exact: true }).first();
  if (await yc.count()) { await yc.scrollIntoViewIfNeeded(); await sleep(400); await shot(dev.page, 'g08_dev_your_circle'); }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
