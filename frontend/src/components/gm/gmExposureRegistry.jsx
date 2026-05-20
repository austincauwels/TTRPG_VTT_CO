import React from 'react';
import useGameStore from '../../store/gameStore';
import { PocketWatchClock } from '../shared/PocketWatchClock';
import { SafeIcon } from '../shared/SafeIcon';

export const ExposureRegistry = () => {
  const { circle, socket, accessSession } = useGameStore();

  const handleAdjust = (timerName, increment, maxVal) => {
    const current = circle?.[timerName] ?? 0;
    let newVal = Math.max(0, Math.min(maxVal, current + increment));
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      // We attach these exposure clocks to the Circle's shared state
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: 1, [timerName]: newVal }
      }));
    }
  };

  const GMWatch = ({ title, timerName, maxVal, colorHex }) => {
    const current = circle?.[timerName] ?? 0;
    
    return (
      <PocketWatchClock title={title} current={current} max={maxVal} colorHex={colorHex} className="group">
        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-30">
          <button onClick={() => handleAdjust(timerName, -1, maxVal)} className="w-8 h-8 rounded-full bg-[#1a1311] border-2 border-[#d4af37] text-[#d4af37] font-black flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors">-</button>
          <button onClick={() => handleAdjust(timerName, 1, maxVal)} className="w-8 h-8 rounded-full bg-[#1a1311] border-2 border-[#d4af37] text-[#d4af37] font-black flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors">+</button>
        </div>
      </PocketWatchClock>
    );
  };

  return (
    <div className="bg-[#12241b] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] border-[12px] border-[#2e1d15] rounded-sm relative before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
      <div className="border-b border-black/40 pb-2 mb-6 text-center relative z-10 flex items-center justify-center gap-3">
        <span className="font-sans text-[10px] font-black uppercase tracking-widest text-[#d4af37]/60">Active Exposure Timers</span>
        <SafeIcon name="GiStopwatch" size={16} className="text-[#d4af37]/60" />
      </div>
      
      <div className="flex flex-row justify-around items-center relative z-10 pt-2">
        <GMWatch title="Guard Patrol" timerName="guard_patrol" maxVal={4} colorHex="#d97706" />
        <GMWatch title="Miasma Bleed" timerName="miasma_bleed" maxVal={6} colorHex="#b91c1c" />
      </div>
    </div>
  );
};