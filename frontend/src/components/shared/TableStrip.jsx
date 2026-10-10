import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { arrivedAt } from '../../store/circleArrivals';
import { SafeIcon } from './SafeIcon';
import { formatTime, useTimeLeft } from './TensionTimer';

// ── The table strip ───────────────────────────────────────────────────────────────
// The hourglass's tension, the running timer and the newest line of the log in one slim
// band, for the places where the hourglass itself is out of sight: a phone's sheet, a
// tablet's page (the rail falls to the foot there), the notebook, and the Lightkeeper's
// pages that replace the table column (playtest, hourglass-offscreen-small-screens and
// section-hides-table-column). It draws nothing while the tension is 0, no timer shows
// and, without `withLog`, there is nothing to say. It counts as the ticket does
// (TensionTimer.jsx), from the time left the circle carries.
export const TableStrip = ({ withLog = false, className = '' }) => {
  const { circle, activityLog } = useGameStore(useShallow((s) => ({ circle: s.circle, activityLog: s.activityLog })));
  const at = arrivedAt(circle);
  const duration = Math.max(0, Number(circle?.timer_duration_ms) || 0);
  const onShow = at !== undefined && !!circle?.timer_visible && duration > 0;
  const left = useTimeLeft(circle, at, onShow);
  const tension = Math.max(0, Math.min(4, Number(circle?.tension_clock) || 0));
  const last = withLog ? activityLog[activityLog.length - 1] : null;
  if (tension === 0 && !onShow && !last) return null;

  const done = onShow && left <= 0;
  const paused = onShow && !circle?.timer_running && !done && left < duration;
  return (
    <div data-desk="table-strip" className={`flex items-center gap-x-3 min-w-0 px-3 py-1 bg-parchment text-ink border-b border-ink/30 font-sans text-xs ${className}`}>
      {(tension > 0 || onShow) && (
        <p className="shrink-0 flex items-center gap-x-2.5">
          <span className="flex items-center gap-1 font-black uppercase tracking-widest text-sepia">
            <SafeIcon name="GiHourglass" size={14} />
            <span className="sr-only">Tension </span>{tension}<span aria-hidden="true">/4</span><span className="sr-only"> of 4</span>
          </span>
          {onShow && (
            <span role="timer" className={`font-mono tabular-nums text-sm ${done ? 'text-oxblood font-bold' : ''}`}>
              <span className="sr-only">Timer: </span>{formatTime(left)}
              {paused && <span className="font-sans text-sepia"> (paused)</span>}
              {done && <span className="sr-only">, time's up</span>}
            </span>
          )}
        </p>
      )}
      {last && (
        <p className="min-w-0 flex-1 truncate font-serif italic text-sm text-sepia" title={last.text}>
          <span className="sr-only">Newest log line: </span>{last.text}
        </p>
      )}
    </div>
  );
};

// A dot for something new on a desk part, until the player has looked at it
export const NewDot = ({ className = '' }) => (
  <>
    <span aria-hidden="true" data-new-dot="" className={`inline-block w-2.5 h-2.5 rounded-full bg-oxblood border border-cream/70 shadow-sm ${className}`} />
    <span className="sr-only"> (new)</span>
  </>
);
