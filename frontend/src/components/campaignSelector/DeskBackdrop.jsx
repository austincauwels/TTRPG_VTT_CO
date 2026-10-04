import React from 'react';

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
    {/* A cup ring, a little broken where the cup was lifted unevenly */}
    <svg className="hub-cup" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" stroke="#060201" strokeOpacity="0.42" strokeWidth="2.6" strokeDasharray="150 9 62 14 18 6" />
      <circle cx="51.2" cy="49" r="37.6" stroke="#060201" strokeOpacity="0.2" strokeWidth="1.2" strokeDasharray="48 22 96 30" />
      <path d="M17 40a35 35 0 0 1 19-23" stroke="#f0c79a" strokeOpacity="0.07" strokeWidth="1.4" strokeLinecap="round" />
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
