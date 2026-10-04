import React from 'react';

// Official cryptid field sketches (cryp1-3), kept whole under the aged-paper treatment.
// They lie about the desk like papers someone left there (owner's round 3, item 28): one by
// the candles with its foot under the Case Ledger, one under the tomes' lower corners, one
// tucked under the Herald's top edge. Each one is placed by the object it lies under, so it
// stays with that object at every width. Decorative: no clicks.
const SKETCHES = {
  candles: {
    src: '/images/cryp1.jpg', alt: 'Field Sketch 1', ratio: '1 / 1.4',
    paper: 'bg-parchment-deep p-2', mount: 'border border-sepia/40 bg-parchment-deep', img: '',
  },
  tomes: {
    src: '/images/cryp2.webp', alt: 'Field Sketch 2', ratio: '4 / 5',
    paper: 'bg-parchment p-2', mount: 'border border-sepia/30 bg-parchment', img: 'scale-105',
  },
  herald: {
    src: '/images/cryp3.jpg', alt: 'Field Sketch 3', ratio: '1 / 1.3',
    paper: 'bg-parchment-deep p-3', mount: 'border-2 border-double border-sepia/50 bg-parchment', img: '',
  },
};

export const CryptidSketch = ({ which, className = '' }) => {
  const s = SKETCHES[which];
  return (
    <div data-hub="sketch" data-cast="0.16" className={`sketch ${className}`} style={{ aspectRatio: s.ratio }}>
      <span className="cast" aria-hidden="true" />
      <div className={`sketch-paper border border-sepia/30 shadow-[1px_2px_3px_rgba(0,0,0,0.55)] ${s.paper}`}>
        <div className={`w-full h-full relative overflow-hidden ${s.mount}`}>
          <img src={s.src} alt={s.alt} className={`w-full h-full object-cover aged-paper-img ${s.img}`} />
        </div>
      </div>
    </div>
  );
};
