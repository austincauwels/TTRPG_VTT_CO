import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';

// Says when the desk is not connected to the table, so a roll or a mark that cannot be
// sent is never a silent no-op. A dropped connection reconnects by itself; a desk that
// another tab or device took over waits for the player to choose this one again.
export const ConnectionBanner = () => {
  const { connectionState, reconnect, setStage } = useGameStore(useShallow(s => ({
    connectionState: s.connectionState,
    reconnect: s.reconnect,
    setStage: s.setStage,
  })));

  const message = {
    // A roll made now waits a few seconds for the connection, then the tray says it was
    // not thrown; marks are not sent until the desk is back
    reconnecting: 'The connection to the table dropped. Reconnecting…',
    replaced: 'This desk is open in another tab or on another device, so this one stopped updating.',
    refused: 'The server would not open this desk.',
  }[connectionState];
  if (!message) return null;

  return (
    <div role="status" className="sticky top-0 z-[850] w-full bg-ink border-b border-oxblood-lit/60 shadow-[0_6px_16px_rgba(0,0,0,0.6)]">
      <div className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="font-serif text-base text-parchment-deep leading-snug min-w-0 flex-1 basis-60">{message}</p>
        {connectionState === 'refused' ? (
          <button
            onClick={() => setStage('HOME')}
            className="shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded hover:brightness-125 transition"
          >
            Back to chapter hub
          </button>
        ) : (
          <button
            onClick={reconnect}
            className="shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded hover:brightness-125 transition"
          >
            {connectionState === 'replaced' ? 'Use this tab' : 'Reconnect now'}
          </button>
        )}
      </div>
    </div>
  );
};
