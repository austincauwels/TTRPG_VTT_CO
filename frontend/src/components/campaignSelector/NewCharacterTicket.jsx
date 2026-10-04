import React from 'react';
import { FormLine, PrinterMark, BlankFields } from '../shared/PrintMarks';

// A printed intake form on parchment card stock, the twin of the Lightkeeper pamphlet.
export const NewInvestigatorPamphlet = ({ onOpen }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    aria-label="Blank Intake: create an investigator"
    className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-candle-gold pamphlet w-full h-[300px] sm:h-[390px] lg:w-[210px] rotate-[-2deg] lg:bottom-[40px] lg:left-[40px] lg:hover:-translate-y-3 lg:hover:-translate-x-2 lg:hover:rotate-[-3deg] z-30 p-1.5 sm:p-2"
  >
    {/* Ornate Inner Border */}
    <div className="w-full h-full border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-center text-ink">

      <div className="w-full text-center border-b border-sepia/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
        <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia">
          For players
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
        {/* One title on two lines, untracked on phones to match its twin, Lightkeeper Access */}
        <h3 className="font-display text-lg sm:text-2xl uppercase tracking-normal sm:tracking-[0.06em] leading-none mb-2 sm:mb-4 text-oxblood">
          <span className="block mb-1">Blank</span>
          <span className="block">Intake</span>
        </h3>

        {/* Vintage Divider */}
        <div className="flex items-center gap-1 my-2 opacity-70">
          <div className="w-6 h-[1px] bg-sepia" />
          <div className="w-1.5 h-1.5 rounded-full border border-sepia" />
          <div className="w-6 h-[1px] bg-sepia" />
        </div>

        {/* The intake form's own blanks, printed and waiting */}
        <BlankFields labels={['Name', 'Role', 'Specialty']} className="mt-2 sm:mt-4 px-1 text-left" />
        <span className="mt-3 sm:mt-4 flex items-center gap-1.5" aria-hidden="true">
          <PrinterMark size={11} />
          <FormLine>Form C.O. 7</FormLine>
        </span>
      </div>

      <div className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
         <span className="font-display text-base sm:text-xl uppercase tracking-[0.1em] text-oxblood">Start Here</span>
      </div>
    </div>
  </div>
);
