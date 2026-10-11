// Player group. Usage: node player.js A|B|C|D|E
const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
const part = process.argv[2];
const geom = (page, re) => page.evaluate((src) => {
  const s = new RegExp(src, 'i');
  return [...document.querySelectorAll('button')].filter(b => s.test(b.innerText) && b.offsetParent).map(b => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return { t: b.innerText.replace(/\s+/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), inView: r.top >= 0 && r.bottom <= innerHeight, hittable: !!hit && (hit === b || b.contains(hit)) }; });
}, re.source);
(async () => {
  const b = await L.launch();
  if (part === 'A') {
    const C = state.chars.cass.id;
    sql(`update characters set nerve_current=2 where id=${C}`);
    const cs = await L.desk(b, 'laptop', 'cass', 'cass', 'S'); const p = cs.page;
    const lk = await L.desk(b, 'wide', 'lk', null, 'S');
    const pips = await p.$$eval('button', bs => bs.filter(x => /Nerve/.test(x.getAttribute('aria-label') || '')).map(x => `${x.getAttribute('aria-label')}|dis=${x.disabled}|hidden=${x.getAttribute('aria-hidden')}`));
    console.log('nerve pips', pips);
    const clear = p.getByRole('button', { name: /^Clear one Nerve point/ });
    await clear.first().scrollIntoViewIfNeeded(); await shot(p, 'p01_cass_pips_before');
    await clear.first().click(); await sleep(1500);
    const db1 = sql(`select nerve_current from characters where id=${C}`);
    await p.getByRole('button', { name: /^Set Nerve available to 2/ }).first().click(); await sleep(1500);
    const db2 = sql(`select nerve_current from characters where id=${C}`);
    await shot(p, 'p02_cass_pips_after');
    const plog = (await L.logLines(p)).filter(l => /Nerve/.test(l)); const lklog = (await L.logLines(lk.page)).filter(l => /Nerve/.test(l));
    check('drive-pips-still-one-way', 'player clears last pip and refills, logged on both desks', db1 === '1' && db2 === '2' && plog.length >= 2 && lklog.length >= 2, { db1, db2, plog, lklog });
    // LK edits
    const P = lk.page;
    await P.getByRole('button', { name: /Open Cass Moreau's investigator sheet/ }).first().click(); await sleep(2500);
    const lkPipsBefore = await P.$$eval('button', bs => bs.filter(x => /Nerve/.test(x.getAttribute('aria-label') || '') && !x.disabled).length);
    await P.getByRole('button', { name: /^Edit .*trauma record/ }).first().click(); await sleep(800);
    const lkPips = await P.$$eval('button', bs => bs.filter(x => /Nerve/.test(x.getAttribute('aria-label') || '') && !x.disabled).map(x => x.getAttribute('aria-label')));
    const clr = P.getByRole('button', { name: /^Clear one Nerve point/ }).first();
    await clr.scrollIntoViewIfNeeded(); await shot(P, 'p03_lk_edit_pips');
    await clr.click(); await sleep(1500);
    const db3 = sql(`select nerve_current from characters where id=${C}`);
    const lklog2 = (await L.logLines(P)).filter(l => /Nerve/.test(l)).slice(-1); const plog2 = (await L.logLines(p)).filter(l => /Nerve/.test(l)).slice(-1);
    const sheetNow = await p.$$eval('button', bs => bs.filter(x => /Clear one Nerve/.test(x.getAttribute('aria-label') || '')).map(x => x.getAttribute('aria-label')));
    await shot(P, 'p04_lk_after_clear');
    check('drive-pips-still-one-way', 'LK sets a drive in Edit; player desk follows', lkPipsBefore === 0 && lkPips.length > 0 && db3 === '1' && /Lightkeeper set Cass Moreau's Nerve to 1/.test(lklog2.join()) && /Nerve point \(set to 1\)/.test(sheetNow.join()), { lkPipsBefore, lkPips, db3, lklog2, plog2, sheetNow });
    await P.getByRole('button', { name: /^(Done|Edit) .*trauma record/ }).first().click().catch(() => {});
    console.log('errors', cs.errors, lk.errors);
  }
  if (part === 'B') {
    // log pin: Ada rolls by socket to fill the log, Cass rolls on her desk
    const ada = await L.wsOpen(state.chars.ada.id, state.users.ada.token); await sleep(500);
    for (let i = 0; i < 8; i++) { ada.send('roll', { action: 'strike', drive_spent: 0, ability_mods: [], roll_id: 'fill' + Date.now() + i }); await sleep(400); }
    await sleep(1000); ada.close();
    for (const dev of ['laptop', 'desktop']) {
      const cs = await L.desk(b, dev, 'cass', 'cass', 'S'); const p = cs.page;
      const gaps = [];
      for (let i = 0; i < 8; i++) {
        const before = sql(`select count(*) from characters`);
        const btn = p.locator('button[data-roll-row][aria-label^="Roll Read"]').first();
        await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(3500);
        // a gilded choice? (Survey is not gilded here)
        const slip = await p.$$eval('[data-result-slip]', s => s.map(e => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
        const g = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-desk="log"] *')].find(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (!el) return null; const ps = el.querySelectorAll('p'); const last = ps[ps.length - 1]; const lr = last?.getBoundingClientRect(), er = el.getBoundingClientRect(); return { gap: Math.round(el.scrollHeight - el.scrollTop - el.clientHeight), lastVisible: lr ? lr.bottom <= er.bottom + 2 : null, last: last?.innerText.slice(0, 80), h: el.clientHeight }; });
        const after = await p.evaluate(() => /After the roll/i.test(document.body.innerText));
        const outcome = (slip.join(' ').match(/(CRITICAL SUCCESS|MIXED SUCCESS|SUCCESS|FAILURE)/i) || [''])[0];
        gaps.push({ outcome, after, ...g });
        if (after) { await shot(p, `p05_log_after_roll_${dev}_${i}`); }
        // let the dust settle: roll again by moving on
      }
      console.log(dev, JSON.stringify(gaps, null, 0));
      check('log-unpinned-after-roll-slip', `newest line in view after each roll (${dev})`, gaps.every(g => g.gap === null || g.gap <= 4), gaps.map(g => `${g.outcome} after=${g.after} gap=${g.gap} lastVis=${g.lastVisible}`));
      console.log('errors', cs.errors);
      await cs.ctx.close();
    }
  }
  if (part === 'C') {
    const F = state.camps.F.circleId;
    const sk = {};
    for (const k of ['fi', 'fb', 'fc', 'fd']) { sk[k] = await L.wsOpen(state.chars[k].id, state.users[k].token); }
    await sleep(500);
    const vote = (k, t, v) => sk[k].send('circle_creation_vote', { circle_id: F, character_id: state.chars[k].id, vote_type: t, value: v });
    vote('fb', 'name_suggest', 'The Ninth Night'); await sleep(400);
    vote('fi', 'name_suggest', 'the ninth night'); await sleep(400);
    vote('fc', 'name_suggest', 'Ash and Ember'); await sleep(400);
    vote('fb', 'name_vote', 'The Ninth Night'); await sleep(300);
    vote('fi', 'name_vote', 'The Ninth Night'); await sleep(300);
    vote('fc', 'name_vote', 'Ash and Ember'); await sleep(300);
    vote('fd', 'name_vote', 'Ash and Ember'); await sleep(800);
    Object.values(sk).forEach(s => s.close());
    for (const [w, h] of [[390, 844], [360, 740], [820, 1180]]) {
      const seat = await L.openSeat(b, w === 820 ? 'tablet' : 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
      await seat.page.setViewportSize({ width: w, height: h }); await sleep(5000);
      const p = seat.page;
      const row = p.locator('[role=dialog]').getByText(/The Ninth Night/i).first();
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.evaluate((e) => e.closest('li,div')?.scrollIntoView({ block: 'center' })).catch(() => {});
      await sleep(400);
      const m = await row.evaluate((s) => { let r = s; while (r && r.getBoundingClientRect().width < 250) r = r.parentElement; const rr = r.getBoundingClientRect(); const sr = s.getBoundingClientRect(); const over = [...r.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > rr.right + 1); }).map(e => e.innerText?.slice(0, 20)); return { text: r.innerText.replace(/\s+/g, ' '), spanW: Math.round(sr.width), spanH: Math.round(sr.height), rowW: Math.round(rr.width), over }; }).catch(e => ({ err: e.message }));
      await shot(p, `p06_namerow_${w}`);
      check('leading-name-row-collapses-on-phone', `name row at ${w}`, m.spanW > 100 && m.spanH < 80 && (!m.over || m.over.length === 0), m);
      console.log('errors', seat.errors);
      await seat.ctx.close();
    }
  }
  if (part === 'D') {
    for (const [who, dev] of [['bram', 'phone'], ['ada', 'desktop']]) {
      sql(`update characters set advancement_picks=2, advancement_taken='[]' where id=${state.chars[who].id}`);
      const s = await L.desk(b, dev, who, who, 'S'); const p = s.page;
      await shot(p, `p07_adv_open_${dev}`);
      const later = p.getByRole('button', { name: /^Later/ }).first();
      await later.click(); await sleep(800);
      await shot(p, `p08_adv_later_${dev}`);
      const strip = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /Choose advancements/i.test(x.innerText)); if (!bt) return null; let fixed = false; for (let e = bt; e; e = e.parentElement) if (/fixed|sticky/.test(getComputedStyle(e).position)) fixed = getComputedStyle(e).position; const r = bt.getBoundingClientRect(); return { text: bt.closest('[role=status]')?.innerText.replace(/\s+/g, ' '), fixed, top: Math.round(r.top + scrollY) }; });
      // scroll the sheet: is anything floating over the chips?
      const fixedOver = await p.evaluate(() => [...document.querySelectorAll('button')].filter(x => /Choose advancements/i.test(x.innerText)).map(x => getComputedStyle(x).position));
      await p.locator('button[data-roll-row][aria-label^="Roll Sense"]').first().scrollIntoViewIfNeeded().catch(() => {});
      await sleep(400); await shot(p, `p09_adv_scrolled_${dev}`);
      const btn = p.getByRole('button', { name: /Choose advancements/ }).first();
      await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(800);
      const reopened = await p.getByRole('button', { name: /Confirm Advancement/ }).count();
      await shot(p, `p10_adv_reopened_${dev}`);
      check('choose-advancements-button-covers-sheet', `strip in page flow, reopens (${dev})`, strip && !strip.fixed && reopened > 0 && fixedOver.every(x => x !== 'fixed'), { strip, fixedOver, reopened });
      console.log('errors', s.errors);
      sql(`update characters set advancement_picks=0 where id=${state.chars[who].id}`);
      await s.ctx.close();
    }
  }
  if (part === 'E') {
    // 390x705: advancement dialog and scar dialog sticky footers; scar note once
    const D = state.chars.dev.id;
    sql(`update characters set advancement_picks=2, advancement_taken='[]' where id=${D}`);
    const s = await L.desk(b, 'phone705', 'dev', 'dev', 'S'); const p = s.page;
    const g0 = await geom(p, /Confirm Advancement|^Later/);
    await shot(p, 'p11_705_adv_first');
    const boxes = p.locator('[role=dialog] input[type=checkbox]');
    const nb = await boxes.count();
    if (nb) { await boxes.nth(0).tap({ force: true }); await sleep(500); await boxes.nth(1).tap({ force: true }); await sleep(600); }
    const g1 = await geom(p, /Confirm Advancement|^Later/);
    await shot(p, 'p12_705_adv_ticked');
    await p.locator('[role=dialog]').first().evaluate(d => { const sc = [d, ...d.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = 200; });
    await sleep(300);
    const g2 = await geom(p, /Confirm Advancement|^Later/);
    await shot(p, 'p13_705_adv_scrolled');
    check('phone-dialog-buttons-below-fold', 'advancement dialog footer in view at 390x705', [g0, g1, g2].every(g => g.length >= 2 && g.every(x => x.inView && x.hittable)), { nb, g0, g1, g2 });
    sql(`update characters set advancement_picks=0 where id=${D}`);
    await s.ctx.close();
    // scar dialog for Ada (Doctor), body 3 -> take a fourth
    const A = state.chars.ada.id;
    await L.fresh('ada', 'ada', { body_marks: 3 });
    const a = await L.desk(b, 'phone705', 'ada', 'ada', 'S'); const q = a.page;
    const add = q.locator('button[aria-label^="Take a Body mark"]').first();
    await add.scrollIntoViewIfNeeded(); await add.tap(); await sleep(6500);
    const take = q.getByRole('button', { name: /^Take the mark/i });
    if (await take.count()) { await take.first().tap(); await sleep(3000); }
    const s0 = await geom(q, /Decide later|Record scar/);
    await shot(q, 'p14_705_scar_first');
    await q.locator('input[name=degrade_action][value=move]').check({ force: true }).catch(e => console.log('deg', e.message));
    await q.locator('input[name=advance_action][value=sway]').check({ force: true }).catch(e => console.log('adv', e.message));
    const ta = q.locator('#scar-notes');
    await ta.tap(); await ta.fill('I talk where I used to run, and the limp tells everyone first. (-1 Move, +1 Sway)'); await sleep(500);
    const s1 = await geom(q, /Decide later|Record scar/);
    await shot(q, 'p15_705_scar_typed');
    check('phone-dialog-buttons-below-fold', 'scar dialog footer in view at 390x705', s0.length >= 2 && s1.length >= 2 && [...s0, ...s1].every(x => x.inView && x.hittable && x.h >= 44), { s0, s1 });
    await q.getByRole('button', { name: 'Record scar' }).tap(); await sleep(3000);
    const scars = sql(`select scars_list::text, move, sway from characters where id=${A}`);
    await shot(q, 'p16_705_after_scar');
    check('scar-shift-note-doubled', 'typed note appears once', (scars.match(/\(-1 Move, \+1 Sway\)/g) || []).length === 1, scars);
    // only a note: refused
    console.log('errors', a.errors);
  }
  L.saveResults(`player_${part}.json`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
