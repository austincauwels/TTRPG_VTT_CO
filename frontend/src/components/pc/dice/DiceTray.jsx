import React, { forwardRef } from 'react';
import { OUTCOME, outcomeForKept, rollPoolText } from '../../../game/outcomes';
import { useRollSounds } from '../../../game/rollSounds';
import { onActivateKey } from '../../shared/a11y';
import { tiltFor } from '../../shared/handPlaced';
import { SerialNo, serialFor } from '../../shared/PrintMarks';

// Each outcome is a stamp on the result slip: its word, plus its own ink. Critical success
// is the one gold stamp (gold fill, ink letters), since gold text cannot be read on paper.
const OUTCOME_STAMP = {
  failure:          'text-oxblood border-oxblood',
  mixed_success:    'text-sepia border-sepia',
  full_success:     'text-seal-green border-seal-green',
  critical_success: 'text-ink border-ink bg-candle-gold',
};

// A roll has no id from the server; its action and dice give the slip its number
const rollKey = (roll) =>
  `${roll.action ?? ''}:${(roll.dice || []).map(d => `${d.value}${d.is_gilded ? 'g' : ''}`).join('')}${roll.is_resistance_roll ? ':r' : ''}`;

// The paper slip under the felt: who rolled (in their ink), what was thrown and which die
// counts, then the outcome stamp. Player inks are dark by design, so the name sits on
// paper, not on the felt. The red number is a numbering machine's, for the look only.
const ResultSlip = ({ lastRoll, rollerName, rollerInk, gildedPending, keptDie, rating }) => {
  const outcomeKey = lastRoll.outcome || (keptDie ? outcomeForKept(keptDie.value) : null);
  const outcome = OUTCOME[outcomeKey];
  const key = rollKey(lastRoll);
  return (
    <div role="status" className="relative -mt-1 mx-2 bg-parchment text-ink px-4 pt-2.5 pb-3 shadow-[2px_6px_12px_rgba(0,0,0,0.6)] border border-sepia/30 rounded-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif font-bold text-lg leading-snug truncate" style={{ color: rollerInk || 'rgb(var(--c-ink))' }}>{rollerName}</span>
        <SerialNo value={serialFor(key)} className="shrink-0" />
      </div>
      <p className="font-serif text-base leading-snug">{rollPoolText(lastRoll, keptDie, rating)}</p>
      {gildedPending ? (
        <p className="mt-2 mb-0.5">
          <span className="inline-block font-sans text-xs font-black uppercase tracking-widest text-sepia border border-dashed border-sepia/70 rounded-sm px-2 py-1">
            Keep one die
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
        </p>
      ) : null}
    </div>
  );
};

// A loudspeaker, struck through when the roll sounds are off
const SpeakerIcon = ({ muted }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 9.5h3.6L12 5.6v12.8l-4.9-3.9H3.5z" fill="currentColor" stroke="none" />
    {muted
      ? <path d="M15.6 9.4l5 5.2M20.6 9.4l-5 5.2" />
      : <><path d="M15.4 9.2a4 4 0 0 1 0 5.6" /><path d="M17.9 6.8a7.4 7.4 0 0 1 0 10.4" /></>}
  </svg>
);

// Roll sounds on or off, remembered in this browser; it sits in the corner of the felt
const SoundToggle = () => {
  const [on, setOn] = useRollSounds();
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-pressed={on}
      aria-label="Roll sounds"
      title={on ? 'Roll sounds on' : 'Roll sounds off'}
      className={`absolute top-1 right-1 z-20 w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-cream/10 ${
        on ? 'text-parchment-deep/80 hover:text-cream' : 'text-parchment-deep/45 hover:text-parchment-deep'}`}
    >
      <SpeakerIcon muted={!on} />
    </button>
  );
};

// The pips of a die face on a 24 by 24 face. The resting dice on the empty felt and every
// rolled die show their faces this way, so a result is as physical as the idle tray.
const PIPS = {
  1: [[12, 12]],
  2: [[6.5, 17.5], [17.5, 6.5]],
  3: [[6, 18], [12, 12], [18, 6]],
  4: [[6, 6], [18, 6], [6, 18], [18, 18]],
  5: [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]],
  6: [[6, 5.5], [6, 12], [6, 18.5], [18, 5.5], [18, 12], [18, 18.5]],
};

// A rolled die's face: ink pips on the die's own color (ivory, or gold for the gilded die)
const DieFace = ({ value }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="w-full h-full">
    {(PIPS[value] || []).map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.3" fill="currentColor" />)}
  </svg>
);
const RestingDie = ({ face, tilt }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    className="w-9 h-9 2xl:w-11 2xl:h-11 drop-shadow-[2px_4px_3px_rgba(0,0,0,0.6)]"
    style={{ transform: `rotate(${tilt}deg)` }}>
    <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="3.5" fill="rgb(var(--c-cream))" stroke="rgb(var(--c-ink) / 0.25)" strokeWidth="0.8" />
    {PIPS[face].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.1" fill="rgb(var(--c-ink))" />)}
  </svg>
);

// The felt tray. dieSkews, getIsCandidate and onDieClick come from DiceVault, so every
// tray that shows the same roll lands its dice at the same angles.
export const DiceTray = forwardRef(({
  lastRoll, isRolling, gildedPending, dieSkews, getIsCandidate, onDieClick,
  rollerName, rollerInk, keptDie, rating = null,
}, ref) => (
  <div ref={ref}>
  <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] 2xl:h-[330px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
    <SoundToggle />
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
      {isRolling ? (
        <div className="text-center flex flex-col items-center justify-center">
          <span className="font-serif italic text-candle-gold text-lg">Rolling…</span>
        </div>
      ) : lastRoll && lastRoll.dice ? (
        <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
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
                    onKeyDown: onActivateKey(clickHandler),
                    'aria-label': `Keep the ${die.is_gilded ? 'gilded' : 'highest regular'} die, ${die.value}`,
                  } : { 'aria-hidden': true })}
                  onClick={clickHandler}
                  onTouchEnd={clickHandler ? (e) => { e.preventDefault(); clickHandler(); } : undefined}
                  className={`w-11 h-11 2xl:w-14 2xl:h-14 p-0.5 border rounded-[5px] flex items-center justify-center shadow-[2px_5px_6px_rgba(0,0,0,0.7)] ${tumbleClass}
                    ${die.is_gilded
                      ? 'border-2 border-sepia bg-candle-gold text-ink scale-105'
                      : 'border border-ink/20 bg-cream text-ink'}
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
        <div className="flex items-end gap-4 opacity-70" aria-hidden="true">
          <RestingDie face={5} tilt={-14} />
          <RestingDie face={2} tilt={9} />
        </div>
      )}
    </div>
  </div>
  {!isRolling && lastRoll?.dice && (
    <ResultSlip lastRoll={lastRoll} rollerName={rollerName} rollerInk={rollerInk} gildedPending={gildedPending} keptDie={keptDie} rating={rating} />
  )}
  </div>
));
DiceTray.displayName = 'DiceTray';
