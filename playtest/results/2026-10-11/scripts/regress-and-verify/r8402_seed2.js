// seed-id: the first campaign's desk on a fresh database
const L = require('./r8402_lib');
const { sleep } = L;
(async () => {
  const b = await L.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const resp = [];
  p.on('response', (r) => { if (/\/api\/|\/campaign/.test(r.url())) resp.push(`${r.status()} ${r.request().method()} ${r.url().replace(L.SITE, '')}`); });
  const wsl = [];
  p.on('websocket', (ws) => { wsl.push(`open ${ws.url()}`); ws.on('close', () => wsl.push(`close ${Date.now()}`)); });
  await p.route(/\/api\/auth\/(login|register)/, (route) => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': L.fwdIp() } }));
  await p.goto(L.SITE + '/'); await p.locator('#username').waitFor();
  await p.fill('#username', 'firstkeeper'); await p.fill('#password', L.PW);
  await p.locator('button[type=submit]').click();
  await p.locator('.hub-tomes').waitFor();
  await sleep(1000);
  await p.getByText('New campaign', { exact: false }).first().click();
  await sleep(1500);
  await p.screenshot({ path: L.DIR + '/seed_newcamp_form.png' });
  const nameInput = p.locator('input[id$="-name"]').first();
  await nameInput.fill('First Light'); await p.locator('input[id$="-code"]').first().fill('first-light');
  await p.getByRole('button', { name: /Create campaign/ }).first().click();
  // watch the desk for 6 s for a dropped line
  const seen = [];
  for (let i = 0; i < 24; i++) {
    const t = await p.locator('body').innerText();
    if (/dropped|reconnect|Something went wrong/i.test(t)) seen.push(`${i * 250}ms: ${t.match(/.{0,60}(dropped|reconnect|Something went wrong).{0,60}/i)[0]}`);
    if (i === 4) await p.screenshot({ path: L.DIR + '/seed_desk_1s.png' });
    await sleep(250);
  }
  await p.screenshot({ path: L.DIR + '/seed_desk_6s.png' });
  console.log('dropped lines seen:', JSON.stringify(seen));
  console.log(resp.join('\n')); console.log(wsl.join('\n'));
  console.log(L.sql('select id, name from circles order by id'));
  console.log(L.sql('select id, name, code from campaigns order by id'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
