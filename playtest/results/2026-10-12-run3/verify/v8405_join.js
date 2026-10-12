const L = require('./v8405_lib');
const { state, sleep, shot } = L;
const device = process.argv[2] || 'wide';
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, device);
  const { page } = seat;
  const uname = `pj${device.slice(0, 2)}${Date.now().toString(36).slice(-4)}`;
  // Create an account through the slip
  await page.getByRole('button', { name: /Create an account/i }).click();
  await page.fill('#username', uname);
  await page.fill('#email', `${uname}@example.com`);
  await page.fill('#password', L.PW);
  await page.fill('#confirmPassword', L.PW);
  await page.locator('button[type=submit]', { hasText: /Create account/i }).click();
  await page.locator('.hub-tomes').waitFor({ timeout: 15000 });
  await sleep(1200);
  await shot(page, `v8405_j0_signup_${device}`);
  const userId = await page.evaluate(() => JSON.parse(localStorage.getItem('candela-vtt-storage')).state.accessSession.userId);
  const draft = { v: 1, step: 4, currentIndex: 0, name: 'Pontius Aganus', pronouns: 'he/him', style: 'Tidy', catalyst: 'A fire', question: 'Why?',
    role: 'Slink', specialty: 'Criminal', selectedRoleAbility: 'Scout', selectedSpecialtyAbility: 'Street Smarts',
    lockedActions: { control: 1, hide: 2, survey: 1, read: 1 }, freeRaiseKey: 'sense', freeAdditions: { move: 1, strike: 1, sway: 1 },
    lockedDrives: { nerve: 1, cunning: 2 }, driveDistrib: { nerve: 2, cunning: 1, intuition: 3 }, lockedGilded: 'hide', freeGilded: 'move',
    selectedGear: ['Advanced Lockpicks', 'Forged Documents', 'Concealed Blade'], campaignCode: '', selectedPen: 'Caveat' };
  await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [`candela-creator-draft:${userId}`, draft]);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('candela-vtt-storage')); s.state.stage = 'CHARACTER_CREATION'; localStorage.setItem('candela-vtt-storage', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await shot(page, `v8405_j1_creator_${device}`);
  await page.getByRole('button', { name: /Save and join a campaign/i }).click();
  await sleep(800);
  const dlg = page.locator('[role=dialog][aria-labelledby=join-campaign-title]');
  await dlg.locator('input').first().fill(state.camps.S.code);
  await shot(page, `v8405_j2_dialog_${device}`);
  await dlg.getByRole('button', { name: /ask to join/i }).click();
  await sleep(2500);
  await shot(page, `v8405_j3_hub_${device}`);
  const notice = await page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert]')].map((e) => e.textContent.trim()).filter(Boolean));
  console.log(device, 'notices', JSON.stringify(notice));
  console.log('errors', seat.errors.slice(0, 5));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
