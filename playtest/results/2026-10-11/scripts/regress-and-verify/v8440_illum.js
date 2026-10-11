// The Lightkeeper sets Illumination by hand (a pip) after the tally: what the log says
const L = require('./v8440_lib');
const { sleep, shot, state, sql } = L;
const circ = state.camps.R.circleId;
(async () => {
  console.log('before', sql(`select illumination from circles where id=${circ}`));
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'R') });
  await sleep(3500);
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1200);
  // the pips of the Illumination track
  const pips = await lk.page.evaluate(() => [...document.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label')).filter(a => /llumination/i.test(a)));
  console.log('controls', JSON.stringify(pips));
  const pip = lk.page.locator('button[aria-label*="llumination"]').filter({ hasText: '' });
  const target = lk.page.getByRole('button', { name: /Set Illumination to 8\b|Illumination 8\b/ }).first();
  if (await target.count()) await target.click(); else await lk.page.getByRole('button', { name: /\+1 Illumination/ }).click();
  await sleep(1500);
  console.log('after', sql(`select illumination from circles where id=${circ}`));
  const logs = L.parsed(lk, 'in').filter(x => x.m.type === 'activity_log').map(x => x.m.payload.message).filter(m => /Illumination|milestone/.test(m));
  console.log(JSON.stringify(logs));
  await shot(lk.page, 'illum_01_manual_edit_log');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
