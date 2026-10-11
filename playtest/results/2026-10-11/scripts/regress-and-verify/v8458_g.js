const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'wide',{store:st});
  const p=seat.page; await L.sleep(4000); await p.setViewportSize({width:1920,height:1080});
  await p.locator('.mod-chip',{hasText:'Open Book'}).click();
  console.log('pressed',await p.locator('.mod-chip',{hasText:'Open Book'}).getAttribute('aria-pressed'));
  await p.screenshot({path:'out_8458/g_0.png'});
  await p.locator('button[aria-label^="Roll Sway"]').click({force:true}); await L.sleep(2500);
  console.log('pressed after',await p.locator('.mod-chip',{hasText:'Open Book'}).getAttribute('aria-pressed'));
  const t=(await p.locator('body').innerText()).split('\n').filter(l=>/Sway|Open Book|After the roll|Burn|dice/i.test(l)); console.log(t);
  await p.screenshot({path:'out_8458/g_1.png'});
  if(await p.getByRole('button',{name:/Burn and reroll/}).count()){ await p.getByRole('button',{name:/Burn and reroll/}).click(); await L.sleep(2500);
    console.log((await p.locator('body').innerText()).split('\n').filter(l=>/Sway|Open Book|dice/i.test(l)));
    await p.screenshot({path:'out_8458/g_2.png'});}
  await b.close();
})();
