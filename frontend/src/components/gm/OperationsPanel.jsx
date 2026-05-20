import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { ArtDecoCorner } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';
import { ArchivesView } from '../shared/ArchivesView';
import { InvestigatorDossier } from '../pc/InvestigatorDossier';
import { TopDownCandle } from './GMDeskAccessories';
import { SilverExposureRegistry } from './SilverExposureRegistry';

export const OperationsPanel = () => {
  const { character, lastRoll, isRolling } = useGameStore();
  const [personalNotes, setPersonalNotes] = useState('');
  const [showModal, setShowModal] = useState(null);

  const partyMembers = character ? [character] : []; 
  const emptySlots = Math.max(0, 5 - partyMembers.length);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden text-slate-200 font-serif selection:bg-blue-900 selection:text-slate-100 pb-12">
      
      {/* Black Wood Desk */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-wood.png')] opacity-95 pointer-events-none" />
      
      <header className="w-full bg-[#050505] relative py-6 flex flex-col items-center justify-center border-b-2 border-black shadow-[0_15px_40px_rgba(0,0,0,1)] z-50">
        <ArtDecoCorner position="top-left" />
        <ArtDecoCorner position="top-right" />
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-[0.15em] text-slate-300 uppercase drop-shadow-md">CANDELA OBSCURA</h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-blue-600 uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
      </header>

      <main className="max-w-[1700px] mx-auto p-4 md:p-8 relative mt-10">
        
        {/* UPPER RIGHT CANDLE */}
        <div className="absolute -top-4 right-12 z-40">
          <TopDownCandle />
        </div>

        {/* LEFT MEMO PAD (Post-It Style) */}
        <div className="absolute top-24 left-10 w-64 h-72 bg-[#fef08a] shadow-[10px_15px_30px_rgba(0,0,0,0.8)] border border-yellow-300/50 transform -rotate-3 z-30 p-5 flex flex-col before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-40">
          {/* Pushpin */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-700 shadow-md border border-red-900 z-10 flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-red-400 rounded-full absolute top-0.5 right-0.5 opacity-60" />
          </div>
          <span className="font-serif italic text-yellow-800 border-b border-yellow-500/30 pb-1 mb-2">Private Memos</span>
          <textarea 
            className="flex-1 bg-transparent font-serif text-yellow-950 leading-relaxed outline-none resize-none text-sm placeholder:text-yellow-800/40 relative z-10"
            placeholder="Jot sudden thoughts here..."
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
          />
        </div>

        {/* THE SPIRAL-BOUND LEDGER */}
        <div className="max-w-[1300px] mx-auto h-[800px] bg-[#111318] shadow-[0_40px_80px_rgba(0,0,0,0.95)] rounded-lg flex relative z-20 border border-slate-800/50 ring-1 ring-black">
          
          {/* LEFT PAGE: Notebook Paper */}
          <div className="w-[calc(50%-1.5rem)] bg-[#f8fafc] relative shadow-[inset_15px_0_30px_rgba(0,0,0,0.08)] rounded-l-lg overflow-hidden before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-50">
            
            {/* Blue Ruled Lines */}
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #bae6fd 32px)', backgroundPositionY: '60px' }} />
            {/* Red Margin Line */}
            <div className="absolute top-0 bottom-0 left-16 w-[2px] bg-red-400/70" />
            
            <div className="relative z-10 pl-20 pr-8 pt-10 h-full flex flex-col">
              <h2 className="font-serif font-black text-3xl text-slate-800 tracking-widest uppercase mb-6 bg-[#f8fafc] inline-block pr-4">Activity Log</h2>
              
              <div className="flex-1 overflow-y-auto space-y-6 text-[15px] font-serif leading-[32px] text-slate-800 custom-scrollbar pb-6">
                  {lastRoll && !isRolling && (
                    <div className="font-bold text-blue-900 leading-tight">
                      <span className="font-sans text-[10px] uppercase tracking-widest mr-2 bg-blue-100 px-1 border border-blue-300 rounded-sm">[ROLL]</span>
                      {character?.name || 'Investigator'} checked the dice.
                    </div>
                  )}
                  <p><span className="font-sans font-bold text-[10px] text-slate-500 uppercase tracking-tight mr-2">22:01</span> The Circle forged entry logs.</p>
                  <p><span className="font-sans font-bold text-[10px] text-slate-500 uppercase tracking-tight mr-2">21:48</span> Arthur Vance absorbed structural shock.</p>
                  <p><span className="font-sans font-bold text-[10px] text-slate-500 uppercase tracking-tight mr-2">21:42</span> Lightkeeper uplink established.</p>
              </div>
            </div>
            
            {/* Bottom-Left Archive Fold */}
            <div 
              onClick={() => setShowModal('archives')}
              className="absolute bottom-0 left-0 w-36 h-36 bg-[#e2e8f0] shadow-[12px_-12px_20px_rgba(0,0,0,0.25)] rounded-tr-[100px] cursor-pointer flex items-end justify-start p-6 hover:bg-[#cbd5e1] transition-colors border-r border-t border-slate-300"
              title="Open Archives"
            >
              <span className="font-sans font-black text-[12px] uppercase tracking-[0.2em] text-slate-500 rotate-[-45deg] origin-bottom-left ml-2 mb-4">Archives</span>
            </div>
          </div>

          {/* CENTER: Realistic Spiral Binding */}
          <div className="w-12 h-full bg-[#0a0a0a] z-30 flex flex-col justify-evenly items-center shadow-[inset_0_0_15px_rgba(0,0,0,1)] border-x border-black relative">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30 pointer-events-none" />
             {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-[140%] h-3 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-700 rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.9)] border border-slate-900 transform -rotate-6 relative z-10" />
             ))}
          </div>

          {/* RIGHT PAGE: The Inside Leather Dash */}
          <div className="w-[calc(50%-1.5rem)] bg-[#1e242e] relative shadow-[inset_-15px_0_30px_rgba(0,0,0,0.6)] rounded-r-lg p-8 flex flex-col overflow-y-auto custom-scrollbar before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] before:opacity-50">
              
              {/* Campaign Setup Area */}
              <div className="relative z-10 mb-8 bg-slate-900/40 p-4 border border-slate-700/50 rounded-sm shadow-inner">
                <h3 className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-[0.25em] mb-3">Campaign Setup</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="Assignment Name..." className="bg-slate-950/80 border border-slate-700 text-slate-300 font-serif px-3 py-2 text-sm w-full outline-none focus:border-blue-500/50 transition-colors shadow-inner" />
                  <button className="bg-slate-800 border border-slate-600 text-slate-300 font-sans text-[10px] uppercase tracking-wider font-bold px-6 hover:bg-slate-700 transition-colors shadow-md">Update</button>
                </div>
              </div>

              {/* Candela Obscura Member Cards */}
              <div className="relative z-10 mb-8">
                <h3 className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Active Roster (Max 5)</h3>
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Filled Slots */}
                  {partyMembers.map((member, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setShowModal('character')} 
                      className="bg-[#fdfbf7] border border-slate-300 p-3 cursor-pointer hover:scale-[1.02] transition-transform relative shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center justify-between group before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-50 overflow-hidden rounded-sm"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-900" />
                      <div className="relative z-10 pl-3">
                        <span className="block font-sans text-[7px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Candela Obscura Member Registry</span>
                        <p className="font-serif font-black text-slate-900 text-xl leading-none">{member.name || 'Awaiting Subject'}</p>
                        <p className="font-mono text-[9px] text-red-800 uppercase tracking-widest mt-1.5">{member.role_ability || 'Unassigned Role'}</p>
                      </div>
                      <div className="w-10 h-10 border border-slate-300 rounded-full flex items-center justify-center bg-white shadow-sm relative z-10 group-hover:bg-slate-100 transition-colors">
                         <SafeIcon name="GiMagnifyingGlass" size={18} className="text-slate-400 group-hover:text-slate-700" />
                      </div>
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: emptySlots }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="bg-slate-800/20 border-2 border-dashed border-slate-700/50 p-4 flex items-center justify-center rounded-sm">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Vacant Assignment Slot</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exposure Timers */}
              <div className="relative z-10 border-t border-slate-700/50 pt-6 mt-auto">
                <h3 className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-[0.25em] text-center">Global Tension Timers</h3>
                <SilverExposureRegistry />
              </div>
          </div>
        </div>
      </main>

      {/* OVERLAYS */}
      {showModal && (
        <div className="fixed inset-0 bg-[#03060a]/90 z-[100] flex items-center justify-center p-8 backdrop-blur-sm" onClick={() => setShowModal(null)}>
            <div className="w-full max-w-5xl bg-[#fbf6eb] text-black rounded shadow-[0_30px_100px_rgba(0,0,0,1)] relative h-[90vh] overflow-y-auto border border-black" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowModal(null)} className="absolute top-4 right-6 font-sans font-black text-red-900 text-3xl z-50 hover:scale-110 transition-transform drop-shadow-md">X</button>
                {showModal === 'archives' ? <ArchivesView /> : <InvestigatorDossier />}
            </div>
        </div>
      )}
    </div>
  );
};