import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { InvestigatorDossier } from '../pc/InvestigatorDossier';
import { BrassCornerFiligree } from '../shared/Decorations';
import { apiFetch } from '../../utils/api';
import { EdgeLine } from '../shared/PrintMarks';
import { ConfirmAction } from '../shared/ConfirmAction';

// How many of the member's two circle-resource spends this assignment are used, with a way
// to give one back (a ruling at the table, said in the log). The pool can get the resource
// back too (playtest, lk-resource-repair).
const SpendBack = ({ character, onGive }) => {
  const used = character?.resources_spent_assignment || 0;
  const [resource, setResource] = useState('');
  return (
    <div className="mt-6 pt-4 border-t border-ink/10 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia">
        Circle spends this assignment <span className="font-mono tabular-nums text-sm text-oxblood ml-1">{used} / 2</span>
      </span>
      <label className="flex items-center gap-2 font-serif text-sm text-ink">
        Put back in the pool
        <select value={resource} onChange={(e) => setResource(e.target.value)}
          className="min-h-[36px] [@media(pointer:coarse)]:min-h-[44px] bg-cream border border-ink/30 rounded-sm px-1.5 font-sans text-sm">
          <option value="">Nothing</option>
          <option value="stitch">Stitch</option>
          <option value="refresh">Refresh</option>
          <option value="train">Train</option>
        </select>
      </label>
      <button type="button" aria-disabled={used <= 0}
        onClick={() => { if (used > 0) onGive(resource || undefined); }}
        className={`font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] border rounded transition ${
          used > 0 ? 'text-oxblood border-oxblood/50 hover:bg-oxblood/10' : 'text-sepia/60 border-ink/20 cursor-not-allowed'}`}>
        Give a spend back
      </button>
    </div>
  );
};

export const GMCharacterSheet = ({ character: rosterItem, onClose }) => {
  const [fullChar, setFullChar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const { gmResetCharacter, gmSetMarks, gmSetScars, gmDealMark, gmReturnSpend } = useGameStore(useShallow(s => ({
    gmReturnSpend: s.gmReturnSpend, gmResetCharacter: s.gmResetCharacter, gmSetMarks: s.gmSetMarks, gmSetScars: s.gmSetScars, gmDealMark: s.gmDealMark })));
  // Corrections on the trauma record (its Edit button, on this copy of the sheet only)
  const [traumaError, setTraumaError] = useState(null);
  const notConnected = 'Not connected to the table. Try again in a moment.';
  // A mark the app does not clear itself (Occult Researcher's with no detail, p. 27), or a
  // mis-tap: the Lightkeeper sets the track, and the player's sheet follows
  const setMarks = (type, value) => {
    setTraumaError(null);
    if (!gmSetMarks(rosterItem.id, type, value)) {
      setTraumaError(notConnected);
      return false;
    }
    setFullChar(c => (c ? { ...c, [`${type}_marks`]: value } : c));
    return true;
  };
  // A mark dealt in the story: the sheet follows when it lands (member_update), since the
  // player may soak it or escape it first
  const dealMark = (type, fromEnemy) => {
    setTraumaError(null);
    if (!gmDealMark(rosterItem.id, type, fromEnemy)) {
      setTraumaError(notConnected);
      return false;
    }
    return true;
  };
  // A scar reworded, or removed when it was taken by mistake. Below four scars a dead
  // investigator is alive again and incapacitated (the fourth scar is the fatal one, p. 74;
  // the server's rule, handle_gm_update_scars).
  const setScars = (scars) => {
    setTraumaError(null);
    if (!gmSetScars(rosterItem.id, scars, fullChar?.scars_list || [])) {
      setTraumaError(notConnected);
      return false;
    }
    setFullChar(c => (c ? {
      ...c, scars_list: scars, scars_count: scars.length,
      ...(c.is_dead && scars.length < 4 ? { is_dead: false, incapacitated: true } : {}),
    } : c));
    return true;
  };
  // A correction the server refused: say why, and show the sheet as the server has it
  const refusal = useGameStore(s => s.gmSheetRefusal);
  const refusalSeen = useRef(refusal?.at);
  useEffect(() => {
    if (!refusal || refusal.at === refusalSeen.current || !rosterItem?.id) return;
    refusalSeen.current = refusal.at;
    setTraumaError(refusal.detail);
    apiFetch(`/api/investigators/${rosterItem.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setFullChar(data); })
      .catch(() => {});
  }, [refusal?.at]);
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


  // Every change to this investigator, whoever makes it, reaches this desk as member_update
  // with the whole sheet, and the store keeps the latest (memberSheets). The sheet follows
  // each one that came after it started loading, before or after the fetch answers.
  const live = useGameStore(s => (rosterItem?.id != null ? s.memberSheets[rosterItem.id] : undefined));
  const liveAtFetch = useRef(undefined);
  // None of those reach the desk while its socket is down, so the sheet loads again each
  // time the socket opens again (memberResync), staying up meanwhile
  const resync = useGameStore(s => s.memberResync);
  const shownId = useRef(null);

  useEffect(() => {
    if (!rosterItem?.id) return;
    let superseded = false;
    const again = shownId.current === rosterItem.id;
    if (!again) {
      setLoading(true);
      setError(null);
    }
    liveAtFetch.current = useGameStore.getState().memberSheets[rosterItem.id];
    apiFetch(`/api/investigators/${rosterItem.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This investigator no longer exists.' : 'The sheet could not be loaded. Try again in a moment.');
        return r.json();
      })
      .then(data => {
        if (superseded) return;
        // A member_update that came while the sheet loaded may be newer than this answer
        const newer = useGameStore.getState().memberSheets[rosterItem.id];
        setFullChar(newer && newer !== liveAtFetch.current ? { ...data, ...newer } : data);
        shownId.current = rosterItem.id;
        setLoading(false);
      })
      .catch(e => {
        // A sheet loading again keeps what it shows; the connection banner speaks for the desk
        if (superseded || again) return;
        // fetch itself throws a TypeError when the server cannot be reached
        setError(e instanceof TypeError ? 'Could not reach the server. Check your connection and try again.' : e.message);
        setLoading(false);
      });
    return () => { superseded = true; };
  }, [rosterItem?.id, attempt, resync]);

  useEffect(() => {
    if (!live || live === liveAtFetch.current) return;
    setFullChar(c => (c ? { ...c, ...live } : c));
  }, [live]);

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
            <InvestigatorDossier character={sheet} readOnly traumaEdit={{ setMarks, setScars, dealMark, error: traumaError }} />
            <SpendBack character={sheet} onGive={(resource) => gmReturnSpend(rosterItem.id, resource)} />
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
