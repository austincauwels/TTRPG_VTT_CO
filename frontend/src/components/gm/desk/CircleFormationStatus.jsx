import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Vote leaders and answers while the circle is forming. The open state lives in
// OperationsPanel so it survives tab changes.
export const CircleFormationStatus = ({ showCircleStatus, setShowCircleStatus, circleCreation }) => (
  <div className="mt-3">
    <button
      onClick={() => setShowCircleStatus(s => !s)}
      className="w-full flex items-center justify-between px-3 py-2.5 bg-gm-slate/60 border border-gm-slate text-left hover:bg-gm-slate transition-colors"
    >
      <span className="font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel">
        Circle formation so far
      </span>
      <span className="font-sans text-moonlight-steel text-xs">{showCircleStatus ? '▲' : '▼'}</span>
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
          <div className="bg-gm-night/60 border border-gm-slate border-t-0 p-3 space-y-2">
            {/* Name vote leader */}
            {(() => {
              const nameVotes = circleCreation.votes?.name_vote || [];
              const tally = {};
              nameVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
              const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
              const suggestCount = (circleCreation.votes?.name_suggest || []).length;
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest shrink-0">Circle Name</span>
                  <span className="font-serif text-sm text-cream text-right">
                    {leader ? `"${leader[0]}" (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : suggestCount > 0 ? `${suggestCount} suggestion${suggestCount > 1 ? 's' : ''}, no votes yet` : 'No names suggested yet'}
                  </span>
                </div>
              );
            })()}
            {/* Ability vote leader */}
            {(() => {
              const abilityVotes = circleCreation.votes?.ability || [];
              const tally = {};
              abilityVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
              const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest shrink-0">Circle Ability</span>
                  <span className="font-serif text-sm text-cream text-right">
                    {leader ? `${leader[0]} (${leader[1]})` : 'No votes yet'}
                  </span>
                </div>
              );
            })()}
            {/* Insignia vote leader */}
            {(() => {
              const insVotes = circleCreation.votes?.insignia || [];
              const tally = {};
              insVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
              const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
              return leader ? (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest shrink-0">Insignia</span>
                  <span className="font-serif text-sm text-cream text-right">{leader[0].replace('Gi','')} ({leader[1]})</span>
                </div>
              ) : null;
            })()}
            {/* Question vote leader */}
            {(() => {
              const qVotes = circleCreation.votes?.question || [];
              const tally = {};
              qVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
              const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
              return (
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest shrink-0">Question</span>
                  <span className="font-serif text-sm text-cream text-right">
                    {leader ? `Question ${leader[0].replace('q','')} leads (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : 'No votes yet'}
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
                  <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest shrink-0">Relationships</span>
                  <span className="font-serif text-sm text-cream text-right">
                    {confirmed} of {total} proposed are confirmed
                  </span>
                </div>
              );
            })()}
            {/* Player personal answers */}
            {circleCreation.activeInvestigators?.some(inv => inv.personal_circle_answer) && (
              <div className="mt-2 pt-2 border-t border-gm-slate space-y-2">
                <span className="font-sans font-bold text-xs text-moonlight-steel uppercase tracking-widest block">Answers to the circle question</span>
                {circleCreation.activeInvestigators.map(inv => inv.personal_circle_answer ? (
                  <div key={inv.id} className="bg-gm-slate/40 rounded-sm p-2">
                    <p className="font-serif font-bold text-sm text-moonlight-steel mb-1">{inv.name}</p>
                    <p className="font-serif text-sm text-cream/90 italic leading-snug">"{inv.personal_circle_answer}"</p>
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
