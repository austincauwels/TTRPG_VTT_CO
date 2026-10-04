import React from 'react';

// A printed intake form on parchment card stock, the twin of the Lightkeeper pamphlet.
export const NewInvestigatorPamphlet = ({ onOpen }) => (
  <div
    onClick={onOpen}
    className="pamphlet w-full h-[300px] sm:h-[390px] lg:w-[210px] rotate-[-2deg] lg:bottom-[40px] lg:left-[40px] lg:hover:-translate-y-3 lg:hover:-translate-x-2 lg:hover:rotate-[-3deg] z-30 p-1.5 sm:p-2"
  >
    {/* Ornate Inner Border */}
    <div className="w-full h-full border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-center text-ink">

      <div className="w-full text-center border-b border-sepia/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
        <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia">
          Registry Form
        </span>
        <div className="font-serif text-base sm:text-xl italic text-sepia sm:mt-1">
          No. CO-102
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
        <h3 className="font-display text-xl sm:text-2xl uppercase tracking-[0.06em] leading-none mb-1 text-oxblood">
          Blank
        </h3>
        <h3 className="font-display text-xl sm:text-2xl uppercase tracking-[0.06em] leading-none mb-2 sm:mb-4 text-oxblood">
          Intake
        </h3>

        {/* Vintage Divider */}
        <div className="flex items-center gap-1 my-2 opacity-70">
          <div className="w-6 h-[1px] bg-sepia" />
          <div className="w-1.5 h-1.5 rounded-full border border-sepia" />
          <div className="w-6 h-[1px] bg-sepia" />
        </div>

        <p className="font-serif text-lg sm:text-xl leading-snug italic px-1 sm:px-2 mt-2 sm:mt-4">
          Create your Investigator
        </p>
      </div>

      <div className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
         <span className="font-display text-base sm:text-xl uppercase tracking-[0.1em] text-oxblood">Join Today</span>
      </div>
    </div>
  </div>
);
