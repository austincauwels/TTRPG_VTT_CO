import React, { useId } from 'react';

// ── The hourglass (the tension clock) ─────────────────────────────────────────────
// Drawn in code at 1:1 in px, 120 wide and 188 tall, lit by the one lamp up and to the
// left: two turned wooden ends ringed in brass, two brass spindles, and the glass between
// them, two bulbs meeting at a narrow neck. `value` (0 to 4) is how much of the sand has
// run: at 0 it all lies in the upper bulb, at 4 the upper bulb is empty and the lower one
// full, in four even steps. While sand is left above, a thin stream falls from the neck.
// The sand moves to a new level by transform alone, over a few hundred ms (at once under
// reduced motion), and nothing moves while the value stands still. `run` (0 to 1), when
// given, sets how much has run instead: the Lightkeeper's countdown (TensionClock), which
// moves the sand on steadily, a little each second.
const W = 120;
const H = 188;
const CX = 60;
const NECK = 94;
const FULL = 38; // the top of the sand in the upper bulb before any of it has run

// The right half of the upper bulb from its brass seat down to the neck: two cubic
// segments [start, control, control, end, control, control, end]. The lower bulb is the
// same glass turned over about the neck.
const P = [[84, 19], [90, 19], [96, 26], [96, 37], [96, 58], [65, 75], [62.6, 92]];
const SEAT = P[0][1]; // where the glass meets the upper end's seat (the lower's is turned over)
const flipX = ([x, y]) => [2 * CX - x, y];
const flipY = ([x, y]) => [x, 2 * NECK - y];
const pt = ([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`;

// One bulb, closed across the neck: `f` is nothing for the upper bulb, flipY for the lower
const bulb = (f) => {
  const R = P.map(f);
  const L = P.map((p) => f(flipX(p)));
  return [
    `M ${pt(L[0])} L ${pt(R[0])}`,
    `C ${pt(R[1])} ${pt(R[2])} ${pt(R[3])} C ${pt(R[4])} ${pt(R[5])} ${pt(R[6])}`,
    `L ${pt(f([P[6][0], NECK]))} L ${pt(f(flipX([P[6][0], NECK])))} L ${pt(L[6])}`,
    `C ${pt(L[5])} ${pt(L[4])} ${pt(L[3])} C ${pt(L[2])} ${pt(L[1])} ${pt(L[0])} Z`,
  ].join(' ');
};
const UPPER = bulb((p) => p);
const LOWER = bulb(flipY);

// The glass's two sides, each one curve from seat to seat through the neck
const side = (g) => {
  const a = P.map(g);
  const b = P.map((p) => g(flipY(p)));
  return `M ${pt(a[0])} C ${pt(a[1])} ${pt(a[2])} ${pt(a[3])} C ${pt(a[4])} ${pt(a[5])} ${pt(a[6])}`
    + ` L ${pt(b[6])} C ${pt(b[5])} ${pt(b[4])} ${pt(b[3])} C ${pt(b[2])} ${pt(b[1])} ${pt(b[0])}`;
};
const RIM = `${side((p) => p)} ${side(flipX)}`;

// The bulb's half-width down from its seat to the neck, sampled as [y, half-width]
const PROFILE = (() => {
  const out = [];
  for (const k of [0, 3]) {
    const [a, b, c, d] = P.slice(k, k + 4);
    for (let i = k ? 1 : 0; i <= 48; i++) {
      const t = i / 48, u = 1 - t;
      const at = (j) => u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j];
      out.push([at(1), at(0) - CX]);
    }
  }
  out.push([NECK, P[6][0] - CX]);
  return out;
})();
// BELOW[i]: the drawn area of the upper bulb from PROFILE[i]'s height down to the neck
const BELOW = PROFILE.map(() => 0);
for (let i = PROFILE.length - 2; i >= 0; i--) {
  BELOW[i] = BELOW[i + 1] + (PROFILE[i + 1][0] - PROFILE[i][0]) * (PROFILE[i][1] + PROFILE[i + 1][1]);
}
const areaBelow = (y) => {
  for (let i = PROFILE.length - 2; i >= 0; i--) {
    const [y0, w0] = PROFILE[i], [y1, w1] = PROFILE[i + 1];
    if (y >= y0) { const w = w0 + (w1 - w0) * (y - y0) / (y1 - y0); return BELOW[i + 1] + (y1 - y) * (w + w1); }
  }
  return BELOW[0];
};
// The height in the upper bulb with `area` of it below, down to the neck
const levelFor = (area) => {
  for (let i = PROFILE.length - 2; i >= 0; i--) {
    if (BELOW[i] >= area) {
      const f = (area - BELOW[i + 1]) / (BELOW[i] - BELOW[i + 1]);
      return PROFILE[i + 1][0] - f * (PROFILE[i + 1][0] - PROFILE[i][0]);
    }
  }
  return PROFILE[0][0];
};
// Where the sand stands at each step, so that every step moves the same drawn area of sand:
// the top of the sand above (12px below the neck, out of sight, once it is empty) and of
// the pile below (12px under the floor before any has run). The lower bulb is the upper
// one turned over, so a pile of `a` reaches the mirror image of the height above which the
// upper bulb holds `a`.
const SAND = areaBelow(FULL);
const ALL = BELOW[0];
// `f` is the share of the sand that has run, 0 to 1
const upperAt = (f) => (f >= 1 ? NECK + 12 : levelFor(SAND * (1 - f)));
const lowerAt = (f) => (f <= 0 ? 2 * NECK - SEAT + 12 : 2 * NECK - levelFor(ALL - SAND * f));

// The sand's surface above, drawn from y 0: level, with the shallow dish the running sand
// makes over the neck. And the pile below, highest under the stream.
const SAND_TOP = `M ${CX - 70} 0 H ${CX - 24} C ${CX - 14} 0.3 ${CX - 5} 3.4 ${CX} 3.6 C ${CX + 5} 3.4 ${CX + 14} 0.3 ${CX + 24} 0 H ${CX + 70} V 90 H ${CX - 70} Z`;
const SAND_PILE = `M ${CX - 70} 5 H ${CX - 36} C ${CX - 22} 4 ${CX - 8} -6 ${CX} -7 C ${CX + 8} -6 ${CX + 22} 4 ${CX + 36} 5 H ${CX + 70} V 90 H ${CX - 70} Z`;

// Brass spindles at either side, turned with a bead near each end and one at the waist
const SPINDLES = [13, W - 13];

// Grains in the sand, scattered unevenly over a 16 x 12 tile: [x, y, r, lit]
const GRAINS = [
  [1.2, 1.6, 0.4], [6.3, 0.8, 0.35], [11.5, 2.4, 0.45], [14.6, 6.1, 0.35], [3.4, 5.2, 0.45],
  [8.8, 4.6, 0.3], [5.9, 9.4, 0.4], [12.2, 9.9, 0.35], [1, 10.6, 0.3],
  [9.6, 1.4, 0.3, 1], [2.6, 8, 0.35, 1], [13.6, 4, 0.3, 1], [7.6, 7.2, 0.35, 1],
];

// The light on the sand is cream laid on in soft light, which lifts the oxblood to a
// brighter red of its own hue; plain cream over it would only pale it toward pink, and
// lamp-lit oxblood is never a fill (DESIGN.md)
const LIT = { mixBlendMode: 'soft-light' };

const Sand = ({ d, at, id, steady }) => (
  <g className={`transition-transform motion-reduce:transition-none ${steady ? 'duration-1000 ease-linear' : 'duration-[450ms] ease-in-out'}`}
    style={{ transform: `translateY(${+at.toFixed(2)}px)` }}>
    <path d={d} style={{ fill: 'rgb(var(--c-oxblood))' }} />
    <path d={d} fill={`url(#${id}-sand-crest)`} style={LIT} />
    <path d={d} fill={`url(#${id}-sand-shade)`} />
    <path d={d} fill={`url(#${id}-sand-grain)`} />
    <path d={d} fill={`url(#${id}-sand-glint)`} style={LIT} />
  </g>
);

export const Hourglass = ({ value = 0, run = null }) => {
  const id = useId().replace(/:/g, '');
  const step = Math.max(0, Math.min(4, Math.round(Number(value) || 0)));
  const steady = run != null;
  const ran = steady ? Math.max(0, Math.min(1, Number(run) || 0)) : step / 4;
  const cream = (a) => ({ stopColor: 'rgb(var(--c-cream))', stopOpacity: a });
  const gold = (a) => ({ stopColor: 'rgb(var(--c-candle-gold))', stopOpacity: a });
  const sepia = (a) => ({ stopColor: 'rgb(var(--c-sepia))', stopOpacity: a });
  const ink = (a) => ({ stopColor: 'rgb(var(--c-ink))', stopOpacity: a });
  const brass = { fill: 'rgb(var(--c-candle-gold))' };
  const edge = { stroke: 'rgb(var(--c-sepia))' };
  const lit = `url(#${id}-lit)`;
  const wood = `url(#${id}-wood)`;

  // One turned wooden end: the disc, a brass ring under it, a narrower step and the brass
  // seat the glass sits in. `f` is nothing for the upper end, flipY for the lower.
  const end = (f, key) => {
    const box = (x0, y0, x1, y1) => {
      const [a, b] = [f([x0, y0]), f([x1, y1])];
      return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]) };
    };
    return (
      <g key={key}>
        <rect {...box(3, 1, W - 3, 8.5)} rx="2.5" fill={wood} />
        <rect {...box(3, 1, W - 3, 8.5)} rx="2.5" fill={`url(#${id}-wood-face)`} />
        <rect {...box(9, 3.6, 72, 4.05)} fill={`url(#${id}-grain)`} />
        <rect {...box(44, 5.9, W - 8, 6.3)} fill={`url(#${id}-grain)`} />
        <rect {...box(6, 8.5, W - 6, 10.3)} style={brass} />
        <rect {...box(6, 8.5, W - 6, 10.3)} fill={lit} />
        <rect {...box(8, 10.3, W - 8, 15.6)} rx="1.5" fill={wood} />
        <rect {...box(16, 12.6, 84, 13)} fill={`url(#${id}-grain)`} />
        <rect {...box(33, 15.6, W - 33, 19.6)} rx="1" style={{ ...brass, ...edge }} strokeWidth="0.8" />
        <rect {...box(33, 15.6, W - 33, 19.6)} rx="1" fill={lit} />
      </g>
    );
  };

  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      className="overflow-visible"
      style={{ filter: 'drop-shadow(4px 9px 7px rgba(0,0,0,0.7))' }}>
      <defs>
        <clipPath id={`${id}-upper`}><path d={UPPER} /></clipPath>
        <clipPath id={`${id}-lower`}><path d={LOWER} /></clipPath>
        {/* Wood turned on the lathe, lit from the left; its top face catches the lamp */}
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'rgb(var(--c-ink))' }} />
          <stop offset="0.12" style={{ stopColor: 'rgb(var(--c-mahogany))' }} />
          <stop offset="0.3" style={{ stopColor: 'rgb(var(--c-sepia))' }} />
          <stop offset="0.55" style={{ stopColor: 'rgb(var(--c-mahogany))' }} />
          <stop offset="0.9" style={{ stopColor: 'rgb(var(--c-ink))' }} />
        </linearGradient>
        <linearGradient id={`${id}-wood-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={gold(0.32)} />
          <stop offset="0.3" style={gold(0)} />
          <stop offset="0.75" style={ink(0)} />
          <stop offset="1" style={ink(0.45)} />
        </linearGradient>
        <linearGradient id={`${id}-grain`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={ink(0)} />
          <stop offset="0.5" style={ink(0.4)} />
          <stop offset="1" style={ink(0)} />
        </linearGradient>
        {/* Brass as a small cylinder lit from the left */}
        <linearGradient id={`${id}-lit`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={sepia(0.45)} />
          <stop offset="0.2" style={cream(0.42)} />
          <stop offset="0.45" style={cream(0)} />
          <stop offset="0.78" style={sepia(0.2)} />
          <stop offset="1" style={sepia(0.6)} />
        </linearGradient>
        {/* The glass: a faint sheen in the bulbs, its edge lit where the lamp reaches it */}
        <radialGradient id={`${id}-glass`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" style={cream(0.1)} />
          <stop offset="1" style={cream(0.03)} />
        </radialGradient>
        <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1="24" y1={SEAT} x2="96" y2={2 * NECK - SEAT}>
          <stop offset="0" style={cream(0.42)} />
          <stop offset="0.55" style={cream(0.16)} />
          <stop offset="1" style={cream(0.08)} />
        </linearGradient>
        <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={cream(0)} />
          <stop offset="0.35" style={cream(0.42)} />
          <stop offset="0.6" style={cream(0.26)} />
          <stop offset="1" style={cream(0)} />
        </linearGradient>
        <linearGradient id={`${id}-bounce`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={gold(0)} />
          <stop offset="0.6" style={gold(0.3)} />
          <stop offset="1" style={gold(0)} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id={`${id}-dot`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="0.9" /></filter>
        {/* The sand: lit along its top, darker away from the lamp, and grained */}
        <linearGradient id={`${id}-sand-crest`} gradientUnits="userSpaceOnUse" x1="0" y1="-8" x2="0" y2="9">
          <stop offset="0" style={cream(0.875)} />
          <stop offset="0.45" style={cream(0.385)} />
          <stop offset="1" style={cream(0)} />
        </linearGradient>
        <pattern id={`${id}-sand-grain`} patternUnits="userSpaceOnUse" width="16" height="12">
          {GRAINS.filter((g) => !g[3]).map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={{ fill: 'rgb(var(--c-ink) / 0.24)' }} />
          ))}
        </pattern>
        <pattern id={`${id}-sand-glint`} patternUnits="userSpaceOnUse" width="16" height="12">
          {GRAINS.filter((g) => g[3]).map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={{ fill: 'rgb(var(--c-cream) / 0.385)' }} />
          ))}
        </pattern>
        <linearGradient id={`${id}-sand-shade`} gradientUnits="userSpaceOnUse" x1="24" y1="0" x2="96" y2="0">
          <stop offset="0" style={ink(0.35)} />
          <stop offset="0.25" style={ink(0)} />
          <stop offset="0.6" style={ink(0.08)} />
          <stop offset="1" style={ink(0.5)} />
        </linearGradient>
      </defs>

      {/* The glass behind the sand */}
      <path d={UPPER} fill={`url(#${id}-glass)`} />
      <path d={LOWER} fill={`url(#${id}-glass)`} />

      {/* The sand above, the stream while some is left there, and the pile below */}
      <g clipPath={`url(#${id}-upper)`}>
        <Sand d={SAND_TOP} at={upperAt(ran)} id={id} steady={steady} />
      </g>
      <g clipPath={`url(#${id}-lower)`}>
        <rect x={CX - 0.6} y={NECK - 1} width="1.2" height={NECK - SEAT + 1}
          className="transition-opacity duration-300 motion-reduce:transition-none"
          style={{ fill: 'rgb(var(--c-oxblood))', opacity: ran < 1 ? 1 : 0 }} />
        <Sand d={SAND_PILE} at={lowerAt(ran)} id={id} steady={steady} />
      </g>

      {/* The glass in front: its edge, the lamp's window feathered down the left of each bulb,
          a soft specular point, and a warm glow where the light leaves it low on the right */}
      <path d={RIM} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.1" />
      <g filter={`url(#${id}-soft)`}>
        <path d="M 31 27 C 28 34 28.5 44 31 52 C 33 58 37 63 41 67" fill="none" stroke={`url(#${id}-streak)`} strokeWidth="4.6" strokeLinecap="round" />
        <path d="M 41 121 C 34 127 29.5 136 29.5 146 C 29.5 152 30.5 157 32 161" fill="none" stroke={`url(#${id}-streak)`} strokeWidth="4" strokeLinecap="round" />
        <path d="M 91 140 C 92 148 91 155 88 161" fill="none" stroke={`url(#${id}-bounce)`} strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <circle cx="35" cy="30" r="1.3" filter={`url(#${id}-dot)`} style={{ fill: 'rgb(var(--c-cream) / 0.55)' }} />

      {/* The spindles, their collars tucked under the ends */}
      {SPINDLES.map((x) => (
        <g key={x}>
          <rect x={x - 2} y="15.6" width="4" height={H - 31.2} style={{ ...brass, ...edge }} strokeWidth="0.7" />
          <rect x={x - 2} y="15.6" width="4" height={H - 31.2} fill={lit} />
          {[[15.6, 19.2], [H - 19.2, H - 15.6]].map(([y0, y1]) => (
            <g key={y0}>
              <rect x={x - 4.2} y={y0} width="8.4" height={y1 - y0} rx="1" style={{ ...brass, ...edge }} strokeWidth="0.7" />
              <rect x={x - 4.2} y={y0} width="8.4" height={y1 - y0} rx="1" fill={lit} />
            </g>
          ))}
          {[[25, 3, 3], [NECK, 3.8, 3.2], [H - 25, 3, 3]].map(([y, rx, ry]) => (
            <g key={y}>
              <ellipse cx={x} cy={y} rx={rx} ry={ry} style={{ ...brass, ...edge }} strokeWidth="0.7" />
              <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={lit} />
            </g>
          ))}
        </g>
      ))}

      {/* The two ends */}
      {end((p) => p, 'upper')}
      {end(flipY, 'lower')}
    </svg>
  );
};
