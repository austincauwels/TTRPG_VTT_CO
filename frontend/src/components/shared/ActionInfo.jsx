import React, { useEffect, useState } from 'react';

// What an action does, for touch screens (owner's round 4 item 9). A mouse shows it on
// hover (the row's title); a touch screen has no hover, so each action row ends in a small
// printed "i" of its own, a 44px target that never rolls, and opens the same words on a
// slip of paper under the row, clear of the column of "i"s so the next one can be tapped
// straight away. One slip is open at a time; it closes on a tap outside it, on Escape, or
// on the "i" again (useActionInfo keeps which one is open). The dossier's action rows and
// the creator's action ratings use it on every touch screen (iPad pass, 2026-10-05).
const InfoMark = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
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
