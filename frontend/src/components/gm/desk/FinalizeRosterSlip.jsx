import React from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { ConfirmAction } from '../../shared/ConfirmAction';

// Finalizing cannot be undone, so it takes two presses (the shared confirm pattern) and
// stays disabled until at least one investigator is in the circle.
export const FinalizeRosterSlip = ({ handleFinalizeRoster, isFinalizingRoster, campaignRoster, error }) => {
  const activeCount = campaignRoster.active_investigators?.length || 0;
  const noOneYet = activeCount === 0;

  return (
    <>
    <ConfirmAction
      className="mt-5 flex flex-col gap-2"
      tone="night"
      disabled={isFinalizingRoster || noOneYet}
      onConfirm={handleFinalizeRoster}
      cancelLabel="Not yet"
      armedHint={`Press again to finalize with ${activeCount} of 5 investigators. This cannot be undone.`}
      renderButton={(armed, props) => (
        <button
          {...props}
          className="relative w-full transform -rotate-1 hover:rotate-0 transition-all duration-300 active:scale-95 disabled:hover:-rotate-1 disabled:active:scale-100 disabled:cursor-not-allowed"
        >
          <div
            className={`w-full px-6 py-4 shadow-[4px_6px_14px_rgba(0,0,0,0.55)] ${noOneYet ? 'opacity-70' : ''}`}
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
                  <span className={`font-serif font-bold uppercase tracking-[0.12em] text-base ${armed ? 'text-oxblood' : 'text-ink'}`}>
                    {isFinalizingRoster ? 'Finalizing…' : armed ? 'Yes, finalize the circle' : 'Finalize the circle'}
                  </span>
                </div>
                <span className="font-mono text-xs tabular-nums text-sepia">
                  {activeCount} of 5 investigators
                </span>
              </div>
              <p className="font-serif text-base text-sepia italic leading-snug text-left">
                {noOneYet
                  ? 'Approve at least one investigator before you finalize the circle.'
                  : "Locks the circle's name, question, ability and insignia, and closes every player's formation papers. Do this when the players have finished them."}
              </p>
            </div>
          </div>
        </button>
      )}
    />
    {error && <p role="alert" className="font-serif text-base text-oxblood-lit mt-2">{error}</p>}
    </>
  );
};
