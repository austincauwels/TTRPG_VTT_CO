// Phase A: reports closed. Bram phone (report-closed-looks-live), Dev tablet (key-ticks-lost)
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const bram = await openDesk(b, 'phone', 'bram', 'bram', 'R');
  await shot(bram.page, 'a01_bram_desk');
  await goTab(bram.page, 'Circle');
  const rep = bram.page.locator('section[aria-labelledby="circle-report-title"]');
  await rep.scrollIntoViewIfNeeded();
  await shot(bram.page, 'a02_bram_report_closed');
  const info = await rep.evaluate((el) => {
    const send = [...el.querySelectorAll('button')].find(x => /Send/.test(x.textContent));
    const cs = send && getComputedStyle(send);
    return { text: el.innerText, send: send && { disabled: send.disabled, color: cs.color, border: cs.borderColor, bg: cs.backgroundColor, opacity: cs.opacity },
      boxes: [...el.querySelectorAll('input[type=checkbox]')].map(i => ({ disabled: i.disabled, w: i.getBoundingClientRect().width, h: i.closest('label').getBoundingClientRect().height })) };
  });
  console.log('BRAM closed', JSON.stringify(info));
  // Menu button style for comparison
  const menu = await bram.page.getByRole('button', { name: /^Menu/ }).first().evaluate(e => { const c = getComputedStyle(e); return { color: c.color, border: c.borderColor }; });
  console.log('menu', JSON.stringify(menu));
  await rep.screenshot({ path: L.DIR + '/out_8401/a03_bram_report_card.png' });

  // Dev tablet: tick a key while closed, go to Notebook and back, then reload
  const dev = await openDesk(b, 'tablet', 'dev', 'dev', 'R');
  await goTab(dev.page, 'Circle');
  const drep = dev.page.locator('section[aria-labelledby="circle-report-title"]');
  await drep.scrollIntoViewIfNeeded();
  await drep.locator('label', { hasText: 'Make a Deal' }).tap();
  await sleep(400);
  await drep.screenshot({ path: L.DIR + '/out_8401/a04_dev_ticked.png' });
  const ticks1 = await drep.locator('input[type=checkbox]').evaluateAll(a => a.map(i => i.checked));
  await goTab(dev.page, 'Notebook');
  await sleep(800);
  await goTab(dev.page, 'Investigator');
  await goTab(dev.page, 'Circle');
  await drep.scrollIntoViewIfNeeded();
  const ticks2 = await drep.locator('input[type=checkbox]').evaluateAll(a => a.map(i => i.checked));
  await drep.screenshot({ path: L.DIR + '/out_8401/a05_dev_after_tabs.png' });
  await dev.page.reload(); await sleep(4000);
  await goTab(dev.page, 'Circle').catch(() => {});
  await drep.scrollIntoViewIfNeeded();
  const ticks3 = await drep.locator('input[type=checkbox]').evaluateAll(a => a.map(i => i.checked));
  await drep.screenshot({ path: L.DIR + '/out_8401/a06_dev_after_reload.png' });
  const sizes = await drep.locator('label').evaluateAll(a => a.map(l => Math.round(l.getBoundingClientRect().height)));
  console.log('DEV ticks', JSON.stringify({ ticks1, ticks2, ticks3, sizes }));
  console.log('errors', bram.errors.slice(0, 5), dev.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
