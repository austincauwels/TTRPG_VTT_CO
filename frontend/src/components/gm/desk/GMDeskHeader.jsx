import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { apiFetch } from '../../../utils/api';

// The title, then the Lightkeeper's Desk bar, which carries Retire and Sign Out in its
// own flow: right-aligned on desktop, full-width rows of their own on phones.
export const GMDeskHeader = ({ activeCampaignId, campaignName, campaignCode, setStage }) => {
  const [retireConfirm, setRetireConfirm] = useState(false);
  const [retireError, setRetireError] = useState('');

  const handleRetireCampaign = async () => {
    if (!activeCampaignId) return;
    setRetireError('');
    try {
      const res = await apiFetch(`/campaign/${activeCampaignId}/retire`, { method: 'POST' });
      if (!res.ok) {
        console.error("Failed to retire campaign");
        setRetireError('The campaign was not retired. Try again in a moment.');
      }
    } catch {
      setRetireError('Could not reach the server, so the campaign was not retired. Check your connection and try again.');
    }
    setRetireConfirm(false);
  };

  return (
    <>
    <header className="w-full bg-gm-night px-4 py-5 lg:py-6 flex flex-col items-center justify-center text-center border-b border-black/60 shadow-xl">
      <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">CANDELA OBSCURA</h1>
      {campaignName && (
        <h2 className="text-xs font-sans font-bold tracking-widest text-moonlight-steel uppercase mt-1.5">{campaignName}</h2>
      )}
      {campaignCode && (
        <p className="font-serif text-base text-parchment-deep mt-1">
          Campaign code <span className="font-mono text-cream">{campaignCode}</span>
          <span className="text-moonlight-steel">: share it with players so they can ask to join.</span>
        </p>
      )}
    </header>

    {/* GM CONTROL BAR */}
    <div className="w-full bg-gm-slate border-b border-moonlight-steel/20 py-3 lg:py-4 shadow-md z-40 flex justify-center">
      <div className="w-full max-w-[1500px] px-4 lg:px-8 lg:pl-[40px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-8">
        <div className="flex items-center gap-3 text-moonlight-steel">
          <SafeIcon name="GiEyeShield" size={45} className="shrink-0 w-8 h-8 lg:w-[45px] lg:h-[45px]" />
          <span className="font-display text-xl lg:text-2xl tracking-[0.08em] uppercase text-cream">
            Lightkeeper's Desk
          </span>
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {retireConfirm ? (
            <>
              <span className="basis-full lg:basis-auto lg:max-w-[22rem] font-serif text-base text-parchment-deep leading-snug">Retire this campaign? Every investigator leaves it and no one can join. Nothing is deleted.</span>
              <button onClick={handleRetireCampaign} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-sans font-bold uppercase tracking-widest text-cream bg-oxblood hover:brightness-125 border border-oxblood-lit/50 rounded px-3 py-2 transition">
                Retire campaign
              </button>
              <button onClick={() => setRetireConfirm(false)} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-sans font-bold uppercase tracking-widest text-moonlight-steel hover:text-cream bg-gm-night/80 border border-moonlight-steel/40 rounded px-3 py-2 transition-colors">
                Keep campaign
              </button>
            </>
          ) : (
            <button
              onClick={() => setRetireConfirm(true)}
              className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-moonlight-steel hover:text-oxblood-lit transition-colors bg-gm-night/80 border border-moonlight-steel/30 hover:border-oxblood-lit/60 rounded px-4 py-2"
            >
              Retire campaign…
            </button>
          )}
          <button
            onClick={() => setStage('HOME')}
            className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-cream hover:bg-gm-night transition-colors bg-gm-night/80 border border-moonlight-steel/60 hover:border-moonlight-steel rounded px-4 py-2"
          >
            Back to chapter hub
          </button>
        </div>
        {retireError && <p role="alert" className="font-serif text-base text-oxblood-lit lg:text-right">{retireError}</p>}
      </div>
    </div>
    </>
  );
};
