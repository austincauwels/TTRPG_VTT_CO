import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTypedText } from '../shared/useTypedText';
import { useDialog } from '../shared/useDialog';
import { SerialNo, serialFor } from '../shared/PrintMarks';
import { PushPin } from '../shared/Decorations';
import { CrossMark } from '../shared/InkMarks';

// The card's ruling, and the lines of the Lightkeeper's words on it
const RULED = (step) => ({
  backgroundImage: `repeating-linear-gradient(transparent, transparent ${step - 1}px, rgb(var(--c-sepia) / 0.14) ${step}px)`,
  backgroundSize: `100% ${step}px`,
});

const Label = ({ children }) => (
  <span className="font-sans text-xs uppercase font-black text-sepia mr-1">{children}</span>
);

// The Lightkeeper's dispatch on a player's desk: a library index card pinned to the desk a
// little crooked, its bottom edge torn. It shows what was sent: the Lightkeeper's own
// words, as written, under the location if one was given; or the template's Location and Conditions. A
// new dispatch types in while the desk is open (a long one in at most about eight
// seconds). From xl, where the rail is one window tall and the hourglass stands at its
// foot, the words scroll inside the card on their own ruled lines, the typing followed down
// them, and a long letter can be read in full on a sheet over the desk.
export const DispatchNote = ({ circle, className = '' }) => {
  const location = circle?.location || '';
  const atmosphere = circle?.atmosphere || '';
  const words = circle?.dispatch_text || '';
  const own = words.length > 0;
  const lines = [location, atmosphere, words];
  const total = location.length + atmosphere.length + words.length;
  const typed = useTypedText(lines, { cps: Math.max(42, total / 8) });
  // The line being typed carries the carriage mark
  const typingLine = typed.typing ? lines.findIndex((l, i) => typed.parts[i].length < l.length) : -1;
  const serial = own ? serialFor(`${location}|${words}`, 4) : location ? serialFor(`${location}|${atmosphere}`, 4) : null;

  // From xl the words lie in a box of their own: whether they run past it, and the
  // typing kept in view as it goes down the lines
  const boxRef = useRef(null);
  const caretRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) { setOverflows(false); return undefined; }
    const measure = () => setOverflows(box.scrollHeight > box.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [words]);
  useLayoutEffect(() => {
    const box = boxRef.current, caret = caretRef.current;
    if (!box || !caret || box.scrollHeight <= box.clientHeight) return;
    const bottom = caret.offsetTop + 24;
    if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [typed.parts[2].length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [reading, setReading] = useState(false);
  const readRef = useDialog({ open: reading, onClose: () => setReading(false) });

  const typedLine = (i, value) => (
    <><span className="sr-only">{value}</span><span aria-hidden="true">{typed.parts[i]}{typingLine === i && <span className="type-caret" />}</span></>
  );

  return (
    <div className={`hand-placed lg:hover:rotate-0 transition-transform duration-200 relative ${className}`}
         style={{ '--tilt': '-1.2deg', filter: 'drop-shadow(5px 8px 9px rgba(0,0,0,0.6))' }}>
      <PushPin size={22} className="absolute -top-2 left-1/2 -translate-x-1/2 z-20" />
      <div className="deckle-bottom bg-cream text-ink border border-parchment-deep p-6 pb-7 xl:px-5 xl:pt-4 xl:pb-6 relative"
           style={{ ...RULED(24), lineHeight: '24px' }}>
        <div className="absolute top-0 bottom-0 left-6 xl:left-5 w-[1.5px] bg-oxblood/20 pointer-events-none" />
        <div className="pl-6 pt-1 relative z-10">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="block font-sans text-xs uppercase tracking-widest text-sepia font-black leading-none">From the Lightkeeper</span>
            {serial && <SerialNo value={serial} />}
          </div>
          {own ? (
            <div className="space-y-2">
              {location && (
                <p className="font-serif font-black text-base border-b border-ink/10 pb-1 leading-tight">
                  <Label>Location:</Label>{typedLine(0, location)}
                </p>
              )}
              {atmosphere && (
                <p className="font-serif font-bold text-sm leading-tight">
                  <Label>Conditions:</Label>{typedLine(1, atmosphere)}
                </p>
              )}
              {/* The words, line breaks and all. The part not typed yet is laid out unseen,
                  so the lines never move as it types in. */}
              <div ref={boxRef} data-dispatch-words
                   className="relative -mr-2 pr-2 font-serif text-base leading-6 whitespace-pre-wrap [overflow-wrap:anywhere] bg-cream xl:max-h-[min(30vh,21rem)] xl:overflow-y-auto custom-scrollbar"
                   style={{ ...RULED(24), backgroundAttachment: 'local' }}>
                <span className="sr-only">{words}</span>
                <span aria-hidden="true">
                  {typed.parts[2]}
                  {typingLine === 2 && <span ref={caretRef} className="type-caret mr-[calc(-0.5em-1px)]" />}
                  <span className="invisible">{words.slice(typed.parts[2].length)}</span>
                </span>
              </div>
              {overflows && (
                <button type="button" onClick={() => setReading(true)}
                  className="pen-host min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] font-sans text-xs uppercase tracking-widest font-black text-oxblood">
                  <span className="pen-underline">Read in full</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 font-bold font-serif">
              <p className="text-base font-black border-b border-ink/10 pb-1 leading-tight">
                <Label>Location:</Label>
                {location ? typedLine(0, location) : <span className="sr-only">none</span>}
              </p>
              <p className="text-sm leading-tight">
                <Label>Conditions:</Label>
                {atmosphere ? typedLine(1, atmosphere) : <span className="sr-only">none</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* The letter taken up to read: a sheet over the desk, as wide as reads well. It lies
          in the page itself, since the pinned card's tilt and shadow would hold a fixed box. */}
      {reading && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
             onClick={() => setReading(false)}>
          <div ref={readRef} role="dialog" aria-modal="true" aria-labelledby="dispatch-read-title"
               onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-[40rem] max-h-[calc(100dvh-32px)] overflow-y-auto custom-scrollbar bg-cream text-ink border border-parchment-deep shadow-[0_20px_60px_rgba(0,0,0,0.9)] px-6 pt-4 pb-8 sm:px-10"
               style={{ ...RULED(28), backgroundAttachment: 'local', lineHeight: '28px' }}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 id="dispatch-read-title" className="font-sans text-xs uppercase tracking-widest text-sepia font-black">From the Lightkeeper</h2>
              <div className="flex items-center gap-3">
                {serial && <SerialNo value={serial} />}
                <button type="button" onClick={() => setReading(false)} aria-label="Close"
                  className="w-11 h-11 -mr-3 flex items-center justify-center text-sepia hover:text-ink text-lg">
                  <CrossMark />
                </button>
              </div>
            </div>
            {location && (
              <p className="font-serif font-black text-lg border-b border-ink/10 mb-2"><Label>Location:</Label>{location}</p>
            )}
            {atmosphere && (
              <p className="font-serif font-bold text-base mb-2"><Label>Conditions:</Label>{atmosphere}</p>
            )}
            <p className="font-serif text-lg leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">{words}</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
