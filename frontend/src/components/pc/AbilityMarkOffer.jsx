import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

// Offers stay up long enough to read and decide during play, and the countdown pauses
// while the pointer is over the offer or focus is inside it.
const MIN_OFFER_SECONDS = 20;

const ABILITY_OFFER_CONFIG = {
  "Adrenaline Rush": {
    icon: "GiHeartInside",
    description: "Refresh a drive point of your choice.",
    actionType: "drive_refresh",
  },
  "Compartmentalization": {
    icon: "GiFrontalLobe",
    description: "Burn 1 Nerve resistance to soak this Brain mark.",
    actionType: "soak",
  },
  "Steel Mind": {
    icon: "GiFrontalLobe",
    description: "Burn 1 Intuition resistance to soak this Brain mark.",
    actionType: "soak",
  },
  "In the Trenches": {
    icon: "GiShield",
    description: "Burn 1 Cunning resistance to soak this Body mark.",
    actionType: "soak",
  },
  "Death Defy": {
    icon: "GiHalfDead",
    description: "If an enemy dealt this mark, escape unscathed: you take no marks from it.",
    actionType: "escape",
  },
  "Let Them In": {
    icon: "GiThirdEye",
    description: "Ask the Lightkeeper one question about the source of the bleed.",
    actionType: "info",
  },
  "Behind Me": {
    icon: "GiShield",
    description: (name) => `Take ${name}'s mark instead (spend 1 Nerve).`,
    actionType: "intercept",
    isIntercept: true,
  },
  "Premonitions": {
    icon: "GiCrystalBall",
    description: (name) => `Soak ${name}'s mark (burn 1 Intuition resistance).`,
    actionType: "soak",
    isIntercept: true,
  },
};

export const AbilityMarkOffer = () => {
  const { abilityMarkOffer, resolveAbilityMark, interceptMark, dismissAbilityMarkOffer, declineAbilityMark } = useGameStore();
  const [driveChoice, setDriveChoice] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const offer = abilityMarkOffer;
  const config = offer ? ABILITY_OFFER_CONFIG[offer.ability] : null;
  // A soak or Death Defy on this investigator's own mark holds the mark back: passing it
  // up, or letting the time run out, takes the mark (the server lands it)
  const holdsOwnMark = !!config && !config.isIntercept && (offer.action === 'soak' || offer.action === 'escape');
  const holdsRef = useRef(null);
  holdsRef.current = holdsOwnMark ? offer : null;
  const passUp = () => (holdsRef.current ? declineAbilityMark(holdsRef.current) : dismissAbilityMarkOffer());

  const autoDismissSeconds = offer?.action === 'info' || config?.isIntercept ? MIN_OFFER_SECONDS : 30;

  useEffect(() => {
    if (!offer) { setTimeLeft(null); setDriveChoice(null); return; }
    setTimeLeft(autoDismissSeconds);
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft(prev => {
        if (prev == null) return prev;
        if (prev <= 1) { passUp(); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [offer?.ability, offer?.character_id]);

  if (!offer || !config) return null;

  const charName = offer.character_name || 'an ally';
  const desc = typeof config.description === 'function' ? config.description(charName) : config.description;

  const handleAccept = () => {
    if (config.isIntercept) {
      interceptMark(offer.ability, offer.character_id, offer.mark_type);
    } else if (offer.action === 'drive_refresh') {
      if (!driveChoice) return;
      resolveAbilityMark(offer.ability, driveChoice);
    } else if (offer.action === 'info') {
      dismissAbilityMarkOffer();
    } else {
      resolveAbilityMark(offer.ability, offer.action);
    }
    setDriveChoice(null);
  };

  return (
    <div
      role="dialog"
      aria-label={`${offer.ability} offer`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:w-80 lg:bottom-6 lg:right-6 z-[9998] animate-fadeIn"
    >
      <div className="bg-ink border border-parchment-deep/40 rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.7)] px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SafeIcon name={config.icon} size={18} className="text-parchment-deep shrink-0" />
            <span className="font-sans text-xs font-black uppercase tracking-widest text-cream">
              {offer.ability}
            </span>
          </div>
          <span className="font-mono tabular-nums text-xs text-parchment-deep/80">{paused ? `Paused · ${timeLeft}s` : `${timeLeft}s`}</span>
        </div>

        <p className="font-serif text-sm text-parchment-deep mb-3 leading-relaxed">{desc}</p>

        {/* Drive picker for Adrenaline Rush */}
        {offer.action === 'drive_refresh' && (
          <div className="flex gap-1.5 mb-2">
            {['nerve', 'cunning', 'intuition'].map(d => (
              <button
                key={d}
                onClick={() => setDriveChoice(d)}
                className={[
                  'flex-1 py-1.5 font-sans text-xs font-black uppercase border rounded-sm transition-all',
                  driveChoice === d
                    ? 'border-candle-gold bg-candle-gold/20 text-candle-gold'
                    : 'border-parchment-deep/30 text-parchment-deep/80 hover:border-parchment-deep/60',
                ].join(' ')}
              >
                {d[0].toUpperCase() + d.slice(1, 3)}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {offer.action !== 'info' && (
            <button
              onClick={handleAccept}
              disabled={offer.action === 'drive_refresh' && !driveChoice}
              className="flex-1 min-h-[40px] py-1.5 font-sans text-xs font-black uppercase tracking-widest bg-oxblood border border-ink text-cream hover:brightness-125 transition rounded-sm disabled:opacity-40"
            >
              {config.isIntercept ? 'Intercept' : 'Use'}
            </button>
          )}
          {offer.action === 'info' && <span className="flex-1" aria-hidden="true" />}
          <button
            onClick={passUp}
            className="min-h-[40px] px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-widest border border-parchment-deep/30 text-parchment-deep/80 hover:text-cream transition-colors rounded-sm"
          >
            {offer.action === 'info' ? 'Close' : holdsOwnMark ? 'Take the mark' : 'Not now'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-[2px] bg-parchment-deep/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-parchment-deep/50 transition-all"
            style={{ width: `${(timeLeft / autoDismissSeconds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
