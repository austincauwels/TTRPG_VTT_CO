const L = require('./v8402_lib');
(async () => {
  const browser = await L.launch();
  const seat = await L.openSeat(browser, 'wide', { store: await L.storeFor('pa', 'a', 'S') });
  const { page } = seat;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await L.sleep(5000);
  const info = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => `${JSON.stringify(b.textContent.trim().slice(0,30))} aria=${b.getAttribute('aria-label')}`).slice(0, 70));
  console.log(info.join('\n'));
  await L.shot(page, 'wr_probe', { fullPage: true });
  await browser.close();
})();
