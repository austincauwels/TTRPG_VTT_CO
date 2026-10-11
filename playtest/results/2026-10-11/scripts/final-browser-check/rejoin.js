const L = require('./lib'); const { sleep, shot, state, check, sql, api } = L;
const fs = require('fs');
const B = state.chars.bram.id;
(async () => {
  sql(`update characters set resources_spent_assignment=1 where id=${B}`);
  const b = await L.launch();
  // Bram signs in on his phone: hub shows the invite banner
  const ph = await L.openSeat(b, 'phone');
  await L.signIn(ph.page, 'bram');
  const banner = await ph.page.evaluate(() => (document.body.innerText.match(/[^\n]*invites you back[^\n]*/i) || [''])[0]);
  await shot(ph.page, 'j01_hub_invite_banner');
  // open the creator from the banner
  const cbtn = ph.page.getByRole('button', { name: /Create investigator/i }).first();
  let creatorTxt = '';
  if (await cbtn.count()) { await cbtn.tap(); await sleep(2500); creatorTxt = (await ph.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 600); await shot(ph.page, 'j02_creator_from_invite'); }
  console.log('banner', banner, '\ncreator', creatorTxt);
  // forge and rejoin over the API (the creator is driven in the sweep)
  const setup = fs.readFileSync('setup.js', 'utf8');
  const sh = { ...require('./sheet').sheet('Criminal', 'Scout', 'Street Smarts', 'he/him') };
  const lk = await L.desk(b, 'wide', 'lk', null, 'S');
  let nc;
  try { nc = await api('POST', '/api/investigators/forge', state.users.bram.token, { ...sh, name: 'Tobias Crane', user_id: state.users.bram.userId }); }
  catch (e) { console.log('forge err', e.message); }
  const r = await api('POST', '/campaign/rejoin', state.users.bram.token, { campaign_code: state.camps.S.code, character_id: nc.id });
  await sleep(3000);
  const lkLog = (await L.logLines(lk.page)).filter(l => /joined the circle/.test(l));
  const db = sql(`select id, name, status, is_dead, resources_spent_assignment from characters where user_id=${state.users.bram.userId} order by id`);
  await shot(lk.page, 'j03_lk_after_rejoin');
  check('replaced-investigator-leaves-no-record (log line only)', 'join log line names the replaced investigator', lkLog.some(l => /Tobias Crane joined the circle, in place of Bram Okafor/.test(l)), { lkLog, db });
  // Tobias's Circle page: spends 1/2
  state.chars.tobias = { id: nc.id, name: 'Tobias Crane', owner: 'bram', camp: 'S' };
  fs.writeFileSync(L.STATE, JSON.stringify(state, null, 1));
  const tb = await L.desk(b, 'phone', 'bram', 'tobias', 'S');
  await L.goTab(tb.page, 'Circle'); await sleep(1200);
  const spends = await tb.page.evaluate(() => (document.body.innerText.match(/YOUR SPENDS\s*\d\s*\/\s*2/i) || [''])[0]);
  await shot(tb.page, 'j04_tobias_circle');
  check('spend-limit-resets-with-new-investigator', 'new investigator keeps the player\'s spend count', /1\s*\/\s*2/.test(spends), { spends, db });
  console.log('errors', ph.errors, lk.errors, tb.errors);
  L.saveResults('rejoin.json');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
