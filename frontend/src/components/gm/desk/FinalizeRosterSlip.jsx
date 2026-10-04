import React from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

export const FinalizeRosterSlip = ({ handleFinalizeRoster, isFinalizingRoster, campaignRoster }) => (
  <button
    onClick={handleFinalizeRoster}
    disabled={isFinalizingRoster}
    className="relative w-full mt-5 transform -rotate-1 hover:rotate-0 transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    <div
      className="w-full px-6 py-4 shadow-[4px_6px_14px_rgba(0,0,0,0.55)]"
      style={{
        clipPath: 'polygon(0% 2%, 99% 0%, 100% 98%, 1% 100%)',
        background: 'linear-gradient(135deg, #f0e6cc 55%, #d4b896 88%, #6b4e3a 100%)',
        borderLeft: '3px solid #8b0000',
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SafeIcon name="GiWaxSeal" size={28} className="text-[#8b0000] opacity-75" />
            <span className="font-serif font-black uppercase tracking-[0.2em] text-sm text-[#2c2420]">
              {isFinalizingRoster ? 'Finalizing…' : 'Finalize Roster'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#7a6a5a] uppercase tracking-widest">
            {campaignRoster.active_investigators?.length || 0} / 5 investigators
          </span>
        </div>
        <p className="font-mono text-sm text-[#5a4a3a] italic leading-snug">
          Warning: Finalizing the roster locks circle details and closes all player formation popups.
        </p>
      </div>
    </div>
  </button>
);
