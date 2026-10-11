// name-vote-reorders, name-case-duplicates, long-name-overflow, vote-tie-leading (papers side)
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const shot = (pg, n, o = {}) => pg.screenshot({ path: `${L.DIR}/${n}.png`, ...o });
(async () => {
  const b = await L.launch();
  const iris = await L.openSeat(b, 'desktop' in L.DEVICES ? 'desktop' : 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await iris.page.setViewportSize({ width: 1920, height: 1080 });
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const dev = await L.openSeat(b, 'tablet', { store: await L.storeFor('fd', 'fd', 'F') });
  const cass = await L.openSeat(b, 'laptop', { store: await L.storeFor('fc', 'fc', 'F') });
  await sleep(5000);
  const circleId = state.camps.F.circleId;
  const suggest = async (seat, text, how = 'click') => {
    const inp = seat.page.getByLabel('Circle name to suggest');
    await inp.scrollIntoViewIfNeeded();
    await inp.fill(text);
    const val = await inp.inputValue();
    if (how === 'enter') await inp.press('Enter'); else await seat.page.getByRole('button', { name: 'Suggest', exact: true }).click();
    await sleep(900);
    const note = await seat.page.locator('p[role=status]', { hasText: /Already suggested/ }).allInnerTexts();
    return { typedLen: val.length, note };
  };
  console.log('Iris suggests:', JSON.stringify(await suggest(iris, 'The Harrow Watch')));
  console.log('Bram suggests:', JSON.stringify(await suggest(bram, 'The Ninth Night')));
  console.log('Dev suggests lower case:', JSON.stringify(await suggest(dev, 'the ninth night')));
  console.log('Cass suggests two spaces:', JSON.stringify(await suggest(cass, 'The Ninth  Night', 'enter')));
  console.log('Cass suggests upper:', JSON.stringify(await suggest(cass, '  THE NINTH NIGHT ')));
  // Around the client: a raw socket for Dev sends a case variant and a 5000-character name
  const ws = await L.wsOpen(state.chars.fd.id, state.users.fd.token);
  ws.send('circle_creation_vote', { circle_id: circleId, character_id: state.chars.fd.id, vote_type: 'name_suggest', value: 'THE   ninth NIGHT' });
  await sleep(600);
  ws.send('circle_creation_vote', { circle_id: circleId, character_id: state.chars.fd.id, vote_type: 'name_suggest', value: 'Z'.repeat(5000) });
  await sleep(900);
  console.log('name_suggest rows:\n' + sql(`select id, character_id, length(value), left(value, 40) from circle_votes where circle_id=${circleId} and vote_type='name_suggest' order by id`));
  // A long name with a long unbroken word, typed by Cass (laptop) and Dev (tablet)
  const longName = 'The Most Honourable and Ancient Circle of the Lantern ' + 'Wardensofthelowerwardsandthesidlewhowatchthroughthenight';
  console.log('Cass long name:', JSON.stringify(await suggest(cass, longName + ' and a great deal more besides that runs well past eighty characters for certain and then some more words')));
  await sleep(800);
  // Overflow check on each desk
  for (const [nm, seat] of [['iris', iris], ['bram', bram], ['dev', dev], ['cass', cass]]) {
    const rows = await seat.page.evaluate(() => [...document.querySelectorAll('[role=dialog] span.font-serif.text-lg.text-ink.flex-1')].map((s) => {
      const row = s.parentElement; const rr = row.getBoundingClientRect();
      return { name: s.textContent.slice(0, 30), len: s.textContent.length, rowOverflow: row.scrollWidth - row.clientWidth, spanRight: Math.round(s.getBoundingClientRect().right), rowRight: Math.round(rr.right) };
    }));
    console.log(nm, 'rows', JSON.stringify(rows));
  }
  const lastRow = cass.page.locator('[role=dialog] span.font-serif.text-lg.text-ink.flex-1').last();
  await lastRow.scrollIntoViewIfNeeded();
  await shot(cass.page, 'names_cass_long');
  const lastRowD = dev.page.locator('[role=dialog] span.font-serif.text-lg.text-ink.flex-1').last();
  await lastRowD.scrollIntoViewIfNeeded();
  await shot(dev.page, 'names_dev_long');
  // Order of the rows before votes, on Iris's desk
  const order = async (seat) => seat.page.evaluate(() => [...document.querySelectorAll('[role=dialog] span.font-serif.text-lg.text-ink.flex-1')].map((s) => s.textContent.slice(0, 20)));
  console.log('order before votes', JSON.stringify(await order(iris)));
  // Re-sort race: Iris aims at row 2 (The Ninth Night); Dev votes for it just before her click
  const row2 = iris.page.getByRole('button', { name: 'Vote for The Ninth Night' });
  await row2.scrollIntoViewIfNeeded();
  const bb = await row2.boundingBox();
  ws.send('circle_creation_vote', { circle_id: circleId, character_id: state.chars.fd.id, vote_type: 'name_vote', value: 'The Ninth Night' });
  await sleep(150);
  await iris.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await sleep(1000);
  console.log('Iris vote:', sql(`select value from circle_votes where circle_id=${circleId} and vote_type='name_vote' and character_id=${state.chars.fi.id}`));
  console.log('order after votes', JSON.stringify(await order(iris)));
  // Bram on the phone votes for The Harrow Watch; then Cass for The Harrow Watch -> 2-2 tie with Ninth Night (Dev, Iris)
  const bv = bram.page.getByRole('button', { name: 'Vote for The Harrow Watch' });
  await bv.scrollIntoViewIfNeeded(); const before = await bv.boundingBox();
  await bv.tap(); await sleep(800);
  const after = await bv.boundingBox();
  console.log('Bram row moved by', after.y - before.y);
  await cass.page.getByRole('button', { name: 'Vote for The Harrow Watch' }).click(); await sleep(1000);
  console.log('name votes:\n' + sql(`select id, character_id, value from circle_votes where circle_id=${circleId} and vote_type='name_vote' order by id`));
  for (const [nm, seat] of [['iris', iris], ['bram', bram], ['dev', dev], ['cass', cass]]) {
    const t = await seat.page.locator('[role=dialog]').innerText();
    const s = t.indexOf('SUGGESTED NAMES'); const e = t.indexOf('III. CHAPTER');
    console.log(nm, JSON.stringify(t.slice(s, e)));
  }
  const sec = iris.page.getByText('Suggested names');
  await sec.scrollIntoViewIfNeeded();
  await shot(iris.page, 'names_iris_tie');
  await bram.page.getByText('Suggested names').scrollIntoViewIfNeeded();
  await shot(bram.page, 'names_bram_tie');
  // Insignia tie: Iris Ouroboros, Bram Compass
  await iris.page.getByRole('button', { name: /Ouroboros/ }).click(); await sleep(500);
  const bc = bram.page.getByRole('button', { name: /Compass/ }); await bc.scrollIntoViewIfNeeded(); await bc.tap(); await sleep(1000);
  for (const [nm, seat] of [['iris', iris], ['bram', bram]]) {
    const t = await seat.page.locator('[role=dialog]').innerText();
    const s = t.indexOf('V. INSIGNIA'); const e = t.indexOf('VI. CIRCLE');
    console.log(nm, 'insignia', JSON.stringify(t.slice(s, e)));
  }
  await bram.page.getByRole('button', { name: /Compass/ }).scrollIntoViewIfNeeded();
  await shot(bram.page, 'insignia_bram_tie');
  // Ability tie too: Iris Stamina Training, Bram Nobody Left Behind
  await iris.page.getByRole('button', { name: /Stamina Training/ }).click(); await sleep(400);
  const nb = bram.page.getByRole('button', { name: /Nobody Left Behind/ }); await nb.scrollIntoViewIfNeeded(); await nb.tap(); await sleep(1000);
  // Question tie: Iris q5, Bram q2
  await iris.page.getByRole('button', { name: /incredibly heroic/ }).click(); await sleep(400);
  const q2 = bram.page.getByRole('button', { name: /common goal/ }); await q2.scrollIntoViewIfNeeded(); await q2.tap(); await sleep(1000);
  console.log('all votes:\n' + sql(`select id, character_id, vote_type, left(value,30) from circle_votes where circle_id=${circleId} and vote_type<>'name_suggest' order by id`));
  console.log('errors', [...iris.errors, ...bram.errors, ...dev.errors, ...cass.errors].join('\n'));
  ws.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
