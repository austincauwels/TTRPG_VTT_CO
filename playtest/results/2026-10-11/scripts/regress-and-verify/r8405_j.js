// Phone (Jonah): Tactician asks one of its questions, 44px Use, Spent line, log; double tap
const L = require('./r8405_lib'); const H = require('./r8405_h');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  L.resetChar(state.chars.b.id, {});
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const j = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  await sleep(4500);
  const p = j.page;
  await p.locator('button', { hasText: /Specialty/i }).first().tap();
  await sleep(600);
  const sel = p.locator('select[aria-label="Question for Tactician"]');
  await sel.scrollIntoViewIfNeeded();
  console.log('options', await sel.locator('option').allTextContents());
  const use = p.locator('button', { hasText: /^Use/ }).first();
  console.log('Use text', await use.innerText(), 'disabled', await use.isDisabled(), 'box', await use.boundingBox(), 'select box', await sel.boundingBox());
  await L.shot(p, 'j01_tactician');
  // tap Use with no question
  await use.tap({ force: true }).catch(e => console.log('tap err', e.message));
  await sleep(1000);
  console.log('nerve after blank tap', H.char(state.chars.b.id).nerve_current);
  const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value));
  await sel.selectOption(opts[1]);
  await sleep(300);
  console.log('Use disabled after choosing', await use.isDisabled());
  const n0 = (await H.log(lk.page)).length;
  await use.tap();
  await use.tap({ force: true }).catch(() => {});
  await sleep(1500);
  console.log('near button', await use.evaluate(e => e.parentElement.parentElement.innerText.replace(/\s+/g, ' ')));
  console.log('select after', await sel.inputValue());
  await L.shot(p, 'j02_tactician_spent');
  console.log('nerve after use', H.char(state.chars.b.id).nerve_current);
  console.log('LK new lines', (await H.log(lk.page)).slice(n0));
  console.log('rejections', L.framesOf(j, 'action_rejected').map(f => f.m.payload.detail));
  await b.close();
})();
