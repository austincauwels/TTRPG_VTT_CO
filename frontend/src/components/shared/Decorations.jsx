import React from 'react';

export const ArtDecoCorner = ({ position }) => {
  const rotation = {
    'top-left': 'rotate-0',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90',
  }[position];

  return (
    <div className={`absolute w-16 h-16 ${position.includes('top') ? 'top-0' : 'bottom-0'} ${position.includes('left') ? 'left-0' : 'right-0'} ${rotation}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-candle-gold/40" strokeWidth="1.5">
        <path d="M 10 0 L 10 10 L 0 10" />
        <path d="M 25 0 L 25 25 L 0 25" />
        <path d="M 40 0 L 40 40 L 0 40" />
        <line x1="0" y1="0" x2="40" y2="40" />
      </svg>
    </div>
  );
};

export const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-ink opacity-30" />
    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-ink opacity-30" />
    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-ink opacity-30" />
    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-ink opacity-30" />
  </>
);

export const SheetDivider = () => (
  <div className="w-full h-0.5 border-t border-ink/20 my-6 border-dashed" />
);

// Two curved arrows chasing each other: this card has a back and turns over when pressed
export const TurnOverMark = ({ className = '' }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className={`w-4 h-4 ${className}`}>
    <path d="M2.5 8a5.5 5.5 0 0 1 9.6-3.7M13.5 8a5.5 5.5 0 0 1-9.6 3.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12.6 1.6v3.2H9.4M3.4 14.4v-3.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);