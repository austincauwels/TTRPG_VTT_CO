import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { InvestigatorBusinessCard } from './InvestigatorBusinessCard';
import { MourningCross } from '../../shared/InkMarks';
import { deceasedMembers, livingMembers } from '../../../game/roster';

// The investigators' business cards, lying on the desk. Below xl a moonlit rule names them;
// on the desk that fits the screen the cards speak for themselves. A dead investigator not
// yet replaced lies apart, under a Deceased rule, and is not one of the circle's members;
// their card opens the sheet, where a fourth scar taken by mistake can be removed.
export const ActiveCircleMembers = ({ campaignRoster, onSelect, className = '' }) => {
  const living = livingMembers(campaignRoster.active_investigators);
  const deceased = deceasedMembers(campaignRoster.active_investigators);
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-5 xl:sr-only">
        <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
        <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel text-center">
          Investigators
        </h3>
        <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      </div>
      {living.length === 0 ? (
        // An empty place on the desk where the first card will lie
        <div className="flex justify-center py-3">
          <span className="block w-64 max-w-full h-[140px] rounded-sm border border-dashed border-moonlight-steel/35 -rotate-1">
            <span className="sr-only">No investigators in play</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap xl:grid xl:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 pt-2 pb-2 xl:pt-3">
          <AnimatePresence>
            {living.map((inv, i) => (
              <InvestigatorBusinessCard key={inv.id} inv={inv} index={i} onClick={() => onSelect(inv)} />
            ))}
          </AnimatePresence>
        </div>
      )}
      {deceased.length > 0 && (
        <section aria-labelledby="desk-deceased" className="mt-5 xl:mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
            <h3 id="desk-deceased" className="flex items-center gap-2 font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel">
              <MourningCross className="h-[1.1em]" /> Deceased
            </h3>
            <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
          </div>
          <div className="flex flex-wrap xl:grid xl:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 pb-2">
            {deceased.map((inv, i) => (
              <InvestigatorBusinessCard key={inv.id} inv={inv} index={i + 1} deceased onClick={() => onSelect(inv)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
