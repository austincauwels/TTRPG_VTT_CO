import React from 'react';

// Title centered, Return to Login in normal flow: its own row above the title on narrow
// screens, the right-hand column on wide ones, so the two never overlap.
export const HubHeader = ({ onLogout }) => (
  <div className="relative z-50 w-full">
    <header className="w-full bg-[#0f172a] px-4 pt-3 pb-5 lg:px-6 lg:py-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-2 border-b border-black/60 shadow-xl">
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="flex flex-col items-center text-center">
        <h1 className="text-[26px] sm:text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Chapter Hub Terminal</h2>
      </div>
      <div className="flex justify-end order-first lg:order-none lg:-mt-2">
        <button
          onClick={onLogout}
          className="whitespace-nowrap text-xs lg:text-[10px] uppercase tracking-[0.2em] font-sans text-[#3b82f6] hover:text-white transition-colors border border-transparent hover:border-[#3b82f6]/50 px-3 py-2 lg:px-2 lg:py-1"
        >
          [ Return to Login ]
        </button>
      </div>
    </header>
  </div>
);
