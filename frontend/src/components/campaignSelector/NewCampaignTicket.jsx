import React, { useEffect, useRef, useState } from 'react';
import { FormLine, PrinterMark } from '../shared/PrintMarks';
import { CreateCampaignForm } from './CreateCampaignForm';
import { TicketFront } from './RailwayTicket';
import { playPaperSound } from '../../game/rollSounds';

// Two pen strokes crossed: the mark that turns the ticket back over
const CloseMark = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4.5 4.2c3.4 3.6 7.2 7.6 11 11.4" />
    <path d="M15.6 4.6C12 8 8.4 11.6 4.4 15.5" />
  </svg>
);

// The Lightkeeper's Pass, the GM's railway ticket, and her original interaction: pressed,
// it turns over in 3D and its back is the form for a new campaign (the same
// CreateCampaignForm the Lightkeeper Ledger uses). The close mark, or Escape, turns it back.
// The face turned away takes no clicks or focus. Its shadow narrows as the card goes edge-on.
// Under reduced motion the faces swap in place without spinning (DeskStyles). The two
// faces stay direct children of the preserve-3d element.
export const NewCampaignTicket = ({ userId, onCreated }) => {
  const [flipped, setFlipped] = useState(false);
  const [turns, setTurns] = useState(0);
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
    setTurns(n => n + 1);
    playPaperSound();
  };

  return (
    <div
      data-hub="ticket"
      data-cast="0.35"
      className={`ticket relative lg:absolute w-full h-[250px] sm:h-[310px] lg:w-[230px] lg:h-[330px] rotate-[2deg] lg:rotate-[3deg] lg:top-[70px] lg:right-[112px] z-40 ${
        flipped ? 'cursor-default' : 'lg:hover:-translate-y-4 lg:hover:translate-x-3 lg:hover:rotate-[4deg]'}`}
      style={{ perspective: '1200px' }}
    >
      <span key={turns} className={`cast-turn${turns ? ' is-turning' : ''}`} aria-hidden="true">
        <span className="cast" />
      </span>
      <div className={`ticket-flip${flipped ? ' is-flipped' : ''}`}>
        {/* FRONT FACE */}
        <div
          ref={frontRef}
          role="button"
          tabIndex={0}
          onClick={() => turn(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(true, true); } }}
          aria-label="New campaign"
          aria-expanded={flipped}
          className="ticket-card ticket-face ticket-front cursor-pointer"
        >
          <TicketFront kind="gm" />
        </div>

        {/* BACK FACE: the form itself */}
        <div
          ref={backRef}
          onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); turn(false, true); } }}
          className="ticket-card ticket-face ticket-back"
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
              className="shrink-0 -mr-1 w-9 h-9 flex items-center justify-center rounded-sm text-sepia hover:text-oxblood hover:bg-sepia/10 transition-colors"
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
