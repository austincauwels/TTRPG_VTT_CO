import React, { useId } from 'react';

// An oxblood wax seal, drawn in SVG: a lumpy pool of wax, a pressed ring and a candle
// struck into it, lit from the lamp at the upper left. pressed plays the press once when
// the seal first appears (index.css, .seal-press; still under reduced motion).
// Decorative: the words beside it say what was sealed.
const BLOB = 'M44.7 21.8Q46.1 24 45.5 26.4Q44.8 28.8 44.1 31Q43.4 33.3 41.6 35Q39.8 36.6 37.9 37.9Q36.1 39.2 34.5 40.9Q32.9 42.5 30.6 42.7Q28.3 42.8 26.1 43.2Q24 43.5 21.9 43Q19.8 42.6 17.7 41.9Q15.7 41.2 13.1 41.1Q10.4 41 8.7 39.3Q6.9 37.6 5.5 35.6Q4.1 33.6 4 31.1Q3.9 28.6 4.8 26.3Q5.7 24 5.6 21.9Q5.4 19.8 6.2 17.8Q7 15.8 7.6 13.6Q8.2 11.4 9.6 9.5Q10.9 7.6 13.2 6.9Q15.4 6.1 17.3 4.8Q19.3 3.4 21.7 3.3Q24 3.1 26.4 3.1Q28.8 3.2 31 4Q33.2 4.8 34.4 7.1Q35.6 9.4 37.1 10.9Q38.5 12.4 39.5 14.2Q40.5 16.1 41.9 17.8Q43.2 19.6 44.7 21.8Z';
// A candle in its holder, struck into the wax
const EMBLEM = 'M24 11.2c2.4 2.7 3.3 4.8 2.7 6.5-.5 1.3-1.5 2-2.7 2s-2.2-.7-2.7-2c-.6-1.7.3-3.8 2.7-6.5zM23.6 19.6h.8v1.2h-.8zM20.6 21.6q1.7-.9 3.4-.3t3.4 0V31.6H20.6zM15.4 32.4a8.6 2.3 0 1 0 17.2 0a8.6 2.3 0 1 0 -17.2 0zM32 31.6a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0zM33 31.6a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0z';

export const WaxSeal = ({ size = 40, pressed = false, className = '' }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false"
      className={`shrink-0 ${pressed ? 'seal-press' : ''} ${className}`}>
      <defs>
        <radialGradient id={`${id}-wax`} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#9a2d22" />
          <stop offset="0.55" style={{ stopColor: 'rgb(var(--c-oxblood))' }} />
          <stop offset="1" stopColor="#4a0f0a" />
        </radialGradient>
      </defs>
      <path d={BLOB} transform="translate(1.6 2.2)" fill="rgba(0,0,0,0.38)" />
      <path d={BLOB} fill={`url(#${id}-wax)`} />
      {/* The pressed face: a ring and the emblem, dark where pressed in, lit on the far edge */}
      <circle cx="24" cy="24" r="13.4" fill="rgba(0,0,0,0.16)" />
      <circle cx="24" cy="24" r="13.4" fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="1.6" />
      <circle cx="24.5" cy="24.6" r="13.4" fill="none" stroke="rgba(255,214,196,0.22)" strokeWidth="0.9" />
      <path d={EMBLEM} fillRule="evenodd" transform="translate(0.5 0.6)" fill="rgba(255,214,196,0.24)" />
      <path d={EMBLEM} fillRule="evenodd" fill="rgba(0,0,0,0.42)" />
      {/* The lamp's glint on the wax */}
      <path d="M12.5 15.5c2-3.6 5.4-6 9.4-6.8" stroke="rgba(255,236,224,0.35)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
};
