const L=require('./v8455_lib');
(async()=>{
 const b=await L.launch();
 const s=await L.openSeat(b,'phone');const p=s.page;
 await L.signIn(p,'u');
 await p.getByRole('button',{name:/Case Ledger/}).first().click();await L.sleep(800);
 await p.getByText('+ New investigator').first().click();await L.sleep(1200);
 const dump=async(t)=>console.log(t,await p.evaluate(()=>[...document.querySelectorAll('button,input,select,textarea')].filter(e=>e.offsetParent!==null||e.type==='file').map(e=>(e.tagName+':'+(e.getAttribute('aria-label')||e.innerText||e.id||'')).replace(/\s+/g,' ').slice(0,40)).join(' | ')));
 await dump('step1');
 await p.screenshot({path:'out_8455/c_s1.png',fullPage:true});
 b.p=p; module.exports=null;
 await b.close();
})();
