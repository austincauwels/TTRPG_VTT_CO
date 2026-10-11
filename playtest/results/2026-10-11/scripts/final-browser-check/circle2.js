// Circle group + stale burn after End Assignment
const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
const C = state.camps.S.circleId;
const illum = () => Number(sql(`select illumination from circles where id=${C}`));
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
const tallyText = (p) => p.locator('[aria-label="Illumination questions"]').first().innerText().then(t => t.replace(/\s+/g, ' ')).catch(e => 'ERR ' + e.message);
(async () => {
  const b = await L.launch();
  const A = await L.desk(b, 'wide', 'lk', null, 'S'); const P = A.page;
  // --- stale burn: Cass laptop and Dev tablet each roll until a burn is offered
  const cs = await L.desk(b, 'laptop', 'cass', 'cass', 'S');
  const dv = await L.desk(b, 'tablet', 'dev', 'dev', 'S');
  const getBurn = async (seat, label) => { for (let i = 0; i < 8; i++) { { const d0 = seat.page.locator('[data-keep-die]'); if (await d0.count()) { await d0.nth(0).focus(); await seat.page.keyboard.press('Enter'); await sleep(2000); } } const bt = seat.page.locator(`button[data-roll-row][aria-label^="Roll ${label}"]`).first(); await bt.scrollIntoViewIfNeeded(); await bt.click(); await sleep(3000); const d = seat.page.locator('[data-keep-die]'); if (await d.count()) { await d.nth(0).focus(); await seat.page.keyboard.press('Enter'); await sleep(2000); } const ab = await afterBox(seat.page); if (ab && /burn/i.test(ab)) return ab; } return null; };
  const devBurn = await getBurn(dv, 'Read');
  const cassBurn = await getBurn(cs, 'Read');
  await shot(cs.page, 'c08_cass_burn_offered');
  // Change Gear dialog wording on Dev's tablet
  await dv.page.getByRole('button', { name: /^Change gear/i }).first().click(); await sleep(800);
  const gearTxt = await dv.page.locator('[role=dialog]').last().innerText().then(t => t.replace(/\s+/g, ' ')).catch(() => '');
  await shot(dv.page, 'c09_dev_change_gear');
  await dv.page.keyboard.press('Escape'); await sleep(400);
  // End Assignment for real
  await L.goTab(P, 'Roster'); await sleep(600);
  await P.getByRole('button', { name: /^End Assignment/i }).first().click(); await sleep(800);
  const armed2 = await P.evaluate(() => (document.body.innerText.match(/Press again[^\n]*/) || [''])[0]);
  const warn2 = await P.evaluate(() => /not added yet/.test(document.body.innerText));
  await shot(P, 'c10_end_armed_added');
  await P.getByRole('button', { name: /^Yes, end it/i }).first().click(); await sleep(3000);
  const receipt = await P.evaluate(() => (document.body.innerText.match(/Assignment ended at[^\n]*/) || [''])[0]);
  const lkLine = (await L.logLines(P)).filter(l => /gear/.test(l)).slice(-1);
  await shot(P, 'c11_end_receipt');
  const gear = sql(`select string_agg(gear::text, ' ') from characters where campaign_id=${state.camps.S.id} and status='active'`);
  check('end-assignment-gear-wording', 'confirm, receipt, log and Change Gear say everyone\'s gear is cleared', /everyone's gear is cleared/.test(armed2) && /everyone's gear is cleared/.test(receipt) && /everyone's gear is cleared/.test(lkLine.join()) && /everyone's gear is cleared/.test(gearTxt) && !/marked gear/i.test(armed2 + receipt + lkLine + gearTxt), { armed2, receipt, lkLine, gearTxt: gearTxt.slice(0, 400), gear });
  check('end-assignment-drops-unadded-tally', 'no warning once the tally is added', !warn2, { warn2 });
  await sleep(1500);
  const cAfter = await afterBox(cs.page), dAfter = await afterBox(dv.page);
  await shot(cs.page, 'c12_cass_after_end'); await shot(dv.page, 'c13_dev_after_end');
  await cs.page.reload(); await sleep(5000);
  const cReload = await afterBox(cs.page);
  // a Refresh spend: resistance full again, still no burn
  await sql(`update circles set resources_editable=true where id=${C}`);
  check('stale-burn-offer-after-end-assignment', 'Burn and reroll goes at End Assignment, and stays gone after a reload', !!devBurn && !!cassBurn && !/burn/i.test(cAfter || '') && !/burn/i.test(dAfter || '') && !/burn/i.test(cReload || ''), { devBurn, cassBurn, cAfter, dAfter, cReload });
  // Circle page after: reports closed, tally gone
  await L.goTab(P, 'Circle'); await sleep(800);
  const tEnd = await tallyText(P);
  await shot(P, 'c14_circle_after_end');
  console.log('circle after end', tEnd.slice(0, 400));
  console.log('errors', A.errors, cs.errors, dv.errors);
  L.saveResults('circle_results.json');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
