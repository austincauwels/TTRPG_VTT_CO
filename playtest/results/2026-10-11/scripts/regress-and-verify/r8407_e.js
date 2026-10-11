// Formation (unsealed): names, votes, relationship Accept/Counter names and keyboard focus. fi on desktop 1920 (keyboard at 1366 later), fd tablet
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
L.DEVICES.desktop = { viewport: { width: 1920, height: 1080 } };
const act = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.id ? '#' + a.id : ''} "${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 70)}"` : 'none'; });
(async () => {
  const b = await L.launch();
  const dev = process.env.DEV || 'desktop';
  const fi = await L.openSeat(b, dev, { store: await L.storeFor('fi', 'fi', 'F') });
  await sleep(5000);
  await L.shot(fi.page, 'e01_fi_formation');
  const dlg = fi.page.locator('[aria-label="Circle formation papers"]');
  console.log('formation dialog', await dlg.count());
  // Suggest two names
  for (const n of ['The Ninth Night', 'The Lantern Ward']) {
    await fi.page.getByLabel('Circle name to suggest').fill(n);
    await fi.page.getByLabel('Circle name to suggest').press('Enter');
    await sleep(900);
  }
  await fi.page.getByRole('button', { name: 'Vote for The Ninth Night' }).click().catch(e => console.log('vote', e.message));
  await sleep(900);
  const names = await fi.page.evaluate(() => [...document.querySelectorAll('button')].map(b => ({ n: b.getAttribute('aria-label') || b.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), p: b.getAttribute('aria-pressed') })).filter(x => x.p !== null || /^(Vote|Accept|Counter)/.test(x.n)));
  console.log('PRESSABLE', JSON.stringify(names));
  await L.shot(fi.page, 'e02_fi_votes');
  // Relationship fields names
  const fields = await fi.page.evaluate(() => [...document.querySelectorAll('select,textarea,input')].map(e => e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || `UNNAMED ${e.tagName}#${e.id}`));
  console.log('FIELDS', JSON.stringify(fields));
  // keyboard: Accept Bram's proposal by keyboard
  const acc = fi.page.getByRole('button', { name: /^Accept Bram Ashby/ });
  console.log('accept bram count', await acc.count());
  await acc.focus(); await fi.page.keyboard.press('Enter'); await sleep(1500);
  console.log('after Accept focus:', await act(fi.page));
  await fi.page.keyboard.press('Tab'); await sleep(200);
  console.log('after Accept then Tab:', await act(fi.page));
  // Propose to Cassandra by keyboard
  const propBtn = fi.page.getByRole('button', { name: /^Propose a relationship$/ });
  console.log('propose openers', await propBtn.count());
  const sel = fi.page.getByLabel('Relationship to Cassandra Fairweather');
  if (!(await sel.count()) && await propBtn.count()) { await propBtn.first().click(); await sleep(300); }
  if (await sel.count()) {
    await sel.first().selectOption({ index: 1 }); await sleep(300);
    const p = fi.page.getByRole('button', { name: /^Propose to Cassandra/ });
    await p.focus(); await fi.page.keyboard.press('Enter'); await sleep(1500);
    console.log('after Propose focus:', await act(fi.page));
    await fi.page.keyboard.press('Tab');
    console.log('after Propose then Tab:', await act(fi.page));
  } else console.log('no Cassandra select');
  await L.shot(fi.page, 'e03_fi_after_keyboard');
  console.log('errors', fi.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
