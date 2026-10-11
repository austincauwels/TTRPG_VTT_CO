// Table events: dispatch, tension limits, clock name, timer status, strip, dots, sections.
// LK 1440x900, Iris phone 390x844, Bram tablet 820x1180, on the sealed table S.
const fs = require('fs');
const L = require('./r8404_lib');
const { sql, sleep, shot, state, framesOf, parsed } = L;
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); };

const statusText = (page) => page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((e) => JSON.stringify(e.textContent)).join(' | '));
const logLines = (page) => page.evaluate(() => {
  const items = [...document.querySelectorAll('[data-desk=log] p')].filter((e) => e.getClientRects().length).map((li) => li.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return items.slice(-8);
});
const stripText = (page) => page.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].filter((e) => e.offsetParent || e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')));
const dots = (page) => page.evaluate(() => [...document.querySelectorAll('[data-new-dot]')].filter((e) => e.getClientRects().length).map((e) => {
  const b = e.closest('button'); return b ? (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim() : 'dot outside a button';
}));

(async () => {
  const b = await L.launch();
  // Start clean: tension 0, no timer, no dispatch
  const cid = state.camps.S.circleId;
  sql(`update circles set tension_clock=0, tension_label='', location='', atmosphere='', dispatch_text='' where id=${cid}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const iris = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  const bram = await L.openSeat(b, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  await shot(lk.page, 'A00_lk_start');
  await shot(iris.page, 'A00_iris_start');
  await shot(bram.page, 'A00_bram_start', { fullPage: true });
  log('A00 iris dots', await dots(iris.page));

  // ---- Dispatch (own words) with a long location
  const P = lk.page;
  await P.getByRole('button', { name: 'Own words' }).click();
  const LOC = 'The flooded crypt beneath the Church of Saint Aldric the Unmourned, Newfaire Old Quarter';
  await P.locator('#dispatch-location').fill(LOC);
  await P.getByLabel('Your dispatch').fill('Go to the crypt at once. Bring lanterns, a rope and no more than two of you.');
  await sleep(300);
  const locBox = await P.locator('#dispatch-location').boundingBox();
  const locScroll = await P.locator('#dispatch-location').evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth }));
  log('A01 location box', { locBox, locScroll });
  log('A01 status line before send', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks/i.test(t))));
  await P.locator('#dispatch-location').scrollIntoViewIfNeeded();
  await shot(P, 'A01_lk_dispatch_typed');
  const lkOut0 = lk.frames.length;
  await P.getByRole('button', { name: 'Dispatch', exact: true }).click();
  await sleep(2500);
  log('A02 status line after send', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks|Dispatched at/i.test(t))));
  await shot(P, 'A02_lk_dispatched');
  log('A02 lk log', await logLines(P));
  log('A02 iris dots', await dots(iris.page));
  log('A02 iris strip', await stripText(iris.page));
  await shot(iris.page, 'A02_iris_after_dispatch');
  log('A02 bram strip', await stripText(bram.page));
  log('A02 bram dots', await dots(bram.page));

  // Section switch and back: receipt / status line
  await P.getByRole('button', { name: /Notebook/ }).first().click(); await sleep(1500);
  log('A03 lk strip on notebook', await stripText(P));
  await shot(P, 'A03_lk_notebook');
  await P.getByRole('button', { name: /Roster/ }).first().click(); await sleep(1500);
  log('A03 status line after Notebook and back', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks|Dispatched at/i.test(t))));
  await shot(P, 'A03_lk_back_roster');
  // Reload: still On the players' desks?
  await P.reload({ waitUntil: 'domcontentloaded' }); await sleep(4000);
  log('A03b status line after reload', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks|Dispatched at/i.test(t))));
  // Trailing space in location: does onDesks still match after the server answer?
  await P.locator('#dispatch-location').fill('The bell tower ');
  await P.getByRole('button', { name: 'Dispatch', exact: true }).click(); await sleep(2500);
  log('A03c status after location with trailing space', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks|Dispatched at/i.test(t))));
  log('A03c server location', sql(`select '['||location||']' from circles where id=${cid}`));
  await P.reload({ waitUntil: 'domcontentloaded' }); await sleep(4000);
  log('A03d after reload', await P.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => /dispatched yet|players' desks|Dispatched at/i.test(t))));

  // ---- Iris opens the Menu: dot on the row, then From the Lightkeeper clears it
  const menu = iris.page.getByRole('button', { name: /^Menu/ });
  log('A04 iris menu label', await menu.evaluate((e) => e.innerText + ' | ' + (e.getAttribute('aria-label') || '')));
  await menu.click(); await sleep(800);
  log('A04 iris drawer dots', await dots(iris.page));
  await shot(iris.page, 'A04_iris_drawer');
  await iris.page.getByRole('button', { name: /From the Lightkeeper/ }).click(); await sleep(1200);
  await shot(iris.page, 'A04_iris_dispatch_part');
  await iris.page.getByRole('button', { name: /^Menu/ }).click(); await sleep(600);
  log('A04 iris drawer dots after looking', await dots(iris.page));
  await iris.page.getByRole('button', { name: /^Investigator/ }).click(); await sleep(800);

  // ---- Tension: up to 4, then + at 4; down to 0, - at 0
  const plus = P.getByRole('button', { name: 'Raise tension by one' });
  const minus = P.getByRole('button', { name: 'Lower tension by one' });
  log('A05 minus aria-disabled at 0', await minus.getAttribute('aria-disabled'));
  let f0 = lk.frames.length;
  await minus.click({ force: true }); await sleep(800);
  log('A05 frames sent by - at 0', parsed(lk, 'out', f0).map((x) => x.m.type));
  for (let i = 0; i < 4; i++) { await plus.click(); await sleep(700); }
  log('A06 plus aria-disabled at 4', await plus.getAttribute('aria-disabled'));
  f0 = lk.frames.length;
  const if0 = iris.frames.length;
  await plus.click({ force: true }); await sleep(300); await plus.dblclick({ force: true }); await sleep(1000);
  log('A06 frames sent by + at 4', parsed(lk, 'out', f0).map((x) => x.m.type));
  log('A06 frames iris got after + at 4', parsed(iris, 'in', if0).map((x) => x.m.type));
  await P.mouse.move(10, 890); await sleep(300);
  await shot(P, 'A06_lk_tension4');
  log('A06 lk log', await logLines(P));
  log('A06 iris strip', await stripText(iris.page));
  log('A06 iris dots', await dots(iris.page));
  await shot(iris.page, 'A06_iris_tension4');
  log('A06 tension buttons title/opacity', await P.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /tension by one/.test(b.getAttribute('aria-label') || '')).map((b) => ({ l: b.getAttribute('aria-label'), ad: b.getAttribute('aria-disabled'), op: getComputedStyle(b).opacity }))));

  // ---- Clock name: long, grows?
  const clock = P.getByLabel(/Clock name/i).first();
  log('A07 clock field tag', await clock.evaluate((e) => e.tagName + ' rows=' + e.getAttribute('rows')));
  await clock.click();
  await clock.fill('THE BELL READS THE NEXT NAME ALOUD AT MIDNIGHT');
  await sleep(200);
  log('A07 clock field size', await clock.evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, val: e.value })));
  await shot(P, 'A07_lk_clock_typing');
  f0 = lk.frames.length;
  await clock.press('Enter'); await sleep(500);
  await P.mouse.click(700, 880); await sleep(800);
  log('A07 frames from clock name Enter+blur', parsed(lk, 'out', f0).map((x) => `${x.m.type}:${JSON.stringify(x.m.payload).slice(0, 120)}`));
  f0 = lk.frames.length;
  await clock.click(); await sleep(200); await P.mouse.click(700, 880); await sleep(800);
  log('A07 frames from focus/blur without change', parsed(lk, 'out', f0).map((x) => x.m.type));
  await shot(P, 'A07_lk_clock_set');
  log('A07 clock after set', await clock.evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, val: e.value })));
  await shot(bram.page, 'A07_bram_clock', { fullPage: true });

  // ---- Timer: switch on, 0:05, start, run out
  log('A08 statuses at start: lk', await statusText(P));
  await P.getByRole('switch', { name: 'Timer beside the hourglass' }).click(); await sleep(1000);
  log('A08 reset label with no duration', await P.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /Reset the timer/.test(b.getAttribute('aria-label') || '')).map((b) => b.getAttribute('aria-label') + (b.disabled ? ' (disabled)' : ''))));
  await P.getByLabel('Timer minutes').fill('0');
  await P.getByLabel('Timer seconds').fill('06');
  await P.getByLabel('Timer seconds').press('Enter'); await sleep(800);
  log('A08 reset label with 0:06', await P.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /Reset the timer/.test(b.getAttribute('aria-label') || '')).map((b) => b.getAttribute('aria-label'))));
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(1500);
  log('A09 iris strip running', await stripText(iris.page));
  log('A09 bram strip running', await stripText(bram.page));
  log('A09 statuses running', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  await shot(iris.page, 'A09_iris_timer_running');
  await shot(bram.page, 'A09_bram_timer_running');
  log('A09 iris dots', await dots(iris.page));
  await sleep(6500);
  log('A10 statuses at 0:00', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  log('A10 lk log', await logLines(P));
  log('A10 iris strip done', await stripText(iris.page));
  await shot(iris.page, 'A10_iris_timesup');
  await shot(P, 'A10_lk_timesup');
  // Reset after time's up (not a clear)
  await P.getByRole('button', { name: /Reset the timer/ }).click(); await sleep(1500);
  log('A11 statuses after Reset', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  // Run out again, then Clear
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(7500);
  log('A12 statuses at 0:00 again', { lk: await statusText(P), bram: await statusText(bram.page) });
  await P.getByRole('button', { name: 'Clear the timer' }).click(); await sleep(1500);
  log('A12 statuses after Clear', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  log('A12 reset label after Clear', await P.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /Reset the timer/.test(b.getAttribute('aria-label') || '')).map((b) => b.getAttribute('aria-label') + (b.disabled ? ' (disabled)' : ''))));
  // Again: run out, switch off
  await P.getByLabel('Timer seconds').fill('05'); await P.getByLabel('Timer seconds').press('Enter'); await sleep(600);
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(6500);
  log('A13 statuses at 0:00 (3)', { lk: await statusText(P), bram: await statusText(bram.page) });
  await P.getByRole('switch', { name: 'Timer beside the hourglass' }).click(); await sleep(1500);
  log('A13 statuses after switch off', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  // Again: switch on, run out, End Assignment (timer still on)
  await P.getByRole('switch', { name: 'Timer beside the hourglass' }).click(); await sleep(1000);
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(6500);
  log('A14 statuses at 0:00 (4)', { lk: await statusText(P), bram: await statusText(bram.page) });
  await P.getByRole('button', { name: 'End Assignment' }).click(); await sleep(400);
  await P.getByRole('button', { name: 'Yes, end it' }).click(); await sleep(2500);
  log('A14 statuses after End Assignment', { lk: await statusText(P), iris: await statusText(iris.page), bram: await statusText(bram.page) });
  log('A14 circle after End', sql(`select tension_clock, timer_visible, timer_duration_ms, timer_running, '['||location||']' from circles where id=${cid}`));
  log('A14 lk log', await logLines(P));
  await shot(P, 'A14_lk_after_end');
  await shot(bram.page, 'A14_bram_after_end', { fullPage: true });
  log('errors', { lk: lk.errors.slice(0, 5), iris: iris.errors.slice(0, 5), bram: bram.errors.slice(0, 5) });
  fs.writeFileSync(L.DIR + '/out_8404/deskA.json', JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); fs.writeFileSync(L.DIR + '/out_8404/deskA.json', JSON.stringify(out, null, 1)); process.exit(1); });
