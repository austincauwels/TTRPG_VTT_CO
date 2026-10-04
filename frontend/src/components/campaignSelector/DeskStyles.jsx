import React from 'react';
import { WOOD_IMAGE, LEATHER_GRAIN, LEATHER_MOTTLE, TOOLING_WEAR } from './deskArt';

// Card stock for the tickets: parchment with a faint fibre
const PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")";
const HERALD_PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e4cfa0' filter='url(%23paper)'/%3E%3C/svg%3E\")";
const TOME_LEATHER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='4' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' filter='url(%23leather)'/%3E%3C/svg%3E\")";

// Every hub class (.tome, .ticket, .roster-book, ...) is defined here and only exists while
// the chapter hub is mounted. The desk is seen from above, lit by the candle cluster in its
// top left corner: a small warm pool that falls off fast into a dim room, shadows cast away
// from the flames, and a gentle flicker that moves the light and the shadows together.
export const DeskStyles = () => (
  <style>{`
    /* Faces and pens are loaded once in index.html. */

    /* ── The flicker ──
       Two numbers move on the room: --flk-s (the flames flaring and dipping: the light
       reaches further and the shadows shorten) and --flk-x (a sideways sway). The light,
       the shade and every cast shadow read them, so they move as one. Wide screens only;
       phones and reduced motion hold still. */
    @property --flk-s { syntax: '<number>'; inherits: true; initial-value: 1; }
    @property --flk-x { syntax: '<number>'; inherits: true; initial-value: 0; }
    @keyframes hubFlicker {
      0%, 100% { --flk-s: 1; --flk-x: 0; }
      9%  { --flk-s: 1.03; --flk-x: 0.5; }
      21% { --flk-s: 0.975; --flk-x: -0.35; }
      34% { --flk-s: 1.018; --flk-x: 0.15; }
      47% { --flk-s: 0.962; --flk-x: -0.7; }
      61% { --flk-s: 1.036; --flk-x: 0.45; }
      74% { --flk-s: 0.985; --flk-x: -0.15; }
      88% { --flk-s: 1.012; --flk-x: 0.3; }
    }
    @media (min-width: 1024px) {
      .hub-room { animation: hubFlicker 4.3s ease-in-out infinite; }
    }

    /* ── The desk: wood with a tooled leather writing inset ── */
    .hub-wood {
      position: absolute; inset: 0;
      background-color: #24130a;
      background-image: ${WOOD_IMAGE};
      background-size: cover;
      background-position: center top;
    }
    /* The leather sits a step below the wood: the wood's edge throws a small shadow onto it
       on the sides away from the light, and catches a hairline of light on the others. */
    .hub-leather {
      position: absolute; inset: 10px 10px 12px 10px;
      border-radius: 3px;
      background-color: #270c0b;
      background-image: ${LEATHER_GRAIN}, ${LEATHER_MOTTLE};
      background-size: 600px 600px, cover;
      box-shadow:
        inset 3px 4px 7px rgba(0,0,0,0.78),
        inset -1px -1px 1px rgba(255,214,170,0.07),
        0 0 0 1px rgba(0,0,0,0.72),
        0 0 0 2px rgba(150,96,56,0.16);
    }
    @media (min-width: 640px) { .hub-leather { inset: 14px 18px 16px 18px; } }
    @media (min-width: 1024px) {
      .hub-leather { inset: 2.6vh max(3.2vw, calc(50vw - 940px)) 3vh max(3.2vw, calc(50vw - 940px)); }
    }
    /* Where hands rest: the leather worn smoother and a little lighter, with a soft sheen */
    .hub-leather-wear {
      position: absolute; inset: 0; border-radius: inherit;
      background:
        radial-gradient(ellipse 30% 22% at 50% 97%, rgba(255,214,176,0.075), transparent 72%),
        radial-gradient(ellipse 22% 16% at 30% 95%, rgba(255,214,176,0.04), transparent 70%),
        radial-gradient(ellipse 22% 16% at 70% 95%, rgba(255,214,176,0.04), transparent 70%);
    }
    /* The tooled gilt border: a line and a finer one inside it, worn unevenly */
    .hub-tooling {
      position: absolute; inset: 9px; border-radius: 1px;
      border: 1px solid rgb(var(--c-gold-leaf) / 0.42);
      -webkit-mask-image: ${TOOLING_WEAR}; mask-image: ${TOOLING_WEAR};
      -webkit-mask-size: 700px 700px; mask-size: 700px 700px;
    }
    .hub-tooling::after {
      content: ''; position: absolute; inset: 3px;
      border: 1px solid rgb(var(--c-gold-leaf) / 0.26);
    }
    @media (min-width: 1024px) { .hub-tooling { inset: 15px; } .hub-tooling::after { inset: 4px; } }
    /* Old marks on the desk: a cup ring and an ink stain */
    .hub-cup { position: absolute; width: 74px; left: 2px; bottom: 6%; opacity: 0.9; }
    .hub-ink { position: absolute; width: 64px; right: 5%; top: 4px; }
    @media (min-width: 1024px) {
      .hub-cup { width: 92px; left: max(0.6vw, calc(50vw - 990px)); bottom: 5vh; }
      .hub-ink { width: 84px; right: auto; left: 41%; top: 0.6vh; }
    }

    /* ── The candle cluster (CandleCluster.jsx), seen from above ──
       The box sits in the top left of the desk, just above the tomes. The desk glow, the
       light pool and the shade are centered on the flames' middle (.candle-center). */
    .candle-box { top: 2px; left: 6px; width: 96px; aspect-ratio: 230 / 190; }
    @media (min-width: 640px) { .candle-box { top: 4px; left: 14px; width: 128px; } }
    @media (min-width: 1024px) { .candle-box { top: 4px; left: 0.5%; width: clamp(190px, 15.5vw, 270px); } }
    .candle-center { position: absolute; left: 52.5%; top: 53%; width: 0; height: 0; }

    /* Each flame sways on its own uneven rhythm (durations set per candle); the core
       brightens and dims on a shorter one, and the halo breathes with the sway. */
    .flame { transform-box: fill-box; transform-origin: 50% 80%; animation: flameSway 3s ease-in-out infinite; }
    .flame-core { animation: flameCore 1.8s ease-in-out infinite; }
    .flame-halo { transform-box: fill-box; transform-origin: center; animation: haloBreath 3s ease-in-out infinite; }
    .flame-light { transform-box: fill-box; transform-origin: 50% 70%; animation: flameCatch 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
    @keyframes flameSway {
      0%   { transform: translate(0, 0) scale(1, 1); }
      14%  { transform: translate(-0.4px, -0.3px) scale(0.94, 1.08); }
      29%  { transform: translate(0.3px, 0.2px) scale(1.05, 0.95); }
      43%  { transform: translate(-0.2px, -0.2px) scale(0.97, 1.05); }
      58%  { transform: translate(0.5px, 0.1px) scale(1.04, 0.94); }
      72%  { transform: translate(-0.3px, -0.4px) scale(0.95, 1.06); }
      86%  { transform: translate(0.2px, 0) scale(1.02, 0.99); }
      100% { transform: translate(0, 0) scale(1, 1); }
    }
    @keyframes flameCore {
      0%, 100% { opacity: 0.95; }
      30% { opacity: 0.78; }
      47% { opacity: 1; }
      71% { opacity: 0.86; }
    }
    @keyframes haloBreath {
      0%, 100% { opacity: 1; transform: scale(1); }
      37% { opacity: 0.8; transform: scale(0.95); }
      64% { opacity: 0.94; transform: scale(1.04); }
    }
    @keyframes flameCatch {
      0%   { opacity: 0; transform: scale(0.2); }
      55%  { opacity: 1; transform: scale(1.12); }
      100% { opacity: 1; transform: scale(1); }
    }
    /* The candles' own shadows stretch and shorten with the room's flicker */
    .candle-shadow { transform: scale(calc(2 - var(--flk-s, 1))); }

    /* The flames' warm light on the desk under them (below the books and papers): a
       screen blend, so the wood and leather near the cluster brighten in their own colors
       and the candles' shadows show on it. */
    .desk-glow {
      position: absolute; width: 760px; height: 760px; left: 0; top: 0;
      transform: translate(-50%, -50%);
      background: radial-gradient(closest-side, rgba(255,168,88,0.34), rgba(255,150,70,0.15) 28%, rgba(255,140,60,0.04) 58%, rgba(255,140,60,0));
      mix-blend-mode: screen;
      opacity: var(--light, 1);
    }
    @media (max-width: 1023px) { .desk-glow { width: 460px; height: 460px; opacity: calc(var(--light, 1) * 0.8); } }

    /* Above the objects: the pool warms what lies near the flames in its own colors (soft
       light), and the shade takes the rest of the room down into the dark, so every object
       is lit on the side that faces the candles and darker away from them. The boxes that
       hold them must not form a stacking context (no z-index, opacity or transform), or the
       blend has nothing to light. */
    .hub-light {
      position: absolute; left: 0; top: 0; width: 1040px; height: 800px;
      transform: translate(-50%, -50%) translate(calc(var(--flk-x, 0) * 5px), calc((var(--flk-s, 1) - 1) * -40px)) scale(var(--flk-s, 1));
      background: radial-gradient(closest-side, rgba(255,176,92,0.74), rgba(255,160,80,0.38) 18%, rgba(255,150,70,0.1) 42%, rgba(255,140,60,0) 66%);
      mix-blend-mode: soft-light;
      opacity: var(--light, 1);
    }
    @media (max-width: 1023px) { .hub-light { width: 760px; height: 620px; } }
    .hub-shade {
      position: absolute; left: 0; top: 0; width: 440vmax; height: 440vmax;
      transform: translate(-50%, -50%) translate(calc(var(--flk-x, 0) * 4px), 0) scale(var(--flk-s, 1));
      background: radial-gradient(circle at center,
        rgba(8,4,2,0) 0, rgba(8,4,2,0) 140px,
        rgba(8,4,2,calc(var(--shade, 0.42) * 0.45)) 360px,
        rgba(8,4,2,calc(var(--shade, 0.42) * 0.82)) 700px,
        rgba(8,4,2,var(--shade, 0.42)) 1050px,
        rgba(8,4,2,calc(var(--shade, 0.42) * 1.18)) 1600px);
    }
    @media (max-width: 1023px) { .hub-shade { --shade: 0.48; } }
    @media (min-width: 1024px) { .hub-shade { --shade: 0.46; } }

    /* ── Cast shadows ──
       Every object on the desk carries a .cast child: a soft dark copy of its outline,
       thrown away from the candles. CampaignSelector measures each object's place against
       the flames and sets --sx, --sy (the offset) and --sb (the blur) on it; the flicker
       shortens and sways it. Lifting an object (hover) throws its shadow further (--lift).
       The object itself has no background, so the shadow can sit under its surface. */
    .cast {
      position: absolute; inset: 0; z-index: -1; pointer-events: none;
      border-radius: inherit;
      transform: translate(calc(var(--sx, 5px) * var(--lift, 1)), calc(var(--sy, 9px) * var(--lift, 1)));
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cast::before {
      content: ''; position: absolute; inset: 1px; border-radius: inherit;
      background: rgb(0 0 0 / var(--so, 0.86));
      filter: blur(var(--sb, 11px));
      transform: translate(
        calc(var(--sx, 5px) * (1 - var(--flk-s, 1)) * 2.4 - var(--flk-x, 0) * 1.6px),
        calc(var(--sy, 9px) * (1 - var(--flk-s, 1)) * 2.4));
      will-change: transform;
    }

    /* ── Tomes ──
       From above: the front board on top, the text block's fore edge (right) and tail
       (bottom) showing under it, mitred at the corner, and the back board just beyond them.
       The spine's round and its hinge groove run down the left of the cover; the cover's
       frames start clear of the hinge. */
    .tome {
      position: relative; isolation: isolate;
      aspect-ratio: 1 / 1.36;
      --er: 9px; --eb: 7px; --bd: 3px; --hinge: 8.5%;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      border-radius: 5px 12px 12px 5px;
    }
    @media (max-width: 639px) { .tome { --er: 6px; --eb: 5px; --bd: 2px; } }
    .tome:hover, .tome:focus-visible { --lift: 1.5; }
    .tome-board {
      position: absolute; top: 6px; left: 6px; right: 0; bottom: 0;
      border-radius: 4px 10px 10px 4px;
      background: var(--leather);
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5), inset -3px -3px 5px rgba(0,0,0,0.55);
    }
    .tome-board::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: rgba(0,0,0,0.35); }
    .tome-fore {
      position: absolute; top: 5px; bottom: var(--bd); right: var(--bd);
      width: calc(var(--er) + 16px);
      border-radius: 0 7px 7px 0;
      background:
        linear-gradient(to bottom, rgba(40,22,10,0) 50%, rgba(40,22,10,0.45)),
        repeating-linear-gradient(90deg, #d9c7a1 0 1px, #b8a27a 1px 2px);
      box-shadow: inset 5px 0 6px -2px rgba(0,0,0,0.72), inset -1px 0 0 rgba(0,0,0,0.35);
    }
    .tome-tail {
      position: absolute; left: 8px; right: var(--bd); bottom: var(--bd);
      height: calc(var(--eb) + 16px);
      border-radius: 0 0 7px 3px;
      background:
        linear-gradient(to right, rgba(40,22,10,0.1), rgba(40,22,10,0.5)),
        repeating-linear-gradient(180deg, #d2bf98 0 1px, #ad9770 1px 2px);
      box-shadow: inset 0 5px 6px -2px rgba(0,0,0,0.72), inset 0 -1px 0 rgba(0,0,0,0.35);
      clip-path: polygon(0 0, calc(100% - var(--er)) 0, 100% 100%, 0 100%);
    }
    /* A ledger's sprinkled red edge */
    .tome-sprinkled .tome-fore {
      background:
        radial-gradient(circle at 30% 40%, rgb(var(--c-oxblood) / 0.55) 0 0.7px, transparent 1.1px) 0 0 / 5px 7px,
        radial-gradient(circle at 70% 75%, rgb(var(--c-oxblood) / 0.45) 0 0.6px, transparent 1px) 0 0 / 7px 5px,
        linear-gradient(to bottom, rgba(40,22,10,0) 50%, rgba(40,22,10,0.45)),
        repeating-linear-gradient(90deg, #d9c7a1 0 1px, #b8a27a 1px 2px);
    }
    .tome-sprinkled .tome-tail {
      background:
        radial-gradient(circle at 30% 40%, rgb(var(--c-oxblood) / 0.55) 0 0.7px, transparent 1.1px) 0 0 / 7px 5px,
        radial-gradient(circle at 70% 75%, rgb(var(--c-oxblood) / 0.45) 0 0.6px, transparent 1px) 0 0 / 5px 7px,
        linear-gradient(to right, rgba(40,22,10,0.1), rgba(40,22,10,0.5)),
        repeating-linear-gradient(180deg, #d2bf98 0 1px, #ad9770 1px 2px);
    }
    .tome-cover {
      position: absolute; top: 0; left: 0;
      right: calc(var(--er) + var(--bd)); bottom: calc(var(--eb) + var(--bd));
      border-radius: 5px 11px 11px 5px;
      background: var(--leather);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.05),
        inset -2px 0 5px rgba(255,255,255,0.04),
        inset 0 -4px 8px rgba(0,0,0,0.5),
        2px 2px 3px rgba(0,0,0,0.55);
      overflow: hidden;
      container-type: inline-size;
    }
    /* The spine's round, falling away to the left */
    .tome-cover::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: var(--hinge);
      background: linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.45) 45%, rgba(255,255,255,0.05) 85%, rgba(0,0,0,0.25));
      z-index: 2;
    }
    .tome-hinge {
      position: absolute; top: 0; bottom: 0; left: var(--hinge); width: 6px;
      background: linear-gradient(to right, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 45%, rgba(255,255,255,0.07) 75%, rgba(0,0,0,0.2));
      z-index: 2;
    }
    .tome-frame {
      position: absolute; pointer-events: none; z-index: 2;
      top: var(--fi); bottom: var(--fi); right: var(--fi);
      left: calc(var(--hinge) + 6px + var(--fi) * 0.75);
      border-radius: 2px;
    }
    .tome-frame-blind { border: 2px solid rgba(0,0,0,0.42); box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1), 1px 1px 0 rgba(255,255,255,0.05); }
    .tome-frame-blind.is-fine { border-width: 1px; border-color: rgba(0,0,0,0.32); }
    .tome-frame-gilt { border: 3px solid rgb(var(--c-gold-leaf) / 0.4); box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }
    .tome-content {
      position: absolute; z-index: 3;
      top: 8%; bottom: 8%; right: 9%; left: calc(var(--hinge) + 8%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center;
    }
    .leather-texture {
      position: absolute; inset: 0; z-index: 1;
      border-radius: inherit;
      background-image: ${TOME_LEATHER};
      mix-blend-mode: multiply;
      opacity: 0.6;
      pointer-events: none;
    }

    /* The Case Ledger's label, pasted on the cover a little crooked: aged paper with a
       printed double rule, one ruled entry per kind of record and its tally in ink */
    .ledger-label {
      position: relative; display: flex; flex-direction: column; gap: 0.1em;
      width: 80%; padding: 0.7em 0.85em 0.6em;
      font-family: 'Crimson Text', Georgia, serif; font-style: italic;
      font-size: clamp(12px, 5.4cqw, 19px); line-height: 1.35; text-align: left;
      color: rgb(var(--c-ink));
      background-color: #d9c497;
      background-image:
        radial-gradient(ellipse 70% 60% at 30% 25%, rgba(255,246,220,0.32), transparent 70%),
        linear-gradient(to bottom right, rgba(90,58,40,0.04), rgba(90,58,40,0.2));
      border-radius: 1px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.6), 1px 2px 5px rgba(0,0,0,0.35), inset 0 0 14px rgba(90,58,40,0.38);
      transform: rotate(-1.4deg);
    }
    .ledger-label::before {
      content: ''; position: absolute; inset: 4px; pointer-events: none;
      border: 1px solid rgb(var(--c-sepia) / 0.55);
      box-shadow: inset 0 0 0 2px rgba(0,0,0,0), inset 0 0 0 3px rgb(var(--c-sepia) / 0.3);
    }
    .ledger-row { display: flex; align-items: baseline; gap: 0.3em; min-height: 1.35em; }
    .ledger-entry { flex: 0 1 auto; min-width: 0; }
    .ledger-leader { flex: 1 1 0.6em; min-width: 0.6em; border-bottom: 1px dotted rgb(var(--c-sepia) / 0.7); transform: translateY(-0.25em); }
    .ledger-leader.is-blank { border-bottom-style: solid; border-bottom-color: rgb(var(--c-sepia) / 0.35); transform: none; height: 1.1em; }
    .ledger-tally { flex: none; height: 0.95em; align-self: center; color: rgb(var(--c-ink)); }
    .ledger-row.is-pencil .ledger-tally { color: rgb(var(--c-sepia)); }
    /* On a phone's narrow tome the label takes the cover's width, so entries keep whole words */
    @container (max-width: 230px) {
      .ledger-label { width: 114%; padding: 0.55em 0.6em 0.5em; }
    }
    .mark-emboss { filter: drop-shadow(-1px -1px 0.6px rgba(0,0,0,0.85)) drop-shadow(0.6px 0.6px 0.3px rgba(255,236,190,0.16)); }

    .embossed-gold { color: rgb(var(--c-gold-leaf)); text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.2); }
    .embossed-stamp { box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }

    /* ── Hover and keyboard focus: gilt catching the candlelight ──
       The tome titles and the campaign name warm and glow like gold leaf turned to the
       flame; the tickets' action line glows in its own red ink. The glow fades in, then
       flickers faintly with the candles. Reduced motion: it lights at once and holds. */
    .gilt-glow, .gilt-mark, .ink-glow { transition: color 0.5s ease, text-shadow 0.5s ease, filter 0.5s ease; }
    .tome:hover .gilt-glow, .tome:focus-visible .gilt-glow {
      color: #ebc867;
      text-shadow: -1px -1px 1px rgba(0,0,0,0.85), 1px 1px 1px rgba(255,236,180,0.22), 0 0 7px rgba(255,196,96,0.55), 0 0 22px rgba(255,150,60,0.32);
      animation: giltFlicker 2.9s ease-in-out 0.5s infinite;
    }
    .tome:hover .gilt-mark, .tome:focus-visible .gilt-mark {
      color: #ebc867;
      filter: drop-shadow(-1px -1px 0.6px rgba(0,0,0,0.85)) drop-shadow(0 0 5px rgba(255,190,90,0.5));
    }
    @keyframes giltFlicker {
      0%, 100% { text-shadow: -1px -1px 1px rgba(0,0,0,0.85), 1px 1px 1px rgba(255,236,180,0.22), 0 0 7px rgba(255,196,96,0.55), 0 0 22px rgba(255,150,60,0.32); }
      38% { text-shadow: -1px -1px 1px rgba(0,0,0,0.85), 1px 1px 1px rgba(255,236,180,0.18), 0 0 6px rgba(255,196,96,0.42), 0 0 18px rgba(255,150,60,0.24); }
      67% { text-shadow: -1px -1px 1px rgba(0,0,0,0.85), 1px 1px 1px rgba(255,236,180,0.24), 0 0 8px rgba(255,196,96,0.6), 0 0 24px rgba(255,150,60,0.36); }
    }
    .ticket:hover .ink-glow, .ticket:focus-visible .ink-glow, .ticket-front:focus-visible .ink-glow {
      color: #8e2417;
      text-shadow: 0 0 5px rgba(222,92,58,0.5), 0 0 15px rgba(255,138,72,0.32);
    }

    /* ── Railway tickets ──
       Card stock with a colored company band, a perforation where the stub tears off
       (notched at both edges) and the bite of the inspector's clippers in the top edge, both
       cut with a mask so the desk shows through. The GM's ticket turns over in 3D to its form (her original flip):
       under reduced motion the faces swap in place without spinning. */
    .ticket {
      isolation: isolate;
      border-radius: 4px;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .ticket:hover, .ticket:focus-within { --lift: 1.7; }
    .ticket-card {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      border-radius: 4px;
      background-color: rgb(var(--c-parchment));
      background-image: ${PAPER};
      color: rgb(var(--c-ink));
      box-shadow: inset 0 0 28px rgb(var(--c-sepia) / 0.28), inset 0 0 0 1px rgb(var(--c-sepia) / 0.28);
      container-type: inline-size;
      --perf: 76%;
      --hole-x: 82%; --hole-y: 0px;
      -webkit-mask-image:
        radial-gradient(circle at 0 var(--perf), #0000 6px, #000 6.5px),
        radial-gradient(circle at 100% var(--perf), #0000 6px, #000 6.5px),
        radial-gradient(circle at var(--hole-x) var(--hole-y), #0000 5px, #000 5.6px);
      -webkit-mask-composite: source-in, source-in;
      mask-image:
        radial-gradient(circle at 0 var(--perf), #0000 6px, #000 6.5px),
        radial-gradient(circle at 100% var(--perf), #0000 6px, #000 6.5px),
        radial-gradient(circle at var(--hole-x) var(--hole-y), #0000 5px, #000 5.6px);
      mask-composite: intersect;
    }
    @media (max-width: 639px) { .ticket-card { --perf: 74%; } }
    .ticket-band {
      margin: 7px 7px 0; padding: 5px 3px 4px;
      border-radius: 1px;
      background: var(--band);
      color: rgb(var(--c-cream));
      text-align: center; text-transform: uppercase; white-space: nowrap; overflow: hidden;
      font-size: clamp(9.5px, 5.8cqw, 13.5px); letter-spacing: 0.1em; line-height: 1.15;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25), inset 0 0 0 3px rgb(var(--c-cream) / 0.12);
    }
    .ticket-main {
      position: absolute; left: 0; right: 0; top: 0; bottom: calc(100% - var(--perf));
      display: flex; flex-direction: column;
    }
    .ticket-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; padding: 6px 11px 0; white-space: nowrap; }
    /* A narrow ticket keeps its number and drops the class line */
    @container (max-width: 200px) { .ticket-meta .print-small { display: none; } }
    .ticket-route {
      flex: 1; min-height: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 0 10px; gap: 1px;
    }
    .ticket-station { text-transform: uppercase; letter-spacing: 0.06em; line-height: 1.05; font-size: clamp(14px, 8.4cqw, 21px); }
    .ticket-to { font-style: italic; font-size: clamp(12px, 6.4cqw, 15px); line-height: 1.2; color: rgb(var(--c-sepia)); }
    .ticket-fine { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px 6px; }
    .ticket-perf {
      position: absolute; left: 9px; right: 9px; top: var(--perf); height: 0;
      border-top: 2px dotted rgb(var(--c-sepia) / 0.5);
      transform: translateY(-1px);
    }
    .ticket-stub {
      position: absolute; left: 0; right: 0; bottom: 0; top: var(--perf);
      display: flex; align-items: center; justify-content: center;
      padding: 2px 10px 0;
    }
    .ticket-action {
      color: rgb(var(--c-oxblood));
      text-transform: uppercase; letter-spacing: 0.06em; line-height: 1.05; text-align: center;
      font-size: clamp(14px, 8.4cqw, 19px);
    }
    .ticket-flip {
      position: absolute; inset: 0;
      transform-style: preserve-3d;
      transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .ticket-flip.is-flipped { transform: rotateY(180deg); }
    .ticket-face { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
    .ticket-back { transform: rotateY(180deg); cursor: default; --hole-x: 18%; }
    /* The shadow narrows as the card turns edge-on, and widens again */
    @keyframes castTurn { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.08); } }
    .cast-turn { position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit; }
    .cast-turn.is-turning { animation: castTurn 0.65s cubic-bezier(0.22, 1, 0.36, 1); }

    /* ── Cryptid sketches: loose papers under the tomes' corners, by the candles and the Herald ── */
    .sketch { position: absolute; isolation: isolate; pointer-events: none; }
    .sketch-paper { position: absolute; inset: 0; display: flex; flex-direction: column; }

    /* Folded Herald strip for narrow screens: same paper stock, folded to its masthead */
    .newspaper-strip {
      position: relative;
      background-color: rgb(var(--c-parchment-deep));
      background-image: ${HERALD_PAPER};
      box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -18px 24px -12px rgba(0,0,0,0.45);
      color: rgb(var(--c-ink));
    }
    .newspaper-strip::after {
      content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 10px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.16), transparent);
      pointer-events: none;
    }

    /* The Herald: the sheet itself is a child, so its cast shadow can lie under it */
    .herald { position: absolute; isolation: isolate; }
    .herald-sheet {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; overflow: hidden;
      background-color: rgb(var(--c-parchment-deep));
      background-image: ${HERALD_PAPER};
      box-shadow: 1px 2px 4px rgba(0,0,0,0.55), inset 0 -30px 40px -10px rgba(0,0,0,0.5);
      color: rgb(var(--c-ink));
      border-bottom: 2px solid rgba(0,0,0,0.3);
    }
    /* The fold dropping off the bottom */
    .herald-sheet::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 15px;
      background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
      pointer-events: none; z-index: 10;
    }

    .aged-paper-img {
      mix-blend-mode: multiply;
      filter: grayscale(80%) sepia(40%) contrast(120%) brightness(95%);
    }

    /* Reduced motion: steady light, no flicker, a flip without a spin */
    @media (prefers-reduced-motion: reduce) {
      .hub-room, .flame, .flame-core, .flame-halo, .flame-light, .cast-turn.is-turning,
      .tome:hover .gilt-glow, .tome:focus-visible .gilt-glow { animation: none !important; }
      .gilt-glow, .gilt-mark, .ink-glow, .cast { transition: none !important; }
      .ticket-flip,
      .ticket-flip.is-flipped,
      .ticket-back { transform: none; transition: none; }
      .ticket-flip .ticket-back,
      .ticket-flip.is-flipped .ticket-front { visibility: hidden; }
      .ticket-flip.is-flipped .ticket-back { visibility: visible; }
    }

    /* ── Book open/close animation ── */
    @keyframes bookOpen {
      0%   { transform: perspective(1800px) scale(0.12) rotateX(58deg) translateY(130px); opacity: 0; }
      55%  { opacity: 1; }
      100% { transform: perspective(1800px) scale(1) rotateX(0deg) translateY(0); opacity: 1; }
    }
    @keyframes bookClose {
      0%   { transform: perspective(1800px) scale(1) rotateX(0deg) translateY(0); opacity: 1; }
      45%  { opacity: 1; }
      100% { transform: perspective(1800px) scale(0.12) rotateX(58deg) translateY(130px); opacity: 0; }
    }
    .roster-book { animation: bookOpen 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .roster-book.closing { animation: bookClose 0.4s cubic-bezier(0.36, 0, 0.66, 0) forwards; }

    .book-page {
      background-color: rgb(var(--c-parchment));
      background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        rgb(var(--c-sepia) / 0.08) 27px,
        rgb(var(--c-sepia) / 0.08) 28px
      );
    }
    .book-page-right {
      background-color: rgb(var(--c-parchment));
      background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        rgb(var(--c-sepia) / 0.08) 27px,
        rgb(var(--c-sepia) / 0.08) 28px
      );
    }
  `}</style>
);
