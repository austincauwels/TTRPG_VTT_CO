import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RELATIONSHIP_DATA, RELATIONSHIP_TYPES, joinLore, splitLore } from '../../../game/relationships';

// The one relationship form: propose a relationship to another investigator, and accept
// or counter one they proposed. Used in the circle formation papers, the new-member
// popup and the Circle tab. The drafts live in the parent (useRelationshipForms), so a
// half-written answer survives a collapsed section or a closed card.

export const useRelationshipForms = () => {
  const [drafts, setDrafts] = useState({});     // { toId: { open, relType, promptIdx, answer } }
  const [counters, setCounters] = useState({}); // { relId: { open, relType, promptIdx, answer } }
  return { drafts, setDrafts, counters, setCounters };
};

const labelClass = 'block font-sans font-bold text-xs uppercase tracking-widest text-sepia mb-1.5';
const fieldClass = 'w-full border border-sepia/40 bg-cream/80 px-3 py-2 font-serif text-lg text-ink focus:border-oxblood rounded-sm';
const primaryButton = 'px-4 py-2 bg-oxblood text-cream border border-ink rounded-sm font-sans font-black uppercase tracking-widest text-sm hover:brightness-125 transition disabled:opacity-40';
const quietButton = 'px-4 py-2 border border-sepia/50 text-sepia hover:text-ink hover:border-ink/50 rounded-sm font-sans font-black uppercase tracking-widest text-sm transition-colors';

// Relationship type, an optional prompt question, and the answer. The chosen question is
// kept as its index and shown above the answer box, never in it; tapping it again lets it go.
// A new type keeps the answer, and lets the question go (each type has its own).
const RelationshipFields = ({ idPrefix, form, onChange }) => {
  const { relType, promptIdx, answer } = form;
  const questions = (relType && RELATIONSHIP_DATA[relType]) || null;
  const question = questions && Number.isInteger(promptIdx) ? questions[promptIdx] : null;
  return (
  <div className="space-y-3">
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Relationship</label>
      <select id={`${idPrefix}-type`} value={relType || ''} onChange={e => onChange({ relType: e.target.value, promptIdx: null })} className={fieldClass}>
        <option value="" aria-label="None"></option>
        {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>

    {questions && (
      <div className="space-y-1.5">
        <p className={labelClass}>Question (optional)</p>
        {questions.map((q, qi) => {
          const chosen = promptIdx === qi;
          return (
            <button
              key={qi}
              type="button"
              aria-pressed={chosen}
              onClick={() => onChange({ promptIdx: chosen ? null : qi })}
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
      {question && <p id={`${idPrefix}-q`} className="font-serif italic text-base text-sepia leading-snug mb-1.5">{question}</p>}
      <textarea
        id={`${idPrefix}-lore`}
        value={answer || ''}
        onChange={e => onChange({ answer: e.target.value })}
        rows={3}
        disabled={!relType}
        aria-describedby={question ? `${idPrefix}-q` : undefined}
        className={`${fieldClass} resize-none disabled:opacity-50`}
      />
    </div>
  </div>
  );
};

// A relationship's words: its question, if it answers one, then the answer
const LoreText = ({ rel }) => {
  const { promptIdx, answer } = splitLore(rel.rel_type, rel.lore);
  const question = Number.isInteger(promptIdx) ? RELATIONSHIP_DATA[rel.rel_type][promptIdx] : null;
  if (!question && !answer) return null;
  return (
    <span className="block mt-0.5">
      {question && <span className="block font-serif text-base text-sepia">{question}</span>}
      {answer && <span className="block italic text-base text-sepia whitespace-pre-line">{answer}</span>}
    </span>
  );
};

// A form that starts from a stored relationship (Counter, Edit)
const formFrom = (rel) => ({ relType: rel.rel_type, ...splitLore(rel.rel_type, rel.lore) });

// One relationship as it stands, with Accept and Counter when it is this player's turn.
const RelationshipStatus = ({ rel, myId, theirName, forms, respondToRelationship, onEdit }) => {
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
    respondToRelationship(rel.id, 'counter', counter.relType, joinLore(counter.relType, counter.promptIdx, counter.answer));
    setCounters(c => { const n = { ...c }; delete n[rel.id]; return n; });
  };

  return (
    <div className={`p-3 border rounded-sm space-y-2 ${accepted ? 'bg-seal-green/10 border-seal-green/50' : myTurn ? 'bg-parchment border-oxblood/40' : 'bg-cream border-parchment-deep'}`}>
      <p className="font-serif text-lg text-ink leading-snug">
        <strong>{rel.rel_type}</strong>
        <LoreText rel={rel} />
      </p>

      {accepted && <p className="font-sans font-bold text-xs uppercase tracking-widest text-seal-green">Confirmed by you both</p>}
      {theirTurn && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-serif italic text-base text-sepia">Waiting for {theirName}</p>
          {/* Your own proposal can be changed while it waits (proposing again replaces it) */}
          {onEdit && rel.from_character_id === myId && (
            <button type="button" onClick={onEdit} className={quietButton}>Edit</button>
          )}
        </div>
      )}

      {myTurn && (
        <>
          <p className="font-serif text-base text-ink">
            {countered ? `${theirName} suggested this change.` : `${theirName} proposed this.`}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => respondToRelationship(rel.id, 'accept')} className={primaryButton}>Accept</button>
            {/* Counter starts from what was proposed, so a small change is a small edit */}
            <button type="button" onClick={() => setCounter(counter.open ? { open: false } : { ...(counter.relType ? {} : formFrom(rel)), open: true })}
              aria-expanded={!!counter.open} className={quietButton}>
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
                  <RelationshipFields idPrefix={`counter-${rel.id}`} form={counter} onChange={setCounter} />
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

// compact (the Circle tab's relationships paper): a smaller head, and the form to propose
// folded behind its own button until it is wanted. A started draft stays open.
export const RelationshipNegotiation = ({
  inv, myId, relationships, circleId, forms, proposeRelationship, respondToRelationship, compact = false,
}) => {
  const { drafts, setDrafts } = forms;
  const draft = drafts[inv.id] || {};
  const setDraft = (patch) => setDrafts(d => ({ ...d, [inv.id]: { ...d[inv.id], ...patch } }));
  const formOpen = !compact || !!draft.open || !!draft.relType;
  const [editing, setEditing] = useState(false);

  const mine = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirs = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);

  const propose = () => {
    if (!draft.relType || !circleId) return;
    proposeRelationship(circleId, myId, inv.id, draft.relType, joinLore(draft.relType, draft.promptIdx, draft.answer));
    setEditing(false);
  };
  const startEdit = () => { setDraft({ ...formFrom(mine), open: true }); setEditing(true); };
  // Only a proposal still waiting on them is edited: once they answer, the form gives way
  const isEditing = editing && !!mine && mine.status !== 'accepted' && mine.last_actor_id === myId;

  const subtitle = [inv.role || inv.role_class, inv.specialty].filter(Boolean).join(' · ');

  return (
    <div className={compact ? 'py-3 first:pt-0 space-y-2.5' : 'border border-parchment-deep rounded-sm p-4 bg-cream/40 space-y-4'}>
      <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap">
        <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: inv.ink_color || 'rgb(var(--c-oxblood))' }} />
        <span className={`font-serif font-bold text-ink ${compact ? 'text-lg' : 'text-xl'}`}>{inv.name}</span>
        {subtitle && <span className="font-serif text-base text-sepia">{subtitle}</span>}
      </div>

      <div>
        <h4 className={`font-sans font-bold uppercase tracking-widest text-oxblood mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>Your relationship to {inv.name}</h4>
        {mine && !isEditing ? (
          <RelationshipStatus rel={mine} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship}
            onEdit={startEdit} />
        ) : !formOpen ? (
          <button type="button" aria-expanded={false} onClick={() => setDraft({ open: true })} className={quietButton}>
            Propose a relationship
          </button>
        ) : (
          <div className="space-y-3">
            <RelationshipFields idPrefix={`propose-${inv.id}`} form={draft} onChange={setDraft} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button type="button" onClick={propose} disabled={!draft.relType} className={primaryButton}>
                {isEditing ? 'Send the change' : `Propose to ${inv.name}`}
              </button>
              {isEditing && <button type="button" onClick={() => setEditing(false)} className={quietButton}>Cancel</button>}
            </div>
          </div>
        )}
      </div>

      {theirs && (
        <div className={compact ? 'pt-2' : 'pt-3 border-t border-parchment-deep'}>
          <h4 className={`font-sans font-bold uppercase tracking-widest text-oxblood mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>{inv.name}'s relationship to you</h4>
          <RelationshipStatus rel={theirs} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship} />
        </div>
      )}
    </div>
  );
};
