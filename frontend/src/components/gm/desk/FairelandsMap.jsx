import React, { useState } from 'react';

// The official Fairelands map (Marc Moreau / Darrington Press), shown whole.
export const FairelandsMap = () => {
  const [mapOrigin, setMapOrigin] = useState('50% 50%');
  const [mapHover, setMapHover] = useState(false);

  const handleMapMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top)  / rect.height) * 100).toFixed(1);
    setMapOrigin(`${x}% ${y}%`);
  };

  return (
    <div
      className="rounded-sm shadow-2xl border border-slate-700 overflow-hidden bg-[#0a0a0a] cursor-crosshair"
      onMouseMove={handleMapMouseMove}
      onMouseEnter={() => setMapHover(true)}
      onMouseLeave={() => setMapHover(false)}
    >
      <img
        src="/images/The_Fairelands_map.png"
        alt="The Fairelands"
        className="w-full h-auto block"
        style={{
          transform: mapHover ? 'scale(4)' : 'scale(1)',
          transformOrigin: mapOrigin,
          transition: mapHover ? 'transform 0.15s ease-out' : 'transform 0.35s ease-out',
        }}
      />
    </div>
  );
};
