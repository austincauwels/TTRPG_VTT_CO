import React from 'react';
import { TensionClock } from '../SceneManager';

// The hourglass standing on the desk. Below xl a moonlit rule names it; on the desk that
// fits the screen it stands there on its own, a little larger from 2xl.
export const TensionSection = ({ className = '' }) => (
  <div className={`mt-auto ${className}`}>
    <div className="flex items-center gap-3 mb-6 xl:sr-only">
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
      <h3 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-widest text-moonlight-steel">
        Tension
      </h3>
      <div className="h-[1px] flex-1 bg-moonlight-steel/25" />
    </div>
    <div className="flex justify-center pb-4 2xl:scale-[1.18] 2xl:origin-top 2xl:pb-12">
      <TensionClock />
    </div>
  </div>
);
