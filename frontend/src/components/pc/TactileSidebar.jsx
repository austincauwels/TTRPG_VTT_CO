import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { TensionClock } from '../gm/SceneManager';
import { SafeIcon } from '../shared/SafeIcon';

function RelationshipCard({ inv, myId, relationships, index }) {
  const [flipped, setFlipped] = useState(false);
  const inkColor = inv.ink_color || 'rgb(var(--c-oxblood))';

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
            background: 'rgb(var(--c-parchment))',
            borderTop: `3px solid ${inkColor}`,
            border: '1px solid rgb(var(--c-ink) / 0.12)',
            borderTopColor: inkColor,
            borderTopWidth: '3px',
          }}
        >
          <p className="font-serif font-bold text-lg leading-tight text-ink truncate">{inv.name}</p>
          <div className="flex gap-2 mt-0.5">
            {(inv.role_class || inv.role) && (
              <p className="font-sans font-bold text-sm uppercase tracking-tighter truncate" style={{ color: inkColor }}>{inv.role_class || inv.role}</p>
            )}
            {inv.specialty && (
              <p className="font-sans font-bold text-sm text-sepia uppercase tracking-tighter truncate">· {inv.specialty}</p>
            )}
          </div>
          {hasAny ? (
            <p className="font-serif text-sm italic mt-1" style={{ color: inkColor }}>
              {myRel?.status === 'accepted' ? `${myRel.rel_type}` : 'Relationship pending — tap to view'}
            </p>
          ) : (
            <p className="font-serif text-sm text-sepia italic mt-1">No relationship defined</p>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 px-3 py-2 shadow-md overflow-y-auto"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'rgb(var(--c-parchment))',
            borderTop: `3px solid ${inkColor}`,
            border: '1px solid rgb(var(--c-ink) / 0.15)',
            borderTopColor: inkColor,
            borderTopWidth: '3px',
          }}
        >
          <p className="font-sans font-bold text-base text-sepia uppercase tracking-widest mb-2">{inv.name}</p>
          {myRel ? (
            <div className="mb-2">
              <span className="font-sans font-bold text-xs text-sepia uppercase">You → them: </span>
              <span className="font-serif text-base text-ink font-bold">{myRel.rel_type}</span>
              {myRel.status !== 'accepted' && (
                <span className="font-serif italic text-sm text-sepia ml-1">({myRel.status})</span>
              )}
              {myRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1">{myRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-serif text-base text-sepia italic">No outgoing relationship</p>
          )}
          {theirRel ? (
            <div>
              <span className="font-sans font-bold text-xs text-sepia uppercase">Them → you: </span>
              <span className="font-serif text-base text-ink font-bold">{theirRel.rel_type}</span>
              {theirRel.status !== 'accepted' && (
                <span className="font-serif italic text-sm text-sepia ml-1">({theirRel.status})</span>
              )}
              {theirRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1">{theirRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-serif text-base text-sepia italic">No incoming relationship</p>
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
    <div className="lg:col-span-3 space-y-6 mt-2 relative order-3 lg:order-none">

      {/* Weathered Library Index Checkout Card */}
      <div className="bg-cream text-ink border border-parchment-deep p-6 shadow-[5px_8px_20px_rgba(0,0,0,0.65)] relative"
           style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-sepia) / 0.14) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
        <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-oxblood/20 pointer-events-none" />
        <div className="pl-6 pt-1 relative z-10">
          <span className="block font-sans text-xs uppercase tracking-widest text-sepia font-black leading-none mb-2">Assignment Dispatch</span>
          <div className="space-y-2 font-bold font-serif">
            <p className="text-base font-black border-b border-ink/10 pb-1 leading-tight">
              <span className="font-sans text-xs uppercase font-black text-sepia mr-1">Target:</span>
              {circle?.location || "Awaiting Dispatch"}
            </p>
            <p className="text-sm leading-tight">
              <span className="font-sans text-xs uppercase font-black text-sepia mr-1">Conditions:</span>
              {circle?.atmosphere || "No field report."}
            </p>
          </div>
        </div>
      </div>

      {/* Active Circle Registry */}
      <div className="space-y-3 px-1">
        <span className="block font-sans text-sm font-black text-cream/70 uppercase tracking-widest leading-none mb-1">Active Circle Registry</span>

        {/* Current player — always first */}
        <div
          className="px-4 py-3 shadow-md relative select-none overflow-hidden"
          style={{
            background: 'rgb(var(--c-parchment))',
            border: '1px solid rgb(var(--c-ink) / 0.12)',
            borderTopWidth: '3px',
            borderTopColor: character?.ink_color || 'rgb(var(--c-oxblood))',
          }}
        >
          <p className="font-serif font-bold text-lg leading-tight text-ink truncate">{character?.name || 'Unknown Investigator'}</p>
          <div className="flex gap-2 mt-0.5">
            {character?.role && (
              <p className="font-sans font-bold text-sm uppercase tracking-tighter truncate" style={{ color: character?.ink_color || 'rgb(var(--c-oxblood))' }}>{character.role}</p>
            )}
            {character?.specialty && (
              <p className="font-sans font-bold text-sm text-sepia uppercase tracking-tighter truncate">· {character.specialty}</p>
            )}
          </div>
          <p className="font-serif text-sm text-sepia italic mt-1">You</p>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-seal-green shadow-sm" />
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
          <p className="font-serif text-sm text-cream/70 italic text-center pt-1">Not enrolled in a campaign.</p>
        )}
      </div>

      {/* Tension Clock (Synced with GM, read-only for players) */}
      <div className="pt-6 pb-4 px-1 flex justify-center items-center relative z-20">
        <TensionClock readOnly />
      </div>
    </div>
  );
};
