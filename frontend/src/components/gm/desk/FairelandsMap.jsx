import React, { useState, useRef } from 'react';

const MAP_SRC = '/images/The_Fairelands_map.png';

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
    <div>
      <div
        className="rounded-sm shadow-2xl border border-gm-slate overflow-hidden bg-gm-night cursor-crosshair"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={e => { lastPointer.current = e.pointerType; }}
        onPointerEnter={e => { if (e.pointerType === 'mouse') setMapHover(true); }}
        onPointerMove={e => { if (e.pointerType === 'mouse') setMapOrigin(originFrom(e)); }}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setMapHover(false); }}
        onClick={handleTap}
      >
        <img
          src={MAP_SRC}
          alt="The Fairelands"
          className="w-full h-auto block select-none"
          draggable={false}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: mapOrigin,
            transition: mapHover ? 'transform 0.15s ease-out' : 'transform 0.35s ease-out',
          }}
        />
      </div>
      <div className="mt-2 px-1 flex flex-wrap items-center justify-between gap-x-4 font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel">
        <span className="[@media(hover:hover)]:hidden">
          {tapZoom ? 'Tap again to zoom out' : 'Tap the map to zoom in'}
        </span>
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
