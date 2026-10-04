import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../../shared/useDialog';
import { OUTCOME, outcomeForKept, rollPoolText } from '../../../game/outcomes';
import { DieFace, DIE_BODY } from './Die';

// The same dice as the tray, small: her ivory and gold bodies, standard pips
const MiniDie = ({ die, counts, dim, onClick }) => {
  const base = `flex items-center justify-center rounded ${die.is_gilded ? DIE_BODY.gilded : DIE_BODY.regular}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className={`${base} w-11 h-11 p-0.5 ring-2 ring-cream/70 active:scale-95 transition-transform`}
        aria-label={`Keep the ${die.is_gilded ? 'gilded' : 'highest'} die, ${die.value}`}>
        <DieFace value={die.value} />
      </button>
    );
  }
  return (
    <span className={`${base} w-7 h-7 p-px ${counts ? 'ring-2 ring-seal-green-lit/80' : ''} ${dim ? 'opacity-40' : ''}`}>
      <DieFace value={die.value} />
      <span className="sr-only">{die.value}{die.is_gilded ? ', gilded' : ''}</span>
    </span>
  );
};

// Below lg the dice tray sits far down the desk, so the latest roll is pinned to the bottom
// of the screen while the tray is out of view: who rolled, the action, the outcome and the
// dice, with the two candidates tappable during a gilded choice. Tapping the bar opens the
// full tray (and Burn or ability prompts) as a sheet. Rendered in a portal so no ancestor
// transform or filter can move it.
export const RollResultBar = ({
  rollerName, rollerInk, lastRoll, isRolling, gildedPending, keptDie,
  getIsCandidate, onDieClick, trayInView, children, rating = null,
  rollWaiting = false, rollError = null,
}) => {
  const [open, setOpen] = useState(false);
  const sheetRef = useDialog({ open, onClose: () => setOpen(false) });

  if (!lastRoll && !isRolling && !rollError) return null;

  const dice = lastRoll?.dice || [];
  const poolText = isRolling || !lastRoll ? '' : rollPoolText(lastRoll, keptDie, rating);
  const outcomeKey = lastRoll?.outcome || (keptDie ? outcomeForKept(keptDie.value) : null);
  const outcome = !isRolling && !gildedPending ? OUTCOME[outcomeKey] : null;
  // A roll that did not reach the table: the bar says so in short with the reason under
  // it (the tray's slip carries the alert for screen readers)
  const failed = !isRolling && !!rollError && !lastRoll;
  const status = isRolling ? (rollWaiting ? 'Waiting for the table…' : 'Rolling…')
    : failed ? 'Not thrown'
    : gildedPending ? 'Keep one die'
    : (outcome?.word || '');
  const keptIdx = keptDie ? keptDie.idx : null;

  const summary = (
    <span className="flex flex-col min-w-0">
      <span className="flex items-center gap-1.5 font-sans text-xs font-black uppercase tracking-[0.14em] text-cream/70 min-w-0">
        <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: rollerInk || 'rgb(var(--c-candle-gold))' }} />
        <span className="truncate">{rollerName}{poolText ? ` · ${poolText}` : ''}</span>
      </span>
      <span className={`font-serif text-lg font-bold leading-tight truncate ${failed ? 'text-oxblood-lit' : outcome?.className || 'text-cream'}`}>{status}</span>
      {!isRolling && rollError && (
        <span aria-hidden="true" className="font-serif text-sm leading-snug text-parchment-deep">{rollError}</span>
      )}
    </span>
  );

  return createPortal(
    <div className="lg:hidden">
      {open ? (
        <>
          <div className="fixed inset-0 z-[70] bg-black/60" onClick={() => setOpen(false)} />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Dice tray"
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[85dvh] overflow-y-auto bg-ink border-t-[6px] border-[#2e1d15] shadow-[0_-12px_30px_rgba(0,0,0,0.85)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="max-w-[640px] mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                {summary}
                <button type="button" onClick={() => setOpen(false)}
                  className="shrink-0 min-h-[40px] px-3 font-sans text-xs font-black uppercase tracking-widest text-cream/70 border border-cream/25 rounded-sm">
                  Close
                </button>
              </div>
              {children}
            </div>
          </div>
        </>
      ) : !trayInView && (
        <div className="fixed inset-x-0 bottom-0 z-[60] bg-[#12241b] border-t-[6px] border-[#2e1d15] shadow-[0_-8px_24px_rgba(0,0,0,0.75)] px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          aria-live="polite">
          <div className="flex items-center gap-3 max-w-[640px] mx-auto">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open the dice tray"
              className="flex-1 min-w-0 min-h-[48px] text-left flex items-center gap-2">
              {summary}
            </button>
            {gildedPending ? (
              <div className="flex items-center gap-2 shrink-0">
                {dice.map((die, idx) => getIsCandidate(die, idx)
                  ? <MiniDie key={idx} die={die} onClick={() => onDieClick(die, idx)} />
                  : null)}
              </div>
            ) : (
              <button type="button" onClick={() => setOpen(true)} tabIndex={-1} aria-hidden="true"
                className="flex flex-wrap justify-end items-center gap-1 shrink-0 max-w-[50%]">
                {dice.map((die, idx) => (
                  <MiniDie key={idx} die={die}
                    counts={keptIdx !== null ? idx === keptIdx : getIsCandidate(die, idx)}
                    dim={keptIdx !== null && idx !== keptIdx} />
                ))}
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
