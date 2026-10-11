// Ada desktop: Patch Up chip, declared roll, prompt and refusals, Notebook trip
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
  console.log('mod chips', await p.$$eval('.mod-chip', cs => cs.map(c => c.getAttribute('aria-label'))));
  await p.getByRole('tab', { name: /Specialty ability/i }).click().catch(async () => { await p.getByText('Specialty ability', { exact: false }).first().click(); });
  await sleep(500);
  const spec = await p.locator('text=PATCH UP').first().evaluate(e => e.closest('div').parentElement.innerText.replace(/\s+/g, ' ')).catch(e => 'ERR ' + e.message);
  console.log('SPEC TAB', spec);
  console.log('buttons near ability', await p.$$eval('button', bs => bs.filter(b => /Patch|Use/i.test(b.innerText + (b.getAttribute('aria-label')||''))).map(b => b.innerText + '|' + b.getAttribute('aria-label'))));
  await L.shot(p, 'b01_spec_tab', { clip: { x: 400, y: 340, width: 1020, height: 420 } });
  // 1. A plain Focus roll: no Patch Up prompt
  await H.roll(p, 'Focus');
  if ((await H.keepLabels(p)).length) { await H.keep(p, 'regular'); await sleep(2000); }
  console.log('PLAIN SLIP', await H.slip(p), 'AFTER', await H.after(p));
  // The server's answer to Patch Up on the undeclared roll
  H.inj(a, 'use_post_roll_ability', { ability: 'Patch Up', target_character_id: state.chars.b.id });
  await sleep(1500);
  console.log('UNDECLARED refusal frames', L.framesOf(a, 'action_rejected').map(f => f.m.payload.detail));
  await L.shot(p, 'b02_plain_focus');
  await b.close();
})();
