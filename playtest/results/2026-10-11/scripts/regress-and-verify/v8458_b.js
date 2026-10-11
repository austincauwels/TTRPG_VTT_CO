const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'wide',{store:st});
  const p=seat.page; await L.sleep(4000);
  await p.setViewportSize({width:1920,height:1080});
  await p.locator('button[aria-label^="Roll Survey"]').click({force:true});
  await L.sleep(3000);
  await p.screenshot({path:'out_8458/b1.png'});
  const t=await p.locator('body').innerText(); console.log(t.split('\n').filter(l=>/keep|choice|back|pend|dice/i.test(l)));
  console.log(await p.$$eval('button',e=>e.filter(x=>/Keep|keep|Burn|choice/i.test((x.getAttribute('aria-label')||'')+x.innerText)).map(x=>x.getAttribute('aria-label')+' | '+x.innerText)));
  await b.close();
})();
