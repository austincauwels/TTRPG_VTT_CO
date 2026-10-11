// long-name-polaroid-sheet: polaroid, sheet header, dice slip at 1440x900 (table J2, sealed in SQL)
const L = require('./r8404_lib');
const { sql, sleep, shot, state } = L;
const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const J = state.camps.J2;
  const st = await L.api('GET', `/campaign/${J.id}/circle-creation-state`, state.users.lkj.token);
  sql(`update circles set is_finalized=true, name='The Long Names' where id=${st.circle_id}`);
  sql(`update campaigns set roster_finalized=true where id=${J.id}`);
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lkj', null, 'J2') });
  const cas = await L.openSeat(b, 'wide', { store: await L.storeFor('j1', 'J2ja', 'J2') });
  await sleep(5500);
  await shot(cas.page, 'N00_cas_desk');
  await cas.page.locator('[data-roll-row]').first().click(); await sleep(3500);
  await cas.page.keyboard.press('Enter').catch(() => {}); await sleep(1500);
  await shot(lk.page, 'N01_lk_slip');
  await shot(cas.page, 'N01_cas_slip');
  log('N01 slip name elements', await lk.page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Cassandra/i.test(e.textContent) && e.getClientRects().length).map((e) => { const cs = getComputedStyle(e); return { t: e.textContent.trim().slice(0, 60), over: e.scrollWidth > e.clientWidth, ws: cs.whiteSpace, to: cs.textOverflow, title: e.getAttribute('title') || e.closest('[title]')?.getAttribute('title') || '' }; })));
  // Polaroid: words broken mid-word?
  log('N02 polaroid name box', await lk.page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Cassandra "Latch" Moreau$/.test(e.textContent.trim()) && e.closest('button'));
    if (!el) return 'not found';
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { fs: cs.fontSize, h: Math.round(r.height), w: Math.round(r.width), sw: el.scrollWidth, cw: el.clientWidth, wb: cs.wordBreak, ow: cs.overflowWrap };
  }));
  await lk.page.getByText('Cassandra "Latch" Moreau', { exact: true }).first().click(); await sleep(2000);
  await shot(lk.page, 'N03_lk_sheet');
  log('N03 sheet header', await lk.page.evaluate(() => [...document.querySelectorAll('h1,h2,p,span,div')].filter((e) => e.children.length === 0 && /CASSANDRA|Cassandra/.test(e.textContent) && e.getClientRects().length).map((e) => ({ t: e.textContent.trim().slice(0, 40), sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }))));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
