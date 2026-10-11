const L = require('./r8407_lib');
const { sleep, state } = L;
(async () => {
  const b = await L.launch();
  const fi = await L.openSeat(b, 'laptop', { store: await L.storeFor('fi', 'fi', 'F') });
  await sleep(5000);
  console.log(await fi.page.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter(e => !(e.getAttribute('aria-label') || (e.labels && e.labels.length))).map(e => e.outerHTML.slice(0, 200) + ' PARENT ' + e.parentElement.outerHTML.slice(0, 300))));
  await b.close();
})();
