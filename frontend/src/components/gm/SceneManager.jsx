import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { ConfirmAction } from '../shared/ConfirmAction';
import { FormLine, SerialNo, PrinterMark, serialFor } from '../shared/PrintMarks';

const clockTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const NOT_CONNECTED = 'Not sent: the desk is not connected to the table. It reconnects by itself; try again in a moment.';

// ── Single labeled 4-slice tension clock ──────────────────────────────────────
// Replaces the two GMThreatWatch gauges. Starts fully filled (4/4 red slices).
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

  const currentVal = circle?.tension_clock ?? 4;
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
  const conicStyle = fillPct > 0
    ? { background: `conic-gradient(from 0deg, rgb(var(--c-oxblood)) ${fillPct}%, transparent ${fillPct}%)` }
    : {};

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Winding crown: a plain brass bow and stem */}
      <div className="flex flex-col items-center z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ marginBottom: '-6px' }}>
        <div className="w-7 h-7 rounded-full border-[3px] border-candle-gold bg-transparent" />
        <div className="w-4 h-3.5 bg-candle-gold border border-sepia rounded-sm -mt-1" />
      </div>

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
          </div>
        </div>

        {/* GM +/- controls — always visible for GM */}
        {isGM && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center gap-3 z-10">
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

  const broadcastScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, location, atmosphere },
      }));
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
    <div className="bg-parchment text-ink p-5 sm:p-8 shadow-[5px_10px_25px_rgba(0,0,0,0.8)] border border-parchment-deep relative"
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
      <div className="border-b-2 border-double border-sepia pb-4 mb-6 text-center relative">
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
      <div className="mt-8 flex justify-between items-start gap-4 relative">
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
      <div className="mt-6 flex items-center gap-2" aria-hidden="true">
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
