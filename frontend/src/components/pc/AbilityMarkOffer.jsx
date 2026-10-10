import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';

// Offers stay up long enough to read and decide during play, and the countdown pauses
// while the pointer is over the offer or focus is inside it.
const MIN_OFFER_SECONDS = 20;
// An offer the server takes an answer to for a while (an ally's Behind Me or
// Premonitions, Non-Combatant's drive point) says how long: expires_in seconds from when
// it arrived. Its card lasts that long, less this margin for the answer's way back, and
// never pauses, since the server's window does not (playtest, ability-offers-expire: the
// card vanished after 20 seconds of a 2-minute window).
const WINDOW_MARGIN_SECONDS = 3;

const isTextEntry = (el) => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
const clock = (seconds) => (seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`);

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
  "Non-Combatant": {
    icon: "GiHeartInside",
    description: (name) => `${name} took a mark. If they have hurt no one this assignment, recover 1 drive point of your choice.`,
    actionType: "drive_refresh",
  },
  "Circle of Protection": {
    icon: "GiShield",
    description: "The Circle of Protection around you soaks this Body mark.",
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
  // timedOut: the countdown ran out, which the log does not call the player's choice
  const passUp = (timedOut = false) => (holdsRef.current ? declineAbilityMark(holdsRef.current, timedOut) : dismissAbilityMarkOffer());

  const windowed = Number.isFinite(offer?.expires_in);
  const autoDismissSeconds = windowed ? Math.max(1, offer.expires_in - WINDOW_MARGIN_SECONDS)
    : offer?.action === 'info' || config?.isIntercept ? MIN_OFFER_SECONDS : 30;

  useEffect(() => {
    if (!offer) { setTimeLeft(null); setDriveChoice(null); return; }
    if (windowed) {
      // Counted from when the offer arrived, so one that waited behind another is not given more
      const deadline = (offer.received_at ?? Date.now()) + autoDismissSeconds * 1000;
      const tick = () => {
        const left = Math.ceil((deadline - Date.now()) / 1000);
        if (left <= 0) { setTimeLeft(null); passUp(true); return false; }
        setTimeLeft(left);
        return true;
      };
      if (!tick()) return undefined;
      const interval = setInterval(() => { if (!tick()) clearInterval(interval); }, 1000);
      return () => clearInterval(interval);
    }
    setTimeLeft(autoDismissSeconds);
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft(prev => {
        if (prev == null) return prev;
        if (prev <= 1) { passUp(true); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [offer?.seq]);  // each offer gets its full time, even a second one of the same ability

  // A keyboard user is taken to the offer as it opens, unless they are typing (a note, a
  // form), and back where they were when it closes: it sat last in the Tab order, 34 Tabs
  // from the top, and dropped focus to the page after Use (ability-offers-expire)
  const boxRef = useRef(null);
  const primaryRef = useRef(null);
  useEffect(() => {
    if (!offer) return undefined;
    const before = document.activeElement;
    if (!isTextEntry(before)) {
      (primaryRef.current || boxRef.current?.querySelector('button'))?.focus({ preventScroll: true });
    }
    const box = boxRef.current;
    return () => {
      // Closing: focus that was inside the offer goes back
      const inside = box && box.contains(document.activeElement);
      if ((inside || document.activeElement === document.body) && before && before !== document.body && before.isConnected) {
        before.focus({ preventScroll: true });
      }
    };
  }, [offer?.seq]);

  if (!offer || !config) return null;

  const charName = offer.character_name || 'an ally';
  // Death Defy names how many marks of the harm it escapes
  const desc = offer.ability === 'Death Defy' && offer.count > 1
    ? `If an enemy dealt these ${offer.count} marks, escape unscathed: you take none of them.`
    : typeof config.description === 'function' ? config.description(charName) : config.description;

  const handleAccept = () => {
    if (config.isIntercept) {
      interceptMark(offer.ability, offer.character_id, offer.mark_type);
    } else if (offer.action === 'drive_refresh') {
      if (!driveChoice) return;
      resolveAbilityMark(offer.ability, driveChoice);
    } else if (offer.action === 'info') {
      dismissAbilityMarkOffer();
    } else {
      // The offer's id goes back with the answer: one the server has since closed is ignored
      resolveAbilityMark(offer.ability, offer.action, offer.offer_id);
    }
    setDriveChoice(null);
  };

  return (
    <div
      ref={boxRef}
      role="alertdialog"
      aria-label={`${offer.ability} offer`}
      aria-describedby={`offer-desc-${offer.seq}`}
      onKeyDown={(e) => {
        // Escape lets the offer go, unless letting it go would land a mark: that stays a press
        if (e.key === 'Escape' && !holdsOwnMark) { e.stopPropagation(); passUp(); }
      }}
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
          <span className="font-mono tabular-nums text-xs text-parchment-deep/80" aria-hidden="true">
            {timeLeft == null ? '' : paused && !windowed ? `Paused · ${clock(timeLeft)}` : `${clock(timeLeft)} left`}
          </span>
        </div>

        <p id={`offer-desc-${offer.seq}`} className="font-serif text-sm text-parchment-deep mb-3 leading-relaxed">{desc}</p>

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
              ref={offer.action === 'drive_refresh' ? undefined : primaryRef}
              onClick={handleAccept}
              disabled={offer.action === 'drive_refresh' && !driveChoice}
              className="flex-1 min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] py-1.5 font-sans text-xs font-black uppercase tracking-widest bg-oxblood border border-ink text-cream hover:brightness-125 transition rounded-sm disabled:opacity-40"
            >
              {config.isIntercept ? 'Intercept' : 'Use'}
            </button>
          )}
          {offer.action === 'info' && <span className="flex-1" aria-hidden="true" />}
          <button
            onClick={() => passUp()}
            className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-widest border border-parchment-deep/30 text-parchment-deep/80 hover:text-cream transition-colors rounded-sm"
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
