import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../../shared/useDialog';
import { CrossMark } from '../../shared/InkMarks';
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

// The bar is a pop-up and goes by itself (owner's round 4 item 15): once the dice have
// landed it stays about 4 s, about 8 s when the roll offers a choice (a resistance reroll or
// an ability) or a gilded die was just kept or the roll did not go through, and never while
// a gilded die waits to be kept. Then it fades out. A finger on it, or keyboard focus in it,
// holds it; the activity log keeps the result.
const LAND_MS = 600;
const RESULT_MS = 4000;
const CHOICE_MS = 8000;
const FADE_MS = 400;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Below lg the dice tray sits far down the desk (on a phone, in its own part of the desk), so
// the latest roll comes up at the bottom of the screen while the tray is out of view: who
// rolled, the action, the outcome and the dice, with the two candidates tappable during a
// gilded choice. Tapping the bar opens the full tray (and Burn or ability prompts) as a
// sheet; its cross closes it. Rendered in a portal so no ancestor transform or filter can
// move it.
export const RollResultBar = ({
  rollerName, rollerInk, lastRoll, isRolling, gildedPending, keptDie,
  getIsCandidate, onDieClick, trayInView, children, rating = null,
  rollWaiting = false, rollError = null, hasChoices = false,
}) => {
  const [open, setOpen] = useState(false);
  const keptIdx = keptDie ? keptDie.idx : null;
  // Each roll, kept die or error is a new result for the bar
  const result = useMemo(() => ({}), [lastRoll, isRolling, rollError, keptIdx, gildedPending]);
  const [goneFor, setGoneFor] = useState(null);      // the result the bar closed on
  const [fadingFor, setFadingFor] = useState(null);  // the result it is fading out on
  const [held, setHeld] = useState(false);           // a finger is on it
  const [recheck, setRecheck] = useState(0);
  const barRef = useRef(null);

  const settled = !isRolling && !gildedPending;
  const hasResult = !!(lastRoll || isRolling || rollError);
  const shown = hasResult && !open && !trayInView && goneFor !== result;
  const fading = shown && fadingFor === result && !held;
  const stay = !settled ? null : (rollError || hasChoices || keptDie) ? CHOICE_MS : RESULT_MS;

  // Closing the sheet once the roll is settled closes the bar too: the result was seen
  const closeSheet = () => { setOpen(false); if (settled) setGoneFor(result); };
  const sheetRef = useDialog({ open, onClose: closeSheet });

  // A settled result seen on the felt itself needs no pop-up afterwards
  useEffect(() => {
    if (trayInView && settled && hasResult) setGoneFor(result);
  }, [trayInView, settled, hasResult, result]);

  useEffect(() => {
    if (!shown || held || stay == null) return undefined;
    const t = setTimeout(() => {
      const active = document.activeElement;
      if (barRef.current?.contains(active) && active.matches?.(':focus-visible')) { setRecheck(n => n + 1); return; }
      if (reducedMotion()) setGoneFor(result);
      else setFadingFor(result);
    }, LAND_MS + stay);
    return () => clearTimeout(t);
  }, [shown, held, stay, result, recheck]);

  useEffect(() => {
    if (!fading) return undefined;
    const t = setTimeout(() => setGoneFor(result), FADE_MS);
    return () => clearTimeout(t);
  }, [fading, result]);

  // Touching the bar holds it until the finger lifts; the wait then starts again
  const hold = () => {
    setHeld(true);
    setFadingFor(null);
    const release = () => {
      setHeld(false);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
  };

  if (!hasResult) return null;

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
          <div className="fixed inset-0 z-[70] bg-black/60" onClick={closeSheet} />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Dice tray"
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[85dvh] overflow-y-auto bg-ink border-t-[6px] border-[#2e1d15] shadow-[0_-12px_30px_rgba(0,0,0,0.85)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="max-w-[640px] mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                {summary}
                <button type="button" onClick={closeSheet}
                  className="shrink-0 min-h-[40px] px-3 font-sans text-xs font-black uppercase tracking-widest text-cream/70 border border-cream/25 rounded-sm">
                  Close
                </button>
              </div>
              {children}
            </div>
          </div>
        </>
      ) : shown && (
        <div ref={barRef} onPointerDown={hold}
          className={`roll-bar fixed inset-x-0 bottom-0 z-[60] bg-[#12241b] border-t-[6px] border-[#2e1d15] shadow-[0_-8px_24px_rgba(0,0,0,0.75)] pl-3 ${settled ? 'pr-1.5' : 'pr-3'} pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] ${fading ? 'is-fading' : ''}`}
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
            {settled && (
              <button type="button" onClick={() => setGoneFor(result)} aria-label="Close"
                className="shrink-0 w-10 min-h-[48px] -ml-1 inline-flex items-center justify-center text-cream/70 hover:text-cream text-lg">
                <CrossMark />
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
