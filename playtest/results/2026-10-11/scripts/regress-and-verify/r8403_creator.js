// A new player at step 4 of the creator (seeded draft), then 'Save and join a campaign'
const L = require('./r8403_lib');
const { sleep, shot, api, state } = L;
async function newPlayer(tag) {
  const username = `${tag}${Date.now().toString(36).slice(-5)}`;
  const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
  return { ...r, username };
}
const draftFor = (name) => ({
  v: 1, step: 4, currentIndex: 0, name, pronouns: '', style: 'Tidy', catalyst: 'A fire at the mill', question: 'Why me?',
  role: 'Slink', specialty: 'Criminal', selectedRoleAbility: 'Death Defy', selectedSpecialtyAbility: 'Street Smarts',
  lockedActions: { move: 0, strike: 0, control: 1, hide: 2, sneak: 0, sway: 0, survey: 1, read: 1, sense: 0 }, freeRaiseKey: 'move',
  freeAdditions: { move: 0, strike: 1, control: 0, hide: 0, sneak: 0, sway: 1, survey: 0, read: 0, sense: 1 },
  lockedDrives: { nerve: 1, cunning: 2, intuition: 0 }, driveDistrib: { nerve: 2, cunning: 2, intuition: 2 },
  lockedGilded: 'hide', freeGilded: 'move', selectedGear: ['Advanced Lockpicks', 'Forged Documents', 'Concealed Blade'],
  campaignCode: '', selectedPen: 'Caveat',
});
async function openCreator(browser, device, u, name) {
  const store = { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'CHARACTER_CREATION' };
  const draft = draftFor(name);
  const seat = await L.openSeat(browser, device, { store, init: [{ fn: ([k, d]) => { try { if (!sessionStorage.getItem('seeded-draft')) { localStorage.setItem(k, JSON.stringify(d)); sessionStorage.setItem('seeded-draft', '1'); } } catch {} }, arg: [`candela-creator-draft:${u.userId}`, draft] }] });
  await sleep(3000);
  return seat;
}
module.exports = { newPlayer, openCreator };
if (require.main === module) (async () => {
  const b = await L.launch();
  const u = await newPlayer('cass');
  const cass = await openCreator(b, 'laptop', u, 'Cassia Thorne');
  const p = cass.page;
  await shot(p, 'c01_step4');
  const btn = p.getByRole('button', { name: /Save and join a campaign/i });
  console.log('join button visible', await btn.isVisible());
  await btn.scrollIntoViewIfNeeded();
  await btn.dblclick();
  await sleep(800);
  const dlg = p.getByRole('dialog', { name: 'Join a Campaign' });
  console.log('after double-click dialog open:', await dlg.isVisible());
  await shot(p, 'c02_after_dblclick');
  // triple-click: close and reopen
  await p.keyboard.press('Escape'); await sleep(400);
  console.log('after Escape open:', await dlg.isVisible().catch(() => false));
  await btn.click({ clickCount: 3 }); await sleep(800);
  console.log('after triple-click open:', await dlg.isVisible());
  // A single click on the backdrop still closes it
  await p.mouse.click(30, 30); await sleep(500);
  console.log('after one backdrop click open:', await dlg.isVisible().catch(() => false));
  // Double-click on the backdrop: the first click closes it, the second lands on the page
  await btn.click(); await sleep(600);
  await p.mouse.dblclick(30, 30); await sleep(500);
  console.log('after backdrop double-click open:', await dlg.isVisible().catch(() => false));
  // Join with capitals and a pen; Save and ask to join
  await btn.click(); await sleep(600);
  const code = state.camps.D.code.replace(/^drowned-bell/, 'Drowned-Bell');
  await dlg.getByRole('textbox').first().fill(code);
  await shot(p, 'c03_dialog_filled');
  const dlgButtons = await dlg.locator('button').evaluateAll(a => a.map(x => x.innerText.trim()).filter(Boolean));
  console.log('dialog buttons', dlgButtons.join(' | '));
  require('fs').writeFileSync('/home/user/pt2/verify/out_8403/cass.json', JSON.stringify(u));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
