// Desk group: dispatch draft, pass notes, timer status, hub tack
const L = require('./lib'); const { sleep, shot, state, check } = L;
const statusText = (page) => page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((e) => e.textContent).filter(Boolean).join(' | ') || '(empty)');
const timerText = (page) => page.evaluate(() => [...document.querySelectorAll('[role=timer]')].map((e) => e.textContent).join(' | '));
(async () => {
  const b = await L.launch();
  const lk = await L.desk(b, 'wide', 'lk', null, 'S'); const P = lk.page;
  // --- dispatch draft
  const loc = () => P.getByLabel(/Location/i).first(); const txt = () => P.getByLabel(/Your dispatch/i).first();
  await loc().fill('The old mill'); await txt().fill('Meet at dusk by the waterwheel.'); await sleep(400);
  const seen = {};
  for (const sec of ['Map', 'Notebook', 'Circle']) {
    await P.getByRole('button', { name: new RegExp(`^${sec}$`, 'i') }).first().click(); await sleep(1300);
    if (sec === 'Map') await shot(P, 'd01_lk_map');
    if (sec === 'Notebook') await shot(P, 'd02_lk_notebook');
    if (sec === 'Circle') await shot(P, 'd03_lk_circle');
    await P.getByRole('button', { name: /^Roster$/i }).first().click(); await sleep(1200);
    seen[sec] = { loc: await loc().inputValue(), txt: await txt().inputValue() };
  }
  await shot(P, 'd04_lk_draft_back');
  check('dispatch-draft-dropped-on-section-switch', 'draft survives Map/Notebook/Circle', Object.values(seen).every(v => v.loc === 'The old mill' && v.txt === 'Meet at dusk by the waterwheel.'), seen);
  // a dispatch from another connection while the letter is unmounted wins
  await P.getByRole('button', { name: /^Map$/i }).first().click(); await sleep(800);
  const sock = await L.wsOpen(state.camps.S.code, state.users.lk.token); await sleep(600);
  sock.send('update_circle', { circle_id: state.camps.S.circleId, location: 'The docks', dispatch_text: 'Fog over the docks.' });
  await sleep(1500); sock.close();
  await shot(P, 'd05a_lk_replaced_banner');
  await P.getByRole('button', { name: /Use this tab/i }).click(); await sleep(3000);
  await P.getByRole('button', { name: /^Roster$/i }).first().click(); await sleep(1500);
  const after = { loc: await loc().inputValue(), txt: await txt().inputValue() };
  check('dispatch-draft-dropped-on-section-switch', 'a newer dispatch replaces the stale draft', after.loc === 'The docks' && after.txt === 'Fog over the docks.', after);
  await shot(P, 'd05_lk_after_other_dispatch');

  // --- pass notes: phone (bram) and tablet (dev)
  const ph = await L.desk(b, 'phone', 'bram', 'bram', 'S');
  await L.goTab(ph.page, 'Pass notes'); await sleep(800);
  await shot(ph.page, 'd06_phone_passnotes');
  const toBtn = ph.page.getByRole('button', { name: /@Circle/ }).first();
  await toBtn.click(); await sleep(600);
  await shot(ph.page, 'd07_phone_to_open');
  const opts = await ph.page.$$eval('button', es => es.filter(e => e.offsetParent && /^@/.test(e.innerText.trim())).map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  check('pass-notes-no-lightkeeper-recipient', 'phone To: list', opts.includes('@Lightkeeper only') && !opts.some(o => /Bram/.test(o)) && opts.some(o => /\(and the Lightkeeper\)/.test(o)), opts);
  await ph.page.keyboard.press('Escape'); await sleep(300);
  const tb = await L.desk(b, 'tablet', 'dev', 'dev', 'S');
  await shot(tb.page, 'd08_tablet_desk');
  let topts = [];
  try {
    const tTo = tb.page.getByRole('button', { name: /@Circle/ }).first(); await tTo.scrollIntoViewIfNeeded(); await tTo.click(); await sleep(600);
    topts = await tb.page.$$eval('button', es => es.filter(e => e.offsetParent && /^@/.test(e.innerText.trim())).map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    await shot(tb.page, 'd09_tablet_to_open');
    const lkOpt = tb.page.locator('button').filter({ hasText: /^@Lightkeeper only/ }).first();
    await lkOpt.click(); await sleep(300);
    const msg = tb.page.getByPlaceholder(/Message/i).first(); await msg.fill('For the Lightkeeper alone'); await msg.press('Enter'); await sleep(2000);
  } catch (e) { console.log('tablet notes error', e.message); }
  check('pass-notes-no-lightkeeper-recipient', 'tablet To: list', topts.includes('@Lightkeeper only') && !topts.some(o => /Dev Marsh/.test(o)), topts);
  const lkSaw = (await L.logLines(P)).concat(await P.evaluate(() => document.body.innerText)).join('\n').includes('For the Lightkeeper alone');
  const bramSaw = (await ph.page.evaluate(() => document.body.innerText)).includes('For the Lightkeeper alone');
  const lkChat = L.framesOf(lk, 'chat_message').map(f => JSON.stringify(f.m.payload).slice(0, 200));
  const bramChat = L.framesOf(ph, 'chat_message').map(f => JSON.stringify(f.m.payload).slice(0, 200));
  check('pass-notes-no-lightkeeper-recipient', '@Lightkeeper note reaches LK only', lkSaw && !bramSaw, { lkSaw, bramSaw, lkChat, bramChat });
  await shot(P, 'd10_lk_got_note');

  // --- timer reset
  const sw = P.getByRole('switch', { name: 'Timer beside the hourglass' });
  if ((await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await sleep(800); }
  await P.getByLabel('Timer seconds').fill('04'); await P.getByLabel('Timer seconds').press('Enter'); await sleep(700);
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(5800);
  const at0 = { lk: await statusText(P), dev: await statusText(tb.page) };
  await P.getByRole('button', { name: /Reset the timer/ }).click(); await sleep(2000);
  const r1 = { lk: await statusText(P), dev: await statusText(tb.page), lkT: await timerText(P), devT: await timerText(tb.page) };
  await shot(P, 'd11_lk_timer_reset'); await shot(tb.page, 'd12_tablet_timer_reset');
  await sleep(8000);
  const r10 = { lk: await statusText(P), dev: await statusText(tb.page) };
  await P.getByRole('button', { name: 'Start the timer' }).click(); await sleep(1500);
  await P.getByRole('button', { name: 'Pause the timer' }).click(); await sleep(1000);
  const paused = { lk: await statusText(P), dev: await statusText(tb.page) };
  await P.getByRole('button', { name: /Reset the timer/ }).click(); await sleep(1500);
  const rp = { lk: await statusText(P), dev: await statusText(tb.page) };
  const noTimesUp = (o) => !/Time's up|paused/i.test(o.lk + o.dev);
  check('timer-status-kept-after-reset', 'reset after time up empties status', /Time's up/.test(at0.lk) && noTimesUp(r1) && noTimesUp(r10), { at0, r1, r10 });
  check('timer-status-kept-after-reset', 'reset after pause empties status', /paused/i.test(paused.lk + paused.dev) && noTimesUp(rp), { paused, rp });
  console.log('errors', lk.errors, ph.errors, tb.errors);
  L.saveResults('desk_results.json');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
