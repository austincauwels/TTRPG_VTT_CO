import React, { useState } from 'react';
import { PEN_FONTS } from '../campaignSelector/penFonts';
import { CAMPAIGN_CODE_PATTERN, CAMPAIGN_CODE_RULE } from '../../utils/campaignErrors';

const fieldClass = 'w-full bg-cream/70 border border-sepia/40 px-3 py-2 text-ink outline-none focus:border-oxblood';
const labelClass = 'block font-sans font-bold text-xs tracking-widest uppercase text-sepia mb-1';

// The one form for asking to join a campaign: the campaign code the GM gives out, and the
// handwriting (pen) the player's notebook entries will use, with a preview in that pen.
// Used in the roster book (an investigator not in a campaign) and at the end of the
// character creator. The caller owns code, pen, error and busy; the form owns only
// whether the pen list is open.
export const JoinCampaignForm = ({
  idPrefix, code, onCodeChange, pen, onPenChange, error, busy = false,
  onSubmit, onCancel, autoFocus = false, submitLabel = 'Ask to join',
}) => {
  const [penListOpen, setPenListOpen] = useState(false);
  const currentPen = pen || 'Caveat';
  const trimmed = (code || '').trim();
  const codeLooksWrong = trimmed.length > 0 && !CAMPAIGN_CODE_PATTERN.test(trimmed);
  const canSubmit = !!trimmed && !codeLooksWrong && !busy;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSubmit) onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${idPrefix}-code`} className={labelClass}>Campaign code</label>
        <input
          id={`${idPrefix}-code`}
          type="text"
          autoFocus={autoFocus}
          value={code || ''}
          onChange={e => onCodeChange(e.target.value)}
          autoCapitalize="none" autoCorrect="off" spellCheck="false"
          placeholder="e.g. fairelands-01"
          aria-describedby={`${idPrefix}-code-help`}
          className={`${fieldClass} font-mono text-lg placeholder-sepia/60`}
        />
        <p id={`${idPrefix}-code-help`} className={`font-serif text-base mt-1 leading-snug ${codeLooksWrong ? 'text-oxblood' : 'text-sepia'}`}>
          {codeLooksWrong
            ? `That does not look like a campaign code. Codes are ${CAMPAIGN_CODE_RULE}`
            : 'Your GM gives you this code. Once you ask, the GM approves you before you join play.'}
        </p>
      </div>

      <div>
        <span id={`${idPrefix}-pen-label`} className={labelClass}>Handwriting</span>
        <button
          type="button"
          onClick={() => setPenListOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={penListOpen}
          aria-labelledby={`${idPrefix}-pen-label`}
          className={`${fieldClass} flex items-center justify-between hover:bg-cream transition-colors`}
        >
          <span className="text-xl text-ink" style={{ fontFamily: currentPen }}>{currentPen}</span>
          <span aria-hidden="true" className="text-sm text-sepia ml-2 shrink-0">{penListOpen ? '▲' : '▼'}</span>
        </button>
        {penListOpen && (
          <div role="listbox" aria-labelledby={`${idPrefix}-pen-label`} className="max-h-52 overflow-y-auto border border-sepia/40 border-t-0 bg-cream">
            {PEN_FONTS.map(font => (
              <button
                key={font}
                type="button"
                role="option"
                aria-selected={currentPen === font}
                onClick={() => { onPenChange(font); setPenListOpen(false); }}
                className="w-full px-3 py-2 text-left hover:bg-sepia/10 transition-colors"
                style={{
                  fontFamily: font,
                  fontSize: 20,
                  color: 'rgb(var(--c-ink))',
                  background: currentPen === font ? 'rgb(var(--c-sepia) / 0.12)' : undefined,
                  borderBottom: '1px solid rgb(var(--c-sepia) / 0.08)',
                }}
              >
                {font}
              </button>
            ))}
          </div>
        )}
        <p className="font-serif text-base text-sepia mt-1 leading-snug">Your notebook entries and signature are written in this hand.</p>
        <p className="mt-1 text-xl text-ink/80" style={{ fontFamily: currentPen }}>
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>

      {error && <p role="alert" className="font-serif text-base text-oxblood">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 font-sans font-bold text-sm uppercase tracking-widest text-sepia hover:text-oxblood transition-colors rounded border border-sepia/30">
            Cancel
          </button>
        )}
        <button type="submit" disabled={!canSubmit}
          className="flex-1 sm:flex-none px-6 py-2.5 bg-oxblood text-cream font-sans font-black text-sm tracking-widest uppercase rounded border border-ink hover:brightness-125 transition disabled:opacity-40">
          {busy ? 'Sending…' : submitLabel}
        </button>
      </div>
    </form>
  );
};
