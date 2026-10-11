// Pool edit log line, give back at the cap, the player's count after a give back; empty
// desk states; long name on the polaroid, sheet header and dice slip.
const fs = require('fs');
const L = require('./r8404_lib');
const { sql, sleep, shot, state, api } = L;
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); };
const logLines = (page, n = 6) => page.evaluate((n) => [...document.querySelectorAll('[data-desk=log] p')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-n), n);

(async () => {
  const b = await L.launch();
  const cid = state.camps.S.circleId;
  sql(`update circles set resources_editable=true, stitch=3, refresh=3, train=2 where id=${cid}`);
  sql(`update characters set resources_spent_assignment=1 where id=${state.chars.a.id}`);
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const iris = await L.openSeat(b, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(5000);
  const P = lk.page;
  // Pool edit on the Circle page
  await P.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  await P.locator('[role=button][aria-label="Train: set available to 3"]').first().click(); await sleep(1500);
  await P.locator('[role=button][aria-label^="Train: take one back"]').first().click(); await sleep(1500);
  log('C01 iris log after LK pool edits', await logLines(iris.page, 2));
  log('C01 lk strip', await P.evaluate(() => [...document.querySelectorAll('[data-desk=table-strip]')].map((e) => e.innerText.replace(/\s+/g, ' '))));
  // Give back with Refresh while Refresh is at its maximum (3 of 3)
  await P.getByRole('button', { name: /^Roster/ }).first().click(); await sleep(1200);
  await P.getByText('Iris Vane', { exact: true }).first().click(); await sleep(2000);
  await P.locator('select').filter({ hasText: 'Nothing' }).selectOption('refresh');
  await P.getByRole('button', { name: 'Give a spend back' }).click(); await sleep(1800);
  log('C02 pools after give back at cap', sql(`select stitch, refresh, train from circles where id=${cid}`) + ' spent ' + sql(`select resources_spent_assignment from characters where id=${state.chars.a.id}`));
  log('C02 lk log', await logLines(P, 1));
  await P.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  await P.getByRole('region', { name: 'Circle resources' }).or(P.locator('[aria-label="Circle resources"]')).first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(P, 'C02_lk_circle_refresh_over_cap');
  log('C02 refresh sr text', await P.evaluate(() => [...document.querySelectorAll('.sr-only')].map((e) => e.textContent).filter((t) => /available\./.test(t))));
  // Iris phone, circle page: spends count after the give back
  await iris.page.getByRole('button', { name: /^Menu/ }).click(); await sleep(600);
  await iris.page.getByRole('button', { name: /^Circle/ }).click(); await sleep(1500);
  log('C03 iris spends text', await iris.page.evaluate(() => (document.body.innerText.replace(/\s+/g, ' ').match(/Your spends \d \/ 2/i) || ['none'])[0]));
  log('C03 iris refresh text', await iris.page.evaluate(() => [...document.querySelectorAll('.sr-only')].map((e) => e.textContent).filter((t) => /available\./.test(t))));
  await iris.page.getByText('Circle Resources').first().scrollIntoViewIfNeeded();
  await shot(iris.page, 'C03_iris_circle_resources');
  await b.close();

  // ---- Empty desk: a new campaign
  const b2 = await L.launch();
  const st = state;
  if (!st.users.lke) {
    const username = `lker4${st.stamp}`;
    const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW });
    st.users.lke = { ...r, username };
    const code = `er4-${st.stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Empty Hours')}&code=${code}`, st.users.lke.token);
    st.camps.E = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Empty Hours', lk: 'lke' };
    fs.writeFileSync(L.STATE, JSON.stringify(st, null, 1));
  }
  const e = await L.openSeat(b2, 'wide', { store: await L.storeFor('lke', null, 'E') });
  await sleep(4500);
  await shot(e.page, 'C04_empty_desk');
  log('C04 empty desk text', await e.page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ').slice(0, 900)));
  log('C04 visible empty lines', await e.page.evaluate(() => [...document.querySelectorAll('p, span')].filter((x) => x.children.length === 0 && x.getClientRects().length && !x.closest('.sr-only') && /No investigators|Nothing logged|No one waiting|No dice/i.test(x.textContent)).map((x) => x.textContent.trim())));
  await e.page.getByRole('button', { name: /^Circle/ }).first().click(); await sleep(1500);
  await shot(e.page, 'C05_empty_circle');
  log('C05 circle ability select first option', await e.page.locator('select[aria-label="Circle ability"]').evaluate((s) => s.options[s.selectedIndex].text).catch((er) => 'no select: ' + er.message.slice(0, 60)));
  await e.page.setViewportSize({ width: 1366, height: 768 }); await sleep(800);
  await e.page.getByRole('button', { name: /^Roster/ }).first().click(); await sleep(1200);
  await shot(e.page, 'C06_empty_desk_1366');
  // Phone: the dice tray before any roll (Iris, sealed table S, a fresh browser so the log is empty)
  const ip = await L.openSeat(b2, 'phone', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  await ip.page.getByRole('button', { name: /^Dice and log/ }).click(); await sleep(1200);
  await shot(ip.page, 'C07_phone_dice_tray');
  log('C07 phone tray text', await ip.page.evaluate(() => [...document.querySelectorAll('[data-desk=dice], [data-desk=tray]')].map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 300))));
  fs.writeFileSync(L.DIR + '/out_8404/deskC.json', JSON.stringify(out, null, 1));
  await b2.close();
})().catch((er) => { console.error(er); fs.writeFileSync(L.DIR + '/out_8404/deskC.json', JSON.stringify(out, null, 1)); process.exit(1); });
