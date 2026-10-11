const L=require('./v8455_lib');const fs=require('fs');
(async()=>{
 const stamp=Date.now().toString(36).slice(-5);
 const username='u'+stamp;
 const r=await L.api('POST','/api/auth/register',null,{username,email:username+'@example.com',password:L.PW});
 L.state.users={u:{...r,username}};fs.writeFileSync(L.STATE,JSON.stringify(L.state));
 const b=await L.launch();
 const s=await L.openSeat(b,'phone');const p=s.page;
 await L.signIn(p,'u');
 await L.shot(p,'../verify/out_8455/a_hub');
 console.log(await p.evaluate(()=>document.body.innerText.slice(0,600)));
 await b.close();
})();
