const L = require('./lib'); const { sleep, shot, state } = L;
(async () => {
  const b = await L.launch();
  const br = await L.desk(b, 'phone', 'bram', 'bram', 'S'); const p = br.page;
  await shot(p, 'r18_bram_open');
  const dice = p.locator('[data-keep-die]');
  console.log('dice', await dice.evaluateAll(d => d.map(x => `${x.tagName} ${x.getAttribute('aria-label')} role=${x.getAttribute('role')} tabindex=${x.getAttribute('tabindex')}`)));
  console.log('in', L.parsed(br, 'in').map(x => x.m.type).join(','));
  const sl = await p.$$eval('[data-result-slip]', s => s.map(e => e.outerHTML.slice(0, 1500)));
  console.log(sl.join('\n'));
  await b.close();
})();
