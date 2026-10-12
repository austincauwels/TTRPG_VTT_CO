const L = require('./v8403_lib');
const S = L.state;
(async () => {
  const camp = S.camps.S;
  if (process.argv[2] === 'add') {
    await L.api('POST', `/api/notebook/${camp.id}/entries`, S.users.pb.token,
      { title: 'Closing note: the last change', content: "The change book is finished. I rang the last row on **Maren's handbell**.", author_name: 'x', author_type: 'player', character_id: S.chars.b.id });
  }
  const b = await L.launch();
  const runs = [['pa', 'a', 'desk1920', { viewport: { width: 1920, height: 1080 } }], ['pb', 'b', 'laptop', null], ['pa', 'a', 'phone', null]];
  for (const [who, ch, dev, vp] of runs) {
    if (vp) L.DEVICES.desk1920 = vp;
    const seat = await L.openSeat(b, dev, { store: await L.storeFor(who, ch, 'S') });
    const p = seat.page;
    await L.sleep(4000);
    const bodyText = await p.evaluate(() => document.body.innerText);
    console.log(dev, 'log mentions username:', /lightkeeper_lkua73/.test(bodyText), '| lines:', (bodyText.match(/.*(added a sketch|added a field).*/g) || []).slice(0, 3));
    if (dev === 'phone') {
      await p.getByRole('button', { name: /Menu/ }).first().tap().catch(e => console.log('menu', e.message));
      await L.sleep(800);
    }
    await p.getByRole('button', { name: /^Notebook$/ }).first().click();
    await L.sleep(2000);
    await L.shot(p, `n_${dev}_contents`);
    const chips = await p.evaluate(() => {
      const lab = [...document.querySelectorAll('span')].find(s => /Filter by Author/i.test(s.textContent));
      return lab ? [...lab.parentElement.querySelectorAll('button')].map(x => x.textContent) : null;
    });
    const toc = await p.evaluate(() => { const ol = document.querySelector('ol[aria-label^=Contents]'); return ol ? { label: ol.getAttribute('aria-label'), lines: [...ol.querySelectorAll('li')].map(li => li.innerText.replace(/\s+/g, ' ')), h: ol.clientHeight } : null; });
    console.log(dev, 'chips', chips, 'toc', JSON.stringify(toc));
    // click the Lightkeeper's sketch line if it is listed
    const line = p.locator('ol[aria-label^=Contents] button', { hasText: 'bell tower' }).first();
    if (await line.count()) {
      await line.click(); await L.sleep(1500);
      const info = await p.evaluate(() => {
        const card = document.querySelector('[data-entry-id="3"]');
        const sc = card && card.closest('.overflow-y-auto');
        const r = card && card.getBoundingClientRect();
        return { cardTop: r && Math.round(r.top), vh: innerHeight, scrollTop: sc && sc.scrollTop, scrollH: sc && sc.scrollHeight, clientH: sc && sc.clientHeight,
          scW: sc && (sc.offsetWidth - sc.clientWidth), pageLabel: [...document.querySelectorAll('*')].map(e => e.childNodes.length === 1 && e.textContent).filter(t => t && /Page \d+ of \d+/i.test(t))[0] };
      });
      console.log(dev, 'after contents click', JSON.stringify(info));
      await L.shot(p, `n_${dev}_after_click`);
    }
    await seat.ctx.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
