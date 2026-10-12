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
  const tb = p.getByRole('toolbar', { name: 'Drawing tools' });
  const toolNow = async () => (await tb.locator('button[aria-pressed=true]').getAttribute('aria-label').catch(() => '?'));
  await tb.getByRole('button', { name: 'Text', exact: true }).click();
  await p.mouse.click(300, 260); await L.sleep(300);
  await p.keyboard.type('Wick Lane', { delay: 40 });
  await p.mouse.click(420, 470); await L.sleep(400);
  console.log('after finalize click: tool', await toolNow(), 'active', await p.evaluate(() => document.activeElement?.className + ' ' + document.activeElement?.tagName));
  for (const k of 'slipway (choir loudest)') {
    await p.keyboard.type(k); await L.sleep(120);
    const t = await toolNow();
    process.stdout.write(`${k}->${t} `);
  }
  console.log();
  await L.shot(p, 's_D');
  // Same but with the mouse moved over the canvas first (a person's pointer stays there)
  await b.close();
})();
