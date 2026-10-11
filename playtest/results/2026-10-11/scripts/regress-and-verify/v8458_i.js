const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'wide',{store:st});
  const p=seat.page; await L.sleep(4500); await p.setViewportSize({width:1920,height:1080});
  console.log(await p.$$eval('.mod-chip',e=>e.map(x=>x.getAttribute('aria-label'))));
  await p.screenshot({path:'out_8458/i_0.png'});
  console.log('doc scroll', await p.evaluate(()=>[document.documentElement.scrollHeight,innerHeight]));
  await b.close();
})();
