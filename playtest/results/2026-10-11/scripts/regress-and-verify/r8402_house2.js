// Does Iris's chapter house save reach Bram's phone while his box is not focused?
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
(async () => {
  const b = await L.launch();
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const iris = await L.openSeat(b, 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await sleep(5000);
  const bp = bram.page, ip = iris.page;
  const bbox = bp.getByRole('textbox', { name: "The Circle's Chapter House" });
  const ibox = ip.getByRole('textbox', { name: "The Circle's Chapter House" });
  console.log('Bram box at open:', JSON.stringify(await bbox.inputValue()), '| db', sql(`select backstory_answers->>'chapter_house' from circles where id=${state.camps.F.circleId}`));
  const n0 = bram.frames.length;
  await ibox.click(); await ibox.fill('The Boot and Saddle, in South Soffit.'); await ip.getByText('Examples').click(); await sleep(2000);
  console.log('Bram box after Iris saves (unfocused):', JSON.stringify(await bbox.inputValue()));
  console.log('frames to Bram:', JSON.stringify(L.parsed(bram, 'in', n0).map((x) => x.m.type)));
  console.log('frames from Iris:', JSON.stringify(L.parsed(iris, 'out').map((x) => x.m.type + ':' + JSON.stringify(x.m.payload).slice(0, 80)).slice(-3)));
  await bbox.tap(); await sleep(300);
  console.log('Bram box when focused:', JSON.stringify(await bbox.inputValue()));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
