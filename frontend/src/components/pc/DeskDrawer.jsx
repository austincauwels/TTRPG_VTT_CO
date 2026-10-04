import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../shared/useDialog';
import { AccountMenu } from '../shared/AccountMenu';
import { SafeIcon } from '../shared/SafeIcon';
import { CrossMark } from '../shared/InkMarks';
import { tiltFor } from '../shared/handPlaced';
import { DieFace, DIE_BODY } from './dice/Die';

// The player desk below md (owner's round 4 item 14): the member ID strip is a slim band
// with a die that brings up the dice and log in one tap, and a brass drawer pull that slides
// out the desk drawer. The drawer holds a slip for each part of the desk; choosing one shows
// that part alone. The sheet's three tabs come first, then the papers that lie beside it.
export const DESK_PARTS = [
  { id: 'character', label: 'Investigator', icon: 'GiMagnifyingGlass' },
  { id: 'circle', label: 'Circle', icon: 'GiEyeShield' },
  { id: 'archives', label: 'Notebook', icon: 'GiScrollUnfurled' },
  { id: 'dice', label: 'Dice and log', icon: 'GiRollingDices', gap: true },
  { id: 'notes', label: 'Pass notes', icon: 'GiQuillInk' },
  { id: 'dispatch', label: 'From the Lightkeeper', icon: 'GiCandleLight' },
  { id: 'watch', label: 'Pocket watch', icon: 'GiPocketWatch' },
];

const SLIDE_MS = 220;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const inAccountCard = (el) => !!el?.closest?.('[role="dialog"][aria-label="Account"]');

// A brass bail pull, as on a desk drawer: the plate with its two posts and the handle
// hanging between them
const DrawerPull = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 40 24" className="w-[30px] h-[18px] shrink-0 overflow-visible">
    <path d="M9 6.6C9 19.6 31 19.6 31 6.6" fill="none" stroke="rgb(var(--c-sepia))" strokeWidth="4.4" strokeLinecap="round" />
    <path d="M9 6.6C9 19.6 31 19.6 31 6.6" fill="none" stroke="rgb(var(--c-candle-gold))" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="2" y="2.2" width="36" height="7.2" rx="3.6" fill="rgb(var(--c-candle-gold))" stroke="rgb(var(--c-sepia))" strokeWidth="1.2" />
    <circle cx="9" cy="5.8" r="1.9" fill="rgb(var(--c-sepia))" />
    <circle cx="31" cy="5.8" r="1.9" fill="rgb(var(--c-sepia))" />
  </svg>
);

// One slip in the drawer: torn paper like the Lightkeeper's slips, a little crooked, its
// label inked under with the pen while it is the part on show
const Slip = ({ part, active, onChoose, index }) => (
  <button
    type="button"
    onClick={() => onChoose(part.id)}
    aria-current={active ? 'page' : undefined}
    className={`pen-host hand-placed relative w-full text-left ${part.gap ? 'mt-4' : ''}`}
    style={{ '--tilt': `${tiltFor(`drawer-${part.id}`, { min: 0.4, max: 1.1, sign: index % 2 ? 1 : -1 })}deg`, filter: 'drop-shadow(3px 5px 5px rgba(0,0,0,0.6))' }}
  >
    <span
      className={`flex items-center gap-3.5 min-h-[48px] pl-4 pr-3 py-2.5 ${active ? 'text-oxblood' : 'text-ink'}`}
      style={{
        clipPath: 'polygon(0% 4%, 99% 0%, 100% 96%, 1.5% 100%)',
        background: active
          ? 'linear-gradient(135deg, rgb(var(--c-cream)) 55%, rgb(var(--c-parchment)) 92%, rgb(var(--c-parchment-deep)) 100%)'
          : 'linear-gradient(135deg, rgb(var(--c-parchment)) 60%, rgb(var(--c-parchment-deep)) 92%, rgb(var(--c-sepia) / 0.55) 100%)',
        borderLeft: '2px solid rgb(var(--c-sepia))',
      }}
    >
      <SafeIcon name={part.icon} size={18} className="shrink-0 opacity-75" />
      <span className={`pen-underline font-serif uppercase tracking-[0.12em] text-base leading-tight ${active ? 'is-inked font-bold' : 'font-semibold'}`}>
        {part.label}
      </span>
    </span>
  </button>
);

export const PhoneDeskNav = ({ current, onChoose, onHub }) => {
  // closed, open, or closing (sliding back in before it leaves the page)
  const [phase, setPhase] = useState('closed');
  const open = phase === 'open';

  const close = useCallback(() => setPhase(reducedMotion() ? 'closed' : 'closing'), []);
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const t = setTimeout(() => setPhase('closed'), SLIDE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const drawerRef = useDialog({ open, onClose: close, alsoInside: inAccountCard });

  // Into the drawer at the slip on show, not at its first control
  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
  }, [open]);

  // The page behind holds still while the drawer is out
  useEffect(() => {
    if (phase === 'closed') return undefined;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, [phase === 'closed']);

  // From md the band has its tabs again and the drawer has no place
  useEffect(() => {
    if (phase === 'closed' || !window.matchMedia) return undefined;
    const wide = window.matchMedia('(min-width: 768px)');
    const onChange = () => { if (wide.matches) setPhase('closed'); };
    wide.addEventListener?.('change', onChange);
    return () => wide.removeEventListener?.('change', onChange);
  }, [phase === 'closed']);

  const choose = (id) => { onChoose(id); close(); };
  const onDice = current === 'dice';

  return (
    <div className="md:hidden flex items-center gap-1.5 shrink-0 relative z-10">
      {/* The dice and the log, one tap away during play; pressed again, back to the sheet */}
      <button
        type="button"
        onClick={() => onChoose(onDice ? 'back' : 'dice')}
        aria-pressed={onDice}
        aria-label="Dice and log"
        className={`w-11 h-11 inline-flex items-center justify-center rounded border transition-colors ${
          onDice ? 'bg-ink border-ink' : 'bg-transparent border-ink/25 [@media(hover:hover)]:hover:bg-black/5'}`}
      >
        <span aria-hidden="true" className={`w-7 h-7 p-px rounded ${DIE_BODY.regular} shadow-[1px_2px_3px_rgba(0,0,0,0.35)] -rotate-6`}>
          <DieFace value={5} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPhase('open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-11 inline-flex items-center gap-1.5 pl-2 pr-2.5 rounded border border-ink/25 text-sepia font-sans text-xs font-black uppercase tracking-widest [@media(hover:hover)]:hover:bg-black/5 [@media(hover:hover)]:hover:text-ink transition-colors"
      >
        <DrawerPull />
        Menu
      </button>

      {phase !== 'closed' && createPortal(
        <div className={`md:hidden desk-drawer-room ${phase === 'closing' ? 'is-closing pointer-events-none' : ''}`}>
          <div className="desk-drawer-scrim fixed inset-0 z-[80] bg-black/60" onClick={close} aria-hidden="true" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="desk-drawer fixed top-0 right-0 bottom-0 z-[81] w-[min(20rem,86vw)] flex flex-col overflow-y-auto overscroll-contain bg-night bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] border-l-[6px] border-mahogany shadow-[-14px_0_34px_rgba(0,0,0,0.8)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] px-4"
          >
            <div className="flex items-center justify-between gap-3">
              <AccountMenu tone="desk" className="min-h-[44px]" />
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="w-11 h-11 -mr-1.5 inline-flex items-center justify-center rounded text-parchment-deep text-xl hover:text-cream hover:bg-cream/5 transition-colors"
              >
                <CrossMark />
              </button>
            </div>

            <nav aria-label="Desk" className="mt-5 flex flex-col gap-2.5 px-1">
              {DESK_PARTS.map((part, i) => (
                <Slip key={part.id} part={part} index={i} active={current === part.id} onChoose={choose} />
              ))}
            </nav>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() => { close(); onHub(); }}
                className="flex items-center justify-center min-h-[44px] w-full px-4 font-sans text-xs font-bold uppercase tracking-widest text-parchment-deep hover:text-cream border border-cream/20 hover:border-cream/40 hover:bg-cream/5 rounded transition-colors"
              >
                Back to chapter hub
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
