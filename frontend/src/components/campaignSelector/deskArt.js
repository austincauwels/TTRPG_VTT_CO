// The chapter hub's desk, drawn in code and self-hosted (no texture files, no external
// URLs): SVG images built once at module load and used as CSS backgrounds or masks.
//
// WOOD  one image the size of a large desk top (2400 x 1500), laid with background-size:
//       cover, so it never tiles: long grain bent by a slow warp, a lighter figure, broad
//       variation in tone, four plank seams with staggered butt joints, a few old
//       scratches. The noise is rendered once by the browser and then holds still.
//       Dark and low in contrast (owner's round 4 item 8: "too bright, looks like a png"):
//       the wood lies mostly in shadow and only warms where the candles reach it, with
//       a varnish sheen there (.hub-wood::after in DeskStyles.jsx).
// LEATHER  the writing inset's fine pebble grain (a small stitched tile, invisible as a
//       repeat at this scale) and a slow mottle, both multiplied over the oxblood base.
// WEAR  a noise mask that wears the tooled gilt line on the leather unevenly.

const svg = (body) => `url("data:image/svg+xml,${encodeURIComponent(body.replace(/\s+/g, ' ').trim())}")`;

const W = 2400;
const H = 1500;
const SEAMS = [372, 795, 1180];
const JOINTS = [[1530, 0, 372], [640, 372, 795], [1910, 795, 1180], [980, 1180, 1500]];
const SCRATCHES = [
  'M180 1300l260 -40', 'M2100 260l-180 30', 'M1600 1420c60 -8 140 -26 220 -30',
  'M300 120l140 18', 'M2230 1240l-90 60', 'M90 640l120 -6', 'M1180 70l210 22',
];

// Two noises share one warp (same seed) so the figure follows the grain
const warp = "<feTurbulence type='fractalNoise' baseFrequency='0.0011 0.008' numOctaves='2' seed='3' result='warp'/>";

export const WOOD_IMAGE = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>
<defs>
<filter id='tone' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
  <feTurbulence type='fractalNoise' baseFrequency='0.0007 0.004' numOctaves='2' seed='5'/>
  <feColorMatrix type='matrix' values='0 0 0 0 0.19 0 0 0 0 0.10 0 0 0 0 0.045 1.6 0 0 0 -0.55'/>
</filter>
<filter id='figure' x='-3%' y='-3%' width='106%' height='106%' color-interpolation-filters='sRGB'>
  ${warp}
  <feTurbulence type='fractalNoise' baseFrequency='0.0016 0.05' numOctaves='2' seed='21' result='streak'/>
  <feDisplacementMap in='streak' in2='warp' scale='90' xChannelSelector='R' yChannelSelector='G'/>
  <feColorMatrix type='matrix' values='0 0 0 0 0.25 0 0 0 0 0.14 0 0 0 0 0.065 0 1.9 0 0 -1.02'/>
</filter>
<filter id='grain' x='-3%' y='-3%' width='106%' height='106%' color-interpolation-filters='sRGB'>
  ${warp}
  <feTurbulence type='fractalNoise' baseFrequency='0.0022 0.13' numOctaves='3' seed='8' result='streak'/>
  <feDisplacementMap in='streak' in2='warp' scale='90' xChannelSelector='R' yChannelSelector='G'/>
  <feColorMatrix type='matrix' values='0 0 0 0 0.03 0 0 0 0 0.015 0 0 0 0 0.008 -2.1 0 0 0 1.18'/>
</filter>
</defs>
<rect width='${W}' height='${H}' fill='#170b05'/>
<rect width='${W}' height='${H}' filter='url(#tone)'/>
<rect width='${W}' height='${H}' filter='url(#figure)'/>
<rect width='${W}' height='${H}' filter='url(#grain)'/>
${SEAMS.map(y => `<rect y='${y}' width='${W}' height='2.5' fill='#090402'/><rect y='${y + 2.5}' width='${W}' height='1' fill='#6a4428' fill-opacity='.12'/>`).join('')}
${JOINTS.map(([x, y0, y1]) => `<rect x='${x}' y='${y0}' width='2' height='${y1 - y0}' fill='#090402'/><rect x='${x + 2}' y='${y0}' width='1' height='${y1 - y0}' fill='#6a4428' fill-opacity='.1'/>`).join('')}
<g stroke='#d9a46c' stroke-opacity='.045' stroke-width='1.2' fill='none' stroke-linecap='round'>${SCRATCHES.map(d => `<path d='${d}'/>`).join('')}</g>
</svg>`);

export const LEATHER_GRAIN = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
<filter id='l' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/>
<feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 0 0 0 0.62'/></filter>
<rect width='600' height='600' filter='url(#l)'/></svg>`);

export const LEATHER_MOTTLE = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000' viewBox='0 0 1600 1000' preserveAspectRatio='none'>
<filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.006' numOctaves='3' seed='4'/>
<feColorMatrix type='matrix' values='0 0 0 0 0.42 0 0 0 0 0.13 0 0 0 0 0.10 0.5 0 0 0 -0.17'/></filter>
<rect width='1600' height='1000' filter='url(#m)'/></svg>`);

export const TOOLING_WEAR = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700'>
<filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='2' stitchTiles='stitch'/>
<feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -0.9'/></filter>
<rect width='700' height='700' filter='url(#w)'/></svg>`);
