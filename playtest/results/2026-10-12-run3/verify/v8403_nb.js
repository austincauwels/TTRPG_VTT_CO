const L = require('./v8403_lib');
const S = L.state;
const long = (n, s) => Array.from({ length: n }, (_, i) => `- ${s} line ${i + 1}: humming strongest beneath the slipway, not the rope; three lines of prints, each ending mid-stride.`).join('\n');
(async () => {
  const camp = S.camps.S;
  const add = (who, ch, title, content) => L.api('POST', `/api/notebook/${camp.id}/entries`, S.users[who].token,
    { title, content, author_name: 'x', author_type: 'player', character_id: ch });
  await add('pa', S.chars.a.id, 'The flats at dusk', '## What the bells say\n' + long(12, 'Ada'));
  await add('pb', S.chars.b.id, "The choirmaster's daybook", long(14, 'Dev'));
  const b = await L.launch();
  // Lightkeeper posts a sketch entry through the page
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  let p = lk.page;
  await L.sleep(3500);
  await p.getByRole('button', { name: /^Notebook$/ }).first().click();
  await L.sleep(1500);
  await p.getByLabel('Entry Title').fill('The flats, the slipway and the bell tower');
  await p.getByRole('button', { name: /Sketch/ }).first().click();
  await p.locator('.excalidraw canvas').first().waitFor();
  await L.sleep(2000);
  await p.mouse.move(300, 300); await p.mouse.down(); await p.mouse.move(500, 600, { steps: 10 }); await p.mouse.up();
  await p.mouse.move(700, 300); await p.mouse.down(); await p.mouse.move(900, 650, { steps: 10 }); await p.mouse.up();
  await p.getByRole('button', { name: 'Add to entry' }).click();
  await L.sleep(1500);
  await p.getByRole('button', { name: /^Add entry$/i }).click();
  await L.sleep(2500);
  await L.shot(p, 'n01_lk_after_sketch');
  // Lightkeeper's plain text entry too
  await p.getByLabel('Entry Title').fill('Lightkeeper aside');
  await p.getByLabel('What you found').fill('The tide turns at nine.');
  await p.getByRole('button', { name: /^Add entry$/i }).click();
  await L.sleep(2000);
  await add('pb', S.chars.b.id, 'Closing note: the last change', 'The change book is finished. I rang the last row on **Maren\'s handbell**.');
  console.log(L.sql(`select id, author_name, author_type, entry_type, title from notebook_entries where campaign_id=${camp.id} order by id`));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
