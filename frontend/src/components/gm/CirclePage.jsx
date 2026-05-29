import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
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
      style={{ perspective: '1200px', height: '320px', width: '360px' }}
      onClick={() => setFlipped(f => !f)}
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
          className="bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15]/70 shadow-md p-6 flex flex-col items-center justify-center gap-3"
        >
          {inv.ink_color && (
            <div className="w-5 h-5 rounded-full" style={{ background: inv.ink_color }} />
          )}
          <span className="font-mono text-xl font-black uppercase tracking-wide text-black text-center leading-tight">
            {inv.name}
          </span>
          {inv.specialty && (
            <span className="font-mono text-xs text-black/40 uppercase">{inv.specialty}</span>
          )}
          {report ? (
            <span className="font-mono text-xs text-emerald-700 uppercase tracking-wider mt-1">Report filed ✓</span>
          ) : (
            <span className="font-mono text-xs text-black/30 uppercase tracking-wider mt-1">Pending…</span>
          )}
          <span className="font-mono text-[10px] text-black/25 uppercase mt-auto">Tap to review →</span>
        </div>

        {/* Back */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}
          className="bg-white border border-[#d6cbbe] p-4 flex flex-col gap-3 overflow-y-auto"
        >
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#721c15] border-b border-black/10 pb-1.5">
            {inv.name}'s Report
          </span>

          {/* Standard illumination questions */}
          <div className="flex flex-col gap-1.5">
            {ILLUM_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 text-xs font-black shrink-0 ${responses[`q${i}`] ? 'text-emerald-700' : 'text-black/20'}`}>
                  {responses[`q${i}`] ? '✓' : '✗'}
                </span>
                <span className="font-serif text-xs text-black/60 leading-snug">{q}</span>
              </div>
            ))}
          </div>

          {/* Illumination keys */}
          {specialtyKeys.length > 0 && (
            <div className="border-t border-black/10 pt-2.5">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40 block mb-1.5">
                {inv.specialty} Keys
              </span>
              <div className="flex flex-col gap-1">
                {specialtyKeys.map((key, i) => {
                  const checked = !!(keysDetail[i] || keysDetail[String(i)]);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs font-black shrink-0 ${checked ? 'text-emerald-700' : 'text-black/20'}`}>
                        {checked ? '✓' : '✗'}
                      </span>
                      <span className={`font-mono text-xs leading-snug ${checked ? 'text-black/80' : 'text-black/35'}`}>
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
    <div className="relative z-10 animate-sheetDrop space-y-8 text-black bg-[#f0ece4] min-h-[850px] px-8 py-8 rounded-sm shadow-inner" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.04) 27px, rgba(0,0,0,0.04) 28px)', backgroundSize: '100% 28px', backgroundPosition: '0 4px' }}>

      {/* I. Circle Identity Header — matches player CircleView */}
      <div className="bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15]/80 p-5 shadow-md rounded-sm">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Name + Chapter House (editable for GM) */}
          <div className="flex-1 space-y-3">
            <div>
              <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-black/40">
                [ CIRCLE DESIGNATION ]
              </span>
              {circle?.name ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-2xl font-serif font-black text-black uppercase leading-tight flex-1">
                    {circle.name}
                  </div>
                  <button
                    onClick={() => updateCircle({ circle_id: circId, name: '' })}
                    className="text-black/30 hover:text-black/60 text-xs font-mono shrink-0"
                    title="Edit name"
                  >✎</button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Name not yet decided…"
                  defaultValue=""
                  onBlur={e => e.target.value.trim() && updateCircle({ circle_id: circId, name: e.target.value.trim() })}
                  className="mt-1 w-full bg-white border border-dashed border-[#d6cbbe] text-black font-serif text-2xl px-3 py-1 focus:outline-none focus:border-[#721c15] uppercase"
                />
              )}
            </div>
            <div>
              <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-black/40">
                [ CHAPTER HOUSE ]
              </span>
              {circle?.chapter_house_location ? (
                <div className="flex items-start gap-2 mt-0.5">
                  <div className="font-serif text-sm text-[#721c15] italic leading-snug flex-1">
                    {circle.chapter_house_location}
                  </div>
                  <button
                    onClick={() => updateCircle({ circle_id: circId, chapter_house_location: '' })}
                    className="text-black/30 hover:text-black/60 text-xs font-mono mt-0.5 shrink-0"
                    title="Edit chapter house"
                  >✎</button>
                </div>
              ) : (
                <textarea
                  placeholder="No chapter house decided yet…"
                  defaultValue=""
                  onBlur={e => e.target.value.trim() && updateCircle({ circle_id: circId, chapter_house_location: e.target.value.trim() })}
                  rows={2}
                  className="mt-0.5 w-full bg-white border border-dashed border-[#d6cbbe] text-[#721c15] font-serif text-sm px-3 py-1.5 focus:outline-none focus:border-[#721c15] resize-none italic"
                />
              )}
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

        {/* Illumination Tracker */}
        <div className="mt-4 pt-4 border-t border-black/10">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-black/50 mb-2 flex items-center gap-1.5">
            <SafeIcon name="GiCandleLight" size={11} className="text-[#d4af37]" />
            Illumination Tracker
          </h3>
          {trackFull && (
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="mb-2 w-full px-2 py-1.5 bg-[#d4af37]/20 border border-[#d4af37] rounded-sm flex items-center gap-2 hover:bg-[#d4af37]/30 transition-colors"
            >
              <SafeIcon name="GiMedal" size={12} className="text-[#d4af37]" />
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#7a6000]">
                Track Complete — Advance Circle →
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
                  title={`Illumination ${i + 1}`}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shadow-inner transition-all ${
                    filled ? 'bg-black border-black text-white' : 'bg-transparent border-black/50 hover:border-black'
                  } ${milestone ? 'ring-2 ring-offset-1 ring-[#d4af37]' : ''}`}
                >
                  {milestone && <div className={`w-1.5 h-1.5 rounded-full bg-[#d4af37] ${filled ? 'opacity-100' : 'opacity-30'}`} />}
                </div>
              );
            })}
          </div>
          <div className="font-mono text-[9px] text-black/35">
            {illum} / {TRACK_SIZE} — milestone every 3 pips
          </div>
        </div>

        {/* Active Circle Ability */}
        <div className="mt-4 pt-4 border-t border-black/10">
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#721c15]">
            Active Circle Ability
          </span>
          {circle?.circle_ability ? (
            <div className="mt-1 space-y-1">
              {circle.circle_ability.split('\n').filter(Boolean).map((ability, i) => (
                <p key={i} className="font-serif text-sm text-black/90 leading-relaxed">
                  <span className="font-bold uppercase">{ability}: </span>
                  {CIRCLE_ABILITY_DESCRIPTIONS[ability] || ''}
                </p>
              ))}
              <button
                onClick={() => updateCircle({ circle_id: circId, circle_ability: '' })}
                className="mt-1 font-mono text-[8px] text-black/30 hover:text-black/60 uppercase tracking-wider"
              >
                ✎ Clear abilities
              </button>
            </div>
          ) : (
            <div className="mt-1">
              <p className="font-serif text-sm text-black/40 italic mb-2">No ability decided — select one:</p>
              <select
                defaultValue=""
                onChange={e => e.target.value && updateCircle({ circle_id: circId, circle_ability: e.target.value })}
                className="w-full bg-white border border-dashed border-[#d6cbbe] text-black font-mono text-sm px-2 py-1.5 focus:outline-none focus:border-[#721c15]"
              >
                <option value="">— Assign circle ability —</option>
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
          <div className="bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15]/70 p-5 shadow-md rounded-sm relative transform -rotate-[0.3deg]">
            <div className="absolute top-1.5 right-2 font-mono text-[7px] text-black/30 uppercase tracking-wider">
              Form No. 84-Illum
            </div>
            <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-[#721c15] mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
              <SafeIcon name="GiQuillInk" size={12} />
              Illumination Questions
            </h3>
            <p className="font-mono text-[8px] text-black/40 uppercase tracking-wider mb-4">
              Evaluate at the end of each assignment.
            </p>
            <div className="space-y-3">
              {ILLUM_QUESTIONS.map((q, i) => (
                <p key={i} className="font-serif text-sm text-black/80 leading-snug italic border-b border-black/10 pb-2 last:border-0">
                  <span className="font-mono text-[9px] text-black/40 not-italic mr-2">{i + 1}.</span>"{q}"
                </p>
              ))}
            </div>

            {/* GM Toggle: Open Reports */}
            <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
              <span className="font-mono text-[9px] text-black/50 uppercase tracking-wider">
                {circle?.reports_open ? 'Reports are open' : 'Reports are closed'}
              </span>
              <button
                onClick={() => gmToggleReports(circId)}
                className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border rounded-sm transition-all ${
                  circle?.reports_open
                    ? 'bg-[#721c15]/10 border-[#721c15]/50 text-[#721c15]'
                    : 'bg-transparent border-black/20 text-black/50 hover:border-black/40'
                }`}
              >
                {circle?.reports_open ? '✓ Reports Open' : 'Open Reports'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Circle Resources */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
            <SafeIcon name="GiScroll" size={14} className="text-[#721c15]" />
            Circle Resources
          </h3>
          <p className="font-mono text-xs text-black/40 uppercase tracking-wide leading-relaxed">
            Max = 1 + circle members. Spend up to 2 per assignment.
          </p>

          <div className="space-y-3">
            {RESOURCES.map(({ label, key }) => {
              const avail = circle?.[key] ?? maxCap;
              return (
                <div key={key} className="bg-white/60 border border-black/20 p-3 rounded-sm shadow-sm">
                  <span className="font-serif font-black text-sm uppercase tracking-wide text-black block mb-2">{label}</span>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-black/50 uppercase font-bold w-20">Available</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => {
                        const withinMax = i < maxCap;
                        const filled = i < avail;
                        return (
                          <div
                            key={i}
                            onClick={withinMax ? () => setResource(key, i + 1 === avail ? i : i + 1) : undefined}
                            className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                              filled
                                ? 'bg-[#721c15] border-[#721c15] cursor-pointer'
                                : withinMax
                                  ? 'bg-transparent border-black/40 hover:border-[#721c15]/50 cursor-pointer'
                                  : 'bg-transparent border-dashed border-black/15 opacity-30'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-black/30 uppercase font-bold w-20">Maximum</span>
                    <div className="flex gap-1">
                      {Array.from({ length: RESOURCE_MAX_SQUARES }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm border ${
                            i < maxCap
                              ? 'border-dashed border-black/35 bg-black/5'
                              : 'border-dotted border-black/10 bg-transparent'
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
              className="flex-1 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-widest border border-black/20 text-black/50 hover:bg-black/5 hover:text-black hover:border-black/40 rounded-sm transition-all"
            >
              Refill All Resources
            </button>
            <button
              onClick={() => gmToggleResourceEdit(circId)}
              className={`flex-1 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-widest border rounded-sm transition-all ${
                circle?.resources_editable
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'border-black/20 text-black/40 hover:border-black/40'
              }`}
            >
              {circle?.resources_editable ? '✓ Spending Allowed' : 'Lock Spending'}
            </button>
          </div>
        </div>
      </div>

      <SheetDivider />

      {/* III. Assignment Report Cards */}
      {investigators.length > 0 && (
        <div>
          <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1.5 mb-5 flex items-center gap-1.5">
            <SafeIcon name="GiPapers" size={14} className="text-[#721c15]" />
            Assignment Reports
            <span className="font-mono text-[8px] text-black/30 ml-2 normal-case">Tap a card to review</span>
          </h3>
          <div className="flex flex-wrap gap-4">
            {investigators.map((inv, idx) => (
              <div key={inv.id || idx} style={{ transform: `rotate(${idx % 2 === 0 ? '-0.5' : '0.5'}deg)` }}>
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
        <h3 className="font-mono text-[15px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1.5 mb-5 flex items-center gap-1.5">
          <SafeIcon name="GiQuillInk" size={14} className="text-[#721c15]" />
          Circle History
        </h3>

        {selQ ? (
          <div className="bg-[#fefcf5] border border-[#d6cbbe] border-l-4 border-l-[#721c15]/60 p-4 mb-5 shadow-sm rounded-sm">
            <span className="font-mono text-[8px] font-black uppercase tracking-widest text-black/40 block mb-2">
              Circle Formation Question
            </span>
            <p className="font-serif text-base text-black/80 leading-relaxed italic">"{selQ.text}"</p>
          </div>
        ) : (
          <p className="font-serif text-sm text-black/40 italic mb-5">No circle question selected yet.</p>
        )}

        {playersWithAnswers.length === 0 ? (
          <p className="font-serif text-sm text-black/40 italic">No player history accounts recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playersWithAnswers.map((inv, idx) => (
              <div
                key={inv.id || idx}
                className="bg-[#fefcf5] border border-[#d6cbbe] p-4 shadow-sm rounded-sm"
                style={{ transform: `rotate(${idx % 2 === 0 ? '0.3' : '-0.3'}deg)` }}
              >
                <div className="flex items-center gap-2 mb-2 border-b border-black/10 pb-1.5">
                  {inv.ink_color && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: inv.ink_color }} />
                  )}
                  <span className="font-mono text-[9px] font-black uppercase tracking-wide text-black/60">
                    {inv.name}
                  </span>
                  {inv.specialty && (
                    <span className="font-mono text-[8px] text-black/30 uppercase">— {inv.specialty}</span>
                  )}
                </div>
                <p className="font-serif text-sm text-black/80 leading-relaxed italic whitespace-pre-wrap">
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
          className="fixed inset-0 z-[600] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAdvanceModal(false)}
        >
          <div
            className="relative bg-[#fefcf5] border border-[#d6cbbe] border-t-4 border-t-[#721c15] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            style={{ width: 480 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <h2 className="text-2xl font-serif font-black text-black mb-1">Circle Advancement</h2>
              <p className="font-mono text-[9px] text-black/40 uppercase tracking-wider mb-6">
                Select the new circle ability. This will be broadcast to all investigators.
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
                      className="mt-1 accent-[#721c15] cursor-pointer"
                    />
                    <div>
                      <span className={`font-mono text-sm font-black transition-colors ${selectedAbility === ability ? 'text-[#721c15]' : 'text-black group-hover:text-[#721c15]'}`}>
                        {ability}
                      </span>
                      <p className="font-serif text-xs text-black/50 leading-snug mt-0.5">
                        {CIRCLE_ABILITY_DESCRIPTIONS[ability]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2 font-mono text-[10px] font-black uppercase tracking-widest border border-black/20 text-black/50 hover:border-black/40 hover:text-black rounded-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdvanceConfirm}
                  disabled={!selectedAbility}
                  className="flex-1 py-2 font-mono text-[10px] font-black uppercase tracking-widest bg-[#721c15] text-white hover:bg-[#8b2318] disabled:opacity-30 rounded-sm transition-all"
                >
                  Advance Circle →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
