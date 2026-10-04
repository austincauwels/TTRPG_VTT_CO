// Hand-placed paper objects (cards, notes, slips) sit slightly crooked on the desk, as if
// someone laid them there (owner's choice, Robert Gater, 2026-10-04). The tilt is fixed per
// object: the same key always gets the same angle, so nothing moves between renders or
// reloads, and an object keeps its angle when the list around it changes.
//
// tiltFor(key)                 -> between 0.5 and 2 degrees, either way, from the key alone
// tiltFor(key, { sign: -1 })   -> the same size, leaning the given way (for lists that
//                                 alternate, so two neighbours never lean alike)
export function tiltFor(key, { min = 0.5, max = 2, sign = 0 } = {}) {
  const s = String(key ?? '');
  // FNV-1a: small, fast and well spread for short ids
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const size = min + ((h % 997) / 996) * (max - min);
  const dir = sign ? Math.sign(sign) : ((h >>> 11) & 1 ? 1 : -1);
  return Math.round(dir * size * 10) / 10;
}

// The same tilt as a CSS custom property, for elements that use the .hand-placed class
// (index.css), which also eases the tilt on phones.
export const tiltStyle = (key, opts) => ({ '--tilt': `${tiltFor(key, opts)}deg` });
