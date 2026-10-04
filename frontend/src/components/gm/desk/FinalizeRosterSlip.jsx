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
        background: 'linear-gradient(135deg, rgb(var(--c-parchment)) 55%, rgb(var(--c-parchment-deep)) 88%, rgb(var(--c-sepia)) 100%)',
        borderLeft: '3px solid rgb(var(--c-oxblood))',
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SafeIcon name="GiWaxSeal" size={28} className="text-oxblood" />
            <span className="font-serif font-bold uppercase tracking-[0.12em] text-base text-ink">
              {isFinalizingRoster ? 'Finalizing…' : 'Finalize Roster'}
            </span>
          </div>
          <span className="font-mono text-xs tabular-nums text-sepia">
            {campaignRoster.active_investigators?.length || 0} / 5 investigators
          </span>
        </div>
        <p className="font-serif text-base text-sepia italic leading-snug text-left">
          Warning: Finalizing the roster locks circle details and closes all player formation popups.
        </p>
      </div>
    </div>
  </button>
);
