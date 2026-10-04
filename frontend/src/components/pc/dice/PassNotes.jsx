import React, { useState, useRef } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { TargetDropdown } from './TargetDropdown';

export const PassNotes = ({ playerList, circleCreation, showGmControls, sendChat }) => {
  const [chatTarget, setChatTarget] = useState('@Circle');
  const [chatMessage, setChatMessage] = useState('');
  const chatInputRef = useRef(null);

  // Use explicitly passed playerList (for GM) if non-empty, else fall back to circleCreation investigators (for PC)
  const investigators = (playerList && playerList.length > 0) ? playerList : (circleCreation?.activeInvestigators || []);
  const targetOptions = [
    { value: '@Circle', label: '@Circle — all', inkColor: null },
    ...investigators.map(inv => ({
      value: `@${inv.name}`,
      label: `@${inv.name} — private`,
      inkColor: inv.ink_color || null,
    })),
    ...(showGmControls ? [{ value: '@Environment', label: '@Environment — broadcast', inkColor: 'rgb(var(--c-oxblood))' }] : []),
  ];

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendChat(chatTarget, chatMessage.trim());
    setChatMessage('');
    chatInputRef.current?.focus();
  };

  return (
  <div className="font-sans">
    <div
      className="relative shadow-[2px_5px_18px_rgba(0,0,0,0.65)] border border-sepia/40"
      style={{
        background: 'rgb(var(--c-parchment))',
        backgroundImage: [
          'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.14) 27px, rgb(var(--c-sepia) / 0.14) 28px)',
          'linear-gradient(to right, transparent 34px, rgb(var(--c-oxblood) / 0.3) 34px, rgb(var(--c-oxblood) / 0.3) 35.5px, transparent 35.5px)',
        ].join(', '),
        backgroundPosition: '0 36px, 0 0',
      }}
    >
      {/* Memo header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sepia/40 bg-parchment-deep"
      >
        <div className="flex items-center gap-2 pl-[26px]">
          <SafeIcon name="GiDiscussion" size={14} className="text-sepia" />
          <span className="font-sans font-black text-sm uppercase tracking-widest text-ink">Pass Notes</span>
        </div>
        <span className="font-sans font-bold text-xs uppercase tracking-widest text-sepia">Internal</span>
      </div>

      {/* To: row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1 pl-[44px]">
        <span className="font-sans text-sm font-black uppercase tracking-widest text-sepia shrink-0">To:</span>
        <TargetDropdown
          value={chatTarget}
          onChange={setChatTarget}
          options={targetOptions}
          darkMode={showGmControls}
        />
      </div>

      {/* Message row */}
      <div className="flex items-end gap-2 px-3 pt-1 pb-3 pl-[44px]">
        <input
          ref={chatInputRef}
          type="text"
          value={chatMessage}
          onChange={e => setChatMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
          placeholder="Write your message..."
          className="flex-1 min-w-0 bg-transparent border-b border-sepia/40 focus:border-oxblood outline-none text-base font-serif text-ink placeholder-sepia/70 placeholder:italic py-0.5 transition-colors"
        />
        <button
          onClick={handleSendChat}
          disabled={!chatMessage.trim()}
          className="shrink-0 px-2.5 py-1 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood rounded-sm hover:bg-oxblood hover:text-cream transition-all disabled:opacity-40"
        >
          Send ›
        </button>
      </div>

      {/* Perforated tear edge */}
      <div
        className="h-2.5 border-t border-dashed border-sepia/70"
        style={{
          background: 'repeating-linear-gradient(to right, transparent, transparent 5px, rgb(var(--c-sepia)/0.15) 5px, rgb(var(--c-sepia)/0.15) 6px)',
        }}
      />
    </div>
  </div>
  );
};
