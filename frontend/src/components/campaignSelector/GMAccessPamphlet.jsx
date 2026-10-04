import React, { useState } from 'react';
import { createCampaign } from '../../api/campaigns';

// The flip card and its campaign form. The two faces must stay direct children of the
// rotating preserve-3d element.
export const GMAccessPamphlet = ({ accessSession, fetchUserData, enterAsGM }) => {
  const [showGMBack, setShowGMBack] = useState(false);
  const [gmCampaignName, setGmCampaignName] = useState('');
  const [gmCode, setGmCode] = useState('');
  const [gmEntryError, setGmEntryError] = useState('');
  const [isGmCreating, setIsGmCreating] = useState(false);

  const handleGMEntry = async (e) => {
    e.preventDefault();
    if (!gmCode.trim()) return;
    setGmEntryError('');
    setIsGmCreating(true);
    try {
      const res = await createCampaign((gmCampaignName || gmCode).trim(), gmCode.trim(), accessSession?.userId);
      if (res.ok) {
        const camp = await res.json();
        await fetchUserData(accessSession?.userId);
        enterAsGM({ campaign_code: camp.campaign_code, name: camp.name, id: camp.id });
      } else {
        const err = await res.json().catch(() => ({}));
        setGmEntryError(err.detail || 'Failed to create campaign.');
      }
    } catch {
      setGmEntryError('Network error — try again.');
    } finally {
      setIsGmCreating(false);
    }
  };

  return (
  <div
    className={`relative lg:absolute w-full lg:w-[220px] h-[300px] sm:h-[380px] rotate-[2deg] lg:top-[100px] lg:right-[120px] z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${!showGMBack ? 'lg:hover:-translate-y-4 lg:hover:translate-x-4 lg:hover:rotate-[4deg] cursor-pointer' : 'cursor-default'}`}
    style={{ perspective: '1200px' }}
    onClick={!showGMBack ? () => setShowGMBack(true) : undefined}
  >
    <div
      className="w-full h-full"
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
        transform: showGMBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* FRONT FACE: the twin of the Blank Intake pamphlet, on the same parchment card */}
      <div
        className="absolute inset-0 border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-center text-ink"
        style={{
          backfaceVisibility: 'hidden',
          backgroundColor: 'rgb(var(--c-parchment))',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")",
          boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgb(var(--c-sepia) / 0.3)',
        }}
      >
        <div className="w-full text-center border-b border-sepia/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
          <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia">Operations Form</span>
          <div className="font-serif text-base sm:text-xl italic text-sepia sm:mt-1">No. LK-001</div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
          <h3 className="font-display text-xl sm:text-3xl uppercase tracking-[0.08em] leading-none mb-1 text-oxblood">
            Lightkeeper
          </h3>
          <h3 className="font-display text-xl sm:text-3xl uppercase tracking-[0.08em] leading-none mb-2 sm:mb-4 text-oxblood">
            Access
          </h3>
          <div className="flex items-center gap-1 my-2 opacity-70">
            <div className="w-6 h-[1px] bg-sepia" />
            <div className="w-1.5 h-1.5 rounded-full border border-sepia" />
            <div className="w-6 h-[1px] bg-sepia" />
          </div>
          <p className="font-serif text-lg sm:text-2xl leading-snug italic px-1 sm:px-2 mt-2 sm:mt-4">
            Take command of your own circle.
          </p>
        </div>

        <div className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
          <span className="font-display text-base sm:text-xl uppercase tracking-[0.1em] text-oxblood">Light the Way</span>
        </div>
      </div>

      {/* BACK FACE — campaign entry form */}
      <div
        className="absolute inset-0 border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-start text-ink"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          backgroundColor: 'rgb(var(--c-parchment))',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")",
          boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgb(var(--c-sepia) / 0.3)',
        }}
      >
        <div className="w-full border-b border-sepia/40 pb-1 sm:pb-2 mb-2 sm:mb-4">
        </div>

        <form onSubmit={handleGMEntry} className="flex-1 flex flex-col gap-2 sm:gap-4 w-full justify-center">
          <div className="flex flex-col gap-1">
            <label className="font-sans font-bold text-xs sm:text-sm tracking-widest uppercase text-sepia">
              Campaign Name
            </label>
            <input
              type="text"
              value={gmCampaignName}
              onChange={e => setGmCampaignName(e.target.value)}
              placeholder="e.g. The Fairelands"
              onClick={e => e.stopPropagation()}
              className="bg-cream/60 border border-sepia/40 px-1.5 sm:px-2 py-1 sm:py-1.5 font-serif text-base sm:text-xl text-ink placeholder-sepia/60 outline-none focus:border-oxblood w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-sans font-bold text-xs sm:text-sm tracking-widest uppercase text-sepia">
              Entry Cipher
            </label>
            <input
              type="text"
              value={gmCode}
              onChange={e => setGmCode(e.target.value)}
              placeholder="e.g. fairelands-01"
              onClick={e => e.stopPropagation()}
              className="bg-cream/60 border border-sepia/40 px-1.5 sm:px-2 py-1 sm:py-1.5 font-serif text-base sm:text-xl text-ink placeholder-sepia/60 outline-none focus:border-oxblood w-full"
            />
          </div>
          <button
            type="submit"
            disabled={!gmCode.trim() || isGmCreating}
            onClick={e => e.stopPropagation()}
            className="mt-1 bg-oxblood text-cream font-sans font-black text-xs sm:text-sm tracking-widest uppercase px-2 sm:px-3 py-2 leading-tight border border-ink rounded hover:brightness-125 transition disabled:opacity-40"
          >
            {isGmCreating ? 'Creating...' : 'Enter Operations'}
          </button>
          {gmEntryError && (
            <p className="font-serif text-sm text-oxblood text-center mt-1">{gmEntryError}</p>
          )}
        </form>

        <button
          onClick={e => { e.stopPropagation(); setShowGMBack(false); }}
          className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia hover:text-oxblood transition-colors"
        >
          ← Return
        </button>
      </div>
    </div>
  </div>
  );
};
