// Keyboard at 1366x768: creator Next card; Join dialog Handwriting picker
const L = require('./r8407_lib');
const { sleep, api, state } = L;
const act = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName} "${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 50)}"` : 'none'; });
(async () => {
  if (!state.chars.solo) {
    const u = state.users.solo;
    const c = await api('POST', '/api/investigators/forge', u.token, { pronouns: '', style: 'Tidy', catalyst: 'x', question: 'y', name: 'Cass Penrose',
      role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts', move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0,
      gilded_hide: true, gilded_move: true, nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'], user_id: u.userId });
    state.chars.solo = { id: c.id, name: 'Cass Penrose', owner: 'solo' };
    require('fs').writeFileSync(L.STATE, JSON.stringify(state, null, 1));
  }
  const b = await L.launch();
  const s = await L.openSeat(b, 'laptop');
  await L.signIn(s.page, 'solo');
  await L.shot(s.page, 'f00_hub');
  // Case Ledger → Join a campaign
  await s.page.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1200);
  await s.page.getByRole('button', { name: /Cass Penrose/ }).first().click(); await sleep(600);
  const trig = s.page.getByRole('button', { name: /^Handwriting/ });
  console.log('trigger', await trig.count(), await trig.first().getAttribute('aria-expanded'));
  await trig.first().focus(); await s.page.keyboard.press('Enter'); await sleep(400);
  console.log('open?', await trig.first().getAttribute('aria-expanded'), 'focus', await act(s.page));
  await L.shot(s.page, 'f01_pen_open');
  const grp = await s.page.evaluate(() => { const g = [...document.querySelectorAll('[role=group]')].find(x => /pen-label/.test(x.getAttribute('aria-labelledby') || '')); return g ? { n: g.querySelectorAll('button').length, pressed: [...g.querySelectorAll('button[aria-pressed=true]')].map(x => x.textContent), roles: [...g.querySelectorAll('[role=option],[role=listbox]')].length } : null; });
  console.log('group', JSON.stringify(grp));
  // Tab into the list, pick the third pen with Tab, Tab, Tab, Enter
  for (let i = 0; i < 3; i++) await s.page.keyboard.press('Tab');
  console.log('focus on', await act(s.page));
  await s.page.keyboard.press('Enter'); await sleep(400);
  console.log('after pick: focus', await act(s.page), 'expanded', await trig.first().getAttribute('aria-expanded'));
  // Reopen, ArrowDown (nothing promised now), then Escape
  await s.page.keyboard.press('Enter'); await sleep(300);
  await s.page.keyboard.press('ArrowDown'); await sleep(200);
  await s.page.keyboard.press('Escape'); await sleep(400);
  const dlgCount = await s.page.locator('[role=dialog]').count();
  console.log('after Escape: list expanded', await trig.first().getAttribute('aria-expanded').catch(() => 'gone'), 'dialogs', dlgCount, 'focus', await act(s.page));
  await L.shot(s.page, 'f02_after_escape');
  // Escape with focus inside the list (on an option)
  await s.page.keyboard.press('Enter'); await sleep(300); await s.page.keyboard.press('Tab'); await s.page.keyboard.press('Tab');
  console.log('focus in list', await act(s.page));
  await s.page.keyboard.press('Escape'); await sleep(400);
  console.log('Escape from inside list: expanded', await trig.first().getAttribute('aria-expanded').catch(() => 'gone'), 'dialogs', await s.page.locator('[role=dialog]').count(), 'focus', await act(s.page));
  // Second Escape closes the ledger dialog
  await s.page.keyboard.press('Escape'); await sleep(500);
  console.log('2nd Escape: dialogs', await s.page.locator('[role=dialog]').count());
  // Creator
  await s.page.keyboard.press('Escape'); await sleep(300);
  const nt = s.page.getByRole('button', { name: /NEW CHARACTER/i });
  console.log('new ticket count', await nt.count());
  await nt.first().click(); await sleep(2500);
  await L.shot(s.page, 'f03_creator');
  const next = s.page.getByRole('button', { name: 'Next card' });
  const counter = () => s.page.evaluate(() => [...document.querySelectorAll('span')].map(x => x.textContent.trim()).find(t => /^\d+ \/ \d+$/.test(t)));
  await next.focus();
  console.log('start', await counter());
  await s.page.keyboard.press('Enter'); await sleep(900);
  console.log('after Enter 1', await counter(), await act(s.page));
  await s.page.keyboard.press('Enter'); await sleep(900);
  console.log('after Enter 2', await counter(), await act(s.page));
  await s.page.keyboard.press('Enter'); await s.page.keyboard.press('Enter'); await sleep(1000);
  console.log('after fast double Enter', await counter(), await act(s.page));
  await s.page.keyboard.press('Enter'); await sleep(100); await s.page.keyboard.press('Enter'); await sleep(900);
  console.log('after Enter, 100ms, Enter', await counter(), await act(s.page));
  // Previous at the start
  const prev = s.page.getByRole('button', { name: 'Previous card' });
  await prev.focus(); for (let i = 0; i < 8; i++) { await s.page.keyboard.press('Enter'); await sleep(800); }
  console.log('prev back to', await counter(), await act(s.page), 'aria-disabled', await prev.getAttribute('aria-disabled'));
  await s.page.keyboard.press('Enter'); await sleep(800);
  console.log('enter at first card', await counter(), await act(s.page));
  await L.shot(s.page, 'f04_creator_after');
  console.log('errors', s.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
