const L = require('./v8444_lib');
const { sleep } = L;
const H = {};
H.log = (page) => page.$$eval('[data-desk="log"] p', ps => ps.map(p => p.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
H.rollBtn = (page, label) => page.locator(`button[data-roll-row][aria-label^="Roll ${label}"]`).first();
H.roll = async (page, label, opts = {}) => {
  const b = H.rollBtn(page, label);
  await b.scrollIntoViewIfNeeded();
  if (opts.tap) await b.tap(); else await b.click();
  await sleep(opts.wait ?? 2500);
};
H.slip = (page) => page.$$eval('[data-result-slip]', s => s.map(e => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
H.keepLabels = (page) => page.$$eval('[data-keep-die]', s => s.map(e => e.getAttribute('aria-label')));
H.keep = async (page, which) => {
  const dice = page.locator('[data-keep-die]');
  const n = await dice.count();
  for (let i = 0; i < n; i++) {
    const lab = await dice.nth(i).getAttribute('aria-label');
    if ((which === 'gilded') === /gilded/i.test(lab)) { await dice.nth(i).focus(); await page.keyboard.press('Enter'); return lab; }
  }
  return null;
};
H.after = (page) => page.$$eval('*', () => {
  const h = [...document.querySelectorAll('span')].filter(s => s.textContent.trim() === 'After the roll');
  return h.map(s => s.closest('div.bg-ink')?.innerText.replace(/\s+/g, ' ').trim());
}).catch(() => []);
H.char = (id) => JSON.parse(L.sql(`select row_to_json(c) from (select nerve_current, cunning_current, intuition_current, body_marks, brain_marks, bleed_marks, scars_count, ability_uses, nerve_resistance_spent, cunning_resistance_spent, intuition_resistance_spent from characters where id=${id}) c`));
H.inj = (seat, type, payload) => { const s = seat.sockets.filter(r => !r.closedAt).slice(-1)[0]; s.server.send(JSON.stringify({ type, payload })); };
module.exports = H;
