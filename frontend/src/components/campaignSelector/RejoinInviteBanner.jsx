import React from 'react';

export const RejoinInviteBanner = ({ rejoinInvite, setStage, setRejoinInvite }) => {
  if (!rejoinInvite) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-wrap items-center gap-x-4 gap-y-2 bg-night border border-oxblood px-4 py-3 sm:px-6 sm:py-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-w-xl w-[calc(100%-2rem)]">
      <div className="flex-1 min-w-[12rem]">
        <p className="font-sans font-bold text-xs text-oxblood-lit uppercase tracking-widest mb-0.5">Lightkeeper Invitation</p>
        <p className="text-parchment-deep font-serif text-base leading-snug truncate">
          You have been invited to rejoin <strong className="text-cream">{rejoinInvite.campaign_name}</strong>
        </p>
      </div>
      <button
        onClick={() => setStage('CHARACTER_CREATION')}
        className="shrink-0 px-4 py-2 bg-oxblood hover:brightness-125 text-cream font-sans font-black uppercase tracking-widest text-xs border border-ink rounded transition"
      >
        Commission Investigator
      </button>
      <button
        onClick={() => setRejoinInvite(null)}
        className="shrink-0 text-oxblood-lit hover:text-parchment-deep font-sans text-lg leading-none transition-colors"
        aria-label="Dismiss invite"
      >
        ✕
      </button>
    </div>
  );
};
