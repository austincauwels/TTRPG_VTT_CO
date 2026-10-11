// Who hears a Lightkeeper's revive: the player's own channel?
const L = require('./v8441_lib');
const { sleep, sql, state } = L;
(async () => {
  const B = state.chars.bram.id;
  L.resetChar(B, { scars_count: 1, scars_list: `'["a"]'`, incapacitated: true });
  const p = await L.wsOpen(B, state.users.bram.token);
  const s = await L.wsOpen(state.camps.S.code, state.users.lk.token);
  await sleep(1000);
  p.frames.length = 0; s.frames.length = 0;
  s.send('revive_character', { character_id: B });
  await sleep(1500);
  console.log('DB:', sql(`select incapacitated from characters where id=${B}`));
  console.log('player frames:', JSON.stringify(p.frames.map((f) => f.type + (f.type === 'character_update' ? ':incap=' + f.payload.incapacitated : ''))));
  console.log('gm frames:', JSON.stringify(s.frames.map((f) => f.type + (f.payload && 'incapacitated' in f.payload ? ':incap=' + f.payload.incapacitated + ':id=' + f.payload.id : ''))));
  p.close(); s.close();
})().catch((e) => { console.error(e); process.exit(1); });
