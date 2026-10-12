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
  // pen stroke then 'e'
  await p.mouse.move(300, 500); await p.mouse.down(); await p.mouse.move(400, 520, { steps: 5 }); await p.mouse.up();
  await L.sleep(200);
  console.log('focus', await p.evaluate(() => document.activeElement?.className));
  await p.keyboard.press('e'); await L.sleep(200);
  console.log('after pen + e:', await toolNow());
  await p.keyboard.press('t'); await L.sleep(200);
  console.log('after t:', await toolNow());
  await p.mouse.click(300, 260); await L.sleep(300);
  await p.keyboard.type('Wick', { delay: 30 });
  await p.keyboard.press('Escape'); await L.sleep(300);
  console.log('after Escape:', await toolNow(), 'focus', await p.evaluate(() => document.activeElement?.className));
  await p.keyboard.press('e'); await L.sleep(200);
  console.log('after Escape + e:', await toolNow());
  await b.close();
})();
