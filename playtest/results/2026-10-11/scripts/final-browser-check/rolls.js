// Rolls group. Usage: node rolls.js R1|R2|R3|R5|R6|R7
const L = require('./lib'); const { sleep, shot, state, check, sql } = L;
const part = process.argv[2];
const rollBtn = (p, label) => p.locator(`button[data-roll-row][aria-label^="Roll ${label}"]`).first();
const slip = (p) => p.$$eval('[data-result-slip]', s => s.map(e => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
const keepGilded = async (p) => { const d = p.locator('[data-keep-die]'); const n = await d.count(); for (let i = 0; i < n; i++) { const lab = await d.nth(i).getAttribute('aria-label'); if (/gilded/i.test(lab)) { await d.nth(i).focus(); await p.keyboard.press('Enter'); return lab; } } if (n) { await d.nth(0).focus(); await p.keyboard.press('Enter'); return 'first'; } return null; };
const ch = (k) => JSON.parse(sql(`select row_to_json(c) from (select body_marks, brain_marks, bleed_marks, nerve_current, cunning_current, intuition_current, cunning_resistance_spent, nerve_resistance_spent, incapacitated, is_dead from characters where id=${state.chars[k].id}) c`));
(async () => {
  const b = await L.launch();
  if (part === 'R1') {
    await L.fresh('ada', 'ada', { intuition_current: 4 });
    await L.fresh('bram', 'bram', { body_marks: 1 });
    const a = await L.desk(b, 'desktop', 'ada', 'ada', 'S'); const p = a.page;
    const chips = await p.$$eval('.mod-chip', cs => cs.map(c => c.innerText.trim()));
    const chip = p.getByRole('button', { name: /Patch Up/ }).first();
    const chipCount = await p.getByRole('button', { name: /Patch Up/ }).count();
    await chip.click(); await sleep(400);
    const pressed = await chip.getAttribute('aria-pressed');
    await shot(p, 'r01_patchup_chip');
    const mark = a.frames.length;
    await rollBtn(p, 'Focus').click(); await sleep(3500);
    if (await p.locator('[data-keep-die]').count()) { await keepGilded(p); await sleep(2500); }
    const out = L.parsed(a, 'out', mark).filter(x => x.m.type === 'roll').map(x => x.m.payload);
    const ab = await afterBox(p);
    await shot(p, 'r02_patchup_after');
    const sel = p.getByLabel('Ally for Patch Up');
    let healed = null;
    if (await sel.count()) {
      await sel.selectOption({ label: 'Bram Okafor' }); await sleep(300);
      await sel.locator('xpath=..').getByRole('button', { name: /^Use$/ }).click(); await sleep(2500);
      healed = ch('bram').body_marks;
    }
    const logs = (await L.logLines(p)).slice(-3);
    await shot(p, 'r03_patchup_used');
    check('patch-up-chip-never-shown', 'chip under Focus, roll declares it, After the roll heals ally', chipCount > 0 && out[0]?.ability_mods?.includes('Patch Up') && /Patch Up/.test(ab || '') && healed === 0, { chips, chipCount, pressed, sent: out, after: ab, bramBody: healed, logs });
    console.log('errors', a.errors);
  }
  if (part === 'R2') {
    await L.fresh('cass', 'cass', {});
    const c = await L.desk(b, 'laptop', 'cass', 'cass', 'S'); const p = c.page;
    const t0 = Date.now();
    c.silent = true; c.refuse = true;
    await sleep(6000);
    const btn = p.getByRole('button', { name: /^Take Body mark 1 of 3/ });
    await btn.scrollIntoViewIfNeeded(); await btn.click();
    const states = [];
    for (let s = 6; s <= 44; s += 4) { await sleep(4000); states.push({ s: Math.round((Date.now() - t0) / 1000), track: (await L.trackState(p, 'Body'))?.boxes, banner: (await p.evaluate(() => (document.body.innerText.match(/[^\n]*(connection|Reconnect)[^\n]*/i) || [''])[0])) }); if (s === 34) await shot(p, 'r04_silent_mark_34s'); }
    c.silent = false; c.refuse = false;
    await sleep(12000);
    const db = ch('cass').body_marks;
    const track = (await L.trackState(p, 'Body'))?.boxes;
    const sent = L.parsed(c, 'out').filter(x => x.m.type === 'take_mark').map(x => ({ sock: x.sock, held: x.held, id: x.m.payload.mark_id }));
    await shot(p, 'r05_silent_mark_after');
    const logs = (await L.logLines(p)).filter(l => /Body/.test(l));
    check('silent-socket-loses-mark', 'mark taken during a silent drop lands once after the network returns', db === 1 && /^F/.test(track || '') && sent.length >= 2 && new Set(sent.map(s => s.id)).size === 1, { db, track, sent, states, logs, sockets: c.sockets.map(r => ({ n: r.n, refused: !!r.refused })) });
    console.log('errors', c.errors);
  }
  if (part === 'R3') {
    await L.fresh('dev', 'dev', {});
    const d = await L.desk(b, 'tablet', 'dev', 'dev', 'S'); const p = d.page;
    const markLog = sql(`select count(*) from characters`);
    const sock = d.sockets.filter(r => !r.closedAt).slice(-1)[0];
    // let the roll leave, then silence the network before the answer
    d.silentIn = true; d.refuse = true;
    const btn = rollBtn(p, 'Strike'); await btn.scrollIntoViewIfNeeded(); await btn.click();
    await sleep(800); d.silent = true;
    await sleep(33000);
    const s33 = await slip(p);
    const bar = await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find(x => /May have counted|Not thrown/i.test(x.textContent) && x.children.length === 0); return e ? e.closest('div')?.parentElement?.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; });
    await shot(p, 'r06_offline_roll_33s');
    d.silent = false; d.silentIn = false; d.refuse = false;
    await sleep(15000);
    const logs = (await L.logLines(p)).filter(l => /Dev Marsh rolled Strike/.test(l));
    await shot(p, 'r07_offline_roll_back');
    check('offline-roll-headed-not-thrown', 'heading says May have counted, roll counted once', /May have counted/i.test(bar || '') && !/Not thrown/i.test(bar || '') && logs.length === 1, { bar, s33, logs });
    console.log('errors', d.errors);
  }
  if (part === 'R5') {
    // (1) the Lightkeeper's open roll settles a player's roll; the desk that missed it is told
    await L.fresh('bram', 'bram', {});
    const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
    const lk = await L.desk(b, 'wide', 'lk', null, 'S');
    let ab = null, tries = 0;
    while (tries < 8) {
      tries++;
      const bt = rollBtn(p, 'Read'); await bt.scrollIntoViewIfNeeded(); await bt.tap(); await sleep(3500);
      if (await p.locator('[data-keep-die]').count()) { await keepGilded(p); await sleep(2000); }
      ab = await afterBox(p); if (ab && /Burn/i.test(ab)) break;
    }
    const before = ab;
    br.silent = true; br.refuse = true;
    await lk.page.getByRole('button', { name: /^Roll 1 die/i }).click(); await sleep(2500);
    br.silent = false; br.refuse = false;
    // the old socket is silent: force the desk onto a new socket by dropping the current one
    for (const r of br.sockets.filter(r => !r.closedAt && !r.refused)) { try { r.server.close(); } catch {} }
    await sleep(12000);
    const ab2 = await afterBox(p);
    const got = L.parsed(br, 'in').filter(x => x.m.type === 'roll_settled').length;
    await shot(p, 'r08_settled_after_lk_roll');
    check('roll-settling-client-server-mismatch', 'LK open roll settles a phone roll missed during a drop', /Burn/i.test(before || '') && !/Burn/i.test(ab2 || '') && got >= 1, { before, after: ab2, roll_settled: got, tries });
    // (2) a gilded die kept after another player's roll: Burn offered after the keep, server takes it
    await L.fresh('bram', 'bram', {});
    await p.reload(); await sleep(5000);
    const ada = await L.wsOpen(state.chars.ada.id, state.users.ada.token); await sleep(400);
    let ok = null, info = {};
    for (let i = 0; i < 6 && ok === null; i++) {
      const bt = rollBtn(p, 'Control'); await bt.scrollIntoViewIfNeeded(); await bt.tap(); await sleep(3000);
      const n = await p.locator('[data-keep-die]').count();
      if (!n) { continue; }
      ada.send('roll', { action: 'strike', drive_spent: 0, ability_mods: [], roll_id: 'ada' + Date.now() }); await sleep(2500);
      const dot = await p.locator('[data-keep-die]').count();
      await shot(p, 'r09_gilded_waiting_after_other_roll');
      const kept = await keepGilded(p); await sleep(2500);
      const ab3 = await afterBox(p);
      const sl = await slip(p);
      info = { keepDiceWhileOtherRolled: dot, kept, after: ab3, slip: sl };
      if (ab3 && /Burn/i.test(ab3)) {
        const before = ch('bram');
        await p.getByRole('button', { name: /Burn and reroll/i }).first().tap(); await sleep(3000);
        if (await p.locator('[data-keep-die]').count()) { await keepGilded(p); await sleep(2000); }
        const after = ch('bram');
        info.burn = { before: before.nerve_resistance_spent, after: after.nerve_resistance_spent };
        ok = after.nerve_resistance_spent === before.nerve_resistance_spent + 1;
        await shot(p, 'r10_gilded_burned');
      } else if (/(CRITICAL|SUCCESS)/.test(sl.join(' ')) && !/MIXED/.test(sl.join(' '))) { info.note = 'full success, no burn expected'; continue; }
      else ok = false;
    }
    ada.close();
    check('roll-settling-client-server-mismatch', 'gilded keep after another roll: Burn offered and taken', ok, info);
    console.log('errors', br.errors, lk.errors);
  }
  if (part === 'R6') {
    for (const k of ['ada', 'dev', 'cass']) await L.fresh(k, k, k === 'cass' ? { intuition_current: 4 } : {});
    const dv = await L.desk(b, 'phone', 'dev', 'dev', 'S');
    const cs = await L.desk(b, 'tablet', 'cass', 'cass', 'S');
    const ada = await L.wsOpen(state.chars.ada.id, state.users.ada.token); await sleep(500);
    ada.send('take_mark', { mark_type: 'body', mark_id: 'm' + Date.now() }); await sleep(2500);
    const card = (p) => p.evaluate(() => [...document.querySelectorAll('[aria-label$=" offer"], [role=alert]')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 200)));
    const d0 = await card(dv.page), c0 = await card(cs.page);
    await shot(dv.page, 'r11_dev_offer'); await shot(cs.page, 'r12_cass_offer');
    await sleep(5000);
    await dv.page.reload(); await sleep(6000);
    const d1 = await card(dv.page);
    await shot(dv.page, 'r13_dev_offer_after_reload');
    // Cass's desk misses the close, then Dev intercepts first
    cs.silentIn = true;
    const ic = dv.page.getByRole('button', { name: /^Intercept/ }).first();
    await ic.tap(); await sleep(3000);
    const afterDev = { ada: ch('ada').body_marks, dev: ch('dev').body_marks };
    cs.silentIn = false;
    const c1 = await card(cs.page);
    // Cass taps her stale card (she missed intercept_offer_closed)
    const cic = cs.page.getByRole('button', { name: /^Intercept/ }).first();
    let refused = null;
    if (await cic.count()) { await cic.tap(); await sleep(2500); refused = await card(cs.page); await shot(cs.page, 'r14_cass_refused'); }
    check('ally-offer-cards-lost-or-stale', 'ally offer survives reload with time left', d0.some(x => /Behind Me/i.test(x)) && d1.some(x => /Behind Me/i.test(x)), { d0, d1 });
    check('ally-offer-cards-lost-or-stale', 'refused stale answer says why', refused && refused.some(x => /not used|answered it first|no such mark/i.test(x)), { c0, c1, refused, afterDev });
    // second run: Cass sees Dev's answer close her card
    for (const k of ['ada', 'dev', 'cass']) L.resetChar(state.chars[k].id, k === 'cass' ? { intuition_current: 4 } : {});
    await sleep(1000);
    ada.send('take_mark', { mark_type: 'body', mark_id: 'm2' + Date.now() }); await sleep(2500);
    const c2 = await card(cs.page);
    await dv.page.getByRole('button', { name: /^Intercept/ }).first().tap(); await sleep(2500);
    const c3 = await card(cs.page);
    await shot(cs.page, 'r15_cass_after_dev_answered');
    check('ally-offer-cards-lost-or-stale', "another ally's answer closes the card", c2.some(x => /Premonitions/i.test(x)) && !c3.some(x => /Premonitions|Intercept/i.test(x)), { c2, c3 });
    ada.close();
    console.log('errors', dv.errors, cs.errors);
  }
  if (part === 'R7') {
    await L.fresh('bram', 'bram', {});
    const br = await L.desk(b, 'laptop', 'bram', 'bram', 'S'); const p = br.page;
    const res = {};
    for (const choice of ['Take the mark', 'Use']) {
      const t = p.getByRole('button', { name: /^Take Body mark \d of 3/ }).first();
      await t.scrollIntoViewIfNeeded(); await t.focus(); await p.keyboard.press('Enter'); await sleep(1500);
      const onOpen = await p.evaluate(() => (document.activeElement?.getAttribute('aria-label') || document.activeElement?.innerText || '').slice(0, 60));
      const cardTxt = await p.evaluate(() => [...document.querySelectorAll('[aria-label$=" offer"]')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
      // move focus to the choice by keyboard
      let found = false;
      for (let i = 0; i < 6; i++) { const a = await p.evaluate(() => (document.activeElement?.innerText || '').trim()); if (new RegExp('^' + choice + '$', 'i').test(a)) { found = true; break; } await p.keyboard.press('Tab'); }
      await p.keyboard.press('Enter'); await sleep(2500);
      const after = await p.evaluate(() => { const e = document.activeElement; return { tag: e?.tagName, label: (e?.getAttribute('aria-label') || e?.innerText || '').slice(0, 60) }; });
      res[choice] = { onOpen, cardTxt, found, after };
      await shot(p, `r16_deathdefy_${choice.replace(/\s/g, '_')}`);
    }
    check('death-defy-focus-returns-to-page', 'focus returns to the Body track after Take the mark and Use', Object.values(res).every(r => /Take a Body mark|Body/.test(r.after.label) && r.after.tag !== 'BODY'), res);
    console.log('db', ch('bram'), 'errors', br.errors);
  }
  L.saveResults(`rolls_${part}.json`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
