import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

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
        payload: { role: accessSession?.role, circle_id: 1, ...updates },
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
    ? { background: `conic-gradient(from 0deg, #800000 ${fillPct}%, transparent ${fillPct}%)` }
    : {};

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Winding crown */}
      <div className="flex flex-col items-center z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ marginBottom: '-6px' }}>
        <div className="w-7 h-7 rounded-full border-[3px] border-slate-300 bg-transparent shadow-inner" />
        <div className="w-4 h-3.5 bg-gradient-to-b from-slate-200 to-slate-500 border border-slate-600 rounded-sm -mt-1 shadow" />
      </div>

      {/* Clock face — pocket watch style */}
      <div className="relative w-36 h-36 group">
        {/* Outer metal case */}
        <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 via-slate-500 to-slate-800 relative flex items-center justify-center shadow-[0_12px_20px_rgba(0,0,0,0.9),inset_0_1px_3px_rgba(255,255,255,0.8)] border border-slate-500 overflow-hidden">
          {/* Glass highlight top-left */}
          <div className="absolute top-2 left-3 w-14 h-10 bg-white/35 rounded-full blur-[1px] z-30 pointer-events-none transform rotate-[-25deg]" />
          {/* Glass shadow bottom-right */}
          <div className="absolute bottom-1 right-1 w-16 h-16 bg-gradient-to-tl from-black/30 to-transparent rounded-full z-30 pointer-events-none blur-[1px]" />

          {/* Watch face */}
          <div className="w-[85%] h-[85%] rounded-full bg-[#0d0505] border border-slate-600/80 overflow-hidden relative shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)]">
            {/* Blood red fill — clockwise from 12, drains counterclockwise */}
            {fillPct > 0 && (
              <div className="absolute inset-0 rounded-full transition-all duration-500" style={conicStyle} />
            )}
            {/* Tick marks overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              {ticks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke={t.isMajor ? '#d4af37' : '#6b5020'}
                  strokeWidth={t.isMajor ? 2 : 1} strokeLinecap="round" />
              ))}
              <circle cx="50" cy="50" r="2.5" fill="#d4af37" />
            </svg>
            {/* Dashed tick ring */}
            <div className="absolute inset-0 rounded-full border-[2px] border-slate-600/40 border-dashed pointer-events-none" />
          </div>
        </div>

        {/* GM +/- controls — always visible for GM */}
        {isGM && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center gap-3 z-10">
            <button onClick={() => adjust(-1)} disabled={!socketReady}
              className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-400 text-slate-200 font-black text-lg hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait"
            >-</button>
            <button onClick={() => adjust(1)} disabled={!socketReady}
              className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-400 text-slate-200 font-black text-lg hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait"
            >+</button>
          </div>
        )}
      </div>

      {/* Label — editable by GM, read-only for players */}
      {isGM ? (
        <input type="text" defaultValue={label} key={label}
          onBlur={e => sendUpdate({ tension_label: e.target.value })}
          placeholder="Clock label…"
          className="text-center font-mono text-[11px] uppercase tracking-widest text-[#2c1a0e] bg-[#f4ece0] border border-[#d2c9b9] px-2 py-0.5 w-36 shadow-sm focus:outline-none focus:border-[#8b6040] transition-colors"
        />
      ) : (
        <div className="font-mono text-[11px] uppercase tracking-widest text-[#3d312b] bg-[#f4ece0] border border-[#d2c9b9] px-2 py-0.5 shadow-sm min-w-[9rem] text-center">
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

  const broadcastScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: 1, location, atmosphere },
      }));
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
    }
  };

  const circleName = circle?.name || 'the Circle';

  return (
    <div className="bg-[#f4ece0] text-[#2c2420] p-8 shadow-[5px_10px_25px_rgba(0,0,0,0.8)] border border-[#d2c9b9] relative"
         style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.04) 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}>

      {/* Masking tape strip */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 z-10 rotate-1"
        style={{
          background: 'rgba(240, 228, 190, 0.75)',
          borderTop: '1px solid rgba(180,160,110,0.4)',
          borderBottom: '1px solid rgba(180,160,110,0.4)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 6px)',
        }}
      />

      {/* Letterhead */}
      <div className="border-b-2 border-double border-[#7a6a5a] pb-4 mb-6 text-center relative">
        <SafeIcon name="GiEyeShield" size={32} className="mx-auto mb-2 opacity-80" />
        <h2 className="font-serif font-black uppercase tracking-[0.2em] text-lg">Candela Obscura</h2>
        <p className="font-mono text-sm uppercase tracking-widest text-[#7a6a5a] font-bold">Office of the Lightkeeper — Priority Dispatch</p>
      </div>

      {/* Typed body */}
      <div className="font-mono text-xs sm:text-sm leading-[28px] text-justify text-[#3d312b]">
        To the investigators of {circleName}: proceed with haste to
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="bg-transparent border-b border-dashed border-[#7a6a5a] focus:border-[#8b0000] outline-none px-2 mx-2 text-[#8b0000] font-bold font-serif italic text-center w-full sm:w-auto"
          placeholder="[ Insert Location ]"
          spellCheck="false"
        />.
        Be vigilant of strange activity. Scout Investigations report the area to be
        <textarea
          value={atmosphere}
          onChange={(e) => setAtmosphere(e.target.value)}
          className="bg-transparent border-b border-dashed border-[#7a6a5a] focus:border-[#8b0000] outline-none w-full mt-2 resize-none text-[#8b0000] font-bold font-serif italic leading-[28px]"
          rows="2"
          placeholder="[ Describe the environment... ]"
          spellCheck="false"
        />
        <br />
        Secure the area. Light the Way.
      </div>

      {/* Stamp buttons */}
      <div className="mt-8 flex justify-between items-end relative">
        {/* End Assignment — left stamp */}
        <button
          onClick={endAssignment}
          className="relative group transform rotate-2 hover:rotate-0 transition-transform active:scale-95"
          title="End assignment — clears scene and resets all player ability uses"
        >
          <div className="border-[3px] border-[#4a3010] rounded px-3 py-1.5 text-[#4a3010] font-sans font-black uppercase tracking-[0.2em] text-xs opacity-60 group-hover:opacity-90 group-hover:bg-[#4a3010]/5">
            End Assignment
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none mix-blend-overlay" />
        </button>

        {/* Dispatch — right stamp */}
        <button
          onClick={broadcastScene}
          className="relative group transform -rotate-3 hover:rotate-0 transition-transform active:scale-95"
          title="Dispatch orders to player cards"
        >
          <div className="border-[3px] border-[#8b0000] rounded px-4 py-1.5 text-[#8b0000] font-sans font-black uppercase tracking-[0.3em] text-sm opacity-80 group-hover:opacity-100 group-hover:bg-[#8b0000]/5">
            Dispatch
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 pointer-events-none mix-blend-overlay" />
        </button>
      </div>
    </div>
  );
};
