import React from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

export const RollModifications = ({
  canResist, visiblePrompts, lastRoll, character, resistMax, resistSpent, lastRollDriveKey,
  burnResistance, usePostRollAbility, drivePickerPrompt, setDrivePickerPrompt, setDismissedPrompts,
}) => (
    <div className="bg-[#1a1311] border border-[#3a2a1a] px-4 py-3 rounded-sm space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <SafeIcon name="GiDiceSixFacesFive" size={15} className="text-[#a08040]/70" />
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#a08040]/70">Roll Modifications</span>
      </div>
      {canResist && (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-[#a08040]/80">
            Burn resistance — reroll {lastRoll?.action ? (character?.[lastRoll.action] || 0) : 0}d
            {(lastRoll?.action && (character?.[lastRoll.action] || 0) === 0) ? ' (2d, take lowest)' : ''}
            &nbsp;·&nbsp;{resistMax - resistSpent} pip{resistMax - resistSpent !== 1 ? 's' : ''} remaining
          </p>
          <button
            onClick={() => burnResistance(lastRoll.action, lastRollDriveKey)}
            className="shrink-0 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border border-[#721c15]/60 text-[#721c15] hover:bg-[#721c15] hover:text-[#fdfaf4] transition-all rounded-sm"
          >
            Burn
          </button>
        </div>
      )}

      {/* POST-ROLL ABILITY PROMPTS */}
      {visiblePrompts.map(prompt => (
        <div key={prompt.key} className="flex items-center justify-between gap-3 border-t border-[#3a2a1a] pt-2">
          <p className="font-mono text-[10px] text-[#d4af37]/80 flex-1">◈ {prompt.label}</p>
          <div className="flex gap-1.5 shrink-0">
            {prompt.drivePicker ? (
              drivePickerPrompt === prompt.key ? (
                <>
                  {['nerve','cunning','intuition'].map(d => (
                    <button key={d} onClick={() => { usePostRollAbility(prompt.key, { drive: d }); setDrivePickerPrompt(null); setDismissedPrompts(p => [...p, prompt.key]); }}
                      className="px-2 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/80 hover:bg-[#d4af37]/20 rounded-sm transition-all">
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </>
              ) : (
                <button onClick={() => setDrivePickerPrompt(prompt.key)}
                  className="px-3 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/70 hover:bg-[#d4af37]/10 rounded-sm transition-all">
                  Use
                </button>
              )
            ) : (
              <button onClick={() => { usePostRollAbility(prompt.key, prompt.params); setDismissedPrompts(p => [...p, prompt.key]); }}
                className="px-3 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/70 hover:bg-[#d4af37]/10 rounded-sm transition-all">
                Use
              </button>
            )}
            <button onClick={() => setDismissedPrompts(p => [...p, prompt.key])}
              className="px-2 py-0.5 font-mono text-[10px] border border-[#5a4030]/40 text-[#5a4030]/50 hover:text-[#a08040] rounded-sm transition-all">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
);
