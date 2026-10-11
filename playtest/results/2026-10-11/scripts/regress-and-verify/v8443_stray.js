const L = require('./v8443_lib'); const { sleep, shot, api } = L;
const fs = require('fs');
(async () => {
  const st = L.state; const out = {};
  if (!st.camps.G) {
    const stamp = Date.now().toString(36).slice(-4);
    const reg = async (k) => { const username = `${k}g${stamp}`; const r = await api('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: L.PW }); st.users[k] = { ...r, username }; };
    await reg('lkg'); await reg('pg'); await reg('pg2');
    const code = `grc-${stamp}`;
    const c = await api('POST', `/campaign/create?name=${encodeURIComponent('The Open Papers')}&code=${code}`, st.users.lkg.token);
    st.camps.G = { id: c.id ?? c.campaign?.id ?? c.campaign_id, code, name: 'The Open Papers', lk: 'lkg' };
    const kind = { pronouns: '', style: 'Tidy', catalyst: 'A fire', question: 'Why?', role: 'Slink', specialty: 'Criminal', role_ability: 'Death Defy', specialty_ability: 'Street Smarts',
      move: 1, strike: 0, control: 2, hide: 2, sneak: 0, sway: 0, survey: 2, read: 2, sense: 0, gilded_hide: true, gilded_move: true,
      nerve_max: 4, nerve_current: 4, cunning_max: 4, cunning_current: 4, intuition_max: 1, intuition_current: 1, gear: ['Lantern'] };
    for (const [key, owner, name] of [['gd', 'pg', 'Dev Marsh'], ['ge', 'pg2', 'Eli Rook']]) {
      const ch = await api('POST', '/api/investigators/forge', st.users[owner].token, { ...kind, name, user_id: st.users[owner].userId });
      await api('POST', `/campaign/join?character_id=${ch.id}&code=${code}`, st.users[owner].token);
      await api('POST', `/campaign/approve/${ch.id}`, st.users.lkg.token);
      st.chars[key] = { id: ch.id, name, owner, camp: 'G' };
    }
    const cs = await api('GET', `/campaign/${st.camps.G.id}/circle-creation-state`, st.users.lkg.token); st.camps.G.circleId = cs.circle_id;
    fs.writeFileSync(L.STATE, JSON.stringify(st, null, 1));
  }
  const b = await L.launch();
  const s = await L.openSeat(b, 'tablet', { store: await L.storeFor('pg', 'gd', 'G') }); await sleep(6000);
  const p = s.page;
  await shot(p, 's01_papers');
  out.dialog = await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); return d ? { modal: d.getAttribute('aria-modal'), label: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby'), rect: d.getBoundingClientRect().toJSON() } : null; });
  // Where is the Circle tab underneath?
  out.circleTab = await p.evaluate(() => { const els = [...document.querySelectorAll('button,[role=tab],a')].filter(e => /^\s*circle\s*$/i.test(e.innerText || e.getAttribute('aria-label') || '')); return els.map(e => ({ tag: e.tagName, text: e.innerText, rect: e.getBoundingClientRect().toJSON(), topEl: (() => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t ? (t.closest('button')?.innerText || t.tagName).slice(0, 80) : null; })() })); });
  const before = L.sql(`select count(*) from circle_votes where circle_id=${st.camps.G.circleId}`);
  // 1: tap the dimmed backdrop outside the dialog (left gutter)
  const d = out.dialog?.rect;
  await p.touchscreen.tap(10, 600); await sleep(1200);
  out.afterBackdropTap = L.sql(`select count(*) from circle_votes where circle_id=${st.camps.G.circleId}`);
  out.dialogStillOpen = await p.locator('[role=dialog]').count();
  await shot(p, 's02_after_backdrop');
  // 2: tap at the Circle tab's coordinates (what seat.js --tap did)
  if (out.circleTab[0]) { const r = out.circleTab[0].rect; await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await sleep(1200); }
  out.afterTabTap = L.sql(`select vote_type, value from circle_votes where circle_id=${st.camps.G.circleId}`);
  out.outVotes = L.framesOf(s, 'circle_creation_vote', 'out').map(x => x.m.payload);
  await shot(p, 's03_after_tab_tap');
  // 3: Playwright's actionability-checked click on the Circle tab (a real user/locator would be refused)
  try { await p.getByRole('button', { name: /^Circle$/i }).first().click({ timeout: 3000 }); out.locatorClick = 'went through'; } catch (e) { out.locatorClick = 'refused: ' + e.message.split('\n').find(l => /intercepts|covered|not visible|Timeout/.test(l)); }
  out.before = before;
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
