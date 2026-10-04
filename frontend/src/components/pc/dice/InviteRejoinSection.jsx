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
    if (!username.trim() || !activeCampaignId) { setError('Enter a username.'); return; }
    setError('');
    try {
      const res = await apiFetch(`/campaign/${activeCampaignId}/invite-rejoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) { setSuccess(true); setUsername(''); setTimeout(() => setSuccess(false), 4000); }
      else { const data = await res.json().catch(() => ({})); setError(data.detail || 'Failed to send invite.'); }
    } catch { setError('Network error.'); }
  };

  return (
    <div className="rounded-sm border border-[#1e3a5f] bg-[#0a1525] p-4 shadow-inner">
      <button onClick={() => setShowForm(v => !v)} className="w-full flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
        <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#60a5fa] whitespace-nowrap">
          Invite Player to Rejoin
        </h3>
        <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
        <span className="font-mono text-[#60a5fa] text-xs ml-1">{showForm ? '▲' : '▼'}</span>
      </button>
      {showForm && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] text-[#3b82f6]/60 uppercase tracking-widest leading-relaxed">
            Enter the player's username. They will receive a notification on their next login.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Username"
              className="flex-1 bg-[#0c1c32] border border-[#1e3a5f] text-[#c9b89a] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#60a5fa] rounded-sm"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d5a8e] border border-[#2d5a8e] text-[#60a5fa] font-mono font-bold text-xs uppercase tracking-[0.15em] transition-colors"
            >
              Send
            </button>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          {success && <p className="font-mono text-xs text-green-400">Invite sent successfully.</p>}
        </div>
      )}
    </div>
  );
};
