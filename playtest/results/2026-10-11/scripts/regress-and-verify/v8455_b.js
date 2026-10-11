const L=require('./v8455_lib');
(async()=>{
 const b=await L.launch();
 const s=await L.openSeat(b,'phone');await s.page.setViewportSize({width:390,height:705});const p=s.page;
 await L.signIn(p,'u');
 await p.getByRole('button',{name:/Case Ledger/}).first().click();await L.sleep(800);
 await p.getByText('+ New investigator').first().click().catch(async e=>{console.log('no',e.message); console.log(await p.evaluate(()=>document.body.innerText.slice(0,500)))});
 await L.sleep(1500);
 await p.screenshot({path:'out_8455/b_cc705.png'});
 const r=await p.evaluate(()=>{const n=document.querySelector('[aria-label="Next card"]');const rc=n.getBoundingClientRect();
  const fixed=[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).position==='fixed'||getComputedStyle(e).position==='sticky').map(e=>[e.tagName,e.className.slice(0,40),Math.round(e.getBoundingClientRect().top),Math.round(e.getBoundingClientRect().height)]);
  return {next:[rc.top,rc.bottom],sy:scrollY,fixed,vh:innerHeight}});
 console.log(JSON.stringify(r));
 await b.close();
})();
