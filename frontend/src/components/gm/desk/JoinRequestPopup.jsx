import React, { useCallback, useEffect, useState } from 'react';

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

// A join request that comes in shows as a slim toast over the desk (issue #66.1, decision 6;
// fix round 8, 88.16), at the foot of the screen, without taking the focus from what the
// Lightkeeper is doing: the investigator's name and role in one line, with Approve, View
// (the sheet, and Reject behind it on the Requests page) and Later to put it away (it stays
// on the Requests page, counted on the tab), and how many more wait. A screen reader hears
// "Join request from Mara Lowe." from the status line the desk keeps. It lies under the
// phone drawer and every dialog (z 75; the drawer is 80).
const toastButton = 'min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest rounded transition-colors';
export const JoinRequestPopup = ({ request, more = 0, samePlayer = '', onApprove, onView, onLater, busy = false, error = '' }) => {
  const who = request.name || 'An investigator';
  const kind = [request.role_class || request.role, request.specialty].filter(Boolean).join(' · ');
  return (
    <section
      aria-label="Join request"
      className="fixed z-[75] bottom-3 left-3 right-3 md:left-auto md:right-5 md:bottom-5 md:w-80 animate-fadeIn"
    >
      <div className="bg-gm-night border border-moonlight-steel/50 rounded-sm px-3 py-2 shadow-[0_14px_36px_rgba(0,0,0,0.85)]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="flex-1 min-w-[7rem] font-serif text-base text-cream leading-snug truncate">
            <span className="font-bold">{who}</span>
            {kind && <span className="text-parchment-deep"> · {kind}</span>}
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onApprove(request.id)} disabled={busy}
              className={`${toastButton} bg-oxblood text-cream border border-ink hover:brightness-125 disabled:opacity-50 disabled:cursor-wait`}>
              Approve
            </button>
            <button type="button" onClick={() => onView(request)}
              className={`${toastButton} text-cream border border-moonlight-steel/60 hover:bg-gm-slate`}>
              View
            </button>
            <button type="button" onClick={onLater}
              className={`${toastButton} text-moonlight-steel hover:text-cream`}>
              Later
            </button>
          </div>
        </div>
        {samePlayer && <p className="font-serif text-sm font-bold text-oxblood-lit mt-0.5">{samePlayer === 'active' ? 'Already has an investigator here.' : 'Sent another request too.'}</p>}
        {more > 0 && <p className="font-serif italic text-sm text-parchment-deep mt-0.5">{more} more waiting</p>}
        {error && <p role="alert" className="font-serif text-base text-oxblood-lit mt-1">{error}</p>}
      </div>
    </section>
  );
};
