import React, { useId } from 'react';

// An oxblood wax seal, drawn in SVG: a lumpy pool of wax, a recessed field inside a raised
// rim, and a candle in its holder standing up from the field in relief. The lamp is at the
// upper left, so every raised edge catches light on its upper left side and casts a dark
// edge to the lower right; the two edges are what make the mark readable at small sizes.
// pressed plays the press once when the seal first appears (index.css, .seal-press; still
// under reduced motion). Decorative: the words beside it say what was sealed.
//   size     the drawn size in px (the width and height attributes)
//   minSize  the smallest size it is shown at when CSS resizes it (phones); the relief
//            edges are set from it, so they stay about a pixel wide on screen
const BLOB = 'M44.7 21.8Q46.1 24 45.5 26.4Q44.8 28.8 44.1 31Q43.4 33.3 41.6 35Q39.8 36.6 37.9 37.9Q36.1 39.2 34.5 40.9Q32.9 42.5 30.6 42.7Q28.3 42.8 26.1 43.2Q24 43.5 21.9 43Q19.8 42.6 17.7 41.9Q15.7 41.2 13.1 41.1Q10.4 41 8.7 39.3Q6.9 37.6 5.5 35.6Q4.1 33.6 4 31.1Q3.9 28.6 4.8 26.3Q5.7 24 5.6 21.9Q5.4 19.8 6.2 17.8Q7 15.8 7.6 13.6Q8.2 11.4 9.6 9.5Q10.9 7.6 13.2 6.9Q15.4 6.1 17.3 4.8Q19.3 3.4 21.7 3.3Q24 3.1 26.4 3.1Q28.8 3.2 31 4Q33.2 4.8 34.4 7.1Q35.6 9.4 37.1 10.9Q38.5 12.4 39.5 14.2Q40.5 16.1 41.9 17.8Q43.2 19.6 44.7 21.8Z';
// A candle in its holder: flame, wick, candle, saucer and the ring of its handle
const EMBLEM = 'M24 11.2c2.4 2.7 3.3 4.8 2.7 6.5-.5 1.3-1.5 2-2.7 2s-2.2-.7-2.7-2c-.6-1.7.3-3.8 2.7-6.5zM23.6 19.6h.8v1.2h-.8zM20.6 21.6q1.7-.9 3.4-.3t3.4 0V31.6H20.6zM15.4 32.4a8.6 2.3 0 1 0 17.2 0a8.6 2.3 0 1 0 -17.2 0zM32 31.6a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0zM33 31.6a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0z';

const LIGHT = 'rgba(255, 214, 196, 0.62)';
const SHADE = 'rgba(28, 6, 3, 0.78)';

export const WaxSeal = ({ size = 40, minSize = size, pressed = false, className = '', style }) => {
  const id = useId().replace(/:/g, '');
  // About one screen pixel in seal units, at the smallest size the seal is shown
  const lift = Math.min(1.4, Math.max(0.5, (48 / Math.max(16, minSize)) * 1.05));
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false"
      className={`shrink-0 ${pressed ? 'seal-press' : ''} ${className}`} style={style}>
      <defs>
        <radialGradient id={`${id}-wax`} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#9a2d22" />
          <stop offset="0.55" style={{ stopColor: 'rgb(var(--c-oxblood))' }} />
          <stop offset="1" stopColor="#4a0f0a" />
        </radialGradient>
        {/* The top of the raised mark: lit at the upper left, falling off to the lower right */}
        <linearGradient id={`${id}-relief`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#c0503d" />
          <stop offset="0.55" stopColor="#a13a2b" />
          <stop offset="1" stopColor="#7c2419" />
        </linearGradient>
      </defs>
      <path d={BLOB} transform="translate(1.6 2.2)" fill="rgba(0,0,0,0.38)" />
      <path d={BLOB} fill={`url(#${id}-wax)`} />

      {/* The field inside the rim, pressed down, its upper left inner edge in shadow */}
      <circle cx="24" cy="24" r="12.6" fill="rgba(0,0,0,0.2)" />
      <circle cx="24" cy="24" r="12.6" fill="none" stroke={SHADE} strokeWidth={lift} opacity="0.55"
        transform={`translate(${lift * 0.5} ${lift * 0.5})`} />

      {/* The raised rim: a dark edge to the lower right, a lit edge to the upper left */}
      <circle cx="24" cy="24" r="13.6" fill="none" stroke={SHADE} strokeWidth="1.7" transform={`translate(${lift} ${lift})`} />
      <circle cx="24" cy="24" r="13.6" fill="none" stroke={LIGHT} strokeWidth="1.5" transform={`translate(${-lift * 0.8} ${-lift * 0.8})`} />
      <circle cx="24" cy="24" r="13.6" fill="none" stroke={`url(#${id}-relief)`} strokeWidth="1.6" />

      {/* The candle in relief, with the same two edges */}
      <path d={EMBLEM} fillRule="evenodd" transform={`translate(${lift} ${lift})`} fill={SHADE} />
      <path d={EMBLEM} fillRule="evenodd" transform={`translate(${-lift * 0.8} ${-lift * 0.8})`} fill={LIGHT} />
      <path d={EMBLEM} fillRule="evenodd" fill={`url(#${id}-relief)`} />

      {/* The lamp's glint on the wax */}
      <path d="M12.5 15.5c2-3.6 5.4-6 9.4-6.8" stroke="rgba(255,236,224,0.35)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
};
