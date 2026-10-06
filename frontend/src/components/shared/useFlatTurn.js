import { useCallback, useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const easeInOutSine = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
// cubic-bezier(0.22, 1, 0.36, 1): fast onto its edge, slow to lie flat again
export const easeOutQuint = (t) => 1 - (1 - t) ** 5;

// A card turned over flat, in two dimensions: it narrows to its edge, shows its other face
// and widens again, drawn by script frame by frame. At rest only the face that is up is
// drawn and nothing carries a 3D transform. WebKit (Safari) drew 3D flips out of place: a
// turned card in the circle papers' columns over the papers of the first column, the
// Your Circle cards and the Lightkeeper's railway ticket with their backs mirrored over
// their fronts at rest (iPad pass, 2026-10-05). A transform set on each frame by script is
// painted where the card lies.
//
// ref goes on the element that narrows. turn(swap) runs swap() as the card stands on its
// edge (at once under reduced motion, with no turning); swap sets which face is up. A turn
// started during another one takes over from it. onFrame(scale) follows each frame, null
// once the card lies flat, for anything that narrows with the card (its shadow). layer
// gives the card a layer of its own while it turns, so a costly paper is drawn once and
// only moved (the hub's ticket, The Smooth Hub Rule); never in the circle papers' columns,
// where WebKit draws a layer in the wrong column.
export function useFlatTurn({ ms = 400, ease = easeInOutSine, onFrame, layer = false } = {}) {
  const ref = useRef(null);
  const raf = useRef(0);
  const follow = useRef(onFrame);
  follow.current = onFrame;
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const turn = useCallback((swap) => {
    const el = ref.current;
    cancelAnimationFrame(raf.current);
    const paint = (scale) => {
      if (el) {
        el.style.transform = scale == null ? '' : `scaleX(${scale.toFixed(3)})`;
        if (layer) el.style.willChange = scale == null ? '' : 'transform';
      }
      follow.current?.(scale);
    };
    if (!el || prefersReducedMotion()) { paint(null); swap(); return; }
    const start = performance.now();
    let swapped = false;
    const frame = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = ease(t);
      if (!swapped && e >= 0.5) { swapped = true; swap(); }
      paint(t < 1 ? Math.max(0.002, Math.abs(Math.cos(e * Math.PI))) : null);
      if (t < 1) raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [ms, ease, layer]);

  return { ref, turn };
}
