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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-xl bg-[#f4f1ea] border-4 border-double border-stone-800 rounded-sm p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative text-stone-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-sans font-black text-8xl text-stone-900/[0.02] tracking-widest select-none pointer-events-none border-8 border-stone-900/5 rounded-full p-12 rotate-12">
          CLINIC
        </div>

        <button onClick={closeScarModal} className="absolute top-4 right-4 text-stone-400 hover:text-red-900 font-bold z-20">✕</button>

        <div className="relative z-10 border-b-2 border-stone-800 pb-4 mb-5 text-center">
          <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-stone-500 mb-1">
            Hale & Co. Medical Bureau // Psychosomatic Ward
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-stone-900 flex items-center justify-center gap-2">
            Trauma Intake & Mutation Record
          </h2>
          <div className="absolute top-0 right-0 font-mono text-[9px] bg-red-900 text-[#fbf6eb] px-1.5 py-0.5 rounded-sm uppercase tracking-tight animate-pulse font-bold">
            CRITICAL OVERFLOW
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 font-mono text-[11px] bg-stone-900/[0.03] border border-stone-800/20 p-3 rounded-sm mb-4">
          <div>
            <span className="text-stone-500 block uppercase text-[9px] font-bold">[ SUBJECT PATIENT ]</span>
            <span className="text-stone-900 font-bold uppercase text-xs">{character?.name || "UNIDENTIFIED OBJECT"}</span>
          </div>
          <div>
            <span className="text-stone-500 block uppercase text-[9px] font-bold">[ OVERRUN VECTOR ]</span>
            <span className="text-[#721c15] font-black uppercase text-xs underline">{markType.toUpperCase()} RE-EXAMINATION</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          {/* Hardened ability — skip action shifts */}
          {isHardened && (
            <label className="flex items-center gap-2 cursor-pointer bg-stone-100 border border-stone-300 rounded px-3 py-2">
              <input
                type="checkbox"
                checked={skipShifts}
                onChange={(e) => setSkipShifts(e.target.checked)}
                className="text-stone-900 focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-stone-600"
              />
              <span className="font-mono text-[11px] font-bold text-stone-700">
                Hardened — skip action rating shifts
              </span>
            </label>
          )}

          <div className={`grid grid-cols-2 gap-4 ${skipShifts ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="border border-stone-400 bg-stone-50 p-3 rounded-sm flex flex-col">
              <span className="block font-sans text-[9px] font-black uppercase tracking-wider text-red-900 border-b border-stone-300 pb-1 mb-2">
                1. Narrative Loss (-1 Point)
              </span>
              <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                {candelaActions.map((act) => {
                  const currentScore = character ? character[act.key] ?? 0 : 0;
                  const isDisabled = currentScore <= 0;

                  return (
                    <label 
                      key={act.key} 
                      className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-1 hover:bg-stone-200/50 rounded transition-colors ${isDisabled ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="degrade_action" 
                          value={act.key}
                          disabled={isDisabled}
                          checked={degradeAction === act.key}
                          onChange={(e) => setDegradeAction(e.target.value)}
                          className="text-[#721c15] focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-stone-600"
                        />
                        <span className="capitalize font-bold text-stone-800">{act.label}</span>
                      </div>
                      <span className="text-stone-500 font-bold">[{currentScore}]</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="border border-stone-400 bg-stone-50 p-3 rounded-sm flex flex-col">
              <span className="block font-sans text-[9px] font-black uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1 mb-2">
                2. Hardened Focus (+1 Point)
              </span>
              <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                {candelaActions.map((act) => {
                  const currentScore = character ? character[act.key] ?? 0 : 0;
                  const isDisabled = currentScore >= 3;

                  return (
                    <label 
                      key={act.key} 
                      className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-1 hover:bg-stone-200/50 rounded transition-colors ${isDisabled ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="advance_action" 
                          value={act.key}
                          disabled={isDisabled}
                          checked={advanceAction === act.key}
                          onChange={(e) => setAdvanceAction(e.target.value)}
                          className="text-stone-900 focus:ring-0 w-3 h-3 cursor-pointer bg-transparent border-stone-600"
                        />
                        <span className="capitalize font-bold text-stone-800">{act.label}</span>
                      </div>
                      <span className="text-stone-500 font-bold">[{currentScore}]</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-[#fdfcf7] border border-stone-400 p-4 rounded-sm shadow-inner relative">
            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-[#721c15] block mb-2 flex items-center gap-1.5 border-b border-stone-200 pb-1">
              Post-Mortem Trauma Ledger Notes
            </label>
            <textarea
              required
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="[ CLASSIFY THE PERMANENT SCAR... ]"
              className="w-full bg-transparent border-none rounded-none p-0 text-xs font-mono leading-relaxed text-stone-900 resize-none focus:outline-none focus:ring-0 shadow-none placeholder-stone-400"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(114, 28, 21, 0.08) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}
            />
          </div>

          {errorMessage && (
            <div className="p-2 border border-red-700 bg-red-950/10 rounded-sm text-red-800 font-mono text-[10px] text-center uppercase tracking-tight font-bold">
              ⚠ {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" className="px-5 py-2.5 bg-stone-900 text-[#fbf6eb] hover:bg-[#721c15] font-sans font-black text-[11px] uppercase tracking-widest rounded-sm transition-colors shadow-md flex items-center gap-2 group">
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