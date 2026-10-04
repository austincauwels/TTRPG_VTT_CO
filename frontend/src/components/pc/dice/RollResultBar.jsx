import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ACTION_LABEL } from '../../../game/actions';

// The server's outcome names (engine.OUTCOME_LABELS).
const OUTCOME_LABEL = {
  critical_success: 'Critical Success',
  full_success: 'Full Success',
  mixed_success: 'Mixed Success',
  failure: 'Failure',
};

// After a gilded choice the server scores the kept die alone (engine.calculate_outcome
// with no dice list, so never a critical): 6 is a full success, 4 or 5 mixed, else failure.
const outcomeForKept = (value) => (value === 6 ? 'full_success' : value >= 4 ? 'mixed_success' : 'failure');

const MiniDie = ({ die, counts, dim, onClick }) => {
  const base = `font-serif font-black flex items-center justify-center rounded-sm border ${
    die.is_gilded ? 'border-candle-gold bg-candle-gold text-ink' : 'border-ink/20 bg-cream text-ink'}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className={`${base} w-11 h-11 text-xl ring-2 ring-cream/70 active:scale-95 transition-transform`}
        aria-label={`Keep the ${die.is_gilded ? 'gilded' : 'highest'} die, ${die.value}`}>
        {die.value}
      </button>
    );
  }
  return (
    <span className={`${base} w-7 h-7 text-sm ${counts ? 'ring-2 ring-seal-green-lit/80' : ''} ${dim ? 'opacity-40' : ''}`}>
      {die.value}
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
  getIsCandidate, onDieClick, trayInView, children,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!lastRoll && !isRolling) return null;

  const dice = lastRoll?.dice || [];
  const actionLabel = ACTION_LABEL[lastRoll?.action] || '';
  const outcomeKey = lastRoll?.outcome || (keptDie ? outcomeForKept(keptDie.value) : null);
  const status = isRolling ? 'Casting Lots...'
    : gildedPending ? 'Choose your die'
    : (OUTCOME_LABEL[outcomeKey] || '');
  const keptIdx = keptDie ? keptDie.idx : null;

  const summary = (
    <span className="flex flex-col min-w-0">
      <span className="flex items-center gap-1.5 font-sans text-xs font-black uppercase tracking-[0.14em] text-cream/70 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rollerInk || 'rgb(var(--c-candle-gold))' }} />
        <span className="truncate">{rollerName}{actionLabel ? ` · ${actionLabel}` : ''}</span>
      </span>
      <span className="font-serif text-lg font-bold leading-tight text-cream truncate">{status}</span>
    </span>
  );

  return createPortal(
    <div className="lg:hidden">
      {open ? (
        <>
          <div className="fixed inset-0 z-[70] bg-black/60" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Dice tray"
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
