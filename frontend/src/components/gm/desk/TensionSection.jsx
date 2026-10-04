import React from 'react';
import { TensionClock } from '../SceneManager';

export const TensionSection = ({ className = '' }) => (
  <div className={`mt-auto ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel">
        Tension
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    <div className="flex justify-center pb-4">
      <TensionClock />
    </div>
  </div>
);
