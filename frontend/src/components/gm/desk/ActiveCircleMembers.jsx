import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { InvestigatorBusinessCard } from './InvestigatorBusinessCard';

export const ActiveCircleMembers = ({ campaignRoster, onSelect, className = '' }) => (
  <div className={`rounded-sm border border-gm-slate bg-gm-slate/30 p-4 shadow-inner ${className}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel text-center">
        Investigators
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    {campaignRoster.active_investigators?.length === 0 ? (
      <p className="font-serif text-base text-moonlight-steel text-center py-6 italic">
        No investigators in play yet. They appear here once you approve their join requests.
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
