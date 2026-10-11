const L = require('./c8460/lib'); const { sleep, shot, state } = L;
(async () => {
  const b = await L.launch();
  const store = await L.storeFor('lk',null,'S');
  const s = await L.openSeat(b,'wide',{store}); const p = s.page; await sleep(4500);
  await p.getByRole('button',{name:'Notebook',exact:true}).first().click(); await sleep(1500);
  await p.getByRole('button',{name:/^Lightkeeper Resources/}).first().click(); await sleep(800);
  console.log('tab labels', await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>/Resources/i.test(t))));
  const ta = p.getByRole('textbox',{name:'Lightkeeper notes'}); await ta.click(); await ta.type('Line one\nLine two\nLine three'); await sleep(2500);
  console.log('tab labels after', await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>/Resources/i.test(t))));
  console.log(await ta.evaluate(e=>{const r=e.getBoundingClientRect(), pr=e.parentElement.getBoundingClientRect(), gp=e.parentElement.parentElement.getBoundingClientRect(); const cs=getComputedStyle(e); return {taLeft:r.left,parentLeft:pr.left,boxLeft:gp.left,padL:getComputedStyle(e.parentElement).paddingLeft,lh:cs.lineHeight,fs:cs.fontSize,ff:cs.fontFamily,padTA:cs.paddingLeft}}));
  await shot(p,'res_typed');
  await b.close();
})();
