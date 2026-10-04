import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { InvestigatorBusinessCard } from './InvestigatorBusinessCard';

// The investigators' business cards, lying on the desk. Below xl a moonlit rule names them;
// on the desk that fits the screen the cards speak for themselves.
export const ActiveCircleMembers = ({ campaignRoster, onSelect, className = '' }) => (
  <div className={className}>
    <div className="flex items-center gap-3 mb-5 xl:sr-only">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel text-center">
        Investigators
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    {campaignRoster.active_investigators?.length === 0 ? (
      // An empty place on the desk where the first card will lie
      <div className="flex justify-center py-3">
        <span className="block w-64 max-w-full h-[140px] rounded-sm border border-dashed border-moonlight-steel/35 -rotate-1">
          <span className="sr-only">No investigators in play</span>
        </span>
      </div>
    ) : (
      <div className="flex flex-wrap xl:grid xl:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 pt-2 pb-2 xl:pt-3">
        <AnimatePresence>
          {campaignRoster.active_investigators.map((inv, i) => (
            <InvestigatorBusinessCard key={inv.id} inv={inv} index={i} onClick={() => onSelect(inv)} />
          ))}
        </AnimatePresence>
      </div>
    )}
  </div>
);
