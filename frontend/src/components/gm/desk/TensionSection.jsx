import React from 'react';
import { TensionClock } from '../SceneManager';

export const TensionSection = () => (
  <div className="mt-auto">
    <div className="flex items-center gap-3 mb-6">
      <div className="h-[1px] flex-1 bg-red-900/30" />
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-red-500/60">
        Tension
      </h3>
      <div className="h-[1px] flex-1 bg-red-900/30" />
    </div>
    <div className="flex justify-center pb-4">
      <TensionClock />
    </div>
  </div>
);
