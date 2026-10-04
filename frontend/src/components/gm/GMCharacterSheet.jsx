import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { InvestigatorDossier } from '../pc/InvestigatorDossier';
import { BrassCornerFiligree } from '../shared/Decorations';
import { apiFetch } from '../../utils/api';

export const GMCharacterSheet = ({ character: rosterItem, onClose }) => {
  const [fullChar, setFullChar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const { gmResetCharacter } = useGameStore(useShallow(s => ({ gmResetCharacter: s.gmResetCharacter })));

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    gmResetCharacter(rosterItem.id);
    setResetConfirm(false);
  };

  useEffect(() => {
    if (!rosterItem?.id) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/investigators/${rosterItem.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This investigator no longer exists.' : 'The sheet could not be loaded.');
        return r.json();
      })
      .then(data => { setFullChar(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [rosterItem?.id]);

  if (!rosterItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="relative"
    >
      {/* Back button */}
      <button
        onClick={onClose}
        className="mb-4 font-sans text-sm uppercase tracking-widest text-moonlight-steel hover:text-cream border border-moonlight-steel/40 hover:border-moonlight-steel rounded px-5 py-2.5 transition-colors font-bold"
      >
        ← Back to roster
      </button>

      {/* Parchment panel — matches MainDeskView center column styling */}
      <div className="bg-cream text-ink px-4 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] border-2 border-black relative font-serif overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        <BrassCornerFiligree />

        {loading && (
          <div className="py-24 text-center font-serif italic text-base text-sepia">
            Loading the investigator's sheet…
          </div>
        )}

        {error && (
          <div className="py-24 text-center font-serif text-base text-oxblood space-y-3">
            <p>{error} Go back to the roster and open it again.</p>
            <button onClick={onClose} className="font-sans text-xs font-black uppercase tracking-widest px-4 py-2 border border-oxblood/50 rounded hover:bg-oxblood/10 transition-colors">
              Back to roster
            </button>
          </div>
        )}

        {fullChar && !loading && (
          <>
            <InvestigatorDossier character={fullChar} readOnly />
            <div className="mt-6 pt-4 border-t border-ink/10 flex flex-wrap items-center gap-3">
              <button
                onClick={handleReset}
                onBlur={() => setResetConfirm(false)}
                className={`font-sans text-xs font-black uppercase tracking-widest px-4 py-2 border rounded transition ${
                  resetConfirm
                    ? 'bg-oxblood text-cream border-ink hover:brightness-125'
                    : 'bg-transparent text-oxblood border-oxblood/50 hover:bg-oxblood/10'
                }`}
              >
                {resetConfirm ? 'Yes, reset' : 'Reset drive and ability uses'}
              </button>
              <span className="font-serif italic text-base text-sepia">
                {resetConfirm
                  ? 'Press again to refill drive and resistance and clear ability uses for this investigator.'
                  : 'Refills drive and resistance and clears ability uses. Asks you to confirm.'}
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
