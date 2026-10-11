const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'wide',{store:st});
  const p=seat.page; await L.sleep(4000);
  await p.setViewportSize({width:1920,height:1080});
  await p.screenshot({path:'out_8458/a1.png'});
  const chips=await p.$$eval('.mod-chip',e=>e.map(x=>x.getAttribute('aria-label')+' | '+x.innerText));
  console.log(chips);
  await b.close();
})();
