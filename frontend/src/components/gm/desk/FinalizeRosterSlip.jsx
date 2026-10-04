import React from 'react';
import { ConfirmAction } from '../../shared/ConfirmAction';
import { WaxSeal } from '../../shared/WaxSeal';
import { FormLine } from '../../shared/PrintMarks';

const SLIP_PAPER = {
  clipPath: 'polygon(0% 2%, 99% 0%, 100% 98%, 1% 100%)',
  background: 'linear-gradient(135deg, rgb(var(--c-parchment)) 55%, rgb(var(--c-parchment-deep)) 88%, rgb(var(--c-sepia)) 100%)',
};

// The slip is torn by its clip-path, so its shadow is a drop-shadow on the button, which
// follows the torn edge (a box-shadow would be clipped away).
// Finalizing cannot be undone, so it takes two presses (the shared confirm pattern) and
// stays disabled until at least one investigator is in the circle. While it goes to the
// server, the Lightkeeper's seal is pressed onto the slip.
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
      armedHint={`Press again to finalize with ${activeCount} of 5 investigators. Every player's formation papers close, and this cannot be undone.`}
      renderButton={(armed, props) => (
        <button
          {...props}
          className="relative w-full transform -rotate-1 hover:rotate-0 transition-all duration-300 active:scale-95 disabled:hover:-rotate-1 disabled:active:scale-100 disabled:cursor-not-allowed drop-shadow-[4px_6px_7px_rgba(0,0,0,0.55)]"
        >
          <div
            className={`w-full px-6 py-4 ${noOneYet ? 'opacity-70' : ''}`}
            style={SLIP_PAPER}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <WaxSeal size={32} />
                  <span className={`font-serif font-bold uppercase tracking-[0.12em] text-base ${armed ? 'text-oxblood' : 'text-ink'}`}>
                    {isFinalizingRoster ? 'Finalizing…' : armed ? 'Yes, finalize the circle' : 'Finalize the circle'}
                  </span>
                </div>
                <span className="font-mono text-xs tabular-nums text-sepia">
                  {activeCount} of 5 investigators
                </span>
              </div>
              <FormLine className="text-left">Form C.O. 3 · Circle charter</FormLine>
            </div>
          </div>
          {/* The seal comes down on the slip while the circle is finalized */}
          {isFinalizingRoster && (
            <span aria-hidden="true" className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
              <WaxSeal size={72} pressed />
            </span>
          )}
        </button>
      )}
    />
    {error && <p role="alert" className="font-serif text-base text-oxblood-lit mt-2">{error}</p>}
    </>
  );
};

// Once the circle is finalized, a sealed slip says so where the Finalize slip was. The seal
// is pressed in when it happens at this desk (pressed), and simply there afterwards.
export const FinalizedSlip = ({ pressed = false, className = '' }) => (
  <div className={`hand-placed ${className}`} style={{ '--tilt': '0.8deg', filter: 'drop-shadow(4px 6px 7px rgba(0,0,0,0.55))' }}>
    <div className="w-full px-5 py-3 flex items-center gap-4" style={SLIP_PAPER}>
      <WaxSeal size={44} pressed={pressed} />
      <div className="min-w-0">
        <p className="font-serif font-bold uppercase tracking-[0.12em] text-base text-ink">The circle is finalized</p>
        <FormLine className="block mt-1">Form C.O. 3 · Circle charter · Sealed</FormLine>
      </div>
    </div>
  </div>
);
