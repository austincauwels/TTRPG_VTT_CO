const L = require('./lib'); const { sleep, shot, state, sql } = L;
(async () => {
  const b = await L.launch();
  const lk = await L.desk(b, 'wide', 'lk', null, 'S'); const P = lk.page;
  await P.getByRole('button', { name: /Open Bram Okafor's investigator sheet/ }).first().click(); await sleep(2500);
  await P.getByRole('button', { name: /^Edit .*trauma record/ }).first().click(); await sleep(800);
  await P.getByRole('button', { name: /Remove scar 4/i }).click(); await sleep(600);
  const yes = P.getByRole('button', { name: /Yes, remove/i });
  console.log('yes', await yes.count(), await yes.first().getAttribute('aria-label'));
  await yes.first().click(); await sleep(2500);
  console.log('db', sql(`select scars_count,is_dead,incapacitated,control,sense from characters where id=${state.chars.bram.id}`));
  const btns = await P.$$eval('button', bs => bs.filter(x => x.offsetParent).map(x => (x.getAttribute('aria-label') || x.innerText).replace(/\s+/g, ' ').slice(0, 40)));
  console.log(btns.filter(x => /save|done|edit|revive|remove|cancel/i.test(x)));
  await shot(P, 'e17_lk_after_yes_remove');
  console.log((await L.logLines(P)).slice(-3));
  await b.close();
})();
