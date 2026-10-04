import React from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { RelationshipNegotiation, useRelationshipForms } from './relationships/RelationshipNegotiation';
import { useDialog } from '../shared/useDialog';

// Shown when an investigator joins a circle that is already formed: the newcomer sets up
// a relationship with everyone, and everyone else with the newcomer. Same paper and the
// same relationship form as the circle formation papers.
export const RelationshipIntroPopup = () => {
  const {
    character,
    circleCreation,
    pendingRelationshipIntro,
    clearRelationshipIntro,
    proposeRelationship,
    respondToRelationship,
  } = useGameStore();

  const relForms = useRelationshipForms();

  const { relationships } = circleCreation;
  const circleId = circleCreation.circleId || character?.circle_id;
  const myId = character?.id;

  const { newCharacter, allActiveCharacters } = pendingRelationshipIntro || {};

  // Which investigators does this player need to define relationships with?
  const isNewCharacter = myId === newCharacter?.id;
  const targets = isNewCharacter
    ? (allActiveCharacters || []).filter(c => c.id !== myId)
    : [newCharacter];

  const dialogRef = useDialog({ open: !!pendingRelationshipIntro, onClose: clearRelationshipIntro });

  if (!pendingRelationshipIntro) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[9100] flex items-center justify-center p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-intro-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto bg-parchment text-ink border-4 border-double border-ink shadow-[0_25px_60px_rgba(0,0,0,0.9)] font-serif"
      >
        <div className="p-6 border-b-2 border-ink">
          <h2 id="relationship-intro-title" className="font-display text-3xl text-ink uppercase tracking-[0.06em]">
            {isNewCharacter
              ? 'Introduce Yourself to the Circle'
              : `Welcome ${newCharacter?.name} to the Circle`}
          </h2>
          {!isNewCharacter && (
            <p className="font-serif text-base text-sepia mt-2 leading-relaxed">
              {newCharacter?.name} has joined your circle.
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          {targets.length === 0 ? (
            <div className="h-24 rounded-sm border border-dashed border-sepia/40"><span className="sr-only">No one else in the circle</span></div>
          ) : (
            targets.map((inv) => (
              <RelationshipNegotiation
                key={inv.id}
                inv={inv}
                myId={myId}
                relationships={relationships}
                circleId={circleId}
                forms={relForms}
                proposeRelationship={proposeRelationship}
                respondToRelationship={respondToRelationship}
              />
            ))
          )}
        </div>

        <div className="p-6 border-t border-sepia/30">
          <button
            onClick={clearRelationshipIntro}
            className="w-full py-3 px-6 bg-transparent hover:bg-oxblood/5 text-oxblood font-sans font-black uppercase tracking-widest text-sm transition-colors border border-oxblood/60 rounded-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
