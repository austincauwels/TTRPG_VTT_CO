import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
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
  const [gmDiceCount, setGmDiceCount] = useState(1);
  const { rollAction, logout, accessSession, campaignRoster, fetchRoster, approveInvestigator } = useGameStore();

  // Fetch the campaign roster when the panel mounts
  useEffect(() => {
    if (accessSession?.campaignId) {
      fetchRoster(accessSession.campaignId);
    }
  }, [accessSession?.campaignId]);

  const handleGmRoll = () => {
    rollAction('GM Override', gmDiceCount);
  };

  const handleStamp = (characterId) => {
    approveInvestigator(characterId, accessSession?.campaignId);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 relative">
      
      {/* LOGOUT BUTTON */}
      <div className="absolute top-4 right-6 z-50">
        <button 
          onClick={logout}
          className="text-[10px] uppercase tracking-[0.2em] text-[#3b82f6] hover:text-white transition-colors border border-transparent hover:border-[#3b82f6]/50 px-2 py-1"
        >
          [ Abandon Archive ]
        </button>
      </div>
      
      {/* ORIGINAL HEADER */}
      <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
        <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
      </header>

      {/* ORIGINAL GM CONTROL BAR */}
      <div className="w-full bg-[#1e293b] border-b border-slate-700 py-3 shadow-md z-40 flex justify-center">
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
      </div>

      <main className="max-w-[1500px] mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && <SceneManager />}
          </div>

          {/* CENTER PANEL */}
          <div className="lg:col-span-6">
            {activeTab === 'roster' && (
              <div className="bg-[#241710] bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] p-8 rounded-sm shadow-2xl border border-slate-700 min-h-[850px] flex flex-col gap-8">

                {/* CORRESPONDENCE STACK — pending investigators awaiting approval */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-[1px] flex-1 bg-amber-900/40" />
                    <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-amber-600/70">
                      Correspondence — Pending Review
                    </h3>
                    <div className="h-[1px] flex-1 bg-amber-900/40" />
                  </div>
                  {campaignRoster.pending_investigators?.length === 0 ? (
                    <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest text-center py-6 italic">
                      No pending correspondence.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      <AnimatePresence>
                        {campaignRoster.pending_investigators.map(inv => (
                          <PlayerRosterCard
                            key={inv.id}
                            investigator={inv}
                            onStamp={() => handleStamp(inv.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* ACTIVE CIRCLE MEMBERS */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-[1px] flex-1 bg-blue-900/30" />
                    <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-blue-500/60">
                      Active Circle Members
                    </h3>
                    <div className="h-[1px] flex-1 bg-blue-900/30" />
                  </div>
                  {campaignRoster.active_investigators?.length === 0 ? (
                    <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest text-center py-6 italic">
                      No active investigators on record.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-6">
                      <AnimatePresence>
                        {campaignRoster.active_investigators.map(inv => (
                          <PlayerRosterCard key={inv.id} investigator={inv} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

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