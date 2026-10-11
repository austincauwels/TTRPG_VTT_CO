const fs = require('fs');
const L = require('./v8458_lib');
const { api, sql } = L;
const base = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?' };
const FACE = { role:'Face', specialty:'Journalist', role_ability:'Sweet Talk', specialty_ability:'Open Book',
  move:1,strike:0,control:1,hide:1,sneak:1,sway:1,survey:2,read:1,sense:1, gilded_survey:true, gilded_read:true,
  nerve_max:3,nerve_current:3,cunning_max:3,cunning_current:3,intuition_max:3,intuition_current:3, gear:['Lantern']};
const DET = { role:'Slink', specialty:'Detective', role_ability:'Death Defy', specialty_ability:'Interrogation',
  move:1,strike:0,control:2,hide:2,sneak:0,sway:0,survey:2,read:2,sense:0, gilded_control:true,gilded_hide:true,
  nerve_max:3,nerve_current:3,cunning_max:3,cunning_current:3,intuition_max:3,intuition_current:3, gear:['Lantern']};
const MED = { role:'Weird', specialty:'Medium', role_ability:'Ritual', specialty_ability:'Commune',
  move:1,strike:0,control:1,hide:0,sneak:2,sway:0,survey:1,read:2,sense:2, gilded_sense:true,gilded_read:true,
  nerve_max:3,nerve_current:3,cunning_max:3,cunning_current:3,intuition_max:3,intuition_current:3, gear:['Lantern']};
(async()=>{
  const stamp=Date.now().toString(36).slice(-4); const users={};
  for (const k of ['lk','pa','pb','pc']) { const username=`${k}v${stamp}`; const r=await api('POST','/api/auth/register',null,{username,email:`${username}@example.com`,password:L.PW}); users[k]={...r,username}; }
  const code=`sv-${stamp}`; const c=await api('POST',`/campaign/create?name=${encodeURIComponent('Verify Hours')}&code=${code}`,users.lk.token);
  const camp={id:c.id??c.campaign?.id??c.campaign_id,code,name:'Verify Hours',lk:'lk'};
  const chars={};
  const forge=async(key,owner,name,kind)=>{const ch=await api('POST','/api/investigators/forge',users[owner].token,{...base,name,...kind,user_id:users[owner].userId});
    await api('POST',`/campaign/join?character_id=${ch.id}&code=${code}`,users[owner].token);
    await api('POST',`/campaign/approve/${ch.id}`,users.lk.token); chars[key]={id:ch.id,name,owner};};
  await forge('a','pa','Ada Face',FACE); await forge('b','pb','Bea Det',DET); await forge('c','pc','Cyd Medium',MED);
  const st=await api('GET',`/campaign/${camp.id}/circle-creation-state`,users.lk.token); camp.circleId=st.circle_id;
  sql(`update characters set sneak=2 where id=${chars.b.id}`);
  sql(`update characters set cunning_max=6,cunning_current=6,intuition_max=6,intuition_current=6 where id in (${chars.a.id},${chars.b.id},${chars.c.id})`);
  sql(`update circles set is_finalized=true, name='The Watch' where id=${camp.circleId}`);
  sql(`update campaigns set roster_finalized=true where id=${camp.id}`);
  fs.writeFileSync(L.STATE, JSON.stringify({stamp,users,camps:{S:camp},chars},null,1)); console.log(JSON.stringify({camp,chars}));
})().catch(e=>{console.error(e);process.exit(1)});
