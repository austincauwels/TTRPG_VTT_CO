import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { RelationshipNegotiation, useRelationshipForms } from './relationships/RelationshipNegotiation';
import { useDialog } from '../shared/useDialog';
import { FormLine, SerialNo, PrinterMark, RuledBox, serialFor } from '../shared/PrintMarks';

// ─── Canonical game content ───────────────────────────────────────────────────

const CIRCLE_QUESTIONS = [
  { key: 'q1', text: 'You have all known one another for a long time, but your circle was recently formed. Why were you brought together, and how do you each feel about it?' },
  { key: 'q2', text: "You all share a common goal that's secret to the Lightkeepers of Candela Obscura. What is it?" },
  { key: 'q3', text: "You've never met, but members of your circle are infamous. What did they do, and how do you each feel about it?" },
  { key: 'q4', text: 'Your circle was retired, but Candela Obscura recently brought you back. Why were you all dismissed, and why did they call you in again?' },
  { key: 'q5', text: 'Your circle once did something incredibly heroic. What did you do, and do other people know about it?' },
  { key: 'q6', text: 'Your circle once did something horribly evil. What did you do, and how do you seek absolution?' },
];

const CIRCLE_ABILITIES = [
  { key: 'Stamina Training', description: 'Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.' },
  { key: 'Nobody Left Behind', description: 'When a member of your circle drops incapacitated from taking too many marks, any roll a player makes in the scene to protect them, or get them out of danger, has +1d.' },
  { key: 'In This Together', description: 'When you spend drive to help an ally on a roll, on a result of 3 or less, you both earn back 1 drive point of your choice.' },
  { key: 'Interdisciplinary', description: 'When choosing a new ability during character advancement, once per campaign, each character may choose an ability from a character role or specialty outside their own.' },
  { key: 'Resource Management', description: 'When your circle hits a milestone on the Illumination Track, earn back 1 Stitch, Refresh, or Train resource.' },
  { key: 'One Last Run', description: 'When you select this ability, the next assignment is your last. Everyone gets to take all four options during this character advancement instead of only two.' },
];

const INSIGNIA_OPTIONS = [
  { key: 'GiOuroboros',    label: 'Ouroboros' },
  { key: 'GiOrbital',      label: 'Orbital Ring' },
  { key: 'GiCompass',      label: 'Compass' },
  { key: 'GiOilySpiral',   label: 'Oily Spiral' },
  { key: 'GiMoon',         label: 'Moon' },
  { key: 'GiGoldShell',    label: 'Gilded Shell' },
  { key: 'GiGlowingHands', label: 'Radiant Hands' },
  { key: 'GiCandleLight',  label: 'Candlelight' },
];

// The relationship tables now live in game/relationships.js; these names stay importable here.
export { RELATIONSHIP_DATA, RELATIONSHIP_TYPES } from '../../game/relationships';

const EXAMPLE_LOCATIONS = [
  { name: 'The Empty Office', description: 'On the fourth floor of a medical building in Silverslip is an office that belongs to a Doctor Lygon, though no such person is known to work there.' },
  { name: 'The Boot and Saddle', description: 'In the backrooms of a run-down bar in South Soffit, a small but functional space for Candela Obscura members to meet.' },
  { name: 'The Rust Warren', description: 'An underground bunker in the Haven Hills left over from the war, utilized by members of Candela Obscura when needed.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tallyVotes(votes) {
  const tally = {};
  for (const v of votes) tally[v.value] = (tally[v.value] || 0) + 1;
  return tally;
}

function leadingValue(tally) {
  if (!Object.keys(tally).length) return null;
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-sepia/50 rounded-sm mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex justify-between items-center px-5 py-3 bg-parchment-deep/60 hover:bg-parchment-deep text-left"
      >
        <span className="font-sans text-base uppercase tracking-widest font-bold text-sepia">
          {title}
        </span>
        <span className="font-sans text-sepia text-lg">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const CircleCreationPopup = () => {
  const {
    character,
    circle,
    circleCreation,
    submitCircleVote,
    updateBackstoryAnswer,
    updatePersonalAnswer,
    proposeRelationship,
    respondToRelationship,
  } = useGameStore();

  const { votes, backstoryAnswers, relationships, activeInvestigators } = circleCreation;
  // Use the circle_id from fetchCircleCreationState as the authoritative source to avoid
  // a race condition where circle?.id is stale from localStorage when the popup first opens.
  const circleId = circleCreation.circleId || circle?.id || 1;
  const myId = character?.id;
  const memberCount = activeInvestigators.length;
  const resourcePoints = 1 + memberCount;

  // ── Name section state ──
  const [nameDraft, setNameDraft] = useState('');
  const nameSuggestions = votes.name_suggest || [];
  const nameVotes = votes.name_vote || [];
  const nameVoteTally = tallyVotes(nameVotes);
  const myNameVote = nameVotes.find(v => v.character_id === myId)?.value || null;
  const mySuggestionCount = nameSuggestions.filter(v => v.character_id === myId).length;
  const allSuggestedNames = [...new Set(nameSuggestions.map(v => v.value))];

  // ── Question section state ──
  const questionVotes = votes.question || [];
  const questionTally = tallyVotes(questionVotes);
  const leadingQuestion = leadingValue(questionTally);
  const myQuestionVote = questionVotes.find(v => v.character_id === myId)?.value || null;
  const [personalAnswer, setPersonalAnswer] = useState(character?.personal_circle_answer || '');

  // ── Ability section state ──
  const abilityVotes = votes.ability || [];
  const abilityTally = tallyVotes(abilityVotes);
  const myAbilityVote = abilityVotes.find(v => v.character_id === myId)?.value || null;
  const leadingAbility = leadingValue(abilityTally);

  // ── Insignia section state ──
  const insigniaVotes = votes.insignia || [];
  const insigniaTally = tallyVotes(insigniaVotes);
  const myInsigniaVote = insigniaVotes.find(v => v.character_id === myId)?.value || null;
  const leadingInsignia = leadingValue(insigniaTally);

  // Relationship drafts (the shared form keeps them here so they survive a collapsed section)
  const relForms = useRelationshipForms();

  const others = activeInvestigators.filter(inv => inv.id !== myId);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNameSuggest = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || mySuggestionCount >= 5) return;
    submitCircleVote(circleId, myId, 'name_suggest', trimmed);
    setNameDraft('');
  };

  const handleNameVote = (name) => {
    submitCircleVote(circleId, myId, 'name_vote', name);
  };

  const handleQuestionVote = (key) => submitCircleVote(circleId, myId, 'question', key);
  const handleAbilityVote = (key) => submitCircleVote(circleId, myId, 'ability', key);
  const handleInsigniaVote = (key) => submitCircleVote(circleId, myId, 'insignia', key);

  const handleLocationBlur = (e) => updateBackstoryAnswer(circleId, 'chapter_house', e.target.value);

  const handlePersonalAnswerBlur = () => {
    updatePersonalAnswer(circleId, myId, personalAnswer);
  };

  const dialogRef = useDialog({});

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/80 z-[9000] flex items-center justify-center p-4 font-serif">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Circle formation papers"
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto bg-parchment border-4 border-double border-ink shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative"
      >
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        <div className="absolute -top-1 left-8 right-8 h-6 bg-parchment-deep/80 border border-sepia/30 shadow-sm z-20 pointer-events-none rotate-[-0.6deg]" />

        <div className="relative z-10 p-7 pt-9">
          {/* Header */}
          <div className="border-b-2 border-ink pb-5 mb-6 text-center">
            <div className="flex items-center justify-between gap-2 mb-3" aria-hidden="true">
              <span className="flex items-center gap-2"><PrinterMark size={13} /><FormLine>Form C.O. 1 · Circle formation</FormLine></span>
              <SerialNo value={serialFor(`formation-${circleId ?? ''}`)} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-ink">
              Circle Formation Papers
            </h2>
          </div>

          {/* ── SECTION I: Circle Question ── */}
          <Section title="I. Circle Question">
            <div className="space-y-3 mb-5">
              {CIRCLE_QUESTIONS.map((q) => {
                const count = questionTally[q.key] || 0;
                const isLeading = leadingQuestion === q.key;
                const isMine = myQuestionVote === q.key;
                return (
                  <button
                    key={q.key}
                    onClick={() => handleQuestionVote(q.key)}
                    className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                      isLeading ? 'border-ink bg-ink/5'
                      : isMine ? 'border-sepia/60 bg-cream'
                      : 'border-parchment-deep bg-cream/60 hover:border-sepia/60'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="font-serif text-lg text-ink leading-snug">{q.text}</span>
                      <div className="flex flex-col items-end shrink-0">
                        {count > 0 && (
                          <span className="font-mono text-sm bg-ink text-cream px-2 py-0.5 rounded-full">{count}</span>
                        )}
                        {isLeading && count > 0 && (
                          <span className="font-serif italic text-sm text-sepia mt-0.5">leading</span>
                        )}
                        {isMine && (
                          <span className="font-serif italic text-sm text-sepia mt-0.5">your vote</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {leadingQuestion && (
              <div className="mt-5 bg-cream/50 border border-sepia/40 rounded-sm p-4">
                <label className="font-sans font-bold text-base uppercase tracking-[0.15em] text-sepia block mb-2">
                  Your Personal Answer
                </label>
                <p className="font-serif text-base text-sepia italic mb-2 leading-snug">
                  {CIRCLE_QUESTIONS.find(q => q.key === leadingQuestion)?.text}
                </p>
                <textarea
                  value={personalAnswer}
                  onChange={e => setPersonalAnswer(e.target.value)}
                  onBlur={handlePersonalAnswerBlur}
                  rows={4}
                  aria-label="Your personal answer"
                  className="w-full border border-sepia/40 bg-cream/70 p-3 font-serif text-lg text-ink resize-none focus:border-sepia rounded-sm"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.15) 27px, rgb(var(--c-sepia) / 0.15) 28px)' }}
                />
                <p className="font-serif italic text-sm text-sepia mt-1">
                  The GM reads every answer.
                </p>
              </div>
            )}
          </Section>

          {/* ── SECTION II: Name the Circle ── */}
          <Section title="II. Name the Circle">
            <div className="flex gap-2 mb-5 items-center">
              <input
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSuggest()}
                placeholder="Circle name"
                aria-label="Circle name to suggest"
                disabled={mySuggestionCount >= 5}
                className="flex-1 border border-sepia/40 bg-cream/70 px-4 py-2.5 font-serif text-lg text-ink focus:border-sepia rounded-sm disabled:opacity-40"
              />
              <button
                onClick={handleNameSuggest}
                disabled={mySuggestionCount >= 5 || !nameDraft.trim()}
                className="btn-gold shrink-0 disabled:opacity-40"
              >
                Suggest
              </button>
              <span className="font-mono tabular-nums text-sm text-sepia shrink-0" aria-label={`${mySuggestionCount} of 5 suggestions used`}>{mySuggestionCount}/5</span>
            </div>

            {allSuggestedNames.length > 0 ? (
              <div className="space-y-2">
                <p className="font-sans font-bold text-sm uppercase tracking-[0.15em] text-sepia mb-2">Suggested names</p>
                {allSuggestedNames
                  .sort((a, b) => (nameVoteTally[b] || 0) - (nameVoteTally[a] || 0))
                  .map((name) => {
                    const voteCount = nameVoteTally[name] || 0;
                    const suggestCount = nameSuggestions.filter(v => v.value === name).length;
                    const isLeading = voteCount > 0 && voteCount === Math.max(...Object.values(nameVoteTally), 0);
                    const isMineVote = myNameVote === name;
                    const isMySuggestion = nameSuggestions.some(v => v.character_id === myId && v.value === name);
                    return (
                      <div
                        key={name}
                        className={`flex items-center gap-3 p-3 border rounded-sm ${
                          isLeading ? 'border-sepia bg-ink/5' : 'border-parchment-deep bg-cream/40'
                        }`}
                      >
                        <button
                          onClick={() => handleNameVote(name)}
                          className={`font-mono text-sm px-3 py-1 border rounded-full transition-colors shrink-0 ${
                            isMineVote
                              ? 'bg-ink text-cream border-ink'
                              : 'border-sepia/40 text-sepia hover:border-sepia'
                          }`}
                        >
                          {isMineVote ? '✓ Voted' : 'Vote'}
                        </button>
                        <span className="font-serif text-lg text-ink flex-1">{name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isMySuggestion && (
                            <span className="font-serif italic text-sm text-sepia">yours</span>
                          )}
                          {suggestCount > 1 && (
                            <span className="font-serif italic text-sm text-sepia">suggested {suggestCount} times</span>
                          )}
                          {voteCount > 0 && (
                            <span className="font-mono text-sm bg-sepia text-cream px-2 py-0.5 rounded-full" aria-label={`${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}`}>{voteCount}</span>
                          )}
                          {isLeading && (
                            <span className="font-serif italic text-sm text-sepia">leading</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : null}
          </Section>

          {/* ── SECTION III: Chapter House Location ── */}
          <Section title="III. Chapter House Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="hand-placed bg-parchment/80 border border-sepia/30 p-4 rounded-sm" style={{ '--tilt': '-0.8deg' }}>
                <p className="font-serif text-base text-sepia leading-snug italic">
                  "The Circle of Skull &amp; Sovereign maintains a small townhouse on the Eaves. Three out of the four members are highly educated and exceedingly wealthy."
                </p>
              </div>
              <div className="hand-placed bg-parchment/80 border border-sepia/30 p-4 rounded-sm" style={{ '--tilt': '0.6deg' }}>
                <p className="font-serif text-base text-sepia leading-snug italic">
                  "The Circle of Loyal Malefactors has a hideaway in the Bridleborne Mountains. All five members are also redrunners."
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="font-sans font-bold text-base uppercase tracking-[0.15em] text-sepia block mb-2">
                Your Chapter House
              </label>
              <textarea
                key={backstoryAnswers.chapter_house}
                defaultValue={backstoryAnswers.chapter_house || ''}
                onBlur={handleLocationBlur}
                rows={3}
                className="w-full border border-sepia/40 bg-cream/70 p-3 font-serif text-lg text-ink resize-none focus:border-sepia rounded-sm"
                style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.15) 27px, rgb(var(--c-sepia) / 0.15) 28px)' }}
              />
            </div>

            <div className="space-y-2">
              <p className="font-sans font-bold text-sm uppercase tracking-[0.15em] text-sepia mb-2">Examples</p>
              {EXAMPLE_LOCATIONS.map(loc => (
                <button
                  key={loc.name}
                  onClick={() => updateBackstoryAnswer(circleId, 'chapter_house', `${loc.name}: ${loc.description}`)}
                  className="w-full text-left border border-parchment-deep bg-cream/60 hover:border-sepia hover:bg-cream p-3 rounded-sm transition-all"
                >
                  <span className="font-serif font-bold text-lg text-ink block">{loc.name}</span>
                  <span className="font-serif text-base text-sepia leading-snug">{loc.description}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* ── SECTION IV: Circle Ability ── */}
          <Section title="IV. Circle Ability">
            <div className="space-y-3">
              {CIRCLE_ABILITIES.map((ability) => {
                const count = abilityTally[ability.key] || 0;
                const isLeading = leadingAbility === ability.key;
                const isMine = myAbilityVote === ability.key;
                return (
                  <button
                    key={ability.key}
                    onClick={() => handleAbilityVote(ability.key)}
                    className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                      isLeading ? 'border-oxblood bg-oxblood/5'
                      : isMine ? 'border-sepia bg-cream'
                      : 'border-parchment-deep bg-cream/60 hover:border-sepia/60'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="font-serif font-bold text-xl text-ink block">{ability.key}</span>
                        <span className="font-serif text-base text-sepia leading-snug">{ability.description}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        {count > 0 && (
                          <span className="font-mono text-sm bg-ink text-cream px-2 py-0.5 rounded-full">{count}</span>
                        )}
                        {isMine && <span className="font-serif italic text-sm text-sepia">your vote</span>}
                        {isLeading && count > 0 && <span className="font-serif italic text-sm text-oxblood">leading</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── SECTION V: System Insignia ── */}
          <Section title="V. Insignia">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {INSIGNIA_OPTIONS.map((ins) => {
                const count = insigniaTally[ins.key] || 0;
                const isLeading = leadingInsignia === ins.key;
                const isMine = myInsigniaVote === ins.key;
                return (
                  <button
                    key={ins.key}
                    onClick={() => handleInsigniaVote(ins.key)}
                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-sm transition-all ${
                      isLeading ? 'border-oxblood bg-oxblood/5'
                      : isMine ? 'border-sepia bg-cream'
                      : 'border-parchment-deep bg-cream/60 hover:border-sepia/60'
                    }`}
                  >
                    <SafeIcon name={ins.key} size={36} className={isLeading ? 'text-oxblood' : isMine ? 'text-sepia' : 'text-sepia'} />
                    <span className="font-serif text-sm text-sepia text-center">{ins.label}</span>
                    {count > 0 && (
                      <span className="font-mono text-sm bg-ink text-cream px-2 py-0.5 rounded-full">{count}</span>
                    )}
                    {isMine && <span className="font-serif italic text-sm text-sepia">your vote</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── SECTION VI: Relationship Matrix ── */}
          <Section title="VI. Circle Relationships">

            {others.length === 0 ? (
              <p className="font-serif text-base text-sepia italic text-center py-5">
                No one else in the circle yet
              </p>
            ) : (
              <div className="space-y-4">
                {others.map((inv) => (
                  <RelationshipNegotiation
                    key={inv.id}
                    inv={inv}
                    myId={myId}
                    relationships={relationships}
                    circleId={circleId}
                    forms={relForms}
                    proposeRelationship={proposeRelationship}
                    respondToRelationship={respondToRelationship}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* ── Footer: Resource Points ── */}
          <div className="mt-5 p-5 bg-ink/5 border border-sepia/40 rounded-sm text-center">
            <p className="font-sans font-bold text-base uppercase tracking-widest text-sepia mb-1">
              Starting Resource Points
            </p>
            <p className="font-serif text-4xl font-bold text-ink">{resourcePoints}</p>
            <p className="font-mono tabular-nums text-sm text-sepia mt-2">
              1 + {memberCount} investigator{memberCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* The foot of the form: a box left blank for the Lightkeeper's seal */}
          <div className="mt-6 flex items-end justify-between gap-4" aria-hidden="true">
            <FormLine>Candela Obscura · Chapter registry</FormLine>
            <RuledBox label="Lightkeeper's seal" lines={2} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CircleCreationPopup;
