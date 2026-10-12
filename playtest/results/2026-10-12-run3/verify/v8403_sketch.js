const L = require('./v8403_lib');
const flow = process.argv[2] || 'A';
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
  const textCount = async () => p.evaluate(() => {
    const ta = document.querySelector('.excalidraw-wysiwyg, textarea.excalidraw-wysiwyg');
    return { editing: !!ta, value: ta ? ta.value : null };
  });
  const log = async (label) => console.log(flow, label, 'tool=', await toolNow(), JSON.stringify(await textCount()));
  await tb.getByRole('button', { name: 'Text', exact: true }).click();
  await log('picked text');
  await p.mouse.click(300, 260); await L.sleep(400);
  await log('click1');
  await p.keyboard.type('Wick Lane / loft', { delay: 40 });
  if (flow === 'A') {
    await p.keyboard.press('Enter'); await L.sleep(300);
    await log('after Enter');
    await p.mouse.click(420, 470); await L.sleep(400);
    await log('click2');
    await p.keyboard.type('slipway (choir loudest)', { delay: 40 }); await L.sleep(300);
    await log('typed 2');
    await p.keyboard.press('Enter'); await L.sleep(300);
    await p.mouse.click(700, 420); await L.sleep(400);
    await log('click3');
    await p.keyboard.type('bell rope', { delay: 40 }); await L.sleep(300);
    await log('typed 3');
  } else if (flow === 'B') {
    // a person: click out to finish, then click where the next label goes
    await p.mouse.click(420, 470); await L.sleep(400);
    await log('click out');
    await p.mouse.click(420, 470); await L.sleep(400);
    await log('click again');
    await p.keyboard.type('slipway (choir loudest)', { delay: 40 }); await L.sleep(300);
    await p.mouse.click(700, 420); await L.sleep(400);
    await p.mouse.click(700, 420); await L.sleep(400);
    await log('click3 twice');
    await p.keyboard.type('bell rope', { delay: 40 }); await L.sleep(300);
    await p.mouse.click(900, 600); await L.sleep(400);
    await log('done');
  } else if (flow === 'C') {
    // Escape to finish, then one click for the next
    await p.keyboard.press('Escape'); await L.sleep(400);
    await log('after Escape');
    await p.mouse.click(420, 470); await L.sleep(400);
    await log('click2');
    await p.keyboard.type('slipway (choir loudest)', { delay: 40 }); await L.sleep(300);
    await p.keyboard.press('Escape'); await L.sleep(400);
    await p.mouse.click(700, 420); await L.sleep(400);
    await log('click3');
    await p.keyboard.type('bell rope', { delay: 40 }); await L.sleep(300);
    await p.keyboard.press('Escape'); await L.sleep(300);
    await log('done');
  }
  await L.shot(p, `s_${flow}`);
  console.log(seat.errors.slice(0, 5));
  await b.close();
})();
