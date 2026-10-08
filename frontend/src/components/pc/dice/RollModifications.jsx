import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { ACTION_LABEL } from '../../../game/actions';

const DRIVES = ['nerve', 'cunning', 'intuition'];
const promptButton = 'px-3 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/50 text-parchment-deep hover:bg-parchment-deep/10 rounded-sm transition-all disabled:opacity-40';
const promptSelect = 'bg-ink border border-parchment-deep/40 text-parchment-deep rounded-sm text-sm font-serif px-1 py-0.5';

// A post-roll ability used on an ally (Patch Up, Resuscitation): which ally, and for
// Resuscitation on a 4-5 which 3 drive points pay for it. The server checks the ally.
const AllyPrompt = ({ prompt, allies, character, onUse, onSkip }) => {
  const [ally, setAlly] = useState('');
  const [split, setSplit] = useState({ nerve: 0, cunning: 0, intuition: 0 });
  const total = DRIVES.reduce((n, d) => n + split[d], 0);
  const ready = ally && (!prompt.driveSplit || total === prompt.driveSplit);
  return (
    <div className="border-t border-parchment-deep/20 pt-2 space-y-1.5">
      <p className="font-serif text-sm text-parchment-deep">{prompt.label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label={`Ally for ${prompt.key}`} value={ally} onChange={e => setAlly(e.target.value)} className={promptSelect}>
          <option value="">{allies.length ? 'Choose an ally' : 'No ally in your circle'}</option>
          {allies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {!!prompt.driveSplit && DRIVES.map(d => (
          <label key={d} className="flex items-center gap-1 font-sans text-xs font-black uppercase text-parchment-deep">
            {d}
            <select aria-label={`${d} to pay`} value={split[d]} onChange={e => setSplit(s => ({ ...s, [d]: Number(e.target.value) }))} className={promptSelect}>
              {Array.from({ length: Math.min(3, character?.[`${d}_current`] || 0) + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
        {!!prompt.driveSplit && <span className="font-mono text-xs text-parchment-deep">{total} / {prompt.driveSplit}</span>}
        <button type="button" disabled={!ready} className={promptButton}
          onClick={() => onUse(prompt.key, { ...prompt.params, target_character_id: Number(ally), ...(prompt.driveSplit ? { cost: split } : {}) })}>
          Use
        </button>
        <button type="button" onClick={onSkip} aria-label={`Skip ${prompt.key}`}
          className="px-2 py-0.5 font-sans text-xs font-black uppercase border border-parchment-deep/30 text-parchment-deep/80 hover:text-cream rounded-sm transition-all">
          Skip
        </button>
      </div>
    </div>
  );
};

export const RollModifications = ({
  canResist, visiblePrompts, lastRoll, character, resistMax, resistSpent, lastRollDriveKey,
  burnResistance, usePostRollAbility, drivePickerPrompt, setDrivePickerPrompt, setDismissedPrompts, allies = [],
}) => (
    <div className="bg-ink border border-parchment-deep/20 px-4 py-3 rounded-sm space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <SafeIcon name="GiDiceSixFacesFive" size={15} className="text-parchment-deep/80" />
        <span className="font-sans text-xs font-black uppercase tracking-widest text-parchment-deep/80">After the roll</span>
      </div>
      {canResist && (() => {
        const drive = lastRollDriveKey ? lastRollDriveKey.charAt(0).toUpperCase() + lastRollDriveKey.slice(1) : '';
        const action = ACTION_LABEL[lastRoll?.action] || '';
        const rating = lastRoll?.action ? (character?.[lastRoll.action] || 0) : 0;
        // A reroll throws the action rating alone, without drive
        const pool = rating === 0 ? '2 dice, lowest counts' : `${rating} ${rating === 1 ? 'die' : 'dice'}`;
        const left = resistMax - resistSpent;
        return (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <p className="font-sans text-xs font-black uppercase tracking-widest text-parchment-deep flex items-center gap-2">
                {drive} resistance
                {/* Filled: a point still there to burn; empty: burned (as on the sheet) */}
                <span className="flex items-center gap-1" role="img" aria-label={`${left} of ${resistMax} left`}>
                  {Array.from({ length: resistMax }).map((_, i) => (
                    <svg key={i} aria-hidden="true" width="12" height="10" viewBox="0 0 14 12">
                      <polygon points="7,1 1,11 13,11" strokeWidth="1.5"
                        style={{ fill: i < left ? 'rgb(var(--c-parchment-deep))' : 'transparent', stroke: i < left ? 'rgb(var(--c-parchment-deep))' : 'rgb(var(--c-parchment-deep) / 0.45)' }} />
                    </svg>
                  ))}
                </span>
              </p>
              <p className="font-serif text-sm text-parchment-deep mt-0.5">{action}: {pool}</p>
            </div>
            <button
              onClick={() => burnResistance(lastRoll.action, lastRollDriveKey)}
              className="shrink-0 min-h-[36px] px-3 py-1 font-sans text-xs font-black uppercase tracking-widest border border-oxblood-lit/60 text-oxblood-lit hover:bg-oxblood hover:text-cream transition-all rounded-sm"
            >
              Burn and reroll
            </button>
          </div>
        );
      })()}

      {/* POST-ROLL ABILITY PROMPTS */}
      {visiblePrompts.map(prompt => prompt.allyPicker ? (
        <AllyPrompt key={prompt.key} prompt={prompt} allies={allies} character={character}
          onUse={(key, params) => { usePostRollAbility(key, params); setDismissedPrompts(p => [...p, key]); }}
          onSkip={() => setDismissedPrompts(p => [...p, prompt.key])} />
      ) : (
        <div key={prompt.key} className="flex items-center justify-between gap-3 border-t border-parchment-deep/20 pt-2">
          <p className="font-serif text-sm text-parchment-deep flex-1">{prompt.label}</p>
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
