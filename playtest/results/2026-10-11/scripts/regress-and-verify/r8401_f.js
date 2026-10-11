// Phase F: relationships. Ada 1920 accepts all three (reflow); Dev tablet accepts Cass's (pending label)
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = { ada: [] };
const boxes = (p) => p.evaluate(() => {
  const flow = document.querySelector('.circle-papers-flow');
  return [...flow.children].map(c => { const r = c.getBoundingClientRect(); return `${(c.getAttribute('aria-labelledby') || c.dataset.circlePaper || c.tagName).replace('circle-', '').replace('-title', '')}@${Math.round(r.x)},${Math.round(r.y)} h${Math.round(r.height)}`; });
});
(async () => {
  const b = await L.launch();
  const ada = await openDesk(b, 'desktop', 'ada', 'ada', 'R');
  await goTab(ada.page, 'Circle');
  out.ada.push({ step: 'start', boxes: await boxes(ada.page) });
  await shot(ada.page, 'f01_ada_before_accepts');
  for (let i = 0; i < 3; i++) {
    const acc = ada.page.getByRole('button', { name: /^Accept / }).first();
    const bb = await acc.boundingBox();
    await ada.page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await ada.page.mouse.down(); await ada.page.mouse.up();
    await sleep(1500);
    const under = await ada.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const sec = e?.closest('section'); return (sec?.getAttribute('aria-labelledby') || sec?.dataset.circlePaper || '') + ' :: ' + (e?.textContent || '').trim().slice(0, 60); }, [bb.x + bb.width / 2, bb.y + bb.height / 2]);
    out.ada.push({ step: `accept${i + 1}`, at: [Math.round(bb.x), Math.round(bb.y)], under, boxes: await boxes(ada.page) });
    await shot(ada.page, `f0${i + 2}_ada_after_accept${i + 1}`);
  }
  out.adaSidebar = await ada.page.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'Your Circle' && e.children.length === 0); return h ? h.parentElement.parentElement.innerText.replace(/\n+/g, ' | ').slice(0, 400) : null; });
  // Dev on tablet: Cass proposed to Dev; accept, then look at Dev's Your Circle card for Cass
  const dev = await openDesk(b, 'tablet', 'dev', 'dev', 'R');
  await shot(dev.page, 'f10_dev_desk_before');
  await goTab(dev.page, 'Circle');
  const rel = dev.page.locator('[data-circle-paper="relationships"]');
  await rel.scrollIntoViewIfNeeded();
  await rel.screenshot({ path: L.DIR + '/out_8401/f11_dev_rels_before.png' });
  await rel.getByRole('button', { name: /^Accept / }).first().tap(); await sleep(1500);
  await rel.screenshot({ path: L.DIR + '/out_8401/f12_dev_rels_after.png' });
  await goTab(dev.page, 'Investigator');
  await sleep(800);
  await shot(dev.page, 'f13_dev_desk_after_accept');
  out.devCards = await dev.page.evaluate(() => [...document.querySelectorAll('.hand-placed')].map(e => e.innerText.replace(/\n+/g, ' | ')).filter(t => /Cass Morrow|Bram Holt|Ada Pryce/.test(t) && t.length < 200));
  out.devSr = await dev.page.evaluate(() => [...document.querySelectorAll('.sr-only')].map(e => e.textContent).filter(t => /not yet accepted/.test(t)).length);
  out.dbRels = L.sql(`select from_character_id||'->'||to_character_id||':'||status from relationships order by id`);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
