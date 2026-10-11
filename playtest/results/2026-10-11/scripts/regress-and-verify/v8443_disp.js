const L = require('./v8443_lib'); const { sleep, shot } = L;
(async () => { const b = await L.launch(); const out = {};
  const s = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') }); await sleep(5000);
  const p = s.page;
  await shot(p, 'd01_desk');
  out.navs = await p.getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.innerText).trim()).filter(Boolean).slice(0, 40));
  const loc = p.getByLabel(/Location/i).first();
  const txt = p.getByLabel(/Your dispatch/i).first();
  out.locCount = await loc.count(); out.txtCount = await txt.count();
  await loc.fill('The old mill'); await txt.fill('Meet at dusk by the waterwheel.');
  await sleep(500); await shot(p, 'd02_typed');
  for (const sec of ['Map', 'Roster']) { await p.getByRole('button', { name: new RegExp(`^${sec}`) }).first().click(); await sleep(1200); await shot(p, `d03_${sec}`); }
  out.afterMap = { loc: await p.getByLabel(/Location/i).first().inputValue().catch(e=>'ERR '+e.message), txt: await p.getByLabel(/Your dispatch/i).first().inputValue().catch(e=>'ERR '+e.message) };
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
