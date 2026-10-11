const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const bram = await openDesk(b, process.argv[2] || 'phone', 'pb', 'b', 'S');
  const p = bram.page;
  await goTab(p, 'Notebook'); await sleep(1500);
  const read = () => p.evaluate(() => [...document.querySelectorAll('ol li')].map(li => { const s = li.querySelector('button span.line-clamp-2'); const n = li.querySelector('button span.font-mono'); if (!s) return null;
    const r = document.createRange(); r.selectNodeContents(s); const rects = [...r.getClientRects()]; const sb = s.getBoundingClientRect();
    return { t: s.textContent, p: n?.textContent, spanW: Math.round(sb.width), textRight: Math.round(Math.max(...rects.map(x => x.right)) - sb.right), lines: new Set(rects.map(x => Math.round(x.top))).size, sw: s.scrollWidth, cw: s.clientWidth }; }).filter(Boolean));
  console.log('toc page 1', JSON.stringify(await read()));
  const next = p.getByRole('button', { name: 'Next page of the contents' });
  if (await next.count()) { await next.click(); await sleep(1000); console.log('toc page 2', JSON.stringify(await read())); await shot(p, 't01_toc_page2_' + (process.argv[2] || 'phone')); }
  const rows = await read();
  for (const r of rows.slice(-2)) {
    await p.getByRole('button', { name: new RegExp(r.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click(); await sleep(1200);
    console.log('tapped', r.t, r.p, '->', await p.locator('text=/Field Notes, page \\d/').first().textContent(), '| card visible:', await p.locator('h3', { hasText: r.t }).filter({ visible: true }).count());
    await p.getByRole('button', { name: /^Contents$/ }).first().click(); await sleep(900);
    if (await next.count()) { await next.click(); await sleep(900); }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
