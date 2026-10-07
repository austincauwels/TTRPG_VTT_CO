import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { ACTION_LABEL, scarShiftNote } from '../../game/actions';
import { hasAbility } from '../../game/abilities';
import { SCAR_ABILITIES } from '../../game/abilityUses';
import { useDialog } from '../shared/useDialog';
import { FormLine } from '../shared/PrintMarks';
import { ScarIcon } from '../shared/ScarIcon';

// The nine actions in the dossier's order, with the rulebook's names (the keys sneak and
// read are Read and Focus).
const ACTION_KEYS = ['move', 'strike', 'control', 'sway', 'sneak', 'hide', 'survey', 'read', 'sense'];

const ScarModal = () => {
  const { showScarModal, scarModalData, pendingScar, applyScar, character, deferScar, cancelAbilityScar, scarError } = useGameStore();
  const [medicalNotes, setMedicalNotes] = useState('');

  const [degradeAction, setDegradeAction] = useState('');
  const [advanceAction, setAdvanceAction] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [skipShifts, setSkipShifts] = useState(false);

  // A form opened for a new scar starts blank; one opened again after the server refused
  // it (same seq) keeps what the player wrote
  const formSeq = scarModalData?.seq;
  const seenSeq = useRef(formSeq);
  useEffect(() => {
    if (formSeq == null || formSeq === seenSeq.current) return;
    seenSeq.current = formSeq;
    setMedicalNotes('');
    setDegradeAction('');
    setAdvanceAction('');
    setSkipShifts(false);
    setErrorMessage('');
  }, [formSeq]);

  // Hardened (p. 31) keeps the ratings; the server allows it for Hardened only
  const isHardened = hasAbility(character, 'Hardened');
  // A scar the player takes for Not Again (p. 29) or Forbidden Ritual (p. 32). A Not Again
  // scar leaves the ratings alone.
  const ability = scarModalData?.ability || null;
  const keepsByAbility = !!SCAR_ABILITIES[ability]?.keepsRatings;
  const keep = keepsByAbility || skipShifts;

  // Escape is "Decide later", like the button: the scar stays pending, nothing is lost.
  // A scar taken for an ability is not owed, so Escape cancels it.
  const dialogRef = useDialog({ open: !!showScarModal, onClose: ability ? cancelAbilityScar : deferScar });

  if (!showScarModal) return null;

  const rawType = scarModalData?.type || pendingScar?.type || '';
  const markName = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase() : 'Mark';
  // The fourth scar kills the investigator (FAQ, Death)
  const isFourthScar = (character?.scars_count || 0) >= 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!medicalNotes.trim()) {
      setErrorMessage('Describe the scar before you record it.');
      return;
    }

    if (!keep) {
      if (!degradeAction) {
        setErrorMessage('Choose an action to lower by 1.');
        return;
      }
      if (!advanceAction) {
        setErrorMessage('Choose an action to raise by 1.');
        return;
      }
      if (degradeAction === advanceAction) {
        setErrorMessage('Pick two different actions: one to lower and one to raise.');
        return;
      }

      const currentScore = character ? character[degradeAction] || 0 : 0;
      if (currentScore <= 0) {
        setErrorMessage(`${ACTION_LABEL[degradeAction]} is already 0. Choose an action rated 1 or higher to lower.`);
        return;
      }

      const currentAdvanceScore = character ? character[advanceAction] || 0 : 0;
      if (currentAdvanceScore >= 3) {
        setErrorMessage(`${ACTION_LABEL[advanceAction]} is already 3, the highest rating. Choose another action to raise.`);
        return;
      }
    }

    const shiftNote = keep ? scarShiftNote(null, null, keepsByAbility ? ability : 'Hardened') : scarShiftNote(degradeAction, advanceAction);
    const finalNotes = `${medicalNotes.trim()} ${shiftNote}`;

    const sent = applyScar({
      scar_text: finalNotes,
      shift_down: keep ? null : degradeAction,
      shift_up: keep ? null : advanceAction,
      skip_shifts: keep,
      ...(ability ? { ability } : {}),
    });
    if (sent === false) {
      // The form stays open with everything the player chose and wrote.
      setErrorMessage('The scar was not recorded: the desk is not connected to the table. Your description is kept; press Record scar again once the connection is back.');
    }
    // Sent: the fields are kept until a new scar opens the form, so a refusal from the
    // server can open it again as it was
  };

  const actionColumn = ({ name, title, value, onChange, isDisabled, titleClass }) => (
    <fieldset className="border border-sepia/40 bg-cream p-3 rounded-sm flex flex-col min-w-0">
      <legend className="sr-only">{title}</legend>
      <span aria-hidden="true" className={`block font-sans text-xs font-black uppercase tracking-wider border-b border-parchment-deep pb-1 mb-2 ${titleClass}`}>
        {title}
      </span>
      <div className="grid grid-cols-1 gap-1 font-serif text-base">
        {ACTION_KEYS.map((key) => {
          const currentScore = character ? character[key] ?? 0 : 0;
          const disabled = isDisabled(currentScore);
          return (
            <label
              key={key}
              className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-1 hover:bg-parchment-deep/50 rounded transition-colors ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={key}
                  disabled={disabled}
                  checked={value === key}
                  onChange={(e) => onChange(e.target.value)}
                  className="accent-oxblood w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-bold text-ink">{ACTION_LABEL[key]}</span>
              </span>
              <span className="font-mono tabular-nums text-sm text-sepia font-bold" aria-label={`rated ${currentScore}`}>{currentScore}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 font-serif">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="scar-title"
        className="w-full max-w-[520px] max-h-[calc(100dvh-32px)] bg-parchment border-4 border-double border-ink rounded-sm p-5 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative text-ink overflow-x-hidden overflow-y-auto">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

        <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-sans font-black text-8xl text-ink/[0.03] tracking-widest select-none pointer-events-none border-8 border-ink/5 rounded-full p-12 rotate-12">
          CLINIC
        </div>

        <div className="relative z-10 border-b-2 border-ink pb-4 mb-5">
          <FormLine className="block mb-2">Form C.O. 14 · Trauma record</FormLine>
          <h2 id="scar-title" className="font-display text-2xl uppercase tracking-[0.06em] text-ink flex items-center gap-3">
            <ScarIcon size={38} className="text-ink -mt-1" />
            A New Scar
          </h2>
          <p className="font-serif text-base text-ink mt-2 leading-snug">
            {ability === 'Not Again'
              ? `${character?.name || 'Your investigator'} uses Not Again: an automatic full success on the action. Tell your circle how they got this scar, and why the lesson is helping them succeed here. The action ratings stay as they are.`
              : ability === 'Forbidden Ritual'
                ? `${character?.name || 'Your investigator'} uses Forbidden Ritual and takes a Bleed scar.`
                : `${character?.name || 'Your investigator'}'s ${markName} track is full.`}
          </p>
          {isFourthScar && (
            <p className="font-serif text-base font-bold text-oxblood mt-2 leading-snug">
              This is the fourth scar. When you record it, {character?.name || 'your investigator'} dies.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="relative z-10 space-y-4">
          {/* Hardened ability: skip action shifts */}
          {isHardened && !keepsByAbility && (
            <label className="flex items-center gap-2 cursor-pointer bg-cream border border-parchment-deep rounded px-3 py-2">
              <input
                type="checkbox"
                checked={skipShifts}
                onChange={(e) => setSkipShifts(e.target.checked)}
                className="accent-oxblood w-4 h-4 cursor-pointer"
              />
              <span className="font-serif text-base font-bold text-sepia">
                Use Hardened: keep my action ratings as they are
              </span>
            </label>
          )}

          {!keepsByAbility && <div className={`grid grid-cols-2 gap-4 ${skipShifts ? 'opacity-40 pointer-events-none' : ''}`}>
            {actionColumn({
              name: 'degrade_action',
              title: 'Lower by 1',
              value: degradeAction,
              onChange: setDegradeAction,
              isDisabled: (score) => score <= 0,
              titleClass: 'text-oxblood',
            })}
            {actionColumn({
              name: 'advance_action',
              title: 'Raise by 1',
              value: advanceAction,
              onChange: setAdvanceAction,
              isDisabled: (score) => score >= 3,
              titleClass: 'text-ink',
            })}
          </div>}

          <div className="bg-cream border border-sepia/40 p-4 rounded-sm shadow-inner relative">
            <label htmlFor="scar-notes" className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-2 border-b border-parchment-deep pb-1">
              Describe the scar
            </label>
            <textarea
              id="scar-notes"
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              className="w-full bg-transparent border-none rounded-none p-0 text-base font-serif leading-relaxed text-ink resize-none focus:ring-0 shadow-none placeholder-sepia/90 placeholder:italic"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-oxblood)/0.08) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}
            />
          </div>

          {(errorMessage || scarError) && (
            <p role="alert" className="p-2 border border-oxblood bg-oxblood/10 rounded-sm text-oxblood font-serif text-base text-center">
              {errorMessage || scarError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={ability ? cancelAbilityScar : deferScar}
              className="min-h-[40px] px-3 font-sans text-xs font-bold uppercase tracking-widest text-sepia hover:text-oxblood border border-sepia/40 hover:border-oxblood/50 rounded-sm transition-colors"
            >
              {ability ? 'Cancel' : 'Decide later'}
            </button>
            <button type="submit" className="px-5 py-2.5 bg-ink text-cream hover:bg-oxblood font-sans font-black text-xs uppercase tracking-widest rounded-sm transition-colors shadow-md">
              Record scar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScarModal;
