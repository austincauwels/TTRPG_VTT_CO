import { useSyncExternalStore } from 'react';

// The table's sounds, all under one on/off switch (the loudspeaker on the felt).
//
// Roll results (owner's request, Robert Gater, 2026-10-04). Both files come from Pixabay's
// free sound library (Pixabay Content License: free to use, no attribution required):
//   public/sounds/full-success.mp3  a vibraphone chord, for a Full Success: a counting
//                                   result of 6 that is not a Critical
//   public/sounds/failure.mp3       for a counting result of exactly 1 (the lower die of a
//                                   zero-rating roll, the kept die of a gilded roll)
// Nothing plays for a Mixed success, a Critical success, or a Failure of 2 or 3. The cue is
// the roll's line in the activity log. The server sends it to every desk at the table (the
// players and the GM) once, when the final result is known: after a gilded choice, never
// for a secret roll, and never again on a reconnect, since the log is not replayed.
//
// Owner's round 3 items 19 to 21 (the files are free to use or his own, his decision):
//   public/sounds/dice-roll.mp3     dice on the felt, for everyone at the table, as they
//                                   start to tumble on the roller's desk (the roll lands,
//                                   or a gilded die is kept): the roller's desk with its own
//                                   tumble, the other desks when the server's dice_thrown
//                                   arrives. A server without dice_thrown leaves them the
//                                   roll's log line, and they hear the dice then. The result
//                                   sound waits until the dice have landed, so the two
//                                   never sound at once.
//   public/sounds/tension-tick.mp3  the pocket watch ticking, for everyone, when the GM
//                                   raises the tension: once for each slice now filled (the
//                                   file holds four ticks a second apart). Lowering it is
//                                   silent.
//   public/sounds/paper.mp3         for the person whose own screen moves paper: the hub's
//                                   book opening and closing, the GM ticket flipping over,
//                                   notebook page turns, the creator's role cards turning,
//                                   circle and report cards turning, the dispatch going
//                                   out. Played softer, and a turn that follows another
//                                   within a moment stays quiet, so fast turns do not pile
//                                   up.
// Sound is on by default and remembered per browser. Browsers block audio until the page
// has had a click or a key press; until then a sound fails silently.

const STORAGE_KEY = 'candela-roll-sounds';
const SOURCES = {
  full_success: 'sounds/full-success.mp3',
  failure: 'sounds/failure.mp3',
  paper: 'sounds/paper.mp3',
  dice_roll: 'sounds/dice-roll.mp3',
  tension_tick: 'sounds/tension-tick.mp3',
};
// The files differ in loudness; these bring them to one level under the chord (measured
// peaks: chord -8.8 dB, dice -4.5 dB, ticks -1.9 dB, paper -20 dB and kept soft)
const VOLUME = { paper: 0.45, dice_roll: 0.6, tension_tick: 0.5 };

const readSetting = () => {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
};

let enabled = readSetting();
const listeners = new Set();

export const setRollSoundsEnabled = (on) => {
  enabled = !!on;
  try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* private window */ }
  listeners.forEach((listener) => listener());
};

// [on, setOn] for the toggle beside the dice tray; every desk on the page shares it
export const useRollSounds = () => {
  const on = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => enabled,
  );
  return [on, setRollSoundsEnabled];
};

const players = {};
const audioFor = (key) => {
  if (typeof Audio === 'undefined') return null;
  if (!players[key]) {
    players[key] = new Audio(`${import.meta.env.BASE_URL}${SOURCES[key]}`);
    players[key].preload = 'auto';
    if (VOLUME[key] != null) players[key].volume = VOLUME[key];
  }
  return players[key];
};

// Phones (iOS Safari above all) only let an audio element play from script once it has
// been started inside a tap or a key press. A roll's sound is started by a server
// message, never by a tap, so on the first tap or key press anywhere on the page each
// element is started muted and stopped at once. That unlocks it for the rest of the
// visit; until then a sound fails silently. The listeners go once all are unlocked.
const unlocked = new Set();
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
let listening = false;
// Counts the real plays of each sound, so an unlock that settles late never stops a sound
// that started in the meantime
const realPlays = {};

const unlockAll = () => {
  Object.keys(SOURCES).forEach((key) => {
    if (unlocked.has(key)) return;
    const audio = audioFor(key);
    if (!audio) return;
    const ticket = realPlays[key] || 0;
    try {
      audio.muted = true;
      const started = audio.play();
      const settle = (ok) => {
        if ((realPlays[key] || 0) === ticket) {
          try { audio.pause(); audio.currentTime = 0; } catch { /* not loaded yet */ }
        }
        audio.muted = false;
        if (ok) unlocked.add(key);
        if (unlocked.size === Object.keys(SOURCES).length) stopListening();
      };
      if (started && typeof started.then === 'function') started.then(() => settle(true), () => settle(false));
      else settle(true);
    } catch { audio.muted = false; }
  });
};

function stopListening() {
  if (!listening || typeof document === 'undefined') return;
  UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlockAll, true));
  listening = false;
}

const listenForUnlock = () => {
  if (listening || typeof document === 'undefined') return;
  if (unlocked.size === Object.keys(SOURCES).length) return;
  UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, unlockAll, { capture: true, passive: true }));
  listening = true;
};

// Load the files when a desk opens, so the first sound is not late, and unlock them on
// the next tap or key press
export const primeRollSounds = () => { Object.keys(SOURCES).forEach(audioFor); listenForUnlock(); };

// The hub loads the paper sound while it is idle, so the first book or ticket turn does not
// set up the audio element in the middle of its animation
export const warmPaperSound = () => { if (enabled) audioFor('paper'); };

// A sound cut short (the watch's ticks) stops at its own time; a new play cancels that
const stopTimers = {};

const play = (key, { stopAfterMs } = {}) => {
  if (!enabled) return;
  try {
    const audio = audioFor(key);
    if (!audio) return;
    realPlays[key] = (realPlays[key] || 0) + 1;
    clearTimeout(stopTimers[key]);
    audio.muted = false;
    audio.currentTime = 0;
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
    if (stopAfterMs != null) {
      const ticket = realPlays[key];
      stopTimers[key] = setTimeout(() => {
        if (realPlays[key] === ticket) { try { audio.pause(); } catch { /* gone */ } }
      }, stopAfterMs);
    }
  } catch { /* no audio in this browser */ }
};

// ── Dice ──────────────────────────────────────────────────────────────────────────
// How long the dice take to land on the felt (the tumble is 0.5s, staggered by die): the
// result sound waits this long after the dice start, here or on another desk.
const LAND_MS = 560;
// A roll's log line that arrives this soon after this desk's own dice started belongs to
// that roll (the server sends the result first and the line right after it)
const OWN_LINE_MS = 2500;
let lastTumbleAt = -Infinity;

// The dice start tumbling: on this desk (a roll lands on the felt, or a gilded die is kept),
// or on another desk at the table (dice_thrown)
export const playDiceTumble = () => {
  lastTumbleAt = Date.now();
  play('dice_roll');
};

// The server's roll lines end in a dash, the counting result, a middle dot and the outcome
// ("Edith Marlowe rolled sneak, dash, 4 · Full Success."), for a player's roll, the
// Lightkeeper's roll and a resistance reroll alike.
const LOGGED_RESULT = / \u2014 (\d+) \u00b7 (Critical Success|Full Success|Mixed Success|Failure)\b/;

export const soundForRollLine = (text) => {
  const match = typeof text === 'string' ? LOGGED_RESULT.exec(text) : null;
  if (!match) return null;
  if (match[2] === 'Full Success') return 'full_success';
  if (match[2] === 'Failure' && Number(match[1]) === 1) return 'failure';
  return null;
};

// A roll's line in the log. If this desk's own dice are tumbling it is that roll's line,
// and its result sounds once they land. Any other desk hears the dice now and the result
// after them.
export const playRollSound = (text) => {
  if (typeof text !== 'string' || !LOGGED_RESULT.test(text)) return;
  const sinceTumble = Date.now() - lastTumbleAt;
  const own = sinceTumble < OWN_LINE_MS;
  lastTumbleAt = -Infinity;
  if (!own) play('dice_roll');
  const key = soundForRollLine(text);
  if (!key) return;
  const wait = own ? Math.max(0, LAND_MS - sinceTumble) : LAND_MS;
  setTimeout(() => play(key), wait);
};

// ── The pocket watch ──────────────────────────────────────────────────────────────
// The file's four ticks start at 0, 1.05, 2.05 and 3.05 seconds; it stops in the quiet
// after the tick it needs.
const TICK_STOPS_MS = [null, 720, 1720, 2740];

// The GM raised the tension to `level` (1 to 4)
export const playTensionTick = (level) => {
  const n = Math.max(1, Math.min(4, Math.round(Number(level) || 1)));
  play('tension_tick', n < 4 ? { stopAfterMs: TICK_STOPS_MS[n] } : undefined);
};

// ── Paper ─────────────────────────────────────────────────────────────────────────
// A page turn or a flip on this screen. Turns closer together than this share one sound.
const PAPER_GAP_MS = 260;
let lastPaperAt = 0;
export const playPaperSound = () => {
  const now = Date.now();
  if (now - lastPaperAt < PAPER_GAP_MS) return;
  lastPaperAt = now;
  play('paper');
};
