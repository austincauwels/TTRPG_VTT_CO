const L = require('./v8442_lib');
const { sleep, shot, state } = L;
(async () => {
  const browser = await L.launch();
  const gm = await L.openSeat(browser, 'wide', { store: await L.storeFor('lk', null, 'J') });
  await sleep(4000);
  for (let i = 0; i < 3; i++) {
    const card = await gm.page.getByText(/JOIN REQUESTS/i).first().locator('xpath=ancestor::*[3]').innerText().catch(() => '');
    const names = ['Tess Arden', 'Wren Hale', 'Dev Marsh'].filter((n) => card.includes(n));
    console.log('page', i + 1, names, 'contains a username?', Object.values(state.users).some((u) => card.includes(u.username)));
    await gm.page.locator('section, div').filter({ hasText: /JOIN REQUESTS/i }).first().screenshot({ path: `${L.DIR}/out_8442/join_04_page${i + 1}.png` }).catch(() => {});
    await gm.page.getByRole('button', { name: /next request|›/i }).first().click().catch(async () => { await gm.page.getByText('›').first().click(); });
    await sleep(700);
  }
  await browser.close();
  // Approve both of cass's requests: does anything stop one player having two investigators in one campaign?
  const lk = state.users.lk.token;
  for (const k of ['tess', 'wren']) {
    try { const r = await L.api('POST', `/campaign/approve/${state.chars[k].id}`, lk); console.log('approve', k, r.success ?? r); } catch (e) { console.log('approve', k, e.message); }
  }
  console.log(L.sql(`select c.name, c.status, u.username from characters c join users u on u.id=c.user_id where c.campaign_id=${state.camps.J.id} order by c.id`));
})().catch((e) => { console.error(e); process.exit(1); });
