import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { RELATIONSHIP_DATA, RELATIONSHIP_TYPES } from './CircleCreationPopup';

export const RelationshipIntroPopup = () => {
  const {
    character,
    circleCreation,
    pendingRelationshipIntro,
    clearRelationshipIntro,
    proposeRelationship,
    respondToRelationship,
  } = useGameStore();

  const { relationships } = circleCreation;
  const circleId = circleCreation.circleId || character?.circle_id;
  const myId = character?.id;

  const { newCharacter, allActiveCharacters } = pendingRelationshipIntro || {};

  // Which investigators does this player need to define relationships with?
  const isNewCharacter = myId === newCharacter?.id;
  const targets = isNewCharacter
    ? allActiveCharacters.filter(c => c.id !== myId)
    : [newCharacter];

  // ── Local state (per-target) ──
  const [relDrafts, setRelDrafts] = useState({});
  const [counterDrafts, setCounterDrafts] = useState({});
  const [showCounter, setShowCounter] = useState({});
  const [selectedPrompt, setSelectedPrompt] = useState({});

  const setRelDraft = useCallback((toId, field, value) => {
    setRelDrafts(d => ({ ...d, [toId]: { ...d[toId], [field]: value } }));
  }, []);

  const setCounterDraft = useCallback((relId, field, value) => {
    setCounterDrafts(d => ({ ...d, [relId]: { ...d[relId], [field]: value } }));
  }, []);

  const selectPrompt = useCallback((toId, idx, question) => {
    setSelectedPrompt(s => ({ ...s, [toId]: idx }));
    setRelDrafts(d => ({ ...d, [toId]: { ...d[toId], lore: question } }));
  }, []);

  const relFromMeTo = (toId) => relationships.find(
    r => r.from_character_id === myId && r.to_character_id === toId
  );
  const relFromThemToMe = (fromId) => relationships.find(
    r => r.from_character_id === fromId && r.to_character_id === myId
  );

  const handlePropose = (toId) => {
    const draft = relDrafts[toId] || {};
    if (!draft.relType || !circleId) return;
    proposeRelationship(circleId, myId, toId, draft.relType, draft.lore || '');
  };

  const handleAccept = (relId) => respondToRelationship(relId, 'accept');

  const handleCounterSubmit = (relId) => {
    const draft = counterDrafts[relId] || {};
    if (!draft.relType) return;
    respondToRelationship(relId, 'counter', draft.relType, draft.lore || '');
    setShowCounter(s => ({ ...s, [relId]: false }));
    setCounterDrafts(d => { const n = { ...d }; delete n[relId]; return n; });
  };

  const renderRelRow = (rel, theirName) => {
    if (!rel) return null;
    const canIRespond = rel.status !== 'accepted' && rel.last_actor_id !== myId;
    const isAwaiting = rel.status !== 'accepted' && rel.last_actor_id === myId;

    if (rel.status === 'accepted') {
      return (
        <div className="flex items-center gap-3 p-3 bg-seal-green/15 border border-seal-green-lit/50 rounded-sm">
          <span className="text-seal-green text-xl">✓</span>
          <span className="font-serif text-base text-parchment-deep">
            <strong className="text-cream">{rel.rel_type}</strong>
            {rel.lore ? <span className="text-parchment-deep/80"> — {rel.lore}</span> : ''}
          </span>
          <span className="font-serif italic text-sm text-seal-green-lit ml-auto">Confirmed</span>
        </div>
      );
    }

    if (isAwaiting) {
      return (
        <div className="flex items-center gap-3 p-3 bg-ink border border-parchment-deep/25 rounded-sm">
          <span className="font-serif text-base text-parchment-deep">
            <strong className="text-cream">{rel.rel_type}</strong>
            {rel.lore ? <span className="text-parchment-deep/80"> — {rel.lore}</span> : ''}
          </span>
          <span className="font-serif italic text-sm text-parchment-deep/80 ml-auto">Awaiting {theirName}…</span>
        </div>
      );
    }

    if (canIRespond) {
      return (
        <div className="p-3 bg-ink border border-parchment-deep/25 rounded-sm space-y-3">
          <p className="font-serif text-base text-parchment-deep">
            <strong className="text-cream">{rel.rel_type}</strong>
            {rel.lore ? <span className="text-parchment-deep/80"> — {rel.lore}</span> : ''}
          </p>
          <p className="font-serif italic text-base text-parchment-deep">{theirName} proposes this. Accept or counter?</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAccept(rel.id)}
              className="px-4 py-1.5 bg-seal-green border border-seal-green-lit/50 text-cream rounded-sm font-sans font-black uppercase tracking-[0.1em] text-sm hover:brightness-125 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => setShowCounter(s => ({ ...s, [rel.id]: !s[rel.id] }))}
              className="px-4 py-1.5 bg-transparent border border-parchment-deep/30 text-parchment-deep rounded-sm font-sans font-black uppercase tracking-[0.1em] text-sm hover:border-parchment-deep/60 transition-colors"
            >
              Counter
            </button>
          </div>
          <AnimatePresence>
            {showCounter[rel.id] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 pt-1"
              >
                <select
                  value={counterDrafts[rel.id]?.relType || ''}
                  onChange={e => {
                    setCounterDraft(rel.id, 'relType', e.target.value);
                    setCounterDraft(rel.id, 'lore', '');
                  }}
                  className="w-full border border-parchment-deep/25 bg-night px-3 py-2 font-serif text-base text-parchment-deep focus:outline-none rounded-sm"
                >
                  <option value="">— They are your… —</option>
                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {counterDrafts[rel.id]?.relType && RELATIONSHIP_DATA[counterDrafts[rel.id].relType] && (
                  <div className="space-y-1">
                    <p className="font-serif italic text-sm text-parchment-deep/80">Choose a question prompt:</p>
                    {RELATIONSHIP_DATA[counterDrafts[rel.id].relType].map((q, qi) => (
                      <button
                        key={qi}
                        type="button"
                        onClick={() => setCounterDraft(rel.id, 'lore', q)}
                        className={`w-full text-left text-sm font-serif px-2.5 py-1.5 border rounded-sm transition-all leading-snug ${
                          counterDrafts[rel.id]?.lore === q
                            ? 'border-candle-gold bg-candle-gold/10 text-candle-gold'
                            : 'border-parchment-deep/15 bg-night/50 text-parchment-deep/80 hover:border-parchment-deep/40'
                        }`}
                      >
                        <span className="font-mono text-xs text-parchment-deep/60 mr-1">{qi + 1}.</span> {q}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={counterDrafts[rel.id]?.lore || ''}
                  onChange={e => setCounterDraft(rel.id, 'lore', e.target.value)}
                  placeholder="Your answer or description…"
                  rows={2}
                  className="w-full border border-parchment-deep/25 bg-night px-3 py-2 font-serif text-sm text-parchment-deep resize-none focus:outline-none rounded-sm"
                />
                <button
                  onClick={() => handleCounterSubmit(rel.id)}
                  className="px-4 py-1.5 bg-oxblood border border-ink text-cream rounded-sm font-sans font-black uppercase tracking-[0.1em] text-sm hover:brightness-125 transition-colors"
                >
                  Send Counter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return null;
  };

  if (!pendingRelationshipIntro) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[9100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto bg-night border-2 border-oxblood shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
      >
        <div className="p-6 border-b border-oxblood/30">
          <div className="font-serif italic text-sm text-oxblood-lit mb-1">
            Candela Obscura — New Circle Member
          </div>
          <h2 className="font-display text-3xl text-cream uppercase tracking-[0.06em]">
            {isNewCharacter
              ? 'Introduce Yourself to the Circle'
              : `Welcome ${newCharacter?.name} to the Circle`}
          </h2>
          <p className="font-serif text-base text-parchment-deep/80 mt-2 leading-relaxed">
            {isNewCharacter
              ? 'Define your relationships with your new colleagues before the next assignment.'
              : `A new investigator has joined. Establish your relationship with ${newCharacter?.name}.`}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {targets.length === 0 ? (
            <p className="font-serif text-base text-parchment-deep/80 italic text-center py-6">
              No other investigators to define relationships with.
            </p>
          ) : (
            <AnimatePresence>
              {targets.map((inv) => {
                const myProposal = relFromMeTo(inv.id);
                const incoming = relFromThemToMe(inv.id);
                const draft = relDrafts[inv.id] || {};

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border border-parchment-deep/15 bg-ink p-4"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: inv.ink_color || 'rgb(var(--c-oxblood))' }} />
                      <span className="font-serif font-bold text-lg text-cream">{inv.name}</span>
                      <span className="font-sans font-bold text-xs uppercase tracking-widest text-parchment-deep/80">{inv.role || inv.specialty || ''}</span>
                    </div>

                    {/* My outgoing proposal */}
                    <div className="mb-4">
                      <p className="font-sans font-bold text-xs uppercase tracking-[0.12em] text-oxblood-lit mb-2">
                        Your relationship to {inv.name}
                      </p>
                      {myProposal ? (
                        renderRelRow(myProposal, inv.name)
                      ) : (
                        <div className="space-y-3">
                          <select
                            value={draft.relType || ''}
                            onChange={e => {
                              setRelDraft(inv.id, 'relType', e.target.value);
                              setSelectedPrompt(s => ({ ...s, [inv.id]: null }));
                              setRelDrafts(d => ({ ...d, [inv.id]: { ...d[inv.id], relType: e.target.value, lore: '' } }));
                            }}
                            className="w-full border border-oxblood bg-night px-3 py-2 font-serif text-base text-parchment-deep focus:outline-none focus:border-oxblood rounded-sm"
                          >
                            <option value="">— They are your… —</option>
                            {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>

                          {draft.relType && RELATIONSHIP_DATA[draft.relType] && (
                            <div className="space-y-1">
                              <p className="font-serif italic text-sm text-parchment-deep/80">Choose a question to ground your answer:</p>
                              {RELATIONSHIP_DATA[draft.relType].map((q, qi) => (
                                <button
                                  key={qi}
                                  type="button"
                                  onClick={() => selectPrompt(inv.id, qi, q)}
                                  className={`w-full text-left text-sm font-serif px-3 py-2 border rounded-sm transition-all leading-snug ${
                                    selectedPrompt[inv.id] === qi
                                      ? 'border-candle-gold bg-candle-gold/10 text-candle-gold'
                                      : 'border-oxblood/30 bg-night/50 text-parchment-deep/80 hover:border-oxblood hover:text-parchment-deep'
                                  }`}
                                >
                                  <span className="font-mono text-xs text-oxblood-lit mr-1">{qi + 1}.</span> {q}
                                </button>
                              ))}
                            </div>
                          )}

                          <div>
                            <label className="font-sans font-bold text-xs text-parchment-deep/80 uppercase tracking-[0.1em] block mb-1.5">
                              {selectedPrompt[inv.id] != null ? 'Your answer:' : 'Or write freely:'}
                            </label>
                            <textarea
                              value={draft.lore || ''}
                              onChange={e => setRelDraft(inv.id, 'lore', e.target.value)}
                              placeholder={draft.relType ? 'Write your answer or describe the relationship freely…' : 'Select a relationship type above first…'}
                              rows={3}
                              disabled={!draft.relType}
                              className="w-full border border-oxblood bg-night px-3 py-2 font-serif text-sm text-parchment-deep resize-none focus:outline-none focus:border-oxblood rounded-sm disabled:opacity-40"
                            />
                          </div>

                          <button
                            onClick={() => handlePropose(inv.id)}
                            disabled={!draft.relType}
                            className="px-4 py-2 bg-oxblood hover:brightness-125 text-cream font-sans font-black uppercase tracking-[0.15em] text-sm border border-ink rounded-sm transition-colors disabled:opacity-40"
                          >
                            Propose Relationship
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Incoming proposal from this investigator */}
                    {incoming && (
                      <div className="mt-3 pt-3 border-t border-oxblood/30">
                        <p className="font-sans font-bold text-xs uppercase tracking-[0.12em] text-oxblood-lit mb-2">
                          {inv.name}'s relationship to you
                        </p>
                        {renderRelRow(incoming, inv.name)}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 border-t border-oxblood/30">
          <button
            onClick={clearRelationshipIntro}
            className="w-full py-3 px-6 bg-transparent hover:bg-oxblood/15 text-oxblood-lit hover:text-parchment-deep font-sans font-black uppercase tracking-widest text-sm transition-colors border border-oxblood"
          >
            [ Close & Continue ]
          </button>
          <p className="font-serif italic text-sm text-parchment-deep/70 text-center mt-2">
            Relationships can be revisited in the Circle tab at any time.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
