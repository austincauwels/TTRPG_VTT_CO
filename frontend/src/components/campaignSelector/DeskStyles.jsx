import React from 'react';

// Every hub class (.thick-book, .pamphlet, .roster-book, ...) is defined here and only
// exists while the chapter hub is mounted.
export const DeskStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Alex+Brush&family=Caveat&family=Cedarville+Cursive&family=Charm&family=Dawning+of+a+New+Day&family=Gaegu&family=Gochi+Hand&family=Grape+Nuts&family=Homemade+Apple&family=Indie+Flower&family=Kalam&family=La+Belle+Aurore&family=Long+Cang&family=Moondance&family=Patrick+Hand&family=Reenie+Beenie&family=Rock+Salt&family=Sacramento&family=Shadows+Into+Light&family=Zeyada&display=swap');

    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-garamond { font-family: 'Cormorant Garamond', serif; }
    .font-mono-data { font-family: 'IBM Plex Mono', monospace; }
    .font-playfair { font-family: 'Playfair Display', serif; }

    @keyframes candleSharedGlow {
      0%, 100% { opacity: 0.85; transform: scale(1); filter: blur(40px); }
      50% { opacity: 0.65; transform: scale(0.95); filter: blur(45px); }
      75% { opacity: 0.95; transform: scale(1.02); filter: blur(38px); }
    }

    @keyframes wickFlicker {
      0%, 100% { opacity: 0.9; transform: scale(1) translateX(0px); }
      25% { opacity: 0.7; transform: scale(0.9) translateX(-1px); }
      50% { opacity: 1; transform: scale(1.1) translateX(1px); }
    }

    .desk-surface {
    /* Rich deep-brown mahogany base */
    background-color: #2b170c;
    
    /* 
      1. Radial gradient creates the 'desk lamp' hotspot.
      2. Linear gradient darkens the bottom/edges for desk depth.
      3. The background-image property holds the wood texture, 
          rotated 90 degrees to force a horizontal grain flow.
    */
    background: 
      radial-gradient(circle at 50% 50%, rgba(60, 30, 10, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%),
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

    .embossed-gold { color: #c49d47; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.2), inset 0 0 2px rgba(0,0,0,0.5); }
    .embossed-silver { color: #a8a8a8; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.15); }
    .embossed-stamp { box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }

    /* Turn-of-the-Century Pamphlets */
    .pamphlet {
      background-color: #e6dfcc;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E");
      box-shadow: 4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(139, 115, 85, 0.4);
      cursor: pointer;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
      position: absolute; 
    }

    /* Top-Fold Horizontal Newspaper Emulation */
    .newspaper-top-fold {
      background-color: #dcd2b8;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23dcd2b8' filter='url(%23paper)'/%3E%3C/svg%3E");
      box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -30px 40px -10px rgba(0,0,0,0.5);
      color: #2b251e;
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
      background-color: #f0e8d0;
      background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        rgba(90,58,40,0.08) 27px,
        rgba(90,58,40,0.08) 28px
      );
    }
    .book-page-right {
      background-color: #ede4c8;
      background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        rgba(60,40,20,0.07) 27px,
        rgba(60,40,20,0.07) 28px
      );
    }
  `}</style>
);
