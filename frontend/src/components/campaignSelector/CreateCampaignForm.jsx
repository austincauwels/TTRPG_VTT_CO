import React, { useState } from 'react';
import { createCampaign } from '../../api/campaigns';
import { CAMPAIGN_CODE_PATTERN, CAMPAIGN_CODE_RULE, campaignErrorText, NETWORK_ERROR } from '../../utils/campaignErrors';

const inputClass = 'w-full bg-cream/60 border border-sepia/30 px-3 py-2 font-serif text-xl text-ink placeholder-sepia/90 focus:border-oxblood';

// The one form for starting a campaign. It lives in the Lightkeeper Ledger page of the
// roster book; the GM pamphlet on the desk opens the book straight to it. On success it
// hands the new campaign to onCreated, which takes the GM to the desk.
export const CreateCampaignForm = ({ userId, onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const trimmedCode = code.trim();
  // The server also refuses a code that is only digits (it would read as a character id)
  const codeAllDigits = /^\d+$/.test(trimmedCode);
  const codeLooksWrong = trimmedCode.length > 0 && (!CAMPAIGN_CODE_PATTERN.test(trimmedCode) || codeAllDigits);

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

  return (
    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '1px solid rgb(var(--c-sepia) / 0.15)', background: 'rgb(var(--c-parchment-deep) / 0.3)' }}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <h3 className="font-serif font-bold text-xl text-ink">New campaign</h3>
        <div>
          <label htmlFor="new-campaign-name" className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Campaign name</label>
          <input id="new-campaign-name" type="text" value={name} onChange={e => setName(e.target.value)}
            maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-campaign-code" className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Campaign code</label>
          <input id="new-campaign-code" type="text" value={code} onChange={e => setCode(e.target.value)}
            maxLength={32} autoCapitalize="none" autoCorrect="off" spellCheck="false"
            placeholder="e.g. fairelands-01" aria-describedby="new-campaign-code-help" className={`${inputClass} font-mono`} />
          <p id="new-campaign-code-help" className={`font-serif text-base mt-1 leading-snug ${codeLooksWrong ? 'text-oxblood' : 'text-sepia'}`}>
            {codeAllDigits
              ? 'A campaign code needs at least one letter.'
              : CAMPAIGN_CODE_RULE}
          </p>
        </div>
        {error && <p role="alert" className="font-serif text-base text-oxblood">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={isCreating || !name.trim() || !trimmedCode || codeLooksWrong}
            className="flex-1 bg-oxblood text-cream font-sans font-black text-sm tracking-widest uppercase px-3 py-2.5 rounded border border-ink hover:brightness-125 transition disabled:opacity-40">
            {isCreating ? 'Creating…' : 'Create campaign'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2 font-sans font-bold text-sm uppercase tracking-widest text-sepia hover:text-oxblood transition-colors rounded"
            style={{ border: '1px solid rgb(var(--c-sepia) / 0.3)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
