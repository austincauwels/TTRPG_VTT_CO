import React, { useEffect, useId, useRef, useState } from 'react';

// What an action does, for touch screens (owner's round 4 item 9). A mouse shows it on
// hover (the row's title); a touch screen has no hover, so each action row ends in a small
// printed "i" of its own, a 44px target that never rolls, and opens the same words on a
// slip of paper under the row, clear of the column of "i"s so the next one can be tapped
// straight away. One slip is open at a time; it closes on a tap outside it, on Escape, or
// on the "i" again (useActionInfo keeps which one is open). The dossier's action rows and
// the creator's action ratings use it on every touch screen (iPad pass, 2026-10-05).
const InfoMark = ({ size = 20 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="10.1" cy="5.9" r="1.25" fill="currentColor" />
    <path d="M8.3 8.6h2.5v5.6M8.2 14.3h4.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// show: the classes that decide where the "i" appears (every touch screen by default)
export const ActionInfo = ({ id, label, text, open, onToggle, show = 'hidden [@media(pointer:coarse)]:flex' }) => (
  <>
    <button
      type="button"
      data-action-info={id}
      aria-label={`About ${label}`}
      aria-expanded={open}
      aria-controls={`${id}-slip`}
      onClick={onToggle}
      className={`action-info ${show} shrink-0 w-11 min-h-[44px] items-center justify-center rounded-sm transition-colors ${open ? 'text-oxblood' : 'text-sepia'}`}
      style={{ touchAction: 'manipulation' }}
    >
      <InfoMark />
    </button>
    {open && (
      <div
        id={`${id}-slip`}
        data-action-info={id}
        role="note"
        aria-label={`About ${label}`}
        className="action-info-slip absolute left-1 right-12 top-full mt-1 z-30 px-3 py-2 rounded-[1px] font-serif text-base leading-snug text-ink"
      >
        <span className="font-bold uppercase">{label}:</span> {text}
      </div>
    )}
  </>
);

// Which action's slip is open: one at a time, closed by a tap outside it or Escape (focus
// goes back to its "i")
export const useActionInfo = () => {
  const [infoFor, setInfoFor] = useState(null);
  useEffect(() => {
    if (!infoFor) return undefined;
    const sel = `[data-action-info="${infoFor}"]`;
    const onDown = (e) => { if (!e.target.closest?.(sel)) setInfoFor(null); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setInfoFor(null);
      document.querySelector(`button${sel}`)?.focus();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [infoFor]);
  const toggle = (key) => setInfoFor(cur => (cur === key ? null : key));
  return [infoFor, toggle];
};

// A term that says what it means, on the same slip of paper (owner's request, 2026-10-08:
// what each circle resource does). The term is a button with a small printed "i" after it.
// Its slip shows while a mouse is over the term and while the term has keyboard focus, and
// a tap (a touch screen has no hover) or a click pins it until a tap outside it. Escape
// puts it away. A screen reader hears the words as the button's description. Hover and
// focus show it in CSS (.info-term in index.css); the tap on another term unpins this one,
// so one is pinned at a time without a shared hook.
// slipClassName: where the slip lies. The callers lay it beside their column of terms, not
// under the term, so the next term down can be pointed at or tapped straight away.
// hitClassName: how the button takes a finger (44px tall on a touch screen by default; a
// ruled row that must keep its pitch passes touch-pip, which reaches past the button to
// fill the row instead).
// wide: the term spans its row, so a slip can be placed against the row's right edge.
export const InfoTerm = ({
  label, text, className = '', wide = false,
  slipClassName = 'left-0 top-full mt-1 w-[min(18rem,calc(100vw-2.5rem))]',
  hitClassName = '[@media(pointer:coarse)]:min-h-[44px]',
}) => {
  const slipId = `${useId()}-slip`;
  const ref = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [hushed, setHushed] = useState(false);
  useEffect(() => {
    if (!pinned) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setPinned(false); };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [pinned]);
  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || hushed) return;
    const shown = pinned || e.currentTarget.matches(':focus-visible') || e.currentTarget.matches(':hover');
    if (!shown) return;
    e.stopPropagation();
    setPinned(false);
    setHushed(true);
  };
  return (
    <span
      ref={ref}
      className={`info-term relative ${wide ? 'flex w-full' : 'inline-flex max-w-full'} ${pinned ? 'is-open' : ''} ${hushed ? 'is-hushed' : ''} ${className}`}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={slipId}
        onClick={() => { setHushed(false); setPinned(p => !p); }}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHushed(false)}
        onBlur={() => setHushed(false)}
        className={`info-term-button group/info inline-flex items-center gap-1 rounded-sm text-left cursor-help ${hitClassName}`}
        style={{ touchAction: 'manipulation' }}
      >
        {label}
        <span className={`shrink-0 transition-colors ${pinned ? 'text-oxblood' : 'text-sepia group-hover/info:text-oxblood'}`}>
          <InfoMark size={15} />
        </span>
      </button>
      <span
        id={slipId}
        role="tooltip"
        className={`action-info-slip info-term-slip absolute z-30 px-3 py-2 rounded-[1px] font-serif font-normal normal-case tracking-normal text-base leading-snug text-ink text-left ${slipClassName}`}
      >
        <span className="font-bold uppercase">{label}:</span> {text}
      </span>
    </span>
  );
};
