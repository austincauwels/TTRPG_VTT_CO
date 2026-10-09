import React from 'react';

// Small marks drawn in ink, in place of text glyphs that iOS turns into emoji (owner's
// round 4 item 10: the ▶ before a campaign showed as a blue emoji box). Each takes the
// current text color and sits on the text's baseline like the glyph it replaces. All are
// decoration: the words beside them carry the meaning.

const base = { 'aria-hidden': true, focusable: 'false', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };

// A pen tick
export const TickMark = ({ className = '' }) => (
  <svg {...base} viewBox="0 0 12 12" strokeWidth="1.9" className={`inline-block w-[0.9em] h-[0.9em] align-[-0.08em] ${className}`}>
    <path d="M2 6.6l2.7 2.6L10.2 3" />
  </svg>
);

// A pen cross, the tick's opposite
export const CrossMark = ({ className = '' }) => (
  <svg {...base} viewBox="0 0 12 12" strokeWidth="1.7" className={`inline-block w-[0.8em] h-[0.8em] align-[-0.04em] ${className}`}>
    <path d="M3 3.2l6 5.8M9 3L3.2 9" />
  </svg>
);

// A filled triangle pointing on: "go in" (a campaign you run)
export const PlayMark = ({ className = '' }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" className={`inline-block w-[0.85em] h-[0.85em] ${className}`}>
    <path d="M3 1.8L10.4 6L3 10.2Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

// A Latin cross, engraved: the death notice
export const MourningCross = ({ className = '' }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 34" className={`inline-block h-[1em] w-auto ${className}`}>
    <path d="M10 1.5h4v8.5h8v4h-8v18.5h-4V14H2v-4h8Z" fill="currentColor" />
  </svg>
);

// Two upright strokes: a timer standing still part way (the hourglass's timer)
export const PauseMark = ({ className = '' }) => (
  <svg {...base} viewBox="0 0 12 12" strokeWidth="2" className={`inline-block w-[0.85em] h-[0.85em] ${className}`}>
    <path d="M4 2.4v7.2M8 2.4v7.2" />
  </svg>
);

// A stroke turning back round to where it began: back to the start
export const TurnBackMark = ({ className = '' }) => (
  <svg {...base} viewBox="0 0 12 12" strokeWidth="1.5" className={`inline-block w-[0.95em] h-[0.95em] ${className}`}>
    <path d="M2.7 4.4A3.9 3.9 0 1 1 2.4 7.6" />
    <path d="M2.3 1.7l0.4 2.8l2.7-0.6" />
  </svg>
);
