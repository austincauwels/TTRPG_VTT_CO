import React from 'react';
import { JoinCampaignForm } from '../shared/JoinCampaignForm';

// An investigator who is not in a campaign: a row that opens the join form. trailing sits
// at the row's end beside it (the Delete control).
export const UnaffiliatedCharacterRow = ({ char, form, setJoinForms, handleJoinForChar, trailing = null }) => {
  const setField = (field, value) => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], [field]: value } }));
  return (
    <div style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
      <div className="flex flex-wrap items-center">
      <button
        onClick={() => setField('expanded', !form.expanded)}
        aria-expanded={!!form.expanded}
        className="flex-1 min-w-0 max-sm:basis-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left"
      >
        <span aria-hidden="true" className="text-sepia text-lg shrink-0">○</span>
        <p className="font-serif font-bold text-xl text-ink/75 flex-1 truncate">{char.name}</p>
        <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood shrink-0">
          {form.expanded ? 'Close' : 'Join a campaign'}
        </span>
      </button>
      {trailing}
      </div>
      {form.expanded && (
        <div className="px-3 pt-3 pb-3 border-t" style={{ borderColor: 'rgb(var(--c-sepia) / 0.12)' }}>
          <JoinCampaignForm
            idPrefix={`join-${char.id}`}
            code={form.code}
            onCodeChange={v => setField('code', v)}
            pen={form.pen}
            onPenChange={v => setField('pen', v)}
            error={form.error}
            busy={!!form.loading}
            onSubmit={() => handleJoinForChar(char.id)}
          />
        </div>
      )}
    </div>
  );
};
