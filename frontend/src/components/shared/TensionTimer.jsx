import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { arrivedAt } from '../../store/circleArrivals';
import { tiltStyle } from './handPlaced';
import { CrossMark, PauseMark, PlayMark, TurnBackMark } from './InkMarks';

// ── The timer beside the hourglass ────────────────────────────────────────────────
// The Lightkeeper's countdown (backend vtt/countdown.py), on every desk while the
// Lightkeeper has it showing. Each circle_update carries the time left as the server sent
// it and whether it runs; a desk counts down from that and the moment the update arrived
// (store/circleArrivals.js: performance.now, never the desk's own clock), so a desk that
// opens mid-countdown shows the same time as the rest. A circle saved from an earlier visit
// shows no timer: it may have run on or changed since. The desk wakes only while the timer
// runs, just after each shown second turns, and not at all while it stands still. At 0:00
// it stops and turns oxblood. The chime and what a screen reader hears are the desk's own
// (TimerBell.jsx), so they come on every page of it, the hourglass's or not.

const MAX_MS = 3 * 60 * 60 * 1000; // the server's limit, three hours

// m:ss, or h:mm:ss from an hour. The shown second is rounded up, so a timer started at
// 0:30 shows 0:30 for its first second and 0:00 only when it has run out.
export const formatTime = (ms) => {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

// The time left on this desk now, counted from `at`, when the circle arrived. `active` is
// false while the timer is not on show, so a hidden timer schedules nothing either.
const useTimeLeft = (circle, at, active) => {
  const running = !!circle?.timer_running && at !== undefined;
  const sent = Math.max(0, Number(circle?.timer_remaining_ms) || 0);
  const leftNow = () => (running ? Math.max(0, sent - (performance.now() - at)) : sent);
  const [, wake] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    if (!running || !active) return undefined;
    let id;
    const next = () => {
      const ms = leftNow();
      // Just after the shown second turns (the 20ms keeps a late wake on the right side)
      if (ms > 0) id = setTimeout(() => { wake(); next(); }, (ms % 1000 || 1000) + 20);
    };
    next();
    return () => clearTimeout(id);
  }, [running, sent, at, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return leftNow();
};

// The ticket with the time on it, the same on every desk. `children` (the Lightkeeper's
// minutes and seconds) takes the time's place while the timer stands at its duration.
const Ticket = ({ state, left, children }) => {
  const ink = state === 'done' ? 'text-oxblood' : state === 'running' ? 'text-ink' : 'text-sepia';
  return (
    <div style={tiltStyle('tension-timer')}
      className={`hand-placed relative bg-parchment border shadow-[2px_5px_10px_rgba(0,0,0,0.6)] pl-5 pr-4 py-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 ${
        state === 'done' ? 'border-oxblood' : 'border-sepia/30'}`}>
      {/* The stub's perforation */}
      <span aria-hidden="true" className="absolute left-2 top-1 bottom-1 border-l border-dashed border-sepia/40" />
      {children || (
        <p role="timer" className={`font-mono tabular-nums text-xl leading-8 whitespace-nowrap ${ink}`}>
          {state === 'paused' && <PauseMark className="mr-1.5 align-[-0.05em] text-sepia" />}
          <span className="sr-only">Timer: </span>
          {formatTime(left)}
          {state === 'paused' && <span className="sr-only">, paused</span>}
          {state === 'done' && <span className="sr-only">, time's up</span>}
        </p>
      )}
    </div>
  );
};

const SEC = 1000;
const split = (ms) => {
  const total = Math.round((ms || 0) / SEC);
  return total ? { m: String(Math.floor(total / 60)), s: String(total % 60).padStart(2, '0') } : { m: '', s: '' };
};
const draftMs = ({ m, s }) => Math.min(MAX_MS, ((parseInt(m, 10) || 0) * 60 + Math.min(59, parseInt(s, 10) || 0)) * SEC);

// The minutes and seconds on the Lightkeeper's ticket. They go to the server when focus
// leaves them or on Enter (0:00 clears the timer); Escape puts them back. Either key keeps
// focus where it is, except that Enter on a touch screen puts its keyboard away. `draft`
// is what is typed and not yet sent.
const DurationFields = ({ shownMs, draft, setDraft, onCommit, disabled, minutesRef }) => {
  const value = draft || split(shownMs);
  // Seconds stop at 59: 1:75 would go to the server as 2:15
  const edit = (key) => (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setDraft({ ...value, [key]: key === 's' && Number(digits) > 59 ? '59' : digits });
  };
  const keys = (e) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    const input = e.currentTarget;
    if (e.key === 'Enter' && window.matchMedia?.('(pointer: coarse)').matches) { input.blur(); return; }
    e.preventDefault();
    setDraft(null);
    if (e.key === 'Enter' && draft) onCommit(draftMs(draft));
    requestAnimationFrame(() => input.select());
  };
  const field = 'bg-transparent text-ink placeholder-sepia/70 border-b border-dashed border-sepia focus:border-oxblood focus:outline-none disabled:opacity-60 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-[3.6ch]';
  return (
    <div className="font-mono tabular-nums text-xl leading-8 flex items-baseline"
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setDraft(null);
        if (draft) onCommit(draftMs(draft));
      }}>
      <input ref={minutesRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} enterKeyHint="done" autoComplete="off"
        aria-label="Timer minutes" placeholder="0" value={value.m} disabled={disabled}
        onFocus={(e) => e.target.select()} onChange={edit('m')} onKeyDown={keys}
        className={`${field} w-[3ch] text-right`} />
      <span aria-hidden="true" className="text-sepia">:</span>
      <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} enterKeyHint="done" autoComplete="off"
        aria-label="Timer seconds" placeholder="00" value={value.s} disabled={disabled}
        onFocus={(e) => e.target.select()} onChange={edit('s')} onKeyDown={keys}
        className={`${field} w-[2.4ch] text-left`} />
    </div>
  );
};

// The hourglass's timer. Players (`gm` false) see the ticket while the Lightkeeper shows a
// timer that has a duration; the Lightkeeper has the switch that shows it, the ticket with
// its minutes and seconds, and start or pause, reset and clear beside the hourglass's own
// − and +.
export const TensionTimer = ({ gm = false }) => {
  const { circle, socket } = useGameStore(useShallow((s) => ({ circle: s.circle, socket: s.socket, connection: s.connectionState })));
  const socketReady = socket?.readyState === WebSocket.OPEN;

  // When the server sent this circle; undefined for one saved from an earlier visit
  const at = arrivedAt(circle);
  const heard = at !== undefined;
  const duration = Math.max(0, Number(circle?.timer_duration_ms) || 0);
  const visible = !!circle?.timer_visible;
  const sentRunning = !!circle?.timer_running;
  const onShow = heard && visible && (gm || duration > 0);
  const left = useTimeLeft(circle, at, onShow);

  // The duration typed and not yet sent, and the one last sent, shown until the server's
  // update brings it back
  const [draft, setDraft] = useState(null);
  const [sentMs, setSentMs] = useState(null);
  useEffect(() => { setSentMs(null); }, [duration]);
  const shownMs = sentMs ?? duration;

  const state = !heard ? 'unheard'
    : !duration && !sentRunning ? 'none'
    : sentRunning && left > 0 ? 'running'
      : left <= 0 ? 'done'
        : left >= duration ? 'set' : 'paused';

  const send = (action, extra = {}) => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'gm_timer', payload: { circle_id: circle?.id, action, ...extra } }));
  };
  const commit = (ms) => {
    if (ms === shownMs) return;
    if (ms > 0) { setSentMs(ms); send('set', { duration_ms: Math.max(SEC, ms) }); }
    else if (duration) { setSentMs(0); send('clear'); }
  };

  // Reset and clear go still once the server answers, which would leave focus nowhere: it
  // moves on to start after a reset and to the minutes after a clear (not on a touch
  // screen, where the minutes would raise its keyboard)
  const startRef = useRef(null);
  const minutesRef = useRef(null);
  const pressed = useRef(null);
  useEffect(() => {
    const p = pressed.current;
    if (!p || !p.button.disabled) return;
    pressed.current = null;
    const lost = !document.activeElement || document.activeElement === document.body || document.activeElement === p.button;
    if (!lost) return;
    if (p.next === 'start') startRef.current?.focus();
    else if (!window.matchMedia?.('(pointer: coarse)').matches) minutesRef.current?.focus();
  });
  const press = (action, next) => (e) => { pressed.current = { button: e.currentTarget, next }; send(action); };

  if (!gm) return onShow ? <Ticket state={state} left={left} /> : null;

  const button = 'w-9 h-9 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 rounded-full bg-gm-slate border border-moonlight-steel text-cream text-sm hover:bg-moonlight-steel hover:text-gm-night transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none';
  const editing = state === 'none' || state === 'set';
  const startLabel = state === 'paused' ? 'Resume the timer' : 'Start the timer';
  return (
    <div className="flex flex-col items-center gap-3">
      {/* The switch: just the hourglass, or the hourglass and its timer, on every desk */}
      <button type="button" role="switch" aria-checked={visible} aria-label="Timer beside the hourglass"
        onClick={() => send(visible ? 'hide' : 'show')} disabled={!socketReady || !heard}
        className="group flex items-center gap-2.5 px-2 min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] font-sans font-bold text-xs uppercase tracking-widest text-moonlight-steel hover:text-cream transition-colors disabled:opacity-40 disabled:cursor-wait">
        <span aria-hidden="true">Timer</span>
        <span aria-hidden="true" className={`relative w-8 h-[18px] rounded-full border transition-colors ${
          visible ? 'bg-moonlight-steel/35 border-moonlight-steel' : 'bg-gm-night border-moonlight-steel/60'}`}>
          <span className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform motion-reduce:transition-none ${
            visible ? 'translate-x-[14px] bg-cream' : 'bg-moonlight-steel/70'}`} />
        </span>
      </button>

      {onShow && (
        <>
          <Ticket state={state} left={left}>
            {editing && <DurationFields shownMs={shownMs} draft={draft} setDraft={setDraft} onCommit={commit}
              disabled={!socketReady} minutesRef={minutesRef} />}
          </Ticket>
          <div className="flex items-center gap-2.5">
            {state === 'running' ? (
              <button type="button" onClick={() => send('pause')} disabled={!socketReady}
                aria-label="Pause the timer" title="Pause" className={button}>
                <PauseMark />
              </button>
            ) : (
              <button type="button" ref={startRef} onClick={() => {
                // A time typed and not yet sent (a press that did not take focus from the
                // fields) goes first, so the timer starts from what the ticket shows
                if (draft) { setDraft(null); commit(draftMs(draft)); }
                send('start');
              }} disabled={!socketReady || !(shownMs || (draft && draftMs(draft)))}
                aria-label={startLabel} title={state === 'paused' ? 'Resume' : 'Start'} className={button}>
                <PlayMark className="translate-x-px" />
              </button>
            )}
            <button type="button" onClick={press('reset', 'start')} disabled={!socketReady || editing}
              aria-label={`Reset the timer to ${formatTime(duration)}`} title="Reset" className={button}>
              <TurnBackMark />
            </button>
            <button type="button" onClick={press('clear', 'minutes')} disabled={!socketReady || state === 'none'}
              aria-label="Clear the timer" title="Clear" className={button}>
              <CrossMark />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
