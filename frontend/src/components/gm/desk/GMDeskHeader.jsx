import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { apiFetch } from '../../../utils/api';

// The title, then the Lightkeeper's Desk bar, which carries Retire and Sign Out in its
// own flow: right-aligned on desktop, full-width rows of their own on phones.
export const GMDeskHeader = ({ activeCampaignId, setStage }) => {
  const [retireConfirm, setRetireConfirm] = useState(false);

  const handleRetireCampaign = async () => {
    if (!activeCampaignId) return;
    const res = await apiFetch(`/campaign/${activeCampaignId}/retire`, { method: 'POST' });
    if (!res.ok) console.error("Failed to retire campaign");
    setRetireConfirm(false);
  };

  return (
    <>
    <header className="w-full bg-gm-night px-4 py-5 lg:py-6 flex flex-col items-center justify-center text-center border-b border-black/60 shadow-xl">
      <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">CANDELA OBSCURA</h1>
      <h2 className="text-xs font-sans font-bold tracking-widest text-moonlight-steel uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
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
              <span className="basis-full lg:basis-auto text-xs font-sans font-bold text-moonlight-steel uppercase tracking-widest">Confirm retire?</span>
              <button onClick={handleRetireCampaign} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-sans font-bold uppercase tracking-widest text-cream bg-oxblood hover:brightness-125 border border-oxblood-lit/50 rounded px-3 py-2 transition">
                Yes, Retire
              </button>
              <button onClick={() => setRetireConfirm(false)} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-sans font-bold uppercase tracking-widest text-moonlight-steel hover:text-cream bg-gm-night/80 border border-moonlight-steel/40 rounded px-3 py-2 transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setRetireConfirm(true)}
              className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-moonlight-steel hover:text-oxblood-lit transition-colors bg-gm-night/80 border border-moonlight-steel/30 hover:border-oxblood-lit/60 rounded px-4 py-2"
            >
              [ Retire Campaign ]
            </button>
          )}
          <button
            onClick={() => setStage('HOME')}
            className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-cream hover:bg-gm-night transition-colors bg-gm-night/80 border border-moonlight-steel/60 hover:border-moonlight-steel rounded px-4 py-2"
          >
            [ Sign Out of Campaign ]
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
