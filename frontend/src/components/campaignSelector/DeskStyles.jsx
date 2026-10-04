import React from 'react';

// Every hub class (.thick-book, .pamphlet, .roster-book, ...) is defined here and only
// exists while the chapter hub is mounted.
export const DeskStyles = () => (
  <style>{`
    /* Faces and pens are loaded once in index.html (Crimson Text, IM Fell English, the 20 pens). */

    /* ── The candle cluster (CandleCluster.jsx) ──
       Where the candles stand: behind the top of the tomes, in a strip of desk under the
       header. The light pool uses the same box so it centers on the flames. */
    .candle-box { top: 132px; left: 6px; width: 128px; aspect-ratio: 240 / 210; }
    @media (min-width: 640px) { .candle-box { top: 144px; left: 14px; width: 156px; } }
    @media (min-width: 1024px) { .candle-box { top: 104px; left: 1%; width: clamp(170px, 15vw, 230px); } }

    /* Each flame sways from its base on its own uneven rhythm (durations set per candle);
       the core brightens and dims on a shorter one, and the halo breathes with the sway. */
    .flame { transform-box: fill-box; transform-origin: 50% 94%; animation: flameSway 3s ease-in-out infinite; }
    .flame-core { animation: flameCore 1.8s ease-in-out infinite; }
    .flame-halo { transform-box: fill-box; transform-origin: center; animation: haloBreath 3s ease-in-out infinite; }
    .flame-light { transform-box: fill-box; transform-origin: 50% 100%; animation: flameCatch 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
    @keyframes flameSway {
      0%   { transform: scale(1, 1) skewX(0deg); }
      11%  { transform: scale(0.97, 1.05) skewX(-2.5deg); }
      23%  { transform: scale(1.02, 0.97) skewX(1.5deg); }
      37%  { transform: scale(0.98, 1.04) skewX(-1deg); }
      52%  { transform: scale(1.03, 0.95) skewX(2.5deg); }
      64%  { transform: scale(0.97, 1.03) skewX(-1.5deg); }
      79%  { transform: scale(1.01, 1.01) skewX(1deg); }
      91%  { transform: scale(0.99, 1.03) skewX(-0.5deg); }
      100% { transform: scale(1, 1) skewX(0deg); }
    }
    @keyframes flameCore {
      0%, 100% { opacity: 0.95; }
      30% { opacity: 0.78; }
      47% { opacity: 1; }
      71% { opacity: 0.86; }
    }
    @keyframes haloBreath {
      0%, 100% { opacity: 1; transform: scale(1); }
      37% { opacity: 0.82; transform: scale(0.96); }
      64% { opacity: 0.94; transform: scale(1.03); }
    }
    /* The wick catches when the hub opens: the flame grows from the wick and settles */
    @keyframes flameCatch {
      0%   { opacity: 0; transform: scale(0.25, 0.1); }
      55%  { opacity: 1; transform: scale(1.08, 1.15); }
      100% { opacity: 1; transform: scale(1, 1); }
    }

    /* The light pool: warm, wide and soft, blended onto the desk and the objects near the
       candles. --light is how many candles burn (CandleLight). */
    .candle-light {
      position: absolute; z-index: 40;
      left: 46%; top: 52%; width: 680px; height: 440px;
      transform: translate(-50%, -50%);
      background: radial-gradient(closest-side, rgba(255, 180, 96, 0.8), rgba(255, 166, 80, 0.5) 22%, rgba(255, 152, 70, 0.2) 50%, rgba(255, 140, 60, 0.06) 75%, rgba(255, 140, 60, 0) 100%);
      mix-blend-mode: soft-light;
      opacity: var(--light, 1);
    }
    @media (min-width: 1024px) {
      .candle-light { width: 1100px; height: 700px; animation: lightBreath 3.4s ease-in-out infinite; }
    }
    @keyframes lightBreath {
      0%, 100% { opacity: var(--light, 1); }
      31% { opacity: calc(var(--light, 1) * 0.9); }
      58% { opacity: calc(var(--light, 1) * 0.97); }
      77% { opacity: calc(var(--light, 1) * 0.88); }
    }
    @media (prefers-reduced-motion: reduce) {
      .flame, .flame-core, .flame-halo, .flame-light, .candle-light { animation: none !important; }
    }

    .desk-surface {
    /* Rich deep-brown mahogany base */
    background-color: rgb(var(--c-mahogany));
    
    /* 
      1. Radial gradient creates the 'desk lamp' hotspot.
      2. Linear gradient darkens the bottom/edges for desk depth.
      3. The background-image property holds the wood texture, 
          rotated 90 degrees to force a horizontal grain flow.
    */
    background: 
      radial-gradient(circle at 50% 50%, rgb(var(--c-mahogany) / 0.2) 0%, rgba(0, 0, 0, 0.5) 100%),
      linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%),
      url('https://www.transparenttextures.com/patterns/dark-wood.png');
      
    /* Flip the texture pattern to horizontal */
    background-size: auto, auto, 400px 400px;
    background-blend-mode: overlay, multiply, normal;
    /* Rotate the pattern 90deg to ensure horizontal grain */
    transform: rotate(0deg); 
    /* Adding a subtle transform to the whole background container if needed */
  }

  /* To ensure the wood grain pattern itself is horizontal */
  .desk-surface::after {
    content: "";
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: url('https://www.transparenttextures.com/patterns/dark-wood.png');
    background-size: 400px 400px;
    transform: rotate(90deg);
    opacity: 0.3;
    z-index: -1;
  }

    /* Leather Tome Base Styles */
    .thick-book {
      position: relative;
      border-radius: 6px 14px 14px 6px;
      transform-style: preserve-3d;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
      cursor: pointer;
    }

    .leather-texture {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='4' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' filter='url(%23leather)'/%3E%3C/svg%3E");
      mix-blend-mode: multiply;
      opacity: 0.6;
      pointer-events: none;
      z-index: 1;
    }

    .thick-book::after {
      content: ''; position: absolute; left: 18px; top: 0; bottom: 0; width: 10px;
      background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(255,255,255,0.05), rgba(0,0,0,0.6));
      border-left: 1px solid rgba(0,0,0,0.9); border-right: 1px solid rgba(255,255,255,0.05);
      border-radius: 2px; z-index: 2;
    }

    .thick-book::before {
      content: ''; position: absolute; top: 5px; bottom: 5px; right: -16px; width: 16px;
      background: repeating-linear-gradient(to bottom, #d6c6b0, #d6c6b0 2px, #bfae95 2px, #bfae95 4px);
      border-radius: 0 8px 8px 0; border-right: 1px solid rgba(0,0,0,0.6);
      border-top: 1px solid rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.4);
      box-shadow: inset -5px 0 15px rgba(0,0,0,0.8); transform: translateZ(-2px); z-index: -1;
    }
    @media (max-width: 639px) {
      .thick-book::before { right: -10px; width: 10px; }
    }

    .embossed-gold { color: rgb(var(--c-gold-leaf)); text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.2), inset 0 0 2px rgba(0,0,0,0.5); }
    .embossed-stamp { box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }

    /* Turn-of-the-Century Pamphlets */
    .pamphlet {
      background-color: rgb(var(--c-parchment));
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E");
      box-shadow: 4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgb(var(--c-sepia) / 0.3);
      cursor: pointer;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
      position: relative;
    }
    /* Pamphlets lie loose on the desk only in the wide composition; below it they sit in a row */
    @media (min-width: 1024px) {
      .pamphlet { position: absolute; }
    }

    /* Folded Herald strip for narrow screens: same paper stock, folded to its masthead */
    .newspaper-strip {
      position: relative;
      background-color: rgb(var(--c-parchment-deep));
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e4cfa0' filter='url(%23paper)'/%3E%3C/svg%3E");
      box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -18px 24px -12px rgba(0,0,0,0.45);
      color: rgb(var(--c-ink));
    }
    .newspaper-strip::after {
      content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 10px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.16), transparent);
      pointer-events: none;
    }

    /* Top-Fold Horizontal Newspaper Emulation */
    .newspaper-top-fold {
      background-color: rgb(var(--c-parchment-deep));
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e4cfa0' filter='url(%23paper)'/%3E%3C/svg%3E");
      box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -30px 40px -10px rgba(0,0,0,0.5);
      color: rgb(var(--c-ink));
      position: absolute;
      border-bottom: 2px solid rgba(0,0,0,0.3);
    }

    /* Simulating the fold dropping off the bottom */
    .newspaper-top-fold::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 15px;
      background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
      pointer-events: none; z-index: 10;
    }

    .aged-paper-img {
      mix-blend-mode: multiply;
      filter: grayscale(80%) sepia(40%) contrast(120%) brightness(95%);
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
