const L = require('./r8403_lib');
(async () => {
  const b = await L.launch();
  const p = await (await b.newContext()).newPage();
  try { const r = await p.goto('https://fonts.googleapis.com/css2?family=Moon+Dance', { timeout: 15000 }); console.log('status', r.status()); } catch (e) { console.log('ERR', e.message.slice(0, 200)); }
  await b.close();
})();
