import React from 'react';

export const TopDownCandle = () => {
  const handleExtinguish = () => {
    if(window.confirm("Extinguish candle? This will save and end the current session.")) {
      window.location.reload(); 
    }
  };

  return (
    <div 
      onClick={handleExtinguish}
      className="w-20 h-20 rounded-full bg-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.8)] border border-slate-300 flex items-center justify-center cursor-pointer group transition-transform hover:scale-105"
      title="Extinguish Candle (Save & End Session)"
    >
      <div className="absolute w-14 h-14 rounded-full border border-slate-400/30 bg-slate-100 shadow-inner" />
      <div className="absolute w-8 h-8 rounded-full border border-slate-400/50 bg-slate-300 shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)] translate-x-1 translate-y-1" />
      
      {/* Flame */}
      <div className="relative w-3 h-3 rounded-full bg-slate-800 flex items-center justify-center shadow-[0_0_40px_rgba(96,165,250,0.9)] group-hover:shadow-[0_0_10px_rgba(96,165,250,0.4)] transition-shadow z-10">
        <div className="absolute -top-3 w-3 h-5 bg-blue-400 rounded-[50%_50%_20%_20%] shadow-[0_0_20px_#60a5fa] animate-pulse group-hover:opacity-0 transition-opacity" />
      </div>
    </div>
  );
};