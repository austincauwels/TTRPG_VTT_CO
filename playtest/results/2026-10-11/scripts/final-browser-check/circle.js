// Circle group + stale burn after End Assignment
const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
const C = state.camps.S.circleId;
const illum = () => Number(sql(`select illumination from circles where id=${C}`));
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
const tallyText = (p) => p.locator('[aria-label="Illumination questions"]').first().innerText().then(t => t.replace(/\s+/g, ' ')).catch(e => 'ERR ' + e.message);
(async () => {
  for (const k of ['ada', 'bram', 'cass', 'dev']) await L.fresh(k, k, k === 'cass' ? { intuition_current: 4 } : {});
  sql(`update characters set resources_spent_assignment=0, gear='["Lantern"]' where campaign_id=${state.camps.S.id}`);
  sql(`update circles set illumination=0, stitch=2, refresh=2, train=2, reports_open=false, resources_editable=false where id=${C}`);
  const b = await L.launch();
  const A = await L.desk(b, 'wide', 'lk', null, 'S'); const P = A.page;
  await L.goTab(P, 'Circle'); await sleep(800);
  await P.getByRole('button', { name: /^Open reports/ }).first().click(); await sleep(1200);
  await P.getByRole('button', { name: /^Allow spending/ }).first().click(); await sleep(1200);
  // reports: Bram and Cass file a key; spends: Bram spends Refresh and Stitch
  const so = {};
  for (const k of ['bram', 'cass', 'ada', 'dev']) so[k] = await L.wsOpen(state.chars[k].id, state.users[k].token);
  await sleep(500);
  for (const k of ['bram', 'cass']) so[k].send('submit_assignment_report', { circle_id: C, character_id: state.chars[k].id, responses: { keys_detail: { k1: true }, notes: 'We found it.' } });
  for (const k of ['ada', 'dev']) so[k].send('submit_assignment_report', { circle_id: C, character_id: state.chars[k].id, responses: { keys_detail: {}, notes: 'Nothing.' } });
  await sleep(800);
  so.bram.send('spend_resource', { circle_id: C, resource_type: 'refresh' }); await sleep(700);
  so.bram.send('spend_resource', { circle_id: C, resource_type: 'stitch' }); await sleep(700);
  Object.values(so).forEach(s => s.close());
  console.log('after spends', sql(`select refresh, stitch, train from circles where id=${C}`), sql(`select resources_spent_assignment from characters where id=${state.chars.bram.id}`));
  await sleep(1500);
  await P.reload(); await sleep(5000); await L.goTab(P, 'Circle'); await sleep(1000);
  const t0 = await tallyText(P);
  await shot(P, 'c01_circle_reports_filed');
  // End Assignment armed with an unadded tally: warning, then Keep going
  await L.goTab(P, 'Roster'); await sleep(800);
  await P.getByRole('button', { name: /^End Assignment/i }).first().click(); await sleep(800);
  const armed1 = await P.evaluate(() => (document.body.innerText.match(/[^\n]*not added yet[^\n]*\n?[^\n]*/) || [''])[0] + ' || ' + (document.body.innerText.match(/Press again[^\n]*/) || [''])[0]);
  await shot(P, 'c02_end_armed_unadded');
  await P.getByRole('button', { name: /^Keep going/i }).first().click(); await sleep(600);
  check('end-assignment-drops-unadded-tally', 'armed hint warns of the unadded tally and says reports clear', /2 Illumination is not added yet/.test(armed1) && /reports are closed and cleared/i.test(armed1) && /everyone's gear is cleared/.test(armed1), armed1);
  // --- tally in two places
  const B = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') }); await sleep(5000);
  await L.goTab(B.page, 'Circle'); await sleep(800);
  const qs = B.page.locator('[aria-label="Illumination questions"] input[type=checkbox]');
  await qs.nth(0).click(); await sleep(1500);
  const tb = await tallyText(B.page);
  const before = illum();
  await B.page.getByRole('button', { name: /^Add \d+ Illumination/ }).first().click(); await sleep(2500);
  const afterB = illum();
  const tbAfter = await tallyText(B.page);
  await shot(B.page, 'c03_tabB_added');
  // tab A: still shows? then Use this tab
  const aStale = await tallyText(P);
  await shot(P, 'c04_tabA_stale');
  await P.getByRole('button', { name: /Use this tab/i }).click(); await sleep(3500);
  await L.goTab(P, 'Circle'); await sleep(800);
  const aNow = await tallyText(P);
  const aAddBtn = await P.getByRole('button', { name: /^Add \d+ Illumination/ }).count();
  await shot(P, 'c05_tabA_after_use');
  // a fresh browser
  const D = await L.openSeat(b, 'laptop', { store: await L.storeFor('lk', null, 'S') }); await sleep(5000);
  await L.goTab(D.page, 'Circle'); await sleep(800);
  const dNow = await tallyText(D.page); const dAdd = await D.page.getByRole('button', { name: /^Add \d+ Illumination/ }).count();
  await shot(D.page, 'c06_fresh_browser');
  // the server refuses a second add
  const g = await L.wsOpen(state.camps.S.code, state.users.lk.token); await sleep(500);
  g.send('gm_add_tally', { circle_id: C, keys: 2 }); await sleep(1200);
  const refusal = g.frames.filter(f => f.type === 'action_rejected').map(f => f.payload.detail);
  g.close();
  check('illumination-tally-added-twice', 'added once; other tab and fresh browser show Added, second add refused', before === 0 && afterB === 3 && /Added 3/.test(aNow) && aAddBtn === 0 && /Added 3/.test(dNow) && dAdd === 0 && illum() === 3 && refusal.length === 1, { tb, tbAfter, before, afterB, aStale, aNow, aAddBtn, dNow, dAdd, final: illum(), refusal });
  await D.ctx.close(); await B.ctx.close();
  // --- spend back (LK laptop 1440 = P, reclaim tab)
  await P.getByRole('button', { name: /Use this tab/i }).click().catch(() => {}); await sleep(3000);
  await L.goTab(P, 'Roster'); await sleep(800);
  await P.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
  const sel = P.getByLabel(/Put back in the pool/i).first();
  const opts = await sel.locator('option').evaluateAll(os => os.map(o => `${o.textContent}${o.disabled ? '(disabled)' : ''}`));
  await sel.selectOption('refresh'); await sleep(300);
  const mk = A.frames.length;
  await P.getByRole('button', { name: /^Give a spend back/i }).first().dblclick(); await sleep(2500);
  const sent = L.parsed(A, 'out', mk).filter(x => x.m.type === 'gm_return_spend').length;
  const after1 = { spent: sql(`select resources_spent_assignment from characters where id=${state.chars.bram.id}`), pool: sql(`select refresh, stitch from circles where id=${C}`) };
  await shot(P, 'c07_spend_back_dbl');
  check('spend-back-unguarded-past-maximum', 'double-click gives one spend back', sent === 1 && after1.spent === '1' && after1.pool.startsWith('2|'), { opts, sent, after1 });
  // full pool: refresh at max (1 + 4 members = 5)
  sql(`update circles set refresh=5 where id=${C}`);
  await P.reload(); await sleep(5000);
  await P.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
  const opts2 = await P.getByLabel(/Put back in the pool/i).first().locator('option').evaluateAll(os => os.map(o => `${o.textContent}${o.disabled ? '(disabled)' : ''}`));
  const g2 = await L.wsOpen(state.camps.S.code, state.users.lk.token); await sleep(500);
  g2.send('gm_return_spend', { character_id: state.chars.bram.id, resource_type: 'refresh', circle_id: C }); await sleep(1500);
  const line = g2.frames.filter(f => f.type === 'activity_log').map(f => f.payload.message); g2.close();
  const after2 = { spent: sql(`select resources_spent_assignment from characters where id=${state.chars.bram.id}`), refresh: sql(`select refresh from circles where id=${C}`) };
  check('spend-back-unguarded-past-maximum', 'a full Refresh is shown full and never passes its max', opts2.some(o => /Refresh \(full\)\(disabled\)/.test(o)) && after2.refresh === '5' && after2.spent === '0', { opts2, after2, line });
  sql(`update circles set refresh=2 where id=${C}`);
  await P.getByRole('button', { name: /Use this tab/i }).click().catch(() => {}); await sleep(3000);
  // --- stale burn: Cass laptop and Dev tablet each roll until a burn is offered
  const cs = await L.desk(b, 'laptop', 'cass', 'cass', 'S');
  const dv = await L.desk(b, 'tablet', 'dev', 'dev', 'S');
  const getBurn = async (seat, label) => { for (let i = 0; i < 8; i++) { const bt = seat.page.locator(`button[data-roll-row][aria-label^="Roll ${label}"]`).first(); await bt.scrollIntoViewIfNeeded(); await bt.click(); await sleep(3000); const d = seat.page.locator('[data-keep-die]'); if (await d.count()) { await d.nth(0).focus(); await seat.page.keyboard.press('Enter'); await sleep(2000); } const ab = await afterBox(seat.page); if (ab && /burn/i.test(ab)) return ab; } return null; };
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
