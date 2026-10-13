import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';

const RESOURCES = [
  { label: 'Stitch', key: 'stitch' },
  { label: 'Refresh', key: 'refresh' },
  { label: 'Train', key: 'train' },
];

// Resource Management's earn-back (rulebook p. 41): at each milestone the circle earns back
// one Stitch, Refresh or Train, and the app asks for the circle's choice, one press each
// (Robert's decision 3, issue #66.4: the Lightkeeper used to add it by hand). Shown while
// one waits (circle.earn_backs, counted by the server, never more than the points missing);
// a full resource cannot be picked. On the circle page under Add Illumination and on the
// desk's charter abstract (titled false: its row names it).
export const EarnBackAsk = ({ className = '', titled = true }) => {
  const { circle, gmEarnBack, refusal } = useGameStore(useShallow(s => ({
    circle: s.circle, gmEarnBack: s.gmEarnBack, refusal: s.earnBackRefusal,
  })));
  const waiting = circle?.earn_backs || 0;
  // A press waits for the circle's answer, so a second press does not take a second one
  const [sentAt, setSentAt] = useState(0);
  const [busy, setBusy] = useState(false);
  // Any new circle (the answer, or the one a reconnect sends) or a refusal frees the
  // buttons, so a press lost with a dropped socket does not leave them disabled
  useEffect(() => { setBusy(false); }, [circle, refusal?.at]);
  if (!waiting) return null;
  const maxCap = circle.max_capacity || 1;
  const refused = refusal && sentAt && refusal.at >= sentAt ? refusal.detail : '';
  const choose = (key) => {
    if (busy) return;
    if (gmEarnBack(circle.id, key)) {
      setSentAt(Date.now());
      setBusy(true);
    }
  };

  return (
    <div role="group" aria-label="Resource Management: earn back one" className={`min-w-0 ${className}`}>
      {titled && (
        <p className="font-sans text-xs font-black uppercase tracking-widest text-ink">
          Resource Management: earn back {waiting === 1 ? 'one' : waiting}
        </p>
      )}
      <p className="font-serif italic text-sm leading-snug text-sepia">
        {titled ? 'A milestone passed. The circle chooses:' : `${waiting === 1 ? 'One' : waiting} from a milestone, the circle's choice:`}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {RESOURCES.map(({ label, key }) => {
          const full = (circle[key] ?? maxCap) >= maxCap;
          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              disabled={full || busy}
              aria-label={full ? `${label} is full` : `Earn back a ${label}`}
              className="flex-1 min-w-[5.5rem] min-h-[44px] px-2 flex flex-col items-center justify-center font-sans text-xs font-black uppercase tracking-widest border border-ink text-ink rounded-sm hover:bg-ink hover:text-cream transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              {label}
              {/* Under the name, so a narrow column does not break "Refresh · full" in two */}
              {full && <span className="font-serif italic text-xs font-normal normal-case tracking-normal leading-none">full</span>}
            </button>
          );
        })}
      </div>
      {refused && <p role="alert" className="mt-1 font-serif text-sm text-oxblood leading-snug">{refused}</p>}
    </div>
  );
};
