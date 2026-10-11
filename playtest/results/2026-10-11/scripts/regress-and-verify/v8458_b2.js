const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'wide',{store:st});
  const p=seat.page; await L.sleep(4000);
  await p.setViewportSize({width:1920,height:1080});
  await p.locator('button[aria-label^="Roll Survey"]').click({force:true});
  await L.sleep(2500);
  console.log(await p.$$eval('[data-keep-die]',e=>e.map(x=>x.getAttribute('aria-label'))));
  const g=p.locator('[data-keep-die]').first(); await g.focus(); await p.keyboard.press('Enter');
  await L.sleep(2500);
  await p.screenshot({path:'out_8458/b2.png'});
  const t=await p.locator('body').innerText(); console.log(t.split('\n').filter(l=>/Intuition|gilded|kept|refresh/i.test(l)));
  console.log(await p.getByLabel(/Intuition/i).first().innerText().catch(()=>''));
  console.log(L.sql(`select intuition_current,intuition_max from characters where id=${L.state.chars.a.id}`));
  // reload and look at tray
  await p.reload(); await L.sleep(4000);
  await p.screenshot({path:'out_8458/b3_reload.png'});
  console.log((await p.locator('body').innerText()).split('\n').filter(l=>/No dice|Survey|rolled/i.test(l)));
  await b.close();
})();
