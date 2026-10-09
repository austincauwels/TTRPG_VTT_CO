// What the playtest scripts share: where Playwright, Chromium and the site are.
//   PLAYWRIGHT_MODULE  path to a playwright package (default: ./node_modules/playwright, after npm install)
//   CHROMIUM_PATH      the browser (default: the newest /opt/pw-browsers/chromium-*/chrome-linux/chrome)
//   SITE_URL           the copy of the site under test (default http://127.0.0.1:4300)
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

module.exports = { playwright, chromiumPath, SITE };
