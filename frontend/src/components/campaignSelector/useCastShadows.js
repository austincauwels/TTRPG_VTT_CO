import { useLayoutEffect } from 'react';

// Every object on the hub's desk throws its shadow away from the candles (owner's round 3,
// item 25). For each [data-cast] element under root this measures where it lies against the
// middle of the flames (.candle-center) and sets the offset (--sx, --sy) and blur (--sb)
// that its .cast child uses (DeskStyles.jsx). data-cast is the object's height above the
// desk, from about 0.15 (a loose sketch) to 1 (a thick tome): taller objects and objects
// further from the flames throw longer, softer shadows. The offset is turned into the
// object's own frame, so a tilted object still casts straight away from the light. It also
// sets where the flames lie in root's own box (--lx, --ly), which the wood's warmth and
// sheen follow: from lg the candles stand by the tomes, wherever the desk's height puts
// them. Runs again when the page is resized or the desk changes size.
//
// From lg the candles stand at the Case Ledger's left (DeskStyles.jsx, .hub-candles). On a
// desk too narrow for its objects (about 1024 to 1180px wide) the tomes run off its left
// edge, and the candles would go with them off the screen; --candle-nudge moves them right
// just far enough that the wax stands on the leather (CANDLE_WAX_LEFT: where the wax starts
// in the cluster's drawing, as a share of its width). The candles' boxes never transition
// (DeskStyles.jsx), so the place read back here is the place the nudge has just set.
const CANDLE_WAX_LEFT = 0.157;
const LEATHER_MARGIN = 8;
// the hub's free desk (HUB_WIDE in DeskStyles.jsx)
const WIDE = '(min-width: 1024px) and (orientation: landscape)';

function nudgeCandles(root) {
  const art = root.querySelector('.hub-candles > .candle-box svg');
  const leather = root.querySelector('.hub-leather');
  const was = parseFloat(root.style.getPropertyValue('--candle-nudge')) || 0;
  let nudge = 0;
  if (art && leather && window.matchMedia?.(WIDE).matches) {
    const a = art.getBoundingClientRect();
    // where the wax would start without the nudge
    const wax = a.left + a.width * CANDLE_WAX_LEFT - was;
    nudge = Math.max(0, Math.ceil(leather.getBoundingClientRect().left + LEATHER_MARGIN - wax));
  }
  if (nudge !== was) {
    if (nudge) root.style.setProperty('--candle-nudge', `${nudge}px`);
    else root.style.removeProperty('--candle-nudge');
  }
}

export function useCastShadows(rootRef, deps = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const measure = () => {
      nudgeCandles(root);
      const centre = root.querySelector('.candle-center');
      if (!centre) return;
      const c = centre.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      const lx = `${(c.left - box.left).toFixed(1)}px`;
      const ly = `${(c.top - box.top).toFixed(1)}px`;
      if (root.style.getPropertyValue('--lx') !== lx) root.style.setProperty('--lx', lx);
      if (root.style.getPropertyValue('--ly') !== ly) root.style.setProperty('--ly', ly);
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
    // The candles also move when the tomes' row or the candles' strip changes size inside a
    // desk that does not (the tomes' covers filling in, the Last Played tome arriving)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(root);
    root.querySelectorAll('.hub-candles, .hub-tomes').forEach((el) => ro?.observe(el));
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
