import React, { useEffect, useRef, useState } from 'react';
import { FormLine, PrinterMark } from '../shared/PrintMarks';
import { CreateCampaignForm } from './CreateCampaignForm';
import { TicketFront } from './RailwayTicket';
import { playPaperSound } from '../../game/rollSounds';
import { useFlatTurn, easeOutQuint } from '../shared/useFlatTurn';

// Two pen strokes crossed: the mark that turns the ticket back over
const CloseMark = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4.5 4.2c3.4 3.6 7.2 7.6 11 11.4" />
    <path d="M15.6 4.6C12 8 8.4 11.6 4.4 15.5" />
  </svg>
);

// The Lightkeeper's Pass, the GM's railway ticket, and her original interaction: pressed,
// it turns over and its back is the form for a new campaign (the same CreateCampaignForm
// the Lightkeeper Ledger uses). The close mark, or Escape, turns it back. It turns flat
// (shared/useFlatTurn.js): the card narrows to its edge, shows its other face and widens
// again, and its shadow narrows with it; at rest only the face that is up is drawn. In 3D,
// WebKit (Safari) showed the form mirrored over the front (iPad pass, 2026-10-05). The face
// turned away takes no clicks or focus. Under reduced motion the faces swap in place. On
// the wide desk it lies 112px in from the Herald's right edge, 64px on a narrower Herald
// (NewCharacterTicket.jsx).
export const NewCampaignTicket = ({ userId, onCreated }) => {
  // flipped is the face that is up; target the face the last press asked for, which comes
  // up as the card stands on its edge
  const [flipped, setFlipped] = useState(false);
  const target = useRef(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const castRef = useRef(null);
  // Focus follows the flip when a key turned it; a tap leaves the keyboard closed on phones
  const focusAfterTurn = useRef(false);
  const { ref: flipRef, turn: turnFlat } = useFlatTurn({
    ms: 650,
    ease: easeOutQuint,
    layer: true,
    onFrame: (scale) => { if (castRef.current) castRef.current.style.transform = scale == null ? '' : `scaleX(${Math.max(0.08, scale).toFixed(3)})`; },
  });

  useEffect(() => {
    if (frontRef.current) frontRef.current.inert = flipped;
    if (backRef.current) backRef.current.inert = !flipped;
    if (!focusAfterTurn.current) return;
    focusAfterTurn.current = false;
    if (flipped) backRef.current?.querySelector('input')?.focus({ preventScroll: true });
    else frontRef.current?.focus({ preventScroll: true });
  }, [flipped]);

  const turn = (toBack, byKey = false) => {
    if (toBack === target.current) return;
    target.current = toBack;
    focusAfterTurn.current = byKey || (!toBack && !!backRef.current?.contains(document.activeElement));
    playPaperSound();
    turnFlat(() => setFlipped(toBack));
  };

  return (
    <div
      data-hub="ticket"
      data-cast="0.35"
      className={`ticket hub-ticket relative lg:landscape:absolute w-full lg:landscape:w-[230px] lg:landscape:h-[330px] rotate-[2deg] lg:landscape:rotate-[3deg] lg:landscape:top-[70px] lg:landscape:right-[clamp(64px,calc(39.344%_-_152.4px),112px)] z-40 ${
        flipped ? 'cursor-default' : 'lg:landscape:hover:-translate-y-4 lg:landscape:hover:translate-x-3 lg:landscape:hover:rotate-[4deg]'}`}
    >
      <span ref={castRef} className="cast-turn" aria-hidden="true">
        <span className="cast" />
      </span>
      <div ref={flipRef} className={`ticket-flip${flipped ? ' is-flipped' : ''}`}>
        {/* FRONT FACE */}
        <div
          ref={frontRef}
          role="button"
          tabIndex={0}
          onClick={() => turn(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(true, true); } }}
          aria-label="New campaign"
          aria-expanded={flipped}
          className="ticket-card ticket-front cursor-pointer"
        >
          <TicketFront kind="gm" />
        </div>

        {/* BACK FACE: the form itself */}
        <div
          ref={backRef}
          onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); turn(false, true); } }}
          className="ticket-card ticket-back"
        >
          <div className="flex items-center justify-between gap-1 border-b border-sepia/40 mx-2.5 mt-2 pb-1 mb-2 shrink-0">
            <span className="flex items-center gap-1.5 min-w-0" aria-hidden="true">
              <PrinterMark size={11} />
              <FormLine>Form C.O. 1</FormLine>
            </span>
            <button
              type="button"
              onClick={() => turn(false)}
              aria-label="Close the form"
              title="Close"
              className="shrink-0 -mr-1 w-9 h-9 md:[@media(pointer:coarse)]:w-11 md:[@media(pointer:coarse)]:h-11 flex items-center justify-center rounded-sm text-sepia hover:text-oxblood hover:bg-sepia/10 transition-colors"
            >
              <CloseMark />
            </button>
          </div>
          {/* A long error can outgrow the card: this box scrolls, not the face itself
              (Safari can show a scrolling face from behind). my-auto centres the form
              without cutting off its top when it overflows. */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-2.5 pb-2.5">
            <div className="my-auto">
              <CreateCampaignForm variant="card" userId={userId} onCreated={onCreated} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
