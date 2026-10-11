const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'phone',{store:st});
  const p=seat.page; await L.sleep(4000);
  const bea=await L.wsOpen(L.state.chars.b.id,L.state.users.pb.token); await L.sleep(800);
  const dot=()=>p.evaluate(()=>({dot:!!document.querySelector('[data-new-dot]'),lbls:[...document.querySelectorAll('button[aria-label^="Dice and log"]')].map(x=>x.getAttribute('aria-label')),burn:[...document.querySelectorAll('button')].filter(x=>/Burn and reroll/.test(x.innerText)).length,bar:!!document.querySelector('[data-roll-bar]')}));
  await p.screenshot({path:'out_8458/e_0.png'});
  let got=false;
  for(let i=0;i<20&&!got;i++){
    await p.locator('button[aria-label^="Roll Sense"]').first().tap();
    await L.sleep(1500);
    const d=await dot(); console.log(i,JSON.stringify(d)); await p.screenshot({path:'out_8458/e_roll'+i+'.png'});
    if(d.burn>0||d.dot){ got=true; }
  }
  await L.sleep(9000);
  console.log('after fade',JSON.stringify(await dot())); await p.screenshot({path:'out_8458/e_fade.png'});
  bea.send('roll',{action:'sense',drive_spent:0,is_secret:false,ability_mods:[],roll_id:'z'+Date.now()});
  await L.sleep(2500);
  console.log('after bea',JSON.stringify(await dot())); await p.screenshot({path:'out_8458/e_bea.png'});
  bea.close(); await b.close();
})();
