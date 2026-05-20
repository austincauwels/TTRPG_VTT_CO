import React from 'react';
import useGameStore from '../../store/gameStore';

export const SilverExposureRegistry = () => {
  const { circle, socket, accessSession } = useGameStore();

  const handleAdjust = (timerName, increment, maxVal) => {
    const current = circle?.[timerName] ?? 0;
    let newVal = Math.max(0, Math.min(maxVal, current + increment));
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: 1, [timerName]: newVal }
      }));
    }
  };

  const SilverWatch = ({ title, timerName, maxVal, colorHex, rotationClass }) => {
    const current = circle?.[timerName] ?? 0;
    const fillPercentage = (current / maxVal) * 100;
    const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

    return (
      <div className={`relative flex flex-col items-center select-none transition-transform duration-300 group ${rotationClass}`}>
        
        {/* Watch Top Hardware (Ring and Crown) */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 drop-shadow-lg">
          <div className="w-7 h-7 rounded-full border-4 border-slate-300 bg-transparent shadow-inner" />
          <div className="w-4 h-3 bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 rounded-sm -mt-2 shadow" />
        </div>
        
        {/* Metallic Outer Casing */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-100 via-slate-400 to-slate-600 relative flex items-center justify-center shadow-[0_15px_25px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.9)] border border-slate-500 z-20">
          
          {/* Glass Glare */}
          <div className="absolute top-2 left-2 w-14 h-14 bg-white/40 rounded-full blur-[2px] z-30 pointer-events-none" />
          
          {/* Watch Face & Tension Fill */}
          <div className="w-[88%] h-[88%] rounded-full bg-[#f8fafc] border border-slate-500/50 overflow-hidden relative shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]" style={{ background: conicBg }}>
            
            {/* The 12 O'Clock Hand */}
            <div className="absolute bottom-1/2 left-1/2 w-1 h-[45%] bg-slate-800 origin-bottom -translate-x-1/2 rounded-t-full shadow-sm z-20 pointer-events-none" />
            {/* Center Pivot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-slate-200 to-slate-500 rounded-full z-30 shadow-lg border border-slate-600 pointer-events-none" />
            
            {/* Minute Ticks */}
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-300/40 border-dashed pointer-events-none" />
          </div>

          {/* GM Controls Overlay */}
          <div className="absolute inset-0 bg-[#0a1118]/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-40 backdrop-blur-sm">
            <button onClick={() => handleAdjust(timerName, -1, maxVal)} className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-300 text-slate-300 font-black text-xl hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg">-</button>
            <button onClick={() => handleAdjust(timerName, 1, maxVal)} className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-300 text-slate-300 font-black text-xl hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg">+</button>
          </div>
        </div>
        
        {/* Watch Label Plate */}
        <div className="mt-3 bg-slate-800/90 px-3 py-1 border border-slate-500/50 rounded shadow-lg backdrop-blur-sm relative z-20">
          <span className="block font-mono text-[9px] font-black text-slate-300 tracking-widest uppercase text-center">{title}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-10 mt-6 justify-center">
      <SilverWatch title="Guard Patrol" timerName="guard_patrol" maxVal={4} colorHex="#3b82f6" rotationClass="transform -rotate-6" />
      <SilverWatch title="Miasma Bleed" timerName="miasma_bleed" maxVal={6} colorHex="#94a3b8" rotationClass="transform rotate-12 translate-y-3" />
    </div>
  );
};