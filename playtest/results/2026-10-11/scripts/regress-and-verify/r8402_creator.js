// creator-step-scroll-position, creator-touch-targets, creator-caps-unexplained, creator-dossier-incomplete, sig-gear-tag
// usage: node r8402_creator.js <device> [cardIndex]
const L = require('./r8402_lib');
const { sleep } = L;
const dev = process.argv[2] || 'phone';
const target = +(process.argv[3] || 0);
(async () => {
  const b = await L.launch();
  const sizes = { desktop: { width: 1920, height: 1080 } };
  const seat = await L.openSeat(b, sizes[dev] ? 'laptop' : dev, {});
  const p = seat.page;
  if (sizes[dev]) await p.setViewportSize(sizes[dev]);
  const shot = (n) => p.screenshot({ path: `${L.DIR}/cr_${dev}_${n}.png` });
  await L.signIn(p, 'pa');
  await p.getByText(/New character/i).first().click();
  await sleep(2500);
  await shot('01_step1');
  for (let i = 0; i < target; i++) { await p.getByRole('button', { name: 'Next card' }).click(); await sleep(700); }
  const groups = p.locator('[role=radiogroup]');
  for (let g = 0; g < await groups.count(); g++) await groups.nth(g).locator('[role=radio]').first().click();
  const sel = p.getByRole('button', { name: /Select this Path/i });
  await sel.scrollIntoViewIfNeeded();
  console.log('scrollY before Select:', await p.evaluate(() => scrollY));
  await sel.click(); await sleep(1200);
  console.log('step 2 scrollY:', await p.evaluate(() => scrollY), '| focus:', await p.evaluate(() => document.activeElement?.textContent?.slice(0, 40)));
  await shot('02_step2');
  // Fill step 2
  const inputs = await p.evaluate(() => [...document.querySelectorAll('input,textarea,select')].map((e) => `${e.tagName}#${e.id}[${e.getAttribute('aria-label') || ''}]`));
  console.log('step2 fields', JSON.stringify(inputs));
  const byId = async (re, v) => { const id = (await p.evaluate((r) => [...document.querySelectorAll('input,textarea')].find((e) => new RegExp(r, 'i').test(e.id + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.labels?.[0]?.textContent || '')))?.id, re)); if (id) await p.locator('#' + id).fill(v); return id; };
  console.log('filled', await byId('name', 'Edith Marrow'), await byId('style', 'Tidy and grey'), await byId('catalyst', 'A fire at the mill'), await byId('question', 'Who lit it?'));
  const adv = p.getByRole('button', { name: /Advance/ });
  await adv.scrollIntoViewIfNeeded();
  console.log('scrollY before Advance (2):', await p.evaluate(() => scrollY));
  await adv.click(); await sleep(1200);
  console.log('step 3 scrollY:', await p.evaluate(() => scrollY), '| focus:', await p.evaluate(() => document.activeElement?.textContent?.slice(0, 40)));
  await shot('03_step3');
  // Touch targets on step 3
  const sizesOf = await p.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; };
    return {
      gild: [...document.querySelectorAll('button[aria-label^="Gild "]')].slice(0, 3).map(r),
      plus: [...document.querySelectorAll('button[aria-label^="Put a free point"]')].slice(0, 2).map(r),
      minus: [...document.querySelectorAll('button[aria-label^="Take a free point"]')].slice(0, 2).map(r),
      fixed: [...document.querySelectorAll('[aria-label$="is gilded by your specialty"]')].map((e) => e.getAttribute('aria-label')),
      overflowX: document.documentElement.scrollWidth - innerWidth,
    };
  });
  console.log('step3 controls', JSON.stringify(sizesOf));
  // Caps: put free points; find a disabled + and its title
  const plus = p.locator('button[aria-label^="Put a free point"]');
  // put 2 on the first enabled action whose total starts at 0
  const n = await plus.count();
  for (let i = 0; i < n && (await p.locator('text=/3\\/3 placed/').count()) === 0; i++) {
    const btn = plus.nth(i);
    while (await btn.isEnabled() && (await p.locator('text=/3\\/3 placed/').count()) === 0) { await btn.click(); await sleep(100); }
  }
  const disabledPlus = await p.evaluate(() => [...document.querySelectorAll('button[aria-label^="Put a free point"]')].filter((b) => b.disabled).map((b) => `${b.getAttribute('aria-label').replace('Put a free point on ', '')}: ${b.title || '(no title)'}`));
  console.log('disabled + reasons', JSON.stringify(disabledPlus.slice(0, 9)));
  // free gild on an ungilded action
  const g = p.locator('button[aria-label^="Gild "]').nth(1);
  await g.scrollIntoViewIfNeeded(); await g.click(); await sleep(300);
  console.log('gild pressed:', await g.getAttribute('aria-pressed'), await g.getAttribute('aria-label'));
  // Free raise (if any), and drives
  const raise = p.locator('button[title*="from your free points"], button[aria-label*="raise" i]');
  console.log('raise buttons', await raise.count());
  const heads = await p.evaluate(() => [...document.querySelectorAll('h3,h4')].map((h) => h.textContent.trim()).filter((t) => /^[A-D]\./.test(t) || /Gild/.test(t)));
  console.log('step3 headings', JSON.stringify(heads));
  await shot('04_step3_filled');
  const dplus = p.locator('button[aria-label^="Put a point on"]');
  for (let k = 0; k < 6; k++) { for (let i = 0; i < await dplus.count(); i++) { if (await dplus.nth(i).isEnabled()) { await dplus.nth(i).click(); await sleep(80); break; } } }
  const ddis = await p.evaluate(() => [...document.querySelectorAll('button[aria-label^="Put a point on"]')].map((b) => `${b.getAttribute('aria-label')}: disabled=${b.disabled} title=${b.title || '-'}`));
  console.log('drive +', JSON.stringify(ddis));
  const checklist = await p.evaluate(() => document.body.innerText.match(/(raise|Raise)[^\n]{0,80}/g));
  console.log('raise text', JSON.stringify(checklist));
  // Save page body text for step 3 status
  const adv3 = p.getByRole('button', { name: /Advance/ });
  console.log('advance enabled on 3:', await adv3.isEnabled());
  if (!(await adv3.isEnabled())) {
    // try the free raise: the first raise control
    const txt = await p.locator('body').innerText();
    const i = txt.indexOf('A.'); console.log('step 3 A section:', JSON.stringify(txt.slice(i, i + 400)));
  }
  // A: the free raise (first choice), then Advance
  await p.evaluate(() => { const h = [...document.querySelectorAll('h3')].find((e) => /^A\./.test(e.textContent.trim())); let el = h.parentElement; while (el && !el.querySelector('button')) el = el.parentElement; [...el.querySelectorAll('button')].find((x) => x.offsetParent && !x.disabled).click(); });
  await sleep(400);
  console.log('advance enabled on 3 after raise:', await adv3.isEnabled());
  await adv3.scrollIntoViewIfNeeded();
  console.log('scrollY before Advance (3):', await p.evaluate(() => scrollY));
  await adv3.click(); await sleep(1200);
  console.log('step 4 scrollY:', await p.evaluate(() => scrollY), '| focus:', await p.evaluate(() => document.activeElement?.textContent?.slice(0, 40)));
  await shot('05_step4');
  const t4 = await p.locator('body').innerText();
  console.log('SIG present:', /\[SIG\]/i.test(t4), '| signature line:', JSON.stringify(t4.match(/[^\n]*signature gear[^\n]*/i)?.[0]));
  // pick 3 gear items
  const gearBtns = p.locator('button[aria-pressed]');
  console.log('gear-like pressed buttons', await gearBtns.count());
  const sigNames = await p.evaluate(() => { const h = [...document.querySelectorAll('p')].find((e) => /signature gear/i.test(e.textContent)); if (!h) return null; const box = h.nextElementSibling; return box ? [...box.querySelectorAll('button')].map((x) => `${x.getAttribute('aria-label') || ''}|${x.textContent.trim().slice(0, 40)}`) : null; });
  console.log('signature gear buttons', JSON.stringify(sigNames));
  const sig = await p.evaluate(() => { const h = [...document.querySelectorAll('p')].find((e) => /signature gear/i.test(e.textContent)); const box = h?.nextElementSibling; const bs = box ? [...box.querySelectorAll('button')] : []; bs.slice(0, 2).forEach((x) => x.click()); return bs.length; });
  await sleep(300);
  // third gear: any other gear button not yet picked
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button[aria-pressed="false"]')].filter((x) => x.closest('section,div') && /gear/i.test(x.closest('div').parentElement?.textContent || '')); if (bs[0]) bs[0].click(); });
  await sleep(500);
  const sumIdx = (await p.locator('body').innerText());
  const k = sumIdx.indexOf('Your investigator'.toUpperCase()) >= 0 ? sumIdx.indexOf('YOUR INVESTIGATOR') : sumIdx.indexOf('Your investigator');
  console.log('summary:', JSON.stringify(sumIdx.slice(k, k + 1200)));
  const sumH = p.getByRole('heading', { name: 'Your investigator' });
  await sumH.scrollIntoViewIfNeeded();
  await shot('06_summary');
  await p.screenshot({ path: `${L.DIR}/cr_${dev}_07_full.png`, fullPage: true });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
