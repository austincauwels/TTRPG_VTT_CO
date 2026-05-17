// src/App.jsx
import React, { useEffect, useState } from 'react';
import useGameStore from './store/gameStore';
import ActionModule from './components/ActionModule';
import ScarModal from './components/ScarModal';
import { CharacterCreator } from './components/CharacterCreator';
import * as Gi from "react-icons/gi";

// Clean UI Filigree Component to match the Character Creator styling
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
    updateCircle, 
    selectGilded, 
    setLocalCharacter 
  } = useGameStore();
  
  const [isCreating, setIsCreating] = useState(true); 
  const [isRollingAnimation, setIsRollingAnimation] = useState(false);

  useEffect(() => { 
    connect(1); 
  }, [connect]);

  // Trigger the dice tray animation every time a new roll payload arrives over the network
  useEffect(() => {
    if (lastRoll) {
      setIsRollingAnimation(true);
      const timer = setTimeout(() => setIsRollingAnimation(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastRoll]);

  const handleCircleUpdate = (field, val) => {
    updateCircle({ [field]: val });
  };

  // --- INITIAL RENDERING GATEWAY: The Character Creator Wizard ---
  if (isCreating || !character) {
    return (
      <div className="min-h-screen bg-[#120b0a] py-8">
        <header className="max-w-6xl mx-auto mb-6 text-center">
          <h1 className="text-5xl mb-2 font-serif font-black tracking-tight text-[#fdfaf4]">CANDELA OBSCURA</h1>
          <p className="text-sm font-sans font-black tracking-widest text-[#721c15] uppercase">Virtual Tabletop Staging Archive</p>
        </header>
        
        <CharacterCreator 
          onSubmit={(characterData) => {
            setLocalCharacter(characterData);
            setIsCreating(false); 
            connect(characterData.id);
          }} 
        />
      </div>
    );
  }

  // --- THE MAIN INVESTIGATOR LIVE SHEET DASHBOARD ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1c1311] via-[#120b0a] to-[#0f0807] text-[#1a1311] p-4 md:p-8 font-serif select-none">
      
      {/* Upper Title Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-end border-b border-[#3e2f29]/40 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#fdfaf4] leading-none uppercase">
            {character.name}
          </h1>
          <p className="text-xs font-sans font-black tracking-widest text-[#721c15] uppercase mt-1">
            {character.specialty_ability || "Active Investigator Dossier"} • {character.pronouns}
          </p>
        </div>
        <div className="text-right font-sans font-black tracking-widest text-[10px] text-[#e5c158] bg-black/40 border border-[#3e2f29] px-3 py-1.5 rounded">
          ARCHIVE REF: NO. {character.id.toString().padStart(4, '0')}
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Responsive Two-Column Grid Architecture Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================================================================= */}
          {/* LEFT COLUMN: THE INTERACTIVE INVESTIGATOR LEDGER (Spans 7 Columns) */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 bg-[#f5ebd6] border-4 border-double border-[#1a1311] shadow-[0_15px_35px_rgba(0,0,0,0.6)] p-6 relative">
            <BrassCornerFiligree />
            
            {/* Action Matrix & Resource Tracker Core Module */}
            <ActionModule />
            
            {/* Bottom Panel Metadata Summary Info Row */}
            <div className="mt-6 pt-4 border-t border-[#1a1311]/20 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-0.5">Narrative Catalyst</span>
                <p className="italic opacity-80 line-clamp-2">{character.catalyst || "No catalyst documented."}</p>
              </div>
              <div>
                <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-0.5">Equipped Gear Payload</span>
                <p className="opacity-80 truncate">
                  {Array.isArray(character.gear) ? character.gear.slice(0, 4).join(', ') : 'Standard Field Issue'}...
                </p>
              </div>
            </div>
          </div>
          
          {/* ================================================================= */}
          {/* RIGHT COLUMN: CLOCK, INSET DICE TRAY, AND SESSION FEED (Spans 5)  */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. TOP RIGHT: ACTIVE THREAT CLOCK / CIRCLE TRACKER CARD */}
            {circle && (
              <div className="bg-[#f5ebd6] border-2 border-[#1a1311] shadow-lg p-5 relative">
                <BrassCornerFiligree />
                <div className="flex justify-between items-center border-b border-[#1a1311]/20 pb-2 mb-4">
                  <h2 className="text-xl font-black text-[#1a1311] uppercase tracking-tight flex items-center gap-2">
                    <SafeIcon name="GiCircleSparks" className="text-[#721c15]" /> Circle: {circle.name}
                  </h2>
                  <span className="font-sans font-black text-[9px] tracking-widest bg-[#721c15] text-[#fdfaf4] px-1.5 py-0.5 rounded uppercase">Stitch Track</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['stitch', 'refresh', 'train'].map(field => (
                    <div key={field} className="bg-[#ebdcb9] border border-[#1a1311]/30 p-2 text-center rounded shadow-inner relative group">
                      <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">{field}</span>
                      <div className="flex justify-center items-center gap-3">
                        <button 
                          onClick={() => handleCircleUpdate(field, Math.max(0, circle[field] - 1))} 
                          className="font-sans font-black text-sm text-[#1a1311]/40 hover:text-[#721c15] transition-colors px-1"
                        >-</button>
                        <span className="text-xl font-black">{circle[field]}</span>
                        <button 
                          onClick={() => handleCircleUpdate(field, Math.min(circle.max_capacity, circle[field] + 1))} 
                          className="font-sans font-black text-sm text-[#1a1311]/40 hover:text-[#721c15] transition-colors px-1"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[9px] font-sans font-black tracking-widest opacity-50 text-center uppercase">Circle Operations Limit: {circle.max_capacity} Users</div>
              </div>
            )}

            {/* 2. MIDDLE RIGHT: THE NEW INSET DICE TRAY */}
            <div className="bg-[#120b0a] border-2 border-[#3e2f29] rounded p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] relative overflow-hidden h-40 flex flex-col justify-between">
              
              {/* Gold Framing Filigree Accents inside the dark box */}
              <div className="absolute top-1.5 left-1.5 text-[#e5c158]/20"><SafeIcon name="GiCardRandom" size={16} /></div>
              <div className="absolute top-1.5 right-1.5 text-[#e5c158]/20"><SafeIcon name="GiPerspectiveDiceSixFacesRandom" size={16} /></div>
              
              <h4 className="text-[9px] font-sans font-black uppercase tracking-widest text-[#e5c158]/60 border-b border-[#3e2f29] pb-1 relative z-10">
                Inset Dice Tumbler Tray
              </h4>

              {/* Animated Dice Field Container */}
              <div className="flex-1 flex items-center justify-center gap-4 relative z-10">
                {isRollingAnimation ? (
                  <div className="flex gap-3 animate-bounce">
                    <div className="w-12 h-12 border border-[#e5c158] bg-[#721c15] rounded transform rotate-12 flex items-center justify-center shadow-lg animate-spin">
                      <SafeIcon name="GiChaos" className="text-[#fdfaf4]" size={24} />
                    </div>
                    <div className="w-12 h-12 border border-[#e5c158] bg-[#1a1311] rounded transform -rotate-12 flex items-center justify-center shadow-lg animate-spin">
                      <SafeIcon name="GiChaos" className="text-[#fdfaf4]" size={24} />
                    </div>
                  </div>
                ) : lastRoll ? (
                  <div className="flex flex-wrap justify-center gap-3 animate-fadeIn">
                    {lastRoll.type === 'zero' ? (
                      <div className="text-xs text-[#f6f3eb] font-sans bg-[#721c15] py-1.5 px-3 rounded border border-[#e5c158]/30">
                        Zero Rating Scramble: {lastRoll.dice.map(d => d.value).join(', ')} • <span className="font-bold text-[#e5c158]">Result: {lastRoll.result}</span>
                      </div>
                    ) : (
                      lastRoll.dice.map((die, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (die.is_gilded) {
                              const act = lastRoll.action; 
                              const cat = ["move", "strike", "control"].includes(act) ? "nerve" : ["hide", "sneak", "sway"].includes(act) ? "cunning" : "intuition";
                              selectGilded(cat);
                            }
                          }}
                          className={`w-12 h-12 border-2 rounded flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                            die.is_gilded 
                              ? 'border-[#e5c158] bg-[#721c15] text-[#e5c158] shadow-[0_0_10px_rgba(229,193,88,0.4)] hover:scale-105' 
                              : 'border-[#3e2f29] bg-black/40 text-[#f6f3eb] hover:border-[#e5c158]/40'
                          }`}
                        >
                          <span className="text-xl font-black font-sans">{die.value}</span>
                          {die.is_gilded && <span className="text-[7px] font-sans font-black tracking-tighter uppercase absolute bottom-0.5">GILD</span>}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[#f6f3eb]/30 text-xs italic tracking-wide">
                    Tray empty. Request an Action score roll to cast dice.
                  </div>
                )}
              </div>

              {/* Rolling feedback indicator footer layout */}
              <div className="text-[9px] font-sans font-black text-right tracking-widest text-[#f6f3eb]/40 uppercase mt-1">
                {lastRoll ? `Outcome: ${lastRoll.result} High Die` : "System Ready"}
              </div>
            </div>

            {/* 3. BOTTOM RIGHT: MARKS, SCARS TRACKER, AND LIVE FEED LOG */}
            <div className="bg-[#f5ebd6] border-2 border-[#1a1311] shadow-lg p-5 relative">
              <BrassCornerFiligree />
              <h2 className="text-xl font-black border-b border-[#1a1311]/20 pb-2 mb-4 uppercase tracking-tight flex items-center gap-2">
                <SafeIcon name="GiBleedingWound" className="text-[#721c15]" /> Trauma Status Tracks
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['body', 'brain', 'bleed'].map(type => (
                  <div key={type} className="bg-[#ebdcb9] border border-[#1a1311]/20 p-2 rounded text-center">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-sans font-black uppercase tracking-widest text-[#721c15]">{type}</span>
                      <button onClick={() => takeMark(type)} className="w-4 h-4 rounded-full bg-[#1a1311] text-[#fdfaf4] text-[10px] font-black flex items-center justify-center hover:bg-[#721c15] transition-colors">+</button>
                    </div>
                    <div className="flex justify-center gap-1.5 mt-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-4 h-4 border border-[#1a1311] transition-colors ${
                            character && i < character[`${type}_marks`] 
                              ? 'bg-[#721c15] shadow-inner' 
                              : 'bg-white/40'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-[#1a1311]/20 flex justify-between items-center text-xs">
                <div className="font-sans font-black text-[10px] uppercase tracking-widest">Permanent Scars: <span className="text-sm font-serif font-black ml-1">{character?.scars_count || 0} / 4</span></div>
                {character?.incapacitated && (
                  <div className="text-[#721c15] font-black tracking-widest font-sans text-[10px] bg-red-100 border border-[#721c15] px-2 py-0.5 rounded animate-pulse uppercase">
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