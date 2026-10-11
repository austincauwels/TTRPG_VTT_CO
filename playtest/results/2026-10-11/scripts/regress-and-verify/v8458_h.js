const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pc','c','S');
  const seat=await L.openSeat(b,'tablet',{store:st});
  const p=seat.page; await L.sleep(4000);
  await p.getByRole('tab',{name:/Specialty ability/i}).click().catch(async()=>{await p.getByText(/Specialty ability/i).first().click()});
  await L.sleep(800);
  await p.screenshot({path:'out_8458/h_0.png'});
  const btn=p.getByRole('button',{name:/^Use/}).first(); console.log(await btn.getAttribute('aria-label'), await btn.innerText());
  await btn.click(); await L.sleep(2500);
  await p.screenshot({path:'out_8458/h_1.png'});
  console.log((await p.locator('body').innerText()).split('\n').filter(l=>/Commune|Sense|Brain/i.test(l)));
  console.log('chips',await p.$$eval('.mod-chip',e=>e.map(x=>x.getAttribute('aria-label'))));
  await b.close();
})();
