import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlayerRosterCard } from '../PlayerRosterCard';

// Join requests, one card at a time with a pager.
export const CorrespondenceStack = ({ campaignRoster, pendingIndex, setPendingIndex, handleStamp, handleReject }) => (
  <>
    <div className="flex items-center gap-3 mb-4">
      <div className="h-[1px] flex-1 bg-[#1e3a5f]/60" />
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#93c5fd]/70">
        Correspondence — Pending Review
      </h3>
      <div className="h-[1px] flex-1 bg-[#1e3a5f]/60" />
    </div>
    {(() => {
      const pending = campaignRoster.pending_investigators || [];
      if (pending.length === 0) {
        return (
          <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest text-center py-6 italic">
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
                className="w-8 h-8 flex items-center justify-center font-mono font-black text-lg text-amber-600/70 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >‹</button>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                {pendingIndex + 1} / {pending.length}
              </span>
              <button
                onClick={() => setPendingIndex(i => Math.min(pending.length - 1, i + 1))}
                disabled={pendingIndex === pending.length - 1}
                className="w-8 h-8 flex items-center justify-center font-mono font-black text-lg text-amber-600/70 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >›</button>
            </div>
          )}
        </div>
      );
    })()}
  </>
);
