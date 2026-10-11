const L = require('./r8403_lib');
const { sleep, shot, api, state } = L;
const hubStore = (who) => { const u = state.users[who]; return { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'HOME' }; };
(async () => {
  const b = await L.launch();
  const s = await L.openSeat(b, 'laptop', { store: hubStore('pb') }); await sleep(3500);
  const p = s.page;
  // New campaign with a code that differs from The Drowned Bell's only by case
  await p.getByRole('button', { name: /New campaign|Lightkeeper's pass/i }).first().click(); await sleep(1200);
  await shot(p, 'cc01_newcamp');
  await p.getByLabel('Campaign name').first().fill('The Drowned Bell Two');
  await p.getByLabel('Campaign code').first().fill(state.camps.D.code.toUpperCase());
  await p.getByRole('button', { name: /^(Create|Open|Found|Start)/i }).filter({ visible: true }).first().click(); await sleep(2000);
  console.log('create refusal:', JSON.stringify(await p.locator('[role=alert]').allInnerTexts()));
  await shot(p, 'cc02_refused');
  console.log('campaign rows with that code ignoring case:', L.sql(`select count(*) from campaigns where lower(campaign_code)=lower('${state.camps.D.code}')`));
  // A join with a code that does not exist
  const r = await fetch(L.API + `/campaign/join?character_id=${state.chars.b.id}&code=Drowned-Bel`, { method: 'POST', headers: { Authorization: `Bearer ${state.users.pb.token}`, 'X-Forwarded-For': L.fwdIp() } });
  console.log('join with an unknown code', r.status, (await r.text()).slice(0, 160));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
