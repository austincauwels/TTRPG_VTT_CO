import React from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

export const PlayerRosterCard = ({ investigator, onStamp }) => {
  const { character } = useGameStore();
  // When passed an investigator prop, render that; otherwise fall back to the store character
  const data = investigator || character;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs uppercase tracking-widest">
        <SafeIcon name="GiMagnifyingGlass" size={32} className="mb-2 opacity-50" />
        No active investigators detected.
      </div>
    );
  }

  // Drives are blue circles, Marks are red squares
  const RosterTracker = ({ label, current, max, type }) => {
    const isMark = type === 'mark';
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

  const idLabel = data.id ? `#${String(data.id).padStart(6, '0')}` : 'PENDING';

  return (
    <motion.div
      layout
      layoutId={`investigator-${data.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ duration: 0.3 }}
      className="bg-[#1e293b] border border-slate-600 rounded-sm p-6 shadow-[0_10px_25px_rgba(0,0,0,0.6)] w-full max-w-md relative overflow-hidden group hover:border-[#3b82f6]/50 transition-colors"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Card Header */}
      <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-5 relative z-10">
        <div>
          <h3 className="font-serif text-2xl font-bold text-slate-100 uppercase tracking-wider drop-shadow-sm">
            {data.name || 'Unknown'}
          </h3>
          <div className="flex gap-3 font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-1.5">
            <span>{data.pronouns || 'Unlisted'}</span>
            <span className="text-[#60a5fa] drop-shadow-[0_0_2px_rgba(96,165,250,0.5)]">
              {data.role_class || data.role || 'Investigator'}
            </span>
          </div>
        </div>

        {/* ID Badge */}
        <div className="bg-[#0f172a] border border-slate-700 px-2 py-1 rounded shadow-inner text-right">
          <span className="block font-mono text-[7px] text-slate-500 uppercase tracking-widest">Matrix ID</span>
          <span className="block font-mono text-xs text-slate-300 font-bold">{idLabel}</span>
        </div>
      </div>

      {/* Card Body - Trackers (only shown for full characters with drive data) */}
      {data.drives || (data.nerve_current !== undefined) ? (
        <div className="grid grid-cols-2 gap-8 relative z-10">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-700 pb-1">Drives</span>
            <RosterTracker label="Nerve" current={data.drives?.nerve ?? data.nerve_current ?? 0} max={3} />
            <RosterTracker label="Cunning" current={data.drives?.cunning ?? data.cunning_current ?? 0} max={3} />
            <RosterTracker label="Intuition" current={data.drives?.intuition ?? data.intuition_current ?? 0} max={3} />
          </div>
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-700 pb-1">Marks</span>
            <RosterTracker label="Body" current={data.marks?.body ?? data.body_marks ?? 0} max={3} type="mark" />
            <RosterTracker label="Brain" current={data.marks?.brain ?? data.brain_marks ?? 0} max={3} type="mark" />
            <RosterTracker label="Bleed" current={data.marks?.bleed ?? data.bleed_marks ?? 0} max={3} type="mark" />
          </div>
        </div>
      ) : (
        /* Simplified view for pending investigators (roster items without full stats) */
        <div className="relative z-10">
          <div className="flex flex-col gap-2">
            {data.circle_name && (
              <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                <span className="text-slate-600 mr-2">Circle:</span>{data.circle_name}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-amber-500/60 animate-pulse" />
              <span className="font-mono text-[9px] text-amber-400/80 uppercase tracking-widest">Awaiting Approval</span>
            </div>
          </div>
        </div>
      )}

      {/* Gear footer — only for full characters */}
      {(data.gear?.length > 0 || data.nerve_current !== undefined) && (
        <div className="mt-6 pt-3 border-t border-slate-700/50 relative z-10">
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Active Gear:</span>
          <p className="font-serif text-sm text-slate-300 line-clamp-2 italic leading-relaxed">
            {data.gear?.length > 0 ? data.gear.join(', ') : 'Standard Issue Equipment'}
          </p>
        </div>
      )}

      {/* Stamp button — only shown when onStamp prop is provided (GM pending stack) */}
      {onStamp && (
        <div className="mt-5 pt-4 border-t border-slate-700/50 relative z-10">
          <button
            onClick={onStamp}
            className="w-full flex items-center justify-center gap-2 bg-[#7a1812]/30 hover:bg-[#7a1812]/70 border border-[#8a2222]/50 hover:border-[#8a2222] text-[#e07070] hover:text-[#fdfaf4] font-mono text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2.5 transition-all duration-200 shadow-inner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Stamp — Approved
          </button>
        </div>
      )}
    </motion.div>
  );
};
