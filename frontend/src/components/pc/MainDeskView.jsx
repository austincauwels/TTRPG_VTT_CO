import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';

// Components
import { SafeIcon } from '../shared/SafeIcon';
import { ArtDecoCorner, BrassCornerFiligree } from '../shared/Decorations';
import { InvestigatorDossier } from './InvestigatorDossier';
import { CircleView } from './CircleView';
import { ArchivesView } from '../shared/ArchivesView';
import { TactileSidebar } from './TactileSidebar';
import { DiceVault } from './DiceVault';
import ScarModal from './ScarModal';

export const MainDeskView = () => {
  const { character, accessSession, logout } = useGameStore();
  const [activeTab, setActiveTab] = useState('character');

  return (
    <div className="min-h-screen bg-[#160e0b] text-[#fdfaf4] font-serif selection:bg-[#721c15] selection:text-white antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 relative">
      
      {/* HEADER */}
      <header className="w-full bg-[#090504] relative py-6 flex flex-col items-center justify-center border-b border-black/40 shadow-xl">
        <ArtDecoCorner position="top-left" />
        <ArtDecoCorner position="top-right" />
        
        {/* LOGOUT BUTTON */}
        <div className="absolute top-4 right-6 z-50">
          <button 
            onClick={logout}
            className="text-[10px] uppercase tracking-[0.2em] text-[#a82222] hover:text-parchment transition-colors border border-transparent hover:border-[#a82222]/50 px-2 py-1"
          >
            [ Abandon Archive ]
          </button>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-[0.15em] text-white uppercase drop-shadow-md">
          CANDELA OBSCURA
        </h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#a82222] uppercase mt-1.5">
          Virtual Tabletop Staging Archive
        </h2>
        
        <div className="flex items-center gap-4 mt-3 w-56">
          <div className="h-[1px] flex-1 bg-[#d4af37]/40" />
          <div className="text-[#d4af37]/70 relative flex items-center justify-center">
             <SafeIcon name="GiCompass" size={18} className="relative z-10" />
          </div>
          <div className="h-[1px] flex-1 bg-[#d4af37]/40" />
        </div>
      </header>

      {/* REGISTRY NAVIGATION */}
      <div className="max-w-[1500px] mx-auto mt-6 px-4 relative z-30">
        <div className="absolute -left-3 sm:left-2 top-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-[#9c1c1c] via-[#7d1414] to-[#4a0808] rounded-[48%] shadow-[4px_10px_20px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border border-[#5c0f0f] transform rotate-12 z-40 select-none cursor-help group" title="Official Seal of the Order">
          <div className="w-20 h-20 rounded-full border border-dashed border-black/20 flex items-center justify-center p-0.5 shadow-inner">
            <div className="text-[#641010] drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.1)] shadow-inner transform -translate-y-[1px]">
              <SafeIcon name="GiCandleHolder" size={62} />
            </div>
          </div>
        </div>

        <div className="w-full bg-[#ebdcb9] border-4 border-double border-black p-5 relative shadow-[0_12px_30px_rgba(0,0,0,0.9)] flex flex-col md:flex-row justify-between items-center gap-4 text-black pl-32 pr-6 rounded-sm overflow-hidden">
          <div className="absolute top-2 left-6 text-4xl font-mono font-black text-[#1a1311] opacity-5 tracking-tighter transform -rotate-2 select-none pointer-events-none">
            REGISTRY FILE // NO. 00843-CO
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div>
              <span className="block font-sans text-[10px] font-black tracking-widest uppercase text-gray-600 leading-none">Candela Obscura Member ID</span>
              <span className="block font-mono text-sm font-bold tracking-tight text-black mt-1.5">
                {character?.id ? `ASSIGNED RECORD MATRIX: SEC #${character.id}` : "RANDOM ASSIGNMENT INDEX"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 font-sans text-[11px] font-black uppercase tracking-wider relative z-10">
            {['character', 'circle', 'archives'].map((tabName) => {
              const labels = { character: "Investigator Dossier", circle: "Circle Progress Report", archives: "Archive" };
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`px-4 py-1.5 rounded transition-all duration-150 ${
                    activeTab === tabName ? 'bg-black text-[#ebdcb9] shadow-md border border-black' : 'bg-transparent text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  {labels[tabName]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DYNAMIC VIEW ROUTING */}
      <main className="max-w-[1500px] mx-auto p-4 mt-2">
        {activeTab === 'archives' ? (
          <ArchivesView />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <TactileSidebar />
            <div className="lg:col-span-6">
              <div className="bg-[#fbf6eb] text-black px-8 pt-8 pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] min-h-[850px] border-2 border-black relative font-serif overflow-hidden">
                <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
                <BrassCornerFiligree />
                {activeTab === 'character' && <InvestigatorDossier />}
                {activeTab === 'circle' && <CircleView />}
              </div>
            </div>
            <DiceVault />
          </div>
        )}
        <ScarModal />
      </main>
    </div>
  );
};