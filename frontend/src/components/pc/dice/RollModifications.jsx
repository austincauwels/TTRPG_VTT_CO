import React from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { ACTION_LABEL } from '../../../game/actions';

export const RollModifications = ({
  canResist, visiblePrompts, lastRoll, character, resistMax, resistSpent, lastRollDriveKey,
  burnResistance, usePostRollAbility, drivePickerPrompt, setDrivePickerPrompt, setDismissedPrompts,
}) => (
    <div className="bg-ink border border-parchment-deep/20 px-4 py-3 rounded-sm space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <SafeIcon name="GiDiceSixFacesFive" size={15} className="text-parchment-deep/80" />
        <span className="font-sans text-xs font-black uppercase tracking-widest text-parchment-deep/80">After the roll</span>
      </div>
      {canResist && (
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-sm text-parchment-deep">
            Burn 1 {lastRollDriveKey ? lastRollDriveKey.charAt(0).toUpperCase() + lastRollDriveKey.slice(1) : ''} resistance to reroll {ACTION_LABEL[lastRoll?.action] || 'the action'}
            {(lastRoll?.action && (character?.[lastRoll.action] || 0) === 0)
              ? ' (rating 0: two dice, take the lowest)'
              : ` with ${lastRoll?.action ? (character?.[lastRoll.action] || 0) : 0} dice`}.
            {' '}{resistMax - resistSpent} left.
          </p>
          <button
            onClick={() => burnResistance(lastRoll.action, lastRollDriveKey)}
            className="shrink-0 px-3 py-1 font-sans text-xs font-black uppercase tracking-widest border border-oxblood-lit/60 text-oxblood-lit hover:bg-oxblood hover:text-cream transition-all rounded-sm"
          >
            Burn and reroll
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
              aria-label={`Skip ${prompt.key}`}
              className="px-2 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/30 text-parchment-deep/80 hover:text-cream rounded-sm transition-all">
              Skip
            </button>
          </div>
        </div>
      ))}
    </div>
);
