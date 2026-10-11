const L = require('./r8403_lib');
const { api, state } = L;
(async () => {
  const S = state.camps.S;
  const lk = state.users.lk.token, pa = state.users.pa.token;
  // Lightkeeper notes and private notes, so the campaign counter runs ahead
  for (let i = 1; i <= 3; i++) await api('POST', `/api/notebook/${S.id}/entries`, lk, { title: `LK secret ${i}`, content: 'hidden', author_name: 'x', author_type: 'gm', entry_type: 'field_log', visibility: 'gm_only' });
  await api('POST', `/api/notebook/${S.id}/entries`, pa, { title: 'Private Note', content: 'mine', author_name: 'x', author_type: 'player', character_id: state.chars.a.id, entry_type: 'ephemeral', visibility: 'self' });
  const r = await api('GET', `/api/notebook/${S.id}/entries?role=GM`, lk);
  console.log(r.map(e => [e.id, e.title, e.page_number, e.visibility]));
})().catch(e => { console.error(e); process.exit(1); });
