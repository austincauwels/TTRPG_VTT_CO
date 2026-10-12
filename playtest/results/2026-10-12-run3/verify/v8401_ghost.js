const L = require('./v8401_lib');
const { api, state, sql, sleep, shot } = L;
const tryApi = async (label, ...a) => { try { const r = await api(...a); console.log(label, 'OK', JSON.stringify(r).slice(0, 200)); } catch (e) { console.log(label, e.status, JSON.stringify(e.body).slice(0, 200)); } };
(async () => {
  const gh = state.chars.gh, lk = state.users.lk, ghu = state.users.gh;
  // 1) Every server path that could let go of an approved investigator
  await tryApi('GM reject active:', 'POST', `/campaign/reject/${gh.id}`, lk.token);
  await tryApi('owner withdraw active:', 'POST', `/campaign/withdraw/${gh.id}`, ghu.token);
  await tryApi('owner delete active:', 'DELETE', `/api/investigators/${gh.id}`, ghu.token);
  console.log('status after:', sql(`select id,name,status,campaign_id from characters where id=${gh.id}`));

  // 2) The Lightkeeper's desk before the seal
  const b = await L.launch();
  const seat = await L.openSeat(b, 'wide', { store: await L.storeFor('lk', null, 'G') });
  await sleep(5000);
  await shot(seat.page, 'g01_desk');
  const btns = await seat.page.evaluate(() => [...document.querySelectorAll('button,[role=button],a')].map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
  console.log('DESK BUTTONS:', JSON.stringify(btns));
  const hits = btns.filter((t) => /remove|release|kick|dismiss|leave|let go|unapprove|send back|drop/i.test(t));
  console.log('release-like controls on desk:', JSON.stringify(hits));
  // open Pontius's sheet from the roster
  const card = seat.page.getByRole('button', { name: /Pontius Aganus/ }).first();
  if (await card.count()) { await card.click(); await sleep(2500); await shot(seat.page, 'g02_sheet');
    const b2 = await seat.page.evaluate(() => [...document.querySelectorAll('button,[role=button]')].map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
    console.log('SHEET release-like:', JSON.stringify(b2.filter((t) => /remove|release|kick|dismiss|leave|let go|unapprove|send back|drop|reject/i.test(t))));
  } else console.log('no Pontius card button');
  const txt = await seat.page.evaluate(() => document.body.innerText);
  const m = txt.match(/[^\n]*(of 5|5 investigators|5 in the circle)[^\n]*/g);
  console.log('5-count lines:', JSON.stringify(m));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
