// Pass Notes on the tablet; tablet roll flow with a timer running; long-name roll slip.
const fs = require('fs');
const L = require('./r8404_lib');
const { sql, sleep, shot, state } = L;
const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));
const stripInfo = (page) => page.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), text: e.innerText.replace(/\s+/g, ' ').slice(0, 60) }; }));
(async () => {
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const bram = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  const P = lk.page;
  // A 3:00 timer running
  const clear = P.getByRole('button', { name: 'Clear the timer' });
  if (await clear.isEnabled()) { await clear.click(); await sleep(800); }
  await P.getByLabel('Timer minutes').fill('3'); await P.getByLabel('Timer minutes').press('Enter'); await sleep(700);
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(1500);
  // Pass Notes on the tablet
  if (process.env.SKIPNOTE) {} else {
  const msg = bram.page.getByPlaceholder('Message').first();
  await msg.scrollIntoViewIfNeeded();
  const NOTE = ('We should not go down into the crypt tonight. The water is rising and the bell has rung twice already; ' +
    'I think the second ring was a warning from whoever keeps the tower. Let us wait for the tide, then go in with the rope, the lantern and Iris at the front. Bram, keep the camera dry.').slice(0, 300);
  await msg.fill(NOTE);
  await sleep(300);
  log('D01 pass note field', await msg.evaluate((e) => ({ tag: e.tagName, sh: e.scrollHeight, ch: e.clientHeight, w: e.clientWidth, len: e.value.length })));
  await shot(bram.page, 'D01_bram_passnote');
  await msg.press('Shift+Enter'); await sleep(200);
  log('D01 after Shift+Enter value has newline', await msg.evaluate((e) => e.value.includes('\n')));
  await msg.press('Enter'); await sleep(1500);
  log('D01 after Enter value length', await msg.evaluate((e) => e.value.length));
  log('D01 bram field height after send', await msg.evaluate((e) => e.clientHeight));
  log('D01 lk last log', await P.evaluate(() => [...document.querySelectorAll('[data-desk=log] p')].slice(-1).map((e) => e.innerText.slice(0, 120))));
  }
  // Tablet roll flow: back to the top, tap Move on the sheet
  await bram.page.evaluate(() => scrollTo(0, 0)); await sleep(500);
  const move = bram.page.locator('[data-roll-row]').first();
  log('D02 move label', await move.innerText());
  await move.scrollIntoViewIfNeeded(); await move.click(); await sleep(1500);
  log('D02 scrollY after tapping Move', await bram.page.evaluate(() => scrollY));
  log('D02 strip after tapping Move', await stripInfo(bram.page));
  await shot(bram.page, 'D02_bram_after_move');
  {
    await sleep(2500);
    await bram.page.keyboard.press('Enter').catch(() => {}); await sleep(1500);
    log('D03 scrollY after roll', await bram.page.evaluate(() => scrollY));
    log('D03 strip after roll', await stripInfo(bram.page));
    log('D03 timer visible in viewport?', await bram.page.evaluate(() => [...document.querySelectorAll('[role=timer]')].map((t) => { const r = t.getBoundingClientRect(); return `${t.textContent} top=${Math.round(r.top)} vis=${r.bottom > 0 && r.top < innerHeight}`; })));
    await shot(bram.page, 'D03_bram_after_roll');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
