import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';

const ScarModal = () => {
  const { showScarModal, scarModalData, applyScar, character, closeScarModal } = useGameStore();
  const [medicalNotes, setMedicalNotes] = useState('');

  const [degradeAction, setDegradeAction] = useState('');
  const [advanceAction, setAdvanceAction] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [skipShifts, setSkipShifts] = useState(false);

  const isHardened = character?.specialty_ability === 'Hardened';

  if (!showScarModal) return null;

  const markType = scarModalData?.type || 'Unknown Vector';

  const candelaActions = [
    { key: 'move', label: 'Move' },
    { key: 'strike', label: 'Strike' },
    { key: 'control', label: 'Control' },
    { key: 'hide', label: 'Hide' },
    { key: 'sneak', label: 'Sneak' },
    { key: 'sway', label: 'Sway' },
    { key: 'survey', label: 'Survey' },
    { key: 'read', label: 'Read' },
    { key: 'sense', label: 'Sense' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!medicalNotes.trim()) {
      setErrorMessage('You must document the traumatic manifestation in the ledger.');
      return;
    }

    if (!skipShifts) {
      if (!degradeAction) {
        setErrorMessage('Physiological Protocol Error: Select one Action Rating to decrease.');
        return;
      }
      if (!advanceAction) {
        setErrorMessage('Physiological Protocol Error: Select one Action Rating to increase.');
        return;
      }
      if (degradeAction === advanceAction) {
        setErrorMessage('Diagnostic Violation: Shifting actions must target distinct domains.');
        return;
      }

      const currentScore = character ? character[degradeAction] || 0 : 0;
      if (currentScore <= 0) {
        setErrorMessage(`Invalid Adjustment: Cannot decrease ${degradeAction.toUpperCase()} below 0.`);
        return;
      }

      const currentAdvanceScore = character ? character[advanceAction] || 0 : 0;
      if (currentAdvanceScore >= 3) {
        setErrorMessage(`Invalid Adjustment: Cannot increase ${advanceAction.toUpperCase()} beyond cap (3).`);
        return;
      }
    }

    const shiftNote = skipShifts ? '[HARDENED — no action shift]' : `[SCAR SHIFT: -1 ${degradeAction.toUpperCase()} / +1 ${advanceAction.toUpperCase()}]`;
    const finalNotes = `${medicalNotes.trim()} ${shiftNote}`;

    applyScar({
      scar_text: finalNotes,
      shift_down: skipShifts ? null : degradeAction,
      shift_up: skipShifts ? null : advanceAction,
      skip_shifts: skipShifts,
    });

    setMedicalNotes('');
    setDegradeAction('');
    setAdvanceAction('');
    setSkipShifts(false);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-[520px] max-h-[calc(100dvh-32px)] bg-parchment border-4 border-double border-ink rounded-sm p-5 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative text-ink overflow-x-hidden overflow-y-auto">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-sans font-black text-8xl text-ink/[0.03] tracking-widest select-none pointer-events-none border-8 border-ink/5 rounded-full p-12 rotate-12">
          CLINIC
        </div>

        <button onClick={closeScarModal} className="absolute top-1 right-1 w-11 h-11 sm:top-4 sm:right-4 sm:w-auto sm:h-auto flex items-center justify-center text-sepia hover:text-oxblood font-bold z-20">✕</button>

        <div className="relative z-10 border-b-2 border-ink pb-4 mb-5 text-center">
          <div className="font-serif italic text-sm text-sepia mb-1">
            Hale & Co. Medical Bureau // Psychosomatic Ward
          </div>
          <h2 className="font-display text-2xl uppercase tracking-[0.06em] text-ink flex items-center justify-center gap-2">
            Trauma Intake & Mutation Record
          </h2>
          <div className="inline-block mt-2 sm:mt-0 sm:absolute sm:top-0 sm:right-0 font-sans text-xs bg-oxblood text-cream px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold">
            CRITICAL OVERFLOW
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 font-sans text-xs bg-ink/[0.03] border border-ink/20 p-3 rounded-sm mb-4">
          <div>
            <span className="text-sepia block uppercase text-xs font-bold">[ SUBJECT PATIENT ]</span>
            <span className="text-ink font-bold uppercase text-xs">{character?.name || "UNIDENTIFIED OBJECT"}</span>
          </div>
          <div>
            <span className="text-sepia block uppercase text-xs font-bold">[ OVERRUN VECTOR ]</span>
            <span className="text-oxblood font-black uppercase text-xs underline">{markType.toUpperCase()} RE-EXAMINATION</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          {/* Hardened ability — skip action shifts */}
          {isHardened && (
            <label className="flex items-center gap-2 cursor-pointer bg-cream border border-parchment-deep rounded px-3 py-2">
              <input
                type="checkbox"
                checked={skipShifts}
                onChange={(e) => setSkipShifts(e.target.checked)}
                className="text-ink focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-sepia"
              />
              <span className="font-serif text-sm font-bold text-sepia">
                Hardened — skip action rating shifts
              </span>
            </label>
          )}

          <div className={`grid grid-cols-2 gap-4 ${skipShifts ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="border border-sepia/40 bg-cream p-3 rounded-sm flex flex-col">
              <span className="block font-sans text-xs font-black uppercase tracking-wider text-oxblood border-b border-parchment-deep pb-1 mb-2">
                1. Narrative Loss (-1 Point)
              </span>
              <div className="grid grid-cols-1 gap-1 font-serif text-sm">
                {candelaActions.map((act) => {
                  const currentScore = character ? character[act.key] ?? 0 : 0;
                  const isDisabled = currentScore <= 0;

                  return (
                    <label 
                      key={act.key} 
                      className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-1 hover:bg-parchment-deep/50 rounded transition-colors ${isDisabled ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="degrade_action" 
                          value={act.key}
                          disabled={isDisabled}
                          checked={degradeAction === act.key}
                          onChange={(e) => setDegradeAction(e.target.value)}
                          className="text-oxblood focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-sepia"
                        />
                        <span className="capitalize font-bold text-ink">{act.label}</span>
                      </div>
                      <span className="font-mono tabular-nums text-xs text-sepia font-bold">[{currentScore}]</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="border border-sepia/40 bg-cream p-3 rounded-sm flex flex-col">
              <span className="block font-sans text-xs font-black uppercase tracking-wider text-ink border-b border-parchment-deep pb-1 mb-2">
                2. Hardened Focus (+1 Point)
              </span>
              <div className="grid grid-cols-1 gap-1 font-serif text-sm">
                {candelaActions.map((act) => {
                  const currentScore = character ? character[act.key] ?? 0 : 0;
                  const isDisabled = currentScore >= 3;

                  return (
                    <label 
                      key={act.key} 
                      className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-1 hover:bg-parchment-deep/50 rounded transition-colors ${isDisabled ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="advance_action" 
                          value={act.key}
                          disabled={isDisabled}
                          checked={advanceAction === act.key}
                          onChange={(e) => setAdvanceAction(e.target.value)}
                          className="text-ink focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-sepia"
                        />
                        <span className="capitalize font-bold text-ink">{act.label}</span>
                      </div>
                      <span className="font-mono tabular-nums text-xs text-sepia font-bold">[{currentScore}]</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-cream border border-sepia/40 p-4 rounded-sm shadow-inner relative">
            <label className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-2 flex items-center gap-1.5 border-b border-parchment-deep pb-1">
              Post-Mortem Trauma Ledger Notes
            </label>
            <textarea
              required
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="[ CLASSIFY THE PERMANENT SCAR... ]"
              className="w-full bg-transparent border-none rounded-none p-0 text-base font-serif leading-relaxed text-ink resize-none focus:outline-none focus:ring-0 shadow-none placeholder-sepia/70 placeholder:italic"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-oxblood)/0.08) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}
            />
          </div>

          {errorMessage && (
            <div className="p-2 border border-oxblood bg-oxblood/10 rounded-sm text-oxblood font-sans text-xs text-center uppercase tracking-tight font-bold">
              ⚠ {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" className="px-5 py-2.5 bg-ink text-cream hover:bg-oxblood font-sans font-black text-xs uppercase tracking-widest rounded-sm transition-colors shadow-md flex items-center gap-2 group">
              <span>Affix Official Signature</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScarModal;