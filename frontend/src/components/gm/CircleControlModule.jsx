import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

export const CircleControlModule = () => {
  // Global Store Bindings
  const { circle } = useGameStore();

  // Local Component State - Circle Progress & Logistics
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

  // Compute active rubber stamp icon based on majority pool tally or GM dictate
  let activeInsignia = "GiEyeShield"; // Baseline Admin placeholder
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
    <div className="relative z-10 space-y-6 text-slate-200 h-full flex flex-col">
      
      {/* Top Nomenclature Layout Panel */}
      <div className="border-b border-slate-700 pb-5 flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="flex-1 w-full">
          <div className="flex flex-col space-y-3 font-mono">
            <div>
              <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-slate-500 leading-none">[ CIRCLE DESIGNATION ]</span>
              <div className="text-xl font-serif font-bold text-slate-100 uppercase mt-1.5 truncate">{circle?.name || "The Order of Light"}</div>
            </div>
            <div>
              <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-slate-500 leading-none">[ REGIONAL HOUSE COORDS ]</span>
              <div className="text-xs font-mono font-bold text-[#60a5fa] mt-1.5 uppercase tracking-widest bg-[#0f172a] px-2 py-1 border border-slate-700 rounded-sm inline-block shadow-inner">
                Redfield Library Vaults
              </div>
            </div>
          </div>
        </div>

        {/* System Insignia Control Panel */}
        <div className="w-full lg:w-[280px] shrink-0 bg-[#1e293b] border border-slate-600 p-3 shadow-lg relative rounded-sm">
          <span className="block font-sans text-[8px] font-black uppercase tracking-widest text-[#60a5fa] mb-2 border-b border-slate-700 pb-1">
            [ INSIGNIA OVERRIDE PROTOCOL ]
          </span>
          
          <div className="flex items-center gap-4 bg-[#0f172a] border border-slate-700 p-2 rounded-sm shadow-inner">
            <div className="w-14 h-14 rounded-full border border-slate-600 flex items-center justify-center bg-[#1e293b] relative shrink-0 shadow-inner">
              <SafeIcon name={activeInsignia} size={28} className="text-[#94a3b8] drop-shadow-[0_0_5px_rgba(148,163,184,0.4)]" />
            </div>

            <div className="flex-1 font-mono text-[9px] space-y-1.5">
              <select 
                className="w-full bg-[#1e293b] border border-slate-600 rounded px-1 py-1 focus:outline-none focus:border-[#3b82f6] text-xs text-slate-300 transition-colors cursor-pointer"
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
              
              <div className="pt-1 flex items-center gap-2 border-t border-slate-700 mt-1">
                <input 
                  type="checkbox" 
                  id="gmOverride" 
                  className="w-3 h-3 accent-[#3b82f6] bg-[#1e293b] border-slate-600 rounded-sm cursor-pointer"
                  onChange={(e) => setGmVote(e.target.checked ? "GiOuroboros" : null)} 
                />
                <label htmlFor="gmOverride" className="text-[#3b82f6] font-bold text-[8px] cursor-pointer uppercase tracking-tight">Force GM Dictate</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Document Row Content Elements */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
        
        {/* LEFT COL: Illumination */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-1 mb-3 flex items-center gap-1.5">
              <SafeIcon name="GiEyeShield" size={12} className="text-[#3b82f6]" /> Illumination Track
            </h3>
            <div className="flex gap-2.5 flex-wrap mb-4">
              {Array.from({ length: 12 }).map((_, i) => {
                const isFilled = i < illuminationPips;
                const isMilestone = (i + 1) % 3 === 0;
                return (
                  <div 
                    key={i} 
                    onClick={() => setIlluminationPips(i + 1)}
                    className={`w-5 h-5 rounded-sm border flex items-center justify-center cursor-pointer transition-all ${
                      isFilled 
                        ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                        : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'
                    } ${isMilestone ? 'ring-1 ring-offset-2 ring-offset-[#020617] ring-slate-600' : ''}`}
                  >
                    {isFilled && <div className="w-2 h-2 bg-[#60a5fa] rounded-sm shadow-[0_0_5px_#60a5fa]" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Ballots Slip Tracker - Admin Panel Style */}
          <div className="bg-[#1e293b] border border-slate-700 p-5 shadow-lg rounded-sm relative">
            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-[#60a5fa] mb-4 flex items-center gap-1.5 border-b border-slate-600 pb-2">
              <SafeIcon name="GiShield" size={12} /> Post-Assignment Debrief
            </h3>
            <div className="space-y-4">
              {[
                "Did you contain or destroy a source of bleed?",
                "Did you provide comfort or support for those affected by a phenomena?",
                "Did you bring something of importance back for Candela Obscura to protect or study?"
              ].map((question, qIdx) => (
                <div key={qIdx} className="border-b border-slate-700/50 pb-3.5 last:border-0 last:pb-0">
                  <p className="font-serif text-sm leading-tight text-slate-300 mb-2.5">"{question}"</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] text-slate-500 uppercase tracking-tighter">PC Votes:</span>
                    <div className="flex gap-2">
                      {questionBallots[qIdx].map((voted, pIdx) => (
                        <button 
                          key={pIdx} 
                          onClick={() => {
                            const updated = [...questionBallots];
                            updated[qIdx][pIdx] = !updated[qIdx][pIdx];
                            setQuestionBallots(updated);
                          }}
                          className={`w-6 h-6 border flex items-center justify-center font-mono text-[10px] font-bold transition-all relative rounded ${
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

        {/* RIGHT COL: Logistics */}
        <div className="md:col-span-5 space-y-4">
          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-1 mb-3 flex items-center gap-1.5">
            <SafeIcon name="GiBriefcase" size={12} className="text-[#3b82f6]" /> Logistics Base
          </h3>
          <div className="space-y-3 bg-[#0f172a] border border-slate-800 p-3 rounded-sm shadow-inner">
            {['Stitch', 'Refresh', 'Train'].map((res) => {
              const current = circleResourceAvail[res] || 0;
              return (
                <div key={res} className="bg-[#1e293b] border border-slate-700 p-2.5 rounded-sm flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-center border-b border-slate-600 pb-1.5 mb-2">
                    <span className="font-serif font-bold text-xs uppercase tracking-wide text-slate-200">{res}</span>
                  </div>
                  <div className="space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase font-bold tracking-tight">Available</span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div 
                            key={i} 
                            onClick={() => setCircleResourceAvail(prev => ({ ...prev, [res]: i + 1 }))}
                            className={`w-3 h-3 rounded-sm border cursor-pointer transition-all ${
                              i < current 
                                ? 'bg-[#3b82f6] border-[#60a5fa] shadow-[0_0_5px_rgba(59,130,246,0.8)]' 
                                : 'bg-[#0f172a] border-slate-600 hover:border-slate-400'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};