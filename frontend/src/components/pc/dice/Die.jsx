import React from 'react';

// A die's face as standard pips on a 24 by 24 face: one in the middle; two and three on the
// diagonal from the top right; four in the corners; five, the corners and the middle; six,
// two columns of three. Every die on screen draws its face this way.
const L = 6.4;
const C = 12;
const R = 17.6;
export const PIPS = {
  1: [[C, C]],
  2: [[R, L], [L, R]],
  3: [[R, L], [C, C], [L, R]],
  4: [[L, L], [R, L], [L, R], [R, R]],
  5: [[L, L], [R, L], [C, C], [L, R], [R, R]],
  6: [[L, L], [L, C], [L, R], [R, L], [R, C], [R, R]],
};

export const DieFace = ({ value }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="w-full h-full">
    {(PIPS[value] || []).map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.2" fill="currentColor" />)}
  </svg>
);

// Her dice, as the original tray drew them: ivory with a hairline edge, and the gilded die
// in gold leaf with a gold edge (.die-gilded in index.css). Ink pips on both.
export const DIE_BODY = {
  regular: 'border border-ink/20 bg-cream text-ink',
  gilded: 'die-gilded border-2 border-candle-gold text-ink shadow-[0_0_15px_rgb(var(--c-candle-gold)/0.5)]',
};
