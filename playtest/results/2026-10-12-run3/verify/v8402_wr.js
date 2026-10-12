const L = require('./v8402_lib');
(async () => {
  const { state, sql } = L;
  const id = state.chars.a.id;
  const browser = await L.launch();
  const seat = await L.openSeat(browser, 'wide', { store: await L.storeFor('pa', 'a', 'S') });
  const { page } = seat;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await L.sleep(5000);
  const held = page.getByRole('button', { name: /^Keep the \d/ });
  if (await held.count()) { console.log('held roll on load; keeping regular'); await held.first().focus(); await page.keyboard.press('Enter'); await L.sleep(2500); }
  for (let attempt = 0; attempt < 12; attempt++) {
    sql(`update characters set intuition_current=4, intuition_max=4 where id=${id}`);
    if (attempt > 0) { await page.reload(); await L.sleep(5000); }
    const sr = await page.evaluate(() => [...document.querySelectorAll('.sr-only')].map((e) => e.textContent).find((t) => /^Intuition:/.test(t)));
    const n0 = seat.frames.length;
    await page.getByRole('button', { name: 'Spend one more Intuition for +1d' }).click();
    await L.sleep(300);
    await page.getByRole('button', { name: 'Roll Focus, gilded, rating 2' }).click();
    await L.sleep(2500);
    const rr = L.framesOf(seat, 'roll_result', 'in', n0)[0];
    const sent = L.parsed(seat, 'out', n0).map((x) => JSON.stringify(x.m));
    console.log(`attempt ${attempt} ${sr} sent=${sent.join(' ')}`);
    if (!rr) { console.log('no roll_result', L.parsed(seat, 'in', n0).map((x) => x.m.type)); continue; }
    const roll = rr.m.payload.roll || rr.m.payload;
    console.log('roll', JSON.stringify(roll).slice(0, 400));
    if (!roll.needs_gilded_choice || roll.gilded_value > 3) {
      // settle the choice (keep regular) and try again
      if (roll.needs_gilded_choice) {
        const btns = await page.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter((t) => /keep/i.test(t)));
        console.log('keep buttons', btns);
        await page.getByRole('button', { name: /^Keep the \d/ }).first().focus(); await page.keyboard.press('Enter'); await L.sleep(2500);
      }
      continue;
    }
    await L.shot(page, 'wr_01_choice');
    const keepBtns = await page.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter((t) => /keep|gilded/i.test(t)));
    console.log('keep buttons', keepBtns);
    const n1 = seat.frames.length;
    const g = page.getByRole('button', { name: /gilded/i }).filter({ hasNotText: /Roll/ });
    const target = page.getByRole('button', { name: /^Keep the gilded/ }).first();
    await target.focus();
    await page.keyboard.press('Enter');
    await L.sleep(3000);
    console.log('sent', L.parsed(seat, 'out', n1).map((x) => JSON.stringify(x.m)));
    for (const x of L.parsed(seat, 'in', n1)) {
      if (x.m.type === 'character_update') console.log('in character_update intuition', x.m.payload.intuition_current, '/', x.m.payload.intuition_max);
      else console.log('in', JSON.stringify(x.m).slice(0, 300));
    }
    console.log('DB', sql(`select intuition_current, intuition_max from characters where id=${id}`));
    await L.shot(page, 'wr_02_after');
    const texts = await page.evaluate(() => document.body.innerText.split('\n').filter((t) => /Intuition|Well-Read|gilded|refresh/i.test(t)).slice(0, 40));
    console.log(texts.join('\n'));
    break;
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
