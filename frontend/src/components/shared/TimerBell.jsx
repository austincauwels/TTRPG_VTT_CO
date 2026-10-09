import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import { arrivedAt } from '../../store/circleArrivals';
import { useRollSounds } from '../../game/rollSounds';
import { playTimerChime, primeTimerChime } from '../../game/timerChime';

// ── The timer's bell ──────────────────────────────────────────────────────────────
// What the Lightkeeper's timer says on a desk, whichever page of it is open. Each desk
// mounts this once at its root (gm/OperationsPanel.jsx, pc/MainDeskView.jsx), so 0:00
// chimes (game/timerChime.js) on the Lightkeeper's circle page, notebook, map or a
// member's sheet, and on a player's notebook, as it does beside the hourglass, where the
// ticket (TensionTimer.jsx) only draws the time. It counts as the ticket does, from the
// time left a circle carries and the moment it arrived (store/circleArrivals.js), and
// wakes once, at the end. A screen reader hears the timer start, pause and run out from
// one region at the end of the page's body.

// A desk that wakes this long after the end (a tab in the background) does not chime
const CHIME_LATE_MS = 2000;

export const TimerBell = () => {
  const circle = useGameStore((s) => s.circle);
  const [soundOn] = useRollSounds();
  const sound = useRef(soundOn);
  sound.current = soundOn;
  useEffect(() => { primeTimerChime(); }, []);

  // What a screen reader hears: start, pause and time's up only
  const [said, setSaid] = useState('');
  // The same words twice in a row differ by a no-break space, so they are heard again
  const say = (text) => setSaid((prev) => (prev === text ? `${text}\u00a0` : text));

  const before = useRef(null);
  useEffect(() => {
    if (arrivedAt(circle) === undefined) return;
    const running = !!circle?.timer_running;
    const duration = Math.max(0, Number(circle?.timer_duration_ms) || 0);
    const was = before.current;
    before.current = { running, duration };
    if (!was || !circle?.timer_visible) return;
    if (running && !was.running) say('Timer started.');
    else if (!running && was.running && duration === was.duration
      && circle.timer_remaining_ms > 0 && circle.timer_remaining_ms < duration) say('Timer paused.');
  }, [circle]); // eslint-disable-line react-hooks/exhaustive-deps

  // A timer that is hidden, cleared or switched off has nothing to say: the last words
  // ("Time's up.") would otherwise stay in the region until the next timer starts
  useEffect(() => {
    if (arrivedAt(circle) === undefined) return;
    if (!circle?.timer_visible || !(Number(circle?.timer_duration_ms) > 0)) setSaid('');
  }, [circle]);

  // Time's up is heard only on a desk that saw it count down to 0:00, and the chime only
  // where this desk's own count got there, on time. A hidden timer is not being watched,
  // so one that ran out while hidden says nothing when it is shown again, and a desk that
  // opens after the end (from the hub, or a reload) says nothing of it either.
  const counting = useRef(false);
  useEffect(() => {
    const at = arrivedAt(circle);
    if (at === undefined || !circle?.timer_visible) { counting.current = false; return undefined; }
    const sent = Math.max(0, Number(circle.timer_remaining_ms) || 0);
    const end = at + sent;
    const ring = () => {
      counting.current = false;
      say("Time's up.");
      if (sound.current && performance.now() - end < CHIME_LATE_MS) playTimerChime();
    };
    if (circle.timer_running && end > performance.now()) {
      counting.current = true;
      const id = setTimeout(ring, end - performance.now());
      return () => clearTimeout(id);
    }
    // A circle still running whose end had passed by the time it was looked at (another
    // change to the circle sent in the timer's last moment): the end this desk was counting
    // toward has come, so it rings as on time
    if (circle.timer_running && counting.current) { ring(); return undefined; }
    // The server's word that it ran out came before this desk's own count got there (a
    // reconnect): it is heard, with no chime
    if (counting.current && !circle.timer_running && !sent && circle.timer_duration_ms > 0) say("Time's up.");
    counting.current = false;
    return undefined;
  }, [circle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === 'undefined') return null;
  return createPortal(<p role="status" className="sr-only">{said}</p>, document.body);
};
