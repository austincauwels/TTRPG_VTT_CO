const L = require('./lib'); const { sleep, shot } = L;
(async () => { const b = await L.launch(); const s = await L.desk(b, process.argv[3] || 'phone', process.argv[2], process.argv[2], 'S'); await shot(s.page, 'e18_' + process.argv[2] + '_now');
 console.log(await s.page.evaluate(() => [...document.querySelectorAll('div.fixed')].map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean))); console.log(s.errors); await b.close(); })();
