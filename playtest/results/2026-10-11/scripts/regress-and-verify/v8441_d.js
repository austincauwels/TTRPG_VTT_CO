// The server takes a Lightkeeper's revive_character aimed at a member
const L = require('./v8441_lib');
const { sleep, sql, state } = L;
(async () => {
  const B = state.chars.bram.id;
  L.resetChar(B, { scars_count: 1, scars_list: `'["a"]'`, incapacitated: true });
  const s = await L.wsOpen(state.camps.S.code, state.users.lk.token);
  await sleep(800);
  s.send('revive_character', { character_id: B });
  await sleep(1500);
  console.log('after GM revive:', sql(`select incapacitated,is_dead from characters where id=${B}`));
  console.log(JSON.stringify(s.frames.filter((f) => /activity_log|rejected/.test(f.type)).map((f) => f.type + ':' + (f.payload.message || f.payload.detail))));
  s.close();
})().catch((e) => { console.error(e); process.exit(1); });
