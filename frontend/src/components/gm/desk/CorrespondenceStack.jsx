import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlayerRosterCard } from '../PlayerRosterCard';
import { InvitePlayer } from './InvitePlayer';

// Whether the player who sent this request already has a living investigator in the
// campaign ('active') or another request waiting ('pending'), as the card says
export const samePlayerOf = (campaignRoster, request) => !request?.owner_username ? ''
  : (campaignRoster.active_investigators || []).some(c => c.owner_username === request.owner_username && !c.is_dead) ? 'active'
  : (campaignRoster.pending_investigators || []).some(c => c.id !== request.id && c.owner_username === request.owner_username) ? 'pending' : '';

// Join requests, one card at a time with a pager, and under them the quiet Invite player
// for a player the Lightkeeper brings back (InvitePlayer.jsx). They lie on the desk's
// Requests page (issue #66.1); one that comes in while the Lightkeeper is elsewhere pops up
// (JoinRequestPopup.jsx).
export const CorrespondenceStack = ({ campaignRoster, pendingIndex, setPendingIndex, handleStamp, handleReject, onView, campaignCode, error, busy = false, invite = true }) => (
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
            No one waiting to join
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
                onView={onView ? () => onView(current) : undefined}
                busy={busy}
                samePlayer={samePlayerOf(campaignRoster, current)}
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
    {invite && <InvitePlayer className="mt-3" />}
  </>
);
