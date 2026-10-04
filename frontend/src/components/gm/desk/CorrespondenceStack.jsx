import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlayerRosterCard } from '../PlayerRosterCard';

// Join requests, one card at a time with a pager.
export const CorrespondenceStack = ({ campaignRoster, pendingIndex, setPendingIndex, handleStamp, handleReject }) => (
  <>
    <div className="flex items-center gap-3 mb-4">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel text-center">
        Correspondence — Pending Review
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    {(() => {
      const pending = campaignRoster.pending_investigators || [];
      if (pending.length === 0) {
        return (
          <p className="font-serif text-base text-moonlight-steel text-center py-6 italic">
            No pending correspondence.
          </p>
        );
      }
      const current = pending[pendingIndex];
      return (
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {current && (
              <PlayerRosterCard
                key={current.id}
                investigator={current}
                onStamp={() => handleStamp(current.id)}
                onReject={() => handleReject(current.id)}
              />
            )}
          </AnimatePresence>
          {pending.length > 1 && (
            <div className="flex items-center gap-5">
              <button
                onClick={() => setPendingIndex(i => Math.max(0, i - 1))}
                disabled={pendingIndex === 0}
                className="w-10 h-10 flex items-center justify-center font-sans font-black text-xl text-moonlight-steel hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >‹</button>
              <span className="font-mono text-xs tabular-nums text-moonlight-steel">
                {pendingIndex + 1} / {pending.length}
              </span>
              <button
                onClick={() => setPendingIndex(i => Math.min(pending.length - 1, i + 1))}
                disabled={pendingIndex === pending.length - 1}
                className="w-10 h-10 flex items-center justify-center font-sans font-black text-xl text-moonlight-steel hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >›</button>
            </div>
          )}
        </div>
      );
    })()}
  </>
);
