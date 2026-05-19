import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { SheetDivider } from './Decorations';
import { SafeIcon } from './SafeIcon';

export const CircleView = () => {
  // Global Store Bindings
  const { circle } = useGameStore();

  // Local Component State - Circle Progress & Logistics
  const [stampVotes, setStampVotes] = useState({ 
    GiOuroboros: 0, 
    GiOrbital: 0, 
    GiCompass: 0, 
    GiOilySpiral: 0, 
    GiCabbage: 0, 
    GiFullMoon: 0, 
    GiGoldShell: 0, 
    GiGlowingHands: 0 
  });
  const [gmVote, setGmVote] = useState(null); // Lightkeeper absolute dictation override
  const [circleResourceAvail, setCircleResourceAvail] = useState({ Stitch: 2, Refresh: 1, Train: 1 });
  const [illuminationPips, setIlluminationPips] = useState(3);
  const [questionBallots, setQuestionBallots] = useState([
    [true, false, true, false],  // Question 1 member votes
    [false, true, false, false], // Question 2 member votes
    [true, true, false, false]   // Question 3 member votes
  ]);

  // Compute active rubber stamp icon based on majority pool tally or GM dictate
  let activeInsignia = "GiCandleLight"; // Baseline default placeholder
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
    <div className="relative z-10 animate-sheetDrop space-y-6 text-black">
      
      {/* Top Nomenclature Layout Panel */}
      <div className="border-b-2 border-black/80 pb-5 flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="flex-1 space-y-4 w-full">
          <div className="flex flex-col space-y-3 font-mono">
            <div>
              <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ CIRCLE DESIGNATION REGISTRY ]</span>
              <div className="text-xl font-serif font-black text-black uppercase mt-1.5 truncate border-b border-black/20 pb-0.5">{circle?.name || "The Order of Light"}</div>
            </div>
            <div>
              <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ REGIONAL HOUSE COORDS ]</span>
              <div className="text-xs font-mono font-bold text-[#721c15] mt-1.5 uppercase tracking-widest bg-black/[0.03] p-1.5 border border-black/5 rounded-sm inline-block">
                Redfield Library Vaults
              </div>
            </div>
          </div>
        </div>

        {/* Single Blank Ballot Insignia Rubber Stamp Component */}
        <div className="w-full lg:w-[310px] shrink-0 bg-[#f1e6cc] border-2 border-dashed border-black/40 p-3 shadow-inner relative transform rotate-1 rounded-sm">
          <span className="block font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] mb-2 border-b border-black/20 pb-1">
            [ SYSTEM INSIGNIA BALLOT ]
          </span>
          
          <div className="flex items-center gap-4 bg-white/40 border border-black/10 p-2 rounded-sm shadow-sm">
            <div className="w-16 h-16 rounded-full border-2 border-black/70 flex flex-col items-center justify-center bg-[#ebdcb9]/40 relative shrink-0 shadow-inner mix-blend-multiply transform -rotate-6">
              <div className="absolute inset-0 rounded-full border border-black/20 m-0.5 border-dashed" />
              <SafeIcon name={activeInsignia} size={32} className="text-black/85 drop-shadow-sm opacity-95" />
            </div>

            <div className="flex-1 font-mono text-[9px] space-y-1">
              <span className="text-black/40 uppercase block text-[8px] tracking-tighter">Cast Insignia Vote:</span>
              <select 
                className="w-full bg-[#ebdcb9]/20 border border-black/30 rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-0 text-xs text-black"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setStampVotes(prev => ({ ...prev, [val]: prev[val] + 1 }));
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select Vector...</option>
                <option value="GiOuroboros">Ouroboros ({stampVotes.GiOuroboros}v)</option>
                <option value="GiOrbital">Orbital Ring ({stampVotes.GiOrbital}v)</option>
                <option value="GiCompass">Compass ({stampVotes.GiCompass}v)</option>
                <option value="GiOilySpiral">Oily Spiral ({stampVotes.GiOilySpiral}v)</option>
                <option value="GiCabbage">Alchemical Cabbage ({stampVotes.GiCabbage}v)</option>
                <option value="GiFullMoon">Full Moon ({stampVotes.GiFullMoon}v)</option>
                <option value="GiGoldShell">Gilded Shell ({stampVotes.GiGoldShell}v)</option>
                <option value="GiGlowingHands">Radiant Hands ({stampVotes.GiGlowingHands}v)</option>
              </select>
              
              <div className="pt-1 flex items-center gap-1.5 border-t border-black/10 mt-1">
                <input 
                  type="checkbox" 
                  id="gmOverride" 
                  className="w-2.5 h-2.5 text-[#721c15] focus:ring-0 rounded-sm bg-transparent border-black/40 cursor-pointer"
                  onChange={(e) => setGmVote(e.target.checked ? "GiOuroboros" : null)} 
                />
                <label htmlFor="gmOverride" className="text-[#721c15] font-black text-[8px] cursor-pointer uppercase tracking-tight">GM Force Override (Ouroboros)</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Document Row Content Elements */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
        <div className="md:col-span-7 space-y-6">
          <div>
            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
              <SafeIcon name="GiCandleLight" size={14} className="text-[#d4af37]" /> Illumination Registry
            </h3>
            <div className="flex gap-2.5 flex-wrap mb-4 px-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const isFilled = i < illuminationPips;
                const isMilestone = (i + 1) % 3 === 0;
                return (
                  <div 
                    key={i} 
                    onClick={() => setIlluminationPips(i + 1)}
                    className={`w-5 h-5 rounded-full border border-black flex items-center justify-center shadow-inner cursor-pointer transition-all ${
                      isFilled ? 'bg-black text-white' : 'bg-transparent'
                    } ${isMilestone ? 'ring-2 ring-offset-2 ring-black/80' : ''}`}
                  >
                    {isMilestone && <div className={`w-1.5 h-1.5 bg-[#d4af37] rounded-full ${isFilled ? 'opacity-100' : 'opacity-40'}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Ballots Slip Tracker - Bureau Index Card Style */}
          <div className="bg-[#fefcf5] border border-[#d6cbbe] p-5 shadow-md rounded-sm relative transform -rotate-[0.5deg] border-t-4 border-t-[#721c15]/70">
            <div className="absolute top-1.5 right-2 font-mono text-[7px] text-black/30 uppercase tracking-wider">Form No. 84-Illum</div>
            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-[#721c15] mb-4 flex items-center gap-1.5 border-b border-black/10 pb-1">
              <SafeIcon name="GiQuillInk" size={12} /> Illumination Questions & Keys Ballot
            </h3>
            <div className="space-y-4">
              {[
                "Did you contain or destroy a source of bleed?",
                "Did you provide comfort or support for those affected by a phenomena?",
                "Did you bring something of importance back for Candela Obscura to protect or study?"
              ].map((question, qIdx) => (
                <div key={qIdx} className="border-b border-black/5 pb-3.5 last:border-0 last:pb-0">
                  <p className="font-serif text-sm leading-tight text-black/90 mb-2.5 italic">"{question}"</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] text-black/40 uppercase tracking-tighter">Member Ballots:</span>
                    <div className="flex gap-1.5">
                      {questionBallots[qIdx].map((voted, pIdx) => (
                        <button 
                          key={pIdx} 
                          onClick={() => {
                            const updated = [...questionBallots];
                            updated[qIdx][pIdx] = !updated[qIdx][pIdx];
                            setQuestionBallots(updated);
                          }}
                          className={`w-5 h-5 border border-black/60 flex items-center justify-center font-mono text-[10px] font-bold transition-all relative rounded-sm ${
                            voted ? 'bg-[#721c15] text-[#fefcf5] border-[#721c15] scale-105 shadow-sm' : 'bg-transparent text-black/30 hover:bg-black/5'
                          }`}
                        >
                          {voted ? '✕' : pIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Frame Window Area: Circle Logistical Assets */}
        <div className="md:col-span-5 space-y-4">
          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
            <SafeIcon name="GiScroll" size={14} className="text-[#721c15]" /> Circle Logistical Assets
          </h3>
          <div className="space-y-3 bg-black/[0.02] border border-black/10 p-3 rounded-sm shadow-inner">
            {['Stitch', 'Refresh', 'Train'].map((res) => {
              const current = circleResourceAvail[res] || 0;
              return (
                <div key={res} className="bg-white/40 border border-black/20 p-2.5 rounded-sm flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-center border-b border-black/10 pb-1.5 mb-2">
                    <span className="font-serif font-black text-xs uppercase tracking-wide text-black">{res}</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-black/50 uppercase font-bold tracking-tight">Available</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div 
                            key={i} 
                            onClick={() => setCircleResourceAvail(prev => ({ ...prev, [res]: i + 1 }))}
                            className={`w-2.5 h-2.5 rounded-sm border border-black cursor-pointer transition-all ${
                              i < current ? 'bg-[#721c15]' : 'bg-transparent hover:bg-[#721c15]/10'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-black/40 uppercase font-bold tracking-tight">Max Cap</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-sm border border-black bg-transparent border-dashed border-black/40 opacity-70" />
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

      <SheetDivider />

      <div className="bg-[#fcf9f2] border-2 border-dashed border-black/60 p-4 rounded-sm relative shadow-sm overflow-hidden">
        <div className="absolute top-1 right-2 font-mono text-[7px] text-black/30 tracking-tight">FORM_ADV_AUTH_001</div>
        <div className="flex justify-between items-center border-b border-black/40 pb-1 mb-2">
          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
            <SafeIcon name="GiBriefcase" size={12} /> Circle Abilities & Advancement Vault
          </h3>
        </div>
        <div className="mb-4">
          <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-1.5">Active Circle Asset Profile</span>
          <p className="font-serif text-sm leading-relaxed text-black/90">
            <span className="font-bold uppercase">Stamina Training:</span> Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.
          </p>
        </div>
        <div className="bg-[#721c15]/10 border border-[#721c15]/30 p-4 rounded-sm relative">
          <span className="font-mono text-[10px] font-black text-[#721c15] uppercase tracking-[0.2em] block mb-3 border-b border-[#721c15]/20 pb-1">ADVANCEMENT SELECTION AVAILABLE // POLL SYSTEM</span>
          <div className="space-y-2.5">
            {[
              "Nobody Left Behind: +1d to protect incapacitated members.",
              "In This Together: Earn 1 drive when helping on a result of 3 or less.",
              "One Last Run: Next assignment is your last. Take all 4 advancement options."
            ].map((opt, i) => (
              <div key={i} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="advancement_vote" className="w-3.5 h-3.5 text-[#721c15] focus:ring-[#721c15] border-black/40 bg-transparent cursor-pointer" />
                <span className="font-serif text-sm text-black/80 group-hover:text-black transition-colors">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};