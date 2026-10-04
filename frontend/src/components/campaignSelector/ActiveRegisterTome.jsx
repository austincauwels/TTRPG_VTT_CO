import React from 'react';

export const ActiveRegisterTome = ({ characters, gmCampaigns, onOpen }) => (
  <div
    onClick={onOpen}
    className="thick-book group w-[28vw] max-w-[400px] aspect-[1/1.4] bg-[#0b1f12] p-6 shadow-[15px_25px_40px_rgba(0,0,0,0.95),inset_8px_0_20px_rgba(0,0,0,0.9),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[-3deg] -translate-y-4 hover:-translate-y-6 cursor-pointer"
  >
    <div className="leather-texture" />
    <div className="absolute inset-6 border-2 border-black/40 embossed-stamp pointer-events-none rounded-sm z-10" />
    <div className="absolute inset-8 border border-black/30 embossed-stamp pointer-events-none rounded-sm z-10" />

    <div className="z-20 flex flex-col items-center text-center px-4 relative w-full">
      <span className="font-mono-data text-[18px] font-bold tracking-[0.4em] text-[#c49d47]/70 mb-4 uppercase drop-shadow-md">
        Dossier Vol. I
      </span>
      <h2 className="font-playfair text-4xl md:text-5xl font-black embossed-gold tracking-wider leading-[1.1] mb-2">
        Active<br/>Register
      </h2>
      <div className="w-12 h-[1px] bg-[#c49d47]/30 my-4 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
      <>
        <p className="font-garamond text-[#a8a8a8] text-[28px] italic tracking-wide max-w-[80%] leading-relaxed drop-shadow-md">
          List of your current investigators and campaigns.
        </p>
        <div className="w-full text-left space-y-2 mt-3">
          {characters.filter(c => c.status === 'active').length > 0 && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-emerald-400 text-xl">●</span>
              <span className="font-garamond text-2xl italic text-[#fdfaf4]/75">
                {characters.filter(c => c.status === 'active').length} Profile{characters.filter(c => c.status === 'active').length !== 1 ? 's' : ''} Recorded
              </span>
            </div>
          )}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-[#c49d47]/70 text-xl">◌</span>
              <span className="font-garamond text-2xl italic text-[#c49d47]/60">
                {characters.filter(c => c.status === 'pending').length} Awaiting Approval
              </span>
            </div>
          )}
          {gmCampaigns.length > 0 && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-[#c49d47] text-xl">▶</span>
              <span className="font-garamond text-2xl italic text-[#c49d47]/75">
                {gmCampaigns.length} Investigation{gmCampaigns.length !== 1 ? 's' : ''} Recorded
              </span>
            </div>
          )}
          {characters.length === 0 && gmCampaigns.length === 0 && (
            <span className="font-mono-data text-base font-bold tracking-[0.3em] uppercase text-[#c49d47]/40">
              ○ No Records
            </span>
          )}
        </div>
      </>
    </div>
  </div>
);
