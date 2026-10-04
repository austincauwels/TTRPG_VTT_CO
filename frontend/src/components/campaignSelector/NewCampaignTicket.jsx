import React, { useEffect, useRef, useState } from 'react';
import { FormLine, PrinterMark, BlankFields } from '../shared/PrintMarks';
import { CreateCampaignForm } from './CreateCampaignForm';
import { playPaperSound } from '../../game/rollSounds';

const PAPER = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f0e2c0' filter='url(%23paper)'/%3E%3C/svg%3E\")";

const FACE_STYLE = {
  backgroundColor: 'rgb(var(--c-parchment))',
  backgroundImage: PAPER,
  boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgb(var(--c-sepia) / 0.3)',
};

// Two pen strokes crossed: the mark that turns the pamphlet back over
const CloseMark = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4.5 4.2c3.4 3.6 7.2 7.6 11 11.4" />
    <path d="M15.6 4.6C12 8 8.4 11.6 4.4 15.5" />
  </svg>
);

// The GM's pamphlet, the twin of the Blank Intake pamphlet, and her original interaction:
// pressed, it flips over in 3D and its back is the form for a new campaign (the same
// CreateCampaignForm the Lightkeeper Ledger uses). The close mark, or Escape, turns it back.
// The face turned away takes no clicks or focus. Under reduced motion the faces swap in
// place without spinning (DeskStyles). The two faces stay direct children of the
// preserve-3d element.
export const GMAccessPamphlet = ({ userId, onCreated }) => {
  const [flipped, setFlipped] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  // Focus follows the flip when a key turned it; a tap leaves the keyboard closed on phones
  const focusAfterTurn = useRef(false);

  useEffect(() => {
    if (frontRef.current) frontRef.current.inert = flipped;
    if (backRef.current) backRef.current.inert = !flipped;
    if (!focusAfterTurn.current) return;
    focusAfterTurn.current = false;
    if (flipped) backRef.current?.querySelector('input')?.focus({ preventScroll: true });
    else frontRef.current?.focus({ preventScroll: true });
  }, [flipped]);

  const turn = (toBack, byKey = false) => {
    if (toBack === flipped) return;
    focusAfterTurn.current = byKey || (!toBack && !!backRef.current?.contains(document.activeElement));
    setFlipped(toBack);
    playPaperSound();
  };

  return (
    <div
      className={`relative lg:absolute w-full lg:w-[220px] h-[300px] sm:h-[380px] rotate-[2deg] lg:top-[100px] lg:right-[120px] z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        flipped ? '' : 'lg:hover:-translate-y-4 lg:hover:translate-x-4 lg:hover:rotate-[4deg]'}`}
      style={{ perspective: '1200px' }}
    >
      <div className={`pamphlet-flip${flipped ? ' is-flipped' : ''}`}>
        {/* FRONT FACE */}
        <div
          ref={frontRef}
          role="button"
          tabIndex={0}
          onClick={() => turn(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(true, true); } }}
          aria-label="Lightkeeper Access: new campaign"
          aria-expanded={flipped}
          className="pamphlet-face pamphlet-front border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col items-center text-ink cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-candle-gold"
          style={FACE_STYLE}
        >
          <div className="w-full text-center border-b border-sepia/40 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
            <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-sepia">For the GM</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
            {/* One title on two lines, untracked on phones so LIGHTKEEPER stays inside the card */}
            <h3 className="font-display text-lg sm:text-2xl uppercase tracking-normal sm:tracking-[0.06em] leading-none mb-2 sm:mb-4 text-oxblood">
              <span className="block mb-1">Lightkeeper</span>
              <span className="block">Access</span>
            </h3>
            <div aria-hidden="true" className="flex items-center gap-1 my-2 opacity-70">
              <div className="w-6 h-[1px] bg-sepia" />
              <div className="w-1.5 h-1.5 rounded-full border border-sepia" />
              <div className="w-6 h-[1px] bg-sepia" />
            </div>
            <BlankFields labels={['Campaign', 'Code']} className="mt-2 sm:mt-4 px-1 text-left" />
            <span className="mt-3 sm:mt-4 flex items-center gap-1.5" aria-hidden="true">
              <PrinterMark size={11} />
              <FormLine>Form C.O. 1</FormLine>
            </span>
          </div>

          <div className="w-full border-t border-sepia/40 pt-1.5 sm:pt-2 mt-2 sm:mt-3 text-center">
            <span className="font-display text-base sm:text-xl uppercase tracking-[0.1em] text-oxblood">New Campaign</span>
          </div>
        </div>

        {/* BACK FACE: the form itself */}
        <div
          ref={backRef}
          onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); turn(false, true); } }}
          className="pamphlet-face pamphlet-back border-[3px] border-double border-sepia/70 p-2 sm:p-3 flex flex-col text-ink"
          style={FACE_STYLE}
        >
          <div className="flex items-center justify-between gap-1 border-b border-sepia/40 pb-1 mb-2 sm:mb-3 shrink-0">
            <span className="flex items-center gap-1.5 min-w-0" aria-hidden="true">
              <PrinterMark size={11} />
              <FormLine>Form C.O. 1</FormLine>
            </span>
            <button
              type="button"
              onClick={() => turn(false)}
              aria-label="Close the form"
              title="Close"
              className="shrink-0 -mr-1 w-9 h-9 flex items-center justify-center rounded-sm text-sepia hover:text-oxblood hover:bg-sepia/10 transition-colors"
            >
              <CloseMark />
            </button>
          </div>
          {/* A long error can outgrow the card: this box scrolls, not the face itself
              (Safari can show a scrolling face from behind). my-auto centres the form
              without cutting off its top when it overflows. */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <div className="my-auto">
              <CreateCampaignForm variant="card" userId={userId} onCreated={onCreated} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
