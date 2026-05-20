import React from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

export const CircleLedger = () => {
  const { circle, socket, accessSession } = useGameStore();

  const updateCircle = (field, delta) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const current = circle?.[field] || 0;
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: 1, [field]: Math.max(0, current + delta) }
      }));
    }
  };

  const ResourceCounter = ({ id, label }) => (
    <div className="flex flex-col items-center">
      <span className="font-sans text-[9px] font-black uppercase tracking-widest text-black/60 mb-2">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => updateCircle(id, -1)} className="w-6 h-6 flex items-center justify-center border border-black/40 hover:bg-black hover:text-[#ebdcb9] font-black transition-colors rounded-sm text-xs">-</button>
        <span className="font-serif text-2xl font-black w-6 text-center">{circle?.[id] || 0}</span>
        <button onClick={() => updateCircle(id, 1)} className="w-6 h-6 flex items-center justify-center border border-black/40 hover:bg-black hover:text-[#ebdcb9] font-black transition-colors rounded-sm text-xs">+</button>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#ebdcb9] border-4 border-double border-black p-6 relative shadow-[5px_12px_20px_rgba(0,0,0,0.85)] text-[#1a1311] rounded-sm transform rotate-1">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-black/20"><SafeIcon name="GiPaperClip" size={24} /></div>
      
      <div className="text-center border-b border-black/20 pb-3 mb-4">
        <h3 className="font-serif font-black text-lg tracking-widest uppercase">Circle Reserves</h3>
        <span className="block font-mono text-[8px] uppercase tracking-widest text-red-800 mt-1">Authorized Lightkeeper Adjustments</span>
      </div>

      <div className="flex justify-between items-center px-4">
        <ResourceCounter id="stitch" label="Stitch" />
        <div className="w-[1px] h-12 bg-black/10" />
        <ResourceCounter id="refresh" label="Refresh" />
        <div className="w-[1px] h-12 bg-black/10" />
        <ResourceCounter id="train" label="Train" />
      </div>
    </div>
  );
};