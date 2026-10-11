const L=require('./v8455_lib');
const dev=process.argv[2]||'phone', spec=process.argv[3]||'Professor', nm=process.argv[4]||'Cass *Moreau* [Inspector](x) 🕯️';
(async()=>{
 const b=await L.launch();
 const s=await L.openSeat(b,dev);const p=s.page;
 await L.signIn(p,'u');
 await p.getByRole('button',{name:/Case Ledger/}).first().click();await L.sleep(800);
 await p.getByText('+ New investigator').first().click();await L.sleep(1200);
 for(let i=0;i<10;i++){ const t=await p.evaluate(()=>document.body.innerText); if(new RegExp('^'+spec,'m').test(t.split('\n').slice(0,200).join('\n'))&&/\n(.*)\n/.test(t)){ const card=await p.locator('h3,h2,div').filter({hasText:new RegExp('^'+spec+'$')}).count(); if(card) break;} await p.getByRole('button',{name:'Next card'}).click(); await L.sleep(800);}
 await p.screenshot({path:'out_8455/d_s1.png'});
 const btns0=await p.evaluate(()=>[...document.querySelectorAll('button')].map(e=>e.innerText.replace(/\s+/g,' ').slice(0,60)));

 await p.locator('button').filter({hasText:'Steel Mind'}).first().click();
 await p.locator('button').filter({hasText:'Well-Read'}).first().click();
 await L.sleep(300);
 await p.getByRole('button',{name:/SELECT THIS PATH/i}).click();await L.sleep(1200);
 await p.screenshot({path:'out_8455/d_s2.png',fullPage:true});
 console.log(await p.evaluate(()=>[...document.querySelectorAll('button,input,select,textarea,label')].map(e=>(e.tagName+(e.type?'['+e.type+']':'')+':'+(e.getAttribute('aria-label')||e.innerText||e.id||'')).replace(/\s+/g,' ').slice(0,40)).join(' | ')));
 await p.fill('#creator-name',nm);
 await p.fill('#creator-pronouns','');
 await p.fill('#creator-style','Tidy');await p.fill('#creator-catalyst','A fire');await p.fill('#creator-question','Why?');
 await p.getByRole('button',{name:/ADVANCE/i}).click();await L.sleep(1000);
 await p.screenshot({path:'out_8455/d_s3.png',fullPage:true});
 console.log(await p.evaluate(()=>document.body.innerText.replace(/\n+/g,' / ').slice(0,1800)));
 const ph=await p.locator('#creator-portrait').evaluate(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,getComputedStyle(e).position]});console.log('portrait input',ph);
 await b.close();
})();
