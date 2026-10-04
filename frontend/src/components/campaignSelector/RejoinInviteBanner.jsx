import React from 'react';

export const RejoinInviteBanner = ({ rejoinInvite, setStage, setRejoinInvite }) => {
  if (!rejoinInvite) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-4 bg-[#1a0505] border border-[#8b1a1a] px-6 py-4 shadow-[0_4px_30px_rgba(139,26,26,0.5)] max-w-xl w-[calc(100%-2rem)]">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-[#8b4a4a] uppercase tracking-[0.2em] mb-0.5">Lightkeeper Invitation</p>
        <p className="text-[#c9b89a] font-serif text-base leading-snug truncate">
          You have been invited to rejoin <strong className="text-white">{rejoinInvite.campaign_name}</strong>
        </p>
      </div>
      <button
        onClick={() => setStage('CHARACTER_CREATION')}
        className="shrink-0 px-4 py-2 bg-[#8b1a1a] hover:bg-[#a82222] text-white font-sans font-black uppercase tracking-[0.15em] text-xs border border-[#5c0f0f] transition-colors"
      >
        Commission Investigator
      </button>
      <button
        onClick={() => setRejoinInvite(null)}
        className="shrink-0 text-[#8b1a1a] hover:text-[#c9b89a] font-mono text-lg leading-none transition-colors"
        aria-label="Dismiss invite"
      >
        ✕
      </button>
    </div>
  );
};
