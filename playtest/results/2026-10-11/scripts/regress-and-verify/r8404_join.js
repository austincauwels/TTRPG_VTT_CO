// join-requests-lose-details, join-request-no-sheet-preview, long-name-polaroid-sheet (LK laptop 1440x900)
const fs = require('fs');
const L = require('./r8404_lib');
const { api, sql, sleep, shot, state } = L;

const SLINK = { role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
  move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0, gilded_hide: true, gilded_move: true,
  nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'] };
const DOC = { role: 'Scholar', specialty: 'Doctor', role_ability: 'Meticulous Notes', specialty_ability: 'Patch Up',
  move: 1, strike: 0, control: 2, hide: 0, sneak: 2, sway: 0, survey: 2, read: 2, sense: 0, gilded_sneak: true, gilded_read: true,
  nerve_max: 3, nerve_current: 3, cunning_max: 3, cunning_current: 3, intuition_max: 3, intuition_current: 3, gear: ['Lantern'] };

(async () => {
  const stamp = state.stamp;
  const users = state.users;
  for (const k of ['lkj', 'j1', 'j2', 'j3']) {
    if (users[k]) continue;
    const username = `${k}r4${stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    users[k] = { ...r, username };
  }
  const RUN = process.env.RUN || 'J';
  if (!state.camps[RUN]) {
    const code = `${RUN.toLowerCase()}r4-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Joining Hours')}&code=${code}`, users.lkj.token);
    state.camps[RUN] = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Joining Hours', lk: 'lkj' };
  }
  fs.writeFileSync(L.STATE, JSON.stringify(state, null, 1));
  const camp = state.camps[RUN];
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lkj', null, RUN) });
  await sleep(4000);
  await shot(lk.page, RUN + '_join_00_desk_empty');
  const forge = async (key, owner, name, pronouns, catalyst, kind) => {
    const c = await api('POST', '/api/investigators/forge', users[owner].token, { pronouns, style: 'Tidy', catalyst, question: 'Why?', name, ...kind, user_id: users[owner].userId });
    await api('POST', `/campaign/join?character_id=${c.id}&code=${camp.code}`, users[owner].token);
    state.chars[key] = { id: c.id, name, owner, camp: RUN, specialty: kind.specialty };
    fs.writeFileSync(L.STATE, JSON.stringify(state, null, 1));
  };
  await forge(RUN + 'ja', 'j1', 'Cassandra "Latch" Moreau', 'she/her', 'A door that opened from the other side.', SLINK);
  await sleep(1200);
  await forge(RUN + 'jb', 'j2', 'Edda Rook', 'they/them', 'The bell that rang at noon on a Sunday.', DOC);
  await sleep(1200);
  await forge(RUN + 'jc', 'j3', 'Imogen Hale', 'he/him', 'My brother came home wrong.', SLINK);
  await sleep(3000);
  const cardText = async () => lk.page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => /Join Requests/i.test(e.textContent));
    if (!h) return 'no join header';
    const box = h.closest('div').parentElement;
    return box.innerText.replace(/\s+/g, ' ').slice(0, 400);
  });
  console.log('LIVE card 1:', await cardText());
  await shot(lk.page, RUN + '_join_01_live_requests');
  // Next request
  await lk.page.getByRole('button', { name: 'Next request' }).click(); await sleep(500);
  console.log('LIVE card 2:', await cardText());
  await lk.page.getByRole('button', { name: 'Previous request' }).click(); await sleep(500);
  // View sheet on the first
  await lk.page.getByRole('button', { name: 'View sheet' }).first().click(); await sleep(2000);
  await shot(lk.page, RUN + '_join_02_view_sheet');
  const sheetBtns = await lk.page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('SHEET BUTTONS:', JSON.stringify(sheetBtns));
  const bodyTxt = await lk.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  console.log('SHEET TEXT:', bodyTxt);
  fs.writeFileSync(L.DIR + '/out_8404/join_sheet_text.txt', bodyTxt);
  // Back to roster
  const back = lk.page.getByRole('button', { name: /Back to roster/i }).first();
  if (await back.count()) { await back.click(); await sleep(1500); }
  await shot(lk.page, RUN + '_join_03_back');
  // Approve the first (Cassandra) with a double-click
  await lk.page.getByRole('button', { name: 'Approve' }).first().dblclick(); await sleep(3500);
  console.log('AFTER APPROVE card:', await cardText());
  await shot(lk.page, RUN + '_join_04_after_approve');
  // Reload
  await lk.page.reload({ waitUntil: 'domcontentloaded' }); await sleep(4500);
  console.log('AFTER RELOAD card:', await cardText());
  await shot(lk.page, RUN + '_join_05_after_reload');
  await lk.page.getByRole('button', { name: 'Next request' }).click().catch(() => {}); await sleep(500);
  console.log('AFTER RELOAD card 2:', await cardText());
  console.log('statuses', sql(`select id,name,status from characters where campaign_id=${camp.id} order by id`));
  console.log('errors', lk.errors.slice(0, 5));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
