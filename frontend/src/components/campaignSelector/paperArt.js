// Aged paper for the hub's loose papers and the Herald (owner's round 4 items 2, 4 and 5),
// drawn in code once at module load, like the desk itself (deskArt.js). Each sheet gets three
// SVG images, stretched over it (100% 100%), from its own seed, so no two sheets match:
//   mask   its cut: deckled, torn (with fibres), machine cut, worn, or a photograph's
//          scalloped deckle; worn or torn-off corners, a dog-eared corner, worm holes.
//   stain  multiplied over it: uneven yellowing, a darker tea-stained rim that follows the
//          cut, foxing, the brown ring round a worm hole.
//   light  drawn over it: soft creases, a curled corner, the pale fibres along a tear, worn
//          gilt, the folded-over flap of a dog-ear (and anything printed on its back).
// A sheet's body is one layer on wide screens, so all of this is drawn once and costs
// nothing per frame (The Smooth Hub Rule, DESIGN.md).

const svg = (body) => `url("data:image/svg+xml,${encodeURIComponent(body.replace(/\s+/g, ' ').trim())}")`;
const n1 = (v) => String(Math.round(v * 10) / 10);
const n3 = (v) => String(Math.round(v * 1000) / 1000);
const pt = ([x, y]) => `${n1(x)} ${n1(y)}`;

// mulberry32
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A slow wander along a side: values every `span` units, eased between
const wander = (r, len, span, amp) => {
  const ctrl = Array.from({ length: Math.ceil(len / span) + 2 }, () => r() * amp);
  return (s) => {
    const f = s / span;
    const i = Math.floor(f);
    const k = (1 - Math.cos((f - i) * Math.PI)) / 2;
    return ctrl[i] * (1 - k) + ctrl[i + 1] * k;
  };
};

// How far in from the sheet's box each kind of edge wanders (in sheet units, about px)
const KINDS = {
  cut: { step: 10, base: 0.9, slow: 1.3, span: 140, jit: 0.45, nick: 0.02, nickD: 2.6, fib: 0.9 },
  worn: { step: 6, base: 1.1, slow: 2.2, span: 60, jit: 0.9, nick: 0.025, nickD: 2.8, fib: 1.5 },
  deckle: { step: 4, base: 1.5, slow: 3.2, span: 24, jit: 1.9, nick: 0.03, nickD: 3.5, fib: 2 },
  torn: { step: 3.5, base: 2.6, slow: 12, span: 30, jit: 2.8, nick: 0.12, nickD: 4.5, fib: 3.6 },
  scallop: { period: 6.5, depth: 2.1, base: 0.8, fib: 0.5 },
};

// Corners clockwise from the top left; each side runs from its corner to the next, with
// its inward normal.
const NAMES = ['tl', 'tr', 'br', 'bl'];
const NORMALS = [[0, 1], [-1, 0], [0, -1], [1, 0]];

function side(r, kind, a, b, nrm, from, to) {
  const k = KINDS[kind];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const at = (s, d) => [a[0] + ux * s + nrm[0] * d, a[1] + uy * s + nrm[1] * d];
  const span = len - from - to;
  if (kind === 'scallop') {
    // a photograph's deckle: rounded bumps between sharp little cusps
    const waves = Math.max(2, Math.round(span / k.period));
    const w = span / waves;
    const segs = [{ p: at(from, k.base + k.depth) }];
    for (let i = 0; i < waves; i++) {
      const s = from + w * i;
      segs.push({ c: at(s + w / 2, k.base - k.depth * (0.55 + r() * 0.25)), p: at(s + w, k.base + k.depth * (0.8 + r() * 0.4)) });
    }
    return segs;
  }
  const slow = wander(r, len, k.span, k.slow);
  const steps = Math.max(2, Math.round(span / k.step));
  const segs = [];
  let nick = 0;
  for (let i = 0; i <= steps; i++) {
    const s = from + (span * i) / steps;
    if (nick > 0) nick -= 1;
    else if (i > 0 && i < steps && r() < k.nick) nick = 1 + Math.floor(r() * 2);
    const d = k.base + slow(s) + r() * k.jit + (nick ? k.nickD * (0.5 + r()) : 0);
    segs.push({ p: at(s, d) });
  }
  return segs;
}

// The sheet's outline (and its worm holes, cut out with evenodd)
function outline(r, o) {
  const { W, H, edges, corners = {} } = o;
  const C = [[0, 0], [W, 0], [W, H], [0, H]];
  const cutAt = (i) => {
    const c = corners[NAMES[i]] || {};
    return c.ear || c.torn || c.r || 2.5;
  };
  const sides = [0, 1, 2, 3].map((i) => side(r, edges[i], C[i], C[(i + 1) % 4], NORMALS[i], cutAt(i), cutAt((i + 1) % 4)));
  const seg = (s) => (s.c ? `Q${pt(s.c)} ${pt(s.p)}` : `L${pt(s.p)}`);
  let d = `M${pt(sides[0][0].p)}`;
  const ears = [];
  for (let i = 0; i < 4; i++) {
    d += sides[i].slice(1).map(seg).join('');
    const j = (i + 1) % 4;
    const c = corners[NAMES[j]] || {};
    const last = sides[i][sides[i].length - 1].p;
    const next = sides[j][0].p;
    if (c.ear) {
      // folded over: the corner reflected across the fold
      const mx = (last[0] + next[0]) / 2;
      const my = (last[1] + next[1]) / 2;
      const tip = [2 * mx - C[j][0], 2 * my - C[j][1]];
      ears.push({ a: last, b: next, tip, corner: NAMES[j], c });
      d += `L${pt(next)}`;
    } else if (c.torn) {
      // a corner torn off: a ragged line across it
      const steps = 9;
      const bow = (r() - 0.35) * c.torn * 0.35;
      const nx = NORMALS[i][0] + NORMALS[j][0];
      const ny = NORMALS[i][1] + NORMALS[j][1];
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const bend = Math.sin(t * Math.PI) * bow + (r() - 0.5) * 3;
        d += `L${pt([last[0] + (next[0] - last[0]) * t + nx * bend, last[1] + (next[1] - last[1]) * t + ny * bend])}`;
      }
      d += `L${pt(next)}`;
    } else {
      // a corner worn round
      const b = (KINDS[edges[i]].base || 1) + 0.6;
      const q = [C[j][0] + (NORMALS[i][0] + NORMALS[j][0]) * b, C[j][1] + (NORMALS[i][1] + NORMALS[j][1]) * b];
      d += `Q${pt(q)} ${pt(next)}`;
    }
  }
  d += 'Z';
  const holes = (o.holes || []).map(([hx, hy, hr]) => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const ang = (i / 9) * Math.PI * 2;
      const rr = hr * (0.7 + r() * 0.55);
      return [hx * W + Math.cos(ang) * rr, hy * H + Math.sin(ang) * rr * (0.8 + r() * 0.3)];
    });
    return `M${pts.map(pt).join('L')}Z`;
  });
  // each side as an open line, for strokes that follow one edge
  const lines = sides.map((s) => `M${s.map((x) => pt(x.p)).join('L')}`);
  return { d: d + holes.join(''), holes: holes.join(''), lines, ears };
}

const head = (W, H) => `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>`;
const fibreFilter = (id, seed, scale) => `<filter id='${id}' x='-5%' y='-5%' width='110%' height='110%'>
  <feTurbulence type='fractalNoise' baseFrequency='0.32' numOctaves='2' seed='${seed}'/>
  <feDisplacementMap in='SourceGraphic' scale='${n1(scale)}' xChannelSelector='R' yChannelSelector='G'/>
  <feGaussianBlur stdDeviation='0.3'/></filter>`;

function maskSvg(o, shape, fib) {
  return svg(`${head(o.W, o.H)}${fibreFilter('f', o.seed, fib)}
<path fill-rule='evenodd' d='${shape.d}' filter='url(#f)'/></svg>`);
}

function stainSvg(r, o, shape) {
  const { W, H, seed } = o;
  const st = { yellow: 0.3, rim: 0.7, rimW: 0.055 * Math.min(W, H), fox: 10, ...o.stain };
  const spots = [];
  for (let i = 0; i < st.fox; i++) {
    let x = r() * W;
    let y = r() * H;
    if (r() < 0.6) {
      // more of them near the edges, where the damp got in
      const m = r() * 0.13;
      const s = Math.floor(r() * 4);
      if (s === 0) y = m * H;
      else if (s === 1) x = W - m * W;
      else if (s === 2) y = H - m * H;
      else x = m * W;
    }
    const rad = 0.9 + r() * r() * 4.8;
    spots.push(`<circle cx='${n1(x)}' cy='${n1(y)}' r='${n1(rad)}' fill='url(#fx)'/>`);
    if (r() < 0.45) spots.push(`<circle cx='${n1(x + (r() - 0.5) * 9)}' cy='${n1(y + (r() - 0.5) * 9)}' r='${n1(0.35 + r() * 0.5)}' fill='#4a2a10' fill-opacity='.45'/>`);
  }
  return svg(`${head(W, H)}<defs>
<filter id='y' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
  <feTurbulence type='fractalNoise' baseFrequency='${n3(3.6 / W)} ${n3(3.6 / H)}' numOctaves='3' seed='${seed}'/>
  <feColorMatrix type='matrix' values='0 0 0 0 0.80 0 0 0 0 0.63 0 0 0 0 0.38 ${n3(st.yellow * 2.4)} 0 0 0 ${n3(-st.yellow * 0.8)}'/></filter>
<filter id='t' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
  <feTurbulence type='fractalNoise' baseFrequency='${n3(8 / W)} ${n3(8 / H)}' numOctaves='2' seed='${seed + 7}'/>
  <feColorMatrix type='matrix' values='0 0 0 0 0.66 0 0 0 0 0.48 0 0 0 0 0.27 ${n3(1.3 * st.rim)} 0 0 0 ${n3(-0.1 * st.rim)}'/></filter>
<filter id='b' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='${n1(st.rimW * 0.42)}'/></filter>
<mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='${W}' height='${H}'>
  <path d='${shape.d}' fill='none' stroke='#fff' stroke-width='${n1(st.rimW * 1.5)}' filter='url(#b)'/></mask>
<radialGradient id='fx'><stop offset='0' stop-color='#6e3f17' stop-opacity='.55'/><stop offset='.45' stop-color='#8a5626' stop-opacity='.28'/><stop offset='1' stop-color='#9a6a36' stop-opacity='0'/></radialGradient>
</defs>
<rect width='${W}' height='${H}' filter='url(#y)'/>
<rect width='${W}' height='${H}' filter='url(#t)' mask='url(#m)'/>
${spots.join('')}
${shape.holes ? `<path d='${shape.holes}' fill='none' stroke='#4a2a10' stroke-opacity='.55' stroke-width='2.4'/>` : ''}
</svg>`);
}

// What is printed on the back of a postcard, seen on its folded-over corner: the edge of a
// stamp and the wavy lines of the postmark
const postBack = (tip, corner) => {
  const sx = corner.includes('l') ? 1 : -1;
  const sy = corner.includes('t') ? 1 : -1;
  const x0 = tip[0] - sx * 26;
  const y0 = tip[1] - sy * 31;
  const x = Math.min(x0, x0 + sx * 20);
  const y = Math.min(y0, y0 + sy * 24);
  const waves = [0, 1, 2, 3].map((i) => {
    const yy = y + 4 + i * 5.5;
    return `M${n1(x - 16)} ${n1(yy)}q4 -2.6 8 0t8 0t8 0t8 0t8 0t8 0`;
  }).join('');
  return `<rect x='${n1(x)}' y='${n1(y)}' width='20' height='24' fill='#f2ead8' stroke='#f2ead8' stroke-width='2.2' stroke-dasharray='1.1 1.1'/>
<rect x='${n1(x + 1.6)}' y='${n1(y + 1.6)}' width='16.8' height='20.8' fill='#7c2e22'/>
<ellipse cx='${n1(x + 10)}' cy='${n1(y + 11)}' rx='5' ry='6.4' fill='#5a1d15'/>
<rect x='${n1(x + 3.2)}' y='${n1(y + 3.2)}' width='13.6' height='17.6' fill='none' stroke='#e9c9a0' stroke-opacity='.55' stroke-width='.6'/>
<g fill='none' stroke='#211c26' stroke-opacity='.62' stroke-width='.9'><path d='${waves}'/>
<circle cx='${n1(x - 9)}' cy='${n1(y + 13)}' r='10.5'/><circle cx='${n1(x - 9)}' cy='${n1(y + 13)}' r='7.5' stroke-opacity='.4'/></g>`;
};

function lightSvg(r, o, shape) {
  const { W, H, seed } = o;
  const defs = [fibreFilter('f', seed, o.fib), `<filter id='s' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='1.6'/></filter>`,
    `<filter id='w' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='4'/></filter>`,
    `<filter id='c' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='0.5'/></filter>`];
  const parts = [];
  // creases: a broad soft lit facet and a shaded one, with a fine ridge between
  for (const [[ax, ay], [bx, by]] of o.creases || []) {
    const x0 = ax * W; const y0 = ay * H; const x1 = bx * W; const y1 = by * H;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0) / len; const ny = (x1 - x0) / len;
    const line = (off) => `M${n1(x0 + nx * off)} ${n1(y0 + ny * off)}L${n1(x1 + nx * off)} ${n1(y1 + ny * off)}`;
    parts.push(`<g filter='url(#w)'><path d='${line(-6)}' stroke='#fff6e2' stroke-opacity='.13' stroke-width='10'/><path d='${line(6)}' stroke='#2b1708' stroke-opacity='.1' stroke-width='10'/></g>
<g filter='url(#c)'><path d='${line(-0.7)}' stroke='#fff8ea' stroke-opacity='.38' stroke-width='1.1'/><path d='${line(0.8)}' stroke='#2b1708' stroke-opacity='.26' stroke-width='1.3'/></g>`);
  }
  // a curled corner: lit at its tip, a soft shade where the paper turns
  if (o.curl) {
    const i = NAMES.indexOf(o.curl);
    const cx = i === 1 || i === 2 ? W : 0;
    const cy = i >= 2 ? H : 0;
    const R = 0.34 * Math.min(W, H);
    defs.push(`<radialGradient id='cu' gradientUnits='userSpaceOnUse' cx='${cx}' cy='${cy}' r='${n1(R)}'>
<stop offset='0' stop-color='#fff8e8' stop-opacity='.3'/><stop offset='.5' stop-color='#fff8e8' stop-opacity='.07'/>
<stop offset='.78' stop-color='#2b1708' stop-opacity='.14'/><stop offset='1' stop-color='#2b1708' stop-opacity='0'/></radialGradient>`);
    parts.push(`<rect width='${W}' height='${H}' fill='url(#cu)'/>`);
  }
  // the pale fibres along a tear
  (o.edges || []).forEach((kind, i) => {
    if (kind === 'torn') parts.push(`<path d='${shape.lines[i]}' fill='none' stroke='#f8f0dc' stroke-opacity='.9' stroke-width='3.4' stroke-linejoin='round' filter='url(#f)'/>`);
  });
  // worn gilt along an edge
  if (o.gilt) {
    defs.push(`<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e8c868'/><stop offset='.4' stop-color='#b58a33'/><stop offset='.7' stop-color='#d9b458'/><stop offset='1' stop-color='#8c6624'/></linearGradient>`);
    for (const i of o.gilt) {
      const dash = Array.from({ length: 14 }, () => `${n1(6 + r() * 40)} ${n1(1 + r() * 6)}`).join(' ');
      parts.push(`<path d='${shape.lines[i]}' fill='none' stroke='url(#g)' stroke-width='5.5' stroke-dasharray='${dash}' filter='url(#f)'/>`);
    }
  }
  // a dog-eared corner: the paper folded over, its back showing, a small shadow under it
  shape.ears.forEach(({ a, b, tip, corner, c }, k) => {
    const tri = `M${pt(a)}L${pt(tip)}L${pt(b)}Z`;
    const mx = (a[0] + b[0]) / 2; const my = (a[1] + b[1]) / 2;
    defs.push(`<linearGradient id='e${k}' gradientUnits='userSpaceOnUse' x1='${n1(mx)}' y1='${n1(my)}' x2='${n1(tip[0])}' y2='${n1(tip[1])}'>
<stop offset='0' stop-color='${c.back || '#c8b287'}'/><stop offset='1' stop-color='${c.backLit || '#e7d7ae'}'/></linearGradient>
<clipPath id='k${k}'><path d='${tri}'/></clipPath>`);
    parts.push(`<path d='${tri}' fill='#000' fill-opacity='.42' filter='url(#s)' transform='translate(1.4 2)'/>
<path d='${tri}' fill='url(#e${k})'/>
${c.post ? `<g clip-path='url(#k${k})'>${postBack(tip, corner)}</g>` : ''}
<path d='M${pt(a)}L${pt(b)}' stroke='#fffaf0' stroke-opacity='.45' stroke-width='.8'/>`);
  });
  // the paper puckered round a tack
  if (o.tack) {
    const tx = o.tack[0] * W; const ty = o.tack[1] * H;
    const rays = [0.5, 1.7, 2.6, 3.9, 5.1].map((ang) => {
      const l = 7 + r() * 9;
      return `M${n1(tx + Math.cos(ang) * 4)} ${n1(ty + Math.sin(ang) * 4)}l${n1(Math.cos(ang) * l)} ${n1(Math.sin(ang) * l)}`;
    }).join('');
    parts.push(`<g filter='url(#c)' fill='none'><path d='${rays}' stroke='#2b1708' stroke-opacity='.3' stroke-width='1.1'/>
<path d='${rays}' stroke='#fff8ea' stroke-opacity='.35' stroke-width='.8' transform='translate(-0.8 -0.6)'/></g>`);
  }
  if (!parts.length) return null;
  return svg(`${head(W, H)}<defs>${defs.join('')}</defs>${parts.join('')}</svg>`);
}

// { W, H, seed, edges: [top, right, bottom, left], corners: { tl: { r | ear | torn } },
//   holes: [[x, y, r]], stain: {...}, creases: [[[x, y], [x, y]]], curl: 'br', gilt: [side],
//   tack: [x, y] }  ->  { mask, stain, light }
export function agedPaper(o) {
  const r = rng(o.seed);
  const shape = outline(r, o);
  const fib = Math.max(...o.edges.map((k) => KINDS[k].fib));
  return {
    mask: maskSvg(o, shape, fib),
    stain: stainSvg(r, o, shape),
    light: lightSvg(r, { ...o, fib }, shape),
  };
}
