const L = require('./v8403_lib');
(async () => {
  const b = await L.launch();
  L.DEVICES.short = { viewport: { width: 1366, height: 629 } };
  const seat = await L.openSeat(b, 'short', { store: await L.storeFor('pb', 'b', 'S') });
  const p = seat.page;
  await L.sleep(4000);
  await p.getByRole('button', { name: /^Notebook$/ }).first().click();
  await L.sleep(2000);
  const toc = await p.evaluate(() => { const ol = document.querySelector('ol[aria-label^=Contents]'); const r = ol.getBoundingClientRect();
    return { label: ol.getAttribute('aria-label'), h: ol.clientHeight, sh: ol.scrollHeight, lines: [...ol.querySelectorAll('li')].map(li => { const q = li.getBoundingClientRect(); return [li.innerText.replace(/\s+/g, ' ').slice(0, 30), Math.round(q.top), q.bottom <= r.bottom + 1]; }) }; });
  console.log(JSON.stringify(toc));
  await L.shot(p, 'n_short_contents');
  await b.close();
})();
