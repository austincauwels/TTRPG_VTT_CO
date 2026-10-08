import React, { useLayoutEffect, useState } from 'react';
import { agedPaper } from './paperArt';

// The loose papers on the hub's desk, each a physical object on aged, used paper (owner's
// round 4 items 2 and 4): no clean frames; every sheet is cut, stained, foxed, creased or
// dog-eared in its own way (paperArt.js), and the art on it stays whole. Each is at least as
// large as a railway ticket on the same screen (owner, 2026-10-05), lies at its own angle in
// a pile, some under the Herald, the tomes or each other (owner, 2026-10-05), and is placed
// by the object it lies under, so it stays with that object at every width; its size, its
// place, its angle, its place in the pile and the screens it shows on are in
// DeskStyles.jsx (Loose papers). Each visit drops it a little differently about that place
// and angle, and shuffles the pile (dropPapers below). However far a paper is turned, its
// shadow falls away from the candles (useCastShadows.js measures it in the paper's own
// frame, wherever this visit dropped it). Every image loads lazily, so a screen never
// fetches the papers it leaves out. Decorative: hidden from screen readers, no clicks.
//
// Each is two layers on wide screens, like everything on the desk (The Smooth Hub Rule):
// its cast shadow (.cast) and its body (.sketch-paper), where the cut, the stains and the
// art are drawn once. A curled corner throws a little more shadow (.cast::after).
//
// W x H is the sheet's shape and the units its edges are drawn in (about a pixel each).
const PARCHMENT = 'rgb(var(--c-parchment))';
// Under the app's base path, so a build served from a sub-path finds them too
const IMG = `${import.meta.env.BASE_URL || '/'}images/`;
const PAPERS = {
  // The three field sketches from round 3, named for where they first lay (by the candles,
  // by the tomes, on the Herald)
  candles: {
    src: IMG + 'cryp1.jpg', W: 300, H: 412, seed: 11, img: 'aged-paper-img', lazy: true,
    edges: ['deckle', 'worn', 'deckle', 'deckle'], corners: { br: { ear: 44 } },
    creases: [[[0, 0.56], [1, 0.5]]], stain: { yellow: 0.3, fox: 12 },
  },
  tomes: {
    src: IMG + 'cryp2.webp', W: 360, H: 271, seed: 23, img: 'aged-paper-img scale-[1.06]', tone: PARCHMENT, lazy: true,
    edges: ['worn', 'deckle', 'worn', 'torn'], corners: { tr: { torn: 30 }, br: { r: 6 } },
    creases: [[[0.63, 0], [0.59, 1]]], curl: 'bl', stain: { yellow: 0.26, fox: 9 },
  },
  herald: {
    src: IMG + 'cryp3.jpg', W: 320, H: 338, seed: 37, img: 'aged-paper-img', tone: PARCHMENT, lazy: true,
    edges: ['deckle', 'deckle', 'torn', 'worn'], corners: { tl: { r: 7 } },
    creases: [[[0, 0.34], [1, 0.42]]], curl: 'tr', stain: { yellow: 0.3, fox: 11 },
  },
  // The owner's new cryptids (round 4 item 4), each a different object.
  // A page torn out of an old book: ragged where it left the binding, the other side's
  // text showing through
  page: {
    src: IMG + 'cryptids/sea-monster.webp', W: 300, H: 359, seed: 53, lazy: true,
    edges: ['cut', 'cut', 'cut', 'torn'], corners: { tr: { r: 4 }, br: { r: 5 } },
    curl: 'br', creases: [[[0.08, 0], [0.12, 1]]], stain: { yellow: 0.24, fox: 10 },
  },
  // A bestiary leaf: vellum with a worn gilt edge, cockled, worm holes through it
  bestiary: {
    src: IMG + 'cryptids/bestiary-lions.webp', W: 280, H: 422, seed: 61, lazy: true,
    edges: ['worn', 'deckle', 'worn', 'worn'], corners: { tl: { r: 9 }, br: { r: 7 } },
    holes: [[0.07, 0.06, 2.6], [0.11, 0.085, 1.8], [0.9, 0.95, 2.2], [0.055, 0.6, 1.6]],
    gilt: [0, 1], creases: [[[0, 0.28], [1, 0.33]], [[0, 0.71], [1, 0.66]]],
    stain: { yellow: 0.18, fox: 5, rim: 0.8 },
  },
  // A hand-coloured print pinned down with a brass tack, a corner curling up
  pinned: {
    src: IMG + 'cryptids/sea-monk.webp', W: 236, H: 378, seed: 71, lazy: true,
    edges: ['deckle', 'deckle', 'deckle', 'deckle'], corners: { bl: { r: 6 } },
    curl: 'br', tack: [0.14, 0.035], stain: { yellow: 0.26, fox: 9 },
  },
  // A photograph of the woodcut: sepia, a white deckle-cut border, three black album
  // corners still on it (the fourth came away)
  photo: {
    src: IMG + 'cryptids/blemmye.webp', W: 260, H: 247, seed: 83, lazy: true,
    tone: '#ece4d2', inset: '7% 7.4%', img: 'paper-photo-img', artClass: 'paper-photo',
    edges: ['scallop', 'scallop', 'scallop', 'scallop'],
    stain: { yellow: 0.14, fox: 4, rim: 0.55 }, photoCorners: ['tl', 'tr', 'br'],
  },
  // A picture postcard, a corner bent over so the stamp and postmark on its back show. Old
  // card like the sketches beside it: yellowed unevenly, its rim tea-stained, foxed, its
  // corners worn round, a soft bend across it, the print sunk into the card's own tone
  postcard: {
    src: IMG + 'cryptids/sea-swine.webp', W: 330, H: 210, seed: 97, lazy: true,
    tone: '#e4d3ad', inset: '3% 4.5%', img: 'aged-print-img',
    edges: ['worn', 'cut', 'worn', 'cut'],
    corners: { tl: { ear: 64, post: true, back: '#cdbb94', backLit: '#e6d6b2' }, tr: { r: 9 }, br: { r: 8 }, bl: { r: 10 } },
    creases: [[[0.58, 0], [0.55, 1]]], curl: 'br',
    stain: { yellow: 0.34, fox: 14, rim: 1 },
  },
  // A leaf from an anatomist's sketchbook, the study done in red chalk (the owner's sixth
  // cryptid, approved 2026-10-05): torn along the binding where it came out, the stitch
  // holes still in it, the other edges cut, a corner curling up off the desk. The chalk
  // keeps its red; only the paper under it ages (.aged-chalk-img).
  sketchbook: {
    src: IMG + 'cryptids/red-ink-creature.webp', W: 270, H: 310, seed: 109, lazy: true,
    tone: '#ecdcbb', inset: '2.5% 3% 3% 7%', img: 'aged-chalk-img',
    edges: ['cut', 'cut', 'cut', 'torn'], corners: { tr: { r: 5 }, br: { r: 6 } },
    holes: [[0.062, 0.14, 1.5], [0.06, 0.38, 1.5], [0.064, 0.62, 1.5], [0.061, 0.86, 1.5]],
    curl: 'tr', creases: [[[0.2, 0], [0.26, 1]]], stain: { yellow: 0.22, fox: 8, rim: 0.7 },
  },
};

// Drawn once, when the hub's code first loads
const ART = Object.fromEntries(Object.entries(PAPERS).map(([k, p]) => [k, agedPaper(p)]));

// Where a curled corner's extra shadow lies
const CURL_AT = { tl: ['-6%', '-6%'], tr: ['70%', '-6%'], br: ['70%', '72%'], bl: ['-6%', '72%'] };
// A dog-eared or torn-off corner is cut out of the cast shadow too: a gradient running in
// from that corner, its hard stop on the corner's diagonal
const CUT_FROM = { tl: '135deg', tr: '225deg', br: '315deg', bl: '45deg' };
const castCut = (p) => {
  const at = Object.keys(p.corners || {}).find((k) => p.corners[k].ear || p.corners[k].torn);
  if (!at) return null;
  const c = p.corners[at];
  return { '--cut-at': CUT_FROM[at], '--cut': `${(((c.ear || c.torn) / (p.W + p.H)) * 100).toFixed(1)}%` };
};

// Black paper album corners, a little bigger than the photograph's own corners
const PhotoCorners = ({ at, W, H }) => (
  <svg className="paper-over" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><filter id="pc-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2" /></filter></defs>
    {at.map((c) => {
      const right = c.includes('r');
      const bottom = c.includes('b');
      return (
        <g key={c} transform={`translate(${right ? W : 0} ${bottom ? H : 0}) scale(${right ? -1 : 1} ${bottom ? -1 : 1})`}>
          <path d="M-3 -3H36L-3 36Z" fill="#000" opacity="0.4" transform="translate(1.2 1.6)" filter="url(#pc-soft)" />
          <path d="M-3 -3H36L-3 36Z" fill="#17110e" />
          <path d="M36 -3L-3 36" stroke="#8a7766" strokeOpacity="0.55" strokeWidth="1" />
        </g>
      );
    })}
  </svg>
);

// Each visit drops the papers a little differently (the user's request, 2026-10-08): one
// draw as the hub mounts (dropPapers, kept in CampaignSelector's state), so a new visit or
// a reload draws again and nothing moves while you stay. For each paper three numbers from
// 0 to 1: where in its own ranges it lies across, down and turned (--jx, --jy, --jr). The
// ranges are in DeskStyles.jsx (The drop), for each paper on each kind of screen, measured
// so that every rule of the desk holds at their ends; a paper never changes size. Its place
// in its layer of the pile (--pile, from 1): the papers of the tomes' row and those of the
// Herald's group are each shuffled, and DeskStyles.jsx sets which of them share a layer
// (--z), so none ever leaves its own. The sea monk and the lamia stay at the foot of the
// row (no --pile, so 0), as they lay: raised over another paper, either one costs the hub
// a compositing layer more (measured at 1280 and 1920 wide; The Smooth Hub Rule). Last,
// the order in which the notebook's sketches take the papers.
const PILES = [['sketchbook', 'photo', 'herald', 'candles'], ['page', 'postcard', 'bestiary']];
// The papers a sketch from the user's notebook may lie on: the field sketches, the torn
// page, the pinned print and the bestiary leaf. The red chalk sketchbook leaf keeps the
// owner's art; the photograph and the postcard are not sheets anyone would draw on.
const NOTEBOOK_PAPERS = ['tomes', 'candles', 'herald', 'page', 'pinned', 'bestiary'];
const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const unit = () => Math.random().toFixed(3);
export const dropPapers = () => {
  const style = Object.fromEntries(Object.keys(PAPERS).map((k) => [k, { '--jx': unit(), '--jy': unit(), '--jr': unit() }]));
  PILES.forEach((pile) => shuffled(pile).forEach((k, i) => { style[k]['--pile'] = i + 1; }));
  return { style, notebook: shuffled(NOTEBOOK_PAPERS) };
};

// The papers the desk shows at its present size, as DeskStyles.jsx decides it (the one
// place that says so): read from the page when the hub mounts and again when the window
// changes size, so the sketches always go to papers that are there.
export const useShownPapers = (rootRef) => {
  const [shown, setShown] = useState('');
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const read = () => setShown([...root.querySelectorAll('.sketch')]
      .filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.dataset.paper).join(' '));
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return shown;
};

// The papers the sketches take, in this visit's order among the papers the desk shows, so
// a different print gives way each visit and the first sketch always shows wherever there
// is a paper for it (on phones and tablets, which show only the torn page and the
// sketchbook leaf, the torn page); a desk with fewer such papers than sketches leaves the
// rest out.
export const notebookSlots = (drop, shown) => {
  const there = new Set(shown.split(' '));
  return drop.notebook.filter((k) => there.has(k));
};
export const sketchInSlot = (sketches, which, slots) => {
  const i = slots.indexOf(which);
  return i >= 0 ? sketches[i] || null : null;
};

export const CryptidSketch = ({ which, drop, className = '', notebook = null }) => {
  const p = PAPERS[which];
  const a = ART[which];
  const curl = p.curl ? CURL_AT[p.curl] : null;
  return (
    <div
      aria-hidden="true"
      data-hub="sketch"
      data-paper={which}
      data-cast="0.16"
      data-curl={p.curl || undefined}
      className={`sketch ${className}`}
      style={{ aspectRatio: `${p.W} / ${p.H}`, '--shape': a.mask, ...castCut(p), ...(curl ? { '--curl-l': curl[0], '--curl-t': curl[1] } : null), ...drop?.style[which] }}
    >
      <span className="cast" />
      <span className="sketch-paper">
        <span className="paper-sheet" style={{ backgroundColor: p.tone, WebkitMaskImage: a.mask, maskImage: a.mask }}>
          <span className={`paper-art ${p.artClass || ''}`} style={p.inset ? { inset: p.inset } : undefined}>
            {notebook ? (
              // A sketch from the user's notebook, whole on the sheet, its white taking the
              // paper's own tone (.notebook-sketch-img)
              <img src={notebook.image_data} alt="" draggable={false} decoding="async"
                className="block w-full h-full object-contain notebook-sketch-img" />
            ) : (
              <img src={p.src} alt="" draggable={false} decoding="async" loading={p.lazy ? 'lazy' : undefined}
                className={`block w-full h-full object-cover ${p.img || ''}`} />
            )}
          </span>
          <span className="paper-stain" style={{ backgroundImage: a.stain }} />
          {a.light && <span className="paper-light" style={{ backgroundImage: a.light }} />}
        </span>
        {p.photoCorners && <PhotoCorners at={p.photoCorners} W={p.W} H={p.H} />}
        {p.tack && <span className="paper-tack" style={{ left: `${p.tack[0] * 100}%`, top: `${p.tack[1] * 100}%` }} />}
      </span>
    </div>
  );
};
