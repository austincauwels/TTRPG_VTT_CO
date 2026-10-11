// Ada desktop: Patch Up declared (injected, since the chip is missing): prompt, refusal, retry, Notebook trip, Skip
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.a.id, { intuition_current: 5 });
  L.resetChar(state.chars.b.id, { body_marks: 1 });
  L.resetChar(state.chars.d.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const a = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4000);
  const p = a.page;
  const declaredRoll = async () => {
    H.inj(a, 'roll', { action: 'read', drive_spent: 0, is_secret: false, ability_mods: ['Patch Up'], roll_id: 'inj' + Date.now() });
    await sleep(2500);
    if ((await H.keepLabels(p)).length) { await H.keep(p, 'regular'); await sleep(2000); }
  };
  await declaredRoll();
  console.log('SLIP', await H.slip(p));
  console.log('AFTER', await H.after(p));
  console.log('ally options', await p.$$eval('select[aria-label="Ally for Patch Up"] option', os => os.map(o => o.textContent)));
  await L.shot(p, 'c01_declared_prompt', { clip: { x: 1440, y: 90, width: 470, height: 700 } });
  // Edda: no Body mark
  await p.selectOption('select[aria-label="Ally for Patch Up"]', String(state.chars.d.id));
  await p.locator('div.bg-ink button', { hasText: /^Use$/ }).first().click();
  await sleep(1500);
  console.log('after Use on Edda: AFTER', await H.after(p));
  console.log('error slips', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  await L.shot(p, 'c02_refused', { clip: { x: 1440, y: 90, width: 470, height: 700 } });
  // Notebook and back
  await p.getByRole('button', { name: /^Notebook$/i }).first().click().catch(() => p.getByText('NOTEBOOK').first().click());
  await sleep(1500);
  await p.getByRole('button', { name: /^Investigator$/i }).first().click().catch(() => p.getByText('INVESTIGATOR').first().click());
  await sleep(2000);
  console.log('after Notebook trip: AFTER', await H.after(p), 'alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  // Retry on Jonah
  const opts = await p.$$eval('select[aria-label="Ally for Patch Up"] option', os => os.map(o => o.value));
  if (opts.length) {
    await p.selectOption('select[aria-label="Ally for Patch Up"]', String(state.chars.b.id));
    await p.locator('div.bg-ink button', { hasText: /^Use$/ }).first().dblclick();
    await sleep(2000);
  }
  console.log('after Use on Jonah (dblclick): AFTER', await H.after(p), 'alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  console.log('rejections', L.framesOf(a, 'action_rejected').map(f => f.m.payload.detail));
  console.log('Jonah', H.char(state.chars.b.id).body_marks, 'Imogen int', H.char(state.chars.a.id).intuition_current);
  console.log('LOG', (await H.log(p)).slice(-3));
  await L.shot(p, 'c03_healed', { clip: { x: 1440, y: 90, width: 470, height: 700 } });
  // Notebook trip after the heal
  await p.getByRole('button', { name: /^Notebook$/i }).first().click();
  await sleep(1500);
  await p.getByRole('button', { name: /^Investigator$/i }).first().click();
  await sleep(2000);
  console.log('after 2nd Notebook trip: AFTER', await H.after(p), 'alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  // Skip path: new declared roll, refused Use, then Skip
  await declaredRoll();
  await p.selectOption('select[aria-label="Ally for Patch Up"]', String(state.chars.d.id)).catch(e => console.log('no select', e.message));
  await p.locator('div.bg-ink button', { hasText: /^Use$/ }).first().click().catch(e => console.log('no Use', e.message));
  await sleep(1500);
  console.log('2nd refusal alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  await p.locator('button[aria-label="Skip Patch Up"]').click().catch(e => console.log('no skip', e.message));
  await sleep(800);
  console.log('after Skip: AFTER', await H.after(p), 'alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  await p.getByRole('button', { name: /^Notebook$/i }).first().click();
  await sleep(1500);
  await p.getByRole('button', { name: /^Investigator$/i }).first().click();
  await sleep(2000);
  console.log('after Skip+Notebook: AFTER', await H.after(p), 'alerts', await p.$$eval('[role=alert]', s => s.map(e => e.innerText)));
  await L.shot(p, 'c04_after_skip_trip', { clip: { x: 1440, y: 90, width: 470, height: 700 } });
  console.log(a.errors);
  await b.close();
})();
