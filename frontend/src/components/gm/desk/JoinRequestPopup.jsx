import React, { useCallback, useEffect, useState } from 'react';
import { PlayerRosterCard } from '../PlayerRosterCard';
import { samePlayerOf } from './CorrespondenceStack';

// Join requests the Lightkeeper has already been shown, kept in this browser per campaign,
// so a request pops up once and not again on a reload. The newest few hundred are enough.
const seenKey = (campaignId) => `candela-requests-seen-${campaignId}`;
const SEEN_MAX = 300;
const readSeen = (campaignId) => {
  try { return new Set(JSON.parse(localStorage.getItem(seenKey(campaignId)) || '[]')); } catch { return new Set(); }
};
const keepSeen = (campaignId, seen) => {
  try { localStorage.setItem(seenKey(campaignId), JSON.stringify([...seen].slice(-SEEN_MAX))); } catch { /* a private window: this visit only */ }
};

// The requests not shown yet, and markSeen(ids). Every waiting request counts as shown while
// the Requests page is in front of the Lightkeeper (inView).
export const useNewRequests = (campaignId, pending, inView) => {
  const [seen, setSeen] = useState(() => readSeen(campaignId));
  useEffect(() => {
    setSeen(readSeen(campaignId));
    // Later or an answer in another tab of this browser puts the pop-up away here too
    const onStorage = (e) => { if (e.key === seenKey(campaignId)) setSeen(readSeen(campaignId)); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [campaignId]);
  const markSeen = useCallback((ids) => setSeen((before) => {
    if (ids.every((id) => before.has(id))) return before;
    const next = new Set(before);
    ids.forEach((id) => next.add(id));
    keepSeen(campaignId, next);
    return next;
  }), [campaignId]);
  useEffect(() => {
    if (inView && pending.length) markSeen(pending.map((p) => p.id));
  }, [inView, pending, markSeen]);
  return { fresh: pending.filter((p) => !seen.has(p.id)), markSeen };
};

// A join request that comes in pops up over the desk (issue #66.1, decision 6), at the foot
// of the screen, without taking the focus from what the Lightkeeper is doing: the request's
// card with Approve, View sheet and Reject as on the Requests page, Later to put it away
// (it stays on the Requests page, counted on the tab), and how many more wait. A screen
// reader hears "Join request from Mara Lowe." from the status line the desk keeps. It lies
// under the phone drawer and every dialog (z 75; the drawer is 80).
export const JoinRequestPopup = ({ request, campaignRoster, more = 0, onApprove, onReject, onView, onLater, onAll, busy = false, error = '' }) => (
  <section
    aria-label="Join request"
    className="fixed z-[75] bottom-3 left-3 right-3 md:left-auto md:right-5 md:bottom-5 md:w-[26rem] max-h-[calc(100dvh-24px)] overflow-y-auto animate-fadeIn"
  >
    <div className="bg-gm-night border border-moonlight-steel/50 rounded-sm px-3 pt-2.5 pb-3 shadow-[0_14px_36px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-sans text-xs font-black uppercase tracking-widest text-moonlight-steel">New join request</h2>
        {more > 0 && <span className="font-serif italic text-sm text-parchment-deep">{more} more waiting</span>}
      </div>
      <PlayerRosterCard
        key={request.id}
        investigator={request}
        onStamp={() => onApprove(request.id)}
        onReject={() => onReject(request.id)}
        onView={() => onView(request)}
        busy={busy}
        samePlayer={samePlayerOf(campaignRoster, request)}
      />
      {error && <p role="alert" className="font-serif text-base text-oxblood-lit mt-2">{error}</p>}
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAll}
          className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-1 font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel hover:text-cream underline decoration-dotted decoration-moonlight-steel/50 underline-offset-4 transition-colors"
        >
          All requests
        </button>
        <button
          type="button"
          onClick={onLater}
          className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-4 font-sans font-bold text-xs uppercase tracking-widest text-cream bg-gm-slate/70 hover:bg-gm-slate border border-moonlight-steel/60 hover:border-moonlight-steel rounded transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  </section>
);
