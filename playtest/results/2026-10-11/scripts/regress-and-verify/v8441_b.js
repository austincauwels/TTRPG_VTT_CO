// Phase 2: the fourth scar; who hears of the death; what the dead can still do; the take-back
const L = require('./v8441_lib');
const { sleep, shot, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const tail = (page, re = /Bram|deceased|died/) => page.evaluate((src) => { const r = new RegExp(src); return document.body.innerText.split('\n').filter((l) => r.test(l)).slice(-8); }, re.source);
(async () => {
  const B = state.chars.bram.id;
  await L.fresh('bram', 'bram', { body_marks: 3, scars_count: 3, scars_list: `'["One (-1 Survey, +1 Move)","Two","Three"]'` });
  const browser = await L.launch();
  const lk = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const bram = await L.openSeat(browser, 'phone', { store: await L.storeFor('bram', 'bram', 'S') });
  const ada = await L.openSeat(browser, 'desktop', { store: await L.storeFor('ada', 'ada', 'S') });
  const dev = await L.openSeat(browser, 'tablet', { store: await L.storeFor('dev', 'dev', 'S') });
  await sleep(5000);
  await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click();
  await sleep(2500);
  const deal = lk.page.getByRole('group', { name: 'Deal a mark' });
  await deal.getByLabel('From an enemy').uncheck();
  await deal.getByRole('button', { name: /^body$/i }).click();
  await sleep(3000);
  const mark = { lk: lk.frames.length, ada: ada.frames.length, dev: dev.frames.length, bram: bram.frames.length };
  await shot(bram.page, 'b01_bram_fourth_scar_form');
  await bram.page.locator('input[name=degrade_action][value=control]').check({ force: true });
  await bram.page.locator('input[name=advance_action][value=sense]').check({ force: true });
  await bram.page.fill('#scar-notes', 'The last one');
  await bram.page.getByRole('button', { name: 'Record scar' }).click();
  await sleep(3500);
  console.log('DB after 4th scar:', sql(`select scars_count,is_dead,incapacitated from characters where id=${B}`));
  for (const [k, s] of Object.entries({ lk, ada, dev, bram })) {
    const fr = L.parsed(s, 'in', mark[k]).map((x) => x.m.type + (x.m.type === 'activity_log' ? `:${x.m.payload.message}` : ''));
    console.log(`${k} frames after scar:`, JSON.stringify(fr));
    console.log(`${k} log tail:`, JSON.stringify(await tail(s.page)));
  }
  await shot(bram.page, 'b02_bram_death_modal');
  await shot(lk.page, 'b03_lk_after_death');
  await shot(ada.page, 'b04_ada_after_death');
  await shot(dev.page, 'b05_dev_after_death');
  // Bram stays on the sheet
  await bram.page.getByRole('button', { name: 'Stay and look at the sheet' }).click();
  await sleep(1000);
  const rollBtns = bram.page.locator('button[data-roll-row]');
  console.log('Bram roll rows:', await rollBtns.count(), 'aria-disabled:', await rollBtns.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-disabled'))));
  console.log('Bram take-mark buttons:', await bram.page.getByRole('button', { name: /Take (Body|Brain|Bleed) mark/ }).count(),
    'Change gear:', await bram.page.getByRole('button', { name: /Change gear/i }).count(), 'Revive:', await bram.page.getByRole('button', { name: /^Revive$/ }).count());
  await shot(bram.page, 'b06_bram_dead_sheet', { fullPage: true });
  const adaMark = ada.frames.length;
  const focus = bram.page.getByRole('button', { name: /^Roll Focus/ });
  await focus.scrollIntoViewIfNeeded();
  await focus.click();
  await sleep(4000);
  // a gilded die? press Enter on it if a choice waits
  await shot(bram.page, 'b07_bram_dead_roll');
  console.log('Ada frames after dead roll:', JSON.stringify(L.parsed(ada, 'in', adaMark).filter((x) => /activity_log|roll/.test(x.m.type)).map((x) => x.m.type + ':' + (x.m.payload.message || ''))));
  await shot(ada.page, 'b08_ada_after_dead_roll');
  // A spend and a mark from the dead man's socket (as the desk would send them)
  const refreshBefore = sql(`select refresh,stitch from circles where id=${state.camps.S.circleId}`);
  const sock = await L.wsOpen(B, state.users.bram.token);
  await sleep(800);
  sock.send('spend_resource', { circle_id: state.camps.S.circleId, resource_type: 'refresh' });
  await sleep(1500);
  sock.send('take_mark', { mark_type: 'brain' });
  await sleep(2500);
  console.log('Circle refresh,stitch before/after dead spend:', refreshBefore, '->', sql(`select refresh,stitch from circles where id=${state.camps.S.circleId}`));
  console.log('Bram sheet after dead take_mark:', sql(`select brain_marks,is_dead from characters where id=${B}`));
  console.log('Dead socket frames:', JSON.stringify(sock.frames.map((f) => f.type + (f.payload?.message ? ':' + f.payload.message : f.payload?.detail ? ':' + f.payload.detail : ''))));
  sock.close();
  // Bram's Circle page: the spend buttons
  await bram.page.getByRole('button', { name: /Menu/i }).first().click();
  await sleep(800);
  await bram.page.getByRole('button', { name: /^Circle/ }).first().click().catch(async () => { await bram.page.getByText(/^Circle$/).first().click(); });
  await sleep(2000);
  const spends = bram.page.getByRole('button', { name: /Spend 1/ });
  console.log('Bram Circle spend buttons:', await spends.count(), await spends.evaluateAll((bs) => bs.map((b) => `${b.textContent.trim()}|disabled=${b.disabled}`)));
  await shot(bram.page, 'b09_bram_dead_circle');
  // LK sheet of the dead investigator
  await lk.page.locator('.mark-status').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(lk.page, 'b10_lk_dead_sheet');
  console.log('LK Deal a mark present:', await lk.page.getByRole('group', { name: 'Deal a mark' }).count(), 'Revive:', await lk.page.getByRole('button', { name: /^Revive$/ }).count());
  // LK lifts the death: Edit, remove the fourth scar
  const mk2 = { lk: lk.frames.length, ada: ada.frames.length, dev: dev.frames.length };
  await lk.page.getByRole('button', { name: /^Edit .*trauma record/ }).click();
  await sleep(800);
  const rm = lk.page.getByRole('button', { name: /Remove scar 4|remove/i });
  console.log('remove buttons:', await rm.count(), await rm.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent)));
  await rm.last().click(); await sleep(500);
  await rm.last().click().catch(() => {}); await sleep(2500);
  console.log('DB after take-back:', sql(`select scars_count,is_dead,incapacitated from characters where id=${B}`));
  for (const [k, s] of Object.entries({ lk, ada, dev })) {
    console.log(`${k} log after take-back:`, JSON.stringify(L.parsed(s, 'in', mk2[k]).filter((x) => x.m.type === 'activity_log').map((x) => x.m.payload.message)));
  }
  await shot(ada.page, 'b11_ada_after_takeback');
  await shot(lk.page, 'b12_lk_after_takeback');
  console.log('LK Revive after take-back:', await lk.page.getByRole('button', { name: /^Revive$/ }).count());
  console.log('errors', lk.errors.slice(0, 3), bram.errors.slice(0, 3), ada.errors.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
