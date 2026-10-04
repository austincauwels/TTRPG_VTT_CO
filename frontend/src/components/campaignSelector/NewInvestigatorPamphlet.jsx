import React from 'react';

export const NewInvestigatorPamphlet = ({ onOpen }) => (
  <div
    onClick={onOpen}
    className="pamphlet w-[210px] h-[390px] rotate-[-2deg] bottom-[40px] left-[40px] hover:-translate-y-3 hover:-translate-x-2 hover:rotate-[-3deg] z-30 p-2"
  >
    {/* Ornate Inner Border */}
    <div className="w-full h-full border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-center text-[#ddd7cf] bg-[rgb(95,114,103)]">
      
      <div className="w-full text-center border-b border-[#3a3228]/40 pb-2 mb-3">
        <span className="font-mono-data text-base font-bold uppercase tracking-[0.3em] opacity-80">
          Registry Form
        </span>
        <div className="font-garamond text-2xl italic tracking-wider opacity-90 mt-1">
          No. CO-102
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
        <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
          Blank
        </h3>
        <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-4 text-[rgb(212,208,202)]">
          Intake
        </h3>
        
        {/* Vintage Divider */}
        <div className="flex items-center gap-1 my-2 opacity-70">
          <div className="w-6 h-[1px] bg-[#3a3228]" />
          <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
          <div className="w-6 h-[1px] bg-[#3a3228]" />
        </div>

        <p className="font-garamond text-2xl leading-relaxed italic px-2 mt-4 opacity-90 font-medium">
          Create your Investigator
        </p>
      </div>

      <div className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center">
         <span className="font-cinzel text-xl font-bold tracking-widest">Join Today</span>
      </div>
    </div>
  </div>
);
