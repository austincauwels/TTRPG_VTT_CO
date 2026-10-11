const L = require('./c8460/lib'); const { sleep, shot, state } = L;
(async () => {
  const b = await L.launch();
  const store = await L.storeFor('fi','fi','F');
  const s = await L.openSeat(b,'tablet',{store}); const p = s.page; await sleep(5000);
  await shot(p,'rel_0');
  const dump = async (tag) => console.log(tag, await p.evaluate(()=>[...document.querySelectorAll('select,textarea')].map(e=>e.tagName+':'+(e.getAttribute('aria-label')||e.id)+':'+(e.offsetParent?'vis':'hid'))));
  await dump('start');
  const c = p.getByRole('button',{name:/^Counter /}); console.log('counter btns', await c.count());
  if (await c.count()) { await c.first().click(); await sleep(500); await dump('counter open'); }
  const pr = p.getByRole('button',{name:/Propose a relationship/}); console.log('propose btns', await pr.count());
  await shot(p,'rel_1', {fullPage:true});
  await b.close();
})();
