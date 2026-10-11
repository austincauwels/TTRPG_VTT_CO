// vote-tie-leading at the seal: tie names/insignia/ability/question, shuffle heap order, seal from the Lightkeeper's desk
const L = require('./r8402_lib');
const { sleep, sql, state } = L;
const shot = (pg, n) => pg.screenshot({ path: `${L.DIR}/${n}.png` });
(async () => {
  const cid = state.camps.F.circleId;
  const ws = await L.wsOpen(state.chars.fb.id, state.users.fb.token);
  ws.send('circle_creation_vote', { circle_id: cid, character_id: state.chars.fb.id, vote_type: 'name_vote', value: 'The Harrow Watch' });
  await sleep(800); ws.close();
  // Move the first-cast rows to the end of the heap: a query without ORDER BY now returns them last
  sql(`update circle_votes set value=value where circle_id=${cid} and id in (select min(id) from circle_votes where circle_id=${cid} group by vote_type)`);
  sql('analyze circle_votes');
  console.log('heap order:\n' + sql(`select id, vote_type, left(value,25) from circle_votes where circle_id=${cid} and vote_type<>'name_suggest'`));
  const b = await L.launch();
  const ada = await L.openSeat(b, 'wide', { store: await L.storeFor('fi', 'fi', 'F') });
  await ada.page.setViewportSize({ width: 1920, height: 1080 });
  const bram = await L.openSeat(b, 'phone', { store: await L.storeFor('fb', 'fb', 'F') });
  const lk = await L.openSeat(b, 'wide', { store: await L.storeFor('lkf', null, 'F') });
  await sleep(6000);
  const ap = ada.page;
  const t = await ap.locator('[role=dialog]').innerText();
  const grab = (s, a, z) => { const i = s.indexOf(a); const j = s.indexOf(z, i + 1); return s.slice(i, j); };
  console.log('Ada names:', JSON.stringify(grab(t, 'SUGGESTED NAMES', 'III.')));
  console.log('Ada ability lead:', JSON.stringify(t.match(/\n([^\n]+)\n[^\n]*\n1\n(?:your vote\n)?leading/g)));
  // Starting resources on the 1920 papers
  const res = ap.getByText('Starting Resource Points'); await res.scrollIntoViewIfNeeded(); await shot(ap, 'papers_resources_1920');
  // Escape on the papers (left alone: they stay a blocking dialog)
  await ap.keyboard.press('Escape'); await sleep(500);
  console.log('dialog after Escape:', await ap.locator('[role=dialog]').count());
  const lt = await lk.page.locator('body').innerText();
  const s = lt.search(/CIRCLE FORMATION SO FAR/i);
  console.log('LK leads:', JSON.stringify(lt.slice(s, s + 2500).split('\n').filter((l) => /leads|Tied/.test(l))));
  // Seal: two presses
  const fin = lk.page.getByRole('button', { name: /Finalize the circle/i });
  await fin.scrollIntoViewIfNeeded(); await fin.click(); await sleep(600);
  await shot(lk.page, 'seal_armed');
  await lk.page.getByRole('button', { name: /Yes, finalize the circle/i }).click(); await sleep(4000);
  console.log('circle after seal:', sql(`select name, circle_ability, insignia, is_finalized, backstory_answers->>'question' from circles where id=${cid}`));
  console.log('circle cols:', sql(`select string_agg(column_name, ',') from information_schema.columns where table_name='circles'`));
  await shot(lk.page, 'seal_lk_after');
  await sleep(1500);
  console.log('Ada dialog after seal:', await ap.locator('[role=dialog]').count(), '| Bram:', await bram.page.locator('[role=dialog]').count());
  await shot(bram.page, 'seal_bram_after');
  console.log('errors', [...ada.errors, ...bram.errors, ...lk.errors].join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
