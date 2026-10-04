import { useSyncExternalStore } from 'react';

// Roll sounds (owner's request, Robert Gater, 2026-10-04). Both files come from Pixabay's
// free sound library (Pixabay Content License: free to use, no attribution required):
//   public/sounds/full-success.mp3  a vibraphone chord, for a Full Success: a counting
//                                   result of 6 that is not a Critical
//   public/sounds/failure.mp3       for a counting result of exactly 1 (the lower die of a
//                                   zero-rating roll, the kept die of a gilded roll)
// Nothing plays for a Mixed success, a Critical success, or a Failure of 2 or 3.
//
// The cue is the roll's line in the activity log. The server sends it to every desk at the
// table (the players and the GM) once, when the final result is known: after a gilded
// choice, never for a secret roll, and never again on a reconnect, since the log is not
// replayed. Sound is on by default and remembered per browser. Browsers block audio until
// the page has had a click or a key press; until then a sound fails silently.
//
// Paper (owner's request, 2026-10-04; the file is free to use, his decision):
//   public/sounds/paper.mp3         for the person whose own screen moves paper: a notebook
//                                   page turning, the GM ticket flipping over. Played
//                                   softer than the roll sounds, and a turn that follows
//                                   another within a moment stays quiet, so fast turns do
//                                   not pile up. It is under the same on/off switch.

const STORAGE_KEY = 'candela-roll-sounds';
const SOURCES = { full_success: 'sounds/full-success.mp3', failure: 'sounds/failure.mp3', paper: 'sounds/paper.mp3' };
const VOLUME = { paper: 0.45 };

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
// Counts the real plays of each sound, so an unlock that settles late never stops a roll's
// sound that started in the meantime
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

const play = (key) => {
  if (!enabled) return;
  try {
    const audio = audioFor(key);
    if (!audio) return;
    realPlays[key] = (realPlays[key] || 0) + 1;
    audio.muted = false;
    audio.currentTime = 0;
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  } catch { /* no audio in this browser */ }
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

export const playRollSound = (text) => {
  const key = soundForRollLine(text);
  if (key) play(key);
};

// A page turn or a flip on this screen. Turns closer together than this share one sound.
const PAPER_GAP_MS = 260;
let lastPaperAt = 0;
export const playPaperSound = () => {
  const now = Date.now();
  if (now - lastPaperAt < PAPER_GAP_MS) return;
  lastPaperAt = now;
  play('paper');
};
