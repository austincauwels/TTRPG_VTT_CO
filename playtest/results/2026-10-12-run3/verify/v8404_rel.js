// lk-no-relationships-after-seal: F campaign, 4 proposals; accept one, finalize, then look
// on the Lightkeeper's desk (1440x900) for any relationship on the roster, a sheet and Circle.
const L = require('./v8404_lib');
const { api, state, sleep, sql } = L;

(async () => {
  const F = state.camps.F;
  const rels = await api('GET', `/campaign/${F.id}/circle-creation-state`, state.users.lkf.token);
  console.log('relationships before', JSON.stringify(rels.relationships.map(r => [r.id, r.from_character_id, r.to_character_id, r.rel_type, r.status])));
  // Iris accepts Bram's proposal
  const fromBram = rels.relationships.find(r => r.from_character_id === state.chars.fb.id && r.to_character_id === state.chars.fi.id);
  await api('POST', '/circle/relationship/respond', state.users.fi.token, { relationship_id: fromBram.id, action: 'accept' });
  // Seal over the real route
  if (!process.argv.includes('--nofinal')) {
    const fin = await api('POST', '/campaign/finalize-roster', state.users.lkf.token, { campaign_id: F.id, circle_id: F.circleId });
    console.log('finalize', JSON.stringify(fin).slice(0, 200));
  }
  const after = await api('GET', `/campaign/${F.id}/circle-creation-state`, state.users.lkf.token);
  console.log('relationships after seal (GM can read)', JSON.stringify(after.relationships.map(r => [r.id, r.status])), 'finalized', after.is_finalized);

  const browser = await L.launch();
  const seat = await L.openSeat(browser, 'wide', { store: await L.storeFor('lkf', null, 'F') });
  const p = seat.page;
  await sleep(5000);
  await L.shot(p, 'rel_01_desk');
  const words = /relationship|Stranger|night train|Mentor|Rival|Ward/i;
  const scan = async (where) => {
    const txt = await p.evaluate(() => document.body.innerText);
    const hits = txt.split('\n').filter(l => /relationship|Stranger|night train/i.test(l));
    console.log(`[${where}] hits:`, JSON.stringify(hits));
    return hits;
  };
  await scan('desk');
  // Open Iris's sheet from the roster card
  const card = p.getByRole('button', { name: /Iris Ashe/ }).first();
  await card.click();
  await sleep(2500);
  await L.shot(p, 'rel_02_sheet');
  await scan('sheet Iris');
  // Scroll the sheet's column fully, scanning
  await p.evaluate(async () => { for (const el of document.querySelectorAll('*')) { if (el.scrollHeight > el.clientHeight + 20) el.scrollTop = el.scrollHeight; } });
  await sleep(500);
  await L.shot(p, 'rel_03_sheet_scrolled');
  // Circle page
  const navs = await p.evaluate(() => [...document.querySelectorAll('button, a')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 80));
  console.log('controls', JSON.stringify(navs));
  const circleBtn = p.getByRole('button', { name: /^Circle\b/ }).first();
  await circleBtn.click().catch(e => console.log('no circle button', e.message));
  await sleep(2500);
  await L.shot(p, 'rel_04_circle', { fullPage: true });
  await scan('circle page');
  await p.evaluate(async () => { for (const el of document.querySelectorAll('*')) { if (el.scrollHeight > el.clientHeight + 20) el.scrollTop = el.scrollHeight; } });
  await sleep(500);
  await L.shot(p, 'rel_05_circle_scrolled');
  const aria = await p.evaluate(() => [...document.querySelectorAll('section[aria-label], section[aria-labelledby]')].map(s => s.getAttribute('aria-label') || document.getElementById(s.getAttribute('aria-labelledby'))?.innerText));
  console.log('circle papers', JSON.stringify(aria));
  console.log('errors', seat.errors.slice(0, 5));
  // Player Iris's own view for comparison
  const ps = await L.openSeat(browser, 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await sleep(5000);
  await ps.page.getByRole('button', { name: /^Circle\b/ }).first().click().catch(e => console.log('player no circle', e.message));
  await sleep(2500);
  await L.shot(ps.page, 'rel_06_player_circle');
  const ptxt = await ps.page.evaluate(() => document.body.innerText);
  console.log('[player circle] hits:', JSON.stringify(ptxt.split('\n').filter(l => /relationship|Stranger|night train/i.test(l)).slice(0, 12)));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
