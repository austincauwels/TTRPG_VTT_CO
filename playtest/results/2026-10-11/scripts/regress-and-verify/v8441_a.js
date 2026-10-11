// Phase 1: scar pending on the Lightkeeper's desk; scar recorded; marks on an incapacitated investigator
const L = require('./v8441_lib');
const { sleep, shot, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const logLines = (page) => page.evaluate(() => document.body.innerText.split('\n').filter((l) => /Bram/.test(l)).slice(-12));
(async () => {
  const B = state.chars.bram.id;
  await L.fresh('bram', 'bram', { body_marks: 3 });
  const browser = await L.launch();
  const lk = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const bram = await L.openSeat(browser, 'phone', { store: await L.storeFor('bram', 'bram', 'S') });
  const ada = await L.openSeat(browser, 'desktop', { store: await L.storeFor('ada', 'ada', 'S') });
  await sleep(5000);
  await shot(lk.page, 'a01_lk_desk');
  await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click();
  await sleep(2500);
  await shot(lk.page, 'a02_lk_sheet_before');
  await lk.page.getByRole('group', { name: 'Deal a mark' }).getByLabel('From an enemy').uncheck();
  await lk.page.getByRole('group', { name: 'Deal a mark' }).getByRole('button', { name: /^body$/i }).click();
  await sleep(3000);
  await lk.page.locator('.mark-status').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(lk.page, 'a03_lk_sheet_incap');
  const sheetText = await lk.page.evaluate(() => { const r = document.querySelector('.mark-status')?.closest('section,div'); return document.body.innerText.match(/(Marks[\s\S]{0,400}?\/ 4)/)?.[1]; });
  console.log('LK sheet after 4th mark:', JSON.stringify(sheetText));
  console.log('LK has Deal a mark enabled:', await lk.page.getByRole('group', { name: 'Deal a mark' }).getByRole('button', { name: /^bleed$/i }).isEnabled());
  console.log('LK revive buttons:', await lk.page.getByRole('button', { name: /^Revive$/ }).count());
  console.log('LK body text has scar/pending:', await lk.page.evaluate(() => (document.body.innerText.match(/[^\n]*(scar|pending)[^\n]*/gi) || []).slice(0, 10)));
  await shot(bram.page, 'a04_bram_scarform');
  console.log('Bram scar dialog:', await bram.page.locator('#scar-title').count());
  // LK roster card (back)
  // Bram records the scar
  await bram.page.locator('input[name=degrade_action][value=survey]').check({ force: true });
  await bram.page.locator('input[name=advance_action][value=move]').check({ force: true });
  await bram.page.fill('#scar-notes', 'A burn across the palm');
  await bram.page.getByRole('button', { name: 'Record scar' }).click();
  await sleep(3000);
  await shot(lk.page, 'a05_lk_after_scar');
  console.log('LK log after scar:', await logLines(lk.page));
  console.log('Ada log after scar:', await logLines(ada.page));
  console.log('LK revive after scar:', await lk.page.getByRole('button', { name: /^Revive$/ }).count(), 'Bram revive:', await bram.page.getByRole('button', { name: /^Revive$/ }).count());
  const lkFramesBefore = lk.frames.length;
  for (let i = 0; i < 4; i++) {
    await lk.page.getByRole('group', { name: 'Deal a mark' }).getByRole('button', { name: /^bleed$/i }).click();
    await sleep(1500);
  }
  await sleep(2000);
  await shot(lk.page, 'a06_lk_after_bleed4');
  console.log('LK log after 4 bleed:', await logLines(lk.page));
  console.log('LK activity frames:', L.framesOf(lk, 'activity_log', 'in').filter((f) => /Bram/.test(f.m.payload.message)).map((f) => f.m.payload.message));
  console.log('DB:', sql(`select body_marks,brain_marks,bleed_marks,incapacitated,scars_count,is_dead from characters where id=${B}`));
  await shot(bram.page, 'a07_bram_after_bleed4');
  console.log('errors', lk.errors.slice(0, 3), bram.errors.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
