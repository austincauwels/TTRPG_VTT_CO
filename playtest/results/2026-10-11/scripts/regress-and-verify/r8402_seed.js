// seed-id-sequence-collision + login-slip-hugs-right: the first sign-up on a fresh database
const L = require('./r8402_lib');
const { sleep } = L;
(async () => {
  const b = await L.launch();
  // login slip at 1920x1080
  const wide = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const wp = await wide.newPage();
  await wp.goto(L.SITE + '/'); await wp.locator('#username').waitFor();
  await sleep(1500);
  await wp.screenshot({ path: L.DIR + '/login_1920.png' });
  const box = await wp.locator('form').first().evaluate((f) => { let e = f; for (let i = 0; i < 6; i++) e = e.parentElement; const r = f.getBoundingClientRect(); return { left: r.left, right: r.right, w: innerWidth }; });
  console.log('slip form box at 1920', JSON.stringify(box));
  await wide.close();
  // first sign-up at 1440x900
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const resp = [];
  p.on('response', (r) => { if (/\/api\/|\/campaign/.test(r.url())) resp.push(`${r.status()} ${r.request().method()} ${r.url().replace(L.SITE, '')}`); });
  p.on('console', (m) => { if (m.type() === 'error') console.log('console err', m.text()); });
  await p.route(/\/api\/auth\/(login|register)/, (route) => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': L.fwdIp() } }));
  await p.goto(L.SITE + '/'); await p.locator('#username').waitFor();
  await p.getByRole('button', { name: 'Create an account' }).click();
  await p.fill('#username', 'firstkeeper');
  await p.fill('#email', 'firstkeeper@example.com');
  await p.fill('#password', L.PW);
  await p.fill('#confirmPassword', L.PW);
  await p.locator('button[type=submit]').click();
  await sleep(3000);
  await p.screenshot({ path: L.DIR + '/seed_after_signup.png' });
  const alert = await p.locator('[role=alert]').allInnerTexts();
  console.log('alerts after signup', JSON.stringify(alert));
  console.log(resp.join('\n'));
  console.log(L.sql('select id, username from users order by id'));
  // body text
  console.log((await p.locator('body').innerText()).slice(0, 600));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
