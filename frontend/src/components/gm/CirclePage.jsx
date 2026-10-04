import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { tiltStyle } from '../shared/handPlaced';
import { ConfirmAction } from '../shared/ConfirmAction';
import { useDialog } from '../shared/useDialog';
import { onActivateKey, pressable } from '../shared/a11y';

// A small Clear button on the circle sheet. Clearing erases the value on the server, so
// it takes the shared two-step confirm.
const ClearButton = ({ label, armedHint, onConfirm, className = '' }) => (
  <ConfirmAction
    className={`contents ${className}`}
    hintClassName="basis-full"
    onConfirm={onConfirm}
    cancelLabel="Keep it"
    armedHint={armedHint}
    renderButton={(armed, props) => (
      <button
        {...props}
        className={`shrink-0 min-h-[36px] px-2 py-1 font-sans font-bold text-xs uppercase tracking-wider border rounded-sm transition-colors ${
          armed ? 'bg-oxblood text-cream border-ink hover:brightness-125' : 'text-sepia hover:text-oxblood border-ink/20 hover:border-oxblood/50'
        }`}
      >
        {armed ? 'Yes, clear' : label}
      </button>
    )}
  />
);
import { SheetDivider } from '../shared/Decorations';

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
  'Nobody Left Behind':  'When a member of your circle drops incapacitated, any roll to protect or extract them has +1d.',
  'In This Together':    'When you spend drive to help an ally on a roll, on a result of 3 or less, you both earn back 1 drive point of your choice.',
  'Interdisciplinary':   'Once per campaign, each character may choose an ability from a role or specialty outside their own during advancement.',
  'Resource Management': 'When your circle hits a milestone on the Illumination Track, earn back 1 Stitch, Refresh, or Train resource.',
  'One Last Run':        'The next assignment is your last. Everyone takes all four advancement options instead of two.',
};

const TRACK_SIZE = 12;
const RESOURCE_MAX_SQUARES = 9;
const RESOURCES = [
  { label: 'Stitch', key: 'stitch' },
  { label: 'Refresh', key: 'refresh' },
  { label: 'Train', key: 'train' },
];

const ILLUM_QUESTIONS = [
  'Did you contain or destroy a source of bleed?',
  'Did you provide comfort or support for those affected by a phenomenon?',
  'Did you bring something of importance back for Candela Obscura to protect or study?',
];

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

function ReportFlipCard({ inv, report }) {
  const [flipped, setFlipped] = useState(false);
  const responses = report?.responses || {};
  const specialtyKeys = ILLUMINATION_KEYS[inv.specialty] || [];
  const keysDetail = responses.keys_detail || {};

  return (
    <div
      className="cursor-pointer select-none"
      style={{ perspective: '1200px', height: '320px', width: '100%' }}
      {...pressable(() => setFlipped(f => !f), flipped ? `${inv.name}'s report: turn back to the front` : `${inv.name}: ${report ? 'read the report' : 'no report yet, turn the card'}`)}
      aria-pressed={flipped}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
          className="bg-cream border border-parchment-deep border-t-4 border-t-oxblood/70 shadow-md p-6 flex flex-col items-center justify-center gap-3"
        >
          {inv.ink_color && (
            <div className="w-5 h-5 rounded-full" style={{ background: inv.ink_color }} />
          )}
          <span className="font-sans text-xl font-black uppercase tracking-wide text-ink text-center leading-tight">
            {inv.name}
          </span>
          {inv.specialty && (
            <span className="font-sans font-bold text-xs text-sepia uppercase">{inv.specialty}</span>
          )}
          {report ? (
            <span className="font-sans font-bold text-xs text-seal-green uppercase tracking-wider mt-1">Report filed ✓</span>
          ) : (
            <span className="font-sans font-bold text-xs text-sepia uppercase tracking-wider mt-1">No report yet</span>
          )}
          <span className="font-sans font-bold text-xs text-sepia uppercase mt-auto">Tap to read →</span>
        </div>

        {/* Back */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}
          className="bg-cream border border-parchment-deep p-4 flex flex-col gap-3 overflow-y-auto"
        >
          <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood border-b border-ink/10 pb-1.5">
            {inv.name}'s Report
          </span>

          {/* Standard illumination questions */}
          <div className="flex flex-col gap-1.5">
            {ILLUM_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 text-xs font-black shrink-0 ${responses[`q${i}`] ? 'text-seal-green' : 'text-sepia'}`}>
                  {responses[`q${i}`] ? '✓' : '✗'}
                </span>
                <span className="font-serif text-xs text-sepia leading-snug">{q}</span>
              </div>
            ))}
          </div>

          {/* Illumination keys */}
          {specialtyKeys.length > 0 && (
            <div className="border-t border-ink/10 pt-2.5">
              <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia block mb-1.5">
                {inv.specialty} Keys
              </span>
              <div className="flex flex-col gap-1">
                {specialtyKeys.map((key, i) => {
                  const checked = !!(keysDetail[i] || keysDetail[String(i)]);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs font-black shrink-0 ${checked ? 'text-seal-green' : 'text-sepia'}`}>
                        {checked ? '✓' : '✗'}
                      </span>
                      <span className={`font-serif text-sm leading-snug ${checked ? 'text-ink' : 'text-sepia'}`}>
                        {key}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const CirclePage = () => {
  const {
    circle, circleCreation, updateCircle,
    gmToggleResourceEdit, gmToggleReports, gmAdvanceCircle, refillResources,
  } = useGameStore();

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState('');
  const advanceDialogRef = useDialog({ open: showAdvanceModal, onClose: () => setShowAdvanceModal(false) });

  const illum   = circle?.illumination || 0;
  const maxCap  = circle?.max_capacity || 1;
  const circId  = circle?.id || 1;

  const selQKey = circle?.backstory_answers?.selected_question_key;
  const selQ    = CIRCLE_QUESTIONS.find(q => q.key === selQKey);

  const investigators    = circleCreation?.activeInvestigators || [];
  const playersWithAnswers = investigators.filter(inv => inv.personal_circle_answer);
  const reports          = circleCreation?.reports || {};

  const trackFull = illum >= TRACK_SIZE;

  function setIllum(n) {
    updateCircle({ circle_id: circId, illumination: n });
  }

  function setResource(key, n) {
    updateCircle({ circle_id: circId, [key]: n });
  }

  function handleAdvanceConfirm() {
    if (!selectedAbility) return;
    gmAdvanceCircle(circId, selectedAbility);
    setShowAdvanceModal(false);
    setSelectedAbility('');
  }

  return (
    <div className="relative z-10 animate-sheetDrop space-y-8 text-ink bg-parchment min-h-[850px] px-8 py-8 rounded-sm shadow-inner" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.08) 27px, rgb(var(--c-sepia) / 0.08) 28px)', backgroundSize: '100% 28px', backgroundPosition: '0 4px' }}>

      {/* I. Circle Identity Header — matches player CircleView */}
      <div className="bg-cream border border-parchment-deep border-t-4 border-t-oxblood/80 p-5 shadow-md rounded-sm">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Name + Chapter House (editable for GM) */}
          <div className="flex-1 space-y-3">
            <div>
              <span className="block font-sans text-xs font-black uppercase tracking-widest text-sepia">
                Circle name
              </span>
              {circle?.name ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className="text-2xl font-serif font-black text-ink uppercase leading-tight flex-1 min-w-0 break-words">
                    {circle.name}
                  </div>
                  <ClearButton
                    label="Clear name"
                    armedHint="Press again to erase the circle's name for everyone. You can type a new one after."
                    onConfirm={() => updateCircle({ circle_id: circId, name: '' })}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="No name yet. Type one and leave the field to save."
                  defaultValue=""
                  onBlur={e => e.target.value.trim() && updateCircle({ circle_id: circId, name: e.target.value.trim() })}
                  className="mt-1 w-full bg-cream border border-dashed border-parchment-deep text-ink font-serif text-2xl px-3 py-1 focus:border-oxblood uppercase"
                />
              )}
            </div>
            <div>
              <span className="block font-sans text-xs font-black uppercase tracking-widest text-sepia">
                Chapter house
              </span>
              {circle?.chapter_house_location ? (
                <div className="flex flex-wrap items-start gap-2 mt-0.5">
                  <div className="font-serif text-sm text-oxblood italic leading-snug flex-1 min-w-0 break-words">
                    {circle.chapter_house_location}
                  </div>
                  <ClearButton
                    label="Clear"
                    armedHint="Press again to erase the chapter house for everyone. You can type a new one after."
                    onConfirm={() => updateCircle({ circle_id: circId, chapter_house_location: '' })}
                  />
                </div>
              ) : (
                <textarea
                  placeholder="No chapter house yet. Type one and leave the field to save."
                  defaultValue=""
                  onBlur={e => e.target.value.trim() && updateCircle({ circle_id: circId, chapter_house_location: e.target.value.trim() })}
                  rows={2}
                  className="mt-0.5 w-full bg-cream border border-dashed border-parchment-deep text-oxblood font-serif text-sm px-3 py-1.5 focus:border-oxblood resize-none italic"
                />
              )}
            </div>
          </div>

          {/* Insignia Stamp */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia">
              Insignia
            </span>
            <div className="w-20 h-20 rounded-full border-2 border-ink/70 flex items-center justify-center bg-parchment/40 relative shadow-inner transform -rotate-3">
              <div className="absolute inset-0 rounded-full border border-ink/20 m-1 border-dashed" />
              <SafeIcon name={circle?.insignia || 'GiCandleLight'} size={38} className="text-ink/85" />
            </div>
          </div>
        </div>

        {/* Illumination Tracker */}
        <div className="mt-4 pt-4 border-t border-ink/10">
          <h3 className="font-sans text-xs font-black uppercase tracking-widest text-sepia mb-2 flex items-center gap-1.5">
            <SafeIcon name="GiCandleLight" size={11} className="text-candle-gold" />
            Illumination
          </h3>
          {trackFull && (
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="mb-2 w-full px-2 py-1.5 bg-candle-gold/20 border border-candle-gold rounded-sm flex items-center gap-2 hover:bg-candle-gold/30 transition-colors"
            >
              <SafeIcon name="GiMedal" size={12} className="text-candle-gold" />
              <span className="font-sans text-xs font-black uppercase tracking-widest text-ink">
                Track full: advance the circle →
              </span>
            </button>
          )}
          <div className="flex gap-1.5 flex-wrap mb-1">
            {Array.from({ length: TRACK_SIZE }).map((_, i) => {
              const filled    = i < illum;
              const milestone = (i + 1) % 3 === 0;
              return (
                <div
                  key={i}
                  onClick={() => setIllum(filled && illum === i + 1 ? i : i + 1)}
                  onKeyDown={onActivateKey(() => setIllum(filled && illum === i + 1 ? i : i + 1))}
                  tabIndex={0}
                  role="button"
                  aria-label={`Set Illumination to ${filled && illum === i + 1 ? i : i + 1}`}
                  title={`Illumination ${i + 1}`}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shadow-inner transition-all ${
                    filled ? 'bg-ink border-ink text-cream' : 'bg-transparent border-ink/50 hover:border-ink'
                  } ${milestone ? 'ring-2 ring-offset-1 ring-candle-gold' : ''}`}
                >
                  {milestone && <div aria-hidden="true" className={`w-1.5 h-1.5 rounded-full bg-candle-gold ${filled ? 'opacity-100' : 'opacity-30'}`} />}
                </div>
              );
            })}
          </div>
          <div className="font-serif italic text-sm text-sepia">
            {illum} of {TRACK_SIZE}. A milestone every 3. Tap a pip to set the track.
          </div>
        </div>

        {/* Active Circle Ability */}
        <div className="mt-4 pt-4 border-t border-ink/10">
          <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood">
            Circle ability
          </span>
          {circle?.circle_ability ? (
            <div className="mt-1 space-y-1">
              {circle.circle_ability.split('\n').filter(Boolean).map((ability, i) => (
                <p key={i} className="font-serif text-sm text-ink/90 leading-relaxed">
                  <span className="font-bold uppercase">{ability}: </span>
                  {CIRCLE_ABILITY_DESCRIPTIONS[ability] || ''}
                </p>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <ClearButton
                  label={circle.circle_ability.includes('\n') ? 'Clear circle abilities' : 'Clear circle ability'}
                  armedHint="Press again to remove every circle ability listed above, including ones gained by advancing. You then choose one again from the list."
                  onConfirm={() => updateCircle({ circle_id: circId, circle_ability: '' })}
                />
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <p className="font-serif text-sm text-sepia italic mb-2">No circle ability yet. Choose one:</p>
              <select
                defaultValue=""
                onChange={e => e.target.value && updateCircle({ circle_id: circId, circle_ability: e.target.value })}
                className="w-full bg-cream border border-dashed border-parchment-deep text-ink font-serif text-base px-2 py-1.5 focus:border-oxblood"
              >
                <option value="">Choose a circle ability…</option>
                {Object.keys(CIRCLE_ABILITY_DESCRIPTIONS).map(a => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* II. Main grid: Illumination Questions + Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Assignment Dispatch Reference */}
        <div className="lg:col-span-7 space-y-6">
          <div className="hand-placed bg-cream border border-parchment-deep border-t-4 border-t-oxblood/70 p-5 shadow-md rounded-sm relative" style={{ '--tilt': '-0.6deg' }}>
            <h3 className="font-sans text-base font-black uppercase tracking-widest text-oxblood mb-1 flex items-center gap-1.5 border-b border-ink/10 pb-1">
              <SafeIcon name="GiQuillInk" size={12} />
              Illumination Questions
            </h3>
            <p className="font-serif italic text-sm text-sepia mb-4">
              Players answer these at the end of each assignment. Open reports so they can send them.
            </p>
            <div className="space-y-3">
              {ILLUM_QUESTIONS.map((q, i) => (
                <p key={i} className="font-serif text-sm text-ink/80 leading-snug italic border-b border-ink/10 pb-2 last:border-0">
                  <span className="font-mono text-xs text-sepia not-italic mr-2">{i + 1}.</span>"{q}"
                </p>
              ))}
            </div>

            {/* GM Toggle: Open Reports */}
            <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between">
              <span className="font-sans font-bold text-xs text-sepia uppercase tracking-wider">
                {circle?.reports_open ? 'Players can send reports now' : 'Reports are closed'}
              </span>
              <button
                onClick={() => gmToggleReports(circId)}
                className={`px-3 py-1.5 font-sans text-xs font-black uppercase tracking-widest border rounded-sm transition-all ${
                  circle?.reports_open
                    ? 'bg-oxblood/10 border-oxblood/50 text-oxblood'
                    : 'bg-transparent border-ink/20 text-sepia hover:border-ink/40'
                }`}
              >
                {circle?.reports_open ? 'Close reports' : 'Open reports'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Circle Resources */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-sans text-base font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1 mb-3 flex items-center gap-1.5">
            <SafeIcon name="GiScroll" size={14} className="text-oxblood" />
            Circle Resources
          </h3>
          <p className="font-serif italic text-sm text-sepia leading-relaxed">
            Each resource holds 1 more than the number of investigators. Each investigator may spend up to 2 per assignment. Tap a square to set the count.
          </p>
          <p className={`font-serif text-sm ${circle?.resources_editable ? 'text-seal-green' : 'text-sepia'}`}>
            {circle?.resources_editable ? 'Players can spend resources now.' : 'Spending is locked: players cannot spend resources.'}
          </p>

          <div className="space-y-3">
            {RESOURCES.map(({ label, key }) => {
              const avail = circle?.[key] ?? maxCap;
              return (
                <div key={key} className="bg-cream/60 border border-ink/20 p-3 rounded-sm shadow-sm">
                  <span className="font-serif font-black text-sm uppercase tracking-wide text-ink block mb-2">{label}</span>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-sans text-xs text-sepia uppercase font-bold w-[5.5rem] shrink-0">Available</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => {
                        const withinMax = i < maxCap;
                        const filled = i < avail;
                        return (
                          <div
                            key={i}
                            {...(withinMax ? {
                              role: 'button',
                              tabIndex: 0,
                              onKeyDown: onActivateKey(() => setResource(key, i + 1 === avail ? i : i + 1)),
                              'aria-label': `${label}: set available to ${i + 1 === avail ? i : i + 1}`,
                            } : { 'aria-hidden': true })}
                            onClick={withinMax ? () => setResource(key, i + 1 === avail ? i : i + 1) : undefined}
                            className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                              filled
                                ? 'bg-oxblood border-oxblood cursor-pointer'
                                : withinMax
                                  ? 'bg-transparent border-ink/40 hover:border-oxblood/50 cursor-pointer'
                                  : 'bg-transparent border-dashed border-ink/15 opacity-30'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs text-sepia uppercase font-bold w-[5.5rem] shrink-0">Maximum</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm border ${
                            i < maxCap
                              ? 'border-dashed border-ink/35 bg-black/5'
                              : 'border-dotted border-ink/10 bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resource controls */}
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={() => refillResources(circId)}
              className="flex-1 px-3 py-2 font-sans text-xs font-black uppercase tracking-widest border border-ink/20 text-sepia hover:bg-black/5 hover:text-ink hover:border-ink/40 rounded-sm transition-all"
            >
              Refill every resource
            </button>
            <button
              onClick={() => gmToggleResourceEdit(circId)}
              className={`flex-1 px-3 py-2 font-sans text-xs font-black uppercase tracking-widest border rounded-sm transition-all ${
                circle?.resources_editable
                  ? 'bg-seal-green/10 border-seal-green-lit text-seal-green'
                  : 'border-ink/20 text-sepia hover:border-ink/40'
              }`}
            >
              {circle?.resources_editable ? 'Lock spending' : 'Allow spending'}
            </button>
          </div>
        </div>
      </div>

      <SheetDivider />

      {/* III. Assignment Report Cards */}
      {investigators.length > 0 && (
        <div>
          <h3 className="font-sans text-base font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1.5 mb-5 flex items-center gap-1.5">
            <SafeIcon name="GiPapers" size={14} className="text-oxblood" />
            Assignment Reports
            <span className="font-serif italic text-sm text-sepia ml-2 normal-case tracking-normal">Tap a card to read it</span>
          </h3>
          <div className="flex flex-wrap gap-4">
            {investigators.map((inv, idx) => (
              <div key={inv.id || idx} className="hand-placed w-[360px] max-w-full" style={tiltStyle(`report-${inv.id ?? idx}`, { max: 1.4, sign: idx % 2 ? 1 : -1 })}>
                <ReportFlipCard
                  inv={inv}
                  report={reports[inv.id] || reports[String(inv.id)] || null}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <SheetDivider />

      {/* IV. Circle History */}
      <div>
        <h3 className="font-sans text-base font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1.5 mb-5 flex items-center gap-1.5">
          <SafeIcon name="GiQuillInk" size={14} className="text-oxblood" />
          Circle History
        </h3>

        {selQ ? (
          <div className="bg-cream border border-parchment-deep border-l-4 border-l-oxblood/60 p-4 mb-5 shadow-sm rounded-sm">
            <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia block mb-2">
              Circle question
            </span>
            <p className="font-serif text-base text-ink/80 leading-relaxed italic">"{selQ.text}"</p>
          </div>
        ) : (
          <p className="font-serif text-sm text-sepia italic mb-5">No circle question yet. The players vote on one in the formation papers.</p>
        )}

        {playersWithAnswers.length === 0 ? (
          <p className="font-serif text-sm text-sepia italic">No player has written an answer to the circle question yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playersWithAnswers.map((inv, idx) => (
              <div
                key={inv.id || idx}
                className="hand-placed bg-cream border border-parchment-deep p-4 shadow-sm rounded-sm"
                style={tiltStyle(`history-${inv.id ?? idx}`, { max: 1, sign: idx % 2 ? -1 : 1 })}
              >
                <div className="flex items-center gap-2 mb-2 border-b border-ink/10 pb-1.5">
                  {inv.ink_color && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: inv.ink_color }} />
                  )}
                  <span className="font-sans text-xs font-black uppercase tracking-wide text-sepia">
                    {inv.name}
                  </span>
                  {inv.specialty && (
                    <span className="font-sans font-bold text-xs text-sepia uppercase">· {inv.specialty}</span>
                  )}
                </div>
                <p className="font-serif text-sm text-ink/80 leading-relaxed italic whitespace-pre-wrap">
                  "{inv.personal_circle_answer}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Circle Advancement Modal */}
      {showAdvanceModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAdvanceModal(false)}
        >
          <div
            ref={advanceDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gm-advance-title"
            className="relative w-full max-w-[480px] max-h-[90dvh] overflow-y-auto bg-cream border border-parchment-deep border-t-4 border-t-oxblood shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-8">
              <h2 id="gm-advance-title" className="text-2xl font-serif font-black text-ink mb-1">Circle Advancement</h2>
              <p className="font-serif italic text-base text-sepia mb-6">
                Choose the circle's new ability. Every investigator sees it as soon as you advance.
              </p>

              <div className="space-y-2 mb-6">
                {Object.keys(CIRCLE_ABILITY_DESCRIPTIONS).filter(a => {
                  const currentAbilities = (circle?.circle_ability || '').split('\n').filter(Boolean);
                  return !currentAbilities.includes(a);
                }).map(ability => (
                  <label key={ability} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="new_ability"
                      value={ability}
                      checked={selectedAbility === ability}
                      onChange={() => setSelectedAbility(ability)}
                      className="mt-1 accent-oxblood cursor-pointer"
                    />
                    <div>
                      <span className={`font-serif text-base font-bold transition-colors ${selectedAbility === ability ? 'text-oxblood' : 'text-ink group-hover:text-oxblood'}`}>
                        {ability}
                      </span>
                      <p className="font-serif text-xs text-sepia leading-snug mt-0.5">
                        {CIRCLE_ABILITY_DESCRIPTIONS[ability]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2 font-sans text-xs font-black uppercase tracking-widest border border-ink/20 text-sepia hover:border-ink/40 hover:text-ink rounded-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdvanceConfirm}
                  disabled={!selectedAbility}
                  className="flex-1 py-2 font-sans text-xs font-black uppercase tracking-widest bg-oxblood text-cream hover:bg-oxblood disabled:opacity-30 rounded-sm transition-all"
                >
                  Advance the circle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
