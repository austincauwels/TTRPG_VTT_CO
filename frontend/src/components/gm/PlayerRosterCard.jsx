import React from 'react';
import useGameStore from '../../store/gameStore';

export const PlayerRosterCard = ({ investigator, onStamp, onReject }) => {
  const { character } = useGameStore();
  const data = investigator || character;

  if (!data) return null;

  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-slate-300/60 bg-slate-100/90 rounded-sm w-full">
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg font-bold text-[#1a1311] truncate">{data.name || 'Unknown'}</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#1a1311]/50 truncate">
          {[data.pronouns, data.role_class || data.role, data.specialty].filter(Boolean).join(' · ')}
        </p>
        {data.catalyst && (
          <p className="font-serif text-xs italic text-[#5a3a28]/70 break-words leading-snug mt-0.5">"{data.catalyst}"</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0 pt-1">
        {onStamp && (
          <button
            onClick={onStamp}
            className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] border border-[#721c15]/40 text-[#721c15] hover:bg-[#721c15]/10 transition-colors"
          >
            Approve
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] border border-slate-400/40 text-slate-500 hover:bg-slate-500/10 transition-colors"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
};
