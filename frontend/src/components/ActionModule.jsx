// src/components/ActionModule.jsx
import React from 'react';
import useGameStore from '../store/gameStore';
import * as Gi from "react-icons/gi";

const SafeIcon = ({ name, size = 16, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};

function evaluateGilded(val) {
  if (val === true || val === 1 || val === "true" || val === "1") return true;
  return false;
}

export default function ActionModule() {
  const { character, rollAction, updateDrive } = useGameStore();

  if (!character) {
    return (
      <div className="bg-[#f5ebd6] border-2 border-[#1a1311] p-8 text-center shadow-lg">
        <div className="animate-pulse flex flex-col items-center justify-center space-y-4">
          <SafeIcon name="GiHourglass" size={32} className="text-[#721c15] opacity-50" />
          <p className="font-serif italic opacity-60 text-[#1a1311]">Synchronizing Operative Dossier Matrix...</p>
        </div>
      </div>
    );
  }

  const handleSpendDrive = (pool) => {
    const currentDrive = character[`${pool}_current`] || 0;
    if (currentDrive > 0) {
      updateDrive(pool, currentDrive - 1);
    }
  };

  const categories = [
    {
      name: 'Nerve',
      driveKey: 'nerve',
      icon: 'GiBiceps',
      actions: [
        { key: 'move', label: 'Move', desc: 'Run, climb, leap, or navigate physical hazards.' },
        { key: 'strike', label: 'Strike', desc: 'Engage in close combat or unleash force.' },
        { key: 'control', label: 'Control', desc: 'Handle machinery, aim precisely, or assert force.' }
      ]
    },
    {
      name: 'Cunning',
      driveKey: 'cunning',
      icon: 'GiDominoMask',
      actions: [
        { key: 'hide', label: 'Hide', desc: 'Conceal your presence or mask evidence.' },
        { key: 'sneak', label: 'Sneak', desc: 'Move silently or act without notice.' },
        { key: 'sway', label: 'Sway', desc: 'Influence, charm, or manipulate interactions.' }
      ]
    },
    {
      name: 'Intuition',
      driveKey: 'intuition',
      icon: 'GiSemiClosedEye',
      actions: [
        { key: 'survey', label: 'Survey', desc: 'Analyze surroundings or search for clues.' },
        { key: 'read', label: 'Read', desc: 'Scrutinize expressions or interpret intent.' },
        { key: 'sense', label: 'Sense', desc: 'Detect phenomena or tap into insight.' }
      ]
    }
  ];

  return (
    <div className="space-y-6 font-serif text-[#1a1311]">
      
      {/* SECTION I: DOSSIER CORE METRICS SUB-HEADER */}
      <div className="border-b-2 border-[#1a1311] pb-2 mb-4 flex justify-between items-center">
        <h3 className="text-sm font-sans font-black uppercase tracking-widest text-[#721c15] flex items-center gap-1">
          <SafeIcon name="GiBookmarklet" size={14} /> I. Attributes & Field Actions Matrix
        </h3>
        <span className="text-[10px] font-sans font-bold opacity-60 uppercase">Click Pips to Execute Rolls</span>
      </div>

      {/* MATRIX TABLE BLOCK (Page 2 Blueprint Style) */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const currentDrive = character[`${cat.driveKey}_current`] || 0;
          const maxDrive = character[`${cat.driveKey}_max`] || 3;

          return (
            <div key={cat.name} className="border border-[#1a1311] bg-[#ebdcb9]/20 rounded-sm overflow-hidden shadow-sm">
              
              {/* Row Header - Drive Pool Indicator */}
              <div className="bg-[#ebdcb9]/60 border-b border-[#1a1311] px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <SafeIcon name={cat.icon} className="text-[#721c15]" size={16} />
                  <span className="text-base font-black uppercase tracking-wide">{cat.name} Domain</span>
                </div>
                
                {/* Clickable Drive Diamonds Counter Layout */}
                <div 
                  onClick={() => handleSpendDrive(cat.driveKey)}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                  title={`Click to consume 1 point of ${cat.name} Drive`}
                >
                  <span className="text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] group-hover:text-red-800 transition-colors">
                    Available Drive Points:
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: maxDrive }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3.5 h-3.5 border-2 border-[#1a1311] transform rotate-45 transition-all shadow-sm ${
                          i < currentDrive 
                            ? 'bg-[#1a1311] scale-110 shadow-[1px_1px_0px_#721c15]' 
                            : 'bg-white/80 hover:bg-[#721c15]/20'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Rows Grid inside domain */}
              <div className="divide-y divide-[#1a1311]/20">
                {cat.actions.map((act) => {
                  const actionValue = character[act.key] || 0;
                  const isGilded = evaluateGilded(character[`gilded_${act.key}`]);

                  return (
                    <div key={act.key} className="p-3 flex justify-between items-center hover:bg-[#ebdcb9]/40 transition-colors group">
                      <div className="min-w-0 pr-4">
                        <button 
                          onClick={() => rollAction(act.key, 0)}
                          className="text-sm font-black uppercase tracking-wider text-[#1a1311] hover:text-[#721c15] transition-colors flex items-center gap-2"
                        >
                          {isGilded && <SafeIcon name="GiDiamonds" className="text-[#d4af37]" size={14} />}
                          <span className="border-b border-transparent group-hover:border-[#721c15]">{act.label}</span>
                        </button>
                        <p className="text-xs italic opacity-60 leading-tight mt-0.5 font-serif hidden sm:block">{act.desc}</p>
                      </div>

                      {/* Action Point Circle Pips */}
                      <div className="flex gap-1.5 shrink-0 bg-black/5 p-1.5 rounded-full border border-[#1a1311]/10">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-3.5 h-3.5 rounded-full border-2 border-[#1a1311] transition-all ${
                              i < actionValue 
                                ? 'bg-[#721c15] scale-105 shadow-inner' 
                                : 'bg-white/40'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* SECTION II: ACQUIRED DOMAIN METRICS POWER SUB-HEADER (Page 2 Blueprint Style) */}
      <div className="border-b-2 border-[#1a1311] pb-1 pt-4 mb-4">
        <h3 className="text-sm font-sans font-black uppercase tracking-widest text-[#721c15] flex items-center gap-1">
          <SafeIcon name="GiScroll" size={14} /> II. Assigned Domain Core Abilities
        </h3>
      </div>

      {/* DETAILED DOMAIN TEXT LEDGER CARDS */}
      <div className="space-y-3 font-serif">
        <div className="bg-[#ebdcb9]/40 border border-[#1a1311] p-4 rounded-sm relative shadow-sm">
          <div className="absolute top-2 right-2 text-[#721c15]/20"><SafeIcon name="GiQuillInk" size={18} /></div>
          <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">
            Guild Archetype Role Power Matrix
          </span>
          <h4 className="font-bold text-base border-b border-[#1a1311]/10 pb-0.5 text-[#1a1311]">
            {character.role_ability || "Standard Domain Ability"}
          </h4>
          <p className="text-xs italic text-black/70 mt-2 leading-relaxed">
            {character.role_ability === "I Know a Guy" 
              ? "Once per assignment, you can produce a contact who possesses specialized knowledge or resources relevant to the anomaly."
              : character.role_ability === "Sweet Talk"
              ? "When you Sway someone by flattering them or offering them something they want, add +1d to your total outcome matrix."
              : "This specialized character asset grants unique mechanical adjustments to outcomes or mark distributions during active field missions."
            }
          </p>
        </div>

        <div className="bg-[#ebdcb9]/40 border border-[#1a1311] p-4 rounded-sm relative shadow-sm">
          <div className="absolute top-2 right-2 text-[#721c15]/20"><SafeIcon name="GiMedal" size={18} /></div>
          <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">
            Focus Specialty Master Ability Matrix
          </span>
          <h4 className="font-bold text-base border-b border-[#1a1311]/10 pb-0.5 text-[#1a1311]">
            {character.specialty_ability || "Focus Archetype Power"}
          </h4>
          <p className="text-xs italic text-black/70 mt-2 leading-relaxed">
            {character.specialty_ability === "Insider Access"
              ? "You can easily pass through restricted parameters or administrative sectors using your credentialed background files."
              : character.specialty_ability === "Patch Up"
              ? "Once per scene, you can heal a physical Body mark directly on an affected ally without utilizing a resource Stitch."
              : "This master ability reflects advanced vocational experience, providing an operative advantage when executing field actions."
            }
          </p>
        </div>
      </div>

    </div>
  );
}