const L = require('./v8402_lib');
(async () => {
  const c = await L.wsOpen(L.state.camps.S.code, L.state.users.lk.token);
  await L.sleep(2500);
  const seen = [];
  const walk = (o, path) => { if (o && typeof o === 'object') { if ('nerve_max' in o && o.name) seen.push(`${path}: ${o.name} status=${o.status} nerve ${o.nerve_current}/${o.nerve_max}`); for (const [k, v] of Object.entries(o)) walk(v, path + '.' + k); } };
  c.frames.forEach((f, i) => walk(f, `${i}:${f.type}`));
  console.log(seen.join('\n'));
  c.close(); process.exit(0);
})();
