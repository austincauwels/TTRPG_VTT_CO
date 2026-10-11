const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { touchDrag } = require('./r8403_touch');
const { sleep, shot, state, api } = L;
const ids = require('/home/user/pt2/verify/out_8403/nb_ids.json');
const f = (seat, from) => L.parsed(seat, 'in', from).filter(x => ['notebook_entry', 'activity_log'].includes(x.m.type)).map(x => x.m.type === 'activity_log' ? 'log:' + x.m.payload.message : 'entry:' + x.m.payload.id + ':' + x.m.payload.title);
(async () => {
  const b = await L.launch();
  const lk = await openDesk(b, 'wide', 'lk', null, 'S');
  const bram = await openDesk(b, 'phone', 'pb', 'b', 'S');
  const dev = await openDesk(b, 'tablet', 'pa', 'a', 'S');
  await lk.page.getByRole('button', { name: /^Notebook/i }).first().click();
  await goTab(bram.page, 'Notebook');
  const p = dev.page;
  await goTab(p, 'Notebook');
  await sleep(1500);
  await lk.page.getByRole('button', { name: /Tower of Saint Aldric/ }).first().click(); await sleep(1200);
  await bram.page.getByRole('button', { name: /Tower of Saint Aldric/ }).first().click(); await sleep(1200);
  const srcs = (seat) => seat.page.evaluate((id) => [...document.querySelectorAll(`[data-entry-id="${id}"] img`)].map(i => i.src.length), ids.sketch);
  const s0 = { lk: await srcs(lk), bram: await srcs(bram) };
  // Redraw
  await p.getByRole('button', { name: /Tower of Saint Aldric/ }).first().tap(); await sleep(1200);
  await p.getByRole('button', { name: /Keep drawing Tower/i }).first().tap();
  await sleep(3500);
  const tb = p.getByRole('toolbar', { name: 'Drawing tools' });
  const cv = await p.locator('canvas.interactive').first().boundingBox();
  const X = (dx) => cv.x + dx, Y = (dy) => cv.y + dy;
  console.log('tool on reopen:', await tb.locator('button[aria-pressed=true]').getAttribute('aria-label'));
  await tb.getByRole('button', { name: 'Ellipse' }).tap();
  await touchDrag(p, [X(80), Y(460)], [X(300), Y(570)]);
  await touchDrag(p, [X(300), Y(515)], [X(420), Y(580)]);
  await p.getByRole('button', { name: /^Save sketch$/i }).tap();
  await sleep(2500);
  const s1 = { lk: await srcs(lk), bram: await srcs(bram) };
  console.log('img src lengths before', JSON.stringify(s0), 'after redraw', JSON.stringify(s1));
  await shot(lk.page, 'n10_lk_after_redraw');
  await shot(bram.page, 'n11_bram_after_redraw', { fullPage: false });
  // Contents, then a photo with a caption
  await p.getByRole('button', { name: /^Contents$/ }).first().tap(); await sleep(1000);
  const mb = bram.frames.length;
  await p.locator('input[type=text]').first().fill('Harbour office ledger');
  await p.locator('input[type=file][accept="image/*"]').setInputFiles('/home/user/pt2/verify/out_8403/photo.png');
  await sleep(800);
  await p.locator('input[placeholder^="Caption"]').fill('page torn out');
  await p.getByRole('button', { name: /^Add entry$/i }).tap();
  await sleep(2500);
  const cardInfo = (id) => p.evaluate((id) => { const el = [...document.querySelectorAll(`[data-entry-id="${id}"]`)].find(n => n.offsetParent !== null); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, inView: r.top < innerHeight && r.bottom > 0, focused: document.activeElement === el, h3: el.querySelector('h3')?.textContent, text: el.querySelector('.md-note')?.innerText }; }, id);
  const latest = async () => { const e = await api('GET', `/api/notebook/${state.camps.S.id}/entries?role=player&character_id=${state.chars.a.id}`, state.users.pa.token); return e.filter(x => ['field_log', 'sketch', 'photo'].includes(x.entry_type)).pop(); };
  let e = await latest();
  console.log('photo entry', e.title, JSON.stringify(e.content), JSON.stringify(await cardInfo(e.id)));
  // Text entries
  const titles = ['Saint Aldric, harbour office: the eighth man', 'Saint Aldric, harbour office: the ledger missing a page', 'The fog at the canal', 'Commissioner Vane says nothing', 'A smell of ozone and wet earth', 'Briarbank tram tunnels'];
  for (const [i, t] of titles.entries()) {
    await p.getByRole('button', { name: /^Contents$/ }).first().tap().catch(() => {}); await sleep(900);
    await p.locator('input[type=text]').first().fill(t);
    await p.locator('textarea').first().fill(`Entry ${i + 3}: *slanted words* and **bold words**, a [link](https://example.com) here.\nSecond line.\nThird line.\nFourth line.`);
    if (i === 3) await shot(p, 'n12_before_add4');
    await p.getByRole('button', { name: /^Add entry$/i }).tap();
    await sleep(2200);
    e = await latest();
    const ci = await cardInfo(e.id);
    console.log('added', i + 3, e.title === t, JSON.stringify(ci));
    if (i === 3) await shot(p, 'n13_after_add4');
  }
  await sleep(800);
  console.log('bram frames:', f(bram, mb));
  // Bram phone: the contents
  await bram.page.getByRole('button', { name: /^Contents$/ }).first().click().catch(() => {}); await sleep(1200);
  await shot(bram.page, 'n14_bram_contents', { fullPage: true });
  const toc = await bram.page.evaluate(() => [...document.querySelectorAll('ol li')].map(li => { const s = li.querySelector('button span.line-clamp-2'); const n = li.querySelector('button span.font-mono'); return s && { t: s.textContent, cut: s.scrollHeight > s.clientHeight + 1, h: Math.round(li.getBoundingClientRect().height), p: n?.textContent }; }).filter(Boolean));
  console.log('bram toc', JSON.stringify(toc));
  const last = toc[toc.length - 1];
  await bram.page.getByRole('button', { name: new RegExp(last.t) }).first().click(); await sleep(1200);
  console.log('bram page header after tapping', last.t, last.p, ':', await bram.page.locator('text=/Field Notes, page \\d/').first().textContent());
  await shot(bram.page, 'n15_bram_page2');
  console.log('errors', dev.errors.slice(0, 5), lk.errors.slice(0, 3), bram.errors.slice(0, 3));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
