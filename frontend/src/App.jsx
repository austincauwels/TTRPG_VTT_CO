// src/App.jsx
import React, { useEffect, useState } from 'react';
import useGameStore from './store/gameStore';
import ActionModule from './components/ActionModule';
import ScarModal from './components/ScarModal';
import { CharacterCreator } from './components/CharacterCreator';
import * as Gi from "react-icons/gi";

const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#d4af37] opacity-60" />
    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#d4af37] opacity-60" />
    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#d4af37] opacity-60" />
    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#d4af37] opacity-60" />
  </>
);

const SafeIcon = ({ name, size = 20, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};

function App() {
  const { 
    connect, 
    character, 
    circle, 
    lastRoll, 
    takeMark, 
    setLocalCharacter 
  } = useGameStore();
  
  const [isCreating, setIsCreating] = useState(true); 

  // --- INITIAL RENDERING GATEWAY: The Character Creator Wizard ---
  if (isCreating || !character) {
    return (
      <div className="min-h-screen bg-[#120b0a] py-8">
        <header className="max-w-6xl mx-auto mb-6 text-center">
          <h1 className="text-5xl mb-2 font-serif font-black tracking-tight text-[#fdfaf4]">CANDELA OBSCURA</h1>
          <p className="text-sm font-sans font-black tracking-widest text-[#721c15] uppercase">Virtual Tabletop Staging Archive</p>
        </header>
        
        <CharacterCreator 
          onSubmit={async (characterData) => {
            try {
              // 1. Map the frontend data to match your strict backend SQLite schema
              const payload = {
                name: characterData.name || "Unknown Investigator",
                pronouns: characterData.pronouns || "Unlisted",
                style: characterData.style || "",
                catalyst: characterData.catalyst || "",
                question: characterData.question || "",
                role_ability: characterData.roleAbility || "None",
                specialty_ability: characterData.specialtyAbility || "None",
                gear: characterData.gear || []
              };

              // 2. THE SMOKING GUN FIX: Actually send the data to the SQLite database
              const response = await fetch('/api/investigators/forge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (!response.ok) {
                console.error("Database Forge Failed:", await response.text());
                return; // Stop rendering if the database rejects it
              }

              // 3. Extract the freshly generated database profile (Now containing an ID!)
              const savedCharacter = await response.json();
              
              setLocalCharacter(savedCharacter);
              setIsCreating(false); 
              
              // 4. Securely connect the WebSocket using the real integer ID
              connect(savedCharacter.id);

            } catch (err) {
              console.error("Network Error during Forge:", err);
            }
          }} 
        />
      </div>
    );
  }

  // --- MAIN TABLETOP DASHBOARD LAYOUT ---
  return (
    <div className="min-h-screen bg-[#120b0a] text-[#1a1311] p-8 font-serif bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
      
      {/* HEADER SECTION */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-end border-b border-[#3e2f29]/40 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#fdfaf4] leading-none uppercase drop-shadow-md">
            {character.name}
          </h1>
          <p className="text-lg italic text-[#e5c158] mt-1">{character.pronouns} • {character.style}</p>
        </div>
        
        {circle && (
          <div className="text-right">
            <h2 className="text-2xl font-black text-[#fdfaf4] uppercase tracking-widest">{circle.name}</h2>
            <div className="flex gap-4 mt-2 text-sm text-[#e5c158] font-sans font-bold">
              <span>Stitch: {circle.stitch}</span>
              <span>Refresh: {circle.refresh}</span>
              <span>Train: {circle.train}</span>
            </div>
          </div>
        )}
      </header>

      {/* TWO COLUMN GRID LAYOUT */}
      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: THE ACTION MODULE */}
          <div className="lg:col-span-7 bg-[#f5ebd6] border-4 border-double border-[#1a1311] shadow-[0_15px_35px_rgba(0,0,0,0.6)] p-6 relative">
            <BrassCornerFiligree />
            <ActionModule />
          </div>
          
          {/* RIGHT COLUMN: DICE TRAY AND TRAUMA TRACKERS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* THE INSET DICE TRAY */}
            <div className="bg-[#120b0a] border-2 border-[#3e2f29] rounded p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] relative overflow-hidden h-40 flex flex-col justify-between">
              <div className="absolute top-1.5 left-1.5 text-[#e5c158]/20"><SafeIcon name="GiCardRandom" size={16} /></div>
              <div className="absolute top-1.5 right-1.5 text-[#e5c158]/20"><SafeIcon name="GiPerspectiveDiceSixFacesRandom" size={16} /></div>
              
              <h4 className="text-[9px] font-sans font-black uppercase tracking-widest text-[#e5c158]/60 border-b border-[#3e2f29] pb-1 relative z-10">
                Inset Dice Tumbler Tray
              </h4>

              <div className="flex-1 flex items-center justify-center gap-4 relative z-10">
                {lastRoll ? (
                  <div className="flex flex-col items-center animate-fadeIn">
                    <div className="flex gap-3">
                      {lastRoll.dice.map((die, idx) => (
                        <div key={idx} className={`w-12 h-12 border-2 ${die.is_gilded ? 'border-[#d4af37] bg-[#721c15]' : 'border-[#3e2f29] bg-[#1a1311]'} text-[#fdfaf4] font-black text-2xl flex items-center justify-center rounded shadow-lg`}>
                          {die.value}
                        </div>
                      ))}
                    </div>
                    {lastRoll.type === 'zero' && (
                      <div className="text-[#721c15] text-xs font-bold mt-2 uppercase tracking-widest">
                        Zero Pool (Took Lowest)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[#f6f3eb]/30 text-xs italic tracking-wide">
                    Tray empty. Awaiting Action...
                  </div>
                )}
              </div>
            </div>

            {/* TRAUMA AND MARKS TRACKER */}
            <div className="bg-[#f5ebd6] border-2 border-[#1a1311] shadow-[0_10px_20px_rgba(0,0,0,0.4)] p-5 relative">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#1a1311] border-b border-[#1a1311]/20 pb-2 mb-4 flex items-center gap-2">
                <SafeIcon name="GiBleedingEye" /> Damage Ledger
              </h3>
              
              <div className="space-y-4">
                {['body', 'brain', 'bleed'].map((type) => (
                  <div key={type} className="flex justify-between items-center bg-[#ebdcb9]/40 p-2 rounded">
                    <div className="flex items-center gap-4">
                      <span className="font-bold uppercase tracking-wider w-16 text-[#1a1311] text-sm">{type}</span>
                      <button onClick={() => takeMark(type)} className="w-6 h-6 flex items-center justify-center bg-[#1a1311] text-[#fdfaf4] rounded-full hover:bg-[#721c15] transition-colors shadow-sm">+</button>
                    </div>
                    <div className="flex justify-center gap-1.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-4 h-4 border border-[#1a1311] transition-colors ${
                            i < (character[`${type}_marks`] || 0) 
                              ? 'bg-[#721c15] shadow-inner' 
                              : 'bg-white/60'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-[#1a1311]/20 flex justify-between items-center text-xs">
                <div className="font-sans font-black text-[10px] uppercase tracking-widest text-[#1a1311]">Permanent Scars: <span className="text-sm font-serif font-black ml-1">{character.scars_count || 0} / 4</span></div>
                {character.incapacitated && (
                  <div className="text-[#721c15] font-black tracking-widest font-sans text-[10px] bg-red-100 border border-[#721c15] px-2 py-0.5 rounded animate-pulse uppercase shadow-inner">
                    Incapacitated
                  </div>
                )}
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