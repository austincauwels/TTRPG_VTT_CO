// Tablet: Notebook entry with the toolbar's Heading; heading levels; Handwriting select label
const L = require('./r8407_lib');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const s = await L.openSeat(b, 'tablet', { store: await L.storeFor('pc', 'c', 'S') });
  await sleep(4500);
  const p = s.page;
  await p.getByRole('button', { name: /^Notebook$/i }).first().tap(); await sleep(1500);
  await L.shot(p, 'h01_notebook');
  const hw = p.locator('#notebook-handwriting');
  console.log('handwriting select', await hw.count(), 'accessible name:', await hw.evaluate(e => e.labels && e.labels[0] ? e.labels[0].textContent : e.getAttribute('aria-label')).catch(() => 'none'));
  // a11y name via playwright role
  console.log('getByRole combobox Handwriting', await p.getByRole('combobox', { name: 'Handwriting' }).count());
  const title = p.locator('[id$="-title"]').first();
  await title.fill('Cellar under the chapel');
  const body = p.locator('[id$="-found"]').first();
  await body.tap(); await body.fill('Wax on the stairs');
  await body.press('End'); await body.press('Enter');
  await body.type('Second section');
  // toolbar Heading
  const hb = p.getByRole('button', { name: /^Heading/ });
  console.log('heading btns', await hb.count());
  await hb.first().tap(); await sleep(300);
  console.log('body value:', JSON.stringify(await body.inputValue()));
  await L.shot(p, 'h02_entry_typed');
  await p.getByRole('button', { name: /^Add entry$/ }).tap(); await sleep(2500);
  const heads = await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => `${h.tagName}:${h.textContent.trim().slice(0, 40)}`));
  console.log('HEADINGS', JSON.stringify(heads));
  await L.shot(p, 'h03_entry_posted');
  const el = p.locator('h5', { hasText: 'Second section' });
  if (await el.count()) { await el.first().scrollIntoViewIfNeeded(); await L.shot(p, 'h04_h5_in_view'); }
  const el4 = p.locator('h4', { hasText: 'Second section' });
  if (await el4.count()) { await el4.first().scrollIntoViewIfNeeded(); await L.shot(p, 'h04_h4_in_view'); }
  console.log('errors', s.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
