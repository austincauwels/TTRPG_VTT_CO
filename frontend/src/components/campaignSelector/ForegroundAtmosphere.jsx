import React from 'react';

// Rendered after <main>; it must stay after it.
export const ForegroundAtmosphere = () => (
  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-80 z-50 mix-blend-overlay" />
);
