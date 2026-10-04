import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

// The Lightkeeper's dice controls: the wooden rail along the top of the dice tray, the
// same wood as its rim, so the controls and the felt read as one box on the desk.
const RAIL_WOOD = {
  backgroundColor: '#2e1d15',
  backgroundImage: 'repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 7px, rgb(255 255 255 / 0.025) 7px 8px, transparent 8px 15px), linear-gradient(180deg, rgb(255 255 255 / 0.07), transparent 45%, rgb(0 0 0 / 0.25))',
};

export const GmDiceControls = ({ rollAction }) => {
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const [gmSecretRoll, setGmSecretRoll] = useState(false);

  return (
    <div className="relative flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 rounded-t-sm border-b border-black/50 shadow-[0_-2px_10px_rgba(0,0,0,0.45)]" style={RAIL_WOOD}>
      <SafeIcon name="GiRollingDices" size={26} className="text-moonlight-steel shrink-0" />
      <div className="flex items-center gap-2" role="group" aria-label="Number of dice">
        <span className="font-sans text-xs uppercase tracking-widest text-moonlight-steel font-bold">Dice</span>
        <button
          onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))}
          aria-label="One die fewer"
          className="w-8 h-8 bg-black/35 border border-parchment-deep/30 rounded-sm text-sm font-bold text-cream hover:bg-black/55 hover:border-parchment-deep/60 transition-colors"
        >−</button>
        <span className="font-mono tabular-nums text-cream text-base w-5 text-center">{gmDiceCount}</span>
        <button
          onClick={() => setGmDiceCount(Math.min(6, gmDiceCount + 1))}
          aria-label="One die more"
          className="w-8 h-8 bg-black/35 border border-parchment-deep/30 rounded-sm text-sm font-bold text-cream hover:bg-black/55 hover:border-parchment-deep/60 transition-colors"
        >+</button>
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none">
        <input
          type="checkbox"
          checked={gmSecretRoll}
          onChange={e => setGmSecretRoll(e.target.checked)}
          className="w-4 h-4 accent-moonlight-steel cursor-pointer"
        />
        <span className="font-sans text-sm uppercase tracking-widest text-moonlight-steel font-bold">Secret</span>
      </label>

      <button
        onClick={() => rollAction('Lightkeeper', gmDiceCount, gmSecretRoll)}
        className="px-5 py-2 bg-oxblood text-cream border border-ink hover:brightness-125 font-sans text-sm font-black uppercase tracking-widest transition rounded"
      >Roll {gmDiceCount} {gmDiceCount === 1 ? 'die' : 'dice'}{gmSecretRoll ? ' in secret' : ''}</button>
    </div>
  );
};
