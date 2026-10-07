import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { RelationshipNegotiation, useRelationshipForms } from './relationships/RelationshipNegotiation';
import { useDialog } from '../shared/useDialog';
import { onActivateKey } from '../shared/a11y';
import { FormLine, SerialNo, DateStamp, PrinterMark, BlankEntry, BlankQuestionCard, serialFor, stampDate } from '../shared/PrintMarks';
import { CirclePaper, CirclePapers } from '../shared/CirclePaper';

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

// The abilities an advancement can give: the role's and the specialty's, and with the
// circle's Interdisciplinary (p. 41), until one is taken, every other role's and
// specialty's (outside: true). The server checks the same (backend/vtt/creation.py).
function getAvailableAbilities(character, circle) {
  const owned = new Set(
    [character?.role_ability, character?.specialty_ability]
      .filter(Boolean)
      .flatMap(s => s.split(';').map(a => a.trim()))
      .filter(a => a && a !== 'None')
  );
  const rolePool = ROLE_ABILITY_POOL[character?.role] || [];
  const specPool = SPECIALTY_ABILITY_POOL[character?.specialty] || [];
  const all = [
    ...rolePool.map(a => ({ name: a, source: character?.role || 'Role' })),
    ...specPool.map(a => ({ name: a, source: character?.specialty || 'Specialty' })),
  ];
  const own = new Set([...rolePool, ...specPool]);
  const circleAbilities = (circle?.circle_ability || '').split('\n').map(a => a.trim());
  const outsideTaken = [...owned].some(a => !own.has(a));
  if (circleAbilities.includes('Interdisciplinary') && rolePool.length && specPool.length && !outsideTaken) {
    for (const [source, pool] of [...Object.entries(ROLE_ABILITY_POOL), ...Object.entries(SPECIALTY_ABILITY_POOL)]) {
      if (source === character.role || source === character.specialty) continue;
      all.push(...pool.map(a => ({ name: a, source, outside: true })));
    }
  }
  return all.filter(a => !owned.has(a.name));
}

export function AdvancementModal() {
  const { character, circle, circleAdvancement, applyAdvancement, dismissCircleAdvancement, advancementDeferred, advancementError } = useGameStore();
  // selectedPicks: array of up to 2 pick ids
  const [selectedPicks, setSelectedPicks]   = useState([]);
  // details keyed by pick id: action key, drive key, or ability text
  const [details, setDetails]               = useState({});
  const [submitted, setSubmitted]           = useState(false);
  // The picks the Lightkeeper's circle advance gave this investigator and not chosen yet
  // (two per advancement, kept on the character until chosen), and the options already
  // taken in this advancement, which the other pick must differ from
  const picksLeft = character?.advancement_picks || 0;
  const taken = Array.isArray(character?.advancement_taken) ? character.advancement_taken : [];
  const open = !!character && picksLeft > 0 && !advancementDeferred;
  const close = () => { setSubmitted(false); setSelectedPicks([]); setDetails({}); dismissCircleAdvancement(); };
  const dialogRef = useDialog({ open: open || submitted, onClose: close, view: submitted });

  const MAX_PICKS = picksLeft % 2 === 1 ? 1 : 2;

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
      if (!applyAdvancement(id, details[id] || '')) return;
    }
    setSubmitted(true);
  }

  // Modal only renders inside MainDeskView (player context). Its "applied" slip shows
  // until it is closed, even once the server has used up the picks (that used to hide it).
  if (!character || (!open && !submitted)) return null;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="advancement-done-title" className="relative bg-cream border-2 border-candle-gold/60 rounded-sm p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-full max-w-[480px]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-candle-gold" />
          <h2 id="advancement-done-title" className="text-xl font-serif font-black text-oxblood mb-4">
            {advancementError ? 'Advancement not applied' : 'Advancement Applied'}
          </h2>
          {advancementError && <p role="alert" className="font-serif text-base text-ink mb-4">{advancementError}</p>}
          <button
            onClick={advancementError && picksLeft > 0 ? () => { setSubmitted(false); setSelectedPicks([]); } : close}
            className="w-full py-2 font-sans text-xs font-black uppercase tracking-widest bg-ink text-cream hover:bg-oxblood rounded-sm transition-all"
          >
            {advancementError && picksLeft > 0 ? 'Choose again' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="advancement-title" className="relative bg-cream border-2 border-candle-gold/60 rounded-sm p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-full max-w-[520px] max-h-[90dvh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-candle-gold" />
        <h2 id="advancement-title" className="text-2xl font-serif font-black text-oxblood mb-1 flex items-center gap-2">
          <SafeIcon name="GiMedal" size={20} className="text-candle-gold" />
          Circle Advancement
        </h2>
        <p className="font-serif italic text-base text-sepia mb-5">
          The Illumination track is full: <strong>{MAX_PICKS}</strong> {MAX_PICKS === 1 ? 'advancement' : 'advancements'} for {character?.name || 'your investigator'}.
        </p>

        {circleAdvancement?.circle?.circle_ability && (() => {
          const newAbility = circleAdvancement.circle.circle_ability.split('\n').filter(Boolean).at(-1);
          return newAbility ? (
            <div className="mb-5 p-3 bg-candle-gold/10 border border-candle-gold/40 rounded-sm">
              <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood">New Circle Ability</span>
              <p className="font-serif text-sm text-ink/90 mt-1">
                <span className="font-bold">{newAbility}: </span>
                {CIRCLE_ABILITY_DESCRIPTIONS[newAbility] || ''}
              </p>
            </div>
          ) : null;
        })()}

        <div className="space-y-3 mb-6">
          {ADV_PICKS.map(({ id, label, desc: baseDesc }) => {
            const desc = id === 'add_drive'
              ? 'Two drive points: both on one drive, or one each on two (a drive goes up to 9)'
              : baseDesc;
            const isSelected = selectedPicks.includes(id);
            const isDisabled = !isSelected && (selectedPicks.length >= MAX_PICKS || taken.includes(id));
            return (
              <div key={id} className={`border rounded-sm transition-all ${isSelected ? 'border-oxblood bg-oxblood/5' : 'border-parchment-deep'} ${isDisabled ? 'opacity-40' : ''}`}>
                <label className="flex items-start gap-3 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => togglePick(id)}
                    className="mt-0.5 w-4 h-4 accent-oxblood cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-serif text-sm font-bold text-ink">{label}</span>
                    <span className="block font-serif text-sm text-sepia mt-0.5">{desc}</span>
                  </div>
                </label>

                {/* Detail selectors — only shown when this pick is selected */}
                {isSelected && (id === 'add_action' || id === 'gild_action') && (
                  <div className="px-3 pb-3">
                    <p id={`adv-${id}-label`} className="block font-sans font-bold text-xs uppercase tracking-wider text-sepia mb-1">Action</p>
                    <div className="grid grid-cols-3 gap-1" role="group" aria-labelledby={`adv-${id}-label`}>
                      {['Nerve', 'Cunning', 'Intuition'].map(group => (
                        <div key={group}>
                          <div className="font-sans font-bold text-xs uppercase tracking-wider text-sepia mb-0.5">{group}</div>
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
                                    ? 'bg-oxblood text-cream'
                                    : unavailable
                                      ? 'text-sepia cursor-not-allowed'
                                      : 'hover:bg-oxblood/10 text-ink/70'
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
                    <p id={`adv-${id}-label`} className="block font-sans font-bold text-xs uppercase tracking-wider text-sepia mb-1">Drive</p>
                    <div className="flex gap-2" role="group" aria-labelledby={`adv-${id}-label`}>
                      {['nerve', 'cunning', 'intuition'].map(dk => {
                        // Up to two drives: the first tap puts both points on it, a tap on a
                        // second drive splits them one each, a tap on a chosen one clears it
                        const chosen = (details[id] || '').split(',').filter(Boolean);
                        const on = chosen.includes(dk);
                        const points = chosen.length === 1 && on ? 2 : on ? 1 : 0;
                        const atMax = (character?.[`${dk}_max`] || 0) + (on ? points : 1) > 9;
                        const toggle = () => setDetails(d => {
                          const cur = (d[id] || '').split(',').filter(Boolean);
                          const next = cur.includes(dk) ? cur.filter(x => x !== dk) : [...cur, dk].slice(-2);
                          return { ...d, [id]: next.join(',') };
                        });
                        return (
                          <button
                            key={dk}
                            onClick={toggle}
                            disabled={!on && atMax}
                            aria-pressed={on}
                            className={`flex-1 py-1 rounded-sm font-sans font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 ${
                              on ? 'bg-oxblood text-cream' : 'border border-parchment-deep hover:border-oxblood text-sepia'
                            }`}
                          >
                            {dk} ({character?.[`${dk}_max`] || 0}{points ? ` +${points}` : ''})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isSelected && id === 'new_ability' && (() => {
                  const available = getAvailableAbilities(character, circle);
                  const outside = available.filter(a => a.outside);
                  return (
                    <div className="px-3 pb-3">
                      <label htmlFor="adv-new-ability" className="block font-sans font-bold text-xs uppercase tracking-wider text-sepia mb-1">
                        Ability
                      </label>
                      {available.length === 0 ? (
                        <p className="font-serif text-sm text-sepia italic">All abilities for your role and specialty are already learned.</p>
                      ) : (
                        <select
                          id="adv-new-ability"
                          value={details[id] || ''}
                          onChange={e => setDetails(d => ({ ...d, [id]: e.target.value }))}
                          className="w-full border border-parchment-deep rounded-sm px-2 py-1.5 font-serif text-sm bg-cream focus:border-oxblood text-ink"
                        >
                          <option value="" aria-label="None"></option>
                          {(() => {
                            const roleOpts = available.filter(a => !a.outside && a.source === character?.role);
                            const specOpts = available.filter(a => !a.outside && a.source === character?.specialty);
                            const outsideGroups = [...new Set(outside.map(a => a.source))];
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
                              ...outsideGroups.map(source => (
                                <optgroup key={`outside-${source}`} label={`${source} (Interdisciplinary)`}>
                                  {outside.filter(a => a.source === source).map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                </optgroup>
                              )),
                            ];
                          })()}
                        </select>
                      )}
                      {outside.length > 0 && (
                        <p className="font-serif text-sm text-sepia italic mt-1">
                          Interdisciplinary: once a campaign, one new ability may come from another role or specialty.
                        </p>
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
            className="flex-1 py-2 font-sans text-xs font-black uppercase tracking-widest bg-oxblood text-cream hover:bg-oxblood rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm Advancement ({selectedPicks.length}/{MAX_PICKS})
          </button>
          <button
            onClick={close}
            className="px-4 py-2 font-sans text-xs font-black uppercase tracking-widest border border-ink/20 text-sepia hover:text-ink hover:border-ink rounded-sm transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CircleView = () => {
  const {
    circle, character, updateCircle, spendCircleResource, accessSession,
    submitAssignmentReport, circleAdvancement, dismissCircleAdvancement, applyAdvancement,
    circleCreation, respondToRelationship, proposeRelationship,
  } = useGameStore();

  const isGM = accessSession?.role === 'GM';

  // Per-question checkboxes for illumination evaluation
  const [evalQ, setEvalQ] = useState([false, false, false]);
  // Per-key checkboxes: { 0: bool, 1: bool, 2: bool }
  const [keyChecks, setKeyChecks] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Relationship drafts for the shared relationship form
  const relForms = useRelationshipForms();

  const myId = character?.id;
  const relationships = circleCreation?.relationships || [];
  const investigators = circleCreation?.activeInvestigators || [];
  const circleId = circleCreation?.circleId || circle?.id;

  const myRelationships = relationships.filter(
    r => r.from_character_id === myId || r.to_character_id === myId
  );
  const pendingRels = myRelationships.filter(r => r.status !== 'accepted');


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
    // The circle's file: the charter, the assignment report, the stores' ledger, the
    // history and the relationships, each its own paper, side by side (CirclePaper.jsx)
    <div className="relative z-10 animate-sheetDrop text-ink">
    <CirclePapers>

      {/* I. The circle's charter */}
      <CirclePaper kind="charter" tilt={-0.4} aria-labelledby="circle-charter-name">
        <div className="flex items-center gap-2 -mt-1 mb-3" aria-hidden="true">
          <PrinterMark size={13} />
          <FormLine>Form C.O. 3 · Circle charter</FormLine>
          <SerialNo value={serialFor(`circle-${circle?.id ?? ''}`)} className="ml-auto" />
        </div>
        <div className="flex gap-4 items-start">

          {/* Name + Chapter House */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <span className="block font-sans text-xs font-black uppercase tracking-widest text-sepia">
                Circle name
              </span>
              <div id="circle-charter-name" className="text-xl font-serif font-black text-ink uppercase mt-0.5 leading-tight break-words">
                {circle?.name || 'Unnamed Circle'}
              </div>
            </div>
            <div>
              <span className="block font-sans text-xs font-black uppercase tracking-widest text-sepia">
                Chapter house
              </span>
              <div className="font-serif text-sm mt-0.5 italic leading-snug">
                {circle?.chapter_house_location
                  ? <span className="text-oxblood">{circle.chapter_house_location}</span>
                  : <span className="text-sepia"><BlankEntry label="Not chosen" className="!w-40" /></span>
                }
              </div>
            </div>
          </div>

          {/* Insignia Stamp */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia">
              Insignia
            </span>
            <div className="w-16 h-16 rounded-full border-2 border-ink/70 flex items-center justify-center bg-parchment/40 relative shadow-inner transform -rotate-3">
              <div className="absolute inset-0 rounded-full border border-ink/20 m-1 border-dashed" />
              <SafeIcon name={circle?.insignia || 'GiCandleLight'} size={30} className="text-ink/85" />
            </div>
          </div>
        </div>

        {/* Illumination Tracker */}
        <div className="mt-3 pt-3 border-t border-ink/10">
          <h3 className="font-sans text-xs font-black uppercase tracking-widest text-sepia mb-2 flex items-center gap-1.5">
            <SafeIcon name="GiCandleLight" size={11} className="text-candle-gold" />
            Illumination
            <span className="ml-auto font-mono tabular-nums text-sm font-normal normal-case tracking-normal text-sepia">{illum} / {TRACK_SIZE}</span>
          </h3>
          {trackFull && (
            <div className="mb-2 px-2 py-1.5 bg-candle-gold/20 border border-candle-gold rounded-sm flex items-center gap-2">
              <SafeIcon name="GiMedal" size={12} className="text-candle-gold" />
              <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood">
                Track full: the Lightkeeper advances the circle
              </span>
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap" role="img" aria-label={`Illumination ${illum} of ${TRACK_SIZE}`}>
            {Array.from({ length: TRACK_SIZE }).map((_, i) => {
              const filled    = i < illum;
              const milestone = (i + 1) % 3 === 0;
              return (
                <div key={i} title={`Illumination ${i + 1}`}
                  className={`w-[1.125rem] h-[1.125rem] rounded-full border flex items-center justify-center shadow-inner transition-all ${
                    filled ? 'bg-ink border-ink text-cream' : 'bg-transparent border-ink/50'
                  } ${milestone ? 'ring-2 ring-offset-1 ring-candle-gold' : ''}`}>
                  {milestone && <div className={`w-1.5 h-1.5 rounded-full bg-candle-gold ${filled ? 'opacity-100' : 'opacity-30'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Circle Abilities (stacked) */}
        {circle?.circle_ability && (
          <div className="mt-3 pt-3 border-t border-ink/10">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood">
              Circle {circle.circle_ability.split('\n').length > 1 ? 'Abilities' : 'Ability'}
            </span>
            <div className="space-y-1.5 mt-1">
              {circle.circle_ability.split('\n').filter(Boolean).map((ability, i) => (
                <p key={i} className="font-serif text-sm text-ink/90 leading-snug">
                  <span className="font-bold uppercase">{ability}: </span>
                  {CIRCLE_ABILITY_DESCRIPTIONS[ability] || ''}
                </p>
              ))}
            </div>
          </div>
        )}
      </CirclePaper>

      {/* II. The assignment report: the illumination questions and this investigator's keys */}
      <CirclePaper kind="ruled" tilt={0.5} tape aria-labelledby="circle-report-title">
        <h3 id="circle-report-title" className="font-sans text-sm font-black uppercase tracking-widest text-oxblood flex items-center gap-1.5 border-b border-ink/10 pb-1">
          <SafeIcon name="GiQuillInk" size={12} />
          Illumination Questions & Keys
        </h3>
        <FormLine className="block mt-1 mb-3">Form C.O. 11 · Assignment report</FormLine>

        {/* 3 Illumination Questions — checkboxes */}
        <div className="space-y-2 mb-3">
          {ILLUM_QUESTIONS.map((q, i) => (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={evalQ[i]}
                onChange={() => setEvalQ(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                className="mt-0.5 w-4 h-4 accent-oxblood cursor-pointer shrink-0"
                disabled={submitted}
              />
              <p className="font-serif text-sm text-ink/80 leading-snug italic group-hover:text-ink transition-colors">
                "{q}"
              </p>
            </label>
          ))}
        </div>

        {/* Illumination Keys — individual checkboxes */}
        {myKeys.length > 0 && (
          <div className="border-t border-ink/10 pt-2.5 mb-3">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia block mb-1.5">
              {character?.specialty} Illumination Keys
            </span>
            <div className="space-y-1">
              {myKeys.map((k, i) => (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!keyChecks[i]}
                    onChange={() => setKeyChecks(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="w-3.5 h-3.5 accent-oxblood cursor-pointer"
                    disabled={submitted}
                  />
                  <span className="font-serif text-sm text-ink/80 group-hover:text-ink transition-colors">{k}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Submit Report Button */}
        <div className="flex items-center justify-between pt-2.5 border-t border-ink/10">
          {submitted ? (
            <span role="status" className="flex items-center gap-3">
              <span className="sr-only">Report sent to the Lightkeeper</span>
              <DateStamp label="Report sent" date={stampDate(new Date())} tone="green" tilt={-2} />
            </span>
          ) : (
            <>
              <span className="font-sans font-bold text-xs text-sepia uppercase tracking-wider">
                {circle?.reports_open ? 'Reports open' : 'Reports closed'}
              </span>
              <button
                onClick={handleSubmitReport}
                disabled={!circle?.reports_open}
                className={`px-4 py-2 font-sans text-xs font-black uppercase tracking-widest border-2 rounded-sm transition-all ${
                  circle?.reports_open
                    ? 'bg-ink text-cream border-ink hover:bg-oxblood hover:border-oxblood'
                    : 'bg-transparent text-sepia border-ink/20 cursor-not-allowed'
                }`}
              >
                Send report
              </button>
            </>
          )}
        </div>
      </CirclePaper>

      {/* III. The stores' ledger card: the circle's resources */}
      <CirclePaper kind="manila" tilt={-0.6} aria-labelledby="circle-resources-title">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-ink/25 pb-1 mb-2.5">
          <h3 id="circle-resources-title" className="font-sans text-sm font-black uppercase tracking-widest text-ink flex items-center gap-1.5">
            <SafeIcon name="GiScrollUnfurled" size={14} className="text-oxblood" />
            Circle Resources
          </h3>
          {/* Where spending stands: locked by the GM, or how many of this assignment's two are used */}
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">
            {circle?.resources_editable ? (
              !isGM && (
                <>Spent this assignment <span className="font-mono tabular-nums text-sm text-oxblood ml-1">{character?.resources_spent_assignment || 0} / 2</span></>
              )
            ) : (
              <span className="flex items-center gap-1.5">
                <SafeIcon name="GiPadlock" size={13} />
                Spending locked
              </span>
            )}
          </span>
        </div>

        <div className="divide-y divide-dashed divide-sepia/35">
          {RESOURCES.map(({ label, key, desc }) => {
            const avail = circle?.[key] ?? maxCap;
            const spentAll = !isGM && (character?.resources_spent_assignment || 0) >= 2;
            return (
              <div key={key} className="py-2 first:pt-0 last:pb-0">
                <p className="font-serif text-sm leading-snug text-ink">
                  <span className="font-black uppercase tracking-wide mr-1.5">{label}</span>
                  <span className="text-sepia">{desc}</span>
                </p>
                {/* Available row — always shows 9 pips; players spend (left-click filled pip), GM can add/remove freely */}
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-1.5 mb-1">
                  <span className="font-sans text-xs text-sepia uppercase font-bold w-[5.5rem] shrink-0">Available</span>
                  <div className="flex flex-wrap gap-1">
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
                            ? 'You have used 2 of 2 this assignment'
                            : !circle?.resources_editable && !isGM
                              ? 'Spending is locked by the Lightkeeper'
                              : filled
                                ? `Spend ${label}`
                                : `Add ${label} (set to ${i + 1})`;
                      return (
                        <div
                          key={i}
                          onClick={clickable ? () => handleResourceClick(key, i, avail) : undefined}
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={clickable ? onActivateKey(() => handleResourceClick(key, i, avail)) : undefined}
                          aria-label={clickable ? titleText : undefined}
                          aria-hidden={clickable ? undefined : true}
                          title={titleText}
                          className={`w-4 h-4 rounded-sm border transition-all ${
                            filled
                              ? 'bg-oxblood border-oxblood'
                              : withinMax
                                ? wouldAdd && !isGM
                                  ? 'bg-transparent border-dashed border-ink/30'
                                  : 'bg-transparent border-ink/40 hover:border-oxblood/50'
                                : 'bg-transparent border-dashed border-ink/15'
                          } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                        />
                      );
                    })}
                  </div>
                </div>
                {/* Maximum row */}
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="font-sans text-xs text-sepia uppercase font-bold w-[5.5rem] shrink-0">Maximum</span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-sm border ${
                          i < maxCap
                            ? 'border-ink/40 bg-black/15'
                            : 'border-dashed border-ink/15 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CirclePaper>

      {/* IV. The circle's history: its question, and this investigator's answer */}
      <CirclePaper kind="laid" tilt={0.7} aria-labelledby="circle-history-title">
        <h3 id="circle-history-title" className="font-sans text-sm font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1 mb-2.5 flex items-center gap-1.5">
          <SafeIcon name="GiQuillInk" size={14} className="text-oxblood" />
          Circle History
        </h3>

        {selQ ? (
          <div className="mb-3">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia block mb-1">
              Circle question
            </span>
            <p className="font-serif text-base text-ink/90 leading-snug italic">
              "{selQ.text}"
            </p>
          </div>
        ) : (
          <BlankQuestionCard className="mb-3" />
        )}

        {/* Player account */}
        <div className="pt-2 border-t border-dashed border-sepia/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-xs font-black uppercase tracking-wide text-ink/70">
              {character?.name || 'You'}
            </span>
            {character?.specialty && (
              <span className="font-sans font-bold text-xs text-sepia uppercase">· {character.specialty}</span>
            )}
          </div>
          {character?.personal_circle_answer ? (
            <p className="font-serif text-sm text-ink/85 leading-snug italic whitespace-pre-wrap">
              "{character.personal_circle_answer}"
            </p>
          ) : (
            // The answer lines, left blank
            <>
              <span aria-hidden="true" className="block h-6 border-b border-dotted border-sepia/45" />
              <span aria-hidden="true" className="block h-6 border-b border-dotted border-sepia/45" />
              <span className="sr-only">No answer</span>
            </>
          )}
        </div>
      </CirclePaper>

      {/* V. Circle Relationships */}
      {investigators.filter(i => i.id !== myId).length > 0 && (
        <CirclePaper kind="plain" tilt={-0.5} aria-labelledby="circle-relationships-title">
          <h3 id="circle-relationships-title" className="font-sans text-sm font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1 mb-3 flex flex-wrap items-center gap-1.5">
            <SafeIcon name="GiHeartInside" size={14} className="text-oxblood" />
            Circle Relationships
            {pendingRels.some(r => r.last_actor_id !== myId) && (
              <span className="ml-2 px-2 py-0.5 bg-parchment-deep border border-candle-gold text-sepia font-sans font-bold text-xs uppercase tracking-wider rounded-sm">
                Response needed
              </span>
            )}
          </h3>

          <div className="divide-y divide-dashed divide-sepia/40">
            {investigators.filter(i => i.id !== myId).map(inv => (
              <RelationshipNegotiation
                compact
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
        </CirclePaper>
      )}

    </CirclePapers>
    </div>
  );
};
