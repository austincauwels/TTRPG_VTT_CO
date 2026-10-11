const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { sleep, shot } = L;
(async () => {
  const b = await L.launch();
  const dev = await openDesk(b, process.argv[2] || 'tablet', 'pa', 'a', 'S');
  await shot(dev.page, 'x01_desk');
  await goTab(dev.page, 'Notebook');
  await sleep(1500);
  await shot(dev.page, 'x02_notebook', { fullPage: true });
  const btns = await dev.page.locator('button:visible').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.innerText).slice(0, 40)));
  console.log(btns.join(' | '));
  console.log(dev.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
