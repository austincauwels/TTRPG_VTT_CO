// Lightkeeper (1440x900): Deal a mark on Edda (Bleed), Edit hint and scar route; then a secret roll
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
const card = (p) => p.$$eval('[role=alertdialog]', ds => ds.map(d => d.innerText.replace(/\s+/g, ' ')));
(async () => {
  const b = await L.launch();
  for (const k of ['a', 'b', 'c', 'd']) L.resetChar(state.chars[k].id, k === 'a' ? { intuition_current: 5 } : {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  const d = await L.openSeat(b, 'tablet', { store: await L.storeFor('pd', 'd', 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  const p = lk.page;
  await p.getByText('Edda Rook').first().click();
  await sleep(2500);
  const dm = p.locator('[role=group][aria-label="Deal a mark"]');
  await dm.scrollIntoViewIfNeeded().catch(() => {});
  console.log('deal group', await dm.innerText().catch(() => 'NONE'));
  await L.shot(p, 'i01_lk_sheet');
  const n0 = (await H.log(p)).length;
  await dm.getByRole('button', { name: 'bleed' }).click();
  await sleep(3000);
  console.log('dealt note', await dm.locator('[role=status]').innerText().catch(() => ''));
  console.log('Edda cards', await card(d.page));
  console.log('Jonah cards', await card(j.page));
  console.log('Imogen cards', await card(a.page));
  await L.shot(d.page, 'i02_edda_cards');
  await L.shot(p, 'i03_lk_after_deal');
  // Edda: Death Defy? (Weird, no) ; Let Them In info card; Jonah Behind Me
  console.log('LK new lines', (await H.log(p)).slice(n0));
  console.log('Edda bleed', H.char(state.chars.d.id).bleed_marks);
  // Edit: the hint and the scar route
  await p.getByRole('button', { name: /^Edit .*trauma record/ }).click();
  await sleep(800);
  console.log('edit hint', await p.locator('.trauma-edit p').first().innerText().catch(() => ''));
  const scarI = p.locator('[data-desk="scars"] h3 button');
  console.log('scars head buttons', await scarI.count(), await scarI.first().getAttribute('aria-label').catch(() => ''));
  if (await scarI.count()) { await scarI.first().click(); await sleep(500); }
  console.log('scar route text visible', await p.locator('text=/A new scar comes/').first().isVisible().catch(() => false));
  await L.shot(p, 'i04_lk_edit_scar_i');
  await p.getByRole('button', { name: /^Done editing/ }).click().catch(() => {});
  // Secret roll from the desk
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: /Back to roster|Roster/i }).first().click().catch(() => {});
  await sleep(1500);
  const sec = p.getByRole('checkbox', { name: /Secret/i });
  await sec.check().catch(async () => { await p.getByText('SECRET').click(); });
  const n1 = { lk: (await H.log(p)).length, a: (await H.log(a.page)).length };
  await p.getByRole('button', { name: /^Roll \d+ di/i }).click();
  await sleep(3000);
  console.log('LK slip', await H.slip(p));
  console.log('LK new lines', (await H.log(p)).slice(n1.lk), 'Imogen new lines', (await H.log(a.page)).slice(n1.a));
  await L.shot(p, 'i05_secret_roll');
  // A player rolls: the secret line stays
  await H.roll(a.page, 'Survey', { wait: 3000 });
  console.log('LK after player roll lines', (await H.log(p)).slice(n1.lk));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(5000);
  console.log('LK after reload has secret line', (await H.log(p)).filter(x => /Secret/.test(x)));
  await L.shot(p, 'i06_lk_after_reload');
  console.log(lk.errors);
  await b.close();
})();
