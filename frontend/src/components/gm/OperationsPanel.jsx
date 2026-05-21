import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { BrassCornerFiligree } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';

import { GMSidebar } from './GMSidebar';
import { SceneManager } from './SceneManager';
import { CirclePage } from './CirclePage';
import { PlayerRosterCard } from './PlayerRosterCard';
import { DiceVault } from '../pc/DiceVault';
import { ArchivesView } from '../shared/ArchivesView';

export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  
  // State for the Brass Casting Bowl
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const { rollAction } = useGameStore();

  const handleGmRoll = () => {
    rollAction('GM Override', gmDiceCount);
  };

  return (
    <div className="min-h-screen bg-[#1c120c] text-[#e8dcc4] font-serif bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pb-12 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]">
      
      {/* 1. PHYSICAL DESK ORNAMENT */}
      <div className="w-full flex justify-center pt-8 pb-4 drop-shadow-2xl relative z-40">
        <div className="bg-gradient-to-b from-[#2a1f18] to-[#140e0a] border-[3px] border-[#7a5c38] px-12 py-5 rounded-sm shadow-[0_15px_25px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.05)] flex flex-col items-center relative overflow-hidden">
          
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#7a5c38] shadow-inner transform rotate-45" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#7a5c38] shadow-inner transform -rotate-12" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#7a5c38] shadow-inner transform rotate-90" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#7a5c38] shadow-inner transform rotate-180" />

          <h1 className="text-3xl md:text-4xl font-serif font-black tracking-[0.2em] text-[#c49a54] uppercase drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
            Candela Obscura
          </h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="w-12 h-px bg-[#7a5c38]/50" />
             <h2 className="text-[10px] font-sans font-bold tracking-[0.4em] text-[#a38048] uppercase drop-shadow-md">
               The Lightkeeper's Desk
             </h2>
             <div className="w-12 h-px bg-[#7a5c38]/50" />
          </div>
        </div>
      </div>

      {/* 2. MAIN DESK WORKSPACE */}
      <main className="max-w-[1500px] mx-auto p-4 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
          
          {/* COLUMN 1: NAVIGATION & SCENE */}
          <div className="lg:col-span-3 flex flex-col gap-6 relative z-30">
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && <SceneManager />}
          </div>

          {/* COLUMN 2: CENTER WORK AREA (Deep Mahogany) */}
          <div className="lg:col-span-6 relative z-20">
            {activeTab === 'roster' && (
              <div className="bg-[#180e0a] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-8 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-t border-l border-[#3a251a] border-b-2 border-r-2 border-black min-h-[850px] saturate-[.8] brightness-[.85] relative overflow-hidden">
                <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
                
                <div className="opacity-30 grayscale sepia-[.6] hue-rotate-[10deg] brightness-75 pointer-events-none">
                  <BrassCornerFiligree />
                </div>

                <div className="relative z-10 flex flex-wrap gap-6">
                  <PlayerRosterCard />
                </div>
              </div>
            )}
            
            {activeTab === 'circle' && <CirclePage />}
            
            {activeTab === 'archives' && (
              <div className="bg-[#180e0a] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-8 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-t border-l border-[#3a251a] border-b-2 border-r-2 border-black min-h-[850px] saturate-[.8] brightness-[.85]">
                <div className="grayscale-[0.1] sepia-[0.3] brightness-90">
                   <ArchivesView />
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 3: CASTING BOWL & DICE VAULT */}
          <div className="lg:col-span-3 flex flex-col gap-8 relative z-30">
             
             {/* THE BRASS CASTING BOWL */}
             <div className="flex justify-center mt-2">
                <div className="w-48 h-48 rounded-full border-[8px] border-[#6b4c31] bg-[radial-gradient(ellipse_at_center,_#2a1b12_0%,_#0a0502_100%)] shadow-[0_25px_35px_rgba(0,0,0,0.9),inset_0_15px_30px_rgba(0,0,0,0.95)] flex items-center justify-center relative group">
                    
                    {/* Metal rim glare */}
                    <div className="absolute inset-0 rounded-full border-t-[2px] border-white/10 pointer-events-none mix-blend-overlay" />
                    
                    {/* - Button */}
                    <button 
                        onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))}
                        className="absolute left-2 w-9 h-9 rounded-full bg-[#111] border border-[#4a3220] text-[#a38048] shadow-[0_4px_6px_rgba(0,0,0,0.8)] hover:bg-[#222] hover:text-[#c49a54] active:scale-90 transition-all flex items-center justify-center pb-0.5"
                    >
                        <span className="text-2xl font-bold leading-none">-</span>
                    </button>
                    
                    {/* Center Cast Mechanism */}
                    <button 
                        onClick={handleGmRoll}
                        className="flex flex-col items-center justify-center w-[84px] h-[84px] rounded-full bg-[#180e0a] border-[3px] border-[#4a3220] text-[#c49a54] shadow-[0_8px_20px_rgba(0,0,0,0.9)] hover:bg-[#24150f] hover:border-[#8a6a44] hover:shadow-[0_0_25px_rgba(138,106,68,0.5)] transition-all group-active:scale-95"
                    >
                        <span className="font-serif text-4xl font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{gmDiceCount}</span>
                        <span className="font-sans text-[9px] uppercase tracking-[0.2em] font-bold mt-1 text-[#8a6a44]">Cast</span>
                    </button>

                    {/* + Button */}
                    <button 
                        onClick={() => setGmDiceCount(Math.min(10, gmDiceCount + 1))}
                        className="absolute right-2 w-9 h-9 rounded-full bg-[#111] border border-[#4a3220] text-[#a38048] shadow-[0_4px_6px_rgba(0,0,0,0.8)] hover:bg-[#222] hover:text-[#c49a54] active:scale-90 transition-all flex items-center justify-center pb-0.5"
                    >
                        <span className="text-2xl font-bold leading-none">+</span>
                    </button>

                    {/* Engraved Plaque */}
                    <div className="absolute -bottom-4 bg-[#111] border border-[#4a3220] px-4 py-1 shadow-[0_5px_10px_rgba(0,0,0,0.9)] rounded-sm">
                       <span className="font-mono text-[9px] text-[#a38048] uppercase tracking-[0.2em] font-bold">Casting Bowl</span>
                    </div>
                </div>
             </div>

             {/* DICE VAULT */}
             <div className="bg-[#241710] border-2 border-[#120a06] rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden relative">
                <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
                <div className="relative z-10 grayscale sepia-[.4] hue-rotate-[10deg] brightness-90">
                   <DiceVault />
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
};