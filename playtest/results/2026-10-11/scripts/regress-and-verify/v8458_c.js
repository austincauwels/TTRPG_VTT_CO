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
    L.sql(`update characters set intuition_resistance_spent=0 where id=${L.state.chars.a.id}`);
    if(dev!=='wide'){ await p.getByRole('button',{name:/Dice and log/}).first().click().catch(()=>{}); }
    const row=p.locator('button[aria-label^="Roll Sense"]');
    if(dev!=='wide'){ // go to investigator part
      await p.getByRole('button',{name:/Menu|drawer/i}).first().click().catch(()=>{});
    }
    await row.first().click({force:true}).catch(e=>console.log('click fail',e.message.slice(0,80)));
    await L.sleep(2500);
    got=(await burnVisible())>0; if(!got) console.log('roll',i,'no burn');
  }
  console.log('burn offered',got, JSON.stringify(await dotInfo()));
  await p.screenshot({path:`out_8458/c_${dev}_1.png`});
  const t0=Date.now();
  bea.send('roll',{action:'sense',drive_spent:0,is_secret:false,ability_mods:[],roll_id:'x'+Date.now()});
  await L.sleep(2500);
  console.log('after bea roll: burn visible',await burnVisible(), JSON.stringify(await dotInfo()));
  await p.screenshot({path:`out_8458/c_${dev}_2.png`});
  const txt=await p.locator('body').innerText(); console.log(txt.split('\n').filter(l=>/after the roll|burn|rolled/i.test(l)));
  bea.close(); await b.close();
})();
