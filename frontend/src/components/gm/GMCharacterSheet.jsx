import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { InvestigatorDossier } from '../pc/InvestigatorDossier';
import { BrassCornerFiligree } from '../shared/Decorations';
import { apiUrl } from '../../utils/api';

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
    fetch(apiUrl(`/api/investigators/${rosterItem.id}`))
      .then(r => {
        if (!r.ok) throw new Error('Not found');
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
        className="mb-4 font-mono text-base uppercase tracking-widest text-slate-400 hover:text-slate-100 border border-slate-700 hover:border-slate-500 px-5 py-2.5 transition-colors font-bold"
      >
        ← Roster
      </button>

      {/* Parchment panel — matches MainDeskView center column styling */}
      <div className="bg-[#fbf6eb] text-black px-8 pt-8 pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] border-2 border-black relative font-serif overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        <BrassCornerFiligree />

        {loading && (
          <div className="py-24 text-center font-mono text-[10px] uppercase tracking-widest text-black/40">
            Loading dossier…
          </div>
        )}

        {error && (
          <div className="py-24 text-center font-mono text-[10px] uppercase tracking-widest text-red-800/60">
            Failed to retrieve dossier.
          </div>
        )}

        {fullChar && !loading && (
          <>
            <InvestigatorDossier character={fullChar} readOnly />
            <div className="mt-6 pt-4 border-t border-black/10 flex items-center gap-3">
              <button
                onClick={handleReset}
                onBlur={() => setResetConfirm(false)}
                className={`font-mono text-xs font-black uppercase tracking-[0.2em] px-4 py-2 border transition-colors ${
                  resetConfirm
                    ? 'bg-[#8b1a1a] text-white border-[#5c0f0f] hover:bg-[#a82222]'
                    : 'bg-transparent text-[#8b1a1a] border-[#8b1a1a]/50 hover:bg-[#8b1a1a]/10'
                }`}
              >
                {resetConfirm ? '[ Confirm Reset ]' : '[ Reset Session Resources ]'}
              </button>
              {resetConfirm && (
                <span className="font-mono text-[10px] text-[#8b1a1a]/70 uppercase tracking-widest">
                  Resets drive, resistance & ability uses
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
