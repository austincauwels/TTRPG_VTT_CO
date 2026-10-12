const L = require('./v8405_lib');
const { api, state, sleep, shot } = L;
const NEWPW = ['Passw0rd-v8405-two', 'Passw0rd-v8405-three'];
const visibleText = (page) => page.evaluate(() => {
  const st = [...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map((e) => `${e.getAttribute('role') || 'live'}:${JSON.stringify(e.textContent.trim())}`);
  return { url: location.href, user: document.querySelector('#username')?.value ?? null, statuses: st, body: document.body.innerText.slice(0, 600) };
});
(async () => {
  const b = await L.launch();
  const u = state.users.pa;
  const seat = await L.openSeat(b, 'wide');
  const { page } = seat;
  const net = [];
  page.on('response', (r) => { if (r.status() === 401) net.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  // A: signed in on the hub; the password is changed on another device
  await L.signIn(page, 'pa');
  await shot(page, 'v8405_a1_hub');
  const other = await api('POST', '/api/auth/login', null, { username: u.username, password: L.PW });
  await api('POST', '/api/auth/me/password', other.token, { password: L.PW, new_password: NEWPW[0] });
  console.log('A: password changed from another device');
  await page.getByRole('button', { name: /Case Ledger/ }).first().click();
  await sleep(1500);
  await shot(page, 'v8405_a2_after_ledger');
  console.log('A after ledger', JSON.stringify(await visibleText(page)));
  // try to open the desk from the ledger
  try { await page.getByRole('button', { name: /Iris Vane/ }).first().click({ timeout: 4000 }); } catch (e) { console.log('A no Iris button', e.message.split('\n')[0]); }
  await sleep(2500);
  await shot(page, 'v8405_a3_after_play');
  console.log('A after play', JSON.stringify(await visibleText(page)));
  console.log('A 401s', net);

  // B: signed in, desk open; the password is changed on another device -> socket 4401
  net.length = 0;
  if (await page.locator('#username').count()) {
    await page.fill('#username', u.username); await page.fill('#password', NEWPW[0]);
    await page.locator('button[type=submit]', { hasText: /^Sign in$/ }).click();
    await page.locator('.hub-tomes').waitFor();
    await sleep(1000);
  }
  await L.openFromLedger(page, 'Iris Vane', 3500);
  await shot(page, 'v8405_b1_desk');
  const other2 = await api('POST', '/api/auth/login', null, { username: u.username, password: NEWPW[0] });
  await api('POST', '/api/auth/me/password', other2.token, { password: NEWPW[0], new_password: NEWPW[1] });
  console.log('B: password changed from another device');
  await sleep(2500);
  await shot(page, 'v8405_b2_after_4401');
  console.log('B after', JSON.stringify(await visibleText(page)));
  console.log('B closes', seat.frames.filter((f) => f.dir === 'close').map((f) => f.msg));
  console.log('B 401s', net);
  console.log('errors', seat.errors.slice(0, 5));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
