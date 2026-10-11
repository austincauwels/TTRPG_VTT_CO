// relationship-question-in-answer: Bram (phone) proposes Confidant to Dev (tablet) with a question,
// taps in the middle of the box and types; Dev counters (prefilled?); Bram edits his proposal to Iris
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const shot = (pg, n) => pg.screenshot({ path: `${L.DIR}/${n}.png` });
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const dev = await L.openSeat(b, 'tablet', { store: await L.storeFor('fd', 'fd', 'F') });
  const iris = await L.openSeat(b, 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await sleep(5000);
  const p = bram.page;
  const devId = state.chars.fd.id, bramId = state.chars.fb.id, irisId = state.chars.fi.id;
  const sel = p.locator(`#propose-${devId}-type`);
  await sel.scrollIntoViewIfNeeded();
  await sel.selectOption('Confidant');
  await sleep(300);
  // 1) type first, then tap a question: the answer must stay
  const box = p.locator(`#propose-${devId}-lore`);
  await box.tap(); await p.keyboard.type('Typed before the question.');
  const q1 = p.getByRole('button', { name: 'This person keeps your dark secret. What is it?' });
  await q1.scrollIntoViewIfNeeded(); await q1.tap(); await sleep(300);
  console.log('answer after tapping a question:', JSON.stringify(await box.inputValue()));
  // 2) clear and tap in the middle of the box and type
  await box.fill('');
  const bb = await box.boundingBox();
  await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.keyboard.type('WShe stitched me up after Harrow Ridge.');
  await sleep(200);
  console.log('box value:', JSON.stringify(await box.inputValue()), 'q pressed:', await q1.getAttribute('aria-pressed'));
  await box.scrollIntoViewIfNeeded();
  await shot(p, 'rel_bram_form');
  // 3) changing the type keeps the answer, drops the question
  await sel.selectOption('Mentor'); await sleep(200);
  console.log('after type change: answer', JSON.stringify(await box.inputValue()), 'question line', await p.locator(`#propose-${devId}-q`).count());
  await sel.selectOption('Confidant'); await sleep(200);
  await q1.tap(); await sleep(200);
  // double tap Propose
  const prop = p.getByRole('button', { name: /Propose to Dev Okafor/ });
  await prop.scrollIntoViewIfNeeded();
  await prop.dblclick();
  await sleep(1500);
  console.log('DB rows bram->dev:', sql(`select id, rel_type, status, replace(lore, E'\\n', ' | ') from relationships where from_character_id=${bramId} and to_character_id=${devId}`));
  await shot(p, 'rel_bram_proposed');
  // On Dev's tablet
  await sleep(1000);
  const dp = dev.page;
  const devCard = dp.locator('div', { hasText: /Bram Ashby's relationship to you/ }).last();
  const dlgTxt = await dp.locator('[role=dialog]').innerText();
  const idx = dlgTxt.indexOf("BRAM ASHBY'S RELATIONSHIP TO YOU");
  console.log('Dev sees:', JSON.stringify(dlgTxt.slice(idx, idx + 250)));
  const counterBtn = dp.getByRole('button', { name: /Counter Bram Ashby's Confidant/ });
  await counterBtn.scrollIntoViewIfNeeded();
  await shot(dp, 'rel_dev_sees');
  await counterBtn.tap(); await sleep(800);
  const rel = sql(`select id from relationships where from_character_id=${bramId} and to_character_id=${devId}`).split('\n')[0];
  const cType = dp.locator(`#counter-${rel}-type`), cLore = dp.locator(`#counter-${rel}-lore`);
  console.log('counter prefill: type', await cType.inputValue(), 'answer', JSON.stringify(await cLore.inputValue()), 'question line', await dp.locator(`#counter-${rel}-q`).textContent().catch(() => null));
  await cLore.scrollIntoViewIfNeeded();
  await shot(dp, 'rel_dev_counter_open');
  await cLore.fill('She stitched me up after Harrow Ridge, twice.');
  await dp.getByRole('button', { name: 'Send counter' }).tap();
  await sleep(1500);
  console.log('DB after counter:', sql(`select id, rel_type, status, last_actor_id, replace(lore, E'\\n', ' | ') from relationships where id=${rel}`));
  // Bram: Edit his waiting proposal to Iris
  const editBtns = p.getByRole('button', { name: 'Edit', exact: true });
  console.log('Edit buttons on Bram:', await editBtns.count());
  await editBtns.first().scrollIntoViewIfNeeded();
  await editBtns.first().tap(); await sleep(600);
  const eType = p.locator(`#propose-${irisId}-type`), eLore = p.locator(`#propose-${irisId}-lore`);
  console.log('edit prefill: type', await eType.inputValue(), 'answer', JSON.stringify(await eLore.inputValue()));
  await eLore.fill('We met on the night train, in the dining car.');
  await shot(p, 'rel_bram_edit');
  await p.getByRole('button', { name: 'Send the change' }).tap();
  await sleep(1500);
  console.log('DB bram->iris:', sql(`select id, rel_type, status, replace(lore, E'\\n', ' | ') from relationships where from_character_id=${bramId} and to_character_id=${irisId}`));
  const it = await iris.page.locator('[role=dialog]').innerText();
  const j = it.indexOf("BRAM ASHBY'S RELATIONSHIP TO YOU");
  console.log('Iris sees:', JSON.stringify(it.slice(j, j + 200)));
  // Bram sees Dev's counter
  const bt = await p.locator('[role=dialog]').innerText();
  const k = bt.indexOf('YOUR RELATIONSHIP TO DEV OKAFOR');
  console.log('Bram sees counter:', JSON.stringify(bt.slice(k, k + 300)));
  console.log('errors', [...bram.errors, ...dev.errors, ...iris.errors].join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
