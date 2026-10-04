import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../../store/gameStore';
import { apiFetch } from '../../../utils/api';

export const InviteRejoinSection = () => {
  const { lastPlayedCampaign, accessSession } = useGameStore(useShallow(s => ({
    lastPlayedCampaign: s.lastPlayedCampaign,
    accessSession: s.accessSession,
  })));
  const activeCampaignId = lastPlayedCampaign?.campaignId ?? accessSession?.campaignId ?? null;
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!username.trim() || !activeCampaignId) { setError("Type the player's username first."); return; }
    setError('');
    try {
      const res = await apiFetch(`/campaign/${activeCampaignId}/invite-rejoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) { setSuccess(true); setUsername(''); setTimeout(() => setSuccess(false), 4000); }
      else { const data = await res.json().catch(() => ({})); setError(typeof data.detail === 'string' ? data.detail : 'The invite was not sent. Check the username and try again.'); }
    } catch { setError('Could not reach the server. Check your connection and try again.'); }
  };

  return (
    // A small slip from the Lightkeeper's pad, lying under the notes
    <div className="hand-placed bg-parchment text-ink border border-sepia/30 rounded-sm px-4 py-2.5 shadow-[2px_6px_12px_rgba(0,0,0,0.55)] xl:shrink-0" style={{ '--tilt': '-0.6deg' }}>
      <button onClick={() => setShowForm(v => !v)} aria-expanded={showForm} className="pen-host w-full min-h-[32px] flex items-center gap-3">
        <h3 className="font-sans font-black text-xs uppercase tracking-widest text-sepia whitespace-nowrap">
          <span className="pen-underline">Invite a Player Back</span>
        </h3>
        <span aria-hidden="true" className="flex-1 border-b border-dotted border-sepia/40" />
        <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11" className={`shrink-0 text-sepia transition-transform duration-200 ${showForm ? 'rotate-180' : ''}`}>
          <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {showForm && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Username"
              aria-label="Player's username"
              className="flex-1 min-w-0 bg-transparent border-0 border-b border-sepia/45 text-ink font-mono text-sm px-1 py-2 placeholder-sepia/80 focus:border-oxblood rounded-none"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-oxblood hover:brightness-125 border border-ink text-cream font-sans font-black text-xs uppercase tracking-widest rounded transition"
            >
              Send invite
            </button>
          </div>
          {error && <p className="font-serif text-sm text-oxblood">{error}</p>}
          {success && <p className="font-serif text-sm text-seal-green">Invite sent.</p>}
        </div>
      )}
    </div>
  );
};
