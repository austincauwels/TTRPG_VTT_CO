const L = require('./v8442_lib');
const { state } = L;
(async () => {
  const lk = state.users.lk.token;
  for (const k of ['tess', 'wren']) {
    try { const r = await L.api('POST', `/campaign/approve/${state.chars[k].id}`, lk); console.log('approve', k, r.success ?? Object.keys(r)); } catch (e) { console.log('approve', k, e.message); }
  }
  console.log(L.sql(`select c.name, c.status, u.username from characters c join users u on u.id=c.user_id where c.campaign_id=${state.camps.J.id} order by c.id`));
})();
