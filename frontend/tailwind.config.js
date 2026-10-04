import plugin from 'tailwindcss/plugin';

// The Candlelit Desk palette (DESIGN.md). It is defined once, here. Each color becomes a
// Tailwind color (bg-oxblood, text-sepia/70, border-parchment-deep) and a CSS variable of
// RGB channels on :root (--c-oxblood: 114 28 21), so CSS rules and inline styles use the
// same values: rgb(var(--c-oxblood)) or rgb(var(--c-oxblood) / 0.4).
const palette = {
  // The room and the paper on it
  night: '#120b0a',            // the stage behind every screen
  ink: '#1a1311',              // iron-gall ink: text on paper, dark wells, hard rules
  mahogany: '#2b170c',         // the desk wood's own color, under its texture
  sepia: '#5a3a28',            // hairlines, underlines and secondary text on paper
  parchment: '#f0e2c0',        // the base of every paper object
  'parchment-deep': '#e4cfa0', // inset wells, older paper, text on dark grounds
  cream: '#fdfaf4',            // the brightest paper; text and labels on dark grounds

  // The one action ink, and the same ink lifted so it reads on the night stage
  oxblood: '#721c15',
  'oxblood-lit': '#d4705f',

  // Gold: candle gold means gilded, chosen or brass; gold leaf is the hub tomes' lettering
  'candle-gold': '#d4af37',
  'gold-leaf': '#c49d47',

  // Emerald: the register tome's leather, and the seal on confirmed and successful states
  'register-green': '#0b1f12',
  'seal-green': '#065f46',
  'seal-green-lit': '#5fae8b',

  // The GM's night side: ground, raised panels, and the moonlit chrome on them
  'gm-night': '#0c1c32',
  'gm-slate': '#1e3a5f',
  'moonlight-steel': '#93adcf',

  // Game colors: the five roles and the three drives (data, not decoration)
  'role-face': '#9a8235',
  'role-muscle': '#7a4822',
  'role-scholar': '#1e4f72',
  'role-slink': '#2a4d25',
  'role-weird': '#4a2870',
  'drive-nerve': '#7a4822',
  'drive-cunning': '#2a4d25',
  'drive-intuition': '#4a2870',
};

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const colors = Object.fromEntries(
  Object.keys(palette).map((name) => [name, `rgb(var(--c-${name}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors,
      // Bare `border` and `ring` classes take palette colors instead of Tailwind's gray and blue.
      borderColor: { DEFAULT: 'rgb(var(--c-parchment-deep) / 0.6)' },
      ringColor: { DEFAULT: 'rgb(var(--c-candle-gold))' },
      fontFamily: {
        // Display: the wordmark, tome and page titles, letterheads, the Herald's masthead.
        display: ['"IM Fell English"', '"Crimson Text"', 'Georgia', 'serif'],
        // Body and titles: everything read as prose or as a name.
        serif: ['"Crimson Text"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': Object.fromEntries(
          Object.entries(palette).map(([name, hex]) => [`--c-${name}`, channels(hex)]),
        ),
      });
    }),
  ],
};
