// circle-spend-timing-wording: S campaign. Mid-assignment Train spend, then End Assignment;
// then a spend after End Assignment, read card / log / roll button (tablet) and LK sheet line.
const L = require('./v8404_lib');
const { api, state, sleep, sql } = L;

const char = async (key, who) => api('GET', `/api/investigators/${state.chars[key].id}`, state.users[who].token);

(async () => {
  const S = state.camps.S;
  sql(`update circles set train=3, stitch=3, refresh=3, resources_editable=false, reports_open=false where id=${S.circleId}`);
  const gm = await L.wsOpen(S.code, state.users.lk.token);
  const bram = await L.wsOpen(state.chars.b.id, state.users.pb.token);
  await sleep(800);
  // Dispatch so we are "in an assignment"
  gm.send('gm_toggle_resource_edit', { circle_id: S.circleId });
  await sleep(800);
  console.log('spending open', sql(`select resources_editable, train from circles where id=${S.circleId}`));
  bram.send('spend_resource', { resource_type: 'train' });
  await sleep(1000);
  let c = await char('b', 'pb');
  console.log('mid-assignment spend: train_dice', c.train_dice, 'train_bonus', c.train_bonus, 'spent', c.resources_spent_assignment);
  const logs = [...gm.frames, ...bram.frames].filter(f => f.type === 'activity_log').map(f => f.payload.message);
  console.log('log lines', JSON.stringify([...new Set(logs)]));
  gm.send('gm_end_assignment', { circle_id: S.circleId });
  await sleep(1200);
  c = await char('b', 'pb');
  console.log('after End Assignment: train_dice', c.train_dice, 'train_bonus', c.train_bonus, 'spent', c.resources_spent_assignment,
    'circle', sql(`select resources_editable, train from circles where id=${S.circleId}`));
  // Spend again after End Assignment (between assignments)
  bram.send('spend_resource', { resource_type: 'train' });
  await sleep(1000);
  c = await char('b', 'pb');
  console.log('between-assignments spend: train_dice', c.train_dice, 'spent', c.resources_spent_assignment);
  gm.close(); bram.close();

  const browser = await L.launch();
  const t = await L.openSeat(browser, 'tablet', { store: await L.storeFor('pb', 'b', 'S') });
  const p = t.page;
  await sleep(5000);
  await L.shot(p, 'train_01_tablet_sheet');
  const trainTxt = await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /Train/.test(e.textContent)).map(e => e.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20));
  console.log('tablet sheet Train texts', JSON.stringify(trainTxt));
  // open an action's roll to find the Train chip
  const titles = await p.evaluate(() => [...document.querySelectorAll('[title*="Train"], [aria-label*="Train"]')].map(e => e.getAttribute('title') || e.getAttribute('aria-label')).slice(0, 5));
  console.log('Train titles', JSON.stringify(titles));
  const tab = p.getByRole('button', { name: /^Circle\b/ }).first();
  if (await tab.isVisible().catch(() => false)) await tab.click();
  else { await p.getByRole('button', { name: /Menu/ }).first().click(); await sleep(800); await p.getByRole('button', { name: /Circle/ }).first().click(); }
  await sleep(2500);
  const card = await p.evaluate(() => [...document.querySelectorAll('section')].find(s => /Circle resources/i.test(s.getAttribute('aria-label') || s.innerText.slice(0, 40)))?.innerText);
  console.log('tablet circle resources card:', JSON.stringify(card));
  const loc = p.locator('section', { hasText: /SPEND 1 TRAIN|Spend 1 Train/i }).last();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await L.shot(p, 'train_02_tablet_circle');

  // LK 1440x900: Bram's sheet
  const g = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(5000);
  await g.page.getByRole('button', { name: /Bram Holt/ }).first().click();
  await sleep(2500);
  const spendLine = await g.page.evaluate(() => document.body.innerText.split('\n').filter(l => /spends|Train/i.test(l)));
  console.log('LK sheet lines', JSON.stringify(spendLine));
  await L.shot(g.page, 'train_03_lk_sheet');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
