import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { InvestigatorBusinessCard } from './InvestigatorBusinessCard';

export const ActiveCircleMembers = ({ campaignRoster, onSelect }) => (
  <div className="rounded-sm border border-[#1e3a5f] bg-[#0a1525] p-4 shadow-inner">
    <div className="flex items-center gap-3 mb-5">
      <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#60a5fa]">
        Active Circle Members
      </h3>
      <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
    </div>
    {campaignRoster.active_investigators?.length === 0 ? (
      <p className="font-mono text-[10px] text-[#3b82f6]/40 uppercase tracking-widest text-center py-6 italic">
        No active investigators on record.
      </p>
    ) : (
      <div className="flex flex-wrap gap-4 pt-2 pb-2">
        <AnimatePresence>
          {campaignRoster.active_investigators.map((inv, i) => (
            <InvestigatorBusinessCard key={inv.id} inv={inv} index={i} onClick={() => onSelect(inv)} />
          ))}
        </AnimatePresence>
      </div>
    )}
  </div>
);
