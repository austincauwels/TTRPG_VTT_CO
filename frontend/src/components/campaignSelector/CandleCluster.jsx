import React from 'react';

// The chapter hub's candles, seen from above as the desk is: three pillar candles in a tight
// cluster, as in her original hub, and three smaller ones among them (owner's request,
// 2026-10-07: more candles, and a darker room for their shadows). Each top is a slightly uneven disc of wax with a raised
// rim glowing where it is thin, a pool of melted wax around the wick, drips that have run
// over the rim (bulges on the outline, a channel across the rim, a bead below), and a small
// bright flame with a soft halo. Each candle throws a long soft shadow away from every
// other lit flame, and the shadows stretch and shorten with the room's flicker. The three
// pillars burn for the chapter, and one smaller candle more for each investigator in play
// or campaign you run, up to all six (lit, 3 to 6); an unlit candle shows a cold pool, a
// dark wick and smoke rising off it. Drawn for this app in code (no source art). Decorative: hidden from assistive
// technology. Everything holds still under reduced motion (DeskStyles.jsx).

// viewBox 0 0 230 190: x, y, radius, height (for shadow length), drips (degrees, 0 = right)
// The three pillars first, then the smaller candles, which stand inside the pillars' span
// so the cluster keeps its measures (DeskStyles.jsx, .hub-candles).
const CANDLES = [
  { x: 72, y: 112, r: 33, h: 1.0, seed: 1, drips: [200, 322] },
  { x: 134, y: 58, r: 23, h: 0.8, seed: 2, drips: [38, 252] },
  { x: 157, y: 133, r: 16.5, h: 0.6, seed: 3, drips: [138] },
  { x: 64, y: 54, r: 15, h: 0.7, seed: 4, drips: [118] },
  { x: 122, y: 104, r: 12.5, h: 0.5, seed: 5, drips: [300] },
  { x: 168, y: 88, r: 10, h: 0.45, seed: 6, drips: [20] },
];

// Per candle: sway and core rhythms that never line up, and when it catches on arrival
const RHYTHM = [
  { sway: '3.1s', core: '1.9s', delay: '0.15s' },
  { sway: '2.6s', core: '1.6s', delay: '0.35s' },
  { sway: '3.7s', core: '2.3s', delay: '0.55s' },
  { sway: '2.9s', core: '1.7s', delay: '0.75s' },
  { sway: '3.4s', core: '2.1s', delay: '0.9s' },
  { sway: '2.4s', core: '1.5s', delay: '1.05s' },
];

const f2 = (n) => n.toFixed(2);

// A closed, slightly uneven outline around a candle: wobble, and bulges where wax has run
// over the rim. A Catmull-Rom curve through 72 points, as cubic Beziers.
function outline(c, k = 1, lobes = true, seed = c.seed) {
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    let rr = c.r * k * (1 + 0.022 * Math.sin(3 * a + seed) + 0.014 * Math.sin(7 * a + seed * 2.1) + 0.01 * Math.sin(11 * a + seed));
    if (lobes) {
      for (const d of c.drips) {
        const da = Math.atan2(Math.sin(a - (d * Math.PI) / 180), Math.cos(a - (d * Math.PI) / 180));
        rr += c.r * 0.11 * Math.exp(-(da * da) / 0.03);
      }
    }
    pts.push([c.x + rr * Math.cos(a), c.y + rr * Math.sin(a)]);
  }
  let p = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    p += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return `${p}Z`;
}

// Fixed geometry, built once
const SHAPES = CANDLES.map((c) => ({
  body: outline(c),
  rim: outline(c, 0.9, false),
  pool: outline(c, 0.64, false, c.seed + 4),
  drips: c.drips.map((d) => {
    const a = (d * Math.PI) / 180;
    const at = (k) => [c.x + c.r * k * Math.cos(a), c.y + c.r * k * Math.sin(a)];
    const [x1, y1] = at(0.62);
    const [x2, y2] = at(0.93);
    return { channel: `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}` };
  }),
}));

// The end of an unlit candle's wick, where its smoke starts
const wickEnd = (c) => [c.x + c.r * 0.14, c.y + c.r * 0.09];

// How far smoke may rise off a candle's wick before it would cross a candle above it
// (with room for the threads' drift and the rise's last stretch), so no plume ends in
// another candle's pool beside its flame
function smokeRoom(c) {
  const [wx, wy] = wickEnd(c);
  let room = Infinity;
  for (const d of CANDLES) {
    if (d === c || d.y >= wy) continue;
    const dx = Math.max(0, Math.abs(d.x - wx) - 4);
    const reach = d.r * 1.12;
    if (dx >= reach) continue;
    room = Math.min(room, wy - d.y - Math.sqrt(reach * reach - dx * dx) - 5);
  }
  return room;
}

// A thread of smoke off a snuffed wick: a smooth line rising from the wick and drifting a
// little, wavering more the higher it goes. Each candle has three, on one curve that frays
// apart near the top, so together they read as one plume.
function smokeStrand(c, k) {
  const [wx, wy] = wickEnd(c);
  const len = Math.min(26 + 1.6 * c.r, smokeRoom(c));
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const waver = (2.6 + 0.5 * k) * t * Math.sin((1.25 + 0.12 * k) * t * Math.PI * 2 + c.seed * 1.7 + k * 0.5);
    pts.push([wx + c.r * 0.2 * t + waver, wy - len * t]);
  }
  let p = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    p += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return p;
}
const SMOKE = CANDLES.map((c) => [0, 1, 2].map((k) => smokeStrand(c, k)));
// Each thread's rise, and how far into it the page opens, so the smoke is already up
const SMOKE_RISE = [4.2, 5, 5.8];
const SMOKE_START = [0, 1.7, 3.3];

// The shadow candle i throws away from flame j: a soft capsule, longest for the tallest
// candle and the nearest flame
function shadowOf(c, f) {
  const dx = c.x - f.x;
  const dy = c.y - f.y;
  const dist = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const len = 36 + 105 * c.h * Math.min(1.4, 50 / dist);
  return { x: c.x, y: c.y - c.r * 0.92, w: len + c.r, h: c.r * 1.84, rx: c.r * 0.92, ang };
}

// Tiny drops of wax on the desk around the cluster
const SPATTER = [[30, 138, 1.3], [112, 150, 1.6], [190, 104, 1.1]];

const Flame = ({ c, rhythm }) => (
  <g className="flame-light" style={{ animationDelay: rhythm.delay }}>
    <circle className="flame-halo" cx={c.x} cy={c.y - c.r * 0.1} r={c.r * 1.9} fill="url(#cc-halo)"
      style={{ animationDuration: rhythm.sway }} />
    <g className="flame" style={{ animationDuration: rhythm.sway }}>
      <ellipse cx={c.x} cy={c.y - c.r * 0.16} rx={c.r * 0.16} ry={c.r * 0.3} fill="url(#cc-mantle)" />
      <ellipse className="flame-core" cx={c.x} cy={c.y - c.r * 0.1} rx={c.r * 0.06} ry={c.r * 0.13} fill="#fffbea"
        style={{ animationDuration: rhythm.core }} />
    </g>
  </g>
);

const Candle = ({ c, s, lit, rhythm }) => (
  <g>
    <path d={s.body} fill="url(#cc-wax)" />
    <path d={s.rim} fill="url(#cc-rim)" opacity={lit ? 1 : 0.5} />
    <path d={s.pool} fill={lit ? 'url(#cc-pool)' : 'url(#cc-pool-cold)'} />
    {/* where wax ran over the rim: a low notch in the lip, glossy with the pool */}
    {s.drips.map((d, i) => (
      <path key={i} d={d.channel} stroke={lit ? '#e7ae58' : '#d8c49b'} strokeOpacity="0.55" strokeWidth={c.r * 0.13} strokeLinecap="round" />
    ))}
    {lit ? (
      <>
        {/* the flame's reflection on the pool, and the wick under it */}
        <ellipse cx={c.x - c.r * 0.27} cy={c.y - c.r * 0.28} rx={c.r * 0.15} ry={c.r * 0.06} fill="#fff" opacity="0.32"
          transform={`rotate(-32 ${c.x} ${c.y})`} />
        <path d={`M${c.x - c.r * 0.03} ${c.y + c.r * 0.07}q${c.r * 0.02} ${-c.r * 0.06} ${c.r * 0.05} ${-c.r * 0.11}`}
          stroke="#1a1311" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <Flame c={c} rhythm={rhythm} />
      </>
    ) : (
      <>
        <path d={`M${c.x} ${c.y}q${c.r * 0.06} ${c.r * 0.02} ${c.r * 0.14} ${c.r * 0.09}`}
          stroke="#1a1311" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    )}
  </g>
);

// The unlit candles' smoke, in an SVG of its own over the cluster (.candle-smoke,
// DeskStyles.jsx). Each thread grows up off its wick and drifts higher as it fades
// (.smoke-strand), and each candle's plume wavers about its wick (.smoke-sway): transforms
// and opacity only, which the browser can run without repainting. Under reduced motion
// only a still thread shows (.smoke-still).
const Smoke = ({ lit }) => (
  <svg viewBox="0 0 230 190" className="candle-smoke absolute left-0 top-0 block w-full h-auto overflow-visible">
    {CANDLES.map((c, i) => {
      if (i < lit) return null;
      const [wx, wy] = wickEnd(c);
      return (
        <g key={i} className="smoke-sway"
          style={{ transformBox: 'view-box', transformOrigin: `${f2(wx)}px ${f2(wy)}px`, animationDuration: `${5.9 + i * 0.7}s` }}>
          {SMOKE[i].map((d, k) => (
            <g key={k} className="smoke-strand" fill="none" strokeLinecap="round"
              style={{ transformBox: 'view-box', transformOrigin: `${f2(wx)}px ${f2(wy)}px`,
                animationDuration: `${SMOKE_RISE[k]}s`, animationDelay: `-${f2(SMOKE_START[k] + i * 0.9)}s` }}>
              <path className="smoke-haze" d={d} stroke="#d9cdb8" strokeOpacity="0.08" strokeWidth="3.2" />
              <path className="smoke-core" d={d} stroke="#e6dccb" strokeOpacity="0.34" strokeWidth="1.1" />
            </g>
          ))}
          <path className="smoke-still" d={SMOKE[i][0]} stroke="#d9cdb8" strokeOpacity="0.18" strokeWidth="1.3"
            fill="none" strokeLinecap="round" />
        </g>
      );
    })}
  </svg>
);

// Desk glow, under the books and papers: the flames' light on the wood and leather
const LIGHT = [0.5, 0.7, 0.84, 0.9, 0.95, 1];
const lightFor = (lit) => LIGHT[Math.max(1, Math.min(CANDLES.length, lit)) - 1];

export const CandleCluster = ({ lit = 3 }) => (
  <>
    {/* No z-index on this box: the glow blends with the desk under it */}
    <div aria-hidden="true" className="candle-box absolute pointer-events-none" style={{ '--light': lightFor(lit) }}>
      <div className="candle-center"><div className="desk-glow" /></div>
    </div>
    <div aria-hidden="true" className="candle-box absolute z-[35] pointer-events-none">
      <svg viewBox="0 0 230 190" className="block w-full h-auto overflow-visible">
        <defs>
          <filter id="cc-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" /></filter>
          <filter id="cc-contact" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
          <linearGradient id="cc-shadow" x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.95" /><stop offset="0.5" stopColor="#000" stopOpacity="0.5" /><stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* Wax from above: lit from its own flame in the middle, the shoulder falling away */}
          <radialGradient id="cc-wax" cx="0.46" cy="0.44" r="0.6">
            <stop offset="0" stopColor="#f6ead0" /><stop offset="0.62" stopColor="#e8d6ae" /><stop offset="0.86" stopColor="#c8ae80" /><stop offset="1" stopColor="#8f7350" />
          </radialGradient>
          <radialGradient id="cc-rim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.68" stopColor="#ffe9bd" /><stop offset="0.8" stopColor="#f1d6a0" /><stop offset="0.95" stopColor="#dcc08c" stopOpacity="0.4" /><stop offset="1" stopColor="#dcc08c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cc-pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe2a0" /><stop offset="0.3" stopColor="#f0b85e" /><stop offset="0.75" stopColor="#c98a3e" /><stop offset="1" stopColor="#b07432" />
          </radialGradient>
          <radialGradient id="cc-pool-cold" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e9dcbc" /><stop offset="1" stopColor="#cbb68b" />
          </radialGradient>
          <radialGradient id="cc-bead" cx="0.4" cy="0.38" r="0.6">
            <stop offset="0" stopColor="#fbf0d4" /><stop offset="0.7" stopColor="#dcc394" /><stop offset="1" stopColor="#a58a5e" />
          </radialGradient>
          <radialGradient id="cc-halo">
            <stop offset="0" stopColor="#ffd08a" stopOpacity="0.75" /><stop offset="0.25" stopColor="#ffb257" stopOpacity="0.32" />
            <stop offset="0.6" stopColor="#ff9a40" stopOpacity="0.08" /><stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cc-mantle" cx="0.5" cy="0.62" r="0.6">
            <stop offset="0" stopColor="#fff6d8" /><stop offset="0.35" stopColor="#ffd36b" />
            <stop offset="0.75" stopColor="#ff9a2e" stopOpacity="0.85" /><stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Shadows: each lit flame throws every other candle's shadow away from itself. The
            outer group flickers (a transform) and the blur sits on the inner one, so the
            blur is drawn once and the flicker never repaints it. */}
        {CANDLES.map((f, j) => (j < lit ? (
          <g key={`s${j}`} className="candle-shadow"
            style={{ transformBox: 'view-box', transformOrigin: `${f.x}px ${f.y}px` }}>
            <g filter="url(#cc-soft)">
              {CANDLES.map((c, i) => {
                if (i === j) return null;
                const s = shadowOf(c, f);
                return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill="url(#cc-shadow)"
                  transform={`rotate(${s.ang.toFixed(1)} ${c.x} ${c.y})`} />;
              })}
            </g>
          </g>
        ) : null))}
        {/* Where each candle stands on the desk */}
        {CANDLES.map((c, i) => (
          <circle key={`c${i}`} cx={c.x + 1.5} cy={c.y + 2.5} r={c.r + 2.5} fill="#000" opacity="0.72" filter="url(#cc-contact)" />
        ))}
        {SPATTER.map(([x, y, r], i) => (
          <g key={`w${i}`}>
            <circle cx={x + 0.5} cy={y + 0.7} r={r} fill="#000" opacity="0.55" />
            <circle cx={x} cy={y} r={r} fill="url(#cc-bead)" opacity="0.8" />
          </g>
        ))}
        {CANDLES.map((c, i) => <Candle key={i} c={c} s={SHAPES[i]} lit={i < lit} rhythm={RHYTHM[i]} />)}
      </svg>
      <Smoke lit={lit} />
    </div>
  </>
);

// Over the books and papers: the warm pool and the shade of the room, centered on the
// flames. No z-index on the boxes that hold them, so both blend with the whole desk.
export const CandleLight = ({ lit = 3 }) => (
  <div aria-hidden="true" className="candle-box absolute pointer-events-none" style={{ '--light': lightFor(lit) }}>
    <div className="candle-center">
      <div className="hub-light z-[45]" />
      <div className="hub-shade z-[46]" />
    </div>
  </div>
);
