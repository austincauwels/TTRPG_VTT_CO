import { Standing } from '../../shared/Standing';
import React, { useEffect, useId, useRef, useState } from 'react';
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
const primaryButton = 'px-4 py-2 bg-oxblood text-cream border border-ink rounded-sm font-sans font-black uppercase tracking-widest text-sm hover:brightness-125 transition disabled:opacity-40 [@media(pointer:coarse)]:min-h-[44px]';
const quietButton = 'px-4 py-2 border border-sepia/50 text-sepia hover:text-ink hover:border-ink/50 rounded-sm font-sans font-black uppercase tracking-widest text-sm transition-colors [@media(pointer:coarse)]:min-h-[44px]';

// Relationship type, an optional prompt question, and the answer. The chosen question is
// kept as its index and shown above the answer box, never in it; tapping it again lets it go.
// A new type keeps the answer, and lets the question go (each type has its own).
const RelationshipFields = ({ idPrefix, form, onChange, person, verb = 'Relationship to' }) => {
  const { relType, promptIdx, answer } = form;
  const questions = (relType && RELATIONSHIP_DATA[relType]) || null;
  const question = questions && Number.isInteger(promptIdx) ? questions[promptIdx] : null;
  return (
  <div className="space-y-3">
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Relationship</label>
      <select id={`${idPrefix}-type`} aria-label={`${verb} ${person}`} value={relType || ''} onChange={e => onChange({ relType: e.target.value, promptIdx: null })} className={fieldClass}>
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
        aria-label={`${verb === 'Relationship to' ? 'Your answer about' : 'Your counter answer about'} ${person}`}
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
// noCounter: one party is dead. A counter is a new proposal, which the server refuses from
// or to the dead, so only Accept answers what was proposed before the death.
// focusRequest: a ref set when this player's press (Propose, Accept, Send counter) is about
// to replace the button they pressed; the status takes focus when the answer lands, so it
// does not fall to the page (playtest, keyboard-focus-dropped)
const RelationshipStatus = ({ rel, myId, theirName, forms, respondToRelationship, onEdit, focusRequest, noCounter = false }) => {
  const boxRef = useRef(null);
  useEffect(() => {
    if (!focusRequest?.current) return;
    const active = document.activeElement;
    if (!active || active === document.body) {
      focusRequest.current = false;
      boxRef.current?.focus();
    }
  }, [rel.id, rel.status, rel.last_actor_id, rel.rel_type, rel.lore]);
  const respond = (...args) => { if (focusRequest) focusRequest.current = true; respondToRelationship(...args); };
  const { counters, setCounters } = forms;
  const counter = counters[rel.id] || {};
  const setCounter = (patch) => setCounters(c => ({ ...c, [rel.id]: { ...c[rel.id], ...patch } }));

  const accepted = rel.status === 'accepted';
  const myTurn = !accepted && rel.last_actor_id !== myId;
  const theirTurn = !accepted && rel.last_actor_id === myId;
  // My own proposal coming back to me means they countered it
  const countered = myTurn && rel.from_character_id === myId;

  // A counter that changes nothing is no counter: Accept is the way to agree
  const sameAsOffer = !!counter.relType && counter.relType === rel.rel_type
    && joinLore(counter.relType, counter.promptIdx, counter.answer) === rel.lore;
  const sameId = `${useId()}-same`;
  const sendCounter = () => {
    if (!counter.relType || sameAsOffer) return;
    respond(rel.id, 'counter', counter.relType, joinLore(counter.relType, counter.promptIdx, counter.answer));
    setCounters(c => { const n = { ...c }; delete n[rel.id]; return n; });
  };

  return (
    <div ref={boxRef} tabIndex={-1} className={`p-3 border rounded-sm space-y-2 ${accepted ? 'bg-seal-green/10 border-seal-green/50' : myTurn ? 'bg-parchment border-oxblood/40' : 'bg-cream border-parchment-deep'}`}>
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
            <button type="button" onClick={() => respond(rel.id, 'accept')} aria-label={`Accept ${theirName}'s ${rel.rel_type}`} className={primaryButton}>Accept</button>
            {/* Counter starts from what was proposed, so a small change is a small edit */}
            {!noCounter && <button type="button" onClick={() => setCounter(counter.open ? { open: false } : { ...(counter.relType ? {} : formFrom(rel)), open: true })}
              aria-expanded={!!counter.open} aria-label={`${counter.open ? 'Cancel counter to' : 'Counter'} ${theirName}'s ${rel.rel_type}`} className={quietButton}>
              {counter.open ? 'Cancel counter' : 'Counter'}
            </button>}
          </div>
          <AnimatePresence initial={false}>
            {counter.open && !noCounter && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-3 border-t border-sepia/20">
                  <RelationshipFields idPrefix={`counter-${rel.id}`} form={counter} onChange={setCounter} person={theirName} verb="Counter relationship to" />
                  <button type="button" onClick={sendCounter} disabled={!counter.relType || sameAsOffer} aria-describedby={sameAsOffer ? sameId : undefined} className={primaryButton}>Send counter</button>
                  {sameAsOffer && <p id={sameId} className="font-serif italic text-sm text-sepia">This is the same as {theirName}'s offer. Change something to counter, or Accept it.</p>}
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
  inv, myId, relationships, circleId, forms, proposeRelationship, respondToRelationship, compact = false, proposeBlocked = false,
}) => {
  const { drafts, setDrafts } = forms;
  const draft = drafts[inv.id] || {};
  const setDraft = (patch) => setDrafts(d => ({ ...d, [inv.id]: { ...d[inv.id], ...patch } }));
  const formOpen = !compact || !!draft.open || !!draft.relType;
  const [editing, setEditing] = useState(false);
  const focusRequest = useRef(false);

  const mine = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirs = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);

  const propose = () => {
    if (!draft.relType || !circleId) return;
    focusRequest.current = true;
    proposeRelationship(circleId, myId, inv.id, draft.relType, joinLore(draft.relType, draft.promptIdx, draft.answer));
    setEditing(false);
  };
  const startEdit = () => {
    setDraft({ ...formFrom(mine), open: true });
    setEditing(true);
    // The Edit button gives way to the form: focus goes to its first field
    setTimeout(() => document.getElementById(`propose-${inv.id}-type`)?.focus(), 0);
  };
  // Only a proposal still waiting on them is edited: once they answer, the form gives way
  const isEditing = editing && !!mine && mine.status !== 'accepted' && mine.last_actor_id === myId;

  const subtitle = [inv.role || inv.role_class, inv.specialty].filter(Boolean).join(' · ');

  return (
    <div className={compact ? 'py-3 first:pt-0 space-y-2.5' : 'border border-parchment-deep rounded-sm p-4 bg-cream/40 space-y-4'}>
      <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap">
        <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: inv.ink_color || 'rgb(var(--c-oxblood))' }} />
        <span className={`font-serif font-bold text-ink ${compact ? 'text-lg' : 'text-xl'}`}>{inv.name}</span>
        {subtitle && <span className="font-serif text-base text-sepia">{subtitle}</span>}
        <Standing inv={inv} />
      </div>

      {/* The dead are a record: no proposal to or from them, Edit and Counter included (the
          server refuses each), only what was already there */}
      {(!inv.is_dead || mine) && <div>
        <h4 className={`font-sans font-bold uppercase tracking-widest text-oxblood mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>Your relationship to {inv.name}</h4>
        {mine && (!isEditing || inv.is_dead) ? (
          <RelationshipStatus rel={mine} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship}
            onEdit={inv.is_dead || proposeBlocked ? undefined : startEdit} focusRequest={focusRequest} noCounter={inv.is_dead || proposeBlocked} />
        ) : proposeBlocked ? (
          <p className="font-serif text-base text-sepia">A dead investigator proposes no relationships.</p>
        ) : !formOpen ? (
          <button type="button" aria-expanded={false} onClick={() => setDraft({ open: true })} className={quietButton}>
            Propose a relationship
          </button>
        ) : (
          <div className="space-y-3">
            <RelationshipFields idPrefix={`propose-${inv.id}`} form={draft} onChange={setDraft} person={inv.name} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button type="button" onClick={propose} disabled={!draft.relType} className={primaryButton}>
                {isEditing ? 'Send the change' : `Propose to ${inv.name}`}
              </button>
              {isEditing && <button type="button" onClick={() => setEditing(false)} className={quietButton}>Cancel</button>}
            </div>
          </div>
        )}
      </div>}

      {theirs && (
        <div className={compact ? 'pt-2' : 'pt-3 border-t border-parchment-deep'}>
          <h4 className={`font-sans font-bold uppercase tracking-widest text-oxblood mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>{inv.name}'s relationship to you</h4>
          <RelationshipStatus rel={theirs} myId={myId} theirName={inv.name} forms={forms} respondToRelationship={respondToRelationship}
            focusRequest={focusRequest} noCounter={inv.is_dead || proposeBlocked} />
        </div>
      )}
    </div>
  );
};
