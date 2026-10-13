import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { arrivedAt } from '../../store/circleArrivals';
import { SafeIcon } from './SafeIcon';
import { PauseMark, PlayMark } from './InkMarks';
import { formatTime, useTimeLeft } from './TensionTimer';
import { rulebookLogText } from '../../game/outcomes';

// ── The table strip ───────────────────────────────────────────────────────────────
// The hourglass's tension, the running timer and the newest line of the log in one slim
// band, for the places where the hourglass itself is out of sight: a phone's sheet, a
// tablet's page (the rail falls to the foot there), the notebook, and the Lightkeeper's
// pages that replace the table column (playtest, hourglass-offscreen-small-screens and
// section-hides-table-column). It draws nothing while the tension is 0, no timer shows
// and, without `withLog`, there is nothing to say. It counts as the ticket does
// (TensionTimer.jsx), from the time left the circle carries. On the Lightkeeper's desk
// (`gm`) it also carries the tension's − and + and, when a timer shows, its Start or Pause,
// so the clock and the timer stay in reach with a sheet, the circle, the notebook or the
// map open (fix round 7, 45.1), and it draws even at tension 0.
const stripButton = 'shrink-0 w-9 h-9 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 rounded-full bg-gm-slate border border-moonlight-steel text-cream font-black text-sm hover:bg-moonlight-steel hover:text-gm-night transition-colors active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait aria-disabled:opacity-40 aria-disabled:cursor-default';

export const TableStrip = ({ withLog = false, gm = false, className = '' }) => {
  const { circle, activityLog, socket } = useGameStore(useShallow((s) => ({ circle: s.circle, activityLog: s.activityLog, socket: s.socket })));
  const socketReady = socket?.readyState === WebSocket.OPEN;
  const at = arrivedAt(circle);
  const duration = Math.max(0, Number(circle?.timer_duration_ms) || 0);
  const onShow = at !== undefined && !!circle?.timer_visible && duration > 0;
  const left = useTimeLeft(circle, at, onShow);
  const tension = Math.max(0, Math.min(4, Number(circle?.tension_clock) || 0));
  const last = withLog ? activityLog[activityLog.length - 1] : null;
  if (!gm && tension === 0 && !onShow && !last) return null;
  // The server's lines in the rulebook's words, as the log shows them; chat as written
  const lastText = last && (last.type === 'chat' ? last.text : rulebookLogText(last.text));

  const done = onShow && left <= 0;
  const running = onShow && !!circle?.timer_running && !done;
  const send = (type, payload) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, payload: { circle_id: circle?.id || 1, ...payload } }));
  };
  const adjust = (inc) => {
    const next = Math.max(0, Math.min(4, tension + inc));
    if (next !== tension) send('gm_update_circle', { tension_clock: next });
  };
  const paused = onShow && !circle?.timer_running && !done && left < duration;
  return (
    <div data-desk="table-strip" className={`flex items-center gap-x-3 min-w-0 px-3 py-1 bg-parchment text-ink border-b border-ink/30 font-sans text-xs ${className}`}>
      {(gm || tension > 0 || onShow) && (
        <p className="shrink-0 flex items-center gap-x-2.5">
          {gm && (
            <button type="button" onClick={() => adjust(-1)} disabled={!socketReady} aria-disabled={tension <= 0}
              aria-label="Lower tension by one" className={stripButton}>−</button>
          )}
          <span className="flex items-center gap-1 font-black uppercase tracking-widest text-sepia">
            <SafeIcon name="GiHourglass" size={14} />
            <span className="sr-only">Tension </span>{tension}<span aria-hidden="true">/4</span><span className="sr-only"> of 4</span>
          </span>
          {gm && (
            <button type="button" onClick={() => adjust(1)} disabled={!socketReady} aria-disabled={tension >= 4}
              aria-label="Raise tension by one" className={stripButton}>+</button>
          )}
          {onShow && (
            <span role="timer" className={`font-mono tabular-nums text-sm ${done ? 'text-oxblood font-bold' : ''}`}>
              <span className="sr-only">Timer: </span>{formatTime(left)}
              {paused && <span className="font-sans text-sepia"> (paused)</span>}
              {done && <span className="sr-only">, time's up</span>}
            </span>
          )}
          {gm && onShow && !done && (
            <button type="button" onClick={() => send('gm_timer', { action: running ? 'pause' : 'start' })} disabled={!socketReady}
              aria-label={running ? 'Pause the timer' : paused ? 'Resume the timer' : 'Start the timer'}
              title={running ? 'Pause' : paused ? 'Resume' : 'Start'} className={stripButton}>
              {running ? <PauseMark /> : <PlayMark className="translate-x-px" />}
            </button>
          )}
        </p>
      )}
      {last && (
        <p className="min-w-0 flex-1 truncate font-serif italic text-sm text-sepia" title={lastText}>
          <span className="sr-only">Newest log line: </span>{lastText}
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
