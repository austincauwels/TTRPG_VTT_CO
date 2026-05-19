import React from 'react';
import useGameStore from '../store/gameStore';

// Double-Sized Pocket Watch Tension Tracker Component
const PocketWatchClock = ({ title, current, max, colorHex, className = "" }) => {
  const fillPercentage = (current / max) * 100;
  const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

  return (
    <div className={`flex flex-col items-center select-none transition-transform duration-300 hover:scale-105 ${className}`} title={`${title}: ${current}/${max}`}>
      {/* Pocket Watch Ring Attachment */}
      <div className="flex flex-col items-center -mb-2 z-10">
        <div className="w-6 h-6 rounded-full border-4 border-[#cc9a29] shadow-md" />
        <div className="w-8 h-3 bg-[#cc9a29] border border-black/30 rounded-t-sm -mt-1" />
      </div>
      
      {/* Double-Sized Metallic Gold Casing */}
      <div className="w-28 h-28 rounded-full border-[6px] border-[#cc9a29] bg-[#fcf8ef] relative flex items-center justify-center p-1 shadow-[0_12px_24px_rgba(0,0,0,0.75)]">
        <div className="absolute top-1 left-1 w-12 h-12 bg-white/20 rounded-full blur-[1px] z-10" />
        
        {/* Inside Dial Face */}
        <div 
          className="w-full h-full rounded-full border border-black/20 overflow-hidden relative shadow-inner bg-[#f6ecd2]" 
          style={{ background: conicBg }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1a1311] rounded-full z-20 shadow" />
        </div>
      </div>
      
      <span className="mt-2.5 block font-mono text-[10px] font-black text-white/50 tracking-widest uppercase text-center">{title}</span>
    </div>
  );
};

export const TactileSidebar = () => {
  const { character } = useGameStore();

  return (
    <div className="lg:col-span-3 space-y-6 mt-2">
      {/* Weathered Library Index Checkout Card */}
      <div className="bg-[#fcfaf2] text-[#1a1311] border border-[#d2c9b9] p-5 shadow-[5px_8px_20px_rgba(0,0,0,0.65)] relative transform -rotate-1 hover:rotate-0 transition-transform duration-200" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(43, 108, 176, 0.12) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
        <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-red-700/20 pointer-events-none" />
        <div className="pl-6 pt-1 relative z-10 text-xs">
          <span className="block font-mono text-[9px] uppercase tracking-widest text-[#1a1311]/50 font-black leading-none mb-1.5">Circle Maintenance Card</span>
          <div className="space-y-1.5 font-bold font-serif">
            <p className="text-sm font-black border-b border-black/10 pb-1">{character?.name || 'Unknown Investigator'}</p>
            <p className="text-xs border-b border-black/10 pb-1">{character?.role_ability || 'Unassigned Role'}</p>
            <p className="text-xs border-b border-black/10 pb-1">{character?.specialty_ability || 'Unassigned Specialty'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 items-center pt-4">
          <PocketWatchClock 
            title="Brain Marks" 
            current={character?.marks_brain || 0} 
            max={3} 
            colorHex="#4a6b8c" 
          />
          <PocketWatchClock 
            title="Body Marks" 
            current={character?.marks_body || 0} 
            max={3} 
            colorHex="#8c4a4a" 
          />
          <PocketWatchClock 
            title="Bleed Marks" 
            current={character?.marks_bleed || 0} 
            max={3} 
            colorHex="#684a8c" 
          />
      </div>
    </div>
  );
};