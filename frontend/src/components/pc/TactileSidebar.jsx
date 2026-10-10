import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { TensionClock } from '../gm/SceneManager';
import { tiltFor } from '../shared/handPlaced';
import { BlankEntry } from '../shared/PrintMarks';
import { TurnOverMark, PushPin } from '../shared/Decorations';
import { playPaperSound } from '../../game/rollSounds';
import { livingMembers } from '../../game/roster';
import { useFlatTurn } from '../shared/useFlatTurn';
import { DispatchNote } from './DispatchNote';

// The investigator's photograph, small, pinned to the corner of their card. Only when
// there is one: a card without a photograph shows no empty frame.
function PinnedPhoto({ src, name, index = 0 }) {
  if (!src) return null;
  return (
    <div
      className="relative shrink-0 w-11 h-14 bg-cream p-[3px] shadow-[1px_3px_5px_rgba(0,0,0,0.35)] mt-1"
      style={{ transform: `rotate(${tiltFor(`photo-${name}`, { min: 2, max: 4, sign: index % 2 ? 1 : -1 })}deg)` }}
    >
      <img src={src} alt={`Photograph of ${name}`} className="w-full h-full object-cover" draggable={false} />
      <PushPin size={16} className="absolute -top-2 left-1/2 -translate-x-1/2" />
    </div>
  );
}

// The natural height of each face, so a card is exactly as tall as the face that is up:
// no scroll bar inside a card, ever (owner's item 13). Faces are measured, not guessed.
function useFaceHeights() {
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [heights, setHeights] = useState({ front: 0, back: 0 });
  useLayoutEffect(() => {
    const measure = () => setHeights({
      front: frontRef.current?.offsetHeight || 0,
      back: backRef.current?.offsetHeight || 0,
    });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    if (frontRef.current) ro.observe(frontRef.current);
    if (backRef.current) ro.observe(backRef.current);
    return () => ro.disconnect();
  }, []);
  return { frontRef, backRef, heights };
}

// The face of a card: parchment with the investigator's ink along its top edge. Only the
// face that is up is drawn; the other keeps its size, so the card knows its height.
const faceStyle = (inkColor, up) => ({
  visibility: up ? undefined : 'hidden',
  background: 'rgb(var(--c-parchment))',
  border: '1px solid rgb(var(--c-ink) / 0.12)',
  borderTopColor: inkColor,
  borderTopWidth: '3px',
});

function RelationshipCard({ inv, myId, relationships, index }) {
  const [flipped, setFlipped] = useState(false);
  const inkColor = inv.ink_color || 'rgb(var(--c-oxblood))';
  const { frontRef, backRef, heights } = useFaceHeights();

  const myRel = relationships.find(r => r.from_character_id === myId && r.to_character_id === inv.id);
  const theirRel = relationships.find(r => r.from_character_id === inv.id && r.to_character_id === myId);
  const hasAny = myRel || theirRel;
  // Settled once either side is accepted: a relationship proposed to you and accepted read
  // as pending on its front until you proposed one back (playtest, 2026-10-09)
  const settled = myRel?.status === 'accepted' ? myRel : theirRel?.status === 'accepted' ? theirRel : null;
  // The card turns over on this screen, with the paper sound (owner's round 3 item 21). It
  // turns flat, as the Lightkeeper's report cards do: in 3D, WebKit (Safari) showed each
  // card's back mirrored over its front at rest (iPad pass, 2026-10-05).
  const { ref: cardRef, turn: turnFlat } = useFlatTurn({ ms: 500 });
  const turn = () => { playPaperSound(); turnFlat(() => setFlipped(f => !f)); };
  // The card is as tall as the face that is up; the borders (3px top, 1px bottom) sit on
  // the face, outside the measured content
  const height = (flipped ? heights.back : heights.front) + 4;

  return (
    <div
      className="hand-placed relative cursor-pointer"
      style={{
        '--tilt': `${tiltFor(inv.id, { sign: index % 2 ? 1 : -1 })}deg`,
        height: height > 4 ? `${height}px` : undefined,
        minHeight: height > 4 ? undefined : '96px',
        transition: 'height 0.4s ease',
      }}
      onClick={() => hasAny && turn()}
      role={hasAny ? 'button' : undefined}
      tabIndex={hasAny ? 0 : undefined}
      aria-expanded={hasAny ? flipped : undefined}
      onKeyDown={hasAny ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(); } } : undefined}
    >
      <div ref={cardRef} className="w-full h-full">
        {/* Front */}
        <div className="absolute inset-0 shadow-md overflow-hidden" style={faceStyle(inkColor, !flipped)} aria-hidden={flipped || undefined}>
          <div ref={frontRef} className="flex items-start gap-3 px-4 py-3">
            <PinnedPhoto src={inv.profile_pic} name={inv.name} index={index} />
            <div className="min-w-0 flex-1">
              <p className="font-serif font-bold text-lg leading-tight text-ink truncate">{inv.name}</p>
              <div className="flex flex-wrap gap-x-2 mt-0.5 min-w-0">
                {(inv.role_class || inv.role) && (
                  <p className="font-sans font-bold text-sm uppercase tracking-tighter" style={{ color: inkColor }}>{inv.role_class || inv.role}</p>
                )}
                {inv.specialty && (
                  <p className="font-sans font-bold text-sm text-sepia uppercase tracking-tighter">· {inv.specialty}</p>
                )}
              </div>
              {/* Settled: the relationship in their ink. Proposed: its name in pencil beside
                  the empty outline of the stamp it is waiting for. None: a blank rule. */}
              {settled ? (
                <p className="font-serif text-sm italic mt-1 pr-6" style={{ color: inkColor }}>{settled.rel_type}</p>
              ) : hasAny ? (
                <p className="flex items-center gap-2 font-serif text-sm italic text-sepia mt-1 pr-6">
                  <span className="truncate">{(myRel || theirRel)?.rel_type}</span>
                  <span aria-hidden="true" className="print-stamp-empty !w-10 !h-4 shrink-0" style={{ '--tilt': '-3deg' }} />
                  <span className="sr-only">(not yet accepted)</span>
                </p>
              ) : (
                <p className="text-sepia mt-2"><BlankEntry label="No relationship" className="!w-24" /></p>
              )}
            </div>
          </div>
          {/* A card with a back can be turned over: the turned corner says so */}
          {hasAny && <TurnOverMark className="absolute bottom-1.5 right-1.5 text-sepia/70" />}
        </div>

        {/* Back: as long as what is written on it */}
        <div className="absolute inset-0 shadow-md overflow-hidden" style={faceStyle(inkColor, flipped)} aria-hidden={!flipped || undefined}>
          <div ref={backRef} className="px-3 pt-2 pb-3">
            <p className="font-sans font-bold text-base text-sepia uppercase tracking-widest mb-2">{inv.name}</p>
            {myRel ? (
              <div className="mb-2">
                <span className="font-sans font-bold text-xs text-sepia uppercase">You to them: </span>
                <span className="font-serif text-base text-ink font-bold">{myRel.rel_type}</span>
                {myRel.status !== 'accepted' && (
                  <span className="font-serif italic text-sm text-sepia ml-1">(not yet accepted)</span>
                )}
                {myRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1 whitespace-pre-line">{myRel.lore}</p> : null}
              </div>
            ) : (
              <p className="font-serif text-base text-sepia italic mb-2"><span className="font-sans not-italic font-bold text-xs uppercase">You to them: </span>none</p>
            )}
            {theirRel ? (
              <div>
                <span className="font-sans font-bold text-xs text-sepia uppercase">Them to you: </span>
                <span className="font-serif text-base text-ink font-bold">{theirRel.rel_type}</span>
                {theirRel.status !== 'accepted' && (
                  <span className="font-serif italic text-sm text-sepia ml-1">(not yet accepted)</span>
                )}
                {theirRel.lore ? <p className="font-serif text-sm text-sepia italic leading-tight mt-1 whitespace-pre-line">{theirRel.lore}</p> : null}
              </div>
            ) : (
              <p className="font-serif text-base text-sepia italic"><span className="font-sans not-italic font-bold text-xs uppercase">Them to you: </span>none</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// phonePart: below md the drawer shows one part of the desk at a time (MainDeskView); this
// rail shows only the Lightkeeper's note ('dispatch'), the circle's cards ('circle') or the
// hourglass ('watch'), and nothing for any other part.
export const TactileSidebar = ({ phonePart }) => {
  const { character, circle, campaignRoster, circleCreation, fetchRoster } = useGameStore(useShallow(s => ({
    character: s.character,
    circle: s.circle,
    campaignRoster: s.campaignRoster,
    circleCreation: s.circleCreation,
    fetchRoster: s.fetchRoster,
  })));
  const relationships = circleCreation?.relationships || [];
  const myPhoto = character?.profile_pic || character?.profilePic || null;

  useEffect(() => {
    if (character?.campaign_id) fetchRoster(character.campaign_id);
  }, [character?.campaign_id]);

  const phoneShows = (part) => phonePart === undefined || phonePart === part;
  const onPhone = (part) => (phoneShows(part) ? '' : 'max-md:hidden');
  const anyOnPhone = phoneShows('dispatch') || phoneShows('circle') || phoneShows('watch');

  // From xl the rail is as tall as the window: the GM's note at the top and the
  // hourglass at the foot always show, and only the circle's cards between them scroll if a
  // large circle ever runs longer than the screen.
  return (
    <div className={`lg:col-span-3 xl:col-span-1 space-y-6 mt-2 xl:mt-0 relative order-3 lg:order-none xl:h-full xl:min-h-0 xl:flex xl:flex-col xl:space-y-0 xl:gap-2 max-md:flex max-md:flex-col max-md:space-y-0 max-md:gap-6 ${
      anyOnPhone ? '' : 'max-md:hidden'}`}>

      {/* The Lightkeeper's dispatch, pinned to the desk (DispatchNote.jsx) */}
      <DispatchNote circle={circle} className={`xl:shrink-0 max-md:mt-3 ${onPhone('dispatch')}`} />

      {/* Active Circle Registry: the members' cards pinned to the desk, each as tall as
          what is written on it. On a wide rail they lie two across. */}
      <div data-desk="circle" className={`px-1 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:overflow-x-hidden xl:-mx-3 xl:px-3 xl:pt-1 xl:pb-2 custom-scrollbar ${onPhone('circle')}`}>
        <span className="block font-sans text-sm font-black text-cream/70 uppercase tracking-widest leading-none mb-4 xl:mb-2.5">Your Circle</span>

        <div className="grid grid-cols-1 xl:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3 xl:gap-x-4 items-start">
        {/* Current player — always first */}
        <div
          className="hand-placed shadow-md relative select-none overflow-hidden"
          style={{
            '--tilt': `${tiltFor(`self-${character?.id ?? ''}`, { sign: 1 })}deg`,
            background: 'rgb(var(--c-parchment))',
            border: '1px solid rgb(var(--c-ink) / 0.12)',
            borderTopWidth: '3px',
            borderTopColor: character?.ink_color || 'rgb(var(--c-oxblood))',
          }}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <PinnedPhoto src={myPhoto} name={character?.name || 'you'} index={1} />
            <div className="min-w-0 flex-1">
              <p className="font-serif font-bold text-lg leading-tight text-ink truncate">{character?.name || 'Unknown Investigator'}</p>
              <div className="flex flex-wrap gap-x-2 mt-0.5 min-w-0">
                {character?.role && (
                  <p className="font-sans font-bold text-sm uppercase tracking-tighter" style={{ color: character?.ink_color || 'rgb(var(--c-oxblood))' }}>{character.role}</p>
                )}
                {character?.specialty && (
                  <p className="font-sans font-bold text-sm text-sepia uppercase tracking-tighter">· {character.specialty}</p>
                )}
              </div>
              <p className="font-serif text-sm text-sepia italic mt-1">You</p>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-seal-green shadow-sm" />
        </div>

        {/* Other active investigators — flip cards */}
        {livingMembers(campaignRoster.active_investigators)
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
        </div>

        {!character?.campaign_id && (
          <p className="font-serif text-sm text-cream/70 italic text-center pt-1">Not in a campaign</p>
        )}
      </div>

      {/* Tension Clock (Synced with GM, read-only for players): the hourglass standing at
          the foot of the rail. Alone on a phone's screen it stands larger, half as large
          again; laid out at most two thirds as wide as its place, it still fits the screen
          scaled, and a long clock name wraps (a long word breaks) rather than run off both
          edges. */}
      <div data-desk="watch" className={`pt-6 pb-4 px-1 xl:pt-1 xl:pb-1 xl:shrink-0 flex justify-center items-center relative z-20 ${
        phonePart === 'watch' ? 'max-md:pt-10 max-md:pb-32' : ''} ${onPhone('watch')}`}>
        <div className={phonePart === 'watch' ? 'max-md:scale-150 max-md:origin-top max-md:max-w-[calc(100%/1.5)] max-md:[overflow-wrap:anywhere]' : undefined}>
          <TensionClock readOnly />
        </div>
      </div>
    </div>
  );
};
