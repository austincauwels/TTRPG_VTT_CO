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
    ...(showGmControls ? [{ value: '@Environment', label: '@Environment — broadcast', inkColor: '#8b0000' }] : []),
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
      className="relative shadow-[2px_5px_18px_rgba(0,0,0,0.65)] border border-[#c4a870]"
      style={{
        background: '#f4edd8',
        backgroundImage: [
          'repeating-linear-gradient(transparent, transparent 27px, rgba(150,120,70,0.14) 27px, rgba(150,120,70,0.14) 28px)',
          'linear-gradient(to right, transparent 34px, rgba(180,60,50,0.35) 34px, rgba(180,60,50,0.35) 35.5px, transparent 35.5px)',
        ].join(', '),
        backgroundPosition: '0 36px, 0 0',
      }}
    >
      {/* Memo header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#c4a870]"
        style={{ background: 'linear-gradient(to bottom, #e8d9b4, #dfd0a4)' }}
      >
        <div className="flex items-center gap-2 pl-[26px]">
          <SafeIcon name="GiDiscussion" size={13} className="text-[#5a3a18]" />
          <span className="font-sans font-black text-sm uppercase tracking-[0.35em] text-[#3a2410]">Pass Notes</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-[#8b6030]/50">Internal</span>
      </div>

      {/* To: row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1 pl-[44px]">
        <span className="font-mono text-sm font-black uppercase tracking-widest text-[#7a5030]/70 shrink-0">To:</span>
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
          className="flex-1 bg-transparent border-b border-[#b8a070] focus:border-[#7a5030] outline-none text-sm font-serif text-[#2a1808] placeholder-[#b8a070] py-0.5 transition-colors"
        />
        <button
          onClick={handleSendChat}
          disabled={!chatMessage.trim()}
          className="shrink-0 px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.25em] border border-[#8b5030] text-[#8b5030] hover:bg-[#8b5030] hover:text-[#f4edd8] transition-all disabled:opacity-30"
        >
          Send ›
        </button>
      </div>

      {/* Perforated tear edge */}
      <div
        className="h-2.5 border-t border-dashed border-[#c4a870]/70"
        style={{
          background: 'repeating-linear-gradient(to right, transparent, transparent 5px, rgba(196,168,112,0.15) 5px, rgba(196,168,112,0.15) 6px)',
        }}
      />
    </div>
  </div>
  );
};
