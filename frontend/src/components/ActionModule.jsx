// src/components/ActionModule.jsx
import React from 'react';
import useGameStore from '../store/gameStore';
import * as Gi from "react-icons/gi";

// Safe rendering wrapper for icons to prevent crashes if an icon string is missing
const SafeIcon = ({ name, size = 18, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};

// Strict Boolean evaluator to handle SQLite's various truthy/falsy representations
function evaluateGilded(val) {
  if (val === true || val === 1 || val === "true" || val === "1") return true;
  return false;
}

export default function ActionModule() {
  // Extract real-time state and socket transmitters from your Zustand store
  const { character, rollAction, updateDrive } = useGameStore();

  // Guard clause: If character data hasn't fully loaded over the socket pipe yet, 
  // render a thematic safe placeholder instead of throwing a layout crash.
  if (!character) {
    return (
      <div className="bg-[#f5ebd6] border-2 border-[#1a1311] p-8 text-center shadow-lg">
        <div className="animate-pulse flex flex-col items-center justify-center space-y-4">
          <SafeIcon name="GiHourglass" size={32} className="text-[#721c15] opacity-50" />
          <p className="font-serif italic opacity-60 text-[#1a1311]">Synchronizing Archive Ledger Rows...</p>
        </div>
      </div>
    );
  }

  // Exact configuration matrix matching your flat SQLAlchemy database column layout
  const categories = [
    { 
      name: 'Nerve', 
      driveKey: 'nerve',
      actions: [
        { key: 'move', label: 'Move' },
        { key: 'strike', label: 'Strike' },
        { key: 'control', label: 'Control' }
      ] 
    },
    { 
      name: 'Cunning', 
      driveKey: 'cunning',
      actions: [
        { key: 'hide', label: 'Hide' },
        { key: 'sneak', label: 'Sneak' },
        { key: 'sway', label: 'Sway' }
      ] 
    },
    { 
      name: 'Intuition', 
      driveKey: 'intuition',
      actions: [
        { key: 'survey', label: 'Survey' },
        { key: 'read', label: 'Read' },
        { key: 'sense', label: 'Sense' }
      ] 
    }
  ];

  // Handler for clicking the drive pool to consume a point
  const handleSpendDrive = (pool) => {
    const currentDrive = character[`${pool}_current`] || 0;
    if (currentDrive > 0) {
      updateDrive(pool, currentDrive - 1);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Active Special Abilities Headers */}
      <div className="grid grid-cols-2 gap-4 border-b border-[#1a1311]/20 pb-4 mb-4">
        <div className="bg-[#ebdcb9] border border-[#1a1311]/20 p-2.5 rounded shadow-inner">
          <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-0.5">Role Domain Power</span>
          <p className="text-xs font-bold leading-tight text-[#1a1311]">{character.role_ability || "Standard Domain Ability"}</p>
        </div>
        <div className="bg-[#ebdcb9] border border-[#1a1311]/20 p-2.5 rounded shadow-inner">
          <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-0.5">Specialty Master Ability</span>
          <p className="text-xs font-bold leading-tight text-[#1a1311]">{character.specialty_ability || "Focus Archetype Power"}</p>
        </div>
      </div>

      {/* Main Stats Loop Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const currentDrive = character[`${cat.driveKey}_current`] || 0;
          const maxDrive = character[`${cat.driveKey}_max`] || 1;

          return (
            <div key={cat.name} className="border border-[#1a1311]/30 bg-[#fdfaf4] p-4 rounded shadow-sm relative">
              
              {/* Header row containing Drive pools */}
              <div className="flex justify-between items-center mb-3 border-b border-[#1a1311]/10 pb-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-[#1a1311]">{cat.name}</h3>
                
                {/* Clickable Drive counter block */}
                <div 
                  onClick={() => handleSpendDrive(cat.driveKey)}
                  className="flex items-center gap-1.5 cursor-pointer group select-none"
                  title={`Click to burn 1 point of ${cat.name} Drive`}
                >
                  <span className="text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15] group-hover:text-red-700 transition-colors">Burn</span>
                  <div className="flex gap-1">
                    {Array.from({ length: maxDrive }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3.5 h-3.5 border border-[#1a1311] transform rotate-45 transition-colors ${
                          i < currentDrive ? 'bg-[#1a1311] shadow-[1px_1px_0px_#721c15]' : 'bg-transparent'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub-Actions Columns */}
              <div className="space-y-2">
                {cat.actions.map((act) => {
                  const actionValue = character[act.key] || 0;
                  const isGilded = evaluateGilded(character[`gilded_${act.key}`]);

                  return (
                    <div key={act.key} className="flex justify-between items-center p-1.5 rounded hover:bg-[#ebdcb9]/40 transition-colors group">
                      
                      {/* Action Roll Trigger Button */}
                      <button 
                        onClick={() => rollAction(act.key, 0)}
                        className="text-xs font-bold uppercase tracking-wider text-[#1a1311] hover:text-[#721c15] transition-colors flex items-center gap-1.5"
                      >
                        {isGilded && <SafeIcon name="GiDiamonds" className="text-[#d4af37]" size={12} />}
                        {act.label}
                      </button>

                      {/* Action Point Pips rendering block layout */}
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-3 h-3 rounded-full border border-[#1a1311] ${
                              i < actionValue ? 'bg-[#721c15] shadow-inner' : 'bg-transparent'
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

    </div>
  );
}