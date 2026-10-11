// gear-limits-silent: creator at 1920, the in-play gear dialog on a phone and a laptop
const L = require('./r8406_lib');
const { sleep, shot, api, state } = L;
const out = {};
const draft = {
  v: 1, step: 4, currentIndex: 0, name: 'Ada Lockhart', pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?',
  role: 'Slink', specialty: 'Criminal', selectedRoleAbility: 'Death Defy', selectedSpecialtyAbility: 'Street Smarts',
  lockedActions: { move: 0, strike: 0, control: 1, hide: 2, sneak: 0, sway: 0, survey: 1, read: 1, sense: 0 }, freeRaiseKey: 'move',
  freeAdditions: { move: 0, strike: 1, control: 0, hide: 0, sneak: 0, sway: 1, survey: 0, read: 0, sense: 1 },
  lockedDrives: { nerve: 1, cunning: 2, intuition: 0 }, driveDistrib: { nerve: 2, cunning: 2, intuition: 2 },
  lockedGilded: 'hide', freeGilded: 'move', selectedGear: ['Advanced Lockpicks', 'Forged Documents', 'Concealed Blade'], campaignCode: '', selectedPen: 'Caveat',
};
(async () => {
  const b = await L.launch();
  // A. creator at 1920x1080
  L.DEVICES.desk = { viewport: { width: 1920, height: 1080 } };
  const username = `ad${Date.now().toString(36).slice(-5)}`;
  const u = { ...(await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW })), username };
  const store = { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'CHARACTER_CREATION' };
  const c = await L.openSeat(b, 'desk', { store, init: [{ fn: ([k, d]) => { try { if (!sessionStorage.getItem('sd2')) { localStorage.setItem(k, JSON.stringify(d)); sessionStorage.setItem('sd2', '1'); } } catch {} }, arg: [`candela-creator-draft:${u.userId}`, draft] }] });
  await sleep(3000);
  const lantern = c.page.getByRole('button', { name: /Lantern/ }).first();
  await lantern.scrollIntoViewIfNeeded();
  out.creatorLantern = await lantern.evaluate(e => ({ title: e.title, opacity: getComputedStyle(e).opacity, pressed: e.getAttribute('aria-pressed') }));
  await lantern.hover(); await sleep(300);
  await lantern.click(); await sleep(500);
  out.creatorAfter4th = { pressed: await lantern.getAttribute('aria-pressed'), count: await c.page.getByText(/\d \/ 3 selected/).first().innerText() };
  out.creatorVisibleReason = await c.page.getByText(/Untick one to swap/).count();
  await shot(c.page, 'j01_creator_4th_pick');
  // B. phone, three marked, write in the belfry key
  L.sql(`update characters set gear='["Lantern","Advanced Lockpicks","Forged Documents"]' where id=${state.chars.fd.id}`);
  const p = await L.openSeat(b, 'phone', { store: await L.storeFor('fd', 'fd', 'F') });
  await sleep(5000);
  await p.page.getByRole('button', { name: /Change gear/i }).first().tap(); await sleep(800);
  const dlg = p.page.getByRole('dialog', { name: 'Change Gear' });
  await shot(p.page, 'j02_phone_dialog_open');
  // tap an unmarked item: does anything say why nothing happens?
  const crowbar = dlg.getByRole('button').filter({ hasText: /Crowbar|Rope|Matches|Bandages|Notebook/ }).first();
  out.phoneItem = await crowbar.innerText().catch(() => null);
  await crowbar.tap().catch(() => {}); await sleep(400);
  out.phoneItemAfterTap = await crowbar.getAttribute('aria-pressed').catch(() => null);
  out.phoneItemOpacity = await crowbar.evaluate(e => getComputedStyle(e).opacity).catch(() => null);
  out.statusAfterItemTap = await dlg.locator('[role=status]').allInnerTexts();
  await dlg.getByRole('textbox', { name: 'Gear to write in by name' }).fill('Brass belfry key');
  await sleep(300);
  out.phoneAddDisabled = await dlg.getByRole('button', { name: 'Add' }).isDisabled();
  out.phoneReason = await dlg.locator('[role=status]').allInnerTexts();
  out.phoneReasonBox = await dlg.locator('[role=status]').first().boundingBox().catch(() => null);
  out.phoneSelectedLineBox = await dlg.getByText(/\d \/ 3 selected/).boundingBox();
  await shot(p.page, 'j03_phone_writein_full');
  await p.ctx.close();
  // C. laptop, room for one more, a long write-in
  L.sql(`update characters set gear='["Lantern"]' where id=${state.chars.fd.id}`);
  const l = await L.openSeat(b, 'laptop', { store: await L.storeFor('fd', 'fd', 'F') });
  await sleep(5000);
  await l.page.getByRole('button', { name: /Change gear/i }).first().click(); await sleep(800);
  const d2 = l.page.getByRole('dialog', { name: 'Change Gear' });
  const long = 'A brass key to the belfry door of Saint Ives, handed over by the verger at midnight';
  await d2.getByRole('textbox', { name: 'Gear to write in by name' }).click();
  await l.page.keyboard.type(long, { delay: 5 });
  out.laptopValue = await d2.getByRole('textbox', { name: 'Gear to write in by name' }).inputValue();
  out.laptopCounter = await d2.locator('[role=status]').allInnerTexts();
  await shot(l.page, 'j04_laptop_long_writein');
  await d2.getByRole('button', { name: 'Add' }).click(); await sleep(300);
  await d2.getByRole('button', { name: 'Save gear' }).click(); await sleep(1500);
  out.laptopSaved = L.sql(`select gear from characters where id=${state.chars.fd.id}`);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
