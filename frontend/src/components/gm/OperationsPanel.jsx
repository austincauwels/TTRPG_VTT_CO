import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { ArtDecoCorner, BrassCornerFiligree } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';

import { GMSidebar } from './GMSidebar';
import { SceneManager } from './SceneManager';
import { CirclePage } from './CirclePage';
import { PlayerRosterCard } from './PlayerRosterCard';
import { DiceVault } from '../pc/DiceVault';
import { ArchivesView } from '../shared/ArchivesView';

export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const { rollAction } = useGameStore();

  const handleGmRoll = () => {
    rollAction('GM Override', gmDiceCount);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12">
      
      {/* ORIGINAL HEADER */}
      <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
        <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
      </header>

      {/* ORIGINAL GM CONTROL BAR */}
              <div className="w-full bg-[#1e293b] border-b border-slate-700 py-3 shadow-md z-40 flex justify-center">
              {/* Add padding-left (pl-X) to nudge it rightward */}
              <div className="w-full max-w-[1500px] px-8 flex items-center justify-start pl-[220px] gap-8">
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[#3b82f6]">
                    <SafeIcon name="GiEyeShield" size={30} />
                    <span className="font-serif text-sm font-bold tracking-[0.2em] uppercase text-slate-100">
                      Lightkeeper's Desk
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-700 mx-2" />
                </div>

              </div>

        <div className="flex items-center gap-4 bg-[#0f172a] px-4 py-1.5 rounded-sm border border-slate-700 shadow-inner">
           <SafeIcon name="GiRollingDices" size={16} className="text-[#3b82f6]" />
           <div className="flex items-center gap-2">
             <button onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))} className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors">-</button>
             <span className="font-mono text-slate-100 text-sm w-4 text-center">{gmDiceCount}</span>
             <button onClick={() => setGmDiceCount(Math.min(10, gmDiceCount + 1))} className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors">+</button>
           </div>
           <button onClick={handleGmRoll} className="ml-2 px-4 py-1 bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/50 hover:bg-[#3b82f6] hover:text-white font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-sm">Cast</button>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && <SceneManager />}
          </div>

          {/* CENTER PANEL: Wood Texture Applied */}
          <div className="lg:col-span-6">
            {activeTab === 'roster' && (
              <div className="bg-[#241710] bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] p-8 rounded-sm shadow-2xl border border-slate-700 min-h-[850px]">
                <div className="flex flex-wrap gap-6"><PlayerRosterCard /></div>
              </div>
            )}
            {activeTab === 'circle' && <CirclePage />}
            {activeTab === 'archives' && (
              <div className="bg-[#241710] bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] p-8 rounded-sm shadow-2xl border border-slate-700 min-h-[850px]">
                <ArchivesView />
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
             <div className="bg-[#0f172a] border border-slate-800 rounded-sm shadow-2xl overflow-hidden">
                <div className="grayscale sepia-[.2] hue-rotate-[190deg] brightness-90">
                   <DiceVault />
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};