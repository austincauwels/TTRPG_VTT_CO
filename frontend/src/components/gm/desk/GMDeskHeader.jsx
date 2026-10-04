import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { apiFetch } from '../../../utils/api';

// Retire and Sign Out, the title and the Lightkeeper's Desk bar.
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
    {/* HEADER CONTROLS */}
    <div className="absolute top-4 right-6 z-50 flex gap-2 items-center">
      {retireConfirm ? (
        <>
          <span className="text-xs text-slate-400 uppercase tracking-widest">Confirm retire?</span>
          <button onClick={handleRetireCampaign} className="text-sm font-bold uppercase tracking-[0.2em] text-white bg-red-900 hover:bg-red-700 border border-red-700 px-3 py-2">
            Yes, Retire
          </button>
          <button onClick={() => setRetireConfirm(false)} className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white bg-[#0f172a]/80 border border-slate-600 px-3 py-2">
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setRetireConfirm(true)}
          className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a]/80 border border-slate-700/50 hover:border-red-800/50 px-4 py-2"
        >
          [ Retire Campaign ]
        </button>
      )}
      <button
        onClick={() => setStage('HOME')}
        className="text-sm font-bold uppercase tracking-[0.2em] text-[#3b82f6] hover:text-white transition-colors bg-[#0f172a]/80 hover:bg-[#0f172a] border border-[#3b82f6]/50 hover:border-[#3b82f6] px-4 py-2"
      >
        [ Sign Out of Campaign ]
      </button>
    </div>
    
    {/* ORIGINAL HEADER */}
    <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
      <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
      <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
    </header>

    {/* GM CONTROL BAR */}
    <div className="w-full bg-[#1e293b] border-b border-slate-700 py-4 shadow-md z-40 flex justify-center">
      <div className="w-full max-w-[1500px] px-8 flex items-center pl-[40px] gap-8">
        <div className="flex items-center gap-3 text-[#3b82f6]">
          <SafeIcon name="GiEyeShield" size={45} />
          <span className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-slate-100">
            Lightkeeper's Desk
          </span>
        </div>
      </div>
    </div>
    </>
  );
};
