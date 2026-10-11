// What the playtest scripts share: where Playwright, Chromium and the site are.
//   PLAYWRIGHT_MODULE  path to a playwright package (default: ./node_modules/playwright, after npm install)
//   CHROMIUM_PATH      the browser (default: the newest /opt/pw-browsers/chromium-*/chrome-linux/chrome)
//   SITE_URL           the copy of the site under test (default http://127.0.0.1:4300)
//   CANDELA_BETA_USER, CANDELA_BETA_PASS
//                      the beta site's password (HTTP basic auth), when SITE_URL is the beta
//   SEATS_FILE         which seats to open (default seats.json beside this file)
const fs = require('fs');
const path = require('path');

const playwright = () => require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const chromiumPath = () => {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const d of dirs) {
      const exe = path.join(root, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch { /* no preinstalled browsers */ }
  return undefined; // Playwright's own download
};

const SITE = (process.env.SITE_URL || 'http://127.0.0.1:4300').replace(/\/$/, '');

// Basic auth for the beta site, sent only to the site's own origin (never to fonts or other hosts)
const httpCredentials = () => (process.env.CANDELA_BETA_USER && process.env.CANDELA_BETA_PASS
  ? { username: process.env.CANDELA_BETA_USER, password: process.env.CANDELA_BETA_PASS, origin: new URL(SITE).origin, send: 'always' }
  : undefined);

const seatsFile = () => path.resolve(__dirname, process.env.SEATS_FILE || 'seats.json');

module.exports = { playwright, chromiumPath, SITE, httpCredentials, seatsFile };
