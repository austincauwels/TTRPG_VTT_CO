import React from 'react';

export const PocketWatchClock = ({ title, current, max, colorHex, className = "", large = false, children }) => {
  const fillPercentage = (current / max) * 100;
  const conicBg = `conic-gradient(from -90deg, ${colorHex} ${fillPercentage}%, transparent 0)`;
  const rotationDegrees = (current / max) * 360;

  if (large) {
    return (
      <div className={`relative flex flex-col items-center select-none transition-transform duration-300 ${className}`} title={`${title}: ${current}/${max}`}>
        {/* Winding crown */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          <div className="w-8 h-8 rounded-full border-[4px] border-slate-300 bg-transparent shadow-inner" />
          <div className="w-5 h-4 bg-gradient-to-b from-slate-200 to-slate-500 border border-slate-600 rounded-sm -mt-1.5 shadow" />
        </div>

        {/* Outer case */}
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 relative flex items-center justify-center shadow-[0_10px_15px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.9)] border border-slate-500 z-20 overflow-hidden">
          <div className="absolute top-2 left-3 w-16 h-12 bg-white/40 rounded-full blur-[1px] z-30 pointer-events-none transform rotate-[-25deg]" />
          <div className="absolute bottom-1 right-1 w-20 h-20 bg-gradient-to-tl from-black/30 to-transparent rounded-full z-30 pointer-events-none blur-[1px]" />

          <div className="w-[85%] h-[85%] rounded-full bg-[#f4ece0] border border-slate-500/80 overflow-hidden relative shadow-[inset_0_3px_8px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 opacity-75 mix-blend-multiply transition-all duration-500" style={{ background: conicBg, transform: 'scaleX(-1)' }} />
            <div
              className="absolute bottom-1/2 left-1/2 w-[2px] h-[45%] bg-slate-900 origin-bottom -translate-x-1/2 rounded-t-full shadow-[1px_0_2px_rgba(0,0,0,0.5)] z-20 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-50%) rotate(-${rotationDegrees}deg)` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-slate-900 rounded-t-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-slate-200 to-slate-600 rounded-full z-30 shadow-md border border-slate-500" />
            <div className="absolute inset-0 rounded-full border-[2px] border-slate-400/50 border-dashed pointer-events-none" />
          </div>

          {children}
        </div>

        <div className="mt-3 bg-[#f4ece0] px-3 py-1 border border-[#d2c9b9] shadow-[0_4px_6px_rgba(0,0,0,0.4)] relative z-20 transform rotate-1">
          <span className="block font-mono text-[11px] font-black text-[#3d312b] tracking-[0.1em] uppercase text-center">
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center select-none transition-transform duration-300 ${className}`} title={`${title}: ${current}/${max}`}>
      {/* Winding crown */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
        <div className="w-5 h-5 rounded-full border-[3px] border-slate-300 bg-transparent shadow-inner" />
        <div className="w-3 h-2.5 bg-gradient-to-b from-slate-200 to-slate-500 border border-slate-600 rounded-sm -mt-1 shadow" />
      </div>

      {/* Outer case */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 relative flex items-center justify-center shadow-[0_10px_15px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.9)] border border-slate-500 z-20 overflow-hidden">
        {/* Glass highlights */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-8 bg-white/40 rounded-full blur-[1px] z-30 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-12 h-12 bg-gradient-to-tl from-black/30 to-transparent rounded-full z-30 pointer-events-none blur-[1px]" />

        {/* Watch face */}
        <div className="w-[85%] h-[85%] rounded-full bg-[#f4ece0] border border-slate-500/80 overflow-hidden relative shadow-[inset_0_3px_8px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 opacity-50 mix-blend-multiply transition-all duration-500" style={{ background: conicBg, transform: 'scaleX(-1)' }} />
          {/* Hand */}
          <div
            className="absolute bottom-1/2 left-1/2 w-[2px] h-[45%] bg-slate-900 origin-bottom -translate-x-1/2 rounded-t-full shadow-[1px_0_2px_rgba(0,0,0,0.5)] z-20 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-50%) rotate(-${rotationDegrees}deg)` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-slate-900 rounded-t-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          </div>
          {/* Center pin */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gradient-to-br from-slate-200 to-slate-600 rounded-full z-30 shadow-md border border-slate-500" />
          {/* Tick ring */}
          <div className="absolute inset-0 rounded-full border-[2px] border-slate-400/50 border-dashed pointer-events-none" />
        </div>

        {children}
      </div>

      <div className="mt-2 bg-[#f4ece0] px-2 py-0.5 border border-[#d2c9b9] shadow-[0_4px_6px_rgba(0,0,0,0.4)] relative z-20 transform rotate-1">
        <span className="block font-mono text-[9px] font-black text-[#3d312b] tracking-[0.1em] uppercase text-center">
          {title}
        </span>
      </div>
    </div>
  );
};
