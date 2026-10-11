// style-never-shown + catalyst-linebreaks: creator -> join -> sheet, LK's request card
const L = require('./r8406_lib');
const { sleep, shot, api, state } = L;
const out = {};
const STYLE = 'Moth-eaten greatcoat,\nbrass spectacles on a chain';
const CATALYST = 'The mill burned on the longest night.\nMy sister was inside.\nNo one found her.';
const draftFor = (name) => ({
  v: 1, step: 2, currentIndex: 0, name, pronouns: '', style: '', catalyst: '', question: 'Who lit the fire?',
  role: 'Slink', specialty: 'Criminal', selectedRoleAbility: 'Death Defy', selectedSpecialtyAbility: 'Street Smarts',
  lockedActions: { move: 0, strike: 0, control: 1, hide: 2, sneak: 0, sway: 0, survey: 1, read: 1, sense: 0 }, freeRaiseKey: 'move',
  freeAdditions: { move: 0, strike: 1, control: 0, hide: 0, sneak: 0, sway: 1, survey: 0, read: 0, sense: 1 },
  lockedDrives: { nerve: 1, cunning: 2, intuition: 0 }, driveDistrib: { nerve: 2, cunning: 2, intuition: 2 },
  lockedGilded: 'hide', freeGilded: 'move', selectedGear: ['Advanced Lockpicks', 'Forged Documents', 'Concealed Blade'],
  campaignCode: '', selectedPen: 'Caveat',
});
(async () => {
  const b = await L.launch();
  const username = `dv${Date.now().toString(36).slice(-5)}`;
  const u = { ...(await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW })), username };
  const store = { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'CHARACTER_CREATION' };
  const seat = await L.openSeat(b, 'tablet', { store, init: [{ fn: ([k, d]) => { try { if (!sessionStorage.getItem('seeded-draft')) { localStorage.setItem(k, JSON.stringify(d)); sessionStorage.setItem('seeded-draft', '1'); } } catch {} }, arg: [`candela-creator-draft:${u.userId}`, draftFor('Wren Halloway')] }] });
  await sleep(3000);
  const p = seat.page;
  await p.fill('#creator-style', STYLE);
  await p.fill('#creator-catalyst', CATALYST);
  await shot(p, 'f01_creator_step2', { fullPage: false });
  await p.locator('nav[aria-label="Steps"] button').nth(3).click(); await sleep(1500);
  const sum = p.getByText('Catalyst', { exact: true }).last();
  await sum.scrollIntoViewIfNeeded().catch(() => {});
  out.summaryCatalystLines = await p.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find(x => x.innerText.includes('My sister'));
    return el ? { text: el.innerText, ws: getComputedStyle(el).whiteSpace, h: el.getBoundingClientRect().height } : null;
  });
  out.summaryStyle = await p.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find(x => x.innerText.includes('brass spectacles'));
    return el ? { text: el.innerText, ws: getComputedStyle(el).whiteSpace } : null;
  });
  await shot(p, 'f02_creator_summary');
  // Save and ask to join
  await p.getByRole('button', { name: /Save and join a campaign/i }).click(); await sleep(800);
  const dlg = p.getByRole('dialog', { name: 'Join a Campaign' });
  await dlg.getByRole('textbox').first().fill(state.camps.S.code);
  await dlg.getByRole('button', { name: /Save and ask to join/ }).click(); await sleep(3000);
  const ch = L.sql(`select id from characters where name='Wren Halloway' order by id desc limit 1`);
  out.charId = ch;
  out.stored = L.sql(`select style || ' || ' || catalyst from characters where id=${ch}`);
  // the LK's request card
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  await sleep(5000);
  const card = lk.page.getByText('Wren Halloway').first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  out.lkCard = await lk.page.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find(x => x.innerText.includes('My sister'));
    return el ? { text: el.innerText, ws: getComputedStyle(el).whiteSpace } : null;
  });
  await shot(lk.page, 'f03_lk_request_card');
  await api('POST', `/campaign/approve/${ch}`, state.users.lk.token);
  // the player's sheet, Catalyst tab, tablet and laptop
  for (const dev of ['tablet', 'laptop']) {
    const st = { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: state.camps.S.code, campaignId: state.camps.S.id, token: u.token },
      stage: 'DESK', character: await api('GET', `/api/investigators/${ch}`, u.token), lastPlayedCampaign: { type: 'player', characterId: Number(ch), campaignCode: state.camps.S.code, campaignName: state.camps.S.name, campaignId: state.camps.S.id } };
    const s = await L.openSeat(b, dev, { store: st });
    await sleep(5000);
    await s.page.getByRole('tab', { name: /Catalyst/i }).first().click().catch(async () => { await s.page.getByRole('button', { name: /^Catalyst$/i }).first().click(); });
    await sleep(800);
    const pane = await s.page.evaluate(() => {
      const el = [...document.querySelectorAll('p')].find(x => x.innerText.startsWith('Catalyst:') || x.innerText.startsWith('CATALYST:'));
      const st = [...document.querySelectorAll('p')].find(x => /^style:/i.test(x.innerText));
      if (el) el.scrollIntoView({ block: 'center' });
      return { catalyst: el?.innerText, ws: el ? getComputedStyle(el).whiteSpace : null, style: st?.innerText };
    });
    out[`sheet_${dev}`] = pane;
    await sleep(500);
    await shot(s.page, `f04_sheet_catalyst_${dev}`);
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
