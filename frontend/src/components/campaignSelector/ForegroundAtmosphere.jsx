import React from 'react';

// Rendered after <main>; it must stay after it. A plain shadow at the desk's far edges,
// in normal blending, so it darkens without shifting the colors of the objects under it
// (the old overlay blend turned the Lightkeeper pamphlet near black).
export const ForegroundAtmosphere = () => (
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.35)_100%)] pointer-events-none z-50" />
);
