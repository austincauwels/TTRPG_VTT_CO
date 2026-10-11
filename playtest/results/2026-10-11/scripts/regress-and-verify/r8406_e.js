// roster-order-unstable: Your Circle and the Lightkeeper's polaroids keep their order (laptop 1366x768, LK 1440x900)
const L = require('./r8406_lib');
const { sleep, shot, state } = L;
const out = {};
const names = ['Iris Ashe', 'Bram Ashby', 'Cassandra', 'Dev Okafor'];
const circleOrder = (page) => page.$$eval('[data-desk="circle"] p.font-serif.font-bold', ps => ps.map(p => p.innerText.trim()));
const textOrder = (page) => page.evaluate((ns) => {
  const t = document.body.innerText;
  return ns.map(n => [n, t.indexOf(n)]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]).map(x => x[0]);
}, names);
(async () => {
  const F = state.camps.F;
  L.sql(`update circles set is_finalized=true, name='The Ashen Watch' where id=${F.circleId}`);
  L.sql(`update campaigns set roster_finalized=true where id=${F.id}`);
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lkf', null, 'F') });
  const pd = await L.openSeat(b, 'laptop', { store: await L.storeFor('fd', 'fd', 'F') });
  await sleep(5000);
  out.dev0 = await circleOrder(pd.page);
  out.lk0 = await textOrder(lk.page);
  await shot(pd.page, 'e01_dev_circle_before');
  await shot(lk.page, 'e02_lk_before');
  const api0 = await L.api('GET', `/campaign/${F.id}/roster`, state.users.lkf.token).catch(e => ({ err: e.message.slice(0, 100) }));
  out.api0 = (api0.active_investigators || []).map(c => c.name);
  // change sheets: Iris (first) and Bram over SQL updates (moves their rows), and one over the desk
  for (let i = 0; i < 3; i++) {
    L.sql(`update characters set nerve_current = nerve_current where id in (${state.chars.fi.id}, ${state.chars.fb.id})`);
    L.sql(`update characters set pronouns = 'she/her' where id=${state.chars.fi.id}`);
  }
  L.sql('vacuum characters');
  await pd.page.getByRole('button', { name: /Back to chapter hub/i }).first().click(); await sleep(2500);
  await pd.page.getByRole('button', { name: /^Last Played/ }).first().click(); await sleep(5000);
  out.dev1 = await circleOrder(pd.page);
  await shot(pd.page, 'e03_dev_circle_after_hub');
  await lk.page.reload(); await sleep(5000);
  out.lk1 = await textOrder(lk.page);
  await shot(lk.page, 'e04_lk_after_reload');
  const api1 = await L.api('GET', `/campaign/${F.id}/roster`, state.users.lkf.token).catch(e => ({ err: e.message.slice(0, 100) }));
  out.api1 = (api1.active_investigators || []).map(c => c.name);
  out.physical = L.sql(`select string_agg(name, ' | ') from (select name from characters where campaign_id=${F.id}) x`);
  // second tab
  const p2 = await pd.ctx.newPage(); await p2.goto(L.SITE + '/'); await sleep(5000);
  out.dev2 = await circleOrder(p2);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
