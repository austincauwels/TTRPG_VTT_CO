import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { BrassCornerFiligree } from '../shared/Decorations';

export const CirclePage = () => {
  const { circle, socket, accessSession } = useGameStore();

  const [stampVotes, setStampVotes] = useState({ 
    GiOuroboros: 0, GiOrbital: 0, GiCompass: 0, GiOilySpiral: 0, 
    GiCabbage: 0, GiFullMoon: 0, GiGoldShell: 0, GiGlowingHands: 0 
  });
  const [gmVote, setGmVote] = useState(null); 
  const [circleResourceAvail, setCircleResourceAvail] = useState({ Stitch: 2, Refresh: 1, Train: 1 });
  const [illuminationPips, setIlluminationPips] = useState(3);
  const [questionBallots, setQuestionBallots] = useState([
    [true, false, true, false], 
    [false, true, false, false],
    [true, true, false, false]  
  ]);

  let activeInsignia = "GiEyeShield"; 
  if (gmVote) {
    activeInsignia = gmVote;
  } else {
    let maxVotes = 0;
    Object.entries(stampVotes).forEach(([icon, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        activeInsignia = icon;
      }
    });
  }

  return (
    <div className="bg-[#0f172a] text-slate-200 px-10 pt-10 pb-12 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.9)] min-h-[850px] border border-slate-700 relative font-serif overflow-hidden animate-sheetDrop">
      
      {/* Background Texture & Filigree */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
      <div className="opacity-40 grayscale sepia-[.2] hue-rotate-[190deg] brightness-150 pointer-events-none">
        <BrassCornerFiligree />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-10">
        
        {/* ROW 1: Header & Insignia */}
        <div className="border-b border-slate-700 pb-8 flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="flex-1 w-full">
            <h2 className="font-sans text-[12px] font-black uppercase tracking-[0.3em] text-[#3b82f6] mb-4 flex items-center gap-2">
              <SafeIcon name="GiBriefcase" size={16} /> Circle Assets & Advancement
            </h2>
            <div className="flex flex-col space-y-4 font-mono">
              <div>
                <span className="block font-sans text-[9px] font-black uppercase tracking-wider text-slate-500 leading-none">Circle Designation</span>
                <div className="text-3xl font-serif font-bold text-slate-100 uppercase mt-2">{circle?.name || "The Order of Light"}</div>
              </div>
              <div>
                <span className="block font-sans text-[9px] font-black uppercase tracking-wider text-slate-500 leading-none">Regional House Coords</span>
                <div className="text-sm font-mono font-bold text-[#60a5fa] mt-2 uppercase tracking-widest bg-[#1e293b] px-3 py-1.5 border border-slate-700 rounded-sm inline-block shadow-inner">
                  Redfield Library Vaults
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[320px] shrink-0 bg-[#1e293b] border border-slate-600 p-4 shadow-lg rounded-sm">
            <span className="block font-sans text-[9px] font-black uppercase tracking-widest text-[#60a5fa] mb-3 border-b border-slate-700 pb-2">
              Insignia Override Protocol
            </span>
            <div className="flex items-center gap-4 bg-[#0f172a] border border-slate-700 p-3 rounded-sm shadow-inner">
              <div className="w-16 h-16 rounded-full border border-slate-600 flex items-center justify-center bg-[#1e293b] shrink-0 shadow-inner">
                <SafeIcon name={activeInsignia} size={32} className="text-[#94a3b8] drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]" />
              </div>
              <div className="flex-1 font-mono text-[10px] space-y-2">
                <select 
                  className="w-full bg-[#1e293b] border border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:border-[#3b82f6] text-slate-300 cursor-pointer"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setStampVotes(prev => ({ ...prev, [val]: prev[val] + 1 }));
                  }}
                  defaultValue=""
                >
                  <option value="" disabled className="bg-[#0f172a]">Monitor Votes...</option>
                  <option value="GiOuroboros" className="bg-[#0f172a]">Ouroboros ({stampVotes.GiOuroboros})</option>
                  <option value="GiOrbital" className="bg-[#0f172a]">Orbital ({stampVotes.GiOrbital})</option>
                  <option value="GiCompass" className="bg-[#0f172a]">Compass ({stampVotes.GiCompass})</option>
                </select>
                <div className="pt-2 flex items-center gap-2 border-t border-slate-700 mt-2">
                  <input 
                    type="checkbox" 
                    id="gmOverride" 
                    className="w-3.5 h-3.5 accent-[#3b82f6] bg-[#1e293b] border-slate-600 rounded-sm cursor-pointer"
                    onChange={(e) => setGmVote(e.target.checked ? "GiOuroboros" : null)} 
                  />
                  <label htmlFor="gmOverride" className="text-[#3b82f6] font-bold text-[9px] cursor-pointer uppercase tracking-tight">Force GM Dictate</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Grid Layout for Illumination & Logistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Illumination & Debrief */}
          <div className="space-y-8">
            <div>
              <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-1.5 mb-4 flex items-center gap-1.5">
                <SafeIcon name="GiEyeShield" size={14} className="text-[#3b82f6]" /> Illumination Track
              </h3>
              <div className="flex gap-3 flex-wrap mb-4">
                {Array.from({ length: 12 }).map((_, i) => {
                  const isFilled = i < illuminationPips;
                  const isMilestone = (i + 1) % 3 === 0;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setIlluminationPips(i + 1)}
                      className={`w-6 h-6 rounded-sm border flex items-center justify-center cursor-pointer transition-all ${
                        isFilled 
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                          : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                      } ${isMilestone ? 'ring-1 ring-offset-2 ring-offset-[#0f172a] ring-slate-600' : ''}`}
                    >
                      {isFilled && <div className="w-2.5 h-2.5 bg-[#60a5fa] rounded-sm shadow-[0_0_5px_#60a5fa]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1e293b] border border-slate-700 p-6 shadow-lg rounded-sm relative">
              <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-[#60a5fa] mb-5 flex items-center gap-1.5 border-b border-slate-600 pb-2">
                <SafeIcon name="GiShield" size={14} /> Post-Assignment Debrief
              </h3>
              <div className="space-y-5">
                {[
                  "Did you contain or destroy a source of bleed?",
                  "Did you provide comfort or support for those affected by a phenomena?",
                  "Did you bring something of importance back for Candela Obscura to protect or study?"
                ].map((question, qIdx) => (
                  <div key={qIdx} className="border-b border-slate-700/50 pb-4 last:border-0 last:pb-0">
                    <p className="font-serif text-base leading-tight text-slate-300 mb-3">"{question}"</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">PC Votes:</span>
                      <div className="flex gap-2.5">
                        {questionBallots[qIdx].map((voted, pIdx) => (
                          <button 
                            key={pIdx} 
                            onClick={() => {
                              const updated = [...questionBallots];
                              updated[qIdx][pIdx] = !updated[qIdx][pIdx];
                              setQuestionBallots(updated);
                            }}
                            className={`w-7 h-7 border flex items-center justify-center font-mono text-[11px] font-bold transition-all relative rounded ${
                              voted 
                                ? 'bg-[#3b82f6] text-white border-[#60a5fa] shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                                : 'bg-[#0f172a] text-slate-600 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {voted ? '✓' : pIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logistics & Advancement */}
          <div className="space-y-8">
            <div>
              <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-1.5 mb-4 flex items-center gap-1.5">
                <SafeIcon name="GiBriefcase" size={14} className="text-[#3b82f6]" /> Logistics Base
              </h3>
              <div className="space-y-4 bg-[#1e293b] border border-slate-700 p-4 rounded-sm shadow-md">
                {['Stitch', 'Refresh', 'Train'].map((res) => {
                  const current = circleResourceAvail[res] || 0;
                  return (
                    <div key={res} className="bg-[#0f172a] border border-slate-800 p-3 rounded-sm flex flex-col justify-between shadow-inner">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2.5">
                        <span className="font-serif font-bold text-sm uppercase tracking-wide text-slate-200">{res}</span>
                      </div>
                      <div className="flex justify-between items-center font-mono text-[10px]">
                        <span className="text-slate-500 uppercase font-bold tracking-widest">Available</span>
                        <div className="flex gap-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div 
                              key={i} 
                              onClick={() => setCircleResourceAvail(prev => ({ ...prev, [res]: i + 1 }))}
                              className={`w-3.5 h-3.5 rounded-sm border cursor-pointer transition-all ${
                                i < current 
                                  ? 'bg-[#3b82f6] border-[#60a5fa] shadow-[0_0_5px_rgba(59,130,246,0.8)]' 
                                  : 'bg-[#1e293b] border-slate-600 hover:border-slate-400'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Restored Advancement Vault */}
            <div className="bg-[#1e293b] border border-slate-700 p-6 rounded-sm shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-3xl" />
               <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-[#60a5fa] mb-3 flex items-center gap-1.5 border-b border-slate-600 pb-2">
                 <SafeIcon name="GiKeyLock" size={14} /> Abilities & Advancement Vault
               </h3>
               <div className="mb-5">
                 <span className="font-mono text-[9px] font-black uppercase tracking-widest text-slate-400 block leading-none mb-2">Active Asset Profile</span>
                 <p className="font-serif text-sm leading-relaxed text-slate-300">
                   <span className="font-bold uppercase text-slate-200">Stamina Training:</span> Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.
                 </p>
               </div>
               <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-sm shadow-inner">
                 <span className="font-mono text-[9px] font-black text-[#3b82f6] uppercase tracking-[0.2em] block mb-3 border-b border-slate-700 pb-1.5">ADVANCEMENT UNLOCK POLL</span>
                 <div className="space-y-3">
                   {[
                     "Nobody Left Behind: +1d to protect incapacitated members.",
                     "In This Together: Earn 1 drive when helping on a result of 3 or less.",
                     "One Last Run: Next assignment is your last. Take all 4 advancement options."
                   ].map((opt, i) => (
                     <div key={i} className="flex items-start gap-3 cursor-pointer group">
                       <input type="radio" name="advancement_vote" className="mt-1 w-3.5 h-3.5 accent-[#3b82f6] bg-[#1e293b] border-slate-600 cursor-pointer" />
                       <span className="font-serif text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-snug">{opt}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};