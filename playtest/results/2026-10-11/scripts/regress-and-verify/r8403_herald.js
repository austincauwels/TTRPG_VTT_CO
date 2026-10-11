const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { sleep, shot, api, state } = L;
const hubStore = (who) => { const u = state.users[who]; return { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'HOME' }; };
(async () => {
  const b = await L.launch();
  for (const dev of ['laptop', 'tablet']) {
    const s = await L.openSeat(b, dev, { store: hubStore('pb') }); await sleep(3500);
    const info = await s.page.evaluate(() => {
      const h = [...document.querySelectorAll('[data-hub="herald"]')].filter(e => e.offsetParent !== null || getComputedStyle(e).display !== 'none');
      return h.map(e => { const ps = [...e.querySelectorAll('p')]; const first = ps.find(p => /itizens/.test(p.textContent)); const last = ps.find(p => /emergency/.test(p.textContent));
        return { visible: e.getBoundingClientRect().width > 0, ariaHidden: e.closest('[aria-hidden=true]') ? true : false, firstChildNodes: first ? [...first.childNodes].map(n => n.nodeName).join(',') : null, firstStart: first?.textContent.trim().slice(0, 12), firstLetter: first ? getComputedStyle(first, '::first-letter').fontSize + ' float:' + getComputedStyle(first, '::first-letter').float : null, emergency: last?.textContent.match(/\ba[n]? emergency/)?.[0] }; });
    });
    console.log(dev, JSON.stringify(info));
    const snap = await s.page.locator('body').ariaSnapshot().catch(() => '');
    console.log(dev, 'aria snapshot mentions:', JSON.stringify((snap.match(/.{0,20}itizens.{0,20}/) || [''])[0]), '| a emergency in snapshot:', /a emergency/.test(snap));
    await shot(s.page, `h01_herald_${dev}`);
    await s.ctx.close();
  }
  // Desktop 1920: Jonah's notebook in Moon Dance
  const store = await L.storeFor('pj', 'j', 'D');
  const ada = await L.openSeat(b, 'wide', { store }); await ada.page.setViewportSize({ width: 1920, height: 1080 }); await sleep(3500);
  const p = ada.page;
  await goTab(p, 'Notebook'); await sleep(1500);
  const sel = p.locator('#notebook-handwriting');
  console.log('notebook pen select value', await sel.inputValue(), 'options with Beanie/Moon:', JSON.stringify(await sel.locator('option').evaluateAll(a => a.map(o => o.value).filter(v => /Bea|Moon/.test(v)))));
  await p.locator('input[type=text]').first().fill('Moon Dance hand');
  await p.locator('textarea').first().fill('Written in the *Moon Dance* pen.');
  await p.getByRole('button', { name: /^Add entry$/i }).click(); await sleep(2500);
  const h3 = await p.locator('h3', { hasText: 'Moon Dance hand' }).filter({ visible: true }).first().evaluate(e => ({ font: getComputedStyle(e).fontFamily, ok: document.fonts.check(`32px ${getComputedStyle(e).fontFamily}`) }));
  console.log('entry heading font', JSON.stringify(h3));
  await shot(p, 'h02_moon_entry_1920');
  // Switch to Reenie Beanie in the notebook select
  await p.getByRole('button', { name: /^Contents$/ }).first().click().catch(() => {}); await sleep(600);
  await sel.selectOption('Reenie Beanie'); await sleep(1500);
  console.log('server pen after select', L.sql(`select pen_font from characters where id=${state.chars.j.id}`));
  console.log('errors', ada.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
