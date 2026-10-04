import React, { forwardRef } from 'react';
import { OUTCOME, outcomeForKept, rollPoolText } from '../../../game/outcomes';
import { onActivateKey } from '../../shared/a11y';
import { tiltFor } from '../../shared/handPlaced';

// Each outcome is a stamp on the result slip: its word, plus its own ink. Critical success
// is the one gold stamp (gold fill, ink letters), since gold text cannot be read on paper.
const OUTCOME_STAMP = {
  failure:          'text-oxblood border-oxblood',
  mixed_success:    'text-sepia border-sepia',
  full_success:     'text-seal-green border-seal-green',
  critical_success: 'text-ink border-ink bg-candle-gold',
};

// The paper slip under the felt: who rolled (in their ink), the action and pool, and the
// outcome. Player inks are dark by design, so the line sits on paper, not on the felt.
const ResultSlip = ({ lastRoll, rollerName, rollerInk, gildedPending, keptDie }) => {
  const outcomeKey = lastRoll.outcome || (keptDie ? outcomeForKept(keptDie.value) : null);
  const outcome = OUTCOME[outcomeKey];
  return (
    <div role="status" className="relative -mt-1 mx-2 bg-parchment text-ink px-4 py-3 shadow-[2px_6px_12px_rgba(0,0,0,0.6)] border border-sepia/30 rounded-sm">
      <p className="font-serif text-lg leading-snug">
        <span className="font-bold" style={{ color: rollerInk || 'rgb(var(--c-ink))' }}>{rollerName}</span>
        {' rolled '}
        <span className="font-semibold">{rollPoolText(lastRoll)}</span>
      </p>
      {gildedPending ? (
        <p className="font-serif text-base text-sepia mt-1">Choose your die: keep the gilded die or your highest regular die.</p>
      ) : outcome ? (
        <p className="mt-2 mb-0.5">
          {/* Rubber-stamped onto the slip: a little crooked (fixed per roll), the ink worn,
              pressed down once when this result lands */}
          <span
            key={`${lastRoll.id ?? ''}-${outcomeKey}`}
            className={`ink-stamp ink-stamp-press font-display text-2xl uppercase tracking-[0.06em] leading-none px-2 pt-1.5 pb-1 border-2 rounded-sm ${OUTCOME_STAMP[outcomeKey]}`}
            style={{ '--tilt': `${tiltFor(`${lastRoll.id ?? ''}-${outcomeKey}`, { min: 1, max: 2 })}deg` }}
          >
            {outcome.word}
          </span>
        </p>
      ) : null}
      {lastRoll.type === 'zero' && (
        <p className="font-serif italic text-base text-sepia mt-1.5">Zero rating: roll two dice and take the lowest.</p>
      )}
    </div>
  );
};

// The felt tray. dieSkews, getIsCandidate and onDieClick come from DiceVault, so every
// tray that shows the same roll lands its dice at the same angles.
export const DiceTray = forwardRef(({
  lastRoll, isRolling, gildedPending, dieSkews, getIsCandidate, onDieClick,
  rollerName, rollerInk, keptDie, emptyText = 'No rolls yet.',
}, ref) => (
  <div ref={ref}>
  <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
      {isRolling ? (
        <div className="text-center flex flex-col items-center justify-center">
          <span className="font-serif italic text-candle-gold text-lg">Rolling…</span>
        </div>
      ) : lastRoll && lastRoll.dice ? (
        <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
          <div className="flex flex-wrap justify-center gap-3 max-w-[190px]" role="group"
            aria-label={gildedPending ? 'Choose your die' : `Dice: ${lastRoll.dice.map((d, i) => `${d.value}${d.is_gilded ? ' gilded' : ''}${getIsCandidate(d, i) ? ' (counts)' : ''}`).join(', ')}`}>
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
                  key={`${lastRoll.id || idx}-${idx}`}
                  {...(clickHandler ? {
                    role: 'button',
                    tabIndex: 0,
                    onKeyDown: onActivateKey(clickHandler),
                    'aria-label': `Keep the ${die.is_gilded ? 'gilded' : 'highest regular'} die, ${die.value}`,
                  } : { 'aria-hidden': true })}
                  onClick={clickHandler}
                  onTouchEnd={clickHandler ? (e) => { e.preventDefault(); clickHandler(); } : undefined}
                  className={`w-11 h-11 border rounded font-serif font-black text-xl flex items-center justify-center shadow-2xl ${tumbleClass}
                    ${die.is_gilded
                      ? 'border-2 border-sepia bg-candle-gold text-ink scale-105'
                      : 'border border-ink/20 bg-cream text-ink'}
                    ${extraClasses}`}
                  style={{ animationDelay: gildedPending ? '0ms' : `${delayMs}ms`, '--random-skew': randomSkew }}
                >
                  {die.value}
                </div>
              );
            })}
          </div>

          {gildedPending && (
            <p className="text-base font-serif italic text-candle-gold mt-1">
              Choose your die
            </p>
          )}

        </div>
      ) : (
        <div className="text-center text-parchment/60 text-base italic font-serif px-4 leading-normal">
          {emptyText}
        </div>
      )}
    </div>
  </div>
  {!isRolling && lastRoll?.dice && (
    <ResultSlip lastRoll={lastRoll} rollerName={rollerName} rollerInk={rollerInk} gildedPending={gildedPending} keptDie={keptDie} />
  )}
  </div>
));
DiceTray.displayName = 'DiceTray';
