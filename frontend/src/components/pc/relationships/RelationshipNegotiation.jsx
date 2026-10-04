import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RELATIONSHIP_DATA, RELATIONSHIP_TYPES } from '../../../game/relationships';

// The one relationship form: propose a relationship to another investigator, and accept
// or counter one they proposed. Used in the circle formation papers, the new-member
// popup and the Circle tab. The drafts live in the parent (useRelationshipForms), so a
// half-written answer survives a collapsed section or a closed card.

export const useRelationshipForms = () => {
  const [drafts, setDrafts] = useState({});     // { toId: { relType, lore, promptIdx } }
  const [counters, setCounters] = useState({}); // { relId: { open, relType, lore } }
  return { drafts, setDrafts, counters, setCounters };
};

const labelClass = 'block font-sans font-bold text-xs uppercase tracking-widest text-sepia mb-1.5';
const fieldClass = 'w-full border border-sepia/40 bg-cream/80 px-3 py-2 font-serif text-lg text-ink focus:border-oxblood rounded-sm';
const primaryButton = 'px-4 py-2 bg-oxblood text-cream border border-ink rounded-sm font-sans font-black uppercase tracking-widest text-sm hover:brightness-125 transition disabled:opacity-40';
const quietButton = 'px-4 py-2 border border-sepia/50 text-sepia hover:text-ink hover:border-ink/50 rounded-sm font-sans font-black uppercase tracking-widest text-sm transition-colors';

// Relationship type, an optional prompt question, and the answer.
const RelationshipFields = ({ idPrefix, relType, lore, onType, onPrompt, onLore }) => (
  <div className="space-y-3">
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Relationship</label>
      <select id={`${idPrefix}-type`} value={relType || ''} onChange={e => onType(e.target.value)} className={fieldClass}>
        <option value="" aria-label="None"></option>
        {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>

    {relType && RELATIONSHIP_DATA[relType] && (
      <div className="space-y-1.5">
        <p className={labelClass}>Question (optional)</p>
        {RELATIONSHIP_DATA[relType].map((q, qi) => {
          const chosen = lore === q;
          return (
            <button
              key={qi}
              type="button"
              aria-pressed={chosen}
              onClick={() => onPrompt(q, qi)}
              className={`w-full text-left text-base font-serif px-3 py-2 border rounded-sm transition-colors leading-snug ${
                chosen ? 'border-oxblood bg-oxblood/5 text-ink' : 'border-parchment-deep bg-cream/50 text-sepia hover:border-sepia/50 hover:text-ink'
              }`}
            >
              {q}
            </button>
          );
        })}
      </div>
    )}

    <div>
      <label htmlFor={`${idPrefix}-lore`} className={labelClass}>Your answer</label>
      <textarea
        id={`${idPrefix}-lore`}
        value={lore || ''}
        onChange={e => onLore(e.target.value)}
        rows={3}
        disabled={!relType}
        className={`${fieldClass} resize-none disabled:opacity-50`}
      />
    </div>
  </div>
);

// One relationship as it stands, with Accept and Counter when it is this player's turn.
const RelationshipStatus = ({ rel, myId, theirName, forms, respondToRelationship }) => {
  const { counters, setCounters } = forms;
  const counter = counters[rel.id] || {};
  const setCounter = (patch) => setCounters(c => ({ ...c, [rel.id]: { ...c[rel.id], ...patch } }));

  const accepted = rel.status === 'accepted';
  const myTurn = !accepted && rel.last_actor_id !== myId;
  const theirTurn = !accepted && rel.last_actor_id === myId;
  // My own proposal coming back to me means they countered it
  const countered = myTurn && rel.from_character_id === myId;

  const sendCounter = () => {
    if (!counter.relType) return;
    respondToRelationship(rel.id, 'counter', counter.relType, counter.lore || '');
    setCounters(c => { const n = { ...c }; delete n[rel.id]; return n; });
  };

  return (
    <div className={`p-3 border rounded-sm space-y-2 ${accepted ? 'bg-seal-green/10 border-seal-green/50' : myTurn ? 'bg-parchment border-oxblood/40' : 'bg-cream border-parchment-deep'}`}>
      <p className="font-serif text-lg text-ink leading-snug">
        <strong>{rel.rel_type}</strong>
        {rel.lore && <span className="block italic text-base text-sepia mt-0.5">{rel.lore}</span>}
      </p>

      {accepted && <p className="font-sans font-bold text-xs uppercase tracking-widest text-seal-green">Confirmed by you both</p>}
      {theirTurn && <p className="font-serif italic text-base text-sepia">Waiting for {theirName}</p>}

      {myTurn && (
        <>
          <p className="font-serif text-base text-ink">
            {countered ? `${theirName} suggested this change.` : `${theirName} proposed this.`}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => respondToRelationship(rel.id, 'accept')} className={primaryButton}>Accept</button>
            <button type="button" onClick={() => setCounter({ open: !counter.open })} aria-expanded={!!counter.open} className={quietButton}>
              {counter.open ? 'Cancel counter' : 'Counter'}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {counter.open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-3 border-t border-sepia/20">
                  <RelationshipFields
                    idPrefix={`counter-${rel.id}`}
                    relType={counter.relType}
                    lore={counter.lore}
                    onType={v => setCounter({ relType: v, lore: '' })}
                    onPrompt={q => setCounter({ lore: q })}
                    onLore={v => setCounter({ lore: v })}
                  />
                  <button type="button" onClick={sendCounter} disabled={!counter.relType} className={primaryButton}>Send counter</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export const RelationshipNegotiation = ({
  inv, myId, relationships, circleId, forms, proposeRelationship, respondToRelationship,
}) => {
  const { drafts, setDrafts } = forms;
  const draft = drafts[inv.id] || {};
  const setDraft = (patch) => setDrafts(d => ({ ...d, [inv.id]: { ...d[inv.id], ...patch } }));

  const mine = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirs = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);

  const propose = () => {
    if (!draft.relType || !circleId) return;
    proposeRelationship(circleId, myId, inv.id, draft.relType, draft.lore || '');
  };

  const subtitle = [inv.role || inv.role_class, inv.specialty].filter(Boolean).join(' · ');

  return (
    <div className="border border-parchment-deep rounded-sm p-4 bg-cream/40 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: inv.ink_color || 'rgb(var(--c-oxblood))' }} />
        <span className="font-serif font-bold text-xl text-ink">{inv.name}</span>
        {subtitle && <span className="font-serif text-base text-sepia">{subtitle}</span>}
      </div>

      <div>
        <h4 className="font-sans font-bold text-sm uppercase tracking-widest text-oxblood mb-2">Your relationship to {inv.name}</h4>
        {mine ? (
          <RelationshipStatus rel={mine} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship} />
        ) : (
          <div className="space-y-3">
            <RelationshipFields
              idPrefix={`propose-${inv.id}`}
              relType={draft.relType}
              lore={draft.lore}
              onType={v => setDraft({ relType: v, lore: '' })}
              onPrompt={q => setDraft({ lore: q })}
              onLore={v => setDraft({ lore: v })}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button type="button" onClick={propose} disabled={!draft.relType} className={primaryButton}>
                Propose to {inv.name}
              </button>
            </div>
          </div>
        )}
      </div>

      {theirs && (
        <div className="pt-3 border-t border-parchment-deep">
          <h4 className="font-sans font-bold text-sm uppercase tracking-widest text-oxblood mb-2">{inv.name}'s relationship to you</h4>
          <RelationshipStatus rel={theirs} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship} />
        </div>
      )}
    </div>
  );
};
