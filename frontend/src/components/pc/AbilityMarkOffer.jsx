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
    description: "Escape unscathed — no marks taken from this enemy.",
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
    <div className="fixed bottom-6 right-6 z-[9998] w-72 animate-fadeIn">
      <div className="bg-[#1a1311] border border-[#b8a060] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.7)] px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{config.icon}</span>
            <span className="font-mono text-xs font-black uppercase tracking-widest text-[#d4af37]">
              {offer.ability}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#a08040]/50">{timeLeft}s</span>
        </div>

        <p className="font-mono text-[11px] text-[#a08040]/80 mb-3 leading-relaxed">{desc}</p>

        {/* Drive picker for Adrenaline Rush */}
        {offer.action === 'drive_refresh' && (
          <div className="flex gap-1.5 mb-2">
            {['nerve', 'cunning', 'intuition'].map(d => (
              <button
                key={d}
                onClick={() => setDriveChoice(d)}
                className={[
                  'flex-1 py-1 font-mono text-[10px] font-black uppercase border rounded-sm transition-all',
                  driveChoice === d
                    ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]'
                    : 'border-[#a08040]/30 text-[#a08040]/50 hover:border-[#a08040]/60',
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
              className="flex-1 py-1 font-mono text-[10px] font-black uppercase tracking-widest bg-[#3a2010] border border-[#b8a060] text-[#d4af37] hover:bg-[#b8860b] hover:text-[#1a1311] transition-all rounded-sm disabled:opacity-30"
            >
              {config.isIntercept ? 'Intercept' : 'Use'}
            </button>
          )}
          {offer.action === 'info' && (
            <p className="flex-1 font-mono text-[10px] text-[#d4af37]/60 italic text-center">
              Ask the GM now.
            </p>
          )}
          <button
            onClick={dismissAbilityMarkOffer}
            className="px-3 py-1 font-mono text-[10px] border border-[#5a3010]/40 text-[#a08040]/40 hover:text-[#a08040] transition-colors rounded-sm"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-[2px] bg-[#3a2a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d4af37]/40 transition-all"
            style={{ width: `${(timeLeft / autoDismissSeconds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
