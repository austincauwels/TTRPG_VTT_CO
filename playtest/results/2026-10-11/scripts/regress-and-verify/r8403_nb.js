// Notebook on the tablet (Dev seat = Iris Vane), watched by the Lightkeeper (1440) and Bram (phone)
const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { touchDrag } = require('./r8403_touch');
const { sleep, shot, state, api } = L;
(async () => {
  const b = await L.launch();
  const lk = await openDesk(b, 'wide', 'lk', null, 'S');
  const bram = await openDesk(b, 'phone', 'pb', 'b', 'S');
  const dev = await openDesk(b, 'tablet', 'pa', 'a', 'S');
  await lk.page.getByRole('button', { name: /^Notebook/i }).first().click().catch(e => console.log('lk nb', e.message));
  await sleep(1500);
  await shot(lk.page, 'n00_lk_notebook');
  await goTab(bram.page, 'Notebook');
  const p = dev.page;
  await goTab(p, 'Notebook');
  await sleep(1200);
  const mark = { lk: lk.frames.length, bram: bram.frames.length, dev: dev.frames.length };
  // 1. title, then a sketch with two boxes, two lines, two ellipses
  await p.locator('input[type=text]').first().fill('Tower of Saint Aldric');
  await p.getByRole('button', { name: /^Sketch$/i }).tap();
  await sleep(3500);
  const tb = p.getByRole('toolbar', { name: 'Drawing tools' });
  const cv = await p.locator('canvas.interactive').first().boundingBox();
  const X = (dx) => cv.x + dx, Y = (dy) => cv.y + dy;
  await tb.getByRole('button', { name: 'Box' }).tap();
  await touchDrag(p, [X(60), Y(60)], [X(260), Y(200)]);
  const pressedAfter1 = await tb.locator('button[aria-pressed=true]').getAttribute('aria-label');
  await touchDrag(p, [X(260), Y(130)], [X(420), Y(330)]);   // starts on box 1's right edge
  await tb.getByRole('button', { name: 'Line' }).tap();
  await touchDrag(p, [X(60), Y(400)], [X(300), Y(420)]);
  await touchDrag(p, [X(180), Y(410)], [X(330), Y(520)]);   // starts on line 1
  await tb.getByRole('button', { name: 'Ellipse' }).tap();
  await touchDrag(p, [X(480), Y(60)], [X(640), Y(180)]);
  await touchDrag(p, [X(560), Y(180)], [X(700), Y(300)]);   // starts on ellipse 1's bottom
  await tb.getByRole('button', { name: 'Arrow' }).tap();
  await touchDrag(p, [X(450), Y(400)], [X(650), Y(450)]);
  await touchDrag(p, [X(550), Y(425)], [X(700), Y(560)]);
  const pressedEnd = await tb.locator('button[aria-pressed=true]').getAttribute('aria-label');
  console.log('pressed after 1st box:', pressedAfter1, 'at end:', pressedEnd);
  await shot(p, 'n01_sketch_drawn');
  await p.getByRole('button', { name: /Add to entry/i }).tap();
  await sleep(1500);
  const cap = p.locator('input[placeholder^="Caption"]');
  console.log('caption inputs with picture:', await cap.count(), await cap.getAttribute('aria-label'));
  await cap.fill('the north face, from the quay');
  await shot(p, 'n02_staged', { fullPage: true });
  await p.getByRole('button', { name: /^Add entry$/i }).tap();
  await sleep(3000);
  await shot(p, 'n03_after_add');
  const ent = await api('GET', `/api/notebook/${state.camps.S.id}/entries?role=player&character_id=${state.chars.a.id}`, state.users.pa.token);
  const sk = ent.find(e => e.entry_type === 'sketch');
  console.log('saved sketch entry:', JSON.stringify({ id: sk.id, title: sk.title, content: sk.content, has_scene: sk.has_scene }));
  const scene = await api('GET', `/api/notebook/entries/${sk.id}/scene`, state.users.pa.token);
  console.log('scene elements:', JSON.stringify(scene.elements.filter(e => !e.isDeleted).map(e => [e.type, Math.round(e.x), Math.round(e.y), Math.round(e.width), Math.round(e.height)])));
  const card = await p.locator(`[data-entry-id="${sk.id}"]`).filter({ visible: true }).first().evaluate(el => ({
    h3: el.querySelector('h3')?.textContent, text: el.querySelector('.md-note')?.innerText, emStyle: (() => { const e = el.querySelector('.md-note em'); if (!e) return null; const c = getComputedStyle(e); return c.fontStyle + ' ' + c.textDecorationLine; })(),
    inView: (() => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })(), focused: document.activeElement === el,
  }));
  console.log('dev card:', JSON.stringify(card));
  const f = (seat, from) => L.parsed(seat, 'in', from).filter(x => ['notebook_entry', 'activity_log'].includes(x.m.type)).map(x => x.m.type === 'activity_log' ? 'log:' + x.m.payload.message : 'entry:' + x.m.payload.id + ':' + x.m.payload.title + ':' + (x.m.payload.image_data || '').length);
  console.log('frames lk:', f(lk, mark.lk), 'bram:', f(bram, mark.bram), 'dev:', f(dev, mark.dev));
  await sleep(500);
  await shot(lk.page, 'n04_lk_after_sketch');
  await shot(bram.page, 'n05_bram_after_sketch');
  const lkHas = await lk.page.locator(`text=Tower of Saint Aldric`).count();
  const bramHas = await bram.page.locator(`text=Tower of Saint Aldric`).count();
  console.log('title on lk page:', lkHas, 'on bram page:', bramHas);
  // 2. Keep drawing: one more box, Save sketch
  const m2 = { lk: lk.frames.length, bram: bram.frames.length };
  const lkSrc0 = await lk.page.evaluate((id) => [...document.querySelectorAll(`[data-entry-id="${id}"] img`)].map(i => i.src.length), sk.id);
  await p.getByRole('button', { name: /Keep drawing Tower/i }).first().tap();
  await sleep(3500);
  await tb.getByRole('button', { name: 'Box' }).tap();
  await touchDrag(p, [X(100), Y(450)], [X(380), Y(560)]);
  await p.getByRole('button', { name: /^Save sketch$/i }).tap();
  await sleep(2500);
  console.log('frames after redraw lk:', f(lk, m2.lk), 'bram:', f(bram, m2.bram));
  const lkSrc1 = await lk.page.evaluate((id) => [...document.querySelectorAll(`[data-entry-id="${id}"] img`)].map(i => i.src.length), sk.id);
  console.log('lk img src length before/after redraw', lkSrc0, lkSrc1);
  // 3. a photo with caption
  const m3 = { lk: lk.frames.length };
  await p.locator('input[type=text]').first().fill('Harbour office ledger');
  await p.locator('input[type=file][accept="image/*"]').setInputFiles('/home/user/pt2/verify/out_8403/photo.png');
  await sleep(800);
  await p.locator('input[placeholder^="Caption"]').fill('page torn out');
  await p.getByRole('button', { name: /^Add entry$/i }).tap();
  await sleep(2500);
  console.log('frames after photo lk:', f(lk, m3.lk));
  // 4. a text entry: the caption is not offered
  console.log('caption inputs on text entry:', await p.locator('input[placeholder^="Caption"]').count());
  require('fs').writeFileSync('/home/user/pt2/verify/out_8403/nb_ids.json', JSON.stringify({ sketch: sk.id }));
  console.log('errors', dev.errors.slice(0, 5), lk.errors.slice(0, 3), bram.errors.slice(0, 3));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
