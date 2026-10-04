import React from 'react';

export const HubHeader = ({ onLogout }) => (
  <div className="relative z-50 w-full">
    <div className="absolute top-4 right-6 z-50">
      <button 
        onClick={onLogout}
        className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#3b82f6] hover:text-white transition-colors border border-transparent hover:border-[#3b82f6]/50 px-2 py-1"
      >
        [ Return to Login ]
      </button>
    </div>
    
    <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
      <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
      <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Chapter Hub Terminal</h2>
    </header>
  </div>
);
