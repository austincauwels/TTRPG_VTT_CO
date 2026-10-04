import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { TensionClock } from '../gm/SceneManager';
import { SafeIcon } from '../shared/SafeIcon';
import { tiltFor } from '../shared/handPlaced';
import { useTypedText } from '../shared/useTypedText';

function RelationshipCard({ inv, myId, relationships, index }) {
  const [flipped, setFlipped] = useState(false);
  const inkColor = inv.ink_color || 'rgb(var(--c-oxblood))';

  const myRel = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirRel = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);
  const hasAny = myRel || theirRel;

  return (
    <div
      className="hand-placed relative cursor-pointer"
      style={{
        '--tilt': `${tiltFor(inv.id, { sign: index % 2 ? 1 : -1 })}deg`,
        perspective: '800px',
        height: flipped ? '220px' : '110px',
        transition: 'height 0.4s ease 0.15s',
      }}
      onClick={() => hasAny && setFlipped(f => !f)}
      role={hasAny ? 'button' : undefined}
      tabIndex={hasAny ? 0 : undefined}
      aria-expanded={hasAny ? flipped : undefined}
      onKeyDown={hasAny ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f); } } : undefined}
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
              {myRel?.status === 'accepted' ? `${myRel.rel_type}` : 'Relationship not settled yet. Tap to see it.'}
            </p>
          ) : (
            <p className="font-serif text-sm text-sepia italic mt-1">No relationship yet. Propose one on the Circle tab.</p>
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
              <span className="font-sans font-bold text-xs text-sepia uppercase">You to them: </span>
              <span className="font-serif text-base text-ink font-bold">{myRel.rel_type}</span>
              {myRel.status !== 'accepted' && (
                <span className="font-serif italic text-sm text-sepia ml-1">(not yet accepted)</span>
              )}
              {myRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1">{myRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-serif text-base text-sepia italic">You have not proposed one yet.</p>
          )}
          {theirRel ? (
            <div>
              <span className="font-sans font-bold text-xs text-sepia uppercase">Them to you: </span>
              <span className="font-serif text-base text-ink font-bold">{theirRel.rel_type}</span>
              {theirRel.status !== 'accepted' && (
                <span className="font-serif italic text-sm text-sepia ml-1">(not yet accepted)</span>
              )}
              {theirRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1">{theirRel.lore}</p> : null}
            </div>
          ) : (
            <p className="font-serif text-base text-sepia italic">They have not proposed one yet.</p>
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
  const location = circle?.location || '';
  const atmosphere = circle?.atmosphere || '';
  const typed = useTypedText([location, atmosphere]);

  useEffect(() => {
    if (character?.campaign_id) fetchRoster(character.campaign_id);
  }, [character?.campaign_id]);

  return (
    <div className="lg:col-span-3 space-y-6 mt-2 relative order-3 lg:order-none">

      {/* The GM's dispatch, a library index card pinned to the desk a little crooked, its
          bottom edge torn. A new dispatch types in while the desk is open. */}
      <div className="hand-placed lg:hover:rotate-0 transition-transform duration-200 relative"
           style={{ '--tilt': '-1.2deg', filter: 'drop-shadow(5px 8px 9px rgba(0,0,0,0.6))' }}>
        <div className="deckle-bottom bg-cream text-ink border border-parchment-deep p-6 pb-7 relative"
             style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-sepia) / 0.14) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
          <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-oxblood/20 pointer-events-none" />
          <div className="pl-6 pt-1 relative z-10">
            <span className="block font-sans text-xs uppercase tracking-widest text-sepia font-black leading-none mb-2">From the GM</span>
            <div className="space-y-2 font-bold font-serif">
              <p className="text-base font-black border-b border-ink/10 pb-1 leading-tight">
                <span className="font-sans text-xs uppercase font-black text-sepia mr-1">Location:</span>
                {location
                  ? <><span className="sr-only">{location}</span><span aria-hidden="true">{typed.parts[0]}{typed.typing && typed.parts[0].length < location.length && <span className="type-caret" />}</span></>
                  : 'No dispatch yet'}
              </p>
              <p className="text-sm leading-tight">
                <span className="font-sans text-xs uppercase font-black text-sepia mr-1">Conditions:</span>
                {atmosphere
                  ? <><span className="sr-only">{atmosphere}</span><span aria-hidden="true">{typed.parts[1]}{typed.typing && typed.parts[0].length >= location.length && <span className="type-caret" />}</span></>
                  : 'Not described yet.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Circle Registry */}
      <div className="space-y-3 px-1">
        <span className="block font-sans text-sm font-black text-cream/70 uppercase tracking-widest leading-none mb-1">Your Circle</span>

        {/* Current player — always first */}
        <div
          className="hand-placed px-4 py-3 shadow-md relative select-none overflow-hidden"
          style={{
            '--tilt': `${tiltFor(`self-${character?.id ?? ''}`, { sign: 1 })}deg`,
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
          <p className="font-serif text-sm text-cream/70 italic text-center pt-1">Not in a campaign. Join one from the chapter hub.</p>
        )}
      </div>

      {/* Tension Clock (Synced with GM, read-only for players) */}
      <div className="pt-6 pb-4 px-1 flex justify-center items-center relative z-20">
        <TensionClock readOnly />
      </div>
    </div>
  );
};
