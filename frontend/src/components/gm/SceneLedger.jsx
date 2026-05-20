import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';

export const SceneLedger = () => {
  const { socket, accessSession } = useGameStore();
  const [sceneName, setSceneName] = useState('');
  const [sceneDesc, setSceneDesc] = useState('');

  const pushScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_transition_scene',
        payload: { role: accessSession?.role, scene_name: sceneName, description: sceneDesc }
      }));
      setSceneName('');
      setSceneDesc('');
    }
  };

  return (
    <div className="bg-[#fbf6eb] text-black p-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.95)] border-2 border-black relative font-serif overflow-hidden min-h-[600px] flex flex-col">
      {/* Paper Texture & Ledger Lines */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
      <div className="absolute top-0 bottom-0 left-12 w-[2px] bg-red-800/40 pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-14 w-[1px] bg-red-800/20 pointer-events-none" />

      <div className="relative z-10 pl-10 flex-1 flex flex-col">
        <div className="border-b-2 border-black/80 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black font-serif uppercase tracking-widest text-[#1a1311]">Lightkeeper's Log</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-black/50 mt-1">Archive Transmission Draft</p>
          </div>
          <div className="text-right font-mono text-xs font-bold text-black/60 uppercase">
            File Ref: {accessSession?.campaignCode || 'CLASSIFIED'}
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <div className="relative group">
            <label className="absolute -top-3 left-2 bg-[#fbf6eb] px-1 font-sans text-[9px] font-black uppercase tracking-widest text-red-900">Location Designation</label>
            <input 
              type="text" 
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="e.g., The Antiquarian's Basement"
              className="w-full bg-transparent border border-black/40 p-4 font-serif text-xl outline-none focus:border-black transition-colors placeholder:text-black/20"
            />
          </div>

          <div className="relative group flex-1 flex flex-col">
            <label className="absolute -top-3 left-2 bg-[#fbf6eb] px-1 font-sans text-[9px] font-black uppercase tracking-widest text-red-900">Atmospheric Details & Clues</label>
            <textarea 
              value={sceneDesc}
              onChange={(e) => setSceneDesc(e.target.value)}
              placeholder="Record the sensory details of the environment here. This will be stamped into the Circle's collective archive..."
              className="w-full bg-transparent border border-black/40 p-4 font-serif text-lg leading-relaxed outline-none focus:border-black transition-colors resize-none placeholder:text-black/20 flex-1 min-h-[250px]"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(0, 0, 0, 0.1) 32px)', lineHeight: '32px' }}
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/20 flex justify-end">
          <button 
            onClick={pushScene}
            disabled={!sceneName}
            className="px-8 py-3 bg-[#1a1311] text-[#fbf6eb] font-sans uppercase text-[11px] font-black tracking-[0.2em] hover:bg-[#2a1e1b] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0_0_rgba(0,0,0,0)] border border-black"
          >
            Stamp & Transmit to Circle
          </button>
        </div>
      </div>
    </div>
  );
};