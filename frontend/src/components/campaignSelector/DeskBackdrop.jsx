import React from 'react';

// A cup set down on the leather (owner's round 4 item 6): the size of a real cup's foot
// next to the tomes, a slightly uneven ring with a darker rim where the tea dried, a pale
// bloom just inside it and a faint inner tide line, and a second, broken ring where the cup
// was set down again a little off. Built once at module load.
const ringPath = (cx, cy, r, seed) => {
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const rr = r * (1 + 0.013 * Math.sin(3 * a + seed) + 0.008 * Math.sin(7 * a + seed * 1.7) + 0.005 * Math.sin(13 * a + seed * 0.6));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};
const CUP = {
  rim: ringPath(58, 62, 41, 1),
  edge: ringPath(58, 62, 42.2, 1.3),
  bloom: ringPath(58, 62, 38.6, 2),
  tide: ringPath(58.6, 62.4, 33.5, 3),
  again: ringPath(70, 53, 40.4, 4),
};

// The writing desk under everything on the hub, seen from above (DeskStyles.jsx, deskArt.js):
// long-grained wood with plank seams, a dark oxblood leather writing inset a step below it
// with a tooled gilt border and a smoother patch where hands rest, and two old marks on it,
// a cup ring and an ink stain. Drawn in code, still under reduced motion, decorative.
export const DeskBackdrop = () => (
  <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
    <div className="hub-wood" />
    <div className="hub-leather">
      <div className="hub-leather-wear" />
      <div className="hub-tooling" />
    </div>
    <svg className="hub-cup" viewBox="0 0 124 124" fill="none">
      <defs>
        <radialGradient id="hub-cup-wash" cx="0.47" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#060201" stopOpacity="0" />
          <stop offset="0.92" stopColor="#060201" stopOpacity="0.14" />
          <stop offset="1" stopColor="#060201" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      {/* the second time it was set down: an older, fainter ring, broken where the first
          ring's tea lifted it */}
      <path d={CUP.again} stroke="#060201" strokeOpacity="0.26" strokeWidth="1.7" strokeDasharray="74 18 46 120" />
      <path d={CUP.rim} fill="url(#hub-cup-wash)" />
      <path d={CUP.bloom} stroke="#d9b48a" strokeOpacity="0.07" strokeWidth="3.2" />
      <path d={CUP.rim} stroke="#050201" strokeOpacity="0.5" strokeWidth="2.3" strokeDasharray="160 7 58 4 31 10" strokeLinecap="round" />
      <path d={CUP.edge} stroke="#030100" strokeOpacity="0.42" strokeWidth="0.9" strokeDasharray="120 12 90 6" />
      <path d={CUP.tide} stroke="#060201" strokeOpacity="0.17" strokeWidth="1.1" strokeDasharray="60 26 80 40" />
      <path d="M24 46a37 37 0 0 1 20-21" stroke="#f0c79a" strokeOpacity="0.07" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
    {/* An old ink stain where an inkwell once tipped: a dried tide line and a few spatters */}
    <svg className="hub-ink" viewBox="0 0 120 80" opacity="0.7">
      <path d="M30 40C28 26 44 18 58 22C70 14 92 20 94 34C104 40 100 56 88 60C82 70 60 72 50 64C36 70 22 62 26 52C18 48 22 40 30 40Z"
        fill="#0b0c18" fillOpacity="0.5" stroke="#05060d" strokeOpacity="0.45" strokeWidth="1.6" />
      <path d="M40 44C42 36 52 32 62 35C72 31 84 37 82 46C86 54 74 58 64 56C54 60 42 56 40 44Z" fill="#0b0c18" fillOpacity="0.22" />
      <circle cx="104" cy="22" r="2.2" fill="#0b0c18" fillOpacity="0.5" />
      <circle cx="13" cy="66" r="1.6" fill="#0b0c18" fillOpacity="0.45" />
      <circle cx="108" cy="62" r="1.2" fill="#0b0c18" fillOpacity="0.4" />
      <circle cx="40" cy="12" r="1.4" fill="#0b0c18" fillOpacity="0.4" />
    </svg>
  </div>
);
