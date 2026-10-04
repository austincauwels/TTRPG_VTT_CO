import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

export const GmDiceControls = ({ rollAction }) => {
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const [gmSecretRoll, setGmSecretRoll] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 bg-gm-slate/50 px-4 py-2.5 border border-gm-slate shadow-inner rounded-sm">
      <SafeIcon name="GiRollingDices" size={26} className="text-moonlight-steel shrink-0" />
      <div className="flex items-center gap-2" role="group" aria-label="Number of dice">
        <span className="font-sans text-xs uppercase tracking-widest text-moonlight-steel font-bold">Dice</span>
        <button
          onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))}
          aria-label="One die fewer"
          className="w-8 h-8 bg-gm-night border border-moonlight-steel/50 rounded-sm text-sm font-bold text-cream hover:bg-gm-slate transition-colors"
        >−</button>
        <span className="font-mono tabular-nums text-cream text-base w-5 text-center">{gmDiceCount}</span>
        <button
          onClick={() => setGmDiceCount(Math.min(6, gmDiceCount + 1))}
          aria-label="One die more"
          className="w-8 h-8 bg-gm-night border border-moonlight-steel/50 rounded-sm text-sm font-bold text-cream hover:bg-gm-slate transition-colors"
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
