import React from 'react';

// The room's own dark at the desk's far edges, over the objects and under the header: a
// plain shadow in normal blending, so it darkens without shifting the colors under it.
// Rendered last inside the desk area.
export const ForegroundAtmosphere = () => (
  <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_66%,rgba(0,0,0,0.72)_100%)] pointer-events-none z-[47]" />
);
