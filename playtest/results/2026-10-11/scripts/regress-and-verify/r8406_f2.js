// catalyst on the LK's join-request card, and Style/Catalyst on the LK's copy of a sheet (1440x900)
const L = require('./r8406_lib');
const { sleep, shot, api, state } = L;
const out = {};
(async () => {
  const b = await L.launch();
  const c = await api('POST', '/api/investigators/forge', state.users.pb.token, {
    name: 'Ottilie Marsh', pronouns: '', style: 'Oilskin coat,\nlantern at the hip', catalyst: 'The tide took the village.\nI was the only one on the hill.', question: 'Why?',
    role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
    move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0, gilded_hide: true, gilded_move: true,
    nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'], user_id: state.users.pb.userId });
  await api('POST', `/campaign/join?character_id=${c.id}&code=${state.camps.S.code}`, state.users.pb.token);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(5000);
  out.hasJoinHeading = await lk.page.getByText('Join Requests').count();
  const el = lk.page.locator('p', { hasText: 'The tide took' }).first();
  out.cardCount = await el.count();
  if (out.cardCount) {
    await el.scrollIntoViewIfNeeded();
    out.card = await el.evaluate(e => ({ text: e.innerText, ws: getComputedStyle(e).whiteSpace, h: e.getBoundingClientRect().height }));
  }
  await shot(lk.page, 'f05_lk_join_card');
  // LK's copy of Wren's sheet
  await lk.page.getByText('Wren Halloway').first().click(); await sleep(1500);
  await lk.page.getByRole('tab', { name: /Catalyst/i }).first().click().catch(() => lk.page.getByRole('button', { name: /^Catalyst$/i }).first().click().catch(() => {}));
  await sleep(800);
  out.lkSheet = await lk.page.evaluate(() => {
    const ps = [...document.querySelectorAll('p')];
    const ca = ps.find(x => /^catalyst:/i.test(x.innerText)); const st = ps.find(x => /^style:/i.test(x.innerText));
    if (ca) ca.scrollIntoView({ block: 'center' });
    return { catalyst: ca?.innerText, style: st?.innerText };
  });
  await sleep(400);
  await shot(lk.page, 'f06_lk_sheet_catalyst');
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
