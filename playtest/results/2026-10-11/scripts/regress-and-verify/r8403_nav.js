const L = require('./r8403_lib');
const { sleep } = L;
async function goTab(page, name) {
  const vw = page.viewportSize().width;
  if (vw < 768) {
    await page.getByRole('button', { name: /^Menu/ }).first().click();
    await sleep(600);
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: new RegExp('^' + name) }).first().click();
    await sleep(900);
  } else {
    await page.getByRole('button', { name, exact: true }).first().click();
    await sleep(900);
  }
}
async function openDesk(browser, device, who, charKey, campKey, extra = {}) {
  const store = await L.storeFor(who, charKey, campKey);
  const seat = await L.openSeat(browser, device, { store, ...extra });
  await sleep(3500);
  return seat;
}
module.exports = { goTab, openDesk };
