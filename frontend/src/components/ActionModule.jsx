import React, { useState } from 'react';
import useGameStore from '../store/gameStore';

const ActionModule = () => {
  const { character, rollAction, selectGilded, lastRoll } = useGameStore();
  const [driveToSpend, setDriveToSpend] = useState(0);

  if (!character) return <div className="p-4">Loading Investigator Dossier...</div>;

  const categories = [
    { name: 'Nerve', actions: ['move', 'strike', 'control'], drive: 'nerve' },
    { name: 'Cunning', actions: ['hide', 'sneak', 'sway'], drive: 'cunning' },
    { name: 'Intuition', actions: ['survey', 'read', 'sense'], drive: 'intuition' },
  ];

  const handleSelectGilded = (cat) => {
    selectGilded(cat);
  };

  return (
    <div className="space-y-6">
      <div className="parchment-card flex items-center justify-between">
        <div>
          <label className="block text-sm uppercase tracking-widest mb-1">Drive to Spend (Add Dice)</label>
          <input
            type="number"
            min="0" max="6"
            value={driveToSpend}
            onChange={(e) => setDriveToSpend(e.target.value)}
            className="input-dark w-20"
          />
        </div>
        <div className="text-right">
          <p className="text-xs italic">Max pool of 6 dice total.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.name} className="parchment-card">
            <h2 className="text-2xl mb-4 border-b border-[#d4af37] flex justify-between">
              {cat.name}
              <button
                onClick={() => handleSelectGilded(cat.drive)}
                className="text-xs btn-gold px-2 py-0 h-6"
                title="Recover Drive if Gilded Die chosen"
              >
                +
              </button>
            </h2>
            <div className="mb-4">
              <span className="text-sm uppercase">Drive</span>
              <div className="flex mt-1">
                {Array.from({ length: character[`${cat.drive}_max`] || 0 }).map((_, i) => (
                  <div key={i} className={`action-dot ${i < (character[`${cat.drive}_current`] || 0) ? 'filled' : ''}`} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {cat.actions.map((act) => (
                <div key={act} className="flex justify-between items-center">
                  <button
                    onClick={() => rollAction(act, driveToSpend)}
                    className={`capitalize hover:text-white transition-colors ${character[`gilded_${act}`] ? 'text-yellow-500 underline font-bold' : ''}`}
                  >
                    {act}
                  </button>
                  <div className="flex">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`action-dot ${i < (character[act] || 0) ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs opacity-70">Resistance: {Math.floor((character[`${cat.drive}_max`] || 0) / 3)}</div>
          </div>
        ))}
      </div>

      {lastRoll && lastRoll.type === 'standard' && lastRoll.dice.some(d => d.is_gilded) && (
        <div className="parchment-card border-yellow-500 animate-pulse">
          <p className="text-center text-yellow-500 font-bold">Gilded Die Rolled! If you choose its result, click '+' on the category to recover 1 Drive.</p>
        </div>
      )}
    </div>
  );
};
export default ActionModule;
