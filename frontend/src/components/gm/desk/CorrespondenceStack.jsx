import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlayerRosterCard } from '../PlayerRosterCard';

// Join requests, one card at a time with a pager.
export const CorrespondenceStack = ({ campaignRoster, pendingIndex, setPendingIndex, handleStamp, handleReject, campaignCode, error, busy = false }) => (
  <>
    <div className="flex items-center gap-3 mb-4">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel text-center">
        Join Requests
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    {(() => {
      const pending = campaignRoster.pending_investigators || [];
      if (pending.length === 0) {
        return (
          <p className="font-serif text-base text-moonlight-steel text-center py-6 italic">
            No one is waiting to join.{campaignCode ? <> Share the campaign code <span className="font-mono not-italic text-cream">{campaignCode}</span> with your players; their requests appear here.</> : ' Requests appear here when players ask to join.'}
          </p>
        );
      }
      const current = pending[pendingIndex];
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="font-serif text-base text-parchment-deep text-center leading-snug">
            Approve to bring this investigator into the circle. Reject sends them back to the player, out of the campaign.
          </p>
          <AnimatePresence mode="wait">
            {current && (
              <PlayerRosterCard
                key={current.id}
                investigator={current}
                onStamp={() => handleStamp(current.id)}
                onReject={() => handleReject(current.id)}
                busy={busy}
              />
            )}
          </AnimatePresence>
          {pending.length > 1 && (
            <div className="flex items-center gap-5">
              <button
                onClick={() => setPendingIndex(i => Math.max(0, i - 1))}
                disabled={pendingIndex === 0}
                aria-label="Previous request"
                className="w-10 h-10 flex items-center justify-center font-sans font-black text-xl text-moonlight-steel hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >‹</button>
              <span className="font-mono text-xs tabular-nums text-moonlight-steel">
                {pendingIndex + 1} of {pending.length}
              </span>
              <button
                onClick={() => setPendingIndex(i => Math.min(pending.length - 1, i + 1))}
                disabled={pendingIndex === pending.length - 1}
                aria-label="Next request"
                className="w-10 h-10 flex items-center justify-center font-sans font-black text-xl text-moonlight-steel hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >›</button>
            </div>
          )}
        </div>
      );
    })()}
    {error && <p role="alert" className="font-serif text-base text-oxblood-lit text-center mt-3">{error}</p>}
  </>
);
