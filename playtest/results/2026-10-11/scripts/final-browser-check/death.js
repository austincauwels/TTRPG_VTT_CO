// Death group. node death.js 1 (first death, checks) | 2 (take-back, revive, invite, spend, second death)
const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
const phase = process.argv[2];
const B = state.chars.bram.id, CIR = state.camps.S.circleId;
const dbB = () => JSON.parse(sql(`select row_to_json(c) from (select body_marks, scars_count, is_dead, incapacitated, control, sense, status, resources_spent_assignment from characters where id=${B}) c`));
const deathLines = (lines) => lines.filter(l => /deceased|died|is alive|undone|Bram Okafor (has been|is)/i.test(l));
async function dealToScar(lk, bram) {
  const deal = lk.page.getByRole('group', { name: 'Deal a mark' });
  const enemy = deal.getByLabel('From an enemy'); if (await enemy.isChecked()) await enemy.uncheck();
  for (let i = 0; i < 4; i++) {
    if (await bram.page.locator('#scar-notes').count()) break;
    await deal.getByRole('button', { name: /^body$/i }).click(); await sleep(2500);
  }
  await sleep(1500);
}
async function recordScar(bram, deg, adv, text) {
  await bram.page.locator(`input[name=degrade_action][value=${deg}]`).check({ force: true });
  await bram.page.locator(`input[name=advance_action][value=${adv}]`).check({ force: true });
  await bram.page.fill('#scar-notes', text);
  await bram.page.getByRole('button', { name: 'Record scar' }).tap(); await sleep(3500);
}
(async () => {
  const b = await L.launch();
  const lk = await L.desk(b, 'wide', 'lk', null, 'S');
  const bram = await L.desk(b, 'phone', 'bram', 'bram', 'S');
  const ada = await L.desk(b, 'desktop', 'ada', 'ada', 'S');
  const dev = await L.desk(b, 'tablet', 'dev', 'dev', 'S');
  const cass = await L.desk(b, 'laptop', 'cass', 'cass', 'S');
  const seats = { lk, bram, ada, dev, cass };
  if (!['3','4','5'].includes(phase)) { await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500); }
  if (phase === '1') {
    await L.drain('bram', 'bram');
    L.resetChar(B, { body_marks: 3, scars_count: 3, incapacitated: true, scars_list: `'["A torn ear (-1 Hide, +1 Sway)","A cough","A tremor"]'` });
    for (const s of [lk, bram]) { await s.page.reload(); await sleep(4500); }
    await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
    const sheetBefore = await lk.page.evaluate(() => document.body.innerText.includes('INCAPACITATED') || /Incapacitated/.test(document.body.innerText));
    const reviveLK = await lk.page.getByRole('button', { name: /^Revive/ }).count();
    await lk.page.getByRole('button', { name: /^Revive/ }).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(lk.page, 'e01_lk_incap_revive');
    check('lightkeeper-has-no-revive', 'Revive beside INCAPACITATED on the Lightkeeper copy', reviveLK > 0, { reviveLK, sheetBefore });
    await dealToScar(lk, bram);
    await shot(bram.page, 'e02_bram_fourth_scar_form');
    const ctl0 = dbB();
    await recordScar(bram, 'control', 'sense', 'My hands shake now; I listen instead.');
    const d1 = dbB();
    const dlg = await bram.page.locator('[role=dialog],[role=alertdialog]').last().innerText().then(t => t.replace(/\s+/g, ' ')).catch(() => '');
    const focus = await bram.page.evaluate(() => (document.activeElement?.innerText || document.activeElement?.getAttribute('aria-label') || '').trim());
    await shot(bram.page, 'e03_bram_death_dialog');
    check('death-dialog-wording-and-focus', 'His sheet; waits for the invite; focus on Stay', /His sheet stays on record/.test(dlg) && /invite you back/i.test(dlg) && /Stay and look at the sheet/i.test(focus), { dlg, focus });
    await sleep(1500);
    const logs = {};
    for (const [k, s] of Object.entries(seats)) logs[k] = deathLines(await L.logLines(s.page));
    for (const [k, s] of Object.entries(seats)) if (k !== 'bram') await shot(s.page, `e04_${k}_after_death`);
    check('death-not-announced-to-table', 'every desk logs the death once', Object.values(logs).every(l => l.filter(x => /deceased/i.test(x)).length === 1), logs);
    // stay and look
    await bram.page.getByRole('button', { name: 'Stay and look at the sheet' }).tap(); await sleep(1000);
    const rows = await bram.page.locator('button[data-roll-row]').evaluateAll(bs => bs.map(x => x.getAttribute('aria-disabled')));
    const takeBtns = await bram.page.getByRole('button', { name: /Take (a )?(Body|Brain|Bleed) mark/ }).count();
    const gearBtn = await bram.page.getByRole('button', { name: /Change gear/i }).count();
    const livePips = await bram.page.$$eval('button', bs => bs.filter(x => /(Set|Clear one) (Nerve|Cunning|Intuition)/.test(x.getAttribute('aria-label') || '') && !x.disabled && x.getAttribute('aria-disabled') !== 'true').length);
    const mk = bram.frames.length;
    const r = bram.page.locator('button[data-roll-row][aria-label^="Roll Focus"]').first(); await r.scrollIntoViewIfNeeded(); await r.tap({ force: true }).catch(() => {}); await sleep(2000);
    const sentRolls = L.parsed(bram, 'out', mk).filter(x => x.m.type === 'roll').length;
    await shot(bram.page, 'e05_bram_dead_sheet', { fullPage: true });
    // server refusal
    const so = await L.wsOpen(B, state.users.bram.token); await sleep(500);
    so.send('roll', { action: 'read', drive_spent: 0, ability_mods: [], roll_id: 'dead' + Date.now() });
    so.send('spend_resource', { circle_id: CIR, resource_type: 'train' });
    await sleep(1500); const ref = so.frames.filter(f => f.type === 'action_rejected').map(f => f.payload.detail); so.close();
    await sleep(500);
    await bram.page.getByRole('button', { name: /Use this tab/i }).tap().catch(() => {}); await sleep(3000);
    await L.goTab(bram.page, 'Circle'); await sleep(1200);
    const circleTxt = await bram.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const spendBtns = await bram.page.getByRole('button', { name: /Spend 1/ }).evaluateAll(bs => bs.map(x => x.disabled));
    await shot(bram.page, 'e06_bram_dead_circle', { fullPage: true });
    const lkDeal = await lk.page.getByRole('group', { name: 'Deal a mark' }).count();
    const lkRevive = await lk.page.getByRole('button', { name: /^Revive/ }).count();
    await shot(lk.page, 'e07_lk_dead_sheet');
    check('dead-investigator-still-acts', 'dead sheet is a record: rows, marks, gear, pips, spends, proposals, LK Deal a mark; server refuses', rows.every(x => x === 'true') && takeBtns === 0 && gearBtn === 0 && livePips === 0 && sentRolls === 0 && ref.length === 2 && spendBtns.every(Boolean) && /dead investigator cannot spend/i.test(circleTxt) && /proposes no relationships/i.test(circleTxt) && lkDeal === 0, { rows: rows.length, takeBtns, gearBtn, livePips, sentRolls, ref, spendBtns, spendLine: /dead investigator cannot spend/i.test(circleTxt), propLine: /proposes no relationships/i.test(circleTxt), lkDeal, lkRevive, db: d1, before: ctl0 });
  }
  if (phase === '2') {
    sql(`update characters set scars_count=4, scars_list='["A torn ear (-1 Hide, +1 Sway)","A cough","A tremor","My hands shake now; I listen instead. (-1 Control, +1 Sense)"]', control=1, sense=1, is_dead=true, incapacitated=true where id=${B}`);
    for (const s of Object.values(seats)) { await s.page.reload(); await sleep(3500); }
    await bram.page.getByRole('button', { name: 'Stay and look at the sheet' }).tap().catch(() => {});
    await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
    // the take-back: Edit, remove the fourth scar
    const before = dbB();
    const mk = {}; for (const [k, s] of Object.entries(seats)) mk[k] = s.frames.length;
    await lk.page.getByRole('button', { name: /^Edit .*trauma record/ }).first().click(); await sleep(800);
    const rm = lk.page.getByRole('button', { name: /Remove scar 4/i });
    console.log('remove buttons', await lk.page.getByRole('button', { name: /remove/i }).evaluateAll(bs => bs.map(x => x.getAttribute('aria-label') || x.innerText)));
    await shot(lk.page, 'e08_lk_edit');
    await rm.first().click(); await sleep(800);
    await shot(lk.page, 'e09_lk_remove_armed');
    await lk.page.getByRole('button', { name: /Yes, remove/i }).first().click(); await sleep(3000);
    const after = dbB();
    const logs = {}; for (const [k, s] of Object.entries(seats)) logs[k] = L.parsed(s, 'in', mk[k]).filter(x => x.m.type === 'activity_log').map(x => x.m.payload.message);
    await shot(lk.page, 'e10_lk_after_takeback'); await shot(ada.page, 'e11_ada_after_takeback');
    check('F165 scar removal undoes its shift', 'removing the fourth scar gives back Control and takes back Sense', before.is_dead && !after.is_dead && after.control === before.control + 1 && after.sense === before.sense - 1, { before, after, lkLog: logs.lk });
    check('death-not-announced-to-table', 'the take-back reaches every desk', Object.values(logs).every(l => l.some(x => /alive/i.test(x))), logs);
    // Revive from the LK
    await lk.page.getByRole('button', { name: /^(Done|Edit) .*trauma record/ }).first().click().catch(() => {}); await sleep(600);
    const rv = lk.page.getByRole('button', { name: /^Revive/ });
    const rvN = await rv.count();
    if (rvN) { await rv.first().click(); await sleep(2500); }
    const afterRev = dbB();
    const bramStatus = await bram.page.evaluate(() => /INCAPACITATED/i.test(document.body.innerText) ? 'incap' : 'able');
    const bramRevBtn = await bram.page.getByRole('button', { name: /^Revive/ }).count();
    await shot(bram.page, 'e12_bram_after_lk_revive', { fullPage: false });
    check('lightkeeper-has-no-revive', 'LK Revive revives and the player desk follows', rvN > 0 && afterRev.incapacitated === false && bramRevBtn === 0, { rvN, afterRev, bramStatus, bramRevBtn });
  }
  if (phase === '3') {
    // Invite while alive
    await lk.page.getByRole('button', { name: /^Invite player/i }).first().click(); await sleep(600);
    await lk.page.getByLabel(/username/i).first().fill(state.users.bram.username);
    await lk.page.getByRole('button', { name: /^Send invite/i }).first().click(); await sleep(2500);
    const slip = await lk.page.evaluate(() => (document.body.innerText.match(/Invite sent[^\n]*(\n[^\n]*)?/) || [''])[0]);
    const invLine = (await L.logLines(lk.page)).filter(l => /invited/.test(l));
    const plLine = (await L.logLines(ada.page)).filter(l => /invited/.test(l));
    await shot(lk.page, 'e13_lk_invite_slip');
    check('invite-silently-retires-living-investigator', 'slip warns the living investigator is retired, log line, no login name', /Bram Okafor is still alive and will be retired/.test(slip) && invLine.length > 0 && !invLine.join().includes(state.users.bram.username) && plLine.length > 0, { slip, invLine, plLine });
  }
  if (phase === '4') {
    sql(`update characters set resources_spent_assignment=0 where id=${B}`);
    sql(`update circles set resources_editable=true where id=${CIR}`);
    await bram.page.reload(); await sleep(5000);
    const toast = await bram.page.evaluate(() => [...document.querySelectorAll('div.fixed')].map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean));
    console.log('fixed on bram', toast);
    await L.goTab(bram.page, 'Circle'); await sleep(1000);
    const sp = bram.page.getByRole('button', { name: /Spend 1 Refresh/i }).first();
    const spEnabled = await sp.isEnabled().catch(() => false);
    if (spEnabled) { await sp.scrollIntoViewIfNeeded(); await sp.tap(); await sleep(2000); }
    console.log('bram spent', dbB().resources_spent_assignment, 'enabled', spEnabled);
    await L.goTab(bram.page, 'Investigator'); await sleep(800);
    // second death
    L.resetChar(B, { body_marks: 3, scars_count: 3, incapacitated: true, scars_list: `'["A torn ear (-1 Hide, +1 Sway)","A cough","A tremor"]'`, resources_spent_assignment: dbB().resources_spent_assignment });
    await bram.page.reload(); await sleep(5000);
    await lk.page.reload(); await sleep(5000);
    await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
    await shot(bram.page, 'e14_bram_banner_before_second');
    const bannerBefore = await bram.page.evaluate(() => (document.body.innerText.match(/[^\n]*invites you back[^\n]*/i) || [''])[0]);
    await dealToScar(lk, bram);
    await recordScar(bram, 'survey', 'move', 'Second time down.');
    const dlg2 = await bram.page.locator('[role=dialog],[role=alertdialog]').last().innerText().then(t => t.replace(/\s+/g, ' ')).catch(() => '');
    await shot(bram.page, 'e15_bram_second_death_dialog');
    await bram.page.getByRole('button', { name: 'Stay and look at the sheet' }).tap().catch(() => {}); await sleep(1000);
    const bannerAfter = await bram.page.evaluate(() => (document.body.innerText.match(/[^\n]*invites you back[^\n]*(\n[^\n]*)?/i) || [''])[0]);
    await shot(bram.page, 'e16_bram_after_second_dismiss');
    check('second-death-no-notice', 'second death shows the dialog; invite stays visible', /His sheet stays on record/.test(dlg2) && /invite/i.test(bannerAfter + dlg2), { dlg2, bannerBefore, bannerAfter, db: dbB() });
  }
  if (phase === '5') {
    await L.drain('bram', 'bram');
    L.resetChar(B, { body_marks: 3, scars_count: 3, incapacitated: true, resources_spent_assignment: 0, scars_list: `'["A torn ear (-1 Hide, +1 Sway)","A cough","A tremor"]'` });
    sql(`update circles set resources_editable=true, refresh=2 where id=${CIR}`);
    await bram.page.reload(); await sleep(5000);
    await lk.page.reload(); await sleep(5000);
    // spend on the phone
    await L.goTab(bram.page, 'Circle'); await sleep(1200);
    const sp = bram.page.getByRole('button', { name: /Spend 1 Refresh/i }).first();
    const spInfo = await sp.evaluate(x => `disabled=${x.disabled} aria=${x.getAttribute('aria-disabled')} text=${x.innerText}`);
    const mk = bram.frames.length;
    await sp.scrollIntoViewIfNeeded(); await sp.tap(); await sleep(2500);
    const spendFrames = { out: L.parsed(bram, 'out', mk).map(x => x.m.type + JSON.stringify(x.m.payload)), in: L.parsed(bram, 'in', mk).map(x => x.m.type + (x.m.payload?.detail ? ':' + x.m.payload.detail : '')) };
    const spentNow = dbB().resources_spent_assignment;
    await shot(bram.page, 'e19_bram_spend');
    const confirm = bram.page.getByRole('button', { name: /^(Yes|Confirm|Spend)/i });
    console.log('spend', spInfo, spendFrames, 'spent', spentNow);
    await L.goTab(bram.page, 'Investigator'); await sleep(800);
    // live invite
    await lk.page.getByRole('button', { name: /^Invite player/i }).first().click(); await sleep(600);
    await lk.page.getByLabel(/username/i).first().fill(state.users.bram.username);
    await lk.page.getByRole('button', { name: /^Send invite/i }).first().click(); await sleep(2500);
    const live = await bram.page.evaluate(() => [...document.querySelectorAll('div.fixed')].map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean));
    await shot(bram.page, 'e20_bram_invite_arrives');
    const bannerAlive = await bram.page.evaluate(() => (document.body.innerText.match(/[^\n]*invites you back[^\n]*/i) || [''])[0]);
    await sleep(6000);
    await lk.page.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
    await dealToScar(lk, bram);
    await recordScar(bram, 'survey', 'move', 'Second time down.');
    const dlg2 = await bram.page.locator('[role=dialog],[role=alertdialog]').last().innerText().then(t => t.replace(/\s+/g, ' ')).catch(() => '');
    await shot(bram.page, 'e21_bram_second_death_dialog');
    await bram.page.getByRole('button', { name: 'Stay and look at the sheet' }).tap().catch(() => {}); await sleep(1000);
    const bannerAfter = await bram.page.evaluate(() => (document.body.innerText.match(/[^\n]*invites you back[^\n]*(\n[^\n]*)?/i) || [''])[0]);
    await shot(bram.page, 'e22_bram_after_second_dismiss');
    check('second-death-no-notice', 'second death with an invite pending: dialog names it, banner after dismiss', /His sheet stays on record/.test(dlg2) && /invited you back/i.test(dlg2) && /invites you back/i.test(bannerAfter), { live, bannerAlive, dlg2, bannerAfter, db: dbB() });
  }
  console.log('errors', Object.fromEntries(Object.entries(seats).map(([k, s]) => [k, s.errors])));
  L.saveResults(`death_${phase}.json`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
