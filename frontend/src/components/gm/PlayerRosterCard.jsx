import React from 'react';
import useGameStore from '../../store/gameStore';

export const PlayerRosterCard = ({ investigator, onStamp, onReject }) => {
  const { character } = useGameStore();
  const data = investigator || character;

  if (!data) return null;

  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-sepia/30 bg-parchment rounded-sm w-full shadow-[2px_4px_10px_rgba(0,0,0,0.5)]">
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg font-bold text-ink truncate">{data.name || 'Unknown'}</p>
        <p className="font-sans font-bold text-xs uppercase tracking-widest text-sepia truncate">
          {[data.pronouns, data.role_class || data.role, data.specialty].filter(Boolean).join(' · ')}
        </p>
        {data.catalyst && (
          <p className="font-serif text-sm italic text-sepia break-words leading-snug mt-0.5">"{data.catalyst}"</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0 pt-1">
        {onStamp && (
          <button
            onClick={onStamp}
            className="px-3 py-2 font-sans text-xs font-black uppercase tracking-widest border border-oxblood/50 text-oxblood rounded hover:bg-oxblood/10 transition-colors"
          >
            Approve
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            className="px-3 py-2 font-sans text-xs font-black uppercase tracking-widest border border-sepia/40 text-sepia rounded hover:bg-sepia/10 transition-colors"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
};
