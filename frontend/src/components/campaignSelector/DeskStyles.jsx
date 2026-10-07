import React from 'react';
import { WOOD_IMAGE, LEATHER_GRAIN, LEATHER_MOTTLE, TOOLING_WEAR } from './deskArt';

// Card stock for the tickets: parchment with a faint fibre
const PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")";
const HERALD_PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e4cfa0' filter='url(%23paper)'/%3E%3C/svg%3E\")";
const TOME_LEATHER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='4' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' filter='url(%23leather)'/%3E%3C/svg%3E\")";

// The hub's free desk: from lg, on a screen wider than tall (the hub's components say the same
// with lg:landscape:). Anything else, a phone, a tablet or a tall screen such
// as a 12.9 inch iPad held upright, gets the hub that is one screen tall (iPad pass,
// 2026-10-05: the 12.9 upright had the wide desk small in its middle).
const HUB_WIDE = '(min-width: 1024px) and (orientation: landscape)';
const HUB_NARROW = '(max-width: 1023px), (orientation: portrait)';
const HUB_TABLET = '(min-width: 640px) and (max-width: 1023px), (min-width: 1024px) and (orientation: portrait)';

// Every hub class (.tome, .ticket, .roster-book, ...) is defined here and only exists while
// the chapter hub is mounted. The desk is seen from above, lit by the candle cluster at its
// left, standing just above the tomes: a small warm pool that falls off fast into a dim room,
// shadows cast away from the flames, and a gentle flicker that moves the light and the
// shadows together.
export const DeskStyles = () => (
  <style>{`
    /* Faces and pens are loaded once in index.html. */

    /* ── The flicker ──
       One rhythm of 4.3s moves the room: the flames flare and dip (the light reaches
       further and the shadows shorten) and sway a little sideways. The light, the shade,
       the candles' shadows and every object's cast shadow each run the same keyframes, so
       they move as one. Each keyframe is a transform on its own layer, so the flicker runs
       on the compositor and never repaints the room (round 4 item 3; the old flicker
       animated two inherited custom properties and repainted the room every frame). Wide screens only; phones and reduced motion hold still, and it pauses
       while the roster book is open (.hub-still).
       At each step the flames' strength s and sway x were:
       9% 1.03/0.5, 21% 0.975/-0.35, 34% 1.018/0.15, 47% 0.962/-0.7, 61% 1.036/0.45,
       74% 0.985/-0.15, 88% 1.012/0.3. The light moves by (5x, -40(s-1)) px and scales by s;
       the shade by (4x, 0) px and s; a candle's shadows scale by 2-s; an object's shadow
       moves 2.4(1-s) of its own offset and -1.6x px (see .cast). */
    @keyframes hubLightSway {
      0%, 100% { transform: translate(-50%, -50%); }
      9%  { transform: translate(-50%, -50%) translate(2.5px, -1.2px) scale(1.03); }
      21% { transform: translate(-50%, -50%) translate(-1.75px, 1px) scale(0.975); }
      34% { transform: translate(-50%, -50%) translate(0.75px, -0.72px) scale(1.018); }
      47% { transform: translate(-50%, -50%) translate(-3.5px, 1.52px) scale(0.962); }
      61% { transform: translate(-50%, -50%) translate(2.25px, -1.44px) scale(1.036); }
      74% { transform: translate(-50%, -50%) translate(-0.75px, 0.6px) scale(0.985); }
      88% { transform: translate(-50%, -50%) translate(1.5px, -0.48px) scale(1.012); }
    }
    @keyframes hubShadeSway {
      0%, 100% { transform: translate(-50%, -50%); }
      9%  { transform: translate(-50%, -50%) translate(2px, 0) scale(1.03); }
      21% { transform: translate(-50%, -50%) translate(-1.4px, 0) scale(0.975); }
      34% { transform: translate(-50%, -50%) translate(0.6px, 0) scale(1.018); }
      47% { transform: translate(-50%, -50%) translate(-2.8px, 0) scale(0.962); }
      61% { transform: translate(-50%, -50%) translate(1.8px, 0) scale(1.036); }
      74% { transform: translate(-50%, -50%) translate(-0.6px, 0) scale(0.985); }
      88% { transform: translate(-50%, -50%) translate(1.2px, 0) scale(1.012); }
    }
    @keyframes candleShadowSway {
      0%, 100% { transform: none; }
      9% { transform: scale(0.97); } 21% { transform: scale(1.025); } 34% { transform: scale(0.982); }
      47% { transform: scale(1.038); } 61% { transform: scale(0.964); } 74% { transform: scale(1.015); }
      88% { transform: scale(0.988); }
    }
    /* An object's shadow: a scale of 1 + 0.24(1-s) about a point ten offsets back toward
       the flames moves the shadow by 2.4(1-s) of its offset (and grows it by under 1%) */
    @keyframes castSway {
      0%, 100% { transform: none; }
      9%  { transform: translate(-0.8px, 0) scale(0.9928); }
      21% { transform: translate(0.56px, 0) scale(1.006); }
      34% { transform: translate(-0.24px, 0) scale(0.99568); }
      47% { transform: translate(1.12px, 0) scale(1.00912); }
      61% { transform: translate(-0.72px, 0) scale(0.99136); }
      74% { transform: translate(0.24px, 0) scale(1.0036); }
      88% { transform: translate(-0.48px, 0) scale(0.99712); }
    }
    @media ${HUB_WIDE} {
      .hub-light { animation: hubLightSway 4.3s ease-in-out infinite; will-change: transform; }
      .hub-shade { animation: hubShadeSway 4.3s ease-in-out infinite; will-change: transform; }
      .candle-shadow { animation: candleShadowSway 4.3s ease-in-out infinite; }
      .cast { animation: castSway 4.3s ease-in-out infinite; will-change: transform; }
      /* Each object's cast shadow is a layer of its own under the object, so the object's
         body is a layer too, with its blends, clips and paper drawn into it once. While a
         tome is hovered its glowing words get a small layer of their own, so the glow's
         flicker repaints only them (not at rest: inside the cover's rounded clip a layer
         costs the compositor two extra passes every frame). */
      .tome-body, .ticket-body, .herald-sheet, .sketch-paper { will-change: transform; }
      .tome:hover .gilt-glow, .tome:focus-visible .gilt-glow { will-change: transform; }
    }
    /* The roster book is open: the room holds still under it */
    .hub-still .hub-light, .hub-still .hub-shade, .hub-still .candle-shadow, .hub-still .cast,
    .hub-still .flame, .hub-still .flame-core, .hub-still .flame-halo, .hub-still .gilt-glow {
      animation-play-state: paused;
    }

    /* ── The desk: wood with a tooled leather writing inset ──
       --cw is the candle cluster's width. Where the flames' middle lies on the desk, so the
       wood can warm and shine there: --lx, --ly in the room's own box. The hub measures
       them from the flames (useCastShadows.js) before the first paint and on every resize,
       since from lg the candles stand by the tomes (.hub-candles below); the values here
       are the phone and tablet places, where the candles keep the top left corner. */
    .hub-room { --cw: clamp(80px, 12dvh, 112px); --lx: calc(6px + var(--cw) * 0.525); --ly: calc(2px + var(--cw) * 0.438); }
    @media (min-width: 640px) { .hub-room { --cw: 128px; --lx: calc(14px + var(--cw) * 0.525); --ly: calc(4px + var(--cw) * 0.438); } }
    @media ${HUB_WIDE} { .hub-room { --cw: clamp(190px, 15.5vw, 270px); } }
    /* The wood lies mostly in shadow (owner's round 4 item 8). Near the candles it warms,
       and its varnish takes a soft sheen there and nowhere else; the room's shade
       (.hub-shade) takes the rest further down into the dark. */
    .hub-wood {
      position: absolute; inset: 0;
      background-color: #170b05;
      background-image: ${WOOD_IMAGE};
      background-size: cover;
      background-position: center top;
    }
    .hub-wood::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 340px 120px at var(--lx) calc(var(--ly) - 40px), rgba(255,222,176,0.07), rgba(255,222,176,0.025) 45%, rgba(255,222,176,0) 75%),
        radial-gradient(ellipse 820px 600px at var(--lx) var(--ly), rgba(255,160,84,0.09), rgba(255,150,72,0.035) 42%, rgba(255,140,60,0) 72%),
        radial-gradient(ellipse 150% 130% at var(--lx) var(--ly), rgba(6,3,1,0) 30%, rgba(6,3,1,0.3) 100%);
    }
    /* The leather sits a step below the wood: the wood's edge throws a small shadow onto it
       on the sides away from the light, and catches a hairline of light on the others. */
    .hub-leather {
      position: absolute; inset: 10px 10px 12px 10px;
      border-radius: 3px;
      background-color: #210a09;
      background-image: ${LEATHER_GRAIN}, ${LEATHER_MOTTLE};
      background-size: 600px 600px, cover;
      box-shadow:
        inset 3px 4px 7px rgba(0,0,0,0.78),
        inset -1px -1px 1px rgba(255,214,170,0.07),
        0 0 0 1px rgba(0,0,0,0.72),
        0 0 0 2px rgba(150,96,56,0.16);
    }
    /* Phones and tablets look at the left end of a wide desk (owner's round 4 item 11):
       the wood's edge along the left with its lip catching the light, the wood at the top
       and foot, and the leather running on off the right of the screen, its gilt lines
       with it. */
    @media ${HUB_NARROW} {
      .hub-leather { inset: 10px -40px 12px 20px; }
      .hub-wood { box-shadow: inset 1px 0 0 rgba(255,220,180,0.1), inset 3px 0 4px -1px rgba(0,0,0,0.55); }
    }
    @media ${HUB_TABLET} { .hub-leather { inset: 14px -40px 16px 30px; } }
    @media ${HUB_WIDE} {
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
    @media ${HUB_WIDE} { .hub-tooling { inset: 15px; } .hub-tooling::after { inset: 4px; } }
    /* Old marks on the leather: a cup ring about a third of a tome across (a cup's foot
       beside a book), and an ink stain */
    .hub-cup { position: absolute; width: 84px; left: 22px; top: calc(var(--cw) * 0.95); }
    .hub-ink { position: absolute; width: 64px; right: 5%; top: 4px; }
    @media ${HUB_TABLET} { .hub-cup { width: 150px; left: 40px; } }
    @media ${HUB_WIDE} {
      .hub-cup {
        top: auto; width: calc(clamp(250px, 20.5vw, 380px) * 0.5);
        left: calc(max(3.2vw, 50vw - 940px) + 22px); bottom: 5vh;
      }
      .hub-ink { width: 84px; right: auto; left: 41%; top: 0.6vh; }
    }

    /* ── The candle cluster (CandleCluster.jsx), seen from above ──
       Below lg the box sits in the top left of the desk, in the strip the room keeps for it
       above the tomes; from lg it stands just above the Case Ledger's head (.hub-candles
       below). The desk glow, the light pool and the shade are centered on the flames'
       middle (.candle-center). The boxes never transition: under reduced motion every
       element gets a tiny transition (index.css), which would let the hub read the
       candles' old place back right after moving them (useCastShadows.js). */
    .candle-box { top: 2px; left: 6px; width: var(--cw); aspect-ratio: 230 / 190; transition: none; }
    @media (min-width: 640px) { .candle-box { top: 4px; left: 14px; } }

    /* ── Phones and tablets: the hub is one screen tall (owner's round 3 item 28) ──
       A close look at the left end of a wide desk (owner's round 4 item 11): the wood's
       edge on the left, the leather running on off the right. The candles keep a strip at
       the top; the tomes lie at the foot of the room the tickets leave them (the tomes' row
       is a size container), each as large as its column and that height allow; the
       tickets below them, as tall as a ticket is. The Herald lies under the tomes, its
       masthead showing above them and the rest running off the right, and a few papers
       tuck under the tomes and tickets and run off the edges. Nothing that is a control is
       covered or cut, and the page never scrolls. */
    @media ${HUB_NARROW} {
      .hub-main {
        padding: calc(var(--cw) * 0.83 + 0.25rem) 8px max(0.625rem, env(safe-area-inset-bottom)) 30px;
      }
      .hub-tomes { flex: 1 1 0; min-height: 0; container-type: size; align-items: end; }
      .hub-tomes .tome { width: min(100%, calc(100cqh * 0.735 - 14px)); max-width: 400px; }
      .hub-ticket { height: clamp(164px, 27dvh, 240px); }
      /* Turned over, the Lightkeeper's ticket is as tall as its form needs, growing upward
         over the tomes, so its fields sit above the phone's keyboard */
      .hub-ticket .ticket-back { top: auto; height: max(100%, 18.75rem); }
      /* The whole Herald, printed small, lying under the tomes */
      .herald-phone {
        display: block; position: absolute; width: 960px; height: 700px;
        left: 31%; top: calc(var(--cw) * -0.62);
        transform-origin: 0 0; transform: rotate(-4.5deg) scale(0.46);
      }
    }
    /* On a short phone the ticket keeps its route and drops the number line above it */
    @media (max-width: 1023px) and (max-height: 720px) { .hub-ticket .ticket-meta { display: none; } }
    @media ${HUB_TABLET} {
      .hub-main { padding: 7rem 16px max(1rem, env(safe-area-inset-bottom)) 48px; }
      .hub-ticket { height: clamp(180px, 24dvh, 300px); }
      .herald-phone { left: 34%; top: -5.5rem; transform: rotate(-4deg) scale(0.7); }
    }
    @media ${HUB_WIDE} { .herald-phone { display: none; } }
    .candle-center { position: absolute; left: 52.5%; top: 53%; width: 0; height: 0; }

    /* ── From lg the candles stand by the tomes (owner's bug, 2026-10-04) ──
       They were placed by the window (the top left of the desk) while the tomes lie in the
       middle of the desk's height, so a window made shorter by the browser's own bars
       (1920x937, 1536x730) brought the tomes up under them. Now the tomes' half of the desk
       (.hub-left, as tall as the desk) is a column: the candles' strip (.hub-candles), the
       tomes, and an empty strip, the two strips sharing the height the tomes leave. The
       tomes lie in the middle of the desk's height as before unless that leaves the candles
       less than their strip (--strip: the cluster's height and the gap under it), when they
       lie just under it. The cluster stands on the strip's foot, its own foot clear of the
       Case Ledger's head by a tenth of a tome and 12px (the tome's tilt and its lift on
       hover take about half of that), its left at the Case Ledger's left (on a desk so
       narrow that the tomes run off its left edge, --candle-nudge from useCastShadows.js
       keeps the wax on the leather); at the strip's least height its top reaches 12px into
       the desk's top margin, where it always stood.
       In the cluster's own measures: its wax spans 0.157 to 0.772 of the box's width, and
       0.137 to 0.672 of its width down from the box's top; the box is 0.826 of its width
       tall. The tomes' measures live here, where the candles and the loose papers read
       them: a tome's width, the gap and the strip (--T, --G, --strip) on .hub-main, so the
       papers on the Herald (.hub-right > .sketch) can read them too; where the Case Ledger
       starts (--x0) on .hub-left, whose width it needs. */
    @media ${HUB_WIDE} {
      .hub-main { --T: clamp(250px, 20.5vw, 380px); --G: 2.2vw; --strip: calc(var(--cw) * 0.535 + var(--T) * 0.1); }
      .hub-left { --x0: calc((100% - 2 * var(--T) - var(--G)) / 2); }
      .hub-candles { flex: 1 1 0; min-height: var(--strip); }
      .hub-left::after { content: ''; flex: 1 1 0; }
      .hub-left > .hub-tomes { flex: none; }
      .hub-candles > .candle-box {
        top: auto; bottom: calc(var(--T) * 0.1 + 12px - var(--cw) * 0.154);
        left: calc(max(0px, var(--x0)) - var(--cw) * 0.22 + var(--candle-nudge, 0px));
      }
    }

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
    /* The candles' own shadows stretch and shorten with the room's flicker (candleShadowSway
       on the group that holds each flame's blurred shadows, so the blur is drawn once) */

    /* The flames' warm light on the desk under them (below the books and papers): a
       screen blend, so the wood and leather near the cluster brighten in their own colors
       and the candles' shadows show on it. */
    .desk-glow {
      position: absolute; width: 640px; height: 640px; left: 0; top: 0;
      transform: translate(-50%, -50%);
      background: radial-gradient(closest-side, rgba(255,168,88,0.3), rgba(255,150,70,0.12) 26%, rgba(255,140,60,0.03) 55%, rgba(255,140,60,0));
      mix-blend-mode: screen;
      opacity: var(--light, 1);
    }
    @media ${HUB_NARROW} { .desk-glow { width: 460px; height: 460px; opacity: calc(var(--light, 1) * 0.8); } }

    /* Above the objects: the pool warms what lies near the flames in its own colors (soft
       light), and the shade takes the rest of the room down into the dark, so every object
       is lit on the side that faces the candles and darker away from them. The boxes that
       hold them must not form a stacking context (no z-index, opacity or transform), or the
       blend has nothing to light. */
    .hub-light {
      position: absolute; left: 0; top: 0; width: 920px; height: 700px;
      transform: translate(-50%, -50%);
      background: radial-gradient(closest-side, rgba(255,176,92,0.66), rgba(255,160,80,0.32) 17%, rgba(255,150,70,0.08) 40%, rgba(255,140,60,0) 62%);
      mix-blend-mode: soft-light;
      opacity: var(--light, 1);
    }
    @media ${HUB_NARROW} { .hub-light { width: 760px; height: 620px; } }
    .hub-shade {
      position: absolute; left: 0; top: 0; width: 440vmax; height: 440vmax;
      transform: translate(-50%, -50%);
      /* wider than tall: the light runs further along the desk than down it, and its
         reach grows with the screen, so the tickets stay legible and the corners dark */
      background: radial-gradient(ellipse 220vmax 169vmax at center,
        rgba(8,4,2,0) 0, rgba(8,4,2,0) max(150px, 10.4vw),
        rgba(8,4,2,calc(var(--shade, 0.42) * 0.45)) max(468px, 32.5vw),
        rgba(8,4,2,calc(var(--shade, 0.42) * 0.82)) max(910px, 63.2vw),
        rgba(8,4,2,var(--shade, 0.42)) max(1365px, 94.8vw),
        rgba(8,4,2,calc(var(--shade, 0.42) * 1.25)) max(2080px, 144.4vw));
    }
    /* A dim room: the candles are its only light (owner's request, 2026-10-07: the room was
       lit as if from overhead, which washed out the flicker of the shadows) */
    @media ${HUB_NARROW} { .hub-shade { --shade: 0.76; } }
    @media ${HUB_WIDE} { .hub-shade { --shade: 0.8; } }

    /* ── Cast shadows ──
       Every object on the desk carries a .cast child: a soft dark copy of its outline,
       thrown away from the candles. CampaignSelector measures each object's place against
       the flames and sets --sx, --sy (the offset) and --sb (the blur) on it; the flicker
       (castSway, a transform) shortens and sways it about a point ten offsets back toward
       the flames. Lifting an object (hover) throws its shadow further (--lift, on the
       separate translate property). The blur is drawn once inside the shadow's own layer.
       The object itself has no background, so the shadow can sit under its surface. */
    .cast {
      position: absolute; inset: 0; z-index: -1; pointer-events: none;
      border-radius: inherit;
      translate: calc(var(--sx, 5px) * var(--lift, 1)) calc(var(--sy, 9px) * var(--lift, 1));
      transform-origin: calc(50% - var(--sx, 5px) * 10) calc(50% - var(--sy, 9px) * 10);
      transition: translate 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cast::before {
      content: ''; position: absolute; inset: 1px; border-radius: inherit;
      background: rgb(0 0 0 / var(--so, 0.86));
      filter: blur(var(--sb, 11px));
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
      /* the spine's width outside the cover (8.5% of the cover's width) */
      --spine: calc((100% - var(--er) - var(--bd)) * 0.085);
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      border-radius: 5px 12px 12px 5px;
    }
    @media (max-width: 639px) { .tome { --er: 6px; --eb: 5px; --bd: 2px; } }
    .tome:hover, .tome:focus-visible { --lift: 1.5; }
    /* Everything of the book but its shadow: one layer on wide screens */
    .tome-body { position: absolute; inset: 0; border-radius: inherit; }
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
    /* The tail of the text block starts where the spine's leather turns round it, tucked
       a little under the spine's foot */
    .tome-tail {
      position: absolute; left: calc(var(--spine) - 2px); right: var(--bd); bottom: var(--bd);
      height: calc(var(--eb) + 16px);
      border-radius: 0 0 7px 0;
      background:
        linear-gradient(to right, rgba(20,10,4,0.55), rgba(40,22,10,0.1) 14px, rgba(40,22,10,0.1) 30%, rgba(40,22,10,0.5)),
        repeating-linear-gradient(180deg, #d2bf98 0 1px, #ad9770 1px 2px);
      box-shadow: inset 0 5px 6px -2px rgba(0,0,0,0.72), inset 0 -1px 0 rgba(0,0,0,0.35);
      clip-path: polygon(0 0, calc(100% - var(--er)) 0, 100% 100%, 0 100%);
    }
    /* The spine's foot (owner's round 4 item 7): below the cover's corner the spine's
       leather turns down round the tail of the book to the back board, one piece with the
       cover. Its round darkens to the left as the cover's spine does, it falls into shade as
       it turns away from the light, and its corners take the cover's rounding. Its right
       end is the cap over the text block, with a little shade on the pages under it. */
    .tome-foot {
      position: absolute; left: 0; bottom: 0;
      top: calc(100% - var(--eb) - var(--bd) - 10px);
      width: calc(var(--spine) + 4px);
      border-radius: 0 0 5px 7px / 0 0 6px 9px;
      background:
        linear-gradient(to bottom, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.4) calc(10px + (100% - 10px) * 0.45), rgba(0,0,0,0.64) 100%),
        linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.45) 42%, rgba(255,255,255,0.05) 78%, rgba(0,0,0,0.18) 92%, rgba(0,0,0,0.5)),
        var(--leather);
      box-shadow: 1px 1px 2px rgba(0,0,0,0.5), inset -1px -1px 1px rgba(0,0,0,0.45);
    }
    .tome-foot::after {
      /* the leather's grain, as on the cover */
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background-image: ${TOME_LEATHER}; background-size: 150px 150px;
      mix-blend-mode: multiply; opacity: 0.6;
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
    /* The spine's round, falling away to the left; at its head the leather catches the
       candles as it turns over the top edge, and at its foot it goes into the shade of
       the turn that .tome-foot carries on */
    .tome-cover::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: var(--hinge);
      background:
        linear-gradient(to bottom, rgba(255,236,200,0.09), rgba(255,236,200,0) 9px, rgba(0,0,0,0) calc(100% - 14px), rgba(0,0,0,0.2)),
        linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.45) 45%, rgba(255,255,255,0.05) 85%, rgba(0,0,0,0.25));
      z-index: 2;
    }
    /* The hinge groove runs the cover's full height and fades out at both ends */
    .tome-hinge {
      position: absolute; top: 0; bottom: 0; left: var(--hinge); width: 6px;
      background: linear-gradient(to right, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 45%, rgba(255,255,255,0.07) 75%, rgba(0,0,0,0.2));
      -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 14px), transparent);
      mask-image: linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 14px), transparent);
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
    /* The player's ticket card, over its shadow: one layer on wide screens */
    .ticket-body { position: absolute; inset: 0; border-radius: inherit; }
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
    /* The Lightkeeper's ticket turns flat (NewCampaignTicket.jsx, shared/useFlatTurn.js):
       only the face that is up is drawn, and the card and its shadow narrow to the edge and
       widen again by script. In 3D, WebKit (Safari) showed the form on its back mirrored
       over the front at rest (iPad pass, 2026-10-05). */
    .ticket-flip { position: absolute; inset: 0; }
    .ticket-flip .ticket-back, .ticket-flip.is-flipped .ticket-front { visibility: hidden; }
    .ticket-flip.is-flipped .ticket-back { visibility: visible; }
    .ticket-back { cursor: default; --hole-x: 18%; }
    .cast-turn { position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit; }

    /* ── Loose papers (CryptidSketches.jsx, paperArt.js) ──
       Aged, used paper with no frames: each sheet is cut by its own mask (deckled, torn,
       machine cut, a photograph's scalloped deckle, a dog-ear, worm holes), its stains
       multiplied over it and its creases, curl and flap drawn over that. The body
       (.sketch-paper) is one layer on wide screens: the mask, the stains and the art inside
       it are drawn once. A mask cuts away a box-shadow, so the paper's contact shadow lies
       under it as a shadow of its own, a little inside the cut, away from the candles. */
    .sketch { position: absolute; isolation: isolate; pointer-events: none; display: none; }
    /* Where the papers lie: dropped on the desk, not hung in a gallery (owner, 2026-10-05:
       "the photos could stand to be a bit more scattered, they shouldn't all be facing the
       viewer, and some should be under the newspaper, each other, etc."). Each lies at its
       own angle, most crooked by 5 to 25 degrees and, from lg, one or two turned well over
       (on its side or upside down). They overlap each other in a set order (z-index, a
       paper's place in the pile), tuck under the tomes (z-index 20 in the tomes' row) and
       under the Herald (a paper of the Herald's group below the Herald's z-index 10), and a
       few run off the leather or the screen. Every paper is at least as large as a railway
       ticket on the same screen, in area and in its shorter side, the three larger prints
       (the bestiary page, the sea monster, the sea monk) about a quarter larger (owner,
       2026-10-05). None lies over the candles, a tome's title, a ticket or the Herald's
       masthead and headline, or runs under the header; from lg at least about a third of
       each shows, enough to know it (below lg 30%). A desk shows only as many as it has room
       for at that size. Each is a plain block turned about its middle (no new layers, The
       Smooth Hub Rule), and its shadow is measured in its own turned frame, so it still
       falls away from the candles (useCastShadows.js). Checked at 25 sizes by
       candela-ui-review/2026-10-05-hub-sketch-size/work/hub-check.mjs. */
    .hub-tomes .tome { z-index: 20; }
    .herald-phone { z-index: 2; }
    /* Phones: the torn page on the left, one corner under the folded Herald, and the
       sketchbook leaf lying on the Herald and over the page's other corner, both above the
       tomes, each sized by the phone's ticket (--tw is a ticket's width, 50cqw less half the
       gap; its height is at most 1.36 times that) and lying just above the tomes' heads
       (--tomeH), never higher than just under the candles or the Herald's headline. */
    @media (max-width: 639px) {
      .hub-tomes { --tw: calc(50cqw - 6px); --tomeH: calc(1.36 * min(50cqw - 6px, 73.5cqh - 14px)); }
      .hub-tomes > .sketch[data-paper="page"] { display: block; z-index: 1; width: calc(var(--tw) * 1.16); left: -2cqw; top: max(6px, calc(100cqh - var(--tomeH) + 18px - var(--tw) * 1.16 * 1.197)); transform: rotate(-14deg); }
      .hub-tomes > .sketch[data-paper="sketchbook"] { display: block; z-index: 3; width: calc(var(--tw) * 1.1); left: 44cqw; top: max(24px, calc(100cqh - var(--tomeH) + 24px - var(--tw) * 1.1 * 1.148)); transform: rotate(9deg); }
    }
    /* Tablets: the same two, as large as the largest tablet ticket (264 x 300), the page
       lying against the Herald's edge and under it where they meet. A tablet much wider for
       its height has its tomes up to the Herald's masthead and no room above them, so it
       shows none. */
    @media (min-width: 640px) and (max-width: 1023px) and (max-aspect-ratio: 19/25), (min-width: 1024px) and (orientation: portrait) and (max-aspect-ratio: 19/25) {
      .hub-tomes { --tomeH: calc(1.36 * min(50cqw - 16px, 73.5cqh - 14px, 400px)); }
      .hub-tomes > .sketch[data-paper="page"] { display: block; z-index: 1; width: 276px; left: 0; top: max(4px, calc(100cqh - var(--tomeH) + 60px - 330px)); transform: rotate(-13deg); }
      .hub-tomes > .sketch[data-paper="sketchbook"] { display: block; z-index: 3; width: 266px; left: calc(50cqw + 10px); top: max(22px, calc(100cqh - var(--tomeH) + 60px - 305px)); transform: rotate(9deg); }
    }
    /* From lg the ticket is 230 x 330 at every width, so the papers have fixed sizes. A
       paper's width, place, angle and place in the pile are --w, --x, --y, --r and --z.
       Those in the tomes' row are placed by the tomes (--T a tome's width, --G the gap,
       --x0 where the Case Ledger starts, --strip the candles' strip, --a1 just right of the
       candles), under the tomes and over the Herald; those of the Herald's group
       (.hub-right) in the Herald's own pixels, as the Herald and the tickets are, under the
       Herald (--z 5) or on it (--z 20), and always under the tickets. The pile:
         above the tomes, right of the candles: the sketchbook leaf (12deg), and from 1500px
           the sea monster on its side (82deg) beside it, under the leaf, the Herald's corner
           and the Last Played tome. The sea monster lies as high as the header allows:
           measured by the window's height (vh) on a desk that fits the window, by the tomes'
           own measures on one that scrolls;
         left of the Case Ledger, from 1880px: the sea monk (-21deg), under the tome and
           running off the leather;
         under the tomes' feet: the photograph (7deg) over the lamia print (-24deg; upside
           down below 1500px), on a desk 1000px tall the griffin (-6deg) under both its
           neighbours, and the figures (24deg) lying over the Herald's corner and under the
           New Character ticket;
         on the Herald, under the Lightkeeper's ticket and beside the New Character one: the
           postcard (13deg);
         from 1880px the bestiary leaf on its side (-96deg) under the Herald's foot, running
           off the leather and the screen; on a desk under 1000px tall, where the Herald's foot
           is off the screen, on the Herald by its right edge instead.
       The row under the tomes needs about 150px below them: a desk tall enough has it; on a
       desk short enough that it scrolls already (to 899px tall) the row lengthens the desk
       by that much; a desk between (900 to 999px tall) never starts to scroll for it, and
       its row runs off the screen's foot with about half of each paper showing. */
    @media ${HUB_WIDE} {
      .hub-tomes { --a1: calc(max(0px, var(--x0)) + var(--cw) * 0.552 + var(--candle-nudge, 0px) + 40px); }
      .hub-tomes > .sketch, .hub-right > .sketch { width: var(--w); left: var(--x); top: var(--y); transform: rotate(var(--r)); z-index: var(--z); }
      .hub-tomes > .sketch[data-paper="sketchbook"] { --w: 260px; --x: calc(var(--a1) + 14px); --y: calc(-1 * min(206px, var(--strip) + 22px)); --r: 12deg; --z: 4; }
      .hub-tomes > .sketch[data-paper="pinned"] { --w: 244px; --x: calc(var(--x0) - 195px); --y: calc(var(--T) * 0.16); --r: -21deg; --z: 1; }
      .hub-tomes > .sketch[data-paper="photo"] { --w: 286px; --x: calc(var(--x0) - 10px); --y: calc(100% - 30px); --r: 7deg; --z: 3; }
      .hub-tomes > .sketch[data-paper="tomes"] { --w: 322px; --x: calc(var(--x0) + var(--T) * 0.72); --y: calc(100% - 50px); --r: -24deg; --z: 2; }
      .hub-tomes > .sketch[data-paper="herald"] { --w: 272px; --x: calc(var(--x0) + var(--T) * 1.5); --y: calc(100% - 20px); --r: -6deg; --z: 1; }
      .hub-tomes > .sketch[data-paper="candles"] { --w: 240px; --x: calc(var(--x0) + var(--T) * 2.15 + var(--G)); --y: calc(100% - 110px); --r: 24deg; --z: 2; }
      .hub-right > .sketch[data-paper="page"] { --w: 282px; --x: -309px; --y: max(-180px, calc(374px - 50vh)); --r: 82deg; --z: 5; }
      .hub-right > .sketch[data-paper="postcard"] { --w: 362px; --x: 301px; --y: 389px; --r: 13deg; --z: 20; }
      .hub-right > .sketch[data-paper="bestiary"] { --w: 252px; --x: 556px; --y: 514px; --r: -96deg; --z: 5; }
      .hub-tomes > .sketch[data-paper="sketchbook"], .hub-tomes > .sketch[data-paper="photo"], .hub-tomes > .sketch[data-paper="tomes"],
      .hub-tomes > .sketch[data-paper="candles"], .hub-right > .sketch[data-paper="postcard"] { display: block; }
    }
    /* A desk that scrolls: room for the row under the tomes, and the sea monster as high as
       the header allows, the Herald's group lying in the middle of the desk's own height
       (the candles' strip, the tomes and the row's 150px) */
    @media ${HUB_WIDE} and (max-height: 899px) {
      .hub-left::after { min-height: 150px; }
      .hub-right > .sketch[data-paper="page"] { --y: max(-180px, calc(-41.5px - (var(--strip) + 1.36 * var(--T) - 450px) / 2)); }
    }
    @media ${HUB_WIDE} and (max-width: 1499px) { .hub-tomes > .sketch[data-paper="tomes"] { --r: 166deg; } }
    @media (min-width: 1500px) and (orientation: landscape) { .hub-right > .sketch[data-paper="page"] { display: block; } }
    @media (min-width: 1880px) and (orientation: landscape) {
      .hub-tomes > .sketch[data-paper="pinned"], .hub-right > .sketch[data-paper="bestiary"] { display: block; }
    }
    @media (min-width: 1880px) and (min-height: 1000px) and (orientation: landscape) { .hub-tomes > .sketch[data-paper="herald"] { display: block; } }
    @media (min-width: 1880px) and (max-height: 999px) {
      .hub-right > .sketch[data-paper="bestiary"] { --x: 646px; --y: 321px; --r: -100deg; --z: 20; }
    }
    /* A paper's cast shadow is a plain fill, a little inside its cut, with a dog-eared or
       torn-off corner taken out by a hard gradient stop (--cut-at, --cut) before the blur.
       Never an image in the cast: the cast's layer moves with the flicker, and an SVG image
       in it is painted again on every frame (round 4 papers trace). Its contact shadow,
       in the paper's still layer, is the paper's own outline (--shape), drawn once. */
    .sketch .cast::before {
      inset: 1.5%;
      background: linear-gradient(var(--cut-at, 135deg), transparent var(--cut, 0%), rgb(0 0 0 / var(--so, 0.86)) var(--cut, 0%));
    }
    .sketch-paper, .herald-sheet { position: absolute; inset: 0; }
    .sketch-paper::before, .herald-sheet::before {
      content: ''; position: absolute; inset: 0;
      background: var(--shape) center / 100% 100% no-repeat;
      translate: calc(var(--sx, 3px) * 0.25) calc(var(--sy, 5px) * 0.25);
      filter: blur(1.5px); opacity: 0.6;
    }
    .paper-sheet {
      position: absolute; inset: 0;
      background-color: rgb(var(--c-parchment-deep));
      -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
      -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    }
    .paper-art { position: absolute; inset: 0; overflow: hidden; }
    .paper-stain, .paper-light {
      position: absolute; inset: 0; pointer-events: none;
      background-size: 100% 100%; background-repeat: no-repeat;
    }
    .paper-stain { mix-blend-mode: multiply; }
    .paper-over { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    /* A curled corner stands off the desk: its shadow reaches further there */
    .sketch[data-curl] .cast::after {
      content: ''; position: absolute; left: var(--curl-l); top: var(--curl-t); width: 36%; height: 34%;
      background: radial-gradient(closest-side, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0));
    }
    /* A brass tack, lit on the side toward the candles, its shadow thrown away from them */
    .paper-tack {
      position: absolute; width: max(9px, 7.5%); aspect-ratio: 1; translate: -50% -50%;
      border-radius: 50%;
      background: radial-gradient(circle at calc(50% - var(--sx, 2px) * 0.8) calc(50% - var(--sy, 3px) * 0.8),
        #fff4c8 0, #e9c870 16%, #b98d38 42%, #7a5620 74%, #4d3613 100%);
      box-shadow: 0 0 0 0.5px rgba(36,22,6,0.8), calc(var(--sx, 2px) * 0.45) calc(var(--sy, 3px) * 0.45) 2px rgba(0,0,0,0.65);
    }
    /* The photograph: sepia, faded and silvered toward its edges */
    .paper-photo-img { filter: sepia(0.72) saturate(0.85) contrast(1.06) brightness(0.96); }
    /* A sketch from the user's notebook: drawn on white, so its white becomes the sheet
       (multiply) and its ink ages a little with it */
    .notebook-sketch-img { mix-blend-mode: multiply; filter: sepia(0.35) contrast(1.05); padding: 6%; }
    .paper-photo::after {
      content: ''; position: absolute; inset: 0;
      box-shadow: inset 0 0 14px 2px rgba(58,34,14,0.42), inset 0 0 2px 1px rgba(150,158,170,0.35);
    }
    .aged-paper-img {
      mix-blend-mode: multiply;
      filter: grayscale(80%) sepia(40%) contrast(120%) brightness(95%);
    }
    /* Red chalk on a sketchbook leaf: the chalk keeps its colour, its paper (lifted to white
       in the file) takes the leaf's tone */
    .aged-chalk-img { mix-blend-mode: multiply; filter: sepia(0.12) contrast(1.04); }
    /* A print on old card: its white sinks into the card's tone */
    .aged-print-img { mix-blend-mode: multiply; filter: sepia(0.3) contrast(1.04); }

    /* The Herald: the sheet is a child, so its cast shadow can lie under it. The sheet is
       the layer; the newsprint inside it is cut by its mask (aged edges, owner's round 4
       item 5), with its contact shadow under it. */
    .herald { position: absolute; isolation: isolate; }
    .herald-paper {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; overflow: hidden;
      background-color: rgb(var(--c-parchment-deep));
      background-image: ${HERALD_PAPER};
      color: rgb(var(--c-ink));
      -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
      -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    }
    /* Furthest from the candles: the sheet darkens toward its far edge and its foot */
    .herald-paper::before {
      content: ''; position: absolute; inset: 0; z-index: 30; pointer-events: none;
      background:
        linear-gradient(98deg, rgba(10,5,2,0) 22%, rgba(10,5,2,0.3) 68%, rgba(10,5,2,0.46) 100%),
        linear-gradient(to bottom, rgba(10,5,2,0) 55%, rgba(10,5,2,0.22) 100%);
    }

    /* Reduced motion: steady light, no flicker (the ticket turns without narrowing, useFlatTurn) */
    @media (prefers-reduced-motion: reduce) {
      .hub-light, .hub-shade, .candle-shadow, .cast,
      .flame, .flame-core, .flame-halo, .flame-light,
      .tome:hover .gilt-glow, .tome:focus-visible .gilt-glow { animation: none !important; }
      .gilt-glow, .gilt-mark, .ink-glow, .cast { transition: none !important; }
    }

    /* ── Book open/close animation ──
       Transform and opacity only, on the compositor: the book is its own layer while it
       moves (will-change until it settles, again when it closes). The room's flicker
       pauses while it is open (.hub-still). */
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
    /* Below lg the open book is alone on the screen: the hub's band (the wordmark and the
       Account tag) steps out of sight under it, so nothing shows through behind Close */
    @media ${HUB_NARROW} { .hub-still .hub-header { visibility: hidden; } }
    /* The book's index tabs below lg (owner's round 4 item 10): small tabs cut from the
       top of the page block. Only their top 30px shows over the page's edge; the open one
       is the page's own paper and runs on into it over the page's black edge, the other is
       older paper standing behind the page. */
    .book-index-tab { isolation: isolate; color: rgb(var(--c-sepia)); }
    .book-index-tab::before, .book-index-tab::after { content: ''; position: absolute; z-index: -1; left: 0; right: 0; pointer-events: none; }
    .book-index-tab::before {
      top: 4px; bottom: 14px; border-radius: 4px 4px 0 0;
      background: linear-gradient(to bottom, #dcc89b, rgb(var(--c-parchment-deep)) 70%, #c9b183);
      box-shadow: 0 0 0 1.5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,246,220,0.4);
    }
    .book-index-tab.is-open { color: rgb(var(--c-oxblood)); }
    .book-index-tab.is-open::before {
      top: 0; background: rgb(var(--c-parchment));
      box-shadow: 0 0 0 2px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,250,235,0.6);
    }
    .book-index-tab.is-open::after { bottom: 0; height: 16px; background: rgb(var(--c-parchment)); }
    .roster-book { animation: bookOpen 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards; will-change: transform, opacity; }
    .roster-book.is-settled { will-change: auto; }
    .roster-book.closing { animation: bookClose 0.4s cubic-bezier(0.36, 0, 0.66, 0) forwards; will-change: transform, opacity; }

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
