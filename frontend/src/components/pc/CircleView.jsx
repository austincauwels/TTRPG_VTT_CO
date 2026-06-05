import React, { useState, useCallback } from 'react';
import useGameStore from '../../store/gameStore';
import { SheetDivider } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';
import { RELATIONSHIP_DATA, RELATIONSHIP_TYPES } from './CircleCreationPopup';

// ─── Canonical game content ───────────────────────────────────────────────────

const CIRCLE_QUESTIONS = [
  { key: 'q1', text: 'You have all known one another for a long time, but your circle was recently formed. Why were you brought together, and how do you each feel about it?' },
  { key: 'q2', text: "You all share a common goal that's secret to the Lightkeepers of Candela Obscura. What is it?" },
  { key: 'q3', text: "You've never met, but members of your circle are infamous. What did they do, and how do you each feel about it?" },
  { key: 'q4', text: 'Your circle was retired, but Candela Obscura recently brought you back. Why were you all dismissed, and why did they call you in again?' },
  { key: 'q5', text: 'Your circle once did something incredibly heroic. What did you do, and do other people know about it?' },
  { key: 'q6', text: 'Your circle once did something horribly evil. What did you do, and how do you seek absolution?' },
];

const CIRCLE_ABILITY_DESCRIPTIONS = {
  'Stamina Training':    'Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.',
  'Nobody Left Behind':  'When a member of your circle drops incapacitated from taking too many marks, any roll a player makes in the scene to protect them, or get them out of danger, has +1d.',
  'In This Together':    'When you spend drive to help an ally on a roll, on a result of 3 or less, you both earn back 1 drive point of your choice.',
  'Interdisciplinary':   'When choosing a new ability during character advancement, once per campaign, each character may choose an ability from a character role or specialty outside their own.',
  'Resource Management': 'When your circle hits a milestone on the Illumination Track, earn back 1 Stitch, Refresh, or Train resource.',
  'One Last Run':        'When you select this ability, the next assignment is your last. Everyone gets to take all four options during this character advancement instead of only two.',
};

const ILLUMINATION_KEYS = {
  Journalist: ['Gather Statements', 'Hunt Down a Lead', 'Speak Truth to Power'],
  Magician:   ['Perform a Trick', 'Spot a Ruse', 'Seek Out Real Magick'],
  Explorer:   ['Study an Artifact', 'Discuss History', 'Run into Danger'],
  Soldier:    ['Use Violence of Action', 'Protect Someone', 'Act Tactically'],
  Doctor:     ['Avoid a Fight', 'Aid an Ally', 'Comfort Someone'],
  Professor:  ['Mentor an Ally', 'Reference Research', 'Make a Plan'],
  Criminal:   ['Do Something Illegal', 'Make a Deal', 'Stand Up to Authority'],
  Detective:  ['Probe a Witness', 'Track a Target', 'Reveal a Clue'],
  Medium:     ['Connect with Someone', 'Sense Phenomena', 'Make a Scene'],
  Occultist:  ['Consult Arcane Texts', 'Collect Oddities', 'Act Bizarre'],
};

const ADVANCEMENT_OPTIONS = [
  'Add 1 action point',
  'Add 2 drive points',
  'Take a new ability (from your role or specialty)',
  'Gild an additional action',
];

const TRACK_SIZE = 12;
const RESOURCE_MAX_SQUARES = 9;

const RESOURCES = [
  { label: 'Stitch',  key: 'stitch',  desc: 'Clear all marks (Body, Brain, Bleed) for yourself.' },
  { label: 'Refresh', key: 'refresh', desc: 'Restore all drives, resistances & ability uses for yourself.' },
  { label: 'Train',   key: 'train',   desc: 'Gain a bonus d6 added to your next roll.' },
];

const ILLUM_QUESTIONS = [
  'Did you contain or destroy a source of bleed?',
  'Did you provide comfort or support for those affected by a phenomenon?',
  'Did you bring something of importance back for Candela Obscura to protect or study?',
];

const ALL_ACTIONS = [
  { key: 'move',    label: 'Move',    group: 'Nerve' },
  { key: 'strike',  label: 'Strike',  group: 'Nerve' },
  { key: 'control', label: 'Control', group: 'Nerve' },
  { key: 'hide',    label: 'Hide',    group: 'Cunning' },
  { key: 'sneak',   label: 'Read',    group: 'Cunning' },  // rulebook "Read" = code sneak
  { key: 'sway',    label: 'Sway',    group: 'Cunning' },
  { key: 'survey',  label: 'Survey',  group: 'Intuition' },
  { key: 'read',    label: 'Focus',   group: 'Intuition' }, // rulebook "Focus" = code read
  { key: 'sense',   label: 'Sense',   group: 'Intuition' },
];

const ADV_PICKS = [
  { id: 'add_action', label: 'Add 1 action point',                    desc: 'Raise any action rating by 1 (max 3)' },
  { id: 'add_drive',  label: 'Add 2 drive points',                    desc: 'Raise a drive pool maximum by 2' },
  { id: 'new_ability',label: 'Take a new ability',                     desc: 'Gain a new role or specialty ability' },
  { id: 'gild_action',label: 'Gild an additional action',             desc: 'One action becomes Gilded' },
];

const ROLE_ABILITY_POOL = {
  Face:    ['I Know a Guy', 'Sweet Talk', 'Cool Under Pressure'],
  Muscle:  ['Behind Me', 'Adrenaline Rush', 'Endurance'],
  Scholar: ['Well-Read', 'Occult Researcher', 'Meticulous Notes'],
  Slink:   ['Scout', 'Saw This Coming', 'Death Defy'],
  Weird:   ['Great Wards', 'Let Them In', 'Ritual'],
};

const SPECIALTY_ABILITY_POOL = {
  Journalist: ['Insider Access', 'Open Book', 'Lie Detector', 'Press Conference', 'In the Trenches', 'Well-Researched'],
  Magician:   ['Misdirection', 'Escape Artist', 'Practiced Patter', 'Uncanny Eye', 'Flourish', 'The Prestige'],
  Explorer:   ['Obscure Lexicon', 'Field Experience', 'Mind Over Matter', 'Tenacious', 'Narrow Escape', 'Not Again'],
  Soldier:    ['Basic Training', 'Geared Up', 'Sharpshooter', 'Tactician', 'Compartmentalization', 'Volunteer Duty'],
  Doctor:     ['Patch Up', 'Non-Combatant', 'Dissection', 'Resuscitation', 'Lifesaver', 'Anatomical Strike'],
  Professor:  ['Steel Mind', 'University Resources', 'Learn from My Mistakes', 'Better Part of Valor', 'Verbose', 'Chemical Concoction'],
  Criminal:   ['Street Smarts', 'Leverage', 'Hardened', 'Born in the Shadows', 'Tricks of the Trade', 'Sticky Fingers'],
  Detective:  ['Mind Palace', 'Interrogation', 'Back Against the Wall', 'Inspection', 'Stakeout', 'One Step Ahead'],
  Medium:     ['Miasma', 'Bending Spoons', 'Cold Read', 'Premonitions', 'Last Moments', 'Commune'],
  Occultist:  ['Ghostblade', 'Blood of the Covenant', 'Speak Their Language', 'Play the Bait', 'Extend Your Senses', 'Forbidden Ritual'],
};

function getAvailableAbilities(character) {
  const owned = new Set(
    [character?.role_ability, character?.specialty_ability]
      .filter(Boolean)
      .flatMap(s => s.split(';').map(a => a.trim()))
  );
  const rolePool = ROLE_ABILITY_POOL[character?.role] || [];
  const specPool = SPECIALTY_ABILITY_POOL[character?.specialty] || [];
  const all = [
    ...rolePool.map(a => ({ name: a, source: character?.role || 'Role' })),
    ...specPool.map(a => ({ name: a, source: character?.specialty || 'Specialty' })),
  ];
  return all.filter(a => !owned.has(a.name));
}

export function AdvancementModal() {
  const { character, circleAdvancement, applyAdvancement, dismissCircleAdvancement, accessSession } = useGameStore();
  const isGM = accessSession?.role === 'GM';
  // selectedPicks: array of up to 2 pick ids
  const [selectedPicks, setSelectedPicks]   = useState([]);
  // details keyed by pick id: action key, drive key, or ability text
  const [details, setDetails]               = useState({});
  const [submitted, setSubmitted]           = useState(false);

  const MAX_PICKS = 2;

  function togglePick(id) {
    setSelectedPicks(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  }

  function isReady() {
    if (selectedPicks.length !== MAX_PICKS) return false;
    for (const id of selectedPicks) {
      if ((id === 'add_action' || id === 'gild_action') && !details[id]) return false;
      if (id === 'add_drive' && !details[id]) return false;
      if (id === 'new_ability' && !details[id]?.trim()) return false;
    }
    return true;
  }

  function handleConfirm() {
    if (!isReady()) return;
    for (const id of selectedPicks) {
      applyAdvancement(id, details[id] || '');
    }
    setSubmitted(true);
  }

  // Modal only renders inside MainDeskView (player context) — no isGM check needed;
  // accessSession.role can be stale from a previous GM session.
  if (!circleAdvancement || !character) return null;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="relative bg-[#fefcf5] border-2 border-[#d4af37]/60 rounded-sm p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)]" style={{ width: 480 }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
          <h2 className="text-xl font-serif font-black text-[#7a6000] mb-3">Advancement Applied</h2>
          <p className="font-serif text-sm text-black/70 mb-6">Your choices have been recorded. Check your dossier for the updated values.</p>
          <button onClick={dismissCircleAdvancement} className="w-full py-2 font-mono text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-[#721c15] rounded-sm transition-all">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="relative bg-[#fefcf5] border-2 border-[#d4af37]/60 rounded-sm p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)]" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
        <h2 className="text-2xl font-serif font-black text-[#7a6000] mb-1 flex items-center gap-2">
          <SafeIcon name="GiMedal" size={20} className="text-[#d4af37]" />
          Circle Advancement
        </h2>
        <p className="font-mono text-[9px] text-black/40 uppercase tracking-wider mb-5">
          The Illumination Track has filled. Choose <strong>2</strong> of the following for {character?.name || 'your investigator'}:
        </p>

        {circleAdvancement?.circle?.circle_ability && (() => {
          const newAbility = circleAdvancement.circle.circle_ability.split('\n').filter(Boolean).at(-1);
          return newAbility ? (
            <div className="mb-5 p-3 bg-[#d4af37]/10 border border-[#d4af37]/40 rounded-sm">
              <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[#7a6000]">New Circle Ability</span>
              <p className="font-serif text-sm text-black/90 mt-1">
                <span className="font-bold">{newAbility}: </span>
                {CIRCLE_ABILITY_DESCRIPTIONS[newAbility] || ''}
              </p>
            </div>
          ) : null;
        })()}

        <div className="space-y-3 mb-6">
          {ADV_PICKS.map(({ id, label, desc }) => {
            const isSelected = selectedPicks.includes(id);
            const isDisabled = !isSelected && selectedPicks.length >= MAX_PICKS;
            return (
              <div key={id} className={`border rounded-sm transition-all ${isSelected ? 'border-[#721c15] bg-[#721c15]/5' : 'border-[#d6cbbe]'} ${isDisabled ? 'opacity-40' : ''}`}>
                <label className="flex items-start gap-3 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => togglePick(id)}
                    className="mt-0.5 w-4 h-4 accent-[#721c15] cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-serif text-sm font-bold text-black">{label}</span>
                    <span className="block font-mono text-[9px] text-black/40 mt-0.5">{desc}</span>
                  </div>
                </label>

                {/* Detail selectors — only shown when this pick is selected */}
                {isSelected && (id === 'add_action' || id === 'gild_action') && (
                  <div className="px-3 pb-3">
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-black/50 mb-1">Choose action:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['Nerve', 'Cunning', 'Intuition'].map(group => (
                        <div key={group}>
                          <div className="font-mono text-[8px] uppercase tracking-wider text-black/30 mb-0.5">{group}</div>
                          {ALL_ACTIONS.filter(a => a.group === group).map(a => {
                            const currentRating = character?.[a.key] || 0;
                            const atMax = currentRating >= 3 && id === 'add_action';
                            const alreadyGilded = character?.[`gilded_${a.key}`] && id === 'gild_action';
                            const unavailable = atMax || alreadyGilded;
                            return (
                              <button
                                key={a.key}
                                disabled={unavailable}
                                onClick={() => setDetails(d => ({ ...d, [id]: a.key }))}
                                className={`w-full text-left px-2 py-0.5 rounded-sm font-serif text-xs transition-all ${
                                  details[id] === a.key
                                    ? 'bg-[#721c15] text-white'
                                    : unavailable
                                      ? 'text-black/20 cursor-not-allowed'
                                      : 'hover:bg-[#721c15]/10 text-black/70'
                                }`}
                              >
                                {a.label} {id === 'add_action' ? `(${currentRating})` : alreadyGilded ? '✦' : ''}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isSelected && id === 'add_drive' && (
                  <div className="px-3 pb-3">
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-black/50 mb-1">Choose drive pool:</label>
                    <div className="flex gap-2">
                      {['nerve', 'cunning', 'intuition'].map(dk => (
                        <button
                          key={dk}
                          onClick={() => setDetails(d => ({ ...d, [id]: dk }))}
                          className={`flex-1 py-1 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all ${
                            details[id] === dk ? 'bg-[#721c15] text-white' : 'border border-[#d6cbbe] hover:border-[#721c15] text-black/60'
                          }`}
                        >
                          {dk} ({character?.[`${dk}_max`] || 0})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isSelected && id === 'new_ability' && (() => {
                  const available = getAvailableAbilities(character);
                  return (
                    <div className="px-3 pb-3">
                      <label className="block font-mono text-[9px] uppercase tracking-wider text-black/50 mb-1">
                        Choose ability ({character?.role} / {character?.specialty}):
                      </label>
                      {available.length === 0 ? (
                        <p className="font-mono text-[9px] text-black/40 italic">All abilities for your role and specialty are already learned.</p>
                      ) : (
                        <select
                          value={details[id] || ''}
                          onChange={e => setDetails(d => ({ ...d, [id]: e.target.value }))}
                          className="w-full border border-[#d6cbbe] rounded-sm px-2 py-1.5 font-serif text-sm bg-[#fefcf5] focus:outline-none focus:border-[#721c15] text-black"
                        >
                          <option value="">— Select an ability —</option>
                          {(() => {
                            const roleOpts = available.filter(a => a.source === character?.role);
                            const specOpts = available.filter(a => a.source === character?.specialty);
                            return [
                              roleOpts.length > 0 && (
                                <optgroup key="role" label={`${character?.role} (Role)`}>
                                  {roleOpts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                </optgroup>
                              ),
                              specOpts.length > 0 && (
                                <optgroup key="spec" label={`${character?.specialty} (Specialty)`}>
                                  {specOpts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                </optgroup>
                              ),
                            ];
                          })()}
                        </select>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!isReady()}
            className="flex-1 py-2 font-mono text-[10px] font-black uppercase tracking-widest bg-[#721c15] text-white hover:bg-[#8b2318] rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm Advancement ({selectedPicks.length}/{MAX_PICKS})
          </button>
          <button
            onClick={dismissCircleAdvancement}
            className="px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest border border-black/20 text-black/50 hover:text-black hover:border-black rounded-sm transition-all"
          >
            Later
          </button>
        </div>
        <p className="font-mono text-[8px] text-black/25 uppercase tracking-wider mt-3 text-center">
          Choices are applied immediately to your dossier when confirmed.
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CircleView = () => {
  const {
    circle, character, updateCircle, spendCircleResource, accessSession,
    submitAssignmentReport, circleAdvancement, dismissCircleAdvancement, applyAdvancement,
    circleCreation, respondToRelationship, proposeRelationship, openRelationshipPopup,
  } = useGameStore();

  const isGM = accessSession?.role === 'GM';

  // Per-question checkboxes for illumination evaluation
  const [evalQ, setEvalQ] = useState([false, false, false]);
  // Per-key checkboxes: { 0: bool, 1: bool, 2: bool }
  const [keyChecks, setKeyChecks] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Relationship counter-proposal state
  const [showCounter, setShowCounter] = useState({});
  const [counterDrafts, setCounterDrafts] = useState({});
  const setCounterDraft = useCallback((relId, field, value) => {
    setCounterDrafts(d => ({ ...d, [relId]: { ...d[relId], [field]: value } }));
  }, []);

  const myId = character?.id;
  const relationships = circleCreation?.relationships || [];
  const investigators = circleCreation?.activeInvestigators || [];
  const circleId = circleCreation?.circleId || circle?.id;

  const myRelationships = relationships.filter(
    r => r.from_character_id === myId || r.to_character_id === myId
  );
  const pendingRels = myRelationships.filter(r => r.status !== 'accepted');
  const acceptedRels = myRelationships.filter(r => r.status === 'accepted');

  function invName(id) {
    const inv = investigators.find(i => i.id === id);
    return inv?.name || `Investigator #${id}`;
  }

  function handleAccept(relId) {
    respondToRelationship(relId, 'accept');
  }

  function handleCounterSubmit(relId) {
    const draft = counterDrafts[relId] || {};
    if (!draft.relType) return;
    respondToRelationship(relId, 'counter', draft.relType, draft.lore || '');
    setShowCounter(s => ({ ...s, [relId]: false }));
    setCounterDrafts(d => { const n = { ...d }; delete n[relId]; return n; });
  }

  const illum     = circle?.illumination || 0;
  const maxCap    = circle?.max_capacity || 1;
  const myKeys    = ILLUMINATION_KEYS[character?.specialty] || [];
  const selQKey   = circle?.backstory_answers?.selected_question_key;
  const selQ      = CIRCLE_QUESTIONS.find(q => q.key === selQKey);
  const trackFull = illum >= TRACK_SIZE;

  const circId = circle?.id || 1;

  const checkedKeysCount = Object.values(keyChecks).filter(Boolean).length;
  const keysFulfilled = checkedKeysCount === myKeys.length && myKeys.length > 0
    ? 'all'
    : checkedKeysCount > 0
      ? 'some'
      : 'none';

  function handleResourceClick(key, pipIndex, avail) {
    const wouldSpend = (pipIndex + 1) <= avail;
    if (wouldSpend) {
      if (isGM) {
        updateCircle({ circle_id: circId, [key]: pipIndex });
      } else {
        if (!circle?.resources_editable) return;
        if ((character?.resources_spent_assignment || 0) >= 2) return;
        spendCircleResource(key);
      }
    } else {
      if (!isGM) return;
      updateCircle({ circle_id: circId, [key]: pipIndex + 1 });
    }
  }

  function handleSubmitReport() {
    if (!circle?.reports_open || submitted) return;
    const responses = {
      q0: evalQ[0],
      q1: evalQ[1],
      q2: evalQ[2],
      keys_fulfilled: keysFulfilled,
      keys_detail: keyChecks,
    };
    submitAssignmentReport(circId, character?.id, responses);
    setSubmitted(true);
    // Reset local state
    setEvalQ([false, false, false]);
    setKeyChecks({});
  }

  return (
    <div className="relative z-10 animate-sheetDrop space-y-8 text-black">

      {/* I. Circle Identity Header */}
      <div className="bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15]/80 p-5 shadow-md rounded-sm">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Name + Chapter House */}
          <div className="flex-1 space-y-3">
            <div>
              <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-black/40">
                [ CIRCLE DESIGNATION ]
              </span>
              <div className="text-2xl font-serif font-black text-black uppercase mt-1 leading-tight">
                {circle?.name || 'Unnamed Circle'}
              </div>
            </div>
            <div>
              <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-black/40">
                [ CHAPTER HOUSE ]
              </span>
              <div className="font-serif text-sm mt-0.5 italic leading-snug">
                {circle?.chapter_house_location
                  ? <span className="text-[#721c15]">{circle.chapter_house_location}</span>
                  : <span className="text-black/25">Not yet established…</span>
                }
              </div>
            </div>
          </div>

          {/* Insignia Stamp */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40">
              [ SYSTEM INSIGNIA ]
            </span>
            <div className="w-20 h-20 rounded-full border-2 border-black/70 flex items-center justify-center bg-[#ebdcb9]/40 relative shadow-inner transform -rotate-3">
              <div className="absolute inset-0 rounded-full border border-black/20 m-1 border-dashed" />
              <SafeIcon name={circle?.insignia || 'GiCandleLight'} size={38} className="text-black/85" />
            </div>
          </div>
        </div>

        {/* Illumination Tracker — under Circle Designation */}
        <div className="mt-4 pt-4 border-t border-black/10">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-black/50 mb-2 flex items-center gap-1.5">
            <SafeIcon name="GiCandleLight" size={11} className="text-[#d4af37]" />
            Illumination Tracker
          </h3>
          {trackFull && (
            <div className="mb-2 px-2 py-1.5 bg-[#d4af37]/20 border border-[#d4af37] rounded-sm flex items-center gap-2">
              <SafeIcon name="GiMedal" size={12} className="text-[#d4af37]" />
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#7a6000]">
                Track Complete — Awaiting Lightkeeper
              </span>
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap mb-1">
            {Array.from({ length: TRACK_SIZE }).map((_, i) => {
              const filled    = i < illum;
              const milestone = (i + 1) % 3 === 0;
              return (
                <div key={i} title={`Illumination ${i + 1}`}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shadow-inner transition-all ${
                    filled ? 'bg-black border-black text-white' : 'bg-transparent border-black/50'
                  } ${milestone ? 'ring-2 ring-offset-1 ring-[#d4af37]' : ''}`}>
                  {milestone && <div className={`w-1.5 h-1.5 rounded-full bg-[#d4af37] ${filled ? 'opacity-100' : 'opacity-30'}`} />}
                </div>
              );
            })}
          </div>
          <div className="font-mono text-[9px] text-black/35">
            {illum} / {TRACK_SIZE} — milestone every 3 pips
          </div>
        </div>

        {/* Active Circle Abilities (stacked) */}
        {circle?.circle_ability && (
          <div className="mt-4 pt-4 border-t border-black/10">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#721c15]">
              Circle {circle.circle_ability.split('\n').length > 1 ? 'Abilities' : 'Ability'}
            </span>
            <div className="space-y-1.5 mt-1">
              {circle.circle_ability.split('\n').filter(Boolean).map((ability, i) => (
                <p key={i} className="font-serif text-sm text-black/90 leading-relaxed">
                  <span className="font-bold uppercase">{ability}: </span>
                  {CIRCLE_ABILITY_DESCRIPTIONS[ability] || ''}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* II + III — Main body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column: Evaluation */}
        <div className="lg:col-span-7 space-y-6">
          <div>{/* spacer */}</div>

          {/* III. End-of-Assignment Illumination Questions */}
          <div className="bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15]/70 p-5 shadow-md rounded-sm relative transform -rotate-[0.3deg]">
            <div className="absolute top-1.5 right-2 font-mono text-[7px] text-black/30 uppercase tracking-wider">
              Form No. 84-Illum
            </div>
            <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-[#721c15] mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
              <SafeIcon name="GiQuillInk" size={12} />
              Illumination Questions & Keys
            </h3>
            <p className="font-mono text-[8px] text-black/40 uppercase tracking-wider mb-4">
              Evaluate at the end of each assignment.
            </p>

            {/* 3 Illumination Questions — checkboxes */}
            <div className="space-y-3 mb-5">
              {ILLUM_QUESTIONS.map((q, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={evalQ[i]}
                    onChange={() => setEvalQ(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                    className="mt-0.5 w-4 h-4 accent-[#721c15] cursor-pointer shrink-0"
                    disabled={submitted}
                  />
                  <p className="font-serif text-sm text-black/80 leading-snug italic group-hover:text-black transition-colors">
                    "{q}"
                  </p>
                </label>
              ))}
            </div>

            {/* Illumination Keys — individual checkboxes */}
            {myKeys.length > 0 && (
              <div className="border-t border-black/10 pt-4 mb-4">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-black/50 block mb-2">
                  {character?.specialty} Illumination Keys
                </span>
                <div className="space-y-1.5">
                  {myKeys.map((k, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!keyChecks[i]}
                        onChange={() => setKeyChecks(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="w-3.5 h-3.5 accent-[#721c15] cursor-pointer"
                        disabled={submitted}
                      />
                      <span className="font-serif text-sm text-black/80 group-hover:text-black transition-colors">{k}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Report Button */}
            <div className="flex items-center justify-between pt-3 border-t border-black/10">
              {submitted ? (
                <span className="font-mono text-[10px] text-emerald-700 uppercase tracking-widest font-black">
                  ✓ Report submitted to Lightkeeper
                </span>
              ) : (
                <>
                  <div>
                    <span className="font-mono text-[9px] text-black/40 uppercase tracking-wider block">
                      {circle?.reports_open ? 'Lightkeeper is accepting reports' : 'Reports not yet open'}
                    </span>
                  </div>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!circle?.reports_open}
                    className={`px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest border-2 rounded-sm transition-all ${
                      circle?.reports_open
                        ? 'bg-black text-white border-black hover:bg-[#721c15] hover:border-[#721c15]'
                        : 'bg-transparent text-black/20 border-black/20 cursor-not-allowed'
                    }`}
                  >
                    Submit Assignment Report to Lightkeeper
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Resources */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
            <SafeIcon name="GiScroll" size={14} className="text-[#721c15]" />
            Circle Resources
          </h3>

          <p className="font-mono text-xs text-black/40 uppercase tracking-wide leading-relaxed">
            Max = 1 + circle members. Spend up to 2 per assignment. Refills when the Illumination Track fills.
          </p>

          {!circle?.resources_editable && (
            <p className="font-mono text-[9px] text-black/30 uppercase tracking-widest italic">
              Resources locked — Lightkeeper controls spending.
            </p>
          )}

          {circle?.resources_editable && !isGM && (
            <p className="font-mono text-[9px] text-[#721c15]/70 uppercase tracking-widest font-bold">
              {character?.resources_spent_assignment || 0}/2 resources used this assignment
            </p>
          )}

          <div className="space-y-3">
            {RESOURCES.map(({ label, key, desc }) => {
              const avail = circle?.[key] ?? maxCap;
              const spentAll = !isGM && (character?.resources_spent_assignment || 0) >= 2;
              return (
                <div key={key} className="bg-white/60 border border-black/20 p-3 rounded-sm shadow-sm">
                  <span className="font-serif font-black text-sm uppercase tracking-wide text-black block">
                    {label}
                  </span>
                  <span className="font-mono text-[9px] text-black/35 block mb-2 leading-snug">
                    {desc}
                  </span>
                  {/* Available row — always shows 9 pips; players spend (left-click filled pip), GM can add/remove freely */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-black/50 uppercase font-bold w-20">Available</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => {
                        const withinMax = i < maxCap;
                        const filled = i < avail;
                        const wouldAdd = (i + 1) > avail;
                        const playerCanSpend = !wouldAdd && circle?.resources_editable && !spentAll && avail > 0;
                        const clickable = withinMax && (isGM || (!wouldAdd && playerCanSpend));
                        const titleText = !withinMax
                          ? 'Beyond current maximum'
                          : wouldAdd && !isGM
                            ? 'Only the Lightkeeper can refill resources'
                            : spentAll && !isGM
                              ? '2/2 resources already used this assignment'
                              : !circle?.resources_editable && !isGM
                                ? 'Resources locked — Lightkeeper controls spending'
                                : filled
                                  ? `Spend ${label}`
                                  : `Add ${label} (set to ${i + 1})`;
                        return (
                          <div
                            key={i}
                            onClick={clickable ? () => handleResourceClick(key, i, avail) : undefined}
                            title={titleText}
                            className={`w-4 h-4 rounded-sm border transition-all ${
                              filled
                                ? 'bg-[#721c15] border-[#721c15]'
                                : withinMax
                                  ? wouldAdd && !isGM
                                    ? 'bg-transparent border-dashed border-black/20'
                                    : 'bg-transparent border-black/40 hover:border-[#721c15]/50'
                                  : 'bg-transparent border-dashed border-black/15'
                            } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {/* Maximum row */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-black/30 uppercase font-bold w-20">Maximum</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-sm border ${
                            i < maxCap
                              ? 'border-black/40 bg-black/15'
                              : 'border-dashed border-black/15 bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SheetDivider />

      {/* V. Circle History */}
      <div>
        <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-4 flex items-center gap-1.5">
          <SafeIcon name="GiQuillInk" size={14} className="text-[#721c15]" />
          Circle History
        </h3>

        {selQ ? (
          <div className="bg-[#fefcf5] border border-[#d6cbbe] p-5 mb-5 rounded-sm shadow-sm border-l-4 border-l-[#721c15]">
            <span className="font-mono text-[8px] font-black uppercase tracking-widest text-black/30 block mb-2">
              Circle Formation Question
            </span>
            <p className="font-serif text-base text-black/90 leading-relaxed italic">
              "{selQ.text}"
            </p>
          </div>
        ) : (
          <p className="font-serif text-sm text-black/40 italic mb-5">
            No circle question selected. Complete the Circle Formation Papers to record your history.
          </p>
        )}

        {/* Player account */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#fefcf5] border border-[#d6cbbe] p-4 rounded-sm shadow-sm relative transform rotate-[0.2deg]">
            <div className="flex items-center gap-2 mb-2 border-b border-black/10 pb-1.5">
              <SafeIcon name="GiQuillInk" size={12} className="text-[#721c15]" />
              <span className="font-mono text-[9px] font-black uppercase tracking-wide text-black/70">
                {character?.name || 'You'}
              </span>
              {character?.specialty && (
                <span className="font-mono text-[8px] text-black/30 uppercase">— {character.specialty}</span>
              )}
            </div>
            {character?.personal_circle_answer ? (
              <p className="font-serif text-sm text-black/85 leading-relaxed italic whitespace-pre-wrap">
                "{character.personal_circle_answer}"
              </p>
            ) : (
              <p className="font-serif text-sm text-black/30 italic">
                No account recorded yet. Add yours in the Circle Formation Papers.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* VI. Circle Relationships */}
      {investigators.filter(i => i.id !== myId).length > 0 && (
        <>
          <SheetDivider />
          <div>
            <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-4 flex items-center gap-1.5">
              <SafeIcon name="GiHeartInside" size={14} className="text-[#721c15]" />
              Circle Relationships
              {pendingRels.some(r => r.last_actor_id !== myId) && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-700 font-mono text-[9px] uppercase tracking-wider rounded-sm">
                  Response needed
                </span>
              )}
            </h3>

            <div className="space-y-3">
              {investigators.filter(i => i.id !== myId).map(inv => {
                const rel = myRelationships.find(
                  r => r.from_character_id === inv.id || r.to_character_id === inv.id
                );
                const isMine = rel?.from_character_id === myId;
                const canRespond = rel && rel.status !== 'accepted' && rel.last_actor_id !== myId;
                const isAwaiting = rel && rel.status !== 'accepted' && rel.last_actor_id === myId;

                return (
                  <div key={inv.id} className="bg-[#fefcf5] border border-[#d6cbbe] p-4 rounded-sm shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      {inv.ink_color && (
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: inv.ink_color }} />
                      )}
                      <span className="font-serif font-black text-sm text-black">{inv.name}</span>
                      {inv.specialty && (
                        <span className="font-mono text-[9px] text-black/35 uppercase">— {inv.specialty}</span>
                      )}
                      {/* Open full popup for this investigator */}
                      <button
                        onClick={() => openRelationshipPopup(inv)}
                        className="ml-auto px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider border border-black/20 text-black/40 hover:border-[#721c15]/50 hover:text-[#721c15] transition-colors rounded-sm"
                        title="Open relationship form"
                      >
                        {rel ? '✎ Revisit' : '+ Propose'}
                      </button>
                    </div>

                    {rel ? (
                      <>
                        <p className="font-serif text-sm text-black/90 mb-1">
                          <span className="font-mono text-[9px] text-black/35 uppercase mr-2">
                            {isMine ? 'To them' : 'To you'}
                          </span>
                          <strong>{rel.rel_type}</strong>
                          {rel.lore ? <span className="text-black/60"> — {rel.lore}</span> : ''}
                        </p>

                        <div className="flex items-center gap-2">
                          {rel.status === 'accepted' && (
                            <span className="font-mono text-[9px] text-emerald-600 uppercase tracking-wider">✓ Confirmed</span>
                          )}
                          {isAwaiting && (
                            <span className="font-mono text-[9px] text-amber-600 uppercase tracking-wider animate-pulse">Awaiting {inv.name}…</span>
                          )}
                          {canRespond && (
                            <span className="font-mono text-[9px] text-[#721c15] uppercase tracking-wider font-black">Response needed</span>
                          )}
                        </div>

                        {canRespond && (
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAccept(rel.id)}
                                className="px-4 py-1.5 bg-emerald-50 border border-emerald-500 text-emerald-700 font-sans font-black uppercase tracking-[0.1em] text-xs hover:bg-emerald-100 transition-colors rounded-sm"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => setShowCounter(s => ({ ...s, [rel.id]: !s[rel.id] }))}
                                className="px-4 py-1.5 border border-black/20 text-black/50 font-sans font-black uppercase tracking-[0.1em] text-xs hover:border-black/40 hover:text-black transition-colors rounded-sm"
                              >
                                Counter
                              </button>
                            </div>
                            {showCounter[rel.id] && (
                              <div className="space-y-2 pt-1 border-t border-black/10">
                                <select
                                  value={counterDrafts[rel.id]?.relType || ''}
                                  onChange={e => { setCounterDraft(rel.id, 'relType', e.target.value); setCounterDraft(rel.id, 'lore', ''); }}
                                  className="w-full border border-[#d6cbbe] bg-white px-3 py-2 font-serif text-sm text-black/80 focus:outline-none focus:border-[#721c15] rounded-sm"
                                >
                                  <option value="">— They are your… —</option>
                                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {counterDrafts[rel.id]?.relType && RELATIONSHIP_DATA[counterDrafts[rel.id].relType] && (
                                  <div className="space-y-1">
                                    {RELATIONSHIP_DATA[counterDrafts[rel.id].relType].map((q, qi) => (
                                      <button key={qi} type="button"
                                        onClick={() => setCounterDraft(rel.id, 'lore', q)}
                                        className={`w-full text-left text-xs font-serif px-2.5 py-1.5 border rounded-sm transition-all leading-snug ${
                                          counterDrafts[rel.id]?.lore === q
                                            ? 'border-[#721c15] bg-[#721c15]/5 text-black/90'
                                            : 'border-black/15 text-black/45 hover:border-black/30'
                                        }`}
                                      >
                                        <span className="font-mono text-[9px] text-black/30 mr-1">{qi + 1}.</span> {q}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <textarea
                                  value={counterDrafts[rel.id]?.lore || ''}
                                  onChange={e => setCounterDraft(rel.id, 'lore', e.target.value)}
                                  placeholder="Your answer or description…"
                                  rows={2}
                                  className="w-full border border-[#d6cbbe] bg-white px-3 py-1.5 font-serif text-sm text-black/80 resize-none focus:outline-none focus:border-[#721c15] rounded-sm"
                                />
                                <button
                                  onClick={() => handleCounterSubmit(rel.id)}
                                  disabled={!counterDrafts[rel.id]?.relType}
                                  className="px-4 py-1.5 bg-[#721c15] text-white font-sans font-black uppercase tracking-[0.1em] text-xs hover:bg-[#8b2318] disabled:opacity-30 transition-colors rounded-sm"
                                >
                                  Send Counter
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="font-mono text-[10px] text-black/30 uppercase tracking-wider italic">
                        No relationship proposed yet — use Propose to begin.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
