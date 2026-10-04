import React from 'react';

const PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")";

// The GM's pamphlet, the twin of the Blank Intake pamphlet. It opens the roster book at
// the Lightkeeper Ledger with the new-campaign form showing, so the app has one form for
// starting a campaign.
export const GMAccessPamphlet = ({ onOpen }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    aria-label="Lightkeeper Access: start a new campaign as GM"
    className="relative lg:absolute w-full lg:w-[220px] h-[300px] sm:h-[380px] rotate-[2deg] lg:top-[100px] lg:right-[120px] z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hover:-translate-y-4 lg:hover:translate-x-4 lg:hover:rotate-[4deg] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-candle-gold"
  >
    <div
      className="absolute inset-0 border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-center text-ink"
      style={{
        backgroundColor: 'rgb(var(--c-parchment))',
        backgroundImage: PAPER,
        boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgb(var(--c-sepia) / 0.3)',
      }}
    >
      <div className="w-full text-center border-b border-sepia/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
        <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia">For the GM</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
        {/* One title on two lines, untracked on phones so LIGHTKEEPER stays inside the card */}
        <h3 className="font-display text-lg sm:text-2xl uppercase tracking-normal sm:tracking-[0.06em] leading-none mb-2 sm:mb-4 text-oxblood">
          <span className="block mb-1">Lightkeeper</span>
          <span className="block">Access</span>
        </h3>
        <div aria-hidden="true" className="flex items-center gap-1 my-2 opacity-70">
          <div className="w-6 h-[1px] bg-sepia" />
          <div className="w-1.5 h-1.5 rounded-full border border-sepia" />
          <div className="w-6 h-[1px] bg-sepia" />
        </div>
        <p className="font-serif text-lg sm:text-xl leading-snug italic px-1 sm:px-2 mt-2 sm:mt-4">
          Start and run a campaign as GM.
        </p>
      </div>

      <div className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
        <span className="font-display text-base sm:text-xl uppercase tracking-[0.1em] text-oxblood">New Campaign</span>
      </div>
    </div>
  </div>
);
