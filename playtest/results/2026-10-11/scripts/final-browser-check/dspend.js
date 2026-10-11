const L = require('./lib'); const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
  const dlg = p.getByRole('button', { name: 'Stay and look at the sheet' }); if (await dlg.count()) { await dlg.tap(); await sleep(800); }
  await L.goTab(p, 'Circle'); await sleep(1000);
  const btns = p.getByRole('button', { name: /Spend 1/ });
  console.log(await btns.evaluateAll(bs => bs.map(x => `${x.innerText}|disabled=${x.disabled}|aria=${x.getAttribute('aria-disabled')}`)));
  const mk = br.frames.length;
  await btns.first().scrollIntoViewIfNeeded(); await btns.first().tap({ force: true }); await sleep(1500);
  console.log('sent', L.parsed(br, 'out', mk).map(x => x.m.type), 'errors', br.errors);
  await b.close();
})();
