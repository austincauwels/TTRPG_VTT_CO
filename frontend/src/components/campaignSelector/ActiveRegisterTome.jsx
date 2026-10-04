import React from 'react';

export const ActiveRegisterTome = ({ characters, gmCampaigns, onOpen }) => (
  <div
    onClick={onOpen}
    className="thick-book group w-full lg:w-[28vw] max-w-[400px] aspect-[1/1.4] bg-register-green p-3 sm:p-6 shadow-[15px_25px_40px_rgba(0,0,0,0.95),inset_8px_0_20px_rgba(0,0,0,0.9),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[-2deg] lg:rotate-[-3deg] lg:-translate-y-4 lg:hover:-translate-y-6 cursor-pointer"
  >
    <div className="leather-texture" />
    <div className="absolute inset-3 sm:inset-6 border-2 border-black/40 embossed-stamp pointer-events-none rounded-sm z-10" />
    <div className="absolute inset-4 sm:inset-8 border border-black/30 embossed-stamp pointer-events-none rounded-sm z-10" />

    <div className="z-20 flex flex-col items-center text-center px-1 sm:px-4 relative w-full">
      <span className="font-display text-xs sm:text-sm lg:text-lg tracking-[0.18em] text-gold-leaf/80 mb-2 lg:mb-4 uppercase drop-shadow-md">
        Dossier Vol. I
      </span>
      <h2 className="font-display text-[26px] sm:text-4xl md:text-5xl embossed-gold tracking-wide leading-[1.05] mb-2">
        Active<br/>Register
      </h2>
      <div className="w-12 h-[1px] bg-gold-leaf/30 my-2 sm:my-4 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
      <>
        <p className="hidden sm:block font-serif text-parchment-deep/75 text-lg lg:text-2xl italic max-w-[80%] leading-snug drop-shadow-md">
          Your investigators and campaigns. Open to play or join.
        </p>
        <div className="w-full text-left space-y-1 sm:space-y-2 mt-1 sm:mt-3">
          {characters.filter(c => c.status === 'active').length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-seal-green-lit text-sm sm:text-lg">●</span>
              <span className="font-serif text-sm sm:text-xl italic leading-snug text-cream/80">
                {characters.filter(c => c.status === 'active').length} in play
              </span>
            </div>
          )}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-gold-leaf/80 text-sm sm:text-lg">◌</span>
              <span className="font-serif text-sm sm:text-xl italic leading-snug text-gold-leaf/90">
                {characters.filter(c => c.status === 'pending').length} waiting for approval
              </span>
            </div>
          )}
          {gmCampaigns.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">
              <span className="text-gold-leaf text-sm sm:text-lg">▶</span>
              <span className="font-serif text-sm sm:text-xl italic leading-snug text-gold-leaf">
                {gmCampaigns.length} campaign{gmCampaigns.length !== 1 ? 's' : ''} you run
              </span>
            </div>
          )}
          {characters.length === 0 && gmCampaigns.length === 0 && (
            <span className="font-display text-xs sm:text-base tracking-[0.15em] uppercase text-gold-leaf/75">
              Nothing yet
            </span>
          )}
        </div>
      </>
    </div>
  </div>
);
