const L = require('./lib'); const { sleep, shot, state, sql, check } = L;
const act = (p) => p.evaluate(() => { const e = document.activeElement; return { tag: e?.tagName, label: (e?.getAttribute('aria-label') || e?.innerText || '').replace(/\s+/g, ' ').slice(0, 60) }; });
(async () => {
  await L.fresh('bram', 'bram', {});
  const b = await L.launch();
  const br = await L.desk(b, 'laptop', 'bram', 'bram', 'S'); const p = br.page;
  const res = {};
  for (const choice of ['Take the mark', 'Use']) {
    const t = p.getByRole('button', { name: /^Take Body mark \d of 3/ }).first();
    await t.scrollIntoViewIfNeeded(); await t.focus(); await p.keyboard.press('Enter');
    const duringUndo = await act(p);
    const card = p.locator('[aria-label="Death Defy offer"]');
    let waited = 0; while (!(await card.count()) && waited < 15000) { await sleep(250); waited += 250; }
    await sleep(500);
    const onOpen = await act(p);
    let found = false;
    for (let i = 0; i < 8; i++) { const a = await act(p); if (new RegExp('^' + choice + '$', 'i').test(a.label)) { found = true; break; } await p.keyboard.press('Tab'); }
    await shot(p, `r16_deathdefy_card_${choice.replace(/\s/g, '_')}`);
    await p.keyboard.press('Enter'); await sleep(2500);
    const after = await act(p);
    await shot(p, `r16_deathdefy_after_${choice.replace(/\s/g, '_')}`);
    res[choice] = { duringUndo, waited, onOpen, found, after, db: sql(`select body_marks, ability_uses::text from characters where id=${state.chars.bram.id}`) };
  }
  check('death-defy-focus-returns-to-page', 'focus returns to the Body track after Take the mark and Use', Object.values(res).every(r => r.found && /Body/i.test(r.after.label) && r.after.tag !== 'BODY'), res);
  L.saveResults('rolls_R7.json'); console.log('errors', br.errors); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
