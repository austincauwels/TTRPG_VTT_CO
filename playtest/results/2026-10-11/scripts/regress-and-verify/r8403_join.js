const L = require('./r8403_lib');
const { newPlayer, openCreator } = require('./r8403_creator');
const { sleep, shot, api, state } = L;
(async () => {
  const b = await L.launch();
  const u = await newPlayer('cass');
  const cass = await openCreator(b, 'laptop', u, 'Cassia Wilhelmina Thorne-Fairweather of Briarbank');
  const p = cass.page;
  const btn = p.getByRole('button', { name: /Save and join a campaign/i });
  await btn.scrollIntoViewIfNeeded();
  await btn.dblclick(); await sleep(800);
  const dlg = p.getByRole('dialog', { name: 'Join a Campaign' });
  console.log('dialog open after double-click:', await dlg.isVisible());
  const code = state.camps.D.code.replace(/^drowned-bell/, 'Drowned-Bell');
  await dlg.getByRole('textbox').first().fill(code);
  await dlg.getByRole('button', { name: 'Handwriting' }).first().click(); await sleep(300);
  await dlg.getByRole('group').getByRole('button', { name: 'Moon Dance' }).click(); await sleep(1200);
  const fontOk = await p.evaluate(() => ({ moon: document.fonts.check('20px "Moon Dance"'), reenie: document.fonts.check('20px "Reenie Beanie"') }));
  console.log('fonts loaded', JSON.stringify(fontOk));
  await shot(p, 'j01_dialog_moon');
  await dlg.getByRole('button', { name: /Save and ask to join/i }).click();
  const t0 = Date.now();
  await sleep(2500);
  const notice = await p.locator('[role=status]').allInnerTexts();
  console.log('hub notice after join:', JSON.stringify(notice));
  await shot(p, 'j02_hub_after_join');
  const ch = (await api('GET', `/api/users/${u.userId}/characters`, u.token).catch(async () => null));
  console.log('chars api', JSON.stringify(ch && (ch.characters || ch).map?.(c => [c.id, c.status, c.pen_font, c.campaign_name])));
  // Open the Registry
  await p.getByRole('button', { name: /Case Ledger/ }).first().click(); await sleep(1500);
  await shot(p, 'j03_registry_pending');
  const row = await p.evaluate(() => { const ps = [...document.querySelectorAll('p[title]')]; return ps.map(x => ({ t: x.title, cut: x.scrollWidth > x.clientWidth, tag: x.closest('button') ? 'in button' : 'plain' })); });
  console.log('pending row names', JSON.stringify(row));
  const rowButtons = await p.locator('text=Waiting for the Lightkeeper to approve').locator('xpath=..').locator('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.innerText).trim() + (x.disabled ? '(disabled)' : '') + (x.getAttribute('aria-disabled') === 'true' ? '(aria-disabled)' : '')));
  console.log('pending row buttons', JSON.stringify(rowButtons));
  // The Lightkeeper approves; the player keeps the Registry open
  const charId = (await api('GET', `/campaign/${state.camps.D.id}/roster`, state.users.lkd.token).catch(() => null));
  const pend = await (async () => { const r = L.sql(`select id from characters where user_id=${u.userId}`); return Number(r); })();
  await api('POST', `/campaign/approve/${pend}`, state.users.lkd.token);
  const tA = Date.now();
  let got = null;
  for (let i = 0; i < 40 && !got; i++) {
    await sleep(1000);
    const n = await p.locator('[role=status]').allInnerTexts();
    const s = n.find(x => /let /.test(x));
    if (s) got = { s, after: Math.round((Date.now() - tA) / 1000) };
  }
  console.log('approval notice:', JSON.stringify(got));
  await shot(p, 'j04_after_approval');
  const sections = await p.locator('.book-page').first().innerText().catch(() => '');
  console.log('registry now:', JSON.stringify(sections.slice(0, 300)));
  // Play it
  await p.getByRole('button', { name: /Cassia Wilhelmina/ }).first().click().catch(e => console.log('play', e.message)); await sleep(4000);
  const st = await p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('candela-vtt-storage')).state; return { stage: s.stage, code: s.accessSession?.campaignCode, camp: s.accessSession?.campaignId }; } catch (e) { return String(e); } });
  console.log('after Play store', JSON.stringify(st), 'actual code', state.camps.D.code, 'sockets', cass.sockets.map(s => s.url + (s.closedAt ? ' closed' : ' open')));
  await shot(p, 'j05_desk');
  console.log('pen on server', L.sql(`select pen_font, status, campaign_id from characters where id=${pend}`));
  console.log('errors', cass.errors.slice(0, 5));
  require('fs').writeFileSync('/home/user/pt2/verify/out_8403/cass.json', JSON.stringify({ ...u, charId: pend }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
