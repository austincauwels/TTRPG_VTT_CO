const L=require('./v8458_lib');
const dev=process.argv[2]||'wide';
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,dev,{store:st});
  const p=seat.page; await L.sleep(4000);
  if(dev==='wide') await p.setViewportSize({width:1920,height:1080});
  const bea=await L.wsOpen(L.state.chars.b.id,L.state.users.pb.token); await L.sleep(800);
  const burnVisible=()=>p.getByRole('button',{name:/Burn and reroll/}).count();
  const dotInfo=()=>p.evaluate(()=>({dot:!!document.querySelector('[data-new-dot]'),lbls:[...document.querySelectorAll('button[aria-label^="Dice and log"]')].map(x=>x.getAttribute('aria-label'))}));
  let got=false;
  for(let i=0;i<20&&!got;i++){
    await p.locator('button[aria-label^="Roll Sense"]').first().click({force:true});
    await L.sleep(2500); got=(await burnVisible())>0;
  }
  console.log('burn offered',got, JSON.stringify(await dotInfo()));
  bea.send('roll',{action:'hide',drive_spent:0,is_secret:false,ability_mods:[],roll_id:'y'+Date.now()});
  await L.sleep(2500);
  console.log('after bea gilded roll (held): burn visible',await burnVisible(), JSON.stringify(await dotInfo()), 'bea frames',bea.frames.map(f=>f.type).join(','));
  await p.screenshot({path:`out_8458/d_${dev}_1.png`});
  if((await burnVisible())>0){ await p.getByRole('button',{name:/Burn and reroll/}).click(); await L.sleep(2500);
    await p.screenshot({path:`out_8458/d_${dev}_2.png`});
    console.log((await p.locator('body').innerText()).split('\n').filter(l=>/burn|rolled|alert|cannot|settled|table/i.test(l)).slice(-8));
    console.log(JSON.stringify(await dotInfo())); }
  bea.close(); await b.close();
})();
