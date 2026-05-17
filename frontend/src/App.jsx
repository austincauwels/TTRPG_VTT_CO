import React, { useEffect, useState } from 'react';
import useGameStore from './store/gameStore';
import ActionModule from './components/ActionModule';
import ScarModal from './components/ScarModal';
import { CharacterCreator } from './components/CharacterCreator'; // <-- 1. Import the new component

function App() {
  const { connect, character, circle, lastRoll, takeMark, updateCircle, selectGilded } = useGameStore();
  
  // A temporary state to force the creator open for testing
  const [isCreating, setIsCreating] = useState(true); 

  useEffect(() => { connect(1); }, [connect]);

  const handleCircleUpdate = (field, val) => {
    updateCircle({ [field]: val });
  };

  // --- 2. Intercept the standard render to show the Character Creator ---
  if (isCreating || !character) {
    return (
      <div className="min-h-screen p-8">
        <header className="max-w-6xl mx-auto mb-6 text-center">
          <h1 className="text-5xl mb-2 font-serif text-academia-dark">Candela Obscura</h1>
          <p className="text-xl italic opacity-80 text-academia-dark/70">Virtual Tabletop</p>
        </header>
        
        <CharacterCreator 
          onSubmit={(characterData) => {
            console.log("Forged Investigator Data:", characterData);
            // In the future, this will send data via WebSockets to save to the database
            setIsCreating(false); 
          }} 
        />
      </div>
    );
  }

  // --- 3. The existing Game Board render below ---
  return (
    <div className="min-h-screen p-8">
      <header className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-5xl mb-2">Candela Obscura</h1>
        <p className="text-xl italic opacity-80">Virtual Tabletop</p>
      </header>
      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <ActionModule />
            {lastRoll && (
              <div className="parchment-card mt-8">
                <h3 className="text-xl mb-2">Roll Result</h3>
                <div className="flex gap-4">
                  {lastRoll.type === 'zero' ? (
                    <div>Zero Rating: {lastRoll.dice.join(', ')} <span className="ml-4 text-2xl">Result: {lastRoll.result}</span></div>
                  ) : (
                    lastRoll.dice.map((d, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (d.is_gilded) {
                            const act = lastRoll.action; 
                            const cat = ["move", "strike", "control"].includes(act) ? "nerve" : ["hide", "sneak", "sway"].includes(act) ? "cunning" : "intuition";
                            selectGilded(cat);
                          }
                        }}
                        className={`text-3xl p-4 border-2 transition-transform ${d.is_gilded ? 'border-yellow-500 text-yellow-500 cursor-pointer hover:scale-110' : 'border-[#d4af37]'}`}
                      >
                        {d.value}
                        {d.is_gilded && <div className="text-[10px] mt-1 uppercase text-center">Gilded</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-8">
            {circle && (
              <div className="parchment-card">
                <h2 className="text-2xl mb-4 border-b border-[#d4af37]">Circle: {circle.name}</h2>
                <div className="space-y-3">
                  {['stitch', 'refresh', 'train'].map(f => (
                    <div key={f} className="flex justify-between items-center">
                      <span className="capitalize">{f}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCircleUpdate(f, Math.max(0, circle[f] - 1))} className="text-xs opacity-50">-</button>
                        <span>{circle[f]}</span>
                        <button onClick={() => handleCircleUpdate(f, Math.min(circle.max_capacity, circle[f] + 1))} className="text-xs opacity-50">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] uppercase opacity-50 text-center">Max Capacity: {circle.max_capacity}</p>
              </div>
            )}

            <div className="parchment-card">
              <h2 className="text-2xl mb-4">Marks</h2>
              {['body', 'brain', 'bleed'].map(type => (
                <div key={type} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="capitalize">{type}</span>
                    <button onClick={() => takeMark(type)} className="text-xs btn-gold py-1 px-2">+</button>
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`mark-box ${character && i < character[`${type}_marks`] ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[#d4af37]">
                <div className="text-sm">Scars: {character?.scars_count || 0} / 4</div>
                {character?.incapacitated && <div className="text-red-600 font-bold mt-2 animate-pulse uppercase">Incapacitated</div>}
              </div>
            </div>
          </div>
        </div>
      </main>
      <ScarModal />
    </div>
  );
}
export default App;