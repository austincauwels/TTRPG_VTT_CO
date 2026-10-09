#!/usr/bin/env node
// Drive one seat's browser (held open by seats_daemon.js) from the command line.
//   node seat.js <seat> <command> [args...] [--tab N] [--nth N] [--timeout ms]
// Run with no command for the list. Every command prints what it did; a failure prints why
// and exits 1. The browser is never closed by this script.
const path = require('path');
const fs = require('fs');
const { playwright, chromiumPath, SITE } = require('./lib');
const { chromium } = playwright();

const PT = __dirname;
const SEATS = JSON.parse(fs.readFileSync(path.join(PT, 'seats.json'), 'utf8'));
const HELP = `Commands:
  look [label]               screenshot of the screen (prints its path: Read it) and an outline of what is on it
  full [label]               full-page screenshot
  outline [--all]            the accessibility outline only (--all: no line limit)
  click <target>             click (add --tap on a touch seat to tap, --force to skip checks, --dbl for a double click)
  fill <target> <text>       clear a field and type into it
  type <text>                type at the focused element
  press <key>                e.g. Enter, Escape, Tab, Control+a
  select <target> <option>   pick an option of a <select> by its label or value
  check <target> | uncheck <target>
  hover <target>
  scroll <dy> [target]       scroll the page (or a scrollable element) by dy pixels
  drag <fromTarget> <toTarget>
  goto <url-or-path> | reload | back
  eval <js>                  evaluate an expression in the page, prints the JSON result
  run <script.js>            module.exports = async ({ page, context, seat, shot, log }) => {...}
  errors                     console errors, page errors, failed requests and HTTP errors since the last 'errors'
  ws [n]                     the last n WebSocket frames this seat sent or received (default 20)
  tabs | newtab [url] | closetab N
  offline on|off             drop or restore this seat's network (all its tabs)
  wait <ms>                  let time pass (up to 120000 ms), e.g. while your network is down
  resize WxH                 change the screen size
Targets: button:Name  link:Name  tab:Name  checkbox:Name  radio:Name  textbox:Name  combobox:Name
  heading:Name  label:Text  placeholder:Text  text:Text  alt:Text  title:Text  testid:id
  role:<role>:Name  css:<selector>  or any Playwright selector. Names match substrings, case-insensitive;
  add '=' after the colon for an exact match (button:=Roll). --nth N picks the Nth match (0-based).`;

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const bool = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const tabIx = Number(flag('--tab') ?? 0);
const nth = flag('--nth');
const timeout = Number(flag('--timeout') ?? 8000);
const tap = bool('--tap'), force = bool('--force'), dbl = bool('--dbl'), all = bool('--all');
const [seat, cmd, ...rest] = args;

const fail = (msg) => { console.error(`FAILED: ${msg}`); process.exit(1); };
if (!seat || !SEATS[seat]) fail(`unknown seat '${seat}'. Seats: ${Object.keys(SEATS).join(', ')}\n${HELP}`);
if (!cmd) { console.log(HELP); process.exit(0); }

const shotDir = path.join(PT, 'shots', seat);
fs.mkdirSync(shotDir, { recursive: true });
const counterFile = path.join(shotDir, '.n');
const nextShot = (label) => {
  const n = (Number(fs.existsSync(counterFile) ? fs.readFileSync(counterFile, 'utf8') : 0) || 0) + 1;
  fs.writeFileSync(counterFile, String(n));
  const safe = String(label || 'shot').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 50);
  return path.join(shotDir, `${String(n).padStart(3, '0')}_${safe}.png`);
};

const ROLES = { button: 'button', link: 'link', tab: 'tab', checkbox: 'checkbox', radio: 'radio', textbox: 'textbox',
  combobox: 'combobox', heading: 'heading', switch: 'switch', menuitem: 'menuitem', option: 'option', dialog: 'dialog', slider: 'slider', img: 'img' };
const locate = (page, target) => {
  if (!target) fail('no target given');
  let loc;
  const m = /^([a-z]+):(.*)$/s.exec(target);
  const nameOpt = (s) => (s.startsWith('=') ? { name: s.slice(1), exact: true } : { name: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
  const textOpt = (s) => (s.startsWith('=') ? [s.slice(1), { exact: true }] : [s]);
  if (m && ROLES[m[1]]) loc = m[2] === '' ? page.getByRole(ROLES[m[1]]) : page.getByRole(ROLES[m[1]], nameOpt(m[2]));
  else if (m && m[1] === 'role') { const [r, ...n] = m[2].split(':'); const nm = n.join(':'); loc = nm ? page.getByRole(r, nameOpt(nm)) : page.getByRole(r); }
  else if (m && m[1] === 'label') loc = page.getByLabel(...textOpt(m[2]));
  else if (m && m[1] === 'placeholder') loc = page.getByPlaceholder(...textOpt(m[2]));
  else if (m && m[1] === 'text') loc = page.getByText(...textOpt(m[2]));
  else if (m && m[1] === 'alt') loc = page.getByAltText(...textOpt(m[2]));
  else if (m && m[1] === 'title') loc = page.getByTitle(...textOpt(m[2]));
  else if (m && m[1] === 'testid') loc = page.getByTestId(m[2]);
  else if (m && m[1] === 'css') loc = page.locator(m[2]);
  else loc = page.locator(target);
  return loc;
};
// One element: the --nth match, or the only visible match; several visible matches are listed
const one = async (page, target) => {
  const loc = locate(page, target);
  if (nth != null) return loc.nth(Number(nth));
  const count = await loc.count();
  if (count === 0) fail(`nothing matches ${target}`);
  if (count === 1) return loc;
  const visible = [];
  for (let i = 0; i < Math.min(count, 30); i++) if (await loc.nth(i).isVisible().catch(() => false)) visible.push(i);
  if (visible.length === 1) return loc.nth(visible[0]);
  const lines = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    const el = loc.nth(i);
    const vis = await el.isVisible().catch(() => false);
    const txt = (await el.innerText({ timeout: 500 }).catch(() => '') || await el.getAttribute('aria-label').catch(() => '') || '').replace(/\s+/g, ' ').slice(0, 80);
    lines.push(`  --nth ${i}${vis ? '' : ' (hidden)'}: ${txt}`);
  }
  fail(`${count} elements match ${target}; pick one with --nth:\n${lines.join('\n')}`);
};

const outline = async (page, limit) => {
  let snap = '';
  try { snap = await page.locator('body').ariaSnapshot({ timeout: 5000 }); } catch (e) { snap = `(no outline: ${e.message.split('\n')[0]})`; }
  const lines = snap.split('\n');
  if (limit && lines.length > limit) return lines.slice(0, limit).join('\n') + `\n… ${lines.length - limit} more lines (outline --all for everything)`;
  return snap;
};

const eventsFile = path.join(PT, 'logs', `${seat}.events.jsonl`);
const readEvents = () => (fs.existsSync(eventsFile) ? fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const PROBLEMS = new Set(['console', 'pageerror', 'requestfailed', 'http', 'ws_error', 'dialog']);
const newProblems = () => {
  const mark = path.join(PT, 'logs', `${seat}.errors_seen`);
  const seen = Number(fs.existsSync(mark) ? fs.readFileSync(mark, 'utf8') : 0) || 0;
  const evs = readEvents();
  fs.writeFileSync(mark, String(evs.length));
  return evs.slice(seen).filter((e) => PROBLEMS.has(e.kind));
};

(async () => {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${SEATS[seat].cdp}`, { timeout: 10000 });
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages[tabIx] || fail(`no tab ${tabIx} (there are ${pages.length})`);
  page.setDefaultTimeout(timeout);
  const shot = async (label, opts = {}) => { const p = nextShot(label); await page.screenshot({ path: p, ...opts }); return p; };
  const log = (...a) => console.log(...a);
  const settle = () => page.waitForTimeout(600);
  const a0 = rest[0], a1 = rest.slice(1).join(' ');
  switch (cmd) {
    case 'look': case 'full': {
      const p = await shot(a0 || cmd, { fullPage: cmd === 'full' });
      log(`screenshot: ${p}`);
      log(`url: ${page.url()}  tab ${tabIx} of ${pages.length}  viewport ${JSON.stringify(page.viewportSize())}`);
      log(await outline(page, 220));
      const probs = newProblems();
      if (probs.length) log(`\n!! ${probs.length} new console/page/network problem(s) since last check; run 'errors' to see them`);
      break;
    }
    case 'outline': log(await outline(page, all ? 0 : 220)); break;
    case 'click': {
      const el = await one(page, a0);
      if (tap) {
        // A real touch through CDP (the browser has touch on; this client's own tap() refuses
        // because it did not launch the context)
        await el.scrollIntoViewIfNeeded({ timeout });
        const b = await el.boundingBox();
        if (!b) fail(`${a0} is not visible`);
        const x = b.x + b.width / 2, y = b.y + b.height / 2;
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      else if (dbl) await el.dblclick({ force, timeout });
      else await el.click({ force, timeout });
      await settle(); log(`${tap ? 'tapped' : dbl ? 'double-clicked' : 'clicked'} ${a0}`); break;
    }
    case 'fill': { const el = await one(page, a0); await el.fill(a1, { timeout }); log(`filled ${a0}`); break; }
    case 'type': await page.keyboard.type(rest.join(' '), { delay: 15 }); log('typed'); break;
    case 'press': await page.keyboard.press(a0); await settle(); log(`pressed ${a0}`); break;
    case 'select': { const el = await one(page, a0); const v = await el.selectOption(a1).catch(async () => el.selectOption({ label: a1 })); log(`selected ${JSON.stringify(v)} in ${a0}`); break; }
    case 'check': case 'uncheck': { const el = await one(page, a0); await el[cmd]({ timeout, force }); log(`${cmd}ed ${a0}`); break; }
    case 'hover': { const el = await one(page, a0); await el.hover({ timeout, force }); await settle(); log(`hovering ${a0}`); break; }
    case 'scroll': {
      const dy = Number(a0) || 400;
      if (rest[1]) { const el = await one(page, rest.slice(1).join(' ')); await el.evaluate((n, d) => n.scrollBy(0, d), dy); }
      else await page.mouse.wheel(0, dy);
      await settle(); log(`scrolled ${dy}`); break;
    }
    case 'drag': { const a = await one(page, a0); const b = await one(page, rest[1]); await a.dragTo(b, { timeout }); log('dragged'); break; }
    case 'goto': { const url = /^https?:/.test(a0) ? a0 : `${SITE}${a0.startsWith('/') ? '' : '/'}${a0}`; await page.goto(url, { waitUntil: 'domcontentloaded' }); await settle(); log(`at ${page.url()}`); break; }
    case 'reload': await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); log('reloaded'); break;
    case 'back': await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null); await settle(); log(`back: ${page.url()}`); break;
    case 'eval': { const r = await page.evaluate(rest.join(' ')); log(JSON.stringify(r, null, 1)); break; }
    case 'run': {
      const file = path.resolve(a0);
      delete require.cache[file];
      const fn = require(file);
      const r = await fn({ page, context, seat, shot, log, locate: (t) => locate(page, t) });
      if (r !== undefined) log(JSON.stringify(r, null, 1));
      break;
    }
    case 'errors': {
      const probs = newProblems();
      if (!probs.length) log('no new problems');
      for (const e of probs) log(JSON.stringify(e));
      break;
    }
    case 'ws': {
      const n = Number(a0) || 20;
      for (const e of readEvents().filter((x) => x.kind === 'ws' || x.kind === 'ws_open' || x.kind === 'ws_close').slice(-n)) log(`${e.t.slice(11, 19)} ${e.kind === 'ws' ? `${e.dir} ${e.type}: ${e.body}` : e.kind}`);
      break;
    }
    case 'tabs': pages.forEach((p, i) => log(`${i}: ${p.url()}`)); break;
    case 'newtab': { const p = await context.newPage(); await p.goto(a0 || `${SITE}/`, { waitUntil: 'domcontentloaded' }); log(`opened tab ${context.pages().length - 1}`); break; }
    case 'closetab': { const p = pages[Number(a0)]; if (!p) fail('no such tab'); if (pages.length === 1) fail('cannot close the last tab'); await p.close(); log('closed'); break; }
    case 'offline': await context.setOffline(a0 === 'on'); log(`network ${a0 === 'on' ? 'down' : 'up'}`); break;
    case 'wait': { const ms = Math.min(120000, Number(a0) || 1000); await page.waitForTimeout(ms); log(`waited ${ms} ms`); break; }
    case 'resize': { const [w, h] = a0.split('x').map(Number); await page.setViewportSize({ width: w, height: h }); log(`resized to ${w}x${h}`); break; }
    default: fail(`unknown command ${cmd}\n${HELP}`);
  }
  process.exit(0);
})().catch((e) => fail(String(e && e.message || e).split('\n').slice(0, 6).join('\n')));
