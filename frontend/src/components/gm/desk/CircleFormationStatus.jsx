import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BlankEntry, FormLine } from '../../shared/PrintMarks';
import { leadingVote } from '../../../game/votes';

// Vote leaders and answers while the circle is forming, on the circle's formation papers
// (Form C.O. 4) lying on the desk, folded until opened. The open state lives in
// OperationsPanel so it survives tab changes.
export const CircleFormationStatus = ({ showCircleStatus, setShowCircleStatus, circleCreation }) => (
  <div className="mt-3 hand-placed bg-parchment text-ink border border-sepia/30 rounded-sm shadow-[2px_6px_14px_rgba(0,0,0,0.55)]" style={{ '--tilt': '-0.5deg' }}>
    <button
      onClick={() => setShowCircleStatus(s => !s)}
      aria-expanded={showCircleStatus}
      className="pen-host w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-black/5 transition-colors"
    >
      <span className="flex flex-col">
        <span className="font-sans font-black text-xs uppercase tracking-widest text-sepia">
          <span className="pen-underline">Circle formation so far</span>
        </span>
        <FormLine aria-hidden="true">Form C.O. 4 · Circle formation papers</FormLine>
      </span>
      <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11" className={`shrink-0 text-sepia transition-transform duration-200 ${showCircleStatus ? 'rotate-180' : ''}`}>
        <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <AnimatePresence>
      {showCircleStatus && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="border-t border-dashed border-sepia/40 p-3 space-y-2">
            {/* Name vote leader */}
            {(() => {
              const nameVotes = circleCreation.votes?.name_vote || [];
              const lead = leadingVote(nameVotes);
              const leader = lead && [lead.value, lead.count];
              const suggestCount = (circleCreation.votes?.name_suggest || []).length;
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest shrink-0">Circle Name</span>
                  <span className="font-serif text-sm text-ink text-right">
                    {leader ? `"${leader[0]}" (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : suggestCount > 0 ? `${suggestCount} suggested, 0 votes` : <BlankEntry label="None suggested" />}
                  </span>
                </div>
              );
            })()}
            {/* Ability vote leader */}
            {(() => {
              const abilityVotes = circleCreation.votes?.ability || [];
              const lead = leadingVote(abilityVotes);
              const leader = lead && [lead.value, lead.count];
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest shrink-0">Circle Ability</span>
                  <span className="font-serif text-sm text-ink text-right">
                    {leader ? `${leader[0]} (${leader[1]})` : <BlankEntry label="No votes" />}
                  </span>
                </div>
              );
            })()}
            {/* Insignia vote leader */}
            {(() => {
              const insVotes = circleCreation.votes?.insignia || [];
              const lead = leadingVote(insVotes);
              const leader = lead && [lead.value, lead.count];
              return leader ? (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest shrink-0">Insignia</span>
                  <span className="font-serif text-sm text-ink text-right">{leader[0].replace('Gi','')} ({leader[1]})</span>
                </div>
              ) : null;
            })()}
            {/* Question vote leader */}
            {(() => {
              const qVotes = circleCreation.votes?.question || [];
              const lead = leadingVote(qVotes);
              const leader = lead && [lead.value, lead.count];
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest shrink-0">Question</span>
                  <span className="font-serif text-sm text-ink text-right">
                    {leader ? `Question ${leader[0].replace('q','')} leads (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : <BlankEntry label="No votes" />}
                  </span>
                </div>
              );
            })()}
            {/* Relationships */}
            {(() => {
              const rels = circleCreation.relationships || [];
              const confirmed = rels.filter(r => r.status === 'accepted').length;
              const total = rels.length;
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest shrink-0">Relationships</span>
                  <span className="font-serif text-sm text-ink text-right">
                    {confirmed} of {total} proposed are confirmed
                  </span>
                </div>
              );
            })()}
            {/* Player personal answers */}
            {circleCreation.activeInvestigators?.some(inv => inv.personal_circle_answer) && (
              <div className="mt-2 pt-2 border-t border-dashed border-sepia/40 space-y-2">
                <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest block">Answers to the circle question</span>
                {circleCreation.activeInvestigators.map(inv => inv.personal_circle_answer ? (
                  <div key={inv.id} className="bg-parchment-deep/40 rounded-sm p-2">
                    <p className="font-serif font-bold text-sm text-ink mb-1">{inv.name}</p>
                    <p className="font-serif text-sm text-ink/85 italic leading-snug">"{inv.personal_circle_answer}"</p>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
