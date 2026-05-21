import React from 'react';
import useGameStore from '../store/gameStore';
import { SafeIcon } from './shared/SafeIcon';

export const CampaignSelector = () => {
  const { setStage, accessSession, connect } = useGameStore();

  // Navigation Handlers
  const handleNewInvestigator = () => {
    setStage('CHARACTER_CREATION');
  };

  const handleResumeCampaign = (campaignId) => {
    // In a full implementation, you would fetch the user's specific character here
    // For now, we connect to the socket and move to the desk
    connect(campaignId); 
    setStage('DESK');
  };

  const handleLightkeeperAccess = (campaignId) => {
    connect(campaignId);
    setStage('GM_DASH');
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center font-serif p-6 relative overflow-hidden">
      {/* Background Texture overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      <header className="mb-12 text-center z-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest text-[#fdfaf4] uppercase drop-shadow-md">
          Chapter Hub
        </h1>
        <p className="text-[#a82222] tracking-[0.3em] text-sm mt-2 uppercase font-sans font-bold">
          Select Your Assignment
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        
        {/* ACTION: New Investigator */}
        <button 
          onClick={handleNewInvestigator}
          className="group relative flex flex-col items-center justify-center p-8 bg-mahogany/90 border border-[#a82222]/50 hover:border-parchment transition-all duration-300 shadow-xl rounded-sm text-parchment hover:-translate-y-1"
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none" />
          <SafeIcon name="GiFountainPen" size={48} className="mb-4 text-[#a82222] group-hover:text-parchment transition-colors" />
          <h2 className="text-2xl font-bold tracking-wider mb-2">Draft Dossier</h2>
          <p className="text-sm text-parchment/70 text-center font-sans">
            Register a new investigator into the chapter's archives.
          </p>
        </button>

        {/* ACTION: Resume Active Campaign (Placeholder for a mapped list later) */}
        <div className="flex flex-col items-center p-8 bg-[#e8dec5] border-2 border-oxblood shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-sm text-zinc-900 relative">
          <div className="absolute -top-3 px-4 bg-oxblood text-parchment text-xs tracking-widest uppercase font-sans py-1">
            Active Assignment
          </div>
          <SafeIcon name="GiFiles" size={48} className="mb-4 text-zinc-800" />
          <h2 className="text-2xl font-bold tracking-wider mb-2 border-b border-zinc-400 w-full text-center pb-2">
            The Fairelands
          </h2>
          <p className="text-sm text-zinc-600 text-center font-sans mb-6">
            Resume your ongoing investigation.
          </p>
          <button 
            onClick={() => handleResumeCampaign('fairelands-01')}
            className="w-full py-2 bg-zinc-900 text-parchment hover:bg-oxblood transition-colors tracking-widest uppercase text-sm"
          >
            Open File
          </button>
        </div>

        {/* ACTION: Lightkeeper (GM) Access */}
        <button 
          onClick={() => handleLightkeeperAccess('fairelands-01')}
          className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-700 hover:border-[#a82222] transition-all duration-300 shadow-xl rounded-sm text-zinc-300 hover:-translate-y-1"
        >
          <SafeIcon name="GiLanternFlame" size={48} className="mb-4 text-zinc-600 group-hover:text-[#a82222] transition-colors" />
          <h2 className="text-2xl font-bold tracking-wider mb-2">Lightkeeper</h2>
          <p className="text-sm text-zinc-500 text-center font-sans">
            Access the operational staging area to guide the circle.
          </p>
        </button>

      </div>
    </div>
  );
};