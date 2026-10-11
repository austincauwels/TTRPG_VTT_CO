const L = require('./lib'); const { sleep, shot, state, sql } = L;
const afterBox = (p) => p.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => /^After the roll$/i.test(s.textContent.trim())); return h ? h.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim() : null; });
(async () => {
  const b = await L.launch();
  const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
  const dice = p.locator('[data-keep-die]');
  await p.getByRole('button', { name: /^Dice and log/ }).first().click(); await sleep(1200);
  await shot(p, 'r19a_dice_view');
  const m = br.frames.length;
  await dice.nth(0).focus(); await p.keyboard.press('Enter'); await sleep(2500);
  console.log('after Enter out:', L.parsed(br, 'out', m).map(x => x.m.type), 'dice left', await dice.count());
  if (await dice.count()) { await dice.nth(0).click({ force: true }); await sleep(2500); console.log('after tap out:', L.parsed(br, 'out', m).map(x => x.m.type + JSON.stringify(x.m.payload)), 'in:', L.parsed(br, 'in', m).map(x => x.m.type + (x.m.payload?.detail || x.m.payload?.message || '')), 'dice left', await dice.count()); }
  console.log('after box', await afterBox(p));
  await shot(p, 'r19_after_keep');
  await b.close();
})();
