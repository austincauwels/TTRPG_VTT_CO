import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A dispatch typing in, like a letter coming off the typewriter. Give it the lines of the
// text; it returns how many characters of them to show and whether it is still typing.
// What is there when the desk opens shows whole at once: only a change that arrives while
// the desk is open (the GM sends a new dispatch) types in, at about cps characters a
// second. Under prefers-reduced-motion everything shows whole. The full text is always in
// the page for assistive technology; callers hide only the typed copy from it.
export function useTypedText(lines, { cps = 42, settleMs = 1500 } = {}) {
  const text = lines.join('\u0000');
  const total = lines.reduce((n, l) => n + l.length, 0);
  const [shown, setShown] = useState(total);
  const mountedAt = useRef(Date.now());
  const previous = useRef(text);

  useEffect(() => {
    if (previous.current === text) return undefined;
    previous.current = text;
    // Data still settling when the desk opens, or no motion wanted: show it whole
    if (Date.now() - mountedAt.current < settleMs || prefersReducedMotion() || total === 0) {
      setShown(total);
      return undefined;
    }
    setShown(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now) => {
      const n = Math.min(total, Math.floor(((now - start) / 1000) * cps));
      setShown(n);
      if (n < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);

  // Split the shown count back over the lines
  let left = Math.min(shown, total);
  const parts = lines.map((l) => {
    const take = Math.min(l.length, left);
    left -= take;
    return l.slice(0, take);
  });
  return { parts, typing: shown < total };
}
