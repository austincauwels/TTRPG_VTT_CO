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
    <div className="rounded-sm border border-gm-slate bg-gm-slate/30 p-4 shadow-inner">
      <button onClick={() => setShowForm(v => !v)} aria-expanded={showForm} className="w-full flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
        <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel whitespace-nowrap">
          Invite a Player Back
        </h3>
        <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
        <span className="font-sans text-moonlight-steel text-xs ml-1">{showForm ? '▲' : '▼'}</span>
      </button>
      {showForm && (
        <div className="mt-4 space-y-2">
          <p className="font-serif text-sm text-moonlight-steel leading-relaxed">
            For a player whose investigator died or left. Type their username. They see the invite at once if they are online, or the next time they sign in, and come back with a new investigator.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Username"
              className="flex-1 min-w-0 bg-gm-night border border-gm-slate text-cream font-mono text-sm px-3 py-2 placeholder-moonlight-steel/70 focus:outline-none focus:border-moonlight-steel rounded-sm"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-oxblood hover:brightness-125 border border-ink text-cream font-sans font-black text-xs uppercase tracking-widest rounded transition"
            >
              Send invite
            </button>
          </div>
          {error && <p className="font-serif text-sm text-oxblood-lit">{error}</p>}
          {success && <p className="font-serif text-sm text-seal-green-lit">Invite sent.</p>}
        </div>
      )}
    </div>
  );
};
