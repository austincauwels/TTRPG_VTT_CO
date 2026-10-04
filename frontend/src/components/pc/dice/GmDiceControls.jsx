import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

export const GmDiceControls = ({ rollAction }) => {
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const [gmSecretRoll, setGmSecretRoll] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 bg-[#0f172a] px-4 py-2.5 border border-slate-700 shadow-inner rounded-sm">
      <SafeIcon name="GiRollingDices" size={26} className="text-[#3b82f6] shrink-0" />
      <div className="flex items-center gap-2">
        <button
          onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))}
          className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors"
        >-</button>
        <span className="font-mono text-slate-100 text-sm w-4 text-center">{gmDiceCount}</span>
        <button
          onClick={() => setGmDiceCount(Math.min(10, gmDiceCount + 1))}
          className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors"
        >+</button>
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none" title="Secret roll — dice visible to Lightkeeper only, not logged">
        <input
          type="checkbox"
          checked={gmSecretRoll}
          onChange={e => setGmSecretRoll(e.target.checked)}
          className="w-3 h-3 accent-[#d4af37] cursor-pointer"
        />
        <span className="font-mono text-lg uppercase tracking-widest text-[#d4af37]/70 font-bold">Secret</span>
      </label>

      <button
        onClick={() => rollAction('Lightkeeper', gmDiceCount, gmSecretRoll)}
        className="px-4 py-1 bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/50 hover:bg-[#3b82f6] hover:text-white font-mono text-lg font-bold uppercase tracking-[0.2em] transition-all rounded-sm"
      >Cast</button>
    </div>
  );
};
