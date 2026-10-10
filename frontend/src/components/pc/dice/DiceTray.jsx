import React, { forwardRef, useEffect, useRef } from 'react';
import { OUTCOME, keepChoices, outcomeForKept, rollPoolText } from '../../../game/outcomes';
import { useRollSounds } from '../../../game/rollSounds';
import { onActivateKey } from '../../shared/a11y';
import { tiltFor } from '../../shared/handPlaced';
import { SerialNo, serialFor } from '../../shared/PrintMarks';
import { DieFace, DIE_BODY } from './Die';

// Each outcome is a stamp on the result slip: its word, plus its own ink. Critical success
// is the one gold stamp (gold fill, ink letters), since gold text cannot be read on paper.
const OUTCOME_STAMP = {
  failure:          'text-oxblood border-oxblood',
  mixed_success:    'text-sepia border-sepia',
  full_success:     'text-seal-green border-seal-green',
  critical_success: 'text-ink border-ink bg-candle-gold',
};

// Each roll object the tray is handed gets its own number, for React's key
const rollSerials = new WeakMap();
let nextRollSerial = 1;
const rollSerial = (roll) => {
  if (!rollSerials.has(roll)) rollSerials.set(roll, nextRollSerial++);
  return rollSerials.get(roll);
};

// A roll has no id from the server; its action and dice give the slip its number
const rollKey = (roll) =>
  `${roll.action ?? ''}:${(roll.dice || []).map(d => `${d.value}${d.is_gilded ? 'g' : ''}`).join('')}${roll.is_resistance_roll ? ':r' : ''}`;

// The paper slip under the felt: who rolled (in their ink), what was thrown and which die
// counts, then the outcome stamp. Player inks are dark by design, so the name sits on
// paper, not on the felt. The red number is a numbering machine's, for the look only. A
// secret roll (the Lightkeeper's Secret) says so under the name: no other desk was told
// of it, and its line in the log is on this desk alone.
const ResultSlip = ({ lastRoll, rollerName, rollerInk, gildedPending, keptDie, rating }) => {
  const outcomeKey = lastRoll.outcome || (keptDie ? outcomeForKept(keptDie.value, lastRoll.dice) : null);
  const outcome = OUTCOME[outcomeKey];
  const key = rollKey(lastRoll);
  return (
    <div role="status" data-result-slip="" tabIndex={-1} className="hand-placed relative -mt-1 mx-2 bg-parchment text-ink px-4 pt-2.5 pb-3 shadow-[2px_6px_12px_rgba(0,0,0,0.6)] border border-sepia/30 rounded-sm"
      style={{ '--tilt': `${tiltFor(`slip-${key}`, { min: 0.4, max: 1 })}deg` }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif font-bold text-lg leading-snug truncate" style={{ color: rollerInk || 'rgb(var(--c-ink))' }}>{rollerName}</span>
        <SerialNo value={serialFor(key)} className="shrink-0" />
      </div>
      {lastRoll.is_secret && (
        <p data-secret-roll="" className="mb-0.5 flex flex-wrap items-baseline gap-x-1.5 font-serif italic text-sm leading-snug text-sepia">
          <span className="not-italic font-sans text-xs font-black uppercase tracking-widest border border-sepia/70 rounded-sm px-1.5 py-px">
            Secret<span className="sr-only">: </span>
          </span>
          only you saw this
        </p>
      )}
      <p className="font-serif text-base leading-snug">{rollPoolText(lastRoll, keptDie, rating)}</p>
      {gildedPending ? (
        <p className="mt-2 mb-0.5">
          <span className="inline-block font-sans text-xs font-black uppercase tracking-widest text-sepia border border-dashed border-sepia/70 rounded-sm px-2 py-1">
            Keep one die
          </span>
          {/* What each die would do, so the choice is made knowing it */}
          <span className="block mt-1.5 font-serif text-base leading-snug">
            {keepChoices(lastRoll).map((c) => <span key={c.idx} className="block">{c.label}</span>)}
          </span>
        </p>
      ) : outcome ? (
        <p className="mt-2 mb-0.5">
          {/* Rubber-stamped onto the slip: a little crooked (fixed per roll), the ink worn,
              pressed down once when this result lands */}
          <span
            key={`${key}-${outcomeKey}`}
            className={`ink-stamp ink-stamp-press font-display text-2xl uppercase tracking-[0.06em] leading-none px-2 pt-1.5 pb-1 border-2 rounded-sm ${OUTCOME_STAMP[outcomeKey]}`}
            style={{ '--tilt': `${tiltFor(`${key}-${outcomeKey}`, { min: 1, max: 2 })}deg` }}
          >
            {outcome.word}
          </span>
          {keptDie && lastRoll.dice?.[keptDie.idx]?.is_gilded && (
            <span className="block mt-1.5 font-serif text-base leading-snug text-sepia">
              {keepChoices(lastRoll).find((c) => c.idx === keptDie.idx)?.label.replace(/^.*?, /, '')}
            </span>
          )}
        </p>
      ) : null}
    </div>
  );
};

// Why the last roll (or a kept die) did not reach the table, on its own slip under the
// felt, in the ink errors take on paper
const RollErrorSlip = ({ message, afterSlip }) => (
  <p role="alert" className={`relative ${afterSlip ? 'mt-2' : '-mt-1'} mx-2 bg-parchment text-oxblood font-serif text-base leading-snug px-4 py-2.5 shadow-[2px_6px_12px_rgba(0,0,0,0.6)] border border-oxblood/40 rounded-sm`}>
    {message}
  </p>
);

// A loudspeaker, struck through when the sounds are off
const SpeakerIcon = ({ muted }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 9.5h3.6L12 5.6v12.8l-4.9-3.9H3.5z" fill="currentColor" stroke="none" />
    {muted
      ? <path d="M15.6 9.4l5 5.2M20.6 9.4l-5 5.2" />
      : <><path d="M15.4 9.2a4 4 0 0 1 0 5.6" /><path d="M17.9 6.8a7.4 7.4 0 0 1 0 10.4" /></>}
  </svg>
);

// The table's sounds on or off (dice, results, the watch's ticks, paper), remembered in
// this browser; it sits in the corner of the felt
const SoundToggle = () => {
  const [on, setOn] = useRollSounds();
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-pressed={on}
      aria-label="Sounds"
      title={on ? 'Sounds on' : 'Sounds off'}
      className={`absolute top-1 right-1 z-20 w-10 h-10 md:[@media(pointer:coarse)]:w-11 md:[@media(pointer:coarse)]:h-11 flex items-center justify-center rounded-full transition-colors hover:bg-cream/10 ${
        on ? 'text-parchment-deep/80 hover:text-cream' : 'text-parchment-deep/45 hover:text-parchment-deep'}`}
    >
      <SpeakerIcon muted={!on} />
    </button>
  );
};

// The felt tray. It stays empty until the first roll lands on it. dieSkews, getIsCandidate
// and onDieClick come from DiceVault, so every tray that shows the same roll lands its dice
// at the same angles.
// Keeps a keyboard user's place through a roll (playtest, keyboard-focus-dropped): when a
// gilded roll waits for a die to be kept, focus goes from the roll's row to the first die
// to keep (it ran through six "Take a mark" buttons to get there), and when the kept die
// stops being a button, from the page to the result slip.
const FocusFollowsRoll = ({ gildedPending }) => {
  const ref = useRef(null);
  const was = useRef(gildedPending);
  useEffect(() => {
    const tray = ref.current?.parentElement;
    const active = document.activeElement;
    const onPage = !active || active === document.body;
    if (gildedPending && !was.current && (onPage || active.closest?.('[data-roll-row]'))) {
      tray?.querySelector('[data-keep-die]')?.focus();
    } else if (!gildedPending && was.current && onPage) {
      tray?.querySelector('[data-result-slip]')?.focus();
    }
    was.current = gildedPending;
  }, [gildedPending]);
  return <span ref={ref} hidden />;
};

export const DiceTray = forwardRef(({
  lastRoll, isRolling, gildedPending, dieSkews, getIsCandidate, onDieClick,
  rollerName, rollerInk, keptDie, rating = null, rollWaiting = false, rollError = null,
}, ref) => (
  <div ref={ref} className="xl:shrink-0">
  <FocusFollowsRoll gildedPending={!!gildedPending} />
  <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] xl:h-[clamp(11rem,22dvh,20rem)] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
    <SoundToggle />
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
      {isRolling ? (
        <div className="text-center flex flex-col items-center justify-center">
          <span className="font-serif italic text-candle-gold text-lg">{rollWaiting ? 'Waiting for the table…' : 'Rolling…'}</span>
        </div>
      ) : lastRoll && lastRoll.dice ? (
        // Keyed by the roll, so the next roll's dice tumble in even when they show the same faces
        <div key={rollSerial(lastRoll)} className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
          <div className="flex flex-wrap justify-center gap-3 2xl:gap-4 max-w-[190px] 2xl:max-w-[260px]" role="group"
            aria-label={gildedPending ? 'Keep one die' : `Dice: ${lastRoll.dice.map((d, i) => `${d.value}${d.is_gilded ? ' gilded' : ''}${getIsCandidate(d, i) ? ' (counts)' : ''}`).join(', ')}`}>
            {lastRoll.dice.map((die, idx) => {
              const isCandidate = getIsCandidate(die, idx);
              const delayMs = idx * 75;
              const randomSkew = dieSkews[idx] || '0deg';

              let extraClasses = '';
              let clickHandler = undefined;

              if (gildedPending) {
                if (isCandidate) {
                  extraClasses = 'animate-liftShimmy cursor-pointer ring-2 ring-cream/60 hover:ring-cream hover:scale-110 transition-transform';
                  clickHandler = () => onDieClick(die, idx);
                } else {
                  extraClasses = 'opacity-35';
                }
              } else if (isCandidate) {
                extraClasses = 'ring-2 ring-seal-green-lit/70';
              }

              const tumbleClass = gildedPending ? '' : 'animate-dieTumble opacity-0';

              return (
                <div
                  key={`${idx}-${die.value}`}
                  {...(clickHandler ? {
                    role: 'button',
                    tabIndex: 0,
                    'data-keep-die': '',
                    onKeyDown: onActivateKey(clickHandler),
                    'aria-label': keepChoices(lastRoll).find((c) => c.idx === idx)?.label || `Keep the ${die.is_gilded ? 'gilded' : 'highest regular'} die, ${die.value}`,
                  } : { 'aria-hidden': true })}
                  onClick={clickHandler}
                  onTouchEnd={clickHandler ? (e) => { e.preventDefault(); clickHandler(); } : undefined}
                  className={`w-11 h-11 2xl:w-14 2xl:h-14 p-0.5 rounded flex items-center justify-center ${tumbleClass}
                    ${die.is_gilded ? `${DIE_BODY.gilded} scale-105` : `${DIE_BODY.regular} shadow-2xl`}
                    ${extraClasses}`}
                  style={{ animationDelay: gildedPending ? '0ms' : `${delayMs}ms`, '--random-skew': randomSkew }}
                >
                  <DieFace value={die.value} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <span className="sr-only">No dice thrown yet</span>
      )}
    </div>
  </div>
  {!isRolling && lastRoll?.dice && (
    <ResultSlip lastRoll={lastRoll} rollerName={rollerName} rollerInk={rollerInk} gildedPending={gildedPending} keptDie={keptDie} rating={rating} />
  )}
  {!isRolling && rollError && <RollErrorSlip message={rollError} afterSlip={!!lastRoll?.dice} />}
  </div>
));
DiceTray.displayName = 'DiceTray';
