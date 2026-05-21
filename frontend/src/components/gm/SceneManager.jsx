import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

export const SceneManager = () => {
  const { circle, socket, accessSession } = useGameStore();
  
  // Local state for the Scene
  const [location, setLocation] = useState(circle?.location || "The Halcyon Docks");
  const [atmosphere, setAtmosphere] = useState(circle?.atmosphere || "Fog rolling in, heavy scent of ozone and brine...");

  // Broadcast Scene Data to Players
  const broadcastScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { 
          role: accessSession?.role, 
          circle_id: 1, 
          location: location, 
          atmosphere: atmosphere 
        }
      }));
    }
  };

  // Adjust Threat Watches
  const handleAdjustWatch = (timerName, increment, maxVal) => {
    const current = circle?.[timerName] ?? 0;
    let newVal = Math.max(0, Math.min(maxVal, current + increment));
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: 1, [timerName]: newVal }
      }));
    }
  };

  // The Realistic Silver Watch Component (Unchanged, sits on the paper)
  const RealisticWatch = ({ title, timerName, maxVal, colorHex, rotationClass }) => {
    const current = circle?.[timerName] ?? 0;
    const rotationDegrees = (current / maxVal) * 360;
    const fillPercentage = (current / maxVal) * 100;
    const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

    return (
      <div className={`relative flex flex-col items-center select-none transition-transform duration-300 group ${rotationClass}`}>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          <div className="w-5 h-5 rounded-full border-[3px] border-slate-300 bg-transparent shadow-inner" />
          <div className="w-3 h-2.5 bg-gradient-to-b from-slate-200 to-slate-500 border border-slate-600 rounded-sm -mt-1 shadow" />
        </div>
        
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 relative flex items-center justify-center shadow-[0_10px_15px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.9)] border border-slate-500 z-20">
          <div className="absolute top-1 left-2 w-10 h-8 bg-white/40 rounded-full blur-[1px] z-30 pointer-events-none transform rotate-[-25deg]" />
          <div className="absolute bottom-1 right-1 w-12 h-12 bg-gradient-to-tl from-black/30 to-transparent rounded-full z-30 pointer-events-none blur-[1px]" />
          
          <div className="w-[85%] h-[85%] rounded-full bg-[#f4ece0] border border-slate-500/80 overflow-hidden relative shadow-[inset_0_3px_8px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 opacity-50 mix-blend-multiply transition-all duration-500" style={{ background: conicBg }} />
            <div 
              className="absolute bottom-1/2 left-1/2 w-[2px] h-[45%] bg-slate-900 origin-bottom -translate-x-1/2 rounded-t-full shadow-[1px_0_2px_rgba(0,0,0,0.5)] z-20 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-50%) rotate(${rotationDegrees}deg)` }}
            >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-slate-900 rounded-t-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}/>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gradient-to-br from-slate-200 to-slate-600 rounded-full z-30 shadow-md border border-slate-500" />
            <div className="absolute inset-0 rounded-full border-[2px] border-slate-400/50 border-dashed pointer-events-none" />
          </div>

          <div className="absolute inset-0 bg-[#0a1118]/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-40 backdrop-blur-[2px]">
            <button onClick={() => handleAdjustWatch(timerName, -1, maxVal)} className="w-7 h-7 rounded-full bg-slate-800 border border-slate-400 text-slate-200 font-black text-sm hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg active:scale-95 flex items-center justify-center pb-0.5">-</button>
            <button onClick={() => handleAdjustWatch(timerName, 1, maxVal)} className="w-7 h-7 rounded-full bg-slate-800 border border-slate-400 text-slate-200 font-black text-sm hover:bg-slate-300 hover:text-slate-900 transition-colors shadow-lg active:scale-95 flex items-center justify-center pb-0.5">+</button>
          </div>
        </div>
        
        <div className="mt-2 bg-[#f4ece0] px-2 py-0.5 border border-[#d2c9b9] shadow-[0_4px_6px_rgba(0,0,0,0.4)] relative z-20 transform rotate-1">
          <span className="block font-mono text-[9px] font-black text-[#3d312b] tracking-[0.1em] uppercase text-center">
            {title}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* The Physical Paper Stationery */}
      <div className="bg-[#f4ece0] text-[#2c2420] p-8 shadow-[5px_10px_25px_rgba(0,0,0,0.8)] border border-[#d2c9b9] relative z-10"
           style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0, 0, 0, 0.04) 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}>
        
        {/* Letterhead */}
        <div className="border-b-2 border-double border-[#7a6a5a] pb-4 mb-6 text-center relative">
          <SafeIcon name="GiEyeShield" size={32} className="mx-auto mb-2 opacity-80" />
          <h2 className="font-serif font-black uppercase tracking-[0.2em] text-lg">Candela Obscura</h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#7a6a5a] font-bold">Office of the Lightkeeper - Priority Dispatch</p>
          {/* Subtle Paperclip */}
          <div className="absolute -top-10 right-4 text-black/30 transform rotate-12">
             <SafeIcon name="GiPaperClip" size={24} />
          </div>
        </div>

        {/* Typed Body (The Mad Libs) */}
        <div className="font-mono text-xs sm:text-sm leading-[28px] text-justify text-[#3d312b]">
          To the active investigators of the Circle: proceed immediately to
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-transparent border-b border-dashed border-[#7a6a5a] focus:border-[#8b0000] outline-none px-2 mx-2 text-[#8b0000] font-bold font-serif italic text-center w-full sm:w-auto"
            placeholder="[ Insert Location ]"
            spellCheck="false"
          />. 
          Be advised, field observers report the current atmospheric conditions as follows:
          <textarea
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value)}
            className="bg-transparent border-b border-dashed border-[#7a6a5a] focus:border-[#8b0000] outline-none w-full mt-2 resize-none text-[#8b0000] font-bold font-serif italic leading-[28px]"
            rows="2"
            placeholder="[ Describe the environment... ]"
            spellCheck="false"
          />
          <br/>
          Secure the area. Contain the bleed. Do not fail.
        </div>

        {/* Ink Stamp Broadcast Button */}
        <div className="mt-8 flex justify-end relative">
          <button 
            onClick={broadcastScene}
            className="relative group transform -rotate-3 hover:rotate-0 transition-transform active:scale-95"
            title="Dispatch orders to player cards"
          >
            <div className="border-[3px] border-[#8b0000] rounded px-4 py-1.5 text-[#8b0000] font-sans font-black uppercase tracking-[0.3em] text-sm opacity-80 group-hover:opacity-100 group-hover:bg-[#8b0000]/5">
              Dispatch
            </div>
            {/* Fake rubber stamp texture overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 pointer-events-none mix-blend-overlay" />
          </button>
        </div>
      </div>

      {/* Watches Sitting on Top of the Paper */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[110%] flex justify-center gap-12 z-20 pointer-events-none">
        <div className="pointer-events-auto">
           <RealisticWatch title="Guard Patrol" timerName="guard_patrol" maxVal={4} colorHex="#d97706" rotationClass="-rotate-6" />
        </div>
        <div className="pointer-events-auto mt-4">
           <RealisticWatch title="Miasma Bleed" timerName="miasma_bleed" maxVal={6} colorHex="#8b0000" rotationClass="rotate-12" />
        </div>
      </div>
    </div>
  );
};