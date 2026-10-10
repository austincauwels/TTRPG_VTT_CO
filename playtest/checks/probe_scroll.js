// Does the sheet column open scrolled (record effect on mount)?
const L = require('./lib');
const S = L.state;
(async () => {
  const browser = await L.launch();
  const out = {};
  for (const [who, ch, dev] of [['pa', 'a', 'laptop'], ['pb', 'b', 'wide'], ['pa', 'a', 'wide'], ['pb', 'b', 'laptop']]) {
    const seat = await L.openSeat(browser, dev, { store: await L.storeFor(who, ch, 'S') });
    const p = seat.page;
    await p.waitForSelector('[data-desk=sheet] .trauma-record');
    const samples = [];
    for (let i = 0; i < 10; i++) {
      samples.push(await p.evaluate(() => { const c = document.querySelector('[data-desk=sheet]'); return c ? `${Math.round(c.scrollTop)}/${c.scrollHeight - c.clientHeight}` : null; }));
      await p.waitForTimeout(300);
    }
    await L.shot(p, `probe_open_${ch}_${dev}`);
    // to Circle and back
    await p.getByRole('button', { name: /^Circle$/ }).first().click();
    await p.waitForTimeout(1000);
    await p.evaluate(() => { const c = document.querySelector('[data-desk=sheet]'); if (c) c.scrollTop = 0; });
    await p.getByRole('button', { name: /^Investigator$/ }).first().click();
    await p.waitForTimeout(1200);
    const back = await p.evaluate(() => { const c = document.querySelector('[data-desk=sheet]'); return c ? `${Math.round(c.scrollTop)}/${c.scrollHeight - c.clientHeight}` : null; });
    const top = await p.evaluate(() => { const c = document.querySelector('[data-desk=sheet]'); const n = [...c.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Investigator$/i.test(e.textContent.trim())); return n ? Math.round(n.getBoundingClientRect().top - c.getBoundingClientRect().top) : null; });
    out[`${ch}@${dev}`] = { samplesAfterLoad: samples, afterCircleAndBack: back, nameLabelTopInColumn: top };
    await seat.ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
