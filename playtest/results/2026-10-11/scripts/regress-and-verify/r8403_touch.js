// Touch drags through CDP, as a finger on a tablet
async function touchDrag(page, from, to, steps = 12) {
  const c = await page.context().newCDPSession(page);
  const pt = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 0.5 }];
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from[0], from[1]) });
  for (let i = 1; i <= steps; i++) {
    const x = from[0] + (to[0] - from[0]) * i / steps, y = from[1] + (to[1] - from[1]) * i / steps;
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y) });
    await new Promise(r => setTimeout(r, 16));
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
  await new Promise(r => setTimeout(r, 300));
}
module.exports = { touchDrag };
