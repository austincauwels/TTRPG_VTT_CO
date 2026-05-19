import React from 'react';

// Art Deco Corner SVG Component for the Website Header
export const ArtDecoCorner = ({ position }) => {
  const rotation = {
    'top-left': 'rotate-0',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90',
  }[position];

  return (
    <div className={`absolute w-16 h-16 ${position.includes('top') ? 'top-0' : 'bottom-0'} ${position.includes('left') ? 'left-0' : 'right-0'} ${rotation}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#d4af37]/40" strokeWidth="1.5">
        <path d="M 10 0 L 10 10 L 0 10" />
        <path d="M 25 0 L 25 25 L 0 25" />
        <path d="M 40 0 L 40 40 L 0 40" />
        <line x1="0" y1="0" x2="40" y2="40" />
      </svg>
    </div>
  );
};

// Intricate Antique Corner Brackets for Document Sheets
export const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-black opacity-30" />
    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-black opacity-30" />
    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-black opacity-30" />
    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-black opacity-30" />
  </>
);

// Clean Divider Rule for Parchment Sheet Spacing
export const SheetDivider = () => (
  <div className="w-full h-0.5 border-t border-black/20 my-6 border-dashed" />
);