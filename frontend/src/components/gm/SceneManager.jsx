import React, { useState, useEffect, useId, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { ConfirmAction } from '../shared/ConfirmAction';
import { FormLine, SerialNo, PrinterMark, serialFor } from '../shared/PrintMarks';
import { playPaperSound } from '../../game/rollSounds';

const clockTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── The pocket watch's glass and its bow and stem (owner's round 4 item 1) ─────────
// A crescent of light just inside the rim of the dial (viewBox 0 0 100 100): `deg` is the
// side it faces (screen angle, 0 = right, -90 = up), `t` its width at the middle, `span`
// how far it runs either side. The cut is a larger circle shifted away from that side, so
// the crescent tapers to nothing at both ends; `reach` lets a radial gradient from its
// middle fade it out before the ends.
const crescent = (R, deg, t, span) => {
  const a = deg * Math.PI / 180, s = span * Math.PI / 180;
  const ux = Math.cos(a), uy = Math.sin(a);
  const d = (2 * R * t - t * t) / (2 * R * (1 - Math.cos(s)) - 2 * t);
  const mid = R - t / 2;
  return {
    cut: { cx: 50 - d * ux, cy: 50 - d * uy, r: R + d - t },
    mid: { x: 50 + mid * ux, y: 50 + mid * uy },
    reach: Math.hypot(R * Math.cos(s) - mid, R * Math.sin(s)),
  };
};
// The lamp is up and to the left of every desk (The One Lamp Rule)
const GLINT = crescent(42, -128, 6.5, 56);
const BOUNCE = crescent(42, 52, 4, 40);

// The crystal over the dial: soft light only, nothing drawn as a line. A broad faint sheen
// from the lamp, the lamp's window as a feathered crescent inside the upper left of the
// rim (brightest in its middle, gone at both ends), a small soft specular point, a warm
// glow where the light leaves the glass low on the right, and the glass's thickness
// darkening its lower edge.
const WatchGlass = () => {
  const id = useId().replace(/:/g, '');
  const cream = (a) => ({ stopColor: 'rgb(var(--c-cream))', stopOpacity: a });
  const gold = (a) => ({ stopColor: 'rgb(var(--c-candle-gold))', stopOpacity: a });
  return (
    <>
      <div aria-hidden="true" data-watch-glass className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 64% at 31% 25%, rgb(var(--c-cream) / 0.13) 0%, rgb(var(--c-cream) / 0.05) 50%, transparent 74%)',
          boxShadow: 'inset 0 -7px 10px -4px rgba(0,0,0,0.5), inset 0 0 4px rgba(0,0,0,0.3)',
        }} />
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
        <defs>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.7" /></filter>
          <filter id={`${id}-softer`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4" /></filter>
          <filter id={`${id}-dot`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="0.9" /></filter>
          <mask id={`${id}-glint`}>
            <circle cx="50" cy="50" r="42" fill="#fff" />
            <circle {...GLINT.cut} fill="#000" />
          </mask>
          <mask id={`${id}-bounce`}>
            <circle cx="50" cy="50" r="42" fill="#fff" />
            <circle {...BOUNCE.cut} fill="#000" />
          </mask>
          <radialGradient id={`${id}-glint-fill`} gradientUnits="userSpaceOnUse" cx={GLINT.mid.x} cy={GLINT.mid.y} r={GLINT.reach}>
            <stop offset="0" style={cream(0.7)} />
            <stop offset="0.4" style={cream(0.4)} />
            <stop offset="0.78" style={cream(0.07)} />
            <stop offset="1" style={cream(0)} />
          </radialGradient>
          <radialGradient id={`${id}-bounce-fill`} gradientUnits="userSpaceOnUse" cx={BOUNCE.mid.x} cy={BOUNCE.mid.y} r={BOUNCE.reach}>
            <stop offset="0" style={gold(0.3)} />
            <stop offset="0.6" style={gold(0.1)} />
            <stop offset="1" style={gold(0)} />
          </radialGradient>
        </defs>
        <g filter={`url(#${id}-soft)`}>
          <rect width="100" height="100" fill={`url(#${id}-glint-fill)`} mask={`url(#${id}-glint)`} />
        </g>
        <g filter={`url(#${id}-softer)`}>
          <rect width="100" height="100" fill={`url(#${id}-bounce-fill)`} mask={`url(#${id}-bounce)`} />
        </g>
        <circle cx="31" cy="27" r="1.4" filter={`url(#${id}-dot)`} style={{ fill: 'rgb(var(--c-cream) / 0.45)' }} />
      </svg>
    </>
  );
};

// The bow and stem, one brass piece with the case: the stem rises from a collar that
// flares into the rim, the bow ring runs into the knurled crown, and the shadow falls on
// the desk only. Drawn in px over the top of the 144px case (viewBox 0 0 44 52; the case's
// top edge is y 44, its centre 22,116, radius 72, its 2px edge line centred on radius 71).
const WatchPendant = () => {
  const id = useId().replace(/:/g, '');
  const sepia = (a) => ({ stopColor: 'rgb(var(--c-sepia))', stopOpacity: a });
  const cream = (a) => ({ stopColor: 'rgb(var(--c-cream))', stopOpacity: a });
  const brass = { fill: 'rgb(var(--c-candle-gold))' };
  const edge = { stroke: 'rgb(var(--c-sepia))' };
  const lit = `url(#${id}-lit)`;
  // The flare's brass covers the case's edge line under it, and that line turns up the
  // flare's sides (same width, same ink), so case and stem share one outline.
  const flare = 'M 10.5 45.94 C 13.5 45.45 16.7 44 16.7 41.6 L 27.3 41.6 C 27.3 44 30.5 45.45 33.5 45.94 L 33.5 48.5 L 10.5 48.5 Z';
  const flareEdge = 'M 7.5 46.5 A 71 71 0 0 1 10.5 45.94 C 13.5 45.45 16.7 44 16.7 41.6 M 36.5 46.5 A 71 71 0 0 0 33.5 45.94 C 30.5 45.45 27.3 44 27.3 41.6';
  const silhouette = (
    <>
      <circle cx="22" cy="13.6" r="9.8" fill="none" strokeWidth="3" />
      <rect x="15" y="22.4" width="14" height="10.4" rx="2.2" />
      <rect x="18" y="32.4" width="8" height="6.4" />
      <rect x="16.2" y="38.2" width="11.6" height="3.4" rx="1.5" />
      <path d={flare} />
    </>
  );
  return (
    <svg aria-hidden="true" className="absolute pointer-events-none overflow-visible" viewBox="0 0 44 52"
      style={{ left: 'calc(50% - 22px)', top: '-44px', width: '44px', height: '52px' }}>
      <defs>
        <linearGradient id={`${id}-lit`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={sepia(0.35)} />
          <stop offset="0.2" style={cream(0.4)} />
          <stop offset="0.45" style={cream(0)} />
          <stop offset="0.78" style={sepia(0.16)} />
          <stop offset="1" style={sepia(0.55)} />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.1" style={cream(0.5)} />
          <stop offset="0.45" style={cream(0)} />
          <stop offset="1" style={sepia(0.6)} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id={`${id}-tuck`} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="0.7" /></filter>
        <mask id={`${id}-desk`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="64" height="72">
          <rect x="-10" y="-10" width="64" height="72" fill="#fff" />
          <circle cx="22" cy="116" r="72" fill="#000" />
        </mask>
      </defs>
      {/* the shadow, on the desk and never on the case */}
      <g mask={`url(#${id}-desk)`}>
        <g transform="translate(1.6 3)" filter={`url(#${id}-shadow)`} style={{ fill: 'rgba(0,0,0,0.7)', stroke: 'rgba(0,0,0,0.7)' }}>
          {silhouette}
        </g>
      </g>
      {/* the bow ring */}
      <circle cx="22" cy="13.6" r="9.8" fill="none" strokeWidth="3" style={{ stroke: 'rgb(var(--c-candle-gold))' }} />
      <circle cx="22" cy="13.6" r="9.8" fill="none" strokeWidth="3" stroke={`url(#${id}-ring)`} />
      <circle cx="22" cy="13.6" r="11.3" fill="none" strokeWidth="0.6" style={{ ...edge, strokeOpacity: 0.55 }} />
      <circle cx="22" cy="13.6" r="8.3" fill="none" strokeWidth="0.6" style={{ ...edge, strokeOpacity: 0.55 }} />
      {/* collar flaring into the rim, stem and crown */}
      <path d={flare} style={brass} />
      <path d={flareEdge} fill="none" strokeWidth="2" style={edge} />
      <rect x="18" y="32.4" width="8" height="6.4" style={brass} />
      <rect x="18" y="32.4" width="8" height="6.4" fill={lit} />
      <path d="M 18 32.4 V 38.8 M 26 32.4 V 38.8" fill="none" strokeWidth="1" style={edge} />
      <rect x="16.2" y="38.2" width="11.6" height="3.4" rx="1.5" style={{ ...brass, ...edge }} strokeWidth="1" />
      <rect x="16.2" y="38.2" width="11.6" height="3.4" rx="1.5" fill={lit} />
      <rect x="15" y="22.4" width="14" height="10.4" rx="2.2" style={{ ...brass, ...edge }} strokeWidth="1" />
      <rect x="15" y="22.4" width="14" height="10.4" rx="2.2" fill={lit} />
      {[17.4, 19.7, 22, 24.3, 26.6].map(x => (
        <line key={x} x1={x} y1="23.8" x2={x} y2="31.4" strokeWidth="0.7" style={{ ...edge, strokeOpacity: 0.32 }} />
      ))}
      {/* where the bow runs into the crown */}
      <ellipse cx="22" cy="23.3" rx="5.6" ry="1.2" filter={`url(#${id}-tuck)`} style={{ fill: 'rgba(0,0,0,0.35)' }} />
    </svg>
  );
};

const NOT_CONNECTED = 'Not sent: the desk is not connected to the table. It reconnects by itself; try again in a moment.';

// ── Single labeled 4-slice tension clock ──────────────────────────────────────
// Replaces the two GMThreatWatch gauges. Starts empty and fills a red slice per step.
// GM can adjust with +/- controls. Label is editable by GM, read-only for players.
export const TensionClock = ({ readOnly = false }) => {
  const { circle, socket, accessSession, lastPlayedCampaign } = useGameStore(useShallow(s => ({
    circle: s.circle,
    socket: s.socket,
    accessSession: s.accessSession,
    lastPlayedCampaign: s.lastPlayedCampaign,
  })));
  const isGM = !readOnly && (accessSession?.role === 'GM' || lastPlayedCampaign?.type === 'gm');
  const socketReady = socket?.readyState === WebSocket.OPEN;

  const currentVal = circle?.tension_clock ?? 0;
  const label = circle?.tension_label ?? '';

  const sendUpdate = (updates) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, ...updates },
      }));
    }
  };

  const adjust = (inc) => {
    const newVal = Math.max(0, Math.min(4, currentVal + inc));
    sendUpdate({ tension_clock: newVal });
  };

  // Build SVG tick marks for a 12-hour clock face
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angleDeg = i * 30;
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    const isMajor = i % 3 === 0;
    const innerR = isMajor ? 36 : 40;
    const outerR = 46;
    return {
      x1: 50 + innerR * Math.cos(angleRad),
      y1: 50 + innerR * Math.sin(angleRad),
      x2: 50 + outerR * Math.cos(angleRad),
      y2: 50 + outerR * Math.sin(angleRad),
      isMajor,
    };
  });

  const fillPct = (currentVal / 4) * 100;
  // A full dial is one fill: the conic gradient's edge would leave a hairline at 12
  const conicStyle = fillPct >= 100
    ? { background: 'rgb(var(--c-oxblood))' }
    : fillPct > 0
      ? { background: `conic-gradient(from 0deg, rgb(var(--c-oxblood)) ${fillPct}%, transparent ${fillPct}%)` }
      : {};

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* The bow and stem are drawn on the case below; this keeps their place in the column */}
      <div aria-hidden="true" className="h-8" />

      {/* Clock face — pocket watch style */}
      <div className="relative w-36 h-36 group">
        {/* Brass case: a flat gold bezel around the dark dial, lit by the one lamp */}
        <div className="w-full h-full rounded-full bg-candle-gold relative flex items-center justify-center shadow-[4px_12px_20px_rgba(0,0,0,0.85)] border-2 border-sepia overflow-hidden">

          {/* Watch face */}
          <div className="w-[85%] h-[85%] rounded-full bg-night border-2 border-sepia overflow-hidden relative shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)]">
            {/* Blood red fill — clockwise from 12, drains counterclockwise */}
            {fillPct > 0 && (
              <div className="absolute inset-0 rounded-full transition-all duration-500" style={conicStyle} />
            )}
            {/* Tick marks overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              {ticks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  style={{ stroke: t.isMajor ? 'rgb(var(--c-candle-gold))' : 'rgb(var(--c-candle-gold) / 0.45)' }}
                  strokeWidth={t.isMajor ? 2 : 1} strokeLinecap="round" />
              ))}
              <circle cx="50" cy="50" r="2.5" style={{ fill: 'rgb(var(--c-candle-gold))' }} />
            </svg>
            {/* Dashed tick ring */}
            <div className="absolute inset-0 rounded-full border-[2px] border-candle-gold/20 border-dashed pointer-events-none" />
            {/* Under the GM's buttons the dial dims; the brass and the glass keep their light */}
            {isGM && <div className="absolute inset-0 rounded-full bg-black/50 pointer-events-none" />}
            <WatchGlass />
          </div>
        </div>

        <WatchPendant />

        {/* GM +/- controls — always visible for GM */}
        {isGM && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center gap-3 z-10">
            <button onClick={() => adjust(-1)} disabled={!socketReady} aria-label="Lower tension by one"
              className="w-10 h-10 rounded-full bg-gm-slate border border-moonlight-steel text-cream font-black text-lg hover:bg-moonlight-steel hover:text-gm-night transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait"
            >−</button>
            <button onClick={() => adjust(1)} disabled={!socketReady} aria-label="Raise tension by one"
              className="w-10 h-10 rounded-full bg-gm-slate border border-moonlight-steel text-cream font-black text-lg hover:bg-moonlight-steel hover:text-gm-night transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait"
            >+</button>
          </div>
        )}
      </div>

      {/* Label — editable by GM, read-only for players */}
      {isGM ? (
        <input type="text" defaultValue={label} key={label}
          onBlur={e => sendUpdate({ tension_label: e.target.value })}
          placeholder="Clock name"
          aria-label="Tension clock name"
          className="text-center font-sans font-bold text-xs uppercase tracking-widest text-ink bg-parchment border border-sepia/30 px-2 py-1 w-60 max-w-full shadow-sm placeholder-sepia/90 focus:border-oxblood transition-colors"
        />
      ) : (
        <div className="font-sans font-bold text-xs uppercase tracking-widest text-ink bg-parchment border border-sepia/30 px-2 py-1 shadow-sm min-w-[9rem] text-center">
          {label || '—'}
        </div>
      )}
    </div>
  );
};

// ── Scene Manager (dispatch memo + location/atmosphere inputs) ─────────────────
export const SceneManager = () => {
  const { circle, socket, accessSession } = useGameStore();

  const [location,   setLocation]   = useState(circle?.location   || "");
  const [atmosphere, setAtmosphere] = useState(circle?.atmosphere || "");

  // Sync inputs when circle data arrives (from Zustand rehydration or WebSocket update)
  useEffect(() => { setLocation(circle?.location   || ""); }, [circle?.location]);
  useEffect(() => { setAtmosphere(circle?.atmosphere || ""); }, [circle?.atmosphere]);

  // A short receipt under the stamps: what went out and when, or why it did not.
  const [receipt, setReceipt] = useState(null); // { ok, text }

  // The letter goes out: the sheet shifts under the stamp with the paper sound (owner's
  // round 3 item 21). Still under reduced motion, where only the sound remains.
  const letterRef = useRef(null);
  const sendOff = () => {
    playPaperSound();
    const el = letterRef.current;
    if (!el?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ transform: 'none' }, { transform: 'translate(4px, -3px) rotate(0.4deg)', offset: 0.35 }, { transform: 'none' }],
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  };

  const broadcastScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, location, atmosphere },
      }));
      sendOff();
      setReceipt({ ok: true, text: `Dispatched at ${clockTime()}.` });
    } else {
      setReceipt({ ok: false, text: NOT_CONNECTED });
    }
  };

  const endAssignment = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_end_assignment',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, campaign_id: accessSession?.campaignId },
      }));
      setLocation("");
      setAtmosphere("");
      setReceipt({ ok: true, text: `Assignment ended at ${clockTime()}. Ability uses are reset.` });
    } else {
      setReceipt({ ok: false, text: NOT_CONNECTED });
    }
  };

  const circleName = circle?.name || 'the Circle';

  return (
    <div ref={letterRef} className="bg-parchment text-ink p-5 sm:p-8 xl:p-5 2xl:p-6 shadow-[5px_10px_25px_rgba(0,0,0,0.8)] border border-parchment-deep relative"
         style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.1) 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}>

      {/* Masking tape strip */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 z-10 rotate-1"
        style={{
          background: 'rgb(var(--c-parchment-deep) / 0.75)',
          borderTop: '1px solid rgb(var(--c-sepia) / 0.25)',
          borderBottom: '1px solid rgb(var(--c-sepia) / 0.25)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 6px)',
        }}
      />

      {/* Letterhead */}
      <div className="border-b-2 border-double border-sepia pb-4 mb-6 xl:pb-3 xl:mb-4 text-center relative">
        <SerialNo value={serialFor(`dispatch-${circle?.id ?? ''}`, 4)} className="absolute top-0 right-0" />
        <SafeIcon name="GiEyeShield" size={32} className="mx-auto mb-2 text-sepia" />
        <h2 className="font-display uppercase tracking-[0.08em] text-xl leading-tight">Candela Obscura</h2>
        <p className="font-serif italic text-base text-sepia leading-snug">Office of the Lightkeeper: Priority Dispatch</p>
      </div>

      {/* Typed body */}
      <div className="font-serif text-base leading-[28px] text-left text-ink">
        To the investigators of {circleName}: proceed with haste to
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          size={Math.max(8, (location || '').length + 2)}
          style={{ fieldSizing: 'content', minWidth: '6rem' }}
          className="bg-transparent border-b border-dashed border-sepia focus:border-oxblood px-2 mx-2 text-oxblood font-bold font-serif italic text-center w-full sm:w-auto max-w-[calc(100%-1rem)] placeholder-sepia/90"
          placeholder="location"
          spellCheck="false"
        />.
        Be vigilant of strange activity. Scout Investigations report the area to be
        <textarea
          value={atmosphere}
          onChange={(e) => setAtmosphere(e.target.value)}
          className="bg-transparent border-b border-dashed border-sepia focus:border-oxblood w-full mt-2 resize-none text-oxblood font-bold font-serif italic leading-[28px] placeholder-sepia/90"
          rows="2"
          placeholder="what the place is like"
          aria-label="Atmosphere"
          spellCheck="false"
        />
        <br />
        Secure the area. Light the Way.
      </div>

      {/* Stamp buttons; End Assignment asks for a second press and says what it clears */}
      <div className="mt-8 xl:mt-5 flex justify-between items-start gap-4 relative">
        {/* End Assignment: left stamp */}
        <ConfirmAction
          className="flex flex-col items-start gap-2 max-w-[11rem]"
          onConfirm={endAssignment}
          cancelLabel="Keep going"
          armedHint="Press again to end it: the dispatch clears and every player's ability uses reset."
          hintClassName="[&>p]:text-sm"
          renderButton={(armed, props) => (
            <button
              {...props}
              className="relative group transform rotate-2 hover:rotate-0 transition-transform active:scale-95"
            >
              <div className={`border-[3px] rounded px-3 py-1.5 font-sans font-black uppercase tracking-widest text-xs ${
                armed
                  ? 'border-oxblood bg-oxblood text-cream'
                  : 'border-sepia text-sepia opacity-90 group-hover:opacity-100 group-hover:bg-sepia/5'
              }`}>
                {armed ? 'Yes, end it' : 'End Assignment'}
              </div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none mix-blend-overlay" />
            </button>
          )}
        />

        {/* Dispatch: right stamp */}
        <div className="flex flex-col items-end gap-2 max-w-[11rem] text-right">
          <button
            onClick={broadcastScene}
            className="relative group transform -rotate-3 hover:rotate-0 transition-transform active:scale-95"
            aria-describedby="dispatch-effect"
          >
            <div className="border-[3px] border-oxblood rounded px-4 py-1.5 text-oxblood font-sans font-black uppercase tracking-[0.15em] text-sm opacity-90 group-hover:opacity-100 group-hover:bg-oxblood/5">
              Dispatch
            </div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 pointer-events-none mix-blend-overlay" />
          </button>
          <p id="dispatch-effect" className="sr-only">Sends the location and atmosphere to every player's desk.</p>
        </div>
      </div>
      <div className="mt-6 xl:mt-4 flex items-center gap-2" aria-hidden="true">
        <PrinterMark size={12} />
        <FormLine>Form C.O. 2 · Dispatch</FormLine>
      </div>
      {receipt && (
        <p role={receipt.ok ? 'status' : 'alert'} className={`mt-4 font-serif text-base leading-snug ${receipt.ok ? 'text-seal-green' : 'text-oxblood'}`}>
          {receipt.text}
        </p>
      )}
    </div>
  );
};
