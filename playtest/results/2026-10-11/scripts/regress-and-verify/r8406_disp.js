const L = require('./r8406_lib'); const { sleep, shot } = L;
(async () => { const b = await L.launch(); const out = {};
  const s = await L.openSeat(b, 'phone', { store: await L.storeFor('fd', 'fd', 'F') }); await sleep(5000);
  await shot(s.page, 'i01_phone_desk');
  const btns = await s.page.getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.innerText).trim()).filter(Boolean).slice(0, 25));
  out.btns = btns;
  const menu = s.page.getByRole('button', { name: /Menu/i }).first();
  if (await menu.count()) { await menu.click(); await sleep(800); await shot(s.page, 'i02_phone_menu');
    const d = s.page.getByRole('button', { name: /Dispatch|From the Lightkeeper/i }).first();
    if (await d.count()) { await d.click(); await sleep(1000); } }
  out.dispatchText = await s.page.evaluate(() => { const el = [...document.querySelectorAll('*')].find(e => /^From the Lightkeeper/i.test(e.innerText || '') && e.children.length > 0 && e.getBoundingClientRect().width > 0); return el ? el.closest('div')?.innerText : null; });
  await shot(s.page, 'i03_phone_dispatch');
  
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
