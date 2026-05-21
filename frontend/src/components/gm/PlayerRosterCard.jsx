import React from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

export const PlayerRosterCard = () => {
  const { character } = useGameStore();

  // If no character is loaded, show an empty state
  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs uppercase tracking-widest">
        <SafeIcon name="GiMagnifyingGlass" size={32} className="mb-2 opacity-50" />
        No active investigators detected.
      </div>
    );
  }

  // Midnight Theme Tracker Component for Drives & Marks
  const RosterTracker = ({ label, current, max, type }) => {
    const isMark = type === 'mark';
    // Drives are blue circles, Marks are red squares
    const colorClass = isMark ? 'bg-red-950/40 border-red-900/60' : 'bg-[#3b82f6]/10 border-[#3b82f6]/40';
    const filledClass = isMark ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 'bg-[#60a5fa] shadow-[0_0_8px_rgba(96,165,250,0.6)]';

    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[8px] uppercase tracking-widest text-slate-400">{label}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: max }).map((_, i) => (
            <div 
              key={i} 
              className={`w-3.5 h-3.5 border ${i < current ? filledClass : colorClass} ${isMark ? 'rounded-sm' : 'rounded-full'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#1e293b] border border-slate-600 rounded-sm p-6 shadow-[0_10px_25px_rgba(0,0,0,0.6)] w-full max-w-md relative overflow-hidden group hover:border-[#3b82f6]/50 transition-colors">
      
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Card Header */}
      <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-5 relative z-10">
        <div>
          <h3 className="font-serif text-2xl font-bold text-slate-100 uppercase tracking-wider drop-shadow-sm">
            {character.name || "Unknown"}
          </h3>
          <div className="flex gap-3 font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-1.5">
            <span>{character.pronouns || "Unlisted"}</span>
            <span className="text-[#60a5fa] drop-shadow-[0_0_2px_rgba(96,165,250,0.5)]">
              {character.role || "Investigator"}
            </span>
          </div>
        </div>
        
        {/* ID Badge */}
        <div className="bg-[#0f172a] border border-slate-700 px-2 py-1 rounded shadow-inner text-right">
           <span className="block font-mono text-[7px] text-slate-500 uppercase tracking-widest">Matrix ID</span>
           <span className="block font-mono text-xs text-slate-300 font-bold">
             {character.id ? `#${character.id.substring(0,6)}` : "PENDING"}
           </span>
        </div>
      </div>

      {/* Card Body - Trackers */}
      <div className="grid grid-cols-2 gap-8 relative z-10">
        {/* Drives */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-700 pb-1">Drives</span>
          <RosterTracker label="Nerve" current={character.drives?.nerve || 0} max={3} />
          <RosterTracker label="Cunning" current={character.drives?.cunning || 0} max={3} />
          <RosterTracker label="Intuition" current={character.drives?.intuition || 0} max={3} />
        </div>

        {/* Marks */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-700 pb-1">Marks</span>
          <RosterTracker label="Body" current={character.marks?.body || 0} max={3} type="mark" />
          <RosterTracker label="Brain" current={character.marks?.brain || 0} max={3} type="mark" />
          <RosterTracker label="Bleed" current={character.marks?.bleed || 0} max={3} type="mark" />
        </div>
      </div>
      
      {/* Footer - Quick Notes/Gear */}
      <div className="mt-6 pt-3 border-t border-slate-700/50 relative z-10">
         <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Active Gear:</span>
         <p className="font-serif text-sm text-slate-300 line-clamp-2 italic leading-relaxed">
           {character.gear?.length > 0 ? character.gear.join(", ") : "Standard Issue Equipment"}
         </p>
      </div>
    </div>
  );
};