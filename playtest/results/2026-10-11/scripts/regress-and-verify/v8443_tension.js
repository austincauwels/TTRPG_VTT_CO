const L = require('./v8443_lib'); const { sleep, shot } = L;
(async () => { const b = await L.launch(); const out = {};
  const s = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') }); await sleep(5000);
  const p = s.page;
  const btns = async () => p.getByRole('button').evaluateAll(a => a.filter(x => x.getBoundingClientRect().width > 0).map(x => (x.getAttribute('aria-label') || x.innerText).trim()).filter(Boolean));
  out.rosterTension = (await btns()).filter(t => /tension/i.test(t));
  await p.getByRole('button', { name: /Open Bram Holt's investigator sheet/ }).click(); await sleep(2000);
  await shot(p, 't01_sheet');
  const all = await btns(); out.sheetBtns = all; out.sheetTension = all.filter(t => /tension|hourglass/i.test(t));
  out.anyTensionInDom = await p.evaluate(() => [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).filter(t => /tension/i.test(t)));
  out.strip = await p.locator('[data-desk=table-strip]').first().innerText().catch(() => null);
  // keyboard? try finding any +/- in strip
  out.stripButtons = await p.locator('[data-desk=table-strip] button').count();
  for (const sec of ['Circle', 'Notebook']) { await p.getByRole('button', { name: new RegExp(`^${sec}`, 'i') }).first().click(); await sleep(1200); await shot(p, `t02_${sec}`); out[sec] = (await btns()).filter(t => /tension/i.test(t)); }
  await p.getByRole('button', { name: /^Roster/i }).first().click(); await sleep(1500); await shot(p, 't03_roster_back');
  out.backToRosterShowsSheet = await p.getByText(/Bram Holt/).count();
  out.rosterAfterBack = (await btns()).filter(t => /tension|Back|roster/i.test(t));
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
