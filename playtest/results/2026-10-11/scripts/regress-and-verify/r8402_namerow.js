// The phone name row with all its tags: does the name still read, do the tags fit?
const L = require('./r8402_lib');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const who = process.argv[2] || 'fb', dev = process.argv[3] || 'phone';
  const seat = await L.openSeat(b, dev, { store: await L.storeFor(who, who, 'F') });
  if (process.argv[4]) await seat.page.setViewportSize({ width: +process.argv[4], height: +process.argv[5] });
  await sleep(5000);
  const p = seat.page;
  const rows = await p.evaluate(() => [...document.querySelectorAll('[role=dialog] span.font-serif.text-lg.text-ink.flex-1')].map((s) => {
    const row = s.parentElement; const tags = row.lastElementChild; const rr = row.getBoundingClientRect(); const sr = s.getBoundingClientRect(); const tr = tags.getBoundingClientRect();
    return { name: s.textContent.slice(0, 20), spanW: Math.round(sr.width), spanH: Math.round(sr.height), tagsLeft: Math.round(tr.left), tagsRight: Math.round(tr.right), rowRight: Math.round(rr.right), rowInnerRight: Math.round(rr.right - parseFloat(getComputedStyle(row).paddingRight)), tagsScrollW: tags.scrollWidth };
  }));
  console.log(JSON.stringify(rows, null, 0));
  const r = p.locator('[role=dialog] span.font-serif.text-lg.text-ink.flex-1', { hasText: 'The Ninth Night' });
  await r.evaluate((e) => e.parentElement.scrollIntoView({ block: 'center' }));
  await sleep(300);
  await p.screenshot({ path: `${L.DIR}/namerow_${who}_${dev}${process.argv[4] || ''}.png` });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
