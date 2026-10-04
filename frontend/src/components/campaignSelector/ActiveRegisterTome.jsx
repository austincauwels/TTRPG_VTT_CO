import React from 'react';

export const ActiveRegisterTome = ({ characters, gmCampaigns, onOpen }) => (
  <div
    onClick={onOpen}
    className="thick-book group w-full lg:w-[28vw] max-w-[400px] aspect-[1/1.4] bg-[#0b1f12] p-3 sm:p-6 shadow-[15px_25px_40px_rgba(0,0,0,0.95),inset_8px_0_20px_rgba(0,0,0,0.9),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[-2deg] lg:rotate-[-3deg] lg:-translate-y-4 lg:hover:-translate-y-6 cursor-pointer"
  >
    <div className="leather-texture" />
    <div className="absolute inset-3 sm:inset-6 border-2 border-black/40 embossed-stamp pointer-events-none rounded-sm z-10" />
    <div className="absolute inset-4 sm:inset-8 border border-black/30 embossed-stamp pointer-events-none rounded-sm z-10" />

    <div className="z-20 flex flex-col items-center text-center px-1 sm:px-4 relative w-full">
      <span className="font-mono-data text-[10px] sm:text-sm lg:text-[18px] font-bold tracking-[0.3em] lg:tracking-[0.4em] text-[#c49d47]/70 mb-2 lg:mb-4 uppercase drop-shadow-md">
        Dossier Vol. I
      </span>
      <h2 className="font-playfair text-[22px] sm:text-4xl md:text-5xl font-black embossed-gold tracking-wider leading-[1.1] mb-2">
        Active<br/>Register
      </h2>
      <div className="w-12 h-[1px] bg-[#c49d47]/30 my-2 sm:my-4 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
      <>
        <p className="hidden sm:block font-garamond text-[#a8a8a8] text-xl lg:text-[28px] italic tracking-wide max-w-[80%] leading-relaxed drop-shadow-md">
          List of your current investigators and campaigns.
        </p>
        <div className="w-full text-left space-y-1 sm:space-y-2 mt-1 sm:mt-3">
          {characters.filter(c => c.status === 'active').length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-emerald-400 text-sm sm:text-xl">●</span>
              <span className="font-garamond text-sm sm:text-2xl italic leading-snug text-[#fdfaf4]/75">
                {characters.filter(c => c.status === 'active').length} Profile{characters.filter(c => c.status === 'active').length !== 1 ? 's' : ''} Recorded
              </span>
            </div>
          )}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-[#c49d47]/70 text-sm sm:text-xl">◌</span>
              <span className="font-garamond text-sm sm:text-2xl italic leading-snug text-[#c49d47]/60">
                {characters.filter(c => c.status === 'pending').length} Awaiting Approval
              </span>
            </div>
          )}
          {gmCampaigns.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-[#c49d47] text-sm sm:text-xl">▶</span>
              <span className="font-garamond text-sm sm:text-2xl italic leading-snug text-[#c49d47]/75">
                {gmCampaigns.length} Investigation{gmCampaigns.length !== 1 ? 's' : ''} Recorded
              </span>
            </div>
          )}
          {characters.length === 0 && gmCampaigns.length === 0 && (
            <span className="font-mono-data text-[11px] sm:text-base font-bold tracking-[0.3em] uppercase text-[#c49d47]/40">
              ○ No Records
            </span>
          )}
        </div>
      </>
    </div>
  </div>
);
