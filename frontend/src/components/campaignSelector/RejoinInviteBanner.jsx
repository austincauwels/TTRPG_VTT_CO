import React from 'react';

// Names of the player's living investigators in a campaign, whom coming back with a new
// one retires (a dead one is already gone from play). current is the sheet a desk holds:
// it may know of a death the list does not, and it counts when the list lacks it.
export const retiredByRejoin = (characters, campaignId, current = null) => {
  const list = (characters || []).map(c => (current && c.id === current.id ? { ...c, is_dead: c.is_dead || current.is_dead } : c));
  if (current?.id != null && !list.some(c => c.id === current.id)) list.push(current);
  return list.filter(c => c.status === 'active' && !c.is_dead && c.campaign_id === campaignId).map(c => c.name);
};

// The banner's words: the invite, and whom accepting it retires
export const inviteWords = (rejoinInvite, retires) => (
  <>
    Your Lightkeeper invites you back to <strong className="text-cream">{rejoinInvite.campaign_name}</strong> with a new investigator.
    {retires.length > 0 && ` ${retires.join(' and ')} will be retired.`}
  </>
);

export const RejoinInviteBanner = ({ rejoinInvite, characters = [], setStage, setRejoinInvite }) => {
  if (!rejoinInvite) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-wrap items-center gap-x-4 gap-y-2 bg-night border border-oxblood px-4 py-3 sm:px-6 sm:py-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-w-xl w-[calc(100%-2rem)]">
      <div className="flex-1 min-w-[12rem]">
        <p className="text-parchment-deep font-serif text-base leading-snug">
          {inviteWords(rejoinInvite, retiredByRejoin(characters, rejoinInvite.campaign_id))}
        </p>
      </div>
      <button
        onClick={() => setStage('CHARACTER_CREATION')}
        className="shrink-0 px-4 py-2 [@media(pointer:coarse)]:min-h-[44px] bg-oxblood hover:brightness-125 text-cream font-sans font-black uppercase tracking-widest text-xs border border-ink rounded transition"
      >
        Create investigator
      </button>
      <button
        onClick={() => setRejoinInvite(null)}
        className="shrink-0 min-w-[40px] min-h-[40px] [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] text-oxblood-lit hover:text-parchment-deep font-sans text-lg leading-none transition-colors"
        aria-label="Dismiss invite"
      >
        ✕
      </button>
    </div>
  );
};
