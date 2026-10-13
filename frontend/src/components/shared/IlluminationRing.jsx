import React from 'react';
import { SafeIcon } from './SafeIcon';

// The Illumination track drawn as a clock face of twelve pips around the candle: pip 12 at
// the top, so the milestones (3, 6 and 9) sit at those clock positions. Pip n is n x 30
// degrees clockwise from the top. The candle warms as the track fills and is lit when full.
// `onPick` makes the pips buttons in order 1 to 12 (the Lightkeeper's ring, 44px targets on
// touch that never overlap); without it the ring is one image for a screen reader.
export const TRACK_SIZE = 12;
const MILESTONES = [3, 6, 9];

export function IlluminationRing({ illum, onPick, compact = false }) {
  const lit = Math.min(illum, TRACK_SIZE);
  const warmth = Math.round((lit / TRACK_SIZE) * 100);
  const live = typeof onPick === 'function';
  const pips = Array.from({ length: TRACK_SIZE }, (_, i) => {
    const n = i + 1;
    const rad = (n * 30 * Math.PI) / 180;
    const filled = n <= illum;
    const milestone = MILESTONES.includes(n);
    const title = milestone ? `Illumination ${n}, a milestone` : `Illumination ${n}`;
    const dot = (
      <span aria-hidden="true"
        className={`illum-dot rounded-full border flex items-center justify-center shadow-inner transition-all ${
          milestone ? 'w-6 h-6 ring-2 ring-offset-1 ring-candle-gold' : 'w-[1.125rem] h-[1.125rem]'
        } ${filled ? 'bg-ink border-ink text-cream' : 'bg-transparent border-ink/50'}`}>
        {milestone && <span className={`w-1.5 h-1.5 rounded-full bg-candle-gold ${filled ? 'opacity-100' : 'opacity-30'}`} />}
      </span>
    );
    const style = { '--dx': Math.sin(rad).toFixed(4), '--dy': (-Math.cos(rad)).toFixed(4) };
    if (!live) {
      return <span key={n} className="illum-pip" style={style} title={title}>{dot}</span>;
    }
    const current = filled && illum === n;
    return (
      <button key={n} type="button" className="illum-pip illum-pip-live" style={style} title={title}
        onClick={() => onPick(current ? n - 1 : n)}
        aria-label={current ? `Illumination ${n}, current. Press to lower to ${n - 1}` : `Set Illumination to ${n}`}>
        {dot}
      </button>
    );
  });
  const candle = (
    <span aria-hidden="true" className="illum-candle" style={{ '--warm': `${warmth}%` }} data-lit={lit >= TRACK_SIZE ? 'full' : undefined}>
      <SafeIcon name="GiCandleLight" size={compact ? 44 : 64} />
    </span>
  );
  const cls = `illum-ring ${compact ? 'illum-ring-compact' : ''} mx-auto`;
  return live
    ? <div className={cls}>{candle}{pips}</div>
    : <div className={cls} role="img" aria-label={`Illumination ${illum} of ${TRACK_SIZE}`}>{candle}{pips}</div>;
}
