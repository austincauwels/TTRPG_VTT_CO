// LK 1440x900: reports open, two players send, report cards for SR, End Assignment (reports, wording, gear), LK copy of Dev's sheet
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const clickTab = async (p, name) => { const t = p.getByRole('tab', { name: new RegExp(`^${name}`, 'i') }); if (await t.count()) await t.first().click(); else await p.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).first().click(); await sleep(900); };
(async () => {
  const b = await L.launch();
  // clear waiting picks so the dialogs stay out of the way
  sql(`update characters set advancement_picks=0 where campaign_id=${state.camps.S.id}`);
  sql(`update characters set gear='["Lantern","Crowbar"]' where id=${state.chars.a.id}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const ir = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  const br = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  await L.shot(lk.page, 'd00_lk_start');
  console.log(await lk.page.getByRole('button').allInnerTexts());
  await clickTab(lk.page, 'Circle');
  if (await lk.page.getByRole('button', { name: 'Open reports' }).count()) { await lk.page.getByRole('button', { name: 'Open reports' }).click(); await sleep(1200); }
  // Iris files (desktop)
  await clickTab(ir.page, 'Circle');
  const irBoxes = ir.page.locator('#circle-report-title').locator('xpath=ancestor::*[contains(@class,"")][1]').locator('input[type=checkbox]');
  const nIr = await ir.page.locator('input[type=checkbox]').count();
  console.log('iris checkboxes', nIr);
  await ir.page.locator('input[type=checkbox]').nth(0).check();
  await ir.page.locator('input[type=checkbox]').nth(2).check().catch(() => {});
  await ir.page.getByRole('button', { name: /^Send report$/ }).click(); await sleep(1500);
  await L.shot(ir.page, 'd01_iris_sent');
  // Bram files (phone): open menu → Circle
  const menu = br.page.getByRole('button', { name: /^Menu/ });
  await menu.first().tap(); await sleep(700);
  await br.page.getByRole('button', { name: /^Circle/ }).first().tap().catch(e => console.log('bram circle', e.message)); await sleep(1200);
  await br.page.locator('input[type=checkbox]').nth(1).check().catch(e => console.log('bram check', e.message));
  await br.page.getByRole('button', { name: /^Send report$/ }).tap().catch(e => console.log('bram send', e.message)); await sleep(1500);
  await L.shot(br.page, 'd02_bram_sent');
  console.log('reports stored', sql(`select backstory_answers->'reports' from circles where id=${state.camps.S.circleId}`).slice(0, 400));
  await sleep(800);
  await L.shot(lk.page, 'd03_lk_circle_reports', { fullPage: true });
  // Turn Iris's card
  const front = lk.page.getByRole('button', { name: /^Iris Vane: read the report/ });
  console.log('front count', await front.count());
  await front.first().focus(); await lk.page.keyboard.press('Enter'); await sleep(1200);
  console.log('focus after turn:', await lk.page.evaluate(() => document.activeElement?.tagName + ' ' + document.activeElement?.textContent.slice(0, 60)));
  const back = lk.page.locator('h3,h4,h2', { hasText: /Iris.*Report/i }).first().locator('xpath=..');
  console.log('BACK aria snapshot:\n' + await back.ariaSnapshot().catch(e => 'ERR ' + e.message));
  await L.shot(lk.page, 'd04_lk_card_turned');
  await lk.page.keyboard.press('Escape'); await sleep(900);
  console.log('focus after Escape:', await lk.page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('aria-label') || '')));
  console.log('dialog still? (GM page)', await lk.page.locator('[role=dialog]').count());
  // End Assignment
  await clickTab(lk.page, 'Roster');
  await lk.page.getByRole('button', { name: /^End Assignment$/ }).click(); await sleep(500);
  await L.shot(lk.page, 'd05_lk_end_armed');
  console.log('armed hint:', await lk.page.getByText(/Press again to end it/).innerText().catch(() => 'none'));
  await lk.page.getByRole('button', { name: /Yes, end it/ }).click(); await sleep(2500);
  await L.shot(lk.page, 'd06_lk_after_end');
  console.log('receipt:', await lk.page.getByText(/Assignment ended at/).innerText().catch(() => 'none'));
  console.log('ledger reports:', await lk.page.evaluate(() => { const dt = [...document.querySelectorAll('dt')].find(d => d.textContent.trim() === 'Reports'); return dt ? dt.parentElement.innerText.replace(/\s+/g, ' ') : 'no ledger'; }));
  console.log('LK log end:', JSON.stringify(await lk.page.evaluate(() => [...document.querySelectorAll('*')].filter(e => /Assignment ended/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()))));
  await clickTab(lk.page, 'Circle');
  await L.shot(lk.page, 'd07_lk_circle_after_end', { fullPage: true });
  console.log('LK cards after end:', JSON.stringify(await lk.page.evaluate(() => [...document.querySelectorAll('[role=button]')].map(e => e.getAttribute('aria-label')).filter(x => x && /report/.test(x)))));
  console.log('LK reports toggle:', await lk.page.getByRole('button', { name: /reports$/ }).allInnerTexts());
  console.log('DB', sql(`select reports_open, backstory_answers->'reports', backstory_answers->'assignment' from circles where id=${state.camps.S.circleId}`));
  console.log('DB gear', sql(`select name, gear from characters where campaign_id=${state.camps.S.id}`));
  // Player desks: live and after reload
  console.log('iris circle tab live:', (await ir.page.locator('#circle-report-title').locator('xpath=..').innerText()).replace(/\s+/g, ' ').slice(-260));
  await L.shot(ir.page, 'd08_iris_after_end_live');
  await br.page.reload(); await sleep(4500);
  await br.page.getByRole('button', { name: /^Menu/ }).first().tap(); await sleep(700);
  await br.page.getByRole('button', { name: /^Circle/ }).first().tap().catch(() => {}); await sleep(1200);
  const sendBtn = br.page.getByRole('button', { name: /Send report/ });
  console.log('bram after reload: send buttons', await sendBtn.count(), 'disabled', await sendBtn.first().isDisabled().catch(() => '?'), 'checked boxes', await br.page.locator('input[type=checkbox]:checked').count());
  await br.page.locator('#circle-report-title').scrollIntoViewIfNeeded();
  await L.shot(br.page, 'd09_bram_reload_circle');
  // reopen reports: old reports should not come back
  await lk.page.getByRole('button', { name: 'Open reports' }).click(); await sleep(1500);
  console.log('after reopen ledger', await lk.page.evaluate(() => [...document.querySelectorAll('[role=button]')].map(e => e.getAttribute('aria-label')).filter(x => x && /report/.test(x))));
  console.log('iris form after reopen:', (await ir.page.locator('#circle-report-title').locator('xpath=..').innerText()).replace(/\s+/g, ' ').slice(-200), 'checked', await ir.page.locator('input[type=checkbox]:checked').count());
  await L.shot(ir.page, 'd10_iris_after_reopen');
  await lk.page.getByRole('button', { name: 'Close reports' }).click(); await sleep(800);
  console.log('errors', lk.errors, ir.errors, br.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
