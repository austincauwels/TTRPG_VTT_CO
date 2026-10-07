import React, { useState, useRef } from 'react';

const MAP_SRC = '/images/The_Fairelands_map.png';
// The same map at the same 3000 x 2000 size as AVIF (quality 90, full colour resolution,
// 4:4:4), about a fifth of the PNG's 15 MB. Lossy WebP was tried and dulled the saturated
// roofs under the magnifier (it always halves colour resolution), so it is not used here.
// A browser without AVIF loads the PNG; "Open full size" always opens the original PNG.
const MAP_AVIF = '/images/The_Fairelands_map.avif';

// The official Fairelands map (Marc Moreau / Darrington Press), shown whole.
// A mouse gets the hover magnifier. Touch and pen get tap to zoom at the tapped spot and
// tap again to zoom out, and everyone gets a link to the full-size file, where a phone
// can pinch.
export const FairelandsMap = () => {
  const [mapOrigin, setMapOrigin] = useState('50% 50%');
  const [mapHover, setMapHover] = useState(false);
  const [tapZoom, setTapZoom] = useState(false);
  const lastPointer = useRef('mouse');

  const originFrom = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top)  / rect.height) * 100).toFixed(1);
    return `${x}% ${y}%`;
  };

  const handleTap = (e) => {
    if (lastPointer.current === 'mouse') return;
    if (!tapZoom) setMapOrigin(originFrom(e));
    setTapZoom(z => !z);
  };

  const scale = mapHover ? 4 : tapZoom ? 3 : 1;

  return (
    // From xl the map is as large as its column allows in its own proportions (.map-fit)
    <div className="map-fit">
      <div
        className="map-fit-frame rounded-sm shadow-2xl border border-gm-slate overflow-hidden bg-gm-night cursor-crosshair"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={e => { lastPointer.current = e.pointerType; }}
        onPointerEnter={e => { if (e.pointerType === 'mouse') setMapHover(true); }}
        onPointerMove={e => { if (e.pointerType === 'mouse') setMapOrigin(originFrom(e)); }}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setMapHover(false); }}
        onClick={handleTap}
      >
        <picture className="block">
          <source srcSet={MAP_AVIF} type="image/avif" />
          <img
            src={MAP_SRC}
            alt="The Fairelands"
            width={3000}
            height={2000}
            decoding="async"
            className="w-full h-auto block select-none"
            draggable={false}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: mapOrigin,
              transition: mapHover ? 'transform 0.15s ease-out' : 'transform 0.35s ease-out',
            }}
          />
        </picture>
      </div>
      <div className="map-fit-frame mt-2 px-1 flex flex-wrap items-center justify-between gap-x-4 font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel">
        {/* On touch screens a tap zooms: a magnifier says which way the next tap goes */}
        <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="w-5 h-5 [@media(hover:hover)]:hidden">
          <circle cx="8.5" cy="8.5" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12.6 12.6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d={tapZoom ? 'M6 8.5h5' : 'M6 8.5h5M8.5 6v5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <a
          href={MAP_SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto min-h-[44px] inline-flex items-center underline underline-offset-4 hover:text-cream transition-colors"
        >
          Open full size
        </a>
      </div>
    </div>
  );
};
