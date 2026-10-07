import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { InvestigatorDossier } from '../pc/InvestigatorDossier';
import { BrassCornerFiligree } from '../shared/Decorations';
import { apiFetch } from '../../utils/api';
import { EdgeLine } from '../shared/PrintMarks';
import { ConfirmAction } from '../shared/ConfirmAction';

export const GMCharacterSheet = ({ character: rosterItem, onClose }) => {
  const [fullChar, setFullChar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const { gmResetCharacter, gmSetMarks } = useGameStore(useShallow(s => ({ gmResetCharacter: s.gmResetCharacter, gmSetMarks: s.gmSetMarks })));
  const [marksError, setMarksError] = useState(null);
  // A mark the app does not clear itself (Occult Researcher's with no detail, p. 27), or a
  // mis-tap: the Lightkeeper sets the track, and the player's sheet follows
  const setMarks = (type, value) => {
    setMarksError(null);
    if (!gmSetMarks(rosterItem.id, type, value)) {
      setMarksError('Not connected to the table. Try again in a moment.');
      return;
    }
    setFullChar(c => (c ? { ...c, [`${type}_marks`]: value } : c));
  };
  // The roster takes the portrait_update frames, so a photo changed while this sheet is
  // open shows here too (it was fetched once, when the sheet opened)
  const rosterPic = useGameStore(s => {
    const all = [...(s.campaignRoster.active_investigators || []), ...(s.campaignRoster.pending_investigators || [])];
    const hit = all.find(c => c.id === rosterItem?.id);
    return hit && 'profile_pic' in hit ? hit.profile_pic : undefined;
  });
  const rosterPicAtOpen = useRef(rosterPic);
  const sheet = fullChar && rosterPic !== undefined && rosterPic !== rosterPicAtOpen.current
    ? { ...fullChar, profile_pic: rosterPic }
    : fullChar;

  // The sheet replaces the business card that opened it, so keyboard focus starts on Back.
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, [rosterItem?.id]);


  useEffect(() => {
    if (!rosterItem?.id) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/investigators/${rosterItem.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This investigator no longer exists.' : 'The sheet could not be loaded. Try again in a moment.');
        return r.json();
      })
      .then(data => { setFullChar(data); setLoading(false); })
      .catch(e => {
        // fetch itself throws a TypeError when the server cannot be reached
        setError(e instanceof TypeError ? 'Could not reach the server. Check your connection and try again.' : e.message);
        setLoading(false);
      });
  }, [rosterItem?.id, attempt]);

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
        ref={backRef}
        onClick={onClose}
        className="mb-4 font-sans text-sm uppercase tracking-widest text-moonlight-steel hover:text-cream border border-moonlight-steel/40 hover:border-moonlight-steel rounded px-5 py-2.5 transition-colors font-bold"
      >
        ← Back to roster
      </button>

      {/* Parchment panel — matches MainDeskView center column styling */}
      <div className="bg-cream text-ink px-4 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] border-2 border-black relative font-serif overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        <BrassCornerFiligree />
        <EdgeLine text="Candela Obscura · Chapter registry · Lightkeeper's copy" className="bottom-2 left-10 right-10" />

        {loading && (
          <div className="py-24 text-center font-serif italic text-base text-sepia">
            Loading the investigator's sheet…
          </div>
        )}

        {error && (
          <div className="py-24 text-center font-serif text-base text-oxblood space-y-3">
            <p>{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setAttempt(a => a + 1)} className="font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] bg-oxblood text-cream border border-ink rounded hover:brightness-125 transition">
                Try again
              </button>
              <button onClick={onClose} className="font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] border border-oxblood/50 rounded hover:bg-oxblood/10 transition-colors">
                Back to roster
              </button>
            </div>
          </div>
        )}

        {fullChar && !loading && (
          <>
            <InvestigatorDossier character={sheet} readOnly />
            <div className="mt-6 pt-4 border-t border-ink/10">
              <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-2">Correct marks</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {['body', 'brain', 'bleed'].map(type => {
                  const label = type[0].toUpperCase() + type.slice(1);
                  const value = fullChar[`${type}_marks`] || 0;
                  const step = 'w-9 h-9 [@media(pointer:fine)]:w-7 [@media(pointer:fine)]:h-7 border border-ink/40 rounded-sm font-sans font-black text-ink hover:bg-ink/5 disabled:opacity-30';
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className="font-sans text-sm font-bold uppercase tracking-wider text-ink w-12">{label}</span>
                      <button type="button" className={step} disabled={value <= 0} onClick={() => setMarks(type, value - 1)}
                        aria-label={`Remove a ${label} mark from ${fullChar.name || 'this investigator'}`}>−</button>
                      <span className="font-mono tabular-nums text-base w-4 text-center" aria-label={`${label} marks`}>{value}</span>
                      <button type="button" className={step} disabled={value >= 3} onClick={() => setMarks(type, value + 1)}
                        aria-label={`Add a ${label} mark to ${fullChar.name || 'this investigator'}`}>+</button>
                    </div>
                  );
                })}
              </div>
              {marksError && <p role="alert" className="mt-2 text-sm font-serif text-oxblood">{marksError}</p>}
            </div>
            <ConfirmAction
              className="mt-6 pt-4 border-t border-ink/10 flex flex-wrap items-center gap-3"
              onConfirm={() => gmResetCharacter(rosterItem.id)}
              armedHint={`Press again to refill drive and resistance and clear ability uses for ${fullChar.name || 'this investigator'}.`}
              renderButton={(armed, props) => (
                <button
                  {...props}
                  className={`font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] border rounded transition ${
                    armed
                      ? 'bg-oxblood text-cream border-ink hover:brightness-125'
                      : 'bg-transparent text-oxblood border-oxblood/50 hover:bg-oxblood/10'
                  }`}
                >
                  {armed ? 'Yes, reset' : 'Reset drive and ability uses'}
                </button>
              )}
            />
          </>
        )}
      </div>
    </motion.div>
  );
};
