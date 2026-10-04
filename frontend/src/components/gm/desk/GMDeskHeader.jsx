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
    <header className="w-full bg-[#0f172a] px-4 py-5 lg:py-6 flex flex-col items-center justify-center text-center border-b border-black/60 shadow-xl">
      <h1 className="text-[26px] sm:text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
      <h2 className="text-[11px] font-sans font-black tracking-[0.25em] sm:tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
    </header>

    {/* GM CONTROL BAR */}
    <div className="w-full bg-[#1e293b] border-b border-slate-700 py-3 lg:py-4 shadow-md z-40 flex justify-center">
      <div className="w-full max-w-[1500px] px-4 lg:px-8 lg:pl-[40px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-8">
        <div className="flex items-center gap-3 text-[#3b82f6]">
          <SafeIcon name="GiEyeShield" size={45} className="shrink-0 w-8 h-8 lg:w-[45px] lg:h-[45px]" />
          <span className="font-serif text-lg lg:text-xl font-bold tracking-[0.2em] uppercase text-slate-100">
            Lightkeeper's Desk
          </span>
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {retireConfirm ? (
            <>
              <span className="basis-full lg:basis-auto text-xs text-slate-400 uppercase tracking-widest">Confirm retire?</span>
              <button onClick={handleRetireCampaign} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-bold uppercase tracking-[0.2em] text-white bg-red-900 hover:bg-red-700 border border-red-700 px-3 py-2">
                Yes, Retire
              </button>
              <button onClick={() => setRetireConfirm(false)} className="flex-1 lg:flex-none min-h-[44px] lg:min-h-0 text-sm font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white bg-[#0f172a]/80 border border-slate-600 px-3 py-2">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setRetireConfirm(true)}
              className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a]/80 border border-slate-700/50 hover:border-red-800/50 px-4 py-2"
            >
              [ Retire Campaign ]
            </button>
          )}
          <button
            onClick={() => setStage('HOME')}
            className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-bold uppercase tracking-[0.2em] text-[#3b82f6] hover:text-white transition-colors bg-[#0f172a]/80 hover:bg-[#0f172a] border border-[#3b82f6]/50 hover:border-[#3b82f6] px-4 py-2"
          >
            [ Sign Out of Campaign ]
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
