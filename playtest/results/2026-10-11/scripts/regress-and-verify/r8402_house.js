// chapter-house-shared-box: Bram (phone) mid-typing while Iris (1920) saves; label, name, shared note; stale send
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const shot = (pg, n) => pg.screenshot({ path: `${L.DIR}/${n}.png` });
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const iris = await L.openSeat(b, 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await iris.page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(5000);
  const db = () => sql(`select backstory_answers->>'chapter_house' from circles where id=${state.camps.F.circleId}`);
  const bp = bram.page, ip = iris.page;
  const bbox = bp.getByRole('textbox', { name: "The Circle's Chapter House" });
  const ibox = ip.getByRole('textbox', { name: "The Circle's Chapter House" });
  console.log('accessible name found on phone:', await bbox.count(), 'desktop:', await ibox.count());
  await bbox.scrollIntoViewIfNeeded();
  // Shared note behind the i
  const shared = bp.getByRole('button', { name: /Shared/ });
  console.log('Shared control:', await shared.count());
  if (await shared.count()) { await shared.first().tap(); await sleep(500); await shot(bp, 'house_shared_slip'); console.log('slip text:', (await bp.locator('body').innerText()).match(/The whole circle shares this box[^\n]*/)?.[0]); await bp.getByText("The Circle's Chapter House").tap(); await sleep(300); }
  // Iris writes first
  await ibox.click(); await ibox.fill('The Boot and Saddle, in South Soffit.'); await ip.getByText('Examples').click(); await sleep(1000);
  console.log('db after Iris:', db());
  // Bram starts typing
  await bbox.tap(); await bp.keyboard.press('End'); await bp.keyboard.type(' Bram adds: up the back stair');
  // Iris saves again while Bram types
  await ibox.click(); await ibox.fill('The Rust Warren, under the Haven Hills.'); await ip.getByText('Examples').click(); await sleep(1500);
  console.log('db after Iris again:', db());
  console.log('Bram still focused:', await bbox.evaluate((e) => document.activeElement === e), '| Bram box:', JSON.stringify(await bbox.inputValue()));
  await shot(bp, 'house_bram_typing');
  await bp.keyboard.type(', third door.');
  await bp.getByText("The Circle's Chapter House").tap(); await sleep(1200);
  console.log('db after Bram blurs:', db(), '| Iris sees:', JSON.stringify(await ibox.inputValue()));
  // Stale send: Iris focuses and leaves unchanged while Bram saves; Iris blurs -> Bram's text must stay
  await ibox.click(); await sleep(200);
  await bbox.tap(); await bbox.fill('The Empty Office, fourth floor.'); await bp.getByText("The Circle's Chapter House").tap(); await sleep(1200);
  console.log('Iris box while focused:', JSON.stringify(await ibox.inputValue()));
  await ip.getByText('Examples').click(); await sleep(1200);
  console.log('db after Iris blurs untouched:', db(), '| Iris box', JSON.stringify(await ibox.inputValue()));
  await ibox.scrollIntoViewIfNeeded(); await shot(ip, 'house_iris_after');
  console.log('errors', [...bram.errors, ...iris.errors].join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
