import { useLayoutEffect } from 'react';

// Every object on the hub's desk throws its shadow away from the candles (owner's round 3,
// item 25). For each [data-cast] element under root this measures where it lies against the
// middle of the flames (.candle-center) and sets the offset (--sx, --sy) and blur (--sb)
// that its .cast child uses (DeskStyles.jsx). data-cast is the object's height above the
// desk, from about 0.15 (a loose sketch) to 1 (a thick tome): taller objects and objects
// further from the flames throw longer, softer shadows. The offset is turned into the
// object's own frame, so a tilted object still casts straight away from the light. Runs
// again when the page is resized or the desk changes size.
export function useCastShadows(rootRef, deps = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const measure = () => {
      const centre = root.querySelector('.candle-center');
      if (!centre) return;
      const c = centre.getBoundingClientRect();
      root.querySelectorAll('[data-cast]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        let dx = r.left + r.width / 2 - c.left;
        let dy = r.top + r.height / 2 - c.top;
        const dist = Math.hypot(dx, dy) || 1;
        dx /= dist;
        dy /= dist;
        const h = parseFloat(el.dataset.cast) || 0.3;
        const len = Math.min(34, h * (8 + dist * 0.032));
        // into the element's own (rotated) frame
        const t = getComputedStyle(el).transform;
        let ang = 0;
        if (t && t !== 'none') {
          const m = new DOMMatrixReadOnly(t);
          ang = Math.atan2(m.b, m.a);
        }
        const lx = dx * Math.cos(-ang) - dy * Math.sin(-ang);
        const ly = dx * Math.sin(-ang) + dy * Math.cos(-ang);
        el.style.setProperty('--sx', `${(lx * len).toFixed(1)}px`);
        el.style.setProperty('--sy', `${(ly * len).toFixed(1)}px`);
        el.style.setProperty('--sb', `${(4 + len * 0.75).toFixed(1)}px`);
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(root);
    window.addEventListener('resize', schedule);
    // Web fonts can move things once they land
    document.fonts?.ready?.then(schedule).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
