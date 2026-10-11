const L = require('./r8403_lib');
const { goTab, openDesk } = require('./r8403_nav');
const { sleep, shot, state, api } = L;
(async () => {
  const b = await L.launch();
  const cass = await openDesk(b, 'laptop', 'pa', 'a', 'S');
  const p = cass.page;
  await goTab(p, 'Notebook'); await sleep(1200);
  await p.getByRole('button', { name: /^Contents$/ }).first().click().catch(() => {}); await sleep(600);
  // Field entry unsent
  await p.locator('input[type=text]').first().fill('Unsent title at the docks');
  await p.locator('textarea').first().fill('Unsent text: the bell rang twice.');
  await p.getByRole('button', { name: /Private Notes/ }).click(); await sleep(500);
  const note = p.getByRole('textbox', { name: 'Private note' });
  const lines = ['Line one of my note', 'Line two: Vane lies', 'Line three', 'Line four', 'Line five', 'Line six, the last'];
  await note.click(); await p.keyboard.type(lines.join('\n'));
  const box = await note.evaluate(el => ({ rows: el.rows, h: el.clientHeight, sh: el.scrollHeight }));
  console.log('note box', JSON.stringify(box));
  await shot(p, 'd01_note_typed');
  // Step to Investigator and back
  await goTab(p, 'Investigator'); await sleep(800);
  await goTab(p, 'Notebook'); await sleep(1200);
  await shot(p, 'd02_back_from_investigator');
  const read = async () => {
    const n = await p.getByRole('textbox', { name: 'Private note' }).inputValue().catch(() => '(note box not open)');
    await p.getByRole('button', { name: /^Field Notes/ }).click(); await sleep(500);
    await p.getByRole('button', { name: /^Contents$/ }).first().click().catch(() => {}); await sleep(400);
    const t = await p.locator('input[type=text]').first().inputValue(); const x = await p.locator('textarea').first().inputValue();
    const tabs = await p.locator('button[aria-pressed]').evaluateAll(a => a.map(e => e.textContent + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')).slice(0, 3));
    await p.getByRole('button', { name: /Private Notes/ }).click(); await sleep(400);
    return { note: n.split('\n').length + ' lines: ' + n.slice(-20), title: t, text: x, tabs };
  };
  console.log('after Investigator and back', JSON.stringify(await read()));
  // To the hub and back
  await p.getByRole('button', { name: /Back to Chapter Hub/i }).first().click(); await sleep(2000);
  await shot(p, 'd03_hub');
  await L.openFromLedger(p, 'Iris Vane', 3500).catch(e => console.log('ledger', e.message));
  await p.getByRole('button', { name: /^Play/ }).first().click().catch(() => {}); await sleep(3000);
  await goTab(p, 'Notebook').catch(() => {}); await sleep(1200);
  console.log('after hub and back', JSON.stringify(await read()));
  // Reload
  await p.reload(); await sleep(4000);
  await goTab(p, 'Notebook').catch(() => {}); await sleep(1200);
  console.log('after reload', JSON.stringify(await read()));
  await shot(p, 'd04_after_reload');
  // A second tab on the same seat
  const p2 = await cass.ctx.newPage(); await p2.goto(L.SITE + '/'); await sleep(4000);
  await goTab(p2, 'Notebook').catch(() => {}); await sleep(1200);
  const n2 = await p2.getByRole('textbox', { name: 'Private note' }).inputValue().catch(() => '(closed)');
  console.log('second tab note:', JSON.stringify(n2.slice(0, 30)));
  await shot(p2, 'd05_tab2');
  // Pin in tab 1: draft cleared
  await p.getByRole('button', { name: /^Pin note$/i }).click(); await sleep(1500);
  const after = await p.getByRole('textbox', { name: 'Private note' }).inputValue();
  const ls = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('candela-notebook-draft')).map(k => k + '=' + localStorage.getItem(k).slice(0, 20)));
  console.log('after pin: box', JSON.stringify(after), 'storage', JSON.stringify(ls));
  await p2.reload(); await sleep(4000); await goTab(p2, 'Notebook').catch(() => {}); await sleep(1000);
  console.log('tab2 after reload: part open =', await p2.locator('button[aria-pressed=true]').first().textContent(), 'note box:', JSON.stringify(await p2.getByRole('textbox', { name: 'Private note' }).inputValue().catch(() => '(closed)')));
  // Add the field entry: cleared
  await p.getByRole('button', { name: /^Field Notes/ }).click(); await sleep(400);
  await p.getByRole('button', { name: /^Contents$/ }).first().click().catch(() => {}); await sleep(400);
  await p.getByRole('button', { name: /^Add entry$/i }).click(); await sleep(2000);
  const ls2 = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('candela-notebook-draft')).map(k => k + '=' + localStorage.getItem(k).slice(0, 20)));
  console.log('after add: storage', JSON.stringify(ls2));
  const notes = (await api('GET', `/api/notebook/${state.camps.S.id}/entries?role=player&character_id=${state.chars.a.id}`, state.users.pa.token)).filter(x => x.entry_type === 'ephemeral').map(x => x.content.slice(0, 20));
  console.log('private notes on server', JSON.stringify(notes));
  console.log('errors', cass.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
