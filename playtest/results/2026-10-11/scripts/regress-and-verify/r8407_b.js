// advancement-later-no-way-back: phone (Bram) Later, desktop (Iris) Escape; hub and back, reload, second tab
const L = require('./r8407_lib');
const { sleep, sql, state } = L;
const DESK = { viewport: { width: 1920, height: 1080 } };
L.DEVICES.desktop = DESK;
const advBtn = (p) => p.getByRole('button', { name: /Choose advancements/ });
const dlgOpen = async (p) => (await p.locator('#advancement-title').count()) > 0;
(async () => {
  const b = await L.launch();
  const br = await L.openSeat(b, 'phone', { store: await L.storeFor('pb', 'b', 'S') });
  const ir = await L.openSeat(b, 'desktop', { store: await L.storeFor('pa', 'a', 'S') });
  await sleep(4500);
  console.log('bram dialog open at load', await dlgOpen(br.page), 'iris', await dlgOpen(ir.page));
  await L.shot(br.page, 'b01_bram_dialog');
  // Phone: double-tap Later
  await br.page.getByRole('button', { name: /^Later$/ }).dblclick();
  await sleep(800);
  console.log('bram after Later: dialog', await dlgOpen(br.page), 'button count', await advBtn(br.page).count(), 'focus', await br.page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
  await L.shot(br.page, 'b02_bram_after_later');
  const bb = await advBtn(br.page).boundingBox().catch(() => null);
  console.log('bram btn box', JSON.stringify(bb));
  // Phone: open the Menu
  const menu = br.page.getByRole('button', { name: /^Menu/ });
  if (await menu.count()) { await menu.first().tap(); await sleep(700); await L.shot(br.page, 'b03_bram_menu'); console.log('menu: button still?', await advBtn(br.page).isVisible().catch(() => false)); await br.page.keyboard.press('Escape'); await sleep(500); }
  // Tap the button
  await advBtn(br.page).tap();
  await sleep(700);
  console.log('bram after tap: dialog', await dlgOpen(br.page));
  await L.shot(br.page, 'b04_bram_resumed');
  // Escape on desktop
  await ir.page.keyboard.press('Escape');
  await sleep(700);
  console.log('iris after Esc: dialog', await dlgOpen(ir.page), 'button', await advBtn(ir.page).count());
  await L.shot(ir.page, 'b05_iris_after_escape');
  // Switch to Circle tab and Notebook and back
  for (const t of ['Circle', 'Notebook', 'Investigator']) {
    await ir.page.getByRole('tab', { name: new RegExp(`^${t}`) }).first().click().catch(async () => { await ir.page.getByRole('button', { name: new RegExp(`^${t}$`, 'i') }).first().click(); });
    await sleep(700);
    console.log('iris on', t, 'button visible', await advBtn(ir.page).isVisible().catch(() => false), 'dialog', await dlgOpen(ir.page));
  }
  await L.shot(ir.page, 'b06_iris_tabs');
  // Hub and back
  await ir.page.getByRole('button', { name: /Back to chapter hub/i }).first().click();
  await sleep(2000);
  await L.shot(ir.page, 'b07_iris_hub');
  await L.openFromLedger(ir.page, 'Iris Vane', 3500).catch(e => console.log('ledger', e.message));
  console.log('iris back from hub: dialog', await dlgOpen(ir.page), 'button', await advBtn(ir.page).count());
  await L.shot(ir.page, 'b08_iris_back');
  // Later again, then reload
  await ir.page.getByRole('button', { name: /^Later$/ }).click().catch(() => {});
  await sleep(500);
  await ir.page.reload(); await sleep(4000);
  console.log('iris after reload: dialog', await dlgOpen(ir.page), 'New Circle Ability box', await ir.page.getByText('New Circle Ability').count());
  await L.shot(ir.page, 'b09_iris_reload');
  // second tab: Later in tab 1, choose in tab 2
  await ir.page.getByRole('button', { name: /^Later$/ }).click();
  await sleep(500);
  const p2 = await ir.ctx.newPage();
  await p2.goto(L.SITE + '/'); await sleep(4500);
  console.log('tab2 dialog', await dlgOpen(p2));
  await L.shot(p2, 'b10_iris_tab2');
  if (await dlgOpen(p2)) {
    const d = p2.getByRole('dialog');
    await d.getByText('Add 2 drive points').click(); await sleep(300);
    await d.getByRole('button', { name: /^nerve/i }).click(); await d.getByRole('button', { name: /^cunning/i }).click();
    await d.getByText('Take a new ability').click(); await sleep(300);
    await p2.locator('#adv-new-ability').selectOption('Scout');
    await sleep(300);
    console.log('ability text under select:', await p2.locator('#adv-new-ability').locator('xpath=following-sibling::p[1]').innerText().catch(() => 'none'));
    await L.shot(p2, 'b11_tab2_picks');
    await d.getByRole('button', { name: /Confirm Advancement/ }).click();
    await sleep(2500);
    console.log('tab2 applied:', await p2.getByRole('dialog').innerText().catch(() => 'none'));
    await L.shot(p2, 'b12_tab2_applied');
  }
  await ir.page.bringToFront(); await sleep(1500);
  console.log('tab1 after tab2 chose: button', await advBtn(ir.page).count(), 'dialog', await dlgOpen(ir.page));
  await L.shot(ir.page, 'b13_tab1_after');
  console.log('logs', JSON.stringify(await ir.page.evaluate(() => [...document.querySelectorAll('*')].filter(e => /has advanced/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()))));
  console.log('errors', br.errors, ir.errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
