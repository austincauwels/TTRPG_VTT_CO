// ws-token-in-url: socket URLs and the console during failed reconnects (laptop 1366x768)
const fs = require('fs');
const { execSync } = require('child_process');
const L = require('./r8406_lib');
const { sleep, shot, state } = L;
const { chromium } = require('/home/user/pt2/node_modules/playwright');
const out = { wsUrls: [], console: [] };
(async () => {
  const b = await L.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const store = await L.storeFor('pb', 'b', 'S');
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('sd')) { localStorage.setItem('candela-vtt-storage', JSON.stringify({ state: s, version: 0 })); sessionStorage.setItem('sd', '1'); } } catch {} }, store);
  const page = await ctx.newPage();
  page.on('console', m => out.console.push(`${m.type()}: ${m.text()}`));
  page.on('websocket', ws => out.wsUrls.push(ws.url()));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const hs = [];
  cdp.on('Network.webSocketWillSendHandshakeRequest', e => hs.push(e.request.headers));
  cdp.on('Network.webSocketHandshakeResponseReceived', e => hs.push({ resp: e.response.headers }));
  await cdp.send('Log.enable');
  cdp.on('Log.entryAdded', e => out.console.push(`log: ${e.entry.text}`));
  await page.goto(L.SITE + '/'); await sleep(5000);
  // the backend goes away for a while
  const pid = fs.readFileSync('/home/user/pt2/verify/out_8406/api.pid', 'utf8').trim();
  execSync(`kill ${pid}`);
  await sleep(14000);
  await shot(page, 'd01_backend_down');
  out.banner = await page.evaluate(() => [...document.querySelectorAll('[role=status]')].map(e => e.innerText.replace(/\s+/g, ' ')).filter(t => /connect/i.test(t)));
  out.handshakes = hs.map(h => JSON.stringify(h).replace(/bearer\.[A-Za-z0-9._-]+/g, m => `bearer.<${m.length - 7} chars>`)).slice(0, 4);
  out.tokenInUrl = out.wsUrls.some(u => /token=/.test(u));
  out.tokenInConsole = out.console.some(c => c.includes(state.users.pb.token.slice(0, 20)) || /token=/.test(c));
  out.consoleWs = out.console.filter(c => /WebSocket/i.test(c)).slice(0, 4);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
