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

const STORAGE_KEY = 'candela-roll-sounds';
const SOURCES = { full_success: 'sounds/full-success.mp3', failure: 'sounds/failure.mp3' };

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
  }
  return players[key];
};

// Load both files when a desk opens, so the first sound is not late
export const primeRollSounds = () => { Object.keys(SOURCES).forEach(audioFor); };

const play = (key) => {
  if (!enabled) return;
  try {
    const audio = audioFor(key);
    if (!audio) return;
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
