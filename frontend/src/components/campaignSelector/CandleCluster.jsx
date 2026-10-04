import React from 'react';
import { CANDLES } from './candlePaths';

// The chapter hub's candles: three pillar candles standing behind the tomes, drawn in SVG.
// Each lit flame has a mantle, a bright core and a faint blue base, sways on its own slow,
// uneven rhythm and catches when the hub opens; CandleLight lays their warm light on the
// desk and the objects near them. One candle burns for the chapter, and one more for each
// investigator in play or campaign you run, up to three (lit, 1 to 3); an unlit candle shows
// its wick and a thread of smoke. Everything holds still under prefers-reduced-motion
// (DeskStyles.jsx and index.css). Decorative: hidden from assistive technology.

// Per candle: sway and core rhythms that never line up, and when it catches on arrival
const RHYTHM = [
  { sway: '3.1s', core: '1.9s', delay: '0.15s' },
  { sway: '2.6s', core: '1.6s', delay: '0.35s' },
  { sway: '3.7s', core: '2.3s', delay: '0.55s' },
];

const Flame = ({ f, rhythm }) => (
  <g className="flame-light" style={{ animationDelay: rhythm.delay }}>
    <circle className="flame-halo" cx={f.x} cy={f.y - f.H * 0.42} r={f.H * 0.85} fill="url(#cc-halo)"
      style={{ animationDuration: rhythm.sway }} />
    <g transform={`translate(${f.x} ${f.y})`}>
      <g className="flame" style={{ animationDuration: rhythm.sway }}>
        <path d={f.mantle} fill="url(#cc-mantle)" />
        <ellipse cx="0" cy={f.blue.cy} rx={f.blue.rx} ry={f.blue.ry} fill="url(#cc-blue)" />
        <path className="flame-core" d={f.core} fill="url(#cc-core)" style={{ animationDuration: rhythm.core }} />
      </g>
    </g>
  </g>
);

const Candle = ({ c, lit, rhythm }) => (
  <g>
    <ellipse cx={c.shadow.cx} cy={c.shadow.cy} rx={c.shadow.rx} ry={c.shadow.ry} fill="url(#cc-shadow)" />
    <path d={c.body} fill="url(#cc-wax)" />
    <path d={c.body} fill={lit ? 'url(#cc-wax-lit)' : 'url(#cc-wax-dark)'} />
    {c.drips.map((d, i) => <path key={i} d={d} fill="url(#cc-drip)" />)}
    <path d={c.rim} fill="url(#cc-rim)" />
    <ellipse cx={c.crater.cx} cy={c.crater.cy} rx={c.crater.rx} ry={c.crater.ry} fill={lit ? 'url(#cc-crater)' : 'url(#cc-crater-cold)'} />
    <ellipse cx={c.pool.cx} cy={c.pool.cy} rx={c.pool.rx} ry={c.pool.ry} fill={lit ? 'url(#cc-pool)' : 'url(#cc-pool-cold)'} />
    <path d={c.wick} stroke="#1a1311" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    {lit ? (
      <>
        <circle cx={c.ember.cx} cy={c.ember.cy} r="1" fill="#ff8a3d" />
        <Flame f={c.flame} rhythm={rhythm} />
      </>
    ) : (
      <path d={`M${c.ember.cx} ${c.ember.cy - 1}c-2 -5 4 -8 1 -14s3 -9 1 -15`}
        stroke="#d9cdb8" strokeOpacity="0.16" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    )}
  </g>
);

export const CandleCluster = ({ lit = 3 }) => (
  <div aria-hidden="true" className="candle-box absolute z-20 pointer-events-none">
    <svg viewBox="0 0 240 210" className="block w-full h-auto overflow-visible">
      <defs>
        {/* Wax, lit from the lamp at the upper left and from its own flame above */}
        <linearGradient id="cc-wax" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#cdb487" /><stop offset="0.18" stopColor="#f3e6c6" />
          <stop offset="0.5" stopColor="#e6d2a4" /><stop offset="0.82" stopColor="#bfa173" /><stop offset="1" stopColor="#8a6c43" />
        </linearGradient>
        <linearGradient id="cc-wax-lit" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffb760" stopOpacity="0.5" /><stop offset="0.22" stopColor="#ffb760" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#ffb760" stopOpacity="0" /><stop offset="1" stopColor="#1a1311" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="cc-wax-dark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1a1311" stopOpacity="0.12" /><stop offset="1" stopColor="#1a1311" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="cc-drip" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#e2cda0" /><stop offset="0.35" stopColor="#fbf1d6" /><stop offset="1" stopColor="#b99a6b" />
        </linearGradient>
        <linearGradient id="cc-rim" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff2d2" /><stop offset="1" stopColor="#ecd7a8" />
        </linearGradient>
        <linearGradient id="cc-crater" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd794" /><stop offset="0.6" stopColor="#e9c27c" /><stop offset="1" stopColor="#d9b06a" />
        </linearGradient>
        <linearGradient id="cc-crater-cold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c9b289" /><stop offset="1" stopColor="#e2cfa6" />
        </linearGradient>
        <radialGradient id="cc-pool" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff0c4" /><stop offset="1" stopColor="#f2cf86" />
        </radialGradient>
        <radialGradient id="cc-pool-cold" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#efe2c3" /><stop offset="1" stopColor="#d9c399" />
        </radialGradient>
        {/* Flame: orange tip, yellow mantle, a white core, a faint blue base at the wick */}
        <linearGradient id="cc-mantle" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff7a1f" stopOpacity="0" /><stop offset="0.1" stopColor="#ff8d2e" stopOpacity="0.8" />
          <stop offset="0.4" stopColor="#ffbc52" /><stop offset="0.78" stopColor="#ffe0a0" /><stop offset="1" stopColor="#ffcf7a" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="cc-core" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.2" /><stop offset="0.35" stopColor="#fffbef" /><stop offset="1" stopColor="#fff4d6" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="cc-blue" cx="0.5" cy="0.55" r="0.55">
          <stop offset="0" stopColor="#4f78d4" stopOpacity="0.6" /><stop offset="1" stopColor="#4f78d4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-halo">
          <stop offset="0" stopColor="#ffc06a" stopOpacity="0.32" /><stop offset="0.5" stopColor="#ffaa4c" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffaa4c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-shadow">
          <stop offset="0" stopColor="#000" stopOpacity="0.65" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {CANDLES.map((c, i) => <Candle key={i} c={c} lit={i < lit} rhythm={RHYTHM[i]} />)}
    </svg>
  </div>
);

// The candles' light on the desk: a wide, soft pool in soft-light blending above the
// objects, so the wood and the tomes and papers near the candles warm in their own colors
// (a lit surface, not a haze in the air). One plain gradient layer, no filter; it breathes a
// little with the flames on wide screens and holds still on phones and under reduced motion.
// The box must not form a stacking context (no z-index, opacity or transform on it): the
// light blends with whatever lies under it only if it sits in the hub's own stacking context.
const LIGHT = [0.5, 0.78, 1];
export const CandleLight = ({ lit = 3 }) => (
  <div aria-hidden="true" className="candle-box absolute pointer-events-none">
    <div className="candle-light" style={{ '--light': LIGHT[Math.max(1, Math.min(3, lit)) - 1] }} />
  </div>
);
