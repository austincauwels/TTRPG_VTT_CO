// drive-pips-one-way: lower a drive by a pip, refill it, and the Lightkeeper's copy (laptop 1366x768, LK 1440x900)
const L = require('./r8406_lib');
const H = require('./r8406_h');
const { sleep, shot, state } = L;
const out = {};
const B = state.chars.b.id;
const pips = (page, drive) => page.evaluate((d) => {
  const g = [...document.querySelectorAll('.drive-pips')].find(x => x.innerText.includes(d) || x.querySelector('.sr-only')?.textContent.startsWith(d));
  if (!g) return null;
  return { sr: g.querySelector('.sr-only')?.textContent, live: [...g.querySelectorAll('button')].map((x, i) => (x.disabled ? '-' : String(i + 1))).join('') };
}, drive);
(async () => {
  L.sql(`update characters set nerve_current=2 where id=${B}`);
  const b = await L.launch();
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const pb = await L.openSeat(b, 'laptop', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(5000);
  const lkLog0 = (await H.log(lk.page)).length;
  const bLog0 = (await H.log(pb.page)).length;
  out.before = await pips(pb.page, 'Nerve');
  // tap the second filled pip (a mistaken tap the player wants back)
  const g = pb.page.locator('.drive-pips').first();
  await g.scrollIntoViewIfNeeded();
  await g.locator('button').nth(1).click({ force: true }).catch(e => { out.clickFilled = e.message.split('\n')[0]; });
  await sleep(1200);
  out.afterFilledTap = { ui: await pips(pb.page, 'Nerve'), db: H.char(B).nerve_current };
  // keyboard: is any pip at or below the value focusable?
  out.focusableLabels = await g.locator('button:not([disabled])').evaluateAll(a => a.map(x => x.getAttribute('aria-label')));
  await shot(pb.page, 'g01_pips_before_refill');
  // refill to 3
  await g.locator('button').nth(2).click();
  await sleep(1500);
  out.afterRefill = { ui: await pips(pb.page, 'Nerve'), db: H.char(B).nerve_current };
  out.bramLogNew = (await H.log(pb.page)).slice(bLog0);
  out.lkLogNew = (await H.log(lk.page)).slice(lkLog0);
  await shot(pb.page, 'g02_after_refill');
  // the Lightkeeper's copy of Bram's sheet
  await lk.page.getByText('Bram Holt').first().click(); await sleep(2000);
  out.lkPips = await lk.page.evaluate(() => [...document.querySelectorAll('.drive-pips')].map(g => ({ sr: g.querySelector('.sr-only')?.textContent, enabled: g.querySelectorAll('button:not([disabled])').length })));
  out.lkDriveEdit = await lk.page.getByRole('button', { name: /drive|Nerve/i }).evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.innerText).slice(0, 10));
  const lg = lk.page.locator('.drive-pips').first();
  if (await lg.count()) await lg.scrollIntoViewIfNeeded();
  await shot(lk.page, 'g03_lk_copy');
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
