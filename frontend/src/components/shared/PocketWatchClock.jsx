import React from 'react';

export const PocketWatchClock = ({ title, current, max, colorHex, className = "", children }) => {
  const fillPercentage = (current / max) * 100;
  const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

  return (
    <div className={`flex flex-col items-center select-none transition-transform duration-300 ${className}`} title={`${title}: ${current}/${max}`}>
      <div className="flex flex-col items-center -mb-2 z-10">
        <div className="w-6 h-6 rounded-full border-4 border-[#cc9a29] shadow-md bg-[#1a1311]" />
        <div className="w-8 h-3 bg-[#cc9a29] border border-black/30 rounded-t-sm -mt-1" />
      </div>
      
      <div className="w-28 h-28 rounded-full border-[6px] border-[#cc9a29] bg-[#fcf8ef] relative flex items-center justify-center p-1 shadow-[0_12px_24px_rgba(0,0,0,0.75)] group">
        <div className="absolute top-1 left-1 w-12 h-12 bg-white/20 rounded-full blur-[1px] z-10 pointer-events-none" />
        
        <div className="w-full h-full rounded-full border border-black/20 overflow-hidden relative shadow-inner bg-[#f6ecd2]" style={{ background: conicBg }}>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1a1311] rounded-full z-20 shadow pointer-events-none" />
        </div>

        {/* GM Interaction Overlay injected here */}
        {children}
      </div>
      <span className="mt-2.5 block font-mono text-[10px] font-black text-white/50 tracking-widest uppercase text-center">{title}</span>
    </div>
  );
};