import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../../store/gameStore';
import { apiFetch } from '../../../utils/api';

// Invite player: the Lightkeeper names a player by username and they come back into the
// campaign with a new investigator, without waiting for approval (POST
// /campaign/{id}/invite-rejoin). It is wanted once in a blue moon, so it is a quiet text
// button where people come into the campaign, under the join requests or, once the circle
// is finalized, under the sealed slip; it opens its form in place on a small slip.
export const InvitePlayer = ({ align = 'center', className = '' }) => {
  const { lastPlayedCampaign, accessSession } = useGameStore(useShallow(s => ({
    lastPlayedCampaign: s.lastPlayedCampaign,
    accessSession: s.accessSession,
  })));
  const activeCampaignId = lastPlayedCampaign?.campaignId ?? accessSession?.campaignId ?? null;
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const toggleRef = useRef(null);
  const inputRef = useRef(null);

  // The field takes focus as the slip opens
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const close = () => { setOpen(false); toggleRef.current?.focus(); };

  const handleSend = async () => {
    const name = username.trim();
    if (busy) return;
    if (!name || !activeCampaignId) { setError("Type the player's username first."); return; }
    setError('');
    setSentTo('');
    setBusy(true);
    try {
      const res = await apiFetch(`/campaign/${activeCampaignId}/invite-rejoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      if (res.ok) { setSentTo(name); setUsername(''); }
      else { const data = await res.json().catch(() => ({})); setError(typeof data.detail === 'string' ? data.detail : 'The invite was not sent. Check the username and try again.'); }
    } catch { setError('Could not reach the server. Check your connection and try again.'); }
    setBusy(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${align === 'start' ? 'items-start' : 'items-center'} ${className}`}>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 min-h-[36px] [@media(pointer:coarse)]:min-h-[44px] px-2 font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel hover:text-cream underline decoration-dotted decoration-moonlight-steel/50 underline-offset-4 transition-colors"
      >
        Invite player
        <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10" className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        // A small slip from the Lightkeeper's pad, laid down under the button
        <div className="hand-placed w-full bg-parchment text-ink border border-sepia/30 rounded-sm px-4 py-3 shadow-[2px_6px_12px_rgba(0,0,0,0.55)]" style={{ '--tilt': '-0.6deg' }}>
          <p className="font-serif italic text-sm text-sepia leading-snug">
            The player rejoins with a new investigator, without waiting for your approval.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); setSentTo(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
                if (e.key === 'Escape') { e.preventDefault(); close(); }
              }}
              placeholder="Username"
              aria-label="Player's username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              className="flex-1 min-w-0 bg-transparent border-0 border-b border-sepia/45 text-ink font-mono text-sm [@media(pointer:coarse)]:text-base [@media(pointer:coarse)]:min-h-[44px] px-1 py-2 placeholder-sepia/80 focus:border-oxblood rounded-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={busy}
              className="shrink-0 px-4 py-2 [@media(pointer:coarse)]:min-h-[44px] bg-oxblood hover:brightness-125 border border-ink text-cream font-sans font-black text-xs uppercase tracking-widest rounded transition disabled:opacity-60 disabled:cursor-wait"
            >
              Send invite
            </button>
          </div>
          {error && <p role="alert" className="mt-2 font-serif text-sm text-oxblood">{error}</p>}
          {sentTo && <p role="status" className="mt-2 font-serif text-sm text-seal-green">Invite sent to <span className="font-mono">{sentTo}</span>.</p>}
        </div>
      )}
    </div>
  );
};
