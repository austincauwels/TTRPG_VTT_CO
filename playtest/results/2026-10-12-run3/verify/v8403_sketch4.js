// Simulates the proposed fix: blur the open label in the capture phase of the next pointerdown
const L = require('./v8403_lib');
(async () => {
  const b = await L.launch();
  const seat = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'S') });
  const p = seat.page;
  await L.sleep(3500);
  await p.getByRole('button', { name: /^Notebook$/ }).first().click();
  await L.sleep(1500);
  await p.getByRole('button', { name: /Sketch/ }).first().click();
  await p.locator('.excalidraw canvas').first().waitFor();
  await L.sleep(2500);
  await p.evaluate(() => {
    const wrap = document.querySelector('.sketch-canvas');
    wrap.addEventListener('pointerdown', (e) => {
      const ed = wrap.querySelector('textarea.excalidraw-wysiwyg');
      if (ed && e.target !== ed) ed.blur();
    }, true);
  });
  const tb = p.getByRole('toolbar', { name: 'Drawing tools' });
  await tb.getByRole('button', { name: 'Text', exact: true }).click();
  const labels = [['Wick Lane / loft', 300, 260], ['slipway (choir loudest)', 420, 470], ['bell rope', 700, 420], ['bell tower', 950, 300], ['TIDE', 1050, 650]];
  for (const [t, x, y] of labels) {
    await p.mouse.click(x, y); await L.sleep(350);
    const ed = await p.evaluate(() => !!document.querySelector('textarea.excalidraw-wysiwyg'));
    await p.keyboard.type(t, { delay: 30 });
    console.log(t, 'editor open on one click:', ed);
  }
  await p.mouse.click(600, 700); await L.sleep(400);
  await L.shot(p, 's_fix_sim');
  console.log(seat.errors);
  await b.close();
})();
