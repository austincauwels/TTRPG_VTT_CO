import React from 'react';
import useGameStore from '../../store/gameStore';
import { PocketWatchClock } from '../shared/PocketWatchClock';
import { SafeIcon } from '../shared/SafeIcon';

export const TactileSidebar = () => {
  const { character, circle } = useGameStore();

  return (
    <div className="lg:col-span-3 space-y-6 mt-2 relative">
      
      {/* Weathered Library Index Checkout Card */}
      <div className="bg-[#fcfaf2] text-[#1a1311] border border-[#d2c9b9] p-5 shadow-[5px_8px_20px_rgba(0,0,0,0.65)] relative transform -rotate-1 hover:rotate-0 transition-transform duration-200"
           style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(43, 108, 176, 0.12) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
        <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-red-700/20 pointer-events-none" />
        <div className="pl-6 pt-1 relative z-10 text-xs">
          <span className="block font-mono text-[9px] uppercase tracking-widest text-[#1a1311]/50 font-black leading-none mb-1.5">Circle Maintenance Card</span>
          <div className="space-y-1.5 font-bold font-serif">
            <p className="text-sm font-black border-b border-black/10 pb-0.5 leading-tight"><span className="font-sans text-[10px] uppercase font-black text-black/40 mr-1">TARGET:</span> The Red Tide</p>
            <p className="text-xs leading-tight"><span className="font-sans text-[10px] uppercase font-black text-black/40 mr-1">SANCTUM:</span> Redfield Library</p>
          </div>
          <div className="mt-4 border-t border-black/20 border-dashed pt-2.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-black/60 font-black block mb-1">Illumination Track Pips</span>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full border border-black shadow-inner transition-colors ${i < 3 ? 'bg-black' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Circle Registry */}
      <div className="space-y-2.5 px-1">
        <span className="block font-sans text-[9px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Active Circle Registry</span>
        <div className="bg-[#f2ebd9] border border-black/10 px-3 py-2.5 shadow-md transform rotate-1 relative select-none">
          <div className="absolute top-0.5 right-1 text-black/20 pointer-events-none"><SafeIcon name="GiPaperClip" size={12} /></div>
          <p className="font-mono font-black text-xs text-black truncate">{character?.name || 'Unknown Investigator'}</p>
          <p className="font-mono text-[9px] text-[#721c15] uppercase tracking-tighter mt-0.5">{character?.style || 'Agent Identity'}</p>
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm" />
        </div>
        <div className="bg-[#ece5d0] border border-black/10 px-3 py-2.5 shadow-md transform -rotate-1 relative select-none opacity-85">
          <div className="absolute top-0.5 right-1 text-black/20 pointer-events-none"><SafeIcon name="GiPaperClip" size={12} /></div>
          <p className="font-mono font-bold text-xs text-black/80 truncate">Arthur Vance</p>
          <p className="font-mono text-[9px] text-black/50 uppercase tracking-tighter mt-0.5">Scholar - Doctor</p>
        </div>
      </div>

      {/* Exposure Timers (Synced with GM) */}
      <div className="pt-4 pb-2 px-1 flex flex-row gap-4 justify-center items-center relative z-20">
        <PocketWatchClock title="Guard Patrol" current={circle?.guard_patrol ?? 3} max={4} colorHex="#d97706" className="transform rotate-6 translate-y-1" />
        <PocketWatchClock title="Miasma Bleed" current={circle?.miasma_bleed ?? 1} max={6} colorHex="#b91c1c" className="transform -rotate-12 -translate-y-2" />
      </div>
    </div>
  );
};