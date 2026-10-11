// Phase B: reports open; send, tab switch, reload, resend; double-click; amend; privacy; LK cards
const fs = require('fs');
const L = require('./r8401_lib');
const { goTab, openDesk } = require('./r8401_nav');
const { sleep, shot, state } = L;
const out = {};
const repOf = (p) => p.locator('section[aria-labelledby="circle-report-title"]');
const readRep = (p) => repOf(p).evaluate((el) => ({ text: el.innerText.replace(/\n+/g, ' | ').slice(-260),
  boxes: [...el.querySelectorAll('input[type=checkbox]')].map(i => (i.checked ? 'X' : '_') + (i.disabled ? 'd' : '')).join(' '),
  buttons: [...el.querySelectorAll('button')].map(b => b.textContent.trim() + (b.disabled ? '(disabled)' : '')) }));
(async () => {
  const b = await L.launch();
  const lk = await openDesk(b, 'wide', 'lk', null, 'R');
  await lk.page.getByRole('button', { name: 'Circle', exact: true }).first().click(); await sleep(1500);
  await shot(lk.page, 'b01_lk_circle_1440');
  // Cass listens on a laptop
  const cass = await openDesk(b, 'laptop', 'cass', 'cass', 'R');
  // open reports
  await lk.page.getByRole('button', { name: 'Open reports' }).click(); await sleep(1200);
  const bram = await openDesk(b, 'phone', 'bram', 'bram', 'R');
  await goTab(bram.page, 'Circle');
  const rep = repOf(bram.page);
  await rep.scrollIntoViewIfNeeded();
  await rep.locator('label', { hasText: 'Do Something Illegal' }).tap();
  await rep.locator('label', { hasText: 'Make a Deal' }).tap();
  await sleep(300);
  out.bramBefore = await readRep(bram.page);
  await rep.screenshot({ path: L.DIR + '/out_8401/b02_bram_ticked.png' });
  await rep.getByRole('button', { name: 'Send report' }).tap();
  await sleep(1500);
  out.bramSent = await readRep(bram.page);
  await rep.screenshot({ path: L.DIR + '/out_8401/b03_bram_sent.png' });
  await goTab(bram.page, 'Investigator');
  await goTab(bram.page, 'Circle');
  await rep.scrollIntoViewIfNeeded();
  out.bramBack = await readRep(bram.page);
  await rep.screenshot({ path: L.DIR + '/out_8401/b04_bram_back.png' });
  await bram.page.reload(); await sleep(4500);
  await goTab(bram.page, 'Circle');
  await rep.scrollIntoViewIfNeeded();
  out.bramReload = await readRep(bram.page);
  await rep.screenshot({ path: L.DIR + '/out_8401/b05_bram_reload.png' });
  // A raw second report without replace from Bram's own socket
  const ws = await L.wsOpen(state.chars.bram.id, state.users.bram.token);
  await sleep(500);
  ws.send('submit_assignment_report', { circle_id: state.camps.R.circleId, character_id: state.chars.bram.id, responses: { keys_fulfilled: 'none', keys_detail: {} } });
  await sleep(1200);
  out.rawResend = ws.frames.filter(f => /report|rejected/.test(f.type)).map(f => JSON.stringify(f).slice(0, 200));
  // Bram's socket trying to file for Dev
  ws.send('submit_assignment_report', { circle_id: state.camps.R.circleId, character_id: state.chars.dev.id, responses: { keys_fulfilled: 'none', keys_detail: {} } });
  await sleep(1200);
  out.forOther = ws.frames.filter(f => /report|rejected|error/.test(f.type)).map(f => JSON.stringify(f).slice(0, 200));
  ws.close();
  // Ada at 1920: tick one, double-click Send
  const ada = await openDesk(b, 'desktop', 'ada', 'ada', 'R');
  await goTab(ada.page, 'Circle');
  const arep = repOf(ada.page);
  await arep.locator('label', { hasText: 'Gather Statements' }).click();
  await arep.getByRole('button', { name: 'Send report' }).dblclick();
  await sleep(1800);
  out.adaSent = await readRep(ada.page);
  await shot(ada.page, 'b06_ada_sent_1920');
  // Ada amends to nothing: Amend, untick, Send amended
  await arep.getByRole('button', { name: 'Amend' }).click(); await sleep(400);
  out.adaAmending = await readRep(ada.page);
  await arep.locator('label', { hasText: 'Gather Statements' }).click();
  await arep.getByRole('button', { name: /Send amended report/ }).dblclick();
  await sleep(1800);
  out.adaAmended = await readRep(ada.page);
  await shot(ada.page, 'b07_ada_amended');
  // LK view
  await sleep(500);
  await shot(lk.page, 'b08_lk_after_reports');
  out.lkLog = await lk.page.evaluate(() => document.body.innerText.match(/[^\n]*(filed an|amended their) assignment report[^\n]*/g));
  out.lkTally = await lk.page.locator('section[aria-label="Illumination questions"]').innerText();
  // Cass's frames: anything about other players' reports?
  const inF = L.parsed(cass, 'in');
  out.cassReportFrames = inF.filter(x => x.m.type === 'assignment_report_submitted').length;
  out.cassFramesWithReports = inF.filter(x => JSON.stringify(x.m).includes('keys_detail')).map(x => x.m.type);
  const st = await L.api('GET', `/campaign/${state.camps.R.id}/circle-creation-state`, state.users.cass.token);
  out.cassStateReports = st.backstory_answers?.reports;
  const stb = await L.api('GET', `/campaign/${state.camps.R.id}/circle-creation-state`, state.users.bram.token);
  out.bramStateReports = Object.keys(stb.backstory_answers?.reports || {});
  out.dbReports = L.sql(`select backstory_answers->'reports' from circles where id=${state.camps.R.circleId}`);
  out.errors = { lk: lk.errors.slice(0, 5), bram: bram.errors.slice(0, 5), ada: ada.errors.slice(0, 5), cass: cass.errors.slice(0, 5) };
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
