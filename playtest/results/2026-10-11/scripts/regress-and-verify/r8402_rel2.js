// relationship-question-in-answer, again: Bram (phone) edits his proposal to Cassandra into a Confidant
// with a question, taps the middle of the box and types; Cassandra (laptop) reads it
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const shot = (pg, n) => pg.screenshot({ path: `${L.DIR}/${n}.png` });
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const cass = await L.openSeat(b, 'laptop', { store: await L.storeFor('fc', 'fc', 'F') });
  await sleep(5000);
  const p = bram.page;
  const cId = state.chars.fc.id, bramId = state.chars.fb.id;
  // The Edit beside the waiting proposal to Cassandra
  const card = p.locator('h4', { hasText: /Your relationship to Cassandra/i }).locator('..');
  const edit = card.getByRole('button', { name: 'Edit', exact: true });
  await edit.scrollIntoViewIfNeeded(); await edit.tap(); await sleep(600);
  const sel = p.locator(`#propose-${cId}-type`);
  await sel.selectOption('Confidant'); await sleep(300);
  const box = p.locator(`#propose-${cId}-lore`);
  console.log('answer kept across type change:', JSON.stringify(await box.inputValue()));
  await box.fill('');
  const q1 = p.getByRole('button', { name: 'This person keeps your dark secret. What is it?' });
  await q1.scrollIntoViewIfNeeded(); await q1.tap(); await sleep(300);
  await box.scrollIntoViewIfNeeded(); await sleep(300);
  const bb = await box.boundingBox();
  console.log('box bbox', JSON.stringify(bb));
  await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await sleep(300);
  console.log('focused is box:', await box.evaluate((e) => document.activeElement === e));
  await p.keyboard.type('She stitched me up after Harrow Ridge.');
  // tap in the middle of the typed text and type more
  await p.touchscreen.tap(bb.x + 60, bb.y + 18);
  await p.keyboard.type('X');
  await sleep(200);
  console.log('box value:', JSON.stringify(await box.inputValue()), '| question pressed:', await q1.getAttribute('aria-pressed'));
  await shot(p, 'rel2_bram_form');
  // a question tapped after typing keeps the answer
  const q2 = p.getByRole('button', { name: 'You are very cautious around everyone but this person. Why?' });
  await q2.tap(); await sleep(200);
  console.log('after picking another question, value:', JSON.stringify(await box.inputValue()), 'q2 pressed', await q2.getAttribute('aria-pressed'), 'q1 pressed', await q1.getAttribute('aria-pressed'));
  await q1.tap(); await sleep(200);
  await box.fill('She stitched me up after Harrow Ridge.');
  await p.getByRole('button', { name: 'Send the change' }).tap();
  await sleep(1500);
  console.log('DB bram->cass:', sql(`select id, rel_type, status, replace(lore, E'\\n', ' | ') from relationships where from_character_id=${bramId} and to_character_id=${cId}`));
  await shot(p, 'rel2_bram_sent');
  const ct = await cass.page.locator('[role=dialog]').innerText();
  const j = ct.indexOf("BRAM ASHBY'S RELATIONSHIP TO YOU");
  console.log('Cass sees:', JSON.stringify(ct.slice(j, j + 200)));
  const h = cass.page.locator('h4', { hasText: /Bram Ashby's relationship to you/i });
  await h.scrollIntoViewIfNeeded();
  await shot(cass.page, 'rel2_cass_sees');
  console.log('errors', [...bram.errors, ...cass.errors].join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
