// Shared helpers for the recheck browser checks (site 4458, API 8458, database candela_v8458)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/home/user/pt2/node_modules/playwright');

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SITE = 'http://127.0.0.1:4458';
const API = 'http://127.0.0.1:8458';
const DIR = __dirname;
const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const STATE = path.join(DIR, 'v8458_state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const PW = 'Passw0rd-recheck-1';

const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  laptop: { viewport: { width: 1366, height: 768 } },
  wide: { viewport: { width: 1440, height: 900 } },
};

const sql = (q) => execSync(`psql -h localhost -p 5433 -U postgres -d candela_v8458 -At -c ${JSON.stringify(q)}`).toString().trim();

// A fresh client address for each call, so the per-IP rate limits do not bite (uvicorn
// trusts X-Forwarded-For from 127.0.0.1)
let ipn = 1000 + Math.floor(Math.random()*50000);
const fwdIp = () => { ipn += 1; return `10.77.${(ipn >> 8) & 255}.${ipn & 255}`; };
const api = async (method, url, token, body) => {
  const r = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': fwdIp(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) { const e = new Error(`${method} ${url} ${r.status} ${t.slice(0, 300)}`); e.status = r.status; e.body = j; throw e; }
  return j;
};

const launch = () => chromium.launch({ executablePath: EXE, headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The store a desk opens with
async function storeFor(who, charKey, campKey) {
  const u = state.users[who];
  const camp = state.camps[campKey];
  if (!charKey) {
    return { accessSession: { role: 'GM', name: u.name, userId: u.userId, campaignCode: camp.code, campaignId: camp.id, token: u.token },
      stage: 'GM_DASH', lastPlayedCampaign: { type: 'gm', campaignCode: camp.code, campaignName: camp.name, campaignId: camp.id } };
  }
  const ch = state.chars[charKey];
  const sheet = await api('GET', `/api/investigators/${ch.id}`, u.token);
  return { accessSession: { role: 'PLAYER', name: u.name, userId: u.userId, campaignCode: camp.code, campaignId: camp.id, token: u.token },
    stage: 'DESK', character: sheet, lastPlayedCampaign: { type: 'player', characterId: ch.id, campaignCode: camp.code, campaignName: camp.name, campaignId: camp.id } };
}

// A seat: a context and a page. opts.store: the store to seed (guarded by sessionStorage);
// opts.init: more init scripts. Every WebSocket goes through routeWebSocket:
// seat.stall = true holds every frame the page sends on the socket open now (they never
// reach the server); each socket gets its own record in seat.sockets.
async function openSeat(browser, device, opts = {}) {
  const ctx = await browser.newContext({ ...DEVICES[device] });
  if (opts.store) {
    await ctx.addInitScript((s) => {
      if (!/^http/.test(location.href)) return;
      try {
        if (!sessionStorage.getItem('seeded-8458')) {
          localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 }));
          sessionStorage.setItem('seeded-8458', '1');
        }
      } catch { /* storage off */ }
    }, opts.store);
  }
  for (const s of opts.init || []) await ctx.addInitScript(s.fn, s.arg);
  const page = await ctx.newPage();
  const seat = { ctx, page, device, frames: [], errors: [], sockets: [], console: [] };
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => seat.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { seat.console.push(`${m.type()}: ${m.text()}`); if (m.type() === 'error') seat.errors.push(`console: ${m.text()}`); });
  // Sign-ins from the page get their own client address too
  await page.route(/\/api\/auth\/(login|register)/, (route) => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': fwdIp() } }));
  await page.routeWebSocket(/\/ws\//, (ws) => {
    const rec = { url: ws.url(), n: seat.sockets.length, stalled: false, held: [], openedAt: Date.now(), closedAt: null };
    seat.sockets.push(rec);
    seat.frames.push({ t: Date.now(), dir: 'open', sock: rec.n, msg: ws.url() });
    const server = ws.connectToServer();
    rec.server = server; rec.ws = ws;
    ws.onMessage((msg) => {
      const m = String(msg);
      seat.frames.push({ t: Date.now(), dir: 'out', sock: rec.n, msg: m, held: rec.stalled });
      if (rec.stalled) { rec.held.push(m); return; }
      server.send(m);
    });
    server.onMessage((msg) => { seat.frames.push({ t: Date.now(), dir: 'in', sock: rec.n, msg: String(msg) }); try { ws.send(msg); } catch {} });
    ws.onClose((code, reason) => { rec.closedAt = Date.now(); seat.frames.push({ t: Date.now(), dir: 'close', sock: rec.n, msg: `page ${code}` }); try { server.close({ code, reason }); } catch {} });
    server.onClose((code, reason) => { seat.frames.push({ t: Date.now(), dir: 'close', sock: rec.n, msg: `server ${code}` }); try { ws.close({ code, reason }); } catch {} });
  });
  if (opts.goto !== false) await page.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  return seat;
}

const parsed = (seat, dir = 'in', from = 0) => seat.frames.slice(from).filter((f) => f.dir === dir)
  .map((f) => { try { return { t: f.t, sock: f.sock, held: f.held, m: JSON.parse(f.msg) }; } catch { return null; } }).filter(Boolean);
const framesOf = (seat, type, dir = 'in', from = 0) => parsed(seat, dir, from).filter((x) => x.m.type === type);

// A Node socket on a channel (a character id, or a campaign code for the Lightkeeper)
function wsOpen(channel, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:8458/ws/${channel}`, ['candela', `bearer.${token}`]);
    const client = { ws, frames: [], send: (type, payload) => ws.send(JSON.stringify({ type, payload })), close: () => { try { ws.close(); } catch {} } };
    ws.onmessage = (e) => { try { client.frames.push(JSON.parse(e.data)); } catch {} };
    ws.onopen = () => resolve(client);
    ws.onerror = (e) => reject(new Error(`ws error ${channel}`));
  });
}

// Lets go of any mark the server still holds for a character (declines its open offer),
// then resets the sheet in SQL
const drain = (charKey, ownerKey) => new Promise((resolve) => {
  const ch = state.chars[charKey];
  const ws = new WebSocket(`ws://127.0.0.1:8458/ws/${ch.id}`, ['candela', `bearer.${state.users[ownerKey].token}`]);
  let quiet;
  const done = () => { try { ws.close(); } catch {} resolve(); };
  const arm = () => { clearTimeout(quiet); quiet = setTimeout(done, 1500); };
  ws.onopen = arm;
  ws.onmessage = (e) => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.type === 'ability_mark_offer' && !m.payload.intercept) {
      ws.send(JSON.stringify({ type: 'resolve_ability_mark', payload: { ability: m.payload.ability, choice: 'decline', mark_type: m.payload.mark_type, offer_id: m.payload.offer_id } }));
    }
    arm();
  };
  ws.onerror = done;
  setTimeout(done, 8000);
});
const resetChar = (id, fields = {}) => {
  const base = { body_marks: 0, brain_marks: 0, bleed_marks: 0, scars_count: 0, scars_list: "'[]'", incapacitated: false, is_dead: false,
    ability_uses: "'{}'", nerve_resistance_spent: 0, cunning_resistance_spent: 0, intuition_resistance_spent: 0 };
  const all = { ...base, ...fields };
  const set = Object.entries(all).map(([k, v]) => `${k}=${typeof v === 'string' && !v.startsWith("'") ? `'${v}'` : v}`).join(', ');
  sql(`update characters set ${set} where id=${id}`);
};
const fresh = async (charKey, ownerKey, fields) => { await drain(charKey, ownerKey); resetChar(state.chars[charKey].id, fields); };

// A track's three boxes: F filled, H held, E empty
const trackState = (page, name) => page.evaluate((nm) => {
  const g = [...document.querySelectorAll('[role=group]')].find((e) => (e.getAttribute('aria-label') || '').startsWith(`${nm} marks:`));
  if (!g) return null;
  const boxes = [...g.querySelectorAll('span.block')];
  const cls = (b) => b.className.split(/\s+/);
  return { label: g.getAttribute('aria-label'), boxes: boxes.map((b) => (cls(b).includes('bg-oxblood/45') ? 'H' : cls(b).includes('bg-oxblood') ? 'F' : 'E')).join(''),
    dashed: boxes.map((b) => cls(b).includes('border-dashed')) };
}, name);

const shot = async (page, name, opts = {}) => { const p = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: p, ...opts }); return p; };

// Signs in through the login slip; leaves the page on the hub
async function signIn(page, who) {
  const u = state.users[who];
  await page.locator('#username').waitFor({ timeout: 15000 });
  await page.fill('#username', u.username);
  await page.fill('#password', PW);
  await page.locator('button[type=submit]', { hasText: /^Sign in$/ }).click();
  await page.locator('.hub-tomes').waitFor({ timeout: 15000 });
  await sleep(1000);
}

// From the hub: the Case Ledger, then a campaign or character by name
async function openFromLedger(page, name, wait = 3000) {
  await page.getByRole('button', { name: /Case Ledger/ }).first().click();
  await sleep(1000);
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  await sleep(wait);
}

const results = [];
const check = (item, name, ok, evidence) => {
  results.push({ item, check: name, result: ok === null ? 'not_run' : ok ? 'pass' : 'fail', evidence: typeof evidence === 'string' ? evidence : JSON.stringify(evidence) });
  console.log(`${ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL'} [${item}] ${name} :: ${typeof evidence === 'string' ? evidence : JSON.stringify(evidence)}`);
};
const saveResults = (file) => fs.writeFileSync(path.join(DIR, file), JSON.stringify(results, null, 1));

module.exports = { launch, openSeat, storeFor, parsed, framesOf, wsOpen, drain, resetChar, fresh, trackState, shot, signIn, openFromLedger,
  check, results, saveResults, sql, api, state, sleep, SITE, API, DEVICES, PW, STATE, DIR, fwdIp };
