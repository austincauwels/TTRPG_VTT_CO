import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { SheetDivider } from './Decorations';
import { SafeIcon } from './SafeIcon';

export const InvestigatorDossier = () => {
  // Global Store Bindings
  const { character, updateDrive, rollAction, takeMark } = useGameStore();
  
  // Local Component State
  const [scarDescription, setScarDescription] = useState("");

  // Action & Drive Handlers
  const handleSpendDrive = (pool, value) => {
    const maxDrive = character[`${pool}_max`] || 1;
    if (value >= 0 && value <= maxDrive) {
      updateDrive(pool, value);
    }
  };

  // Domain Config Mapping
  const domainCategories = [
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

  if (!character) return null;

  return (
    <div className="relative z-10 animate-fadeIn space-y-6">
      
      {/* Investigator Portrait Frame */}
      <div className="absolute top-0 right-0 w-44 h-[220px] bg-[#fefcf7] p-2 border border-black/10 shadow-[4px_10px_24px_rgba(0,0,0,0.5)] transform rotate-2 hover:rotate-0 hover:scale-105 duration-200 transition-all z-30 group">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#d2b48c]/70 -rotate-3 border border-black/5 mix-blend-multiply shadow-sm" />
        
        <div className="w-full h-full bg-black/5 border border-black/5 flex flex-col items-center justify-center overflow-hidden text-center">
          {character.profilePic || character.profile_pic ? (
            <img src={character.profilePic || character.profile_pic} className="w-full h-full object-cover grayscale contrast-125 sepia-[0.25]" alt="Subject Manifest Photo" />
          ) : (
            <div className="opacity-25 p-1">
              <SafeIcon name="GiPerson" size={44} className="mx-auto" />
              <span className="block text-[8px] font-mono font-black uppercase mt-1 tracking-tight">AFFIX PORTRAIT</span>
            </div>
          )}
        </div>
      </div>

      {/* Investigator Identity Headers */}
      <div className="grid grid-cols-3 gap-6 w-2/3 pb-2 font-mono">
        <div className="col-span-2">
          <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ INVESTIGATOR APPELLATION RECORD ]</span>
          <div className="text-xl font-serif font-black border-b border-black pb-0.5 text-black uppercase mt-1 truncate">{character.name}</div>
        </div>
        <div>
          <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ NOMENCLATURE PRONOUNS ]</span>
          <div className="text-sm font-bold italic border-b border-black pb-1 text-black/70 mt-1.5 truncate">{character.pronouns || 'UNLISTED'}</div>
        </div>
      </div>

      {/* Specialty Matrix Block */}
      <div className="w-full pr-48 pt-1 font-mono text-xs text-black/90 rounded-sm relative p-3 border border-black/10 bg-black/[0.01]"
           style={{ 
             backgroundImage: 'repeating-linear-gradient(transparent, transparent 21px, rgba(0, 0, 0, 0.06) 22px)', 
             backgroundSize: '100% 22px', 
             lineHeight: '22px' 
           }}>
        <div className="whitespace-normal break-words">
          <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-0.5">I. Guild Core Specialty Trait Asset Matrix</span>
          <p className="pl-2 pb-1 text-black/85 leading-normal"><span className="font-bold uppercase text-black">{character.role_ability || "Ability"}:</span> {character.role_ability === "I Know a Guy" ? "Once per assignment, you can produce a contact who possesses specialized knowledge or resources." : "Grants administrative access to custom faction connection profiles or resource mapping paths."}</p>
        </div>
        <div className="mt-2 whitespace-normal break-words">
          <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-0.5">II. Vocational Specialization Mastery Parameter</span>
          <p className="pl-2 pb-1 text-black/85 leading-normal"><span className="font-bold uppercase text-black">{character.specialty_ability || "Specialty"}:</span> {character.specialty_ability === "Insider Access" ? "Your line of work offers you special privileges. Once per assignment, automatically gain clearance." : "Overrides local validation limitations once per active operation scene phase."}</p>
        </div>
      </div>

      <SheetDivider />

      {/* Action and Drive Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/[0.02] border border-black/10 p-3 rounded-sm shadow-inner">
        {domainCategories.map((cat) => {
          const currentDrive = character[`${cat.driveKey}_current`] || 0;
          const maxDrive = character[`${cat.driveKey}_max`] || 1;

          return (
            <div key={cat.name} className="bg-white/40 border border-black/20 p-2.5 rounded-sm flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-black/10 pb-1.5 mb-2">
                <span className="font-serif font-black text-xs uppercase tracking-wide text-black">{cat.name}</span>
                <div className="flex items-center gap-1 select-none group" title={`Click individual pips to adjust ${cat.name} Drive`}>
                  <div className="flex gap-1.5 px-0.5">
                    {Array.from({ length: maxDrive }).map((_, i) => {
                      const isActive = i < currentDrive;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            const targetValue = isActive ? i : i + 1;
                            handleSpendDrive(cat.driveKey, targetValue);
                          }}
                          className={`w-2.5 h-2.5 border border-black transform rotate-45 cursor-pointer transition-all duration-150 ${
                            isActive 
                              ? 'bg-black scale-105 shadow-sm' 
                              : 'bg-transparent hover:bg-black/20'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {cat.actions.map((act) => {
                  const actionValue = character[act.key] || 0;
                  const isGilded = character[`gilded_${act.key}`] === true || character[`gilded_${act.key}`] === 1 || character[`gilded_${act.key}`] === "true";

                  return (
                    <div key={act.key} className="flex justify-between items-center text-xs py-0.5">
                      <button 
                        onClick={() => rollAction(act.key, 0)}
                        className="font-mono text-[10px] font-bold uppercase hover:text-red-800 transition-colors tracking-tight flex items-center gap-1"
                      >
                        {isGilded && <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />}
                        {act.label}
                      </button>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full border border-black ${
                              i < actionValue ? 'bg-[#721c15]' : 'bg-transparent'
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

      <SheetDivider />

      {/* Vital Damage & Post-Mortem Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Damage Tracks Column */}
        <div className="md:col-span-5 bg-black/[0.02] border-2 border-black p-4 rounded-sm flex flex-col justify-between shadow-inner">
          <div>
            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
              <SafeIcon name="GiBleedingEye" size={14} className="text-[#721c15]" /> Vital Damage Tracks
            </h3>
            
            <div className="space-y-3">
              {['body', 'brain', 'bleed'].map((type) => (
                <div key={type} className="flex justify-between items-center text-xs">
                  <button 
                    onClick={() => takeMark(type)} 
                    className="font-sans font-black uppercase tracking-widest text-[10px] text-black hover:text-red-800 transition-colors border-b border-dashed border-transparent hover:border-red-800"
                  >
                    {type} [+]
                  </button>
                  <div 
                    className="flex gap-1.5 cursor-pointer group"
                    onClick={() => takeMark(type)}
                    title={`Click to add a ${type} mark`}
                  >
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3.5 h-5 border-2 border-black shadow-inner rounded-sm transition-all duration-150 ${
                          character && i < character[`${type}_marks`] 
                            ? 'bg-black transform rotate-3 scale-105' 
                            : 'bg-transparent group-hover:bg-black/20 group-hover:border-red-800/50'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-2 border-t border-black/10 text-[9px] font-mono text-black/50 flex justify-between uppercase">
            <span>Trauma Status:</span>
            <span className="font-bold text-black">{character?.incapacitated ? "INCAPACITATED" : "OPERATIONAL"}</span>
          </div>
        </div>

        {/* Scars Textarea Log */}
        <div className="md:col-span-7 bg-[#fcf9f2] border-2 border-dashed border-black/60 p-4 rounded-sm relative shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="absolute top-1 right-2 font-mono text-[7px] text-black/30 tracking-tight">AUTOPSY_REF_DEGRADATION_772</div>
          <div>
            <div className="flex justify-between items-center border-b border-black/40 pb-1 mb-2">
              <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                <SafeIcon name="GiQuillInk" size={12} /> Post-Mortem Trauma Ledger
              </h3>
              <span className="font-mono text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded-sm">
                SCARS: {character?.scars_count || 0} / 4
              </span>
            </div>
          </div>

          <textarea 
            rows={4}
            value={scarDescription}
            onChange={(e) => setScarDescription(e.target.value)}
            placeholder="[ CAPTURE PHYSICAL OR PSYCHOLOGICAL CELL MUTATION DISSECTION DATA HERE... ]"
            className="w-full flex-1 bg-transparent border-none rounded-none p-0 text-xs font-mono leading-relaxed text-black/90 resize-none focus:outline-none focus:ring-0 shadow-none placeholder-black/30"
            style={{ 
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, rgba(0, 0, 0, 0.08) 20px)', 
              backgroundSize: '100% 20px', 
              lineHeight: '20px' 
            }}
          />
        </div>
      </div>

    </div>
  );
};