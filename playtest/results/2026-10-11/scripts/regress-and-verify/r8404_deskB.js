// Sections, strip, trauma edit, resources, pass notes, phone/tablet hourglass, long name.
const fs = require('fs');
const L = require('./r8404_lib');
const { sql, sleep, shot, state, parsed } = L;
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); };
const logLines = (page, n = 6) => page.evaluate((n) => [...document.querySelectorAll('[data-desk=log] p')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-n), n);
const stripInfo = (page) => page.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), pos: getComputedStyle(e).position, text: e.innerText.replace(/\s+/g, ' ').slice(0, 90) }; }));

(async () => {
  const b = await L.launch();
  const cid = state.camps.S.circleId;
  sql(`update circles set tension_clock=2, resources_editable=true, stitch=2, refresh=2, train=2 where id=${cid}`);
  sql(`update characters set resources_spent_assignment=0 where campaign_id=${state.camps.S.id}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const iris = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  const bram = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  const P = lk.page;

  // ---- Phone: the strip while scrolling the sheet, and the dice tray's empty state
  await iris.page.mouse.wheel(0, 1500); await sleep(800);
  log('B01 iris strip after scrolling 1500', await stripInfo(iris.page));
  await shot(iris.page, 'B01_iris_scrolled');
  await iris.page.getByRole('button', { name: /^Dice and log/ }).click(); await sleep(1200);
  await shot(iris.page, 'B02_iris_dice');
  log('B02 iris dice text', await iris.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 600)));
  log('B02 iris strip on dice', await stripInfo(iris.page));
  await iris.page.getByRole('button', { name: /^Dice and log/ }).click().catch(() => {}); await sleep(800);
  // Tablet: strip while scrolling, DOM order of sidebar vs dice
  await bram.page.mouse.wheel(0, 1800); await sleep(800);
  log('B03 bram strip after scrolling 1800', await stripInfo(bram.page));
  await shot(bram.page, 'B03_bram_scrolled');
  log('B03 bram DOM order', await bram.page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-desk]')].map((e) => e.getAttribute('data-desk'));
    const hg = document.querySelector('[role=img][aria-label^="Tension"]');
    const log = document.querySelector('[data-desk=log]');
    const tray = document.querySelector('[data-desk=tray], [data-desk=dice]');
    const pos = (a, c) => (a && c ? (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING ? 'before' : 'after') : 'n/a');
    const r = (e) => (e ? Math.round(e.getBoundingClientRect().top + scrollY) : null);
    return { desks: all, hourglassVsLog: `hourglass is ${pos(hg, log)} log in DOM`, hourglassTop: r(hg), logTop: r(log), pageH: document.documentElement.scrollHeight };
  }));
  // Tablet Notebook: strip above it
  await bram.page.evaluate(() => scrollTo(0, 0));
  await bram.page.getByRole('button', { name: /^Notebook/ }).first().click(); await sleep(1500);
  log('B04 bram strip on Notebook', await stripInfo(bram.page));
  await shot(bram.page, 'B04_bram_notebook');
  await bram.page.getByRole('button', { name: /^Investigator/ }).first().click(); await sleep(1200);

  // ---- LK: open Bram's sheet, strip; Circle, Map; Roster returns roster
  await P.getByText('Bram Holt', { exact: true }).first().click(); await sleep(2000);
  log('B05 lk strip on sheet', await stripInfo(P));
  await shot(P, 'B05_lk_bram_sheet');
  await P.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  log('B06 lk strip on Circle', await stripInfo(P));
  await shot(P, 'B06_lk_circle');
  await P.getByRole('button', { name: /^Map/ }).first().click(); await sleep(1500);
  log('B07 lk strip on Map', await stripInfo(P));
  await P.getByRole('button', { name: /^Roster/ }).first().click(); await sleep(1500);
  log('B08 roster after Map: sheet open?', await P.evaluate(() => !!document.querySelector('[class*=trauma-record]') || /Back to roster/i.test(document.body.innerText)));
  await shot(P, 'B08_lk_roster_back');

  // ---- Trauma edit on Bram's sheet
  await P.getByText('Bram Holt', { exact: true }).first().click(); await sleep(2000);
  const edit = P.getByRole('button', { name: /^Edit .*trauma record/ });
  log('B09 edit label', await edit.getAttribute('aria-label'));
  await edit.scrollIntoViewIfNeeded(); await edit.click(); await sleep(600);
  log('B09 hint', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).find((t) => /^Editing/.test(t)) || 'no hint'));
  log('B09 bleed box labels (0 marks)', await P.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || '').filter((l) => /Bleed mark/.test(l))));
  await shot(P, 'B09_lk_trauma_edit');
  const l0 = await logLines(P, 1);
  await P.getByRole('button', { name: 'Set Bleed marks to 2' }).click(); await sleep(1200);
  log('B10 bleed box labels (2 marks)', await P.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || '').filter((l) => /Bleed mark/.test(l))));
  await P.getByRole('button', { name: 'Clear Bleed mark 2' }).click(); await sleep(1200);
  await P.getByRole('button', { name: 'Clear Bleed mark 1' }).click(); await sleep(1200);
  log('B10 lk log after 2,1,0', await logLines(P, 4));
  log('B10 bram log after 2,1,0', await logLines(bram.page, 4));
  await P.getByRole('button', { name: /^Done editing/ }).click(); await sleep(500);

  // ---- Resources: Iris spends Refresh twice (two-press), LK gives one back
  await iris.page.getByRole('button', { name: /^Menu/ }).click(); await sleep(600);
  await iris.page.getByRole('button', { name: /^Circle/ }).click(); await sleep(1500);
  for (const r of ['Refresh', 'Stitch']) {
    const btn = iris.page.getByRole('button', { name: `Spend 1 ${r}` });
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(700);
    await iris.page.getByRole('button', { name: `Press again: spend 1 ${r}` }).click(); await sleep(1500);
  }
  log('B11 iris spent', sql(`select resources_spent_assignment from characters where id=${state.chars.a.id}`));
  log('B11 circle pools', sql(`select stitch, refresh, train from circles where id=${cid}`));
  await shot(iris.page, 'B11_iris_spent2');
  // LK opens Iris's sheet
  await P.getByRole('button', { name: /Back to roster/i }).click(); await sleep(1000);
  await P.getByText('Iris Vane', { exact: true }).first().click(); await sleep(2000);
  const sb = P.getByRole('button', { name: 'Give a spend back' });
  await sb.scrollIntoViewIfNeeded();
  log('B12 spend line', await P.evaluate(() => [...document.querySelectorAll('span')].map((s) => s.innerText).find((t) => /Circle spends this assignment/i.test(t))));
  await P.locator('select').filter({ hasText: 'Nothing' }).selectOption('refresh');
  await shot(P, 'B12_lk_spendback');
  await sb.dblclick(); await sleep(2000);
  log('B12 after give back (dblclick)', sql(`select resources_spent_assignment from characters where id=${state.chars.a.id}`) + ' pools ' + sql(`select stitch, refresh, train from circles where id=${cid}`));
  log('B12 spend line after', await P.evaluate(() => [...document.querySelectorAll('span')].map((s) => s.innerText).find((t) => /Circle spends this assignment/i.test(t))));
  log('B12 lk log', await logLines(P, 4));
  log('B12 iris text spends', await iris.page.evaluate(() => (document.body.innerText.match(/Your spends\s*\d \/ 2/) || ['none'])[0]));
  // Reset wording
  const rs = P.getByRole('button', { name: 'Reset drive and ability uses' });
  await rs.click(); await sleep(400);
  log('B13 reset armed hint', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).find((t) => /Press again to refill/.test(t))));
  await P.getByRole('button', { name: 'Yes, reset' }).click(); await sleep(1500);
  log('B13 lk log after reset', await logLines(P, 2));
  log('B13 spent after reset', sql(`select resources_spent_assignment from characters where id=${state.chars.a.id}`));
  // LK edits the pool on the Circle page
  await P.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  const pip = P.locator('[role=button][aria-label^="Add Train"]').first();
  log('B14 train pip', await pip.getAttribute('aria-label'));
  await pip.click(); await sleep(1500);
  log('B14 lk strip / log after pool edit', await stripInfo(P));
  log('B14 iris log after pool edit', await logLines(iris.page, 2));

  // ---- Pass Notes on the tablet: a 300-character note
  await bram.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const msg = bram.page.getByPlaceholder('Message').first();
  await msg.scrollIntoViewIfNeeded();
  const NOTE = 'We should not go down into the crypt tonight. The water is rising and the bell has rung twice already; ' +
    'I think the second ring was a warning from whoever keeps the tower. Let us wait for the tide, then go in with the rope, the lantern and Iris at the front. Bram, keep the camera dry. Ends.';
  await msg.fill(NOTE.slice(0, 300));
  await sleep(300);
  log('B15 pass note field', await msg.evaluate((e) => ({ tag: e.tagName, sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, len: e.value.length })));
  await shot(bram.page, 'B15_bram_passnote');
  await msg.press('Enter'); await sleep(1500);
  log('B15 after Enter', await msg.evaluate((e) => e.value.length));
  log('B15 lk last log', await logLines(P, 1));
  log('errors', { lk: lk.errors.slice(0, 5), iris: iris.errors.slice(0, 5), bram: bram.errors.slice(0, 5) });
  fs.writeFileSync(L.DIR + '/out_8404/deskB.json', JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); fs.writeFileSync(L.DIR + '/out_8404/deskB.json', JSON.stringify(out, null, 1)); process.exit(1); });
