import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { TensionClock } from '../gm/SceneManager';
import { SafeIcon } from '../shared/SafeIcon';

function RelationshipCard({ inv, myId, relationships, index }) {
  const [flipped, setFlipped] = useState(false);
  const inkColor = inv.ink_color || '#721c15';

  const myRel = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirRel = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);
  const hasAny = myRel || theirRel;

  return (
    <div
      className="relative cursor-pointer"
      style={{
        perspective: '800px',
        height: flipped ? '220px' : '110px',
        transition: 'height 0.4s ease 0.15s',
      }}
      onClick={() => hasAny && setFlipped(f => !f)}
      title={hasAny ? 'Click to see relationship' : ''}
    >
      <div
        className="w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 px-4 py-3 shadow-md overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)`,
            background: '#ece5d0',
            borderTop: `3px solid ${inkColor}`,
            border: '1px solid rgba(0,0,0,0.1)',
            borderTopColor: inkColor,
            borderTopWidth: '3px',
          }}
        >
          <p className="font-mono font-bold text-base text-black/80 truncate">{inv.name}</p>
          <div className="flex gap-2 mt-0.5">
            {(inv.role_class || inv.role) && (
              <p className="font-mono text-sm uppercase tracking-tighter truncate" style={{ color: inkColor }}>{inv.role_class || inv.role}</p>
            )}
            {inv.specialty && (
              <p className="font-mono text-sm text-black/50 uppercase tracking-tighter truncate">· {inv.specialty}</p>
            )}
          </div>
          {hasAny ? (
            <p className="font-mono text-xs italic mt-1" style={{ color: inkColor + 'aa' }}>
              {myRel?.status === 'accepted' ? `${myRel.rel_type}` : 'Relationship pending — tap to view'}
            </p>
          ) : (
            <p className="font-mono text-xs text-black/30 italic mt-1">No relationship defined</p>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 px-3 py-2 shadow-md overflow-y-auto"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#f2ead8',
            borderTop: `3px solid ${inkColor}`,
            border: '1px solid rgba(0,0,0,0.15)',
            borderTopColor: inkColor,
            borderTopWidth: '3px',
          }}
        >
          <p className="font-mono font-bold text-base text-stone-600 uppercase tracking-widest mb-2">{inv.name}</p>
          {myRel ? (
            <div className="mb-2">
              <span className="font-mono text-xs text-stone-400 uppercase">You → them: </span>
              <span className="font-serif text-base text-stone-800 font-bold">{myRel.rel_type}</span>
              {myRel.status !== 'accepted' && (
                <span className="font-mono text-xs text-amber-600 ml-1">({myRel.status})</span>
              )}
              {myRel.lore ? <p className="font-serif text-sm text-stone-600 italic leading-tight mt-1">{myRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-mono text-sm text-stone-400 italic">No outgoing relationship</p>
          )}
          {theirRel ? (
            <div>
              <span className="font-mono text-xs text-stone-400 uppercase">Them → you: </span>
              <span className="font-serif text-base text-stone-800 font-bold">{theirRel.rel_type}</span>
              {theirRel.status !== 'accepted' && (
                <span className="font-mono text-xs text-amber-600 ml-1">({theirRel.status})</span>
              )}
              {theirRel.lore ? <p className="font-serif text-sm text-stone-600 italic leading-tight mt-1">{theirRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-mono text-sm text-stone-400 italic">No incoming relationship</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const TactileSidebar = () => {
  const { character, circle, campaignRoster, circleCreation, fetchRoster } = useGameStore(useShallow(s => ({
    character: s.character,
    circle: s.circle,
    campaignRoster: s.campaignRoster,
    circleCreation: s.circleCreation,
    fetchRoster: s.fetchRoster,
  })));
  const relationships = circleCreation?.relationships || [];

  useEffect(() => {
    if (character?.campaign_id) fetchRoster(character.campaign_id);
  }, [character?.campaign_id]);

  return (
    <div className="lg:col-span-3 space-y-6 mt-2 relative">

      {/* Weathered Library Index Checkout Card */}
      <div className="bg-[#fcfaf2] text-[#1a1311] border border-[#d2c9b9] p-6 shadow-[5px_8px_20px_rgba(0,0,0,0.65)] relative transform -rotate-1 hover:rotate-0 transition-transform duration-200"
           style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(43, 108, 176, 0.12) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
        <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-red-700/20 pointer-events-none" />
        <div className="pl-6 pt-1 relative z-10">
          <span className="block font-mono text-xs uppercase tracking-widest text-[#1a1311]/50 font-black leading-none mb-2">Assignment Dispatch</span>
          <div className="space-y-2 font-bold font-serif">
            <p className="text-base font-black border-b border-black/10 pb-1 leading-tight">
              <span className="font-sans text-xs uppercase font-black text-black/40 mr-1">Target:</span>
              {circle?.location || "Awaiting Dispatch"}
            </p>
            <p className="text-sm leading-tight">
              <span className="font-sans text-xs uppercase font-black text-black/40 mr-1">Conditions:</span>
              {circle?.atmosphere || "No field report."}
            </p>
          </div>
        </div>
      </div>

      {/* Active Circle Registry */}
      <div className="space-y-3 px-1">
        <span className="block font-sans text-sm font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Active Circle Registry</span>

        {/* Current player — always first */}
        <div
          className="px-4 py-3 shadow-md transform rotate-1 relative select-none overflow-hidden"
          style={{
            background: '#f2ebd9',
            border: '1px solid rgba(0,0,0,0.1)',
            borderTopWidth: '3px',
            borderTopColor: character?.ink_color || '#721c15',
          }}
        >
          <p className="font-mono font-black text-base text-black truncate">{character?.name || 'Unknown Investigator'}</p>
          <div className="flex gap-2 mt-0.5">
            {character?.role && (
              <p className="font-mono text-sm uppercase tracking-tighter truncate" style={{ color: character?.ink_color || '#721c15' }}>{character.role}</p>
            )}
            {character?.specialty && (
              <p className="font-mono text-sm text-black/50 uppercase tracking-tighter truncate">· {character.specialty}</p>
            )}
          </div>
          <p className="font-mono text-xs text-black/35 italic mt-1">You</p>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-emerald-600 shadow-sm" />
        </div>

        {/* Other active investigators — flip cards */}
        {(campaignRoster.active_investigators || [])
          .filter(inv => inv.id !== character?.id)
          .map((inv, i) => (
            <RelationshipCard
              key={inv.id}
              inv={inv}
              myId={character?.id}
              relationships={relationships}
              index={i}
            />
          ))
        }

        {!character?.campaign_id && (
          <p className="font-mono text-xs text-white/20 italic text-center pt-1">Not enrolled in a campaign.</p>
        )}
      </div>

      {/* Tension Clock (Synced with GM, read-only for players) */}
      <div className="pt-6 pb-4 px-1 flex justify-center items-center relative z-20">
        <TensionClock readOnly />
      </div>
    </div>
  );
};
