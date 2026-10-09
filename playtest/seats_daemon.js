// Holds one browser open per seat for the whole playtest, so every desk stays connected
// and sees live updates the way a real player's tab would. Each seat's browser is reachable
// over CDP (seat.js connects to it). Everything a seat's page does that might be a bug is
// logged to logs/<seat>.events.jsonl: console errors and warnings, uncaught page errors,
// failed requests, HTTP 4xx/5xx answers, and every WebSocket frame (type and a short body).
const path = require('path');
const fs = require('fs');
const { playwright, chromiumPath, SITE } = require('./lib');
const { chromium, devices } = playwright();

const PT = __dirname;
const SEATS = JSON.parse(fs.readFileSync(path.join(PT, 'seats.json'), 'utf8'));
const EXE = chromiumPath();

const logTo = (seat) => {
  const file = path.join(PT, 'logs', `${seat}.events.jsonl`);
  return (kind, data) => fs.appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), kind, ...data }) + '\n');
};

const short = (s, n = 400) => (typeof s === 'string' ? (s.length > n ? s.slice(0, n) + '…' : s) : s);

const watchPage = (seat, page, log) => {
  const tab = () => page.context().pages().indexOf(page);
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log('console', { tab: tab(), level: m.type(), text: short(m.text(), 800) });
  });
  page.on('pageerror', (e) => log('pageerror', { tab: tab(), text: short(String(e && e.stack || e), 1500) }));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    if (f && /ERR_ABORTED/.test(f.errorText)) return; // navigations and cancelled fetches
    log('requestfailed', { tab: tab(), url: r.url(), error: f && f.errorText });
  });
  page.on('response', async (r) => {
    if (r.status() >= 400) {
      let body = '';
      try { body = short(await r.text(), 500); } catch { /* no body */ }
      log('http', { tab: tab(), status: r.status(), method: r.request().method(), url: r.url(), body });
    }
  });
  page.on('websocket', (ws) => {
    log('ws_open', { tab: tab(), url: ws.url().replace(/token=[^&]+/, 'token=…') });
    const frame = (dir) => (f) => {
      let type = null; let body = f.payload;
      try { const m = JSON.parse(f.payload); type = m.type; body = JSON.stringify(m.payload); } catch { /* not JSON */ }
      log('ws', { tab: tab(), dir, type, body: short(body, 300) });
    };
    ws.on('framesent', frame('out'));
    ws.on('framereceived', frame('in'));
    ws.on('close', () => log('ws_close', { tab: tab() }));
    ws.on('socketerror', (e) => log('ws_error', { tab: tab(), error: String(e) }));
  });
  page.on('dialog', (d) => log('dialog', { tab: tab(), type: d.type(), message: d.message() }));
};

(async () => {
  for (const [seat, cfg] of Object.entries(SEATS)) {
    const log = logTo(seat);
    const base = cfg.device ? devices[cfg.device] : {};
    const context = await chromium.launchPersistentContext(path.join(PT, 'profiles', seat), {
      executablePath: EXE,
      headless: true,
      ...base,
      viewport: cfg.viewport,
      ...(cfg.touch ? { hasTouch: true, isMobile: !!cfg.mobile } : {}),
      args: [`--remote-debugging-port=${cfg.cdp}`, '--autoplay-policy=no-user-gesture-required'],
    });
    context.on('page', (p) => { log('tab_opened', { url: p.url() }); watchPage(seat, p, log); });
    const page = context.pages()[0] || await context.newPage();
    watchPage(seat, page, log);
    await page.goto(cfg.url || `${SITE}/`, { waitUntil: 'domcontentloaded' });
    log('seat_ready', { viewport: cfg.viewport, cdp: cfg.cdp });
    console.log(`${seat} ready on CDP ${cfg.cdp}`);
  }
  console.log('all seats ready');
  // Stay up until killed
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error(e); process.exit(1); });
