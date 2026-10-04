import React from 'react';

// Official cryptid field sketches (cryp1-3), kept whole under the aged-paper treatment.
export const CryptidSketches = () => (
  <div className="absolute bottom-[5%] left-0 sm:left-[4%] lg:left-[10%] w-[850px] h-[750px] pointer-events-none z-10 origin-bottom-left scale-[0.5] sm:scale-75 lg:scale-100">
    
    {/* Cryptid Sheet 1 (Bottom Left) - Scaled Up */}
    <div className="absolute bottom-[10%] left-[5%] w-[320px] aspect-[1/1.4] bg-[#e6d8bc] rotate-[-12deg] shadow-[4px_6px_15px_rgba(0,0,0,0.9)] border border-[#c4b599] p-2 flex flex-col">
      <div className="w-full h-full border border-[#5c4a35]/40 relative overflow-hidden bg-[#d9cdb4]">
        {/* Ensure object-cover fills the container */}
        <img src="/images/cryp1.jpg" alt="Field Sketch 1" className="w-full h-full object-cover aged-paper-img scale-100" />
      </div>
    </div>

    {/* Cryptid Sheet 2 (Center Massive) - Scaled Up */}
    <div className="absolute bottom-[20%] left-[32%] w-[400px] aspect-[4/5] bg-[#dbcdb2] rotate-[8deg] shadow-[5px_8px_20px_rgba(0,0,0,0.95)] border border-[#d1c2a3] p-2 flex flex-col">
      <div className="w-full h-full border border-[#5c4a35]/30 relative overflow-hidden bg-[#ebdcc2]">
        <img src="/images/cryp2.webp" alt="Field Sketch 2" className="w-full h-full object-cover aged-paper-img scale-105" />
      </div>
    </div>

    {/* Cryptid Sheet 3 (Right Under Book) - Scaled Up */}
    <div className="absolute bottom-[5%] left-[60%] w-[330px] aspect-[1/1.3] bg-[#cfc0a3] rotate-[22deg] shadow-[6px_12px_25px_rgba(0,0,0,0.98)] border border-[#b8a98d] p-3 flex flex-col">
      <div className="w-full h-full border-2 border-double border-[#5c4a35]/50 relative overflow-hidden bg-[#e0d3ba]">
        <img src="/images/cryp3.jpg" alt="Field Sketch 3" className="w-full h-full object-cover aged-paper-img" />
      </div>
    </div>
  </div>
);
