import React from 'react';

export const NewInvestigatorPamphlet = ({ onOpen }) => (
  <div
    onClick={onOpen}
    className="pamphlet w-full h-[300px] sm:h-[390px] lg:w-[210px] rotate-[-2deg] lg:bottom-[40px] lg:left-[40px] lg:hover:-translate-y-3 lg:hover:-translate-x-2 lg:hover:rotate-[-3deg] z-30 p-1.5 sm:p-2"
  >
    {/* Ornate Inner Border */}
    <div className="w-full h-full border-[3px] border-double border-[#3a3228]/80 p-2 sm:p-3 flex flex-col items-center text-[#ddd7cf] bg-[rgb(95,114,103)]">
      
      <div className="w-full text-center border-b border-[#3a3228]/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
        <span className="font-mono-data text-[10px] sm:text-base font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-80">
          Registry Form
        </span>
        <div className="font-garamond text-base sm:text-2xl italic tracking-wider opacity-90 sm:mt-1">
          No. CO-102
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
        <h3 className="font-playfair font-black text-base sm:text-2xl uppercase tracking-wider sm:tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
          Blank
        </h3>
        <h3 className="font-playfair font-black text-base sm:text-2xl uppercase tracking-wider sm:tracking-widest leading-none mb-2 sm:mb-4 text-[rgb(212,208,202)]">
          Intake
        </h3>
        
        {/* Vintage Divider */}
        <div className="flex items-center gap-1 my-2 opacity-70">
          <div className="w-6 h-[1px] bg-[#3a3228]" />
          <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
          <div className="w-6 h-[1px] bg-[#3a3228]" />
        </div>

        <p className="font-garamond text-lg sm:text-2xl leading-snug sm:leading-relaxed italic px-1 sm:px-2 mt-2 sm:mt-4 opacity-90 font-medium">
          Create your Investigator
        </p>
      </div>

      <div className="w-full border-t border-[#3a3228]/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
         <span className="font-cinzel text-sm sm:text-xl font-bold tracking-wider sm:tracking-widest">Join Today</span>
      </div>
    </div>
  </div>
);
