// personal-answer-save-feedback: Bram (phone). Saved on blur; a stalled socket; a reload; a real drop
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const { execSync } = require('child_process');
const shot = (pg, n) => pg.screenshot({ path: `${L.DIR}/${n}.png` });
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  await sleep(5000);
  const p = bram.page;
  const box = p.getByLabel('Your personal answer');
  const status = box.locator('xpath=following-sibling::p[1]//span[@role="status"]');
  const dbAns = () => sql(`select coalesce(personal_circle_answer,'<null>') from characters where id=${state.chars.fb.id}`);
  await box.scrollIntoViewIfNeeded();
  console.log('start status:', await status.innerText(), '| value', JSON.stringify(await box.inputValue()));
  await box.tap(); await box.fill('A1: we pulled the Harrow children from the flood.');
  console.log('while typing:', await status.innerText());
  await p.getByText('Your Personal Answer').tap(); await sleep(1200);
  console.log('after blur:', await status.innerText(), '| db:', dbAns());
  await shot(p, 'answer_saved');
  // Stall the socket: frames the page sends are held
  const sock = bram.sockets[bram.sockets.length - 1]; sock.stalled = true;
  await box.tap(); await box.fill('A2: typed while the line was stalled.');
  await p.getByText('Your Personal Answer').tap(); await sleep(1500);
  console.log('stalled, after blur:', await status.innerText(), '| db:', dbAns());
  await shot(p, 'answer_stalled');
  // Reload while stalled (what the store kept)
  await p.reload(); await sleep(5000);
  const box2 = p.getByLabel('Your personal answer'); await box2.scrollIntoViewIfNeeded();
  const status2 = box2.locator('xpath=following-sibling::p[1]//span[@role="status"]');
  console.log('after reload: value', JSON.stringify(await box2.inputValue()), '| status', await status2.innerText(), '| db:', dbAns());
  await shot(p, 'answer_after_reload');
  // A real drop: stop the backend, type and blur, start it again
  execSync('/home/user/pt2/verify/r8402_api_restart.sh stop', { stdio: 'ignore' });
  await sleep(2500);
  await box2.tap(); await box2.fill('A3: typed while the server was down.');
  await p.getByText('Your Personal Answer').tap(); await sleep(800);
  console.log('server down, after blur:', await status2.innerText(), '| body has dropped line:', /dropped|reconnect/i.test(await p.locator('body').innerText()));
  await shot(p, 'answer_down');
  execSync('/home/user/pt2/verify/r8402_api_restart.sh start', { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(1000); if ((await status2.innerText()) === 'Saved') break; }
  console.log('after restart:', await status2.innerText(), '| db:', dbAns());
  await shot(p, 'answer_back');
  // Long answer: does the box grow?
  const long = 'A4: ' + 'We carried the lanterns through the drowned streets while the bells rang out of time. '.repeat(5);
  await box2.tap(); await box2.fill(long);
  await p.getByText('Your Personal Answer').tap(); await sleep(1200);
  const g = await box2.evaluate((e) => ({ h: e.clientHeight, sh: e.scrollHeight, len: e.value.length }));
  console.log('long answer box', JSON.stringify(g), '| status', await status2.innerText());
  await box2.scrollIntoViewIfNeeded(); await shot(p, 'answer_long');
  console.log('errors', bram.errors.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
