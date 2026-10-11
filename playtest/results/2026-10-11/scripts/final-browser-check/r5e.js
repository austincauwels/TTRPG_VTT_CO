const L = require('./lib'); const { sleep, shot, state, sql, check } = L;
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
const B = state.chars.bram.id;
const rs = () => sql(`select nerve_resistance_spent from characters where id=${B}`);
(async () => {
  const b = await L.launch();
  // finish the held one first
  const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
  const dice = p.locator('[data-keep-die]');
  const ada = await L.wsOpen(state.chars.ada.id, state.users.ada.token); await sleep(400);
  let info = null;
  for (let i = 0; i < 8 && !info; i++) {
    if (await dice.count()) { await p.getByRole('button', { name: /^Dice and log/ }).first().click(); await sleep(800); await dice.nth(0).focus(); await p.keyboard.press('Enter'); await sleep(2000); await p.keyboard.press('Escape'); await sleep(500); }
    const bt = p.locator('button[data-roll-row][aria-label^="Roll Control"]').first(); await bt.scrollIntoViewIfNeeded(); await bt.tap(); await sleep(3000);
    if (!(await dice.count())) continue;
    const labs = await dice.evaluateAll(d => d.map(x => x.getAttribute('aria-label')));
    const gi = labs.findIndex(l => /gilded/i.test(l));
    if (!/Failure|Mixed/i.test(labs[gi])) continue; // keeping the gilded die must leave a burnable result
    ada.send('roll', { action: 'strike', drive_spent: 0, ability_mods: [], roll_id: 'ada' + Date.now() }); await sleep(2500);
    await p.getByRole('button', { name: /^Dice and log/ }).first().click(); await sleep(800);
    const dotWhileWaiting = await dice.count();
    await shot(p, 'r20_gilded_waiting_other_rolled');
    await dice.nth(gi).focus(); await p.keyboard.press('Enter'); await sleep(2500);
    const ab = await afterBox(p);
    await shot(p, 'r21_after_keep_burn_offer');
    const before = rs();
    let burned = null, frames = [];
    if (ab && /Burn/i.test(ab)) {
      const m = br.frames.length;
      await p.getByRole('button', { name: /Burn and reroll/i }).first().click(); await sleep(3000);
      if (await dice.count()) { await dice.nth(0).focus(); await p.keyboard.press('Enter'); await sleep(2000); }
      burned = rs(); frames = L.parsed(br, 'in', m).map(x => x.m.type + (x.m.payload?.detail ? ':' + x.m.payload.detail : ''));
      await shot(p, 'r22_after_burn');
    }
    info = { labs, dotWhileWaiting, after: ab, before, burned, frames };
  }
  ada.close();
  check('roll-settling-client-server-mismatch', 'gilded keep after another roll: Burn offered and taken', !!info && /Burn/.test(info.after || '') && Number(info.burned) === Number(info.before) + 1, info);
  L.saveResults('rolls_R5b.json');
  console.log('errors', br.errors); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
