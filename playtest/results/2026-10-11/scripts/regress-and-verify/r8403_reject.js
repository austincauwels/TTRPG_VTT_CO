const L = require('./r8403_lib');
const { sleep, shot, api, state } = L;
const hubStore = (who) => { const u = state.users[who]; return { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: null, campaignId: null, token: u.token }, stage: 'HOME' }; };
(async () => {
  const b = await L.launch();
  // Dev, tablet: Kit Marlowe asks to join from the Registry in capitals with Reenie Beanie
  const dev = await L.openSeat(b, 'tablet', { store: hubStore('pk') }); await sleep(3500);
  const p = dev.page;
  await p.getByRole('button', { name: /Case Ledger/ }).first().tap(); await sleep(1500);
  await shot(p, 'r01_registry');
  const kitRow = p.locator('text=Kit Marlowe').first();
  const btns = await p.locator('.book-page button:visible').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.innerText).trim()).slice(0, 12));
  console.log('registry buttons', JSON.stringify(btns));
  await p.getByRole('button', { name: /Join a campaign|Ask to join|Join/i }).first().tap(); await sleep(800);
  await shot(p, 'r02_joinform');
  console.log('pen shown before any join:', await p.getByRole('button', { name: 'Handwriting' }).first().innerText());
  await p.getByRole('textbox', { name: /Campaign code/i }).first().fill(state.camps.D.code.toUpperCase());
  await p.getByRole('button', { name: 'Handwriting' }).first().tap(); await sleep(300);
  await p.getByRole('group').getByRole('button', { name: 'Reenie Beanie' }).tap(); await sleep(400);
  await p.getByRole('button', { name: /^Ask to join$/i }).first().tap(); await sleep(2500);
  console.log('server after ask', L.sql(`select status, pen_font, campaign_id from characters where id=${state.chars.k.id}`));
  console.log('notices', JSON.stringify(await p.locator('[role=status]').allInnerTexts()));
  await shot(p, 'r03_after_ask');
  // The Lightkeeper rejects
  await api('POST', `/campaign/reject/${state.chars.k.id}`, state.users.lkd.token);
  const t = Date.now(); let got = null;
  for (let i = 0; i < 40 && !got; i++) { await sleep(1000); const n = (await p.locator('[role=status]').allInnerTexts()).find(x => /did not take|let /.test(x)); if (n) got = { n, after: Math.round((Date.now() - t) / 1000) }; }
  console.log('decline notice', JSON.stringify(got));
  console.log('server after reject', L.sql(`select status, pen_font, campaign_id from characters where id=${state.chars.k.id}`));
  await shot(p, 'r04_after_reject');
  await p.getByRole('button', { name: /Join a campaign|Ask to join|Join/i }).first().tap().catch(e => console.log('reopen', e.message)); await sleep(800);
  console.log('pen shown in the join form after reject:', await p.getByRole('button', { name: 'Handwriting' }).first().innerText().catch(() => '(no form)'));
  await shot(p, 'r05_joinform_after_reject');
  // reload: the form starts from the kept pen too
  await p.reload(); await sleep(3500);
  await p.getByRole('button', { name: /Case Ledger/ }).first().tap(); await sleep(1500);
  await p.getByRole('button', { name: /Join a campaign|Ask to join|Join/i }).first().tap(); await sleep(800);
  console.log('pen after reload:', await p.getByRole('button', { name: 'Handwriting' }).first().innerText().catch(() => '(no form)'));
  await p.getByRole('textbox', { name: /Campaign code/i }).first().fill(state.camps.D.code);
  await p.getByRole('button', { name: /^Ask to join$/i }).first().tap(); await sleep(2500);
  console.log('server after asking again', L.sql(`select status, pen_font, campaign_id from characters where id=${state.chars.k.id}`));
  // A code that is wrong
  console.log('errors', dev.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
