import React from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

export const RollModifications = ({
  canResist, visiblePrompts, lastRoll, character, resistMax, resistSpent, lastRollDriveKey,
  burnResistance, usePostRollAbility, drivePickerPrompt, setDrivePickerPrompt, setDismissedPrompts,
}) => (
    <div className="bg-ink border border-parchment-deep/20 px-4 py-3 rounded-sm space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <SafeIcon name="GiDiceSixFacesFive" size={15} className="text-parchment-deep/80" />
        <span className="font-sans text-xs font-black uppercase tracking-widest text-parchment-deep/80">Roll Modifications</span>
      </div>
      {canResist && (
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-sm text-parchment-deep">
            Burn resistance — reroll {lastRoll?.action ? (character?.[lastRoll.action] || 0) : 0}d
            {(lastRoll?.action && (character?.[lastRoll.action] || 0) === 0) ? ' (2d, take lowest)' : ''}
            &nbsp;·&nbsp;{resistMax - resistSpent} pip{resistMax - resistSpent !== 1 ? 's' : ''} remaining
          </p>
          <button
            onClick={() => burnResistance(lastRoll.action, lastRollDriveKey)}
            className="shrink-0 px-3 py-1 font-sans text-xs font-black uppercase tracking-widest border border-oxblood-lit/60 text-oxblood-lit hover:bg-oxblood hover:text-cream transition-all rounded-sm"
          >
            Burn
          </button>
        </div>
      )}

      {/* POST-ROLL ABILITY PROMPTS */}
      {visiblePrompts.map(prompt => (
        <div key={prompt.key} className="flex items-center justify-between gap-3 border-t border-parchment-deep/20 pt-2">
          <p className="font-serif text-sm text-parchment-deep flex-1">◈ {prompt.label}</p>
          <div className="flex gap-1.5 shrink-0">
            {prompt.drivePicker ? (
              drivePickerPrompt === prompt.key ? (
                <>
                  {['nerve','cunning','intuition'].map(d => (
                    <button key={d} onClick={() => { usePostRollAbility(prompt.key, { drive: d }); setDrivePickerPrompt(null); setDismissedPrompts(p => [...p, prompt.key]); }}
                      className="px-2 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/50 text-parchment-deep hover:bg-parchment-deep/15 rounded-sm transition-all">
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </>
              ) : (
                <button onClick={() => setDrivePickerPrompt(prompt.key)}
                  className="px-3 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/50 text-parchment-deep hover:bg-parchment-deep/10 rounded-sm transition-all">
                  Use
                </button>
              )
            ) : (
              <button onClick={() => { usePostRollAbility(prompt.key, prompt.params); setDismissedPrompts(p => [...p, prompt.key]); }}
                className="px-3 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/50 text-parchment-deep hover:bg-parchment-deep/10 rounded-sm transition-all">
                Use
              </button>
            )}
            <button onClick={() => setDismissedPrompts(p => [...p, prompt.key])}
              className="px-2 py-0.5 font-sans text-xs border border-parchment-deep/30 text-parchment-deep/70 hover:text-cream rounded-sm transition-all">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
);
