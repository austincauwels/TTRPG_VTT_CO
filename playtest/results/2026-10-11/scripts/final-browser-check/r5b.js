const L = require('./lib'); const { sleep, shot, state, sql } = L;
const rollBtn = (p, label) => p.locator(`button[data-roll-row][aria-label^="Roll ${label}"]`).first();
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
(async () => {
  const b = await L.launch();
  await L.fresh('bram', 'bram', {});
  const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
  const ada = await L.wsOpen(state.chars.ada.id, state.users.ada.token); await sleep(400);
  for (let i = 0; i < 5; i++) {
    const bt = rollBtn(p, 'Control'); await bt.scrollIntoViewIfNeeded(); await bt.tap(); await sleep(3000);
    const dice = p.locator('[data-keep-die]'); const n = await dice.count();
    console.log('try', i, 'keep dice', n, await dice.evaluateAll(d => d.map(x => x.tagName + ':' + x.getAttribute('aria-label'))));
    if (!n) continue;
    const mark = br.frames.length;
    ada.send('roll', { action: 'strike', drive_spent: 0, ability_mods: [], roll_id: 'ada' + Date.now() }); await sleep(2500);
    // pick the gilded die
    let idx = 0; for (let j = 0; j < n; j++) if (/gilded/i.test(await dice.nth(j).getAttribute('aria-label'))) idx = j;
    const lab = await dice.nth(idx).getAttribute('aria-label');
    await dice.nth(idx).focus(); await sleep(200);
    console.log('active', await p.evaluate(() => document.activeElement?.getAttribute('aria-label')));
    await p.keyboard.press('Enter'); await sleep(3000);
    console.log('kept', lab, 'out frames', L.parsed(br, 'out', mark).map(x => x.m.type + JSON.stringify(x.m.payload).slice(0, 120)));
    console.log('in frames', L.parsed(br, 'in', mark).map(x => x.m.type + (x.m.type === 'activity_log' ? x.m.payload.message : '')).slice(0, 12));
    console.log('after box', await afterBox(p), 'remaining keep dice', await dice.count());
    await shot(p, 'r17_gilded_after_keep_' + i);
    if (/Failure|Mixed/i.test(lab)) {
      const ab = await afterBox(p);
      if (ab && /Burn/.test(ab)) {
        const before = sql(`select nerve_resistance_spent, control_resistance from characters where id=${state.chars.bram.id}`).toString();
        break;
      }
    }
  }
  ada.close(); console.log('errors', br.errors); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
