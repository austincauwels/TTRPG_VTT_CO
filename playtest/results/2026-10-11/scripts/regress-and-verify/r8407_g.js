// Keyboard at 1366x768 on Iris's desk: roll gilded Move, keep, drive + cap, roll plain, Send report
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
const act = (p) => p.evaluate(() => { const a = document.activeElement; if (!a) return 'none'; const r = a.getBoundingClientRect(); return `${a.tagName} "${(a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70)}" vis=${r.width > 0 && r.height > 0} y=${Math.round(r.top)}`; });
(async () => {
  sql(`update characters set advancement_picks=0, nerve_current=nerve_max, cunning_current=cunning_max where campaign_id=${state.camps.S.id}`);
  const lkws = await L.wsOpen(state.camps.S.code, state.users.lk.token);
  await sleep(400);
  if (sql(`select reports_open from circles where id=${state.camps.S.circleId}`) !== 't') lkws.send('gm_toggle_reports', { circle_id: state.camps.S.circleId, role: 'GM' });
  const b = await L.launch();
  const s = await L.openSeat(b, 'laptop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  const p = s.page;
  // Gilded roll: Move
  const move = p.getByRole('button', { name: /^Roll Hide, gilded/ });
  console.log('hide rows', await move.count());
  for (let k = 0; k < 6; k++) {
    await move.first().focus(); await p.keyboard.press('Enter'); await sleep(3500);
    const keep = await p.locator('[data-keep-die]').count();
    console.log('try', k, 'keep dice', keep, 'focus:', await act(p));
    if (keep) break;
  }
  await L.shot(p, 'g01_after_roll');
  await p.keyboard.press('Enter'); await sleep(1500);
  console.log('after Keep (Enter) focus:', await act(p));
  await p.keyboard.press('Tab'); await sleep(200);
  console.log('after Keep then Tab:', await act(p));
  await L.shot(p, 'g02_after_keep');
  // Plain roll: Strike (not gilded)
  const strike = p.getByRole('button', { name: /^Roll Strike/ });
  await strike.first().focus(); await p.keyboard.press('Enter'); await sleep(3000);
  console.log('after plain roll focus:', await act(p));
  // Drive + up to cap: Nerve
  const plus = p.getByRole('button', { name: /Nerve/i }).filter({ hasText: '+' });
  const plusAll = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === '+').map(b => b.getAttribute('aria-label')));
  console.log('plus buttons', JSON.stringify(plusAll));
  const np = p.locator('button', { hasText: /^\+$/ }).first();
  await np.focus();
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Enter'); await sleep(250); }
  console.log('after 8 Enter on Nerve +: focus', await act(p), 'aria-disabled', await np.getAttribute('aria-disabled'), 'disabled', await np.isDisabled());
  // Send report by keyboard
  await p.getByRole('button', { name: /^Circle$/i }).first().click(); await sleep(1200);
  const box = p.locator('input[type=checkbox]').first();
  await box.focus(); await p.keyboard.press('Space');
  const send = p.getByRole('button', { name: /^Send report$/ });
  console.log('send count', await send.count(), 'disabled', await send.first().isDisabled().catch(() => '?'));
  await send.first().focus(); await p.keyboard.press('Enter'); await sleep(2000);
  console.log('after Send report focus:', await act(p));
  await L.shot(p, 'g03_after_send');
  console.log('errors', s.errors);
  lkws.send('gm_toggle_reports', { circle_id: state.camps.S.circleId, role: 'GM' });
  await sleep(500); lkws.close();
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
