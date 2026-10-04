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
    className={`absolute w-[220px] h-[380px] rotate-[2deg] top-[100px] right-[200px] z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${!showGMBack ? 'hover:-translate-y-4 hover:translate-x-4 hover:rotate-[4deg] cursor-pointer' : 'cursor-default'}`}
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
      {/* FRONT FACE — matches Blank Intake style */}
      <div
        className="absolute inset-0 border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-center text-[#ddd7cf]"
        style={{
          backfaceVisibility: 'hidden',
          backgroundColor: 'rgb(95,114,103)',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E\")",
          boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(60,80,60,0.4)',
        }}
      >
        <div className="w-full text-center border-b border-[#3a3228]/40 pb-2 mb-3">
          <span className="font-mono-data text-base font-bold uppercase tracking-[0.3em] opacity-80">Operations Form</span>
          <div className="font-garamond text-2xl italic tracking-wider opacity-90 mt-1">No. LK-001</div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
          <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
            Lightkeeper
          </h3>
          <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-4 text-[rgb(212,208,202)]">
            Access
          </h3>
          <div className="flex items-center gap-1 my-2 opacity-70">
            <div className="w-6 h-[1px] bg-[#3a3228]" />
            <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
            <div className="w-6 h-[1px] bg-[#3a3228]" />
          </div>
          <p className="font-garamond text-2xl leading-relaxed italic px-2 mt-4 opacity-90 font-medium">
            Take command of your own circle.
          </p>
        </div>

        <div className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center">
          <span className="font-cinzel text-xl font-bold tracking-widest">Light the Way</span>
        </div>
      </div>

      {/* BACK FACE — campaign entry form */}
      <div
        className="absolute inset-0 border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-start text-[#ddd7cf]"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          backgroundColor: 'rgb(95,114,103)',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E\")",
          boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(60,80,60,0.4)',
        }}
      >
        <div className="w-full border-b border-[#3a3228]/40 pb-2 mb-4">
        </div>

        <form onSubmit={handleGMEntry} className="flex-1 flex flex-col gap-4 w-full justify-center">
          <div className="flex flex-col gap-1">
            <label className="font-cinzel text-[18px] font-bold tracking-widest uppercase text-[#ddd7cf]/70">
              Campaign Name
            </label>
            <input
              type="text"
              value={gmCampaignName}
              onChange={e => setGmCampaignName(e.target.value)}
              placeholder="e.g. The Fairelands"
              onClick={e => e.stopPropagation()}
              className="bg-[#4a5e50]/60 border border-[#3a3228]/70 px-2 py-1.5 font-garamond text-2xl text-[#ddd7cf] placeholder-[#ddd7cf]/35 outline-none focus:border-[#c49d47]/50 w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-cinzel text-[18px] font-bold tracking-widest uppercase text-[#ddd7cf]/70">
              Entry Cipher
            </label>
            <input
              type="text"
              value={gmCode}
              onChange={e => setGmCode(e.target.value)}
              placeholder="e.g. fairelands-01"
              onClick={e => e.stopPropagation()}
              className="bg-[#4a5e50]/60 border border-[#3a3228]/70 px-2 py-1.5 font-garamond text-2xl text-[#ddd7cf] placeholder-[#ddd7cf]/35 outline-none focus:border-[#c49d47]/50 w-full"
            />
          </div>
          <button
            type="submit"
            disabled={!gmCode.trim() || isGmCreating}
            onClick={e => e.stopPropagation()}
            className="mt-1 bg-[#3a2810] text-[#c49d47] font-cinzel text-xl font-bold tracking-widest uppercase px-3 py-2 border border-[#c49d47]/30 hover:bg-[#4a3820] hover:border-[#c49d47]/60 transition-colors disabled:opacity-40"
          >
            {isGmCreating ? 'Creating...' : 'Enter Operations'}
          </button>
          {gmEntryError && (
            <p className="font-mono text-xs text-red-400/80 text-center mt-1">{gmEntryError}</p>
          )}
        </form>

        <button
          onClick={e => { e.stopPropagation(); setShowGMBack(false); }}
          className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center font-cinzel text-[18px] font-bold tracking-widest opacity-55 hover:opacity-90 transition-opacity"
        >
          ← Return
        </button>
      </div>
    </div>
  </div>
  );
};
