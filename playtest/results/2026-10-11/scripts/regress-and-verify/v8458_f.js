const L=require('./v8458_lib');
(async()=>{
  const b=await L.launch();
  const st=await L.storeFor('pa','a','S');
  const seat=await L.openSeat(b,'laptop',{store:st});
  const p=seat.page; await L.sleep(4000);
  for(let i=0;i<20;i++){
    await p.locator('button[aria-label^="Roll Sense"]').first().focus(); await p.keyboard.press('Enter'); await L.sleep(2200);
    const n=await p.getByRole('button',{name:/Burn and reroll/}).count(); if(n){ break; }
  }
  const act=()=>p.evaluate(()=>{const e=document.activeElement;return (e.getAttribute('aria-label')||e.innerText||e.tagName).slice(0,60)});
  console.log('focus after roll:',await act());
  for(let i=0;i<4;i++){ await p.keyboard.press('Tab'); console.log('tab',i,await act()); }
  await b.close();
})();
