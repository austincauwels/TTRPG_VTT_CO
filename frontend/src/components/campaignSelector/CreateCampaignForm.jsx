import React, { useId, useState } from 'react';
import { createCampaign } from '../../api/campaigns';
import { CAMPAIGN_CODE_PATTERN, CAMPAIGN_CODE_RULE, campaignErrorText, NETWORK_ERROR } from '../../utils/campaignErrors';

const inputClass = {
  page: 'w-full bg-cream/60 border border-sepia/30 px-3 py-2 font-serif text-xl text-ink placeholder-sepia/90 focus:border-oxblood',
  card: 'w-full bg-cream/60 border border-sepia/40 px-2 py-1 sm:py-1.5 font-serif text-base sm:text-lg text-ink placeholder-sepia/90 focus:border-oxblood',
};

// The one form for starting a campaign. It is printed on the back of the GM ticket on the
// hub (variant "card", which the ticket's close mark turns back over) and sits on the
// Lightkeeper Ledger page of the roster book (variant "page", with its own Cancel). On
// success it hands the new campaign to onCreated, which takes the GM to the desk. The card
// is small, so it shows the code's format rule only when the code breaks it.
export const CreateCampaignForm = ({ userId, onCreated, onCancel, variant = 'page' }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const id = useId();
  const card = variant === 'card';

  const trimmedCode = code.trim();
  // The server also refuses a code that is only digits (it would read as a character id)
  const codeAllDigits = /^\d+$/.test(trimmedCode);
  const codeLooksWrong = trimmedCode.length > 0 && (!CAMPAIGN_CODE_PATTERN.test(trimmedCode) || codeAllDigits);
  const showRule = !card || codeLooksWrong;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !trimmedCode || codeLooksWrong) return;
    setIsCreating(true);
    setError('');
    try {
      const res = await createCampaign(name.trim(), trimmedCode, userId);
      if (res.ok) {
        const camp = await res.json();
        setName('');
        setCode('');
        await onCreated(camp);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(campaignErrorText(err.detail, 'The campaign could not be created. Try again in a moment.'));
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setIsCreating(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className={card ? 'space-y-2 sm:space-y-3' : 'space-y-3'} noValidate>
      {/* On a phone the card is small and its front already says New Campaign, so the
          heading is kept for screen readers only */}
      <h3 className={`font-serif font-bold text-ink ${card ? 'sr-only sm:not-sr-only text-xl leading-tight' : 'text-xl'}`}>New campaign</h3>
      <div>
        <label htmlFor={`${id}-name`} className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Campaign name</label>
        <input id={`${id}-name`} type="text" value={name} onChange={e => setName(e.target.value)}
          maxLength={80} className={inputClass[variant]} />
      </div>
      <div>
        <label htmlFor={`${id}-code`} className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Campaign code</label>
        <input id={`${id}-code`} type="text" value={code} onChange={e => setCode(e.target.value)}
          maxLength={32} autoCapitalize="none" autoCorrect="off" spellCheck="false"
          placeholder="e.g. fairelands-01"
          aria-describedby={showRule ? `${id}-help` : undefined}
          aria-invalid={codeLooksWrong || undefined}
          className={`${inputClass[variant]} font-mono ${card ? 'text-sm sm:text-base' : ''}`} />
        {showRule && (
          <p id={`${id}-help`} className={`font-serif mt-1 leading-snug ${card ? 'text-sm' : 'text-base'} ${codeLooksWrong ? 'text-oxblood' : 'text-sepia'}`}>
            {codeAllDigits
              ? 'A campaign code needs at least one letter.'
              : CAMPAIGN_CODE_RULE}
          </p>
        )}
      </div>
      {error && <p role="alert" className={`font-serif text-oxblood leading-snug ${card ? 'text-sm' : 'text-base'}`}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isCreating || !name.trim() || !trimmedCode || codeLooksWrong}
          className={`flex-1 bg-oxblood text-cream font-sans font-black tracking-widest uppercase rounded border border-ink hover:brightness-125 transition disabled:opacity-40 ${
            card ? 'text-xs sm:text-sm leading-tight px-2 py-2 sm:py-2.5' : 'text-sm px-3 py-2.5'}`}>
          {isCreating ? 'Creating…' : 'Create campaign'}
        </button>
        {!card && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 font-sans font-bold text-sm uppercase tracking-widest text-sepia hover:text-oxblood transition-colors rounded"
            style={{ border: '1px solid rgb(var(--c-sepia) / 0.3)' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  if (card) return form;
  return (
    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '1px solid rgb(var(--c-sepia) / 0.15)', background: 'rgb(var(--c-parchment-deep) / 0.3)' }}>
      {form}
    </div>
  );
};
