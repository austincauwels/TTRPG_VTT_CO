import React, { useEffect, useState } from 'react';
import useGameStore from '../../store/gameStore';

const ABILITY_OFFER_CONFIG = {
  "Adrenaline Rush": {
    icon: "⚡",
    description: "Refresh a drive point of your choice.",
    actionType: "drive_refresh",
  },
  "Compartmentalization": {
    icon: "🧠",
    description: "Burn 1 Nerve resistance to soak this Brain mark.",
    actionType: "soak",
  },
  "Steel Mind": {
    icon: "🧠",
    description: "Burn 1 Intuition resistance to soak this Brain mark.",
    actionType: "soak",
  },
  "In the Trenches": {
    icon: "🛡",
    description: "Burn 1 Cunning resistance to soak this Body mark.",
    actionType: "soak",
  },
  "Death Defy": {
    icon: "💀",
    description: "Escape unscathed: you take no marks from this enemy.",
    actionType: "escape",
  },
  "Let Them In": {
    icon: "👁",
    description: "Ask the GM one question about the source of the bleed.",
    actionType: "info",
  },
  "Behind Me": {
    icon: "🛡",
    description: (name) => `Take ${name}'s mark instead (spend 1 Nerve).`,
    actionType: "intercept",
    isIntercept: true,
  },
  "Premonitions": {
    icon: "🌫",
    description: (name) => `Soak ${name}'s mark (burn 1 Intuition resistance).`,
    actionType: "soak",
    isIntercept: true,
  },
};

export const AbilityMarkOffer = () => {
  const { abilityMarkOffer, resolveAbilityMark, interceptMark, dismissAbilityMarkOffer } = useGameStore();
  const [driveChoice, setDriveChoice] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const offer = abilityMarkOffer;
  const config = offer ? ABILITY_OFFER_CONFIG[offer.ability] : null;

  const autoDismissSeconds = offer?.action === 'info' ? 8 : config?.isIntercept ? 8 : 15;

  useEffect(() => {
    if (!offer) { setTimeLeft(null); setDriveChoice(null); return; }
    setTimeLeft(autoDismissSeconds);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { dismissAbilityMarkOffer(); return null; }
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
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:w-72 lg:bottom-6 lg:right-6 z-[9998] animate-fadeIn">
      <div className="bg-ink border border-parchment-deep/40 rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.7)] px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{config.icon}</span>
            <span className="font-sans text-xs font-black uppercase tracking-widest text-cream">
              {offer.ability}
            </span>
          </div>
          <span className="font-mono tabular-nums text-xs text-parchment-deep/80">{timeLeft}s</span>
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
              className="flex-1 py-1.5 font-sans text-xs font-black uppercase tracking-widest bg-oxblood border border-ink text-cream hover:brightness-125 transition rounded-sm disabled:opacity-40"
            >
              {config.isIntercept ? 'Intercept' : 'Use'}
            </button>
          )}
          {offer.action === 'info' && (
            <p className="flex-1 font-serif text-sm text-parchment-deep italic text-center">
              Ask the GM now.
            </p>
          )}
          <button
            onClick={dismissAbilityMarkOffer}
            className="px-3 py-1.5 font-sans text-xs border border-parchment-deep/30 text-parchment-deep/80 hover:text-cream transition-colors rounded-sm" aria-label="Dismiss"
          >
            ✕
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
