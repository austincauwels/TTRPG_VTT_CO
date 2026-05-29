import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

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

export const RELATIONSHIP_DATA = {
  Antagonist: [
    "This person does something that makes your life more difficult. What do they do, and why do you think they treat you this way?",
    "What do you admire about this person, but would never say?",
    "You stand in the way of something this person wants. How has this changed their behavior toward you?",
    "Despite the antagonism, your relationship with this person is the most constant of any connection in your life. What do they do that feels reliable?",
    "Despite the nature of your relationship, you once did something very kind for this person. What happened, and do they know?",
    "This person knows your weakness and how to manipulate it. What is it, and how does this change your behavior?",
  ],
  Champion: [
    "This person protects you from something. What is the threat, and how do they help?",
    "This person once spoke out on your behalf at great personal risk. What was the situation, and how did it affect you?",
    "This person has told you that you are in danger. What are they protecting you from?",
    "This person does something to help you in your everyday life. What is it, and how do you thank them?",
    "You once did something very cruel to this person. Why do you believe they continue to protect you anyway?",
    "This person makes you a better person. In what way are you different when they are with you?",
  ],
  Confidant: [
    "This person keeps your dark secret. What is it?",
    "You are very cautious around everyone but this person. Why?",
    "What does this person do that lets you know you can trust them?",
    "You two are planning something in the future. What is it, and why does it make you nervous?",
    "To the outside eye, you two have a very different relationship. How do people assume you're connected?",
    "You two once got away with something illicit. What was it, and how did it change your lives?",
  ],
  Coworker: [
    "You've employed this person for years. Why did you hire them?",
    "You both hate your outside job and find Candela Obscura a welcome distraction. What about your day job would you change?",
    "You both stole money from your employer. How did you do it, and why?",
    "Through the work you do together, you've discovered something wonderful about this person few people ever see. What is it, and do they know how you feel?",
    "You had a new job opportunity, but didn't want to leave this person behind. What was the other job, and why did you stay?",
    "You owe this person more loyalty than others would expect. What did they do for you?",
  ],
  Enemy: [
    "You disagree on a fundamental belief. What is it?",
    "Despite being enemies, you and this person share a secret. What is it, and how does it bring you together?",
    "This person harmed someone you love. What did they do, and what retribution do you seek?",
    "You were once allies. What tore you apart?",
    "You two share a common enemy. Who is it, and why have you both reluctantly teamed up against them?",
    "You're in love with your enemy. What caused these feelings to develop, and why do you keep it a secret?",
  ],
  Family: [
    "You're related by blood, but don't like each other. Why?",
    "This person has always been your closest family member. What do you rely on them for?",
    "This person has chosen you to carry on a family legacy. What is it, and do you believe you are worthy?",
    "You identify with your chosen family rather than your blood. What does this person do that affirms that belief?",
    "Your other family doesn't trust this person. Why is this, and do you agree?",
    "This person was a large part of your upbringing. What was their role in your life, and how did it make you into the person you are today?",
  ],
  Lover: [
    "You two met in an unexpected way. Where were you, and what happened?",
    "What personal difficulty have you two recently navigated together?",
    "You love this person but they don't love you back. How has this affected your relationship?",
    "You keep your love a secret. Why?",
    "You once did something terrible to protect this person. What did you do, and do they know?",
    "Your family doesn't approve of your relationship with this person. Why?",
  ],
  Mentor: [
    "You admire this person above all others. What makes you feel this way?",
    "This person once taught you a valuable lesson. How did they do it, and why?",
    "This person brought you into Candela Obscura. How did they convince you to join?",
    "You resent your membership in Candela Obscura. What does this person hold over you to keep you coming back?",
    "This person once saved your life. What happened?",
    "What lie did this person teach you about the world? Do they know you've uncovered the truth?",
  ],
  Muse: [
    "What about this person drives you to pursue your dream?",
    "This person lights up every room they walk into. What do they do that draws the attention of others?",
    "You would do anything for this person. What history do you share that makes you so devoted?",
    "This person has inspired you to change something specific about your life. What was it?",
    "Something about this person fascinates you. What is it, and have you told them?",
    "This person fuels an obsession of yours that you find dangerous. What is it, and why do you still keep them in your life?",
  ],
  'Old Friend': [
    "Growing up together, what did you two always get in trouble for?",
    "You've seen this person change over the years. How are they different from the person they once were?",
    "You once had a terrible fight with this person. What from that fight still weighs on you today?",
    "There once was a third person in your friendship. What happened to them?",
    "You come from the same home or background. What drove you both away from that shared history?",
    "There was a long period during which you two did not speak. What happened, and why are you interacting again?",
  ],
  Rival: [
    "You've been in competition for years now. What drives you to best one another?",
    "There is something you secretly admire about your rival. What is it, and why will you never tell them?",
    "You both share an ally that seems in conflict with your rivalry. Who is it, and why are you tied to them?",
    "Your rival is much better at a particular skill than you are. What is it, and how does this change your behavior?",
    "If your rivalry ended, you would still want this person in your life. Why is that, and what do you do to stay tied to them?",
    "You once grievously harmed each other. What harm did you inflict, and how did it change your relationship?",
  ],
  Sibling: [
    "You're so close that you're practically of one mind. Still, what do you hide from them?",
    "You two couldn't be more different. What's one thing you never agree on?",
    "You two have another sibling. Why are you estranged from them?",
    "You two share a number of secrets, but you protect one above all others. What are you hiding?",
    "This person once asked you to do something against your morals. What was it, and did you fulfill their request?",
    "You call yourselves siblings, but you're not related by blood. What is the true nature of your relationship, and why do you lie?",
  ],
  Soulmate: [
    "What do you see in this person that they don't see in themselves?",
    "What characteristic of this person do you find endearing, but others find odd?",
    "Because of your closeness with this person, you've lost someone else you love. How has this affected your relationship?",
    "You believe this person is your soulmate but they don't know. What keeps you from being open with them?",
    "You and this person belong together, but something in your lives drives you apart. What is the cause of this opposition?",
    "Time with this person feels like coming home. What about them makes you feel this way?",
  ],
  Stranger: [
    "You have no history, but feel you can trust this person. Why?",
    "A characteristic about this person seems so familiar. Who from your past do they remind you of?",
    "What about this person feels magnetic to you?",
    "Though you've never met, you share something with this person. What is the connection, and how do you feel about it?",
    "You have a secret this person must not learn. What is it, and what do you do to protect it?",
    "This person has something you want. What is it, and how do you plan to acquire it?",
  ],
  Ward: [
    "Why did you decide to financially support this person?",
    "You fundamentally disagree about something important. What is it, and why do you care for them anyway?",
    "You feel the need to protect this person. What is the threat, and what actions do you take to ensure their safety?",
    "You once had a different ward. What happened to them, and what does this person do that reminds you of them?",
    "You can no longer support this person in the way you once did. What changed, and how have you reacted?",
    "For all you provide, this person does something particularly wonderful for you. What is it, and how has it affected your life?",
  ],
};

export const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_DATA);

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
    <div className="border border-stone-400/50 rounded-sm mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-5 py-3 bg-stone-200/60 hover:bg-stone-200 text-left"
      >
        <span className="font-mono text-base uppercase tracking-[0.2em] font-bold text-stone-700">
          {title}
        </span>
        <span className="font-mono text-stone-500 text-lg">{open ? '▲' : '▼'}</span>
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

  // ── Relationship local state (per-target) ──
  const [relDrafts, setRelDrafts] = useState({});       // { toId: { relType, lore } }
  const [counterDrafts, setCounterDrafts] = useState({});
  const [showCounter, setShowCounter] = useState({});
  const [selectedPrompt, setSelectedPrompt] = useState({}); // { toId: questionIndex }

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

  // Returns the relationship row from ME to THEM (any direction)
  const relFromMeTo = (toId) => relationships.find(
    r => r.from_character_id === myId && r.to_character_id === toId
  );
  // Returns the relationship row from THEM to ME
  const relFromThemToMe = (fromId) => relationships.find(
    r => r.from_character_id === fromId && r.to_character_id === myId
  );

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

  const handlePropose = (toId) => {
    const draft = relDrafts[toId] || {};
    if (!draft.relType) return;
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

  // ─── Relationship row renderer ───────────────────────────────────────────────

  const renderRelRow = (rel, label, theirName) => {
    if (!rel) return null;
    const canIRespond = rel.status !== 'accepted' && rel.last_actor_id !== myId;
    const isAwaiting = rel.status !== 'accepted' && rel.last_actor_id === myId;

    if (rel.status === 'accepted') {
      return (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-sm">
          <span className="text-green-600 text-xl">✓</span>
          <span className="font-serif text-lg text-stone-800">
            <strong>{rel.rel_type}</strong>{rel.lore ? ` — ${rel.lore}` : ''}
          </span>
          <span className="font-mono text-sm text-green-600 ml-auto">Confirmed</span>
        </div>
      );
    }

    if (isAwaiting) {
      return (
        <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-300 rounded-sm">
          <span className="font-serif text-lg text-stone-700">
            <strong>{rel.rel_type}</strong>{rel.lore ? ` — ${rel.lore}` : ''}
          </span>
          <span className="font-mono text-sm text-amber-700 ml-auto animate-pulse">Awaiting {theirName}…</span>
        </div>
      );
    }

    if (canIRespond) {
      return (
        <div className="p-3 bg-amber-50 border border-amber-400/60 rounded-sm space-y-3">
          <p className="font-serif text-lg text-stone-800">
            <strong>{rel.rel_type}</strong>{rel.lore ? ` — ${rel.lore}` : ''}
          </p>
          <p className="font-mono text-sm text-amber-700">{theirName} proposes this. Accept or counter?</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleAccept(rel.id)} className="btn-gold text-sm">Accept</button>
            <button
              onClick={() => setShowCounter(s => ({ ...s, [rel.id]: !s[rel.id] }))}
              className="font-sans font-black text-sm uppercase tracking-[0.1em] px-3 py-1.5 border border-stone-500 text-stone-600 hover:border-stone-800 rounded-sm"
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
                  className="w-full border border-stone-400 bg-white/80 px-3 py-2 font-serif text-lg text-stone-800 focus:outline-none rounded-sm"
                >
                  <option value="">— They are your… —</option>
                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {counterDrafts[rel.id]?.relType && RELATIONSHIP_DATA[counterDrafts[rel.id].relType] && (
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-stone-500 uppercase tracking-[0.1em]">Choose a question prompt:</p>
                    {RELATIONSHIP_DATA[counterDrafts[rel.id].relType].map((q, qi) => (
                      <button
                        key={qi}
                        type="button"
                        onClick={() => setCounterDraft(rel.id, 'lore', q)}
                        className={`w-full text-left text-base font-serif px-2.5 py-1.5 border rounded-sm transition-all leading-snug ${
                          counterDrafts[rel.id]?.lore === q
                            ? 'border-stone-700 bg-stone-100 text-stone-900'
                            : 'border-stone-200 bg-white/50 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        <span className="font-mono text-sm text-stone-400 mr-1">{qi + 1}.</span> {q}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={counterDrafts[rel.id]?.lore || ''}
                  onChange={e => setCounterDraft(rel.id, 'lore', e.target.value)}
                  placeholder="Your answer or description…"
                  rows={2}
                  className="w-full border border-stone-400 bg-white/70 px-3 py-2 font-serif text-lg text-stone-800 resize-none focus:outline-none rounded-sm"
                />
                <button onClick={() => handleCounterSubmit(rel.id)} className="btn-gold text-sm">Send Counter</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9000] flex items-center justify-center p-4 font-serif">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#f4f1ea] border-4 border-double border-stone-800 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative"
      >
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        <div className="absolute -top-1 left-8 right-8 h-6 bg-amber-100/80 border border-amber-300/60 shadow-sm rotate-[0.3deg] z-20 pointer-events-none" />

        <div className="relative z-10 p-7 pt-9">
          {/* Header */}
          <div className="border-b-2 border-stone-800 pb-5 mb-6 text-center">
            <div className="font-mono text-sm uppercase tracking-[0.3em] text-stone-500 mb-1">
              Candela Obscura — Official Registry Document
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-stone-900">
              Circle Formation Papers
            </h2>
            <div className="font-mono text-sm text-stone-500 mt-1">
              Complete collaboratively before your first assignment
            </div>
          </div>

          {/* ── SECTION I: Circle Question ── */}
          <Section title="I. Circle Question">
            <p className="font-mono text-base text-stone-500 mb-4 leading-relaxed">
              Vote on one question to define your circle's shared history. Then write your personal answer below.
            </p>
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
                      isLeading ? 'border-stone-800 bg-stone-800/5'
                      : isMine ? 'border-stone-500 bg-stone-100'
                      : 'border-stone-300 bg-white/60 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="font-serif text-lg text-stone-800 leading-snug">{q.text}</span>
                      <div className="flex flex-col items-end shrink-0">
                        {count > 0 && (
                          <span className="font-mono text-sm bg-stone-800 text-[#fbf6eb] px-2 py-0.5 rounded-full">{count}</span>
                        )}
                        {isLeading && count > 0 && (
                          <span className="font-mono text-sm text-stone-600 mt-0.5">← leading</span>
                        )}
                        {isMine && (
                          <span className="font-mono text-sm text-amber-700 mt-0.5">your vote</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {leadingQuestion && (
              <div className="mt-5 bg-white/50 border border-stone-400 rounded-sm p-4">
                <label className="font-mono text-base uppercase tracking-[0.15em] text-stone-600 block mb-2">
                  Your Personal Answer
                </label>
                <p className="font-serif text-base text-stone-500 italic mb-2 leading-snug">
                  {CIRCLE_QUESTIONS.find(q => q.key === leadingQuestion)?.text}
                </p>
                <textarea
                  value={personalAnswer}
                  onChange={e => setPersonalAnswer(e.target.value)}
                  onBlur={handlePersonalAnswerBlur}
                  rows={4}
                  placeholder="Write your character's personal perspective…"
                  className="w-full border border-stone-400 bg-white/70 p-3 font-serif text-lg text-stone-800 resize-none focus:outline-none focus:border-stone-700 rounded-sm"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #d6d3d1 27px, #d6d3d1 28px)' }}
                />
                <p className="font-mono text-sm text-stone-400 mt-1">
                  Your answer will appear on your Circle Progress Report. All answers are visible to the Lightkeeper.
                </p>
              </div>
            )}
          </Section>

          {/* ── SECTION II: Name the Circle ── */}
          <Section title="II. Name the Circle">
            <p className="font-mono text-base text-stone-500 mb-4">
              Suggest up to 5 names, then vote for the one that resonates.
              <span className="ml-2 text-stone-400">({mySuggestionCount}/5 suggestions used)</span>
            </p>
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSuggest()}
                placeholder="Suggest a circle name…"
                disabled={mySuggestionCount >= 5}
                className="flex-1 border border-stone-400 bg-white/70 px-4 py-2.5 font-serif text-lg text-stone-800 focus:outline-none focus:border-stone-700 rounded-sm disabled:opacity-40"
              />
              <button
                onClick={handleNameSuggest}
                disabled={mySuggestionCount >= 5 || !nameDraft.trim()}
                className="btn-gold shrink-0 disabled:opacity-40"
              >
                Suggest
              </button>
            </div>

            {allSuggestedNames.length > 0 ? (
              <div className="space-y-2">
                <p className="font-mono text-sm uppercase tracking-[0.15em] text-stone-500 mb-2">Vote for your favourite:</p>
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
                          isLeading ? 'border-stone-700 bg-stone-800/5' : 'border-stone-300 bg-white/40'
                        }`}
                      >
                        <button
                          onClick={() => handleNameVote(name)}
                          className={`font-mono text-sm px-3 py-1 border rounded-full transition-colors shrink-0 ${
                            isMineVote
                              ? 'bg-stone-800 text-[#fbf6eb] border-stone-800'
                              : 'border-stone-400 text-stone-600 hover:border-stone-700'
                          }`}
                        >
                          {isMineVote ? '✓ Voted' : 'Vote'}
                        </button>
                        <span className="font-serif text-lg text-stone-800 flex-1">{name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isMySuggestion && (
                            <span className="font-mono text-sm text-amber-700">yours</span>
                          )}
                          <span className="font-mono text-sm text-stone-500">{suggestCount} suggest{suggestCount !== 1 ? '' : 'ed'}</span>
                          {voteCount > 0 && (
                            <span className="font-mono text-sm bg-stone-700 text-[#fbf6eb] px-2 py-0.5 rounded-full">{voteCount}v</span>
                          )}
                          {isLeading && (
                            <span className="font-mono text-sm text-stone-600">← leading</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="font-mono text-base text-stone-400 italic text-center py-4">
                No names suggested yet. Be the first.
              </p>
            )}
          </Section>

          {/* ── SECTION III: Chapter House Location ── */}
          <Section title="III. Chapter House Location">
            <p className="font-mono text-base text-stone-500 mb-4 leading-relaxed">
              Decide where your circle's chapter house is located, and what that looks like.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="bg-amber-50/80 border border-amber-300/60 p-4 rounded-sm rotate-[-0.4deg]">
                <p className="font-serif text-base text-stone-700 leading-snug italic">
                  "The Circle of Skull &amp; Sovereign maintains a small townhouse on the Eaves. Three out of the four members are highly educated and exceedingly wealthy."
                </p>
              </div>
              <div className="bg-amber-50/80 border border-amber-300/60 p-4 rounded-sm rotate-[0.3deg]">
                <p className="font-serif text-base text-stone-700 leading-snug italic">
                  "The Circle of Loyal Malefactors has a hideaway in the Bridleborne Mountains. All five members are also redrunners."
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="font-mono text-base uppercase tracking-[0.15em] text-stone-600 block mb-2">
                Your Chapter House
              </label>
              <textarea
                key={backstoryAnswers.chapter_house}
                defaultValue={backstoryAnswers.chapter_house || ''}
                onBlur={handleLocationBlur}
                rows={3}
                placeholder="Describe your headquarters…"
                className="w-full border border-stone-400 bg-white/70 p-3 font-serif text-lg text-stone-800 resize-none focus:outline-none focus:border-stone-700 rounded-sm"
                style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #d6d3d1 27px, #d6d3d1 28px)' }}
              />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-sm uppercase tracking-[0.15em] text-stone-500 mb-2">Or choose an example:</p>
              {EXAMPLE_LOCATIONS.map(loc => (
                <button
                  key={loc.name}
                  onClick={() => updateBackstoryAnswer(circleId, 'chapter_house', `${loc.name}: ${loc.description}`)}
                  className="w-full text-left border border-stone-300 bg-white/60 hover:border-stone-600 hover:bg-stone-50 p-3 rounded-sm transition-all"
                >
                  <span className="font-serif font-bold text-lg text-stone-800 block">{loc.name}</span>
                  <span className="font-serif text-base text-stone-600 leading-snug">{loc.description}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* ── SECTION IV: Circle Ability ── */}
          <Section title="IV. Circle Ability">
            <p className="font-mono text-base text-stone-500 mb-4">
              Vote on one starting group ability. The leading choice is recorded at Roster Finalization.
            </p>
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
                      isLeading ? 'border-[#721c15] bg-[#721c15]/5'
                      : isMine ? 'border-stone-600 bg-stone-100'
                      : 'border-stone-300 bg-white/60 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="font-serif font-bold text-xl text-stone-900 block">{ability.key}</span>
                        <span className="font-serif text-base text-stone-600 leading-snug">{ability.description}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        {count > 0 && (
                          <span className="font-mono text-sm bg-stone-800 text-[#fbf6eb] px-2 py-0.5 rounded-full">{count}</span>
                        )}
                        {isMine && <span className="font-mono text-sm text-amber-700">your vote</span>}
                        {isLeading && count > 0 && <span className="font-mono text-sm text-[#721c15]">← leading</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── SECTION V: System Insignia ── */}
          <Section title="V. System Insignia">
            <p className="font-mono text-base text-stone-500 mb-4">
              Vote on the symbol that represents your circle. The leading insignia becomes your official seal.
            </p>
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
                      isLeading ? 'border-[#721c15] bg-[#721c15]/5'
                      : isMine ? 'border-stone-600 bg-stone-100'
                      : 'border-stone-300 bg-white/60 hover:border-stone-500'
                    }`}
                  >
                    <SafeIcon name={ins.key} size={36} className={isLeading ? 'text-[#721c15]' : isMine ? 'text-stone-700' : 'text-stone-500'} />
                    <span className="font-serif text-sm text-stone-700 text-center">{ins.label}</span>
                    {count > 0 && (
                      <span className="font-mono text-sm bg-stone-800 text-[#fbf6eb] px-2 py-0.5 rounded-full">{count}</span>
                    )}
                    {isMine && <span className="font-mono text-xs text-amber-700">your vote</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── SECTION VI: Relationship Matrix ── */}
          <Section title="VI. Circle Relationships">
            <p className="font-mono text-base text-stone-500 mb-5 leading-relaxed">
              Define your relationships with each fellow investigator. Propose, negotiate, and confirm before your first assignment. Both parties negotiate until they accept.
            </p>

            {others.length === 0 ? (
              <p className="font-mono text-base text-stone-400 italic text-center py-5">
                Awaiting additional investigators to be approved…
              </p>
            ) : (
              <AnimatePresence>
                {others.map((inv) => {
                  const myProposal = relFromMeTo(inv.id);
                  const incoming = relFromThemToMe(inv.id);
                  const draft = relDrafts[inv.id] || {};

                  return (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="border border-stone-300 rounded-sm p-4 mb-4 bg-white/40"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: inv.ink_color || '#8b1a1a' }} />
                        <span className="font-serif font-bold text-xl text-stone-800">{inv.name}</span>
                        <span className="font-mono text-base text-stone-500">{inv.role || inv.specialty || ''}</span>
                      </div>

                      {/* My outgoing proposal */}
                      <div className="mb-4">
                        <p className="font-mono text-base uppercase tracking-[0.12em] text-stone-500 mb-2">
                          Your relationship to {inv.name}
                        </p>
                        {myProposal ? (
                          renderRelRow(myProposal, `Your proposal to ${inv.name}`, inv.name)
                        ) : (
                          <div className="space-y-3">
                            <select
                              value={draft.relType || ''}
                              onChange={e => {
                                setRelDraft(inv.id, 'relType', e.target.value);
                                setSelectedPrompt(s => ({ ...s, [inv.id]: null }));
                                setRelDrafts(d => ({ ...d, [inv.id]: { ...d[inv.id], relType: e.target.value, lore: '' } }));
                              }}
                              className="w-full border border-stone-400 bg-white/80 px-3 py-2 font-serif text-lg text-stone-800 focus:outline-none focus:border-stone-700 rounded-sm"
                            >
                              <option value="">— They are your… —</option>
                              {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            {draft.relType && RELATIONSHIP_DATA[draft.relType] && (
                              <div className="space-y-1.5">
                                <p className="font-mono text-sm text-stone-500 uppercase tracking-[0.1em]">Choose a question to ground your answer:</p>
                                {RELATIONSHIP_DATA[draft.relType].map((q, qi) => (
                                  <button
                                    key={qi}
                                    type="button"
                                    onClick={() => selectPrompt(inv.id, qi, q)}
                                    className={`w-full text-left text-base font-serif px-3 py-2 border rounded-sm transition-all leading-snug ${
                                      selectedPrompt[inv.id] === qi
                                        ? 'border-stone-700 bg-stone-100 text-stone-900'
                                        : 'border-stone-200 bg-white/50 text-stone-600 hover:border-stone-400 hover:text-stone-800'
                                    }`}
                                  >
                                    <span className="font-mono text-sm text-stone-400 mr-1">{qi + 1}.</span> {q}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div>
                              <label className="font-mono text-sm text-stone-500 uppercase tracking-[0.1em] block mb-1.5">
                                {selectedPrompt[inv.id] != null ? 'Your answer:' : 'Or write freely:'}
                              </label>
                              <textarea
                                value={draft.lore || ''}
                                onChange={e => setRelDraft(inv.id, 'lore', e.target.value)}
                                placeholder={draft.relType ? "Write your answer to the selected question, or describe the relationship freely…" : "Select a relationship type above first…"}
                                rows={3}
                                disabled={!draft.relType}
                                className="w-full border border-stone-400 bg-white/70 px-3 py-2 font-serif text-lg text-stone-800 resize-none focus:outline-none focus:border-stone-700 rounded-sm disabled:opacity-40"
                              />
                            </div>

                            <button
                              onClick={() => handlePropose(inv.id)}
                              disabled={!draft.relType}
                              className="btn-gold disabled:opacity-40"
                            >
                              Propose Relationship
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Incoming proposal from this investigator */}
                      {incoming && (
                        <div className="mt-3 pt-3 border-t border-stone-200">
                          <p className="font-mono text-base uppercase tracking-[0.12em] text-stone-500 mb-2">
                            {inv.name}'s relationship to you
                          </p>
                          {renderRelRow(incoming, `${inv.name}'s proposal to you`, inv.name)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </Section>

          {/* ── Footer: Resource Points ── */}
          <div className="mt-5 p-5 bg-stone-800/5 border border-stone-400/40 rounded-sm text-center">
            <p className="font-mono text-base uppercase tracking-[0.2em] text-stone-600 mb-1">
              Starting Resource Points
            </p>
            <p className="font-serif text-4xl font-bold text-stone-900">{resourcePoints}</p>
            <p className="font-mono text-base text-stone-500 mt-2 leading-relaxed max-w-sm mx-auto">
              1 + {memberCount} investigator{memberCount !== 1 ? 's' : ''}. Between assignments, each player may spend
              up to two resources. Resources are not replenished until the Illumination Track fills.
            </p>
          </div>

          <div className="mt-5 text-center">
            <p className="font-mono text-base text-stone-400 uppercase tracking-[0.2em] animate-pulse">
              Awaiting Lightkeeper to finalize roster…
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CircleCreationPopup;
