// ── The hourglass timer's chime ───────────────────────────────────────────────────
// A small brass bell rung twice, on every desk that counts the Lightkeeper's timer down
// to 0:00 while it is on show (components/shared/TimerBell.jsx), whichever page of the
// desk is open, under the table's sound switch like the rest. It is drawn here with Web
// Audio, so no file loads for it: each stroke is a few bell partials, struck at once and
// dying away, the higher ones sooner. It is as loud as the Full Success chord (the same RMS as the chord's first
// 0.4 s; its peak is -11 dB).
//
// Browsers start audio only from a tap or a key press. The audio is woken by the first one
// on the desk (iPhones need that) and rests between chimes; until a tap, it fails silently.

// [ratio to the stroke's pitch, level, seconds to die away]
const PARTIALS = [[1, 1, 2.2], [2, 0.32, 1.5], [3, 0.24, 0.9], [4.2, 0.1, 0.5], [5.4, 0.06, 0.3]];
const PITCH = 988;      // B5
const STROKES = [0, 0.34]; // seconds after the chime starts; the second a little softer
const LEVEL = 0.21;     // the chord's loudness
const RING_MS = 3000;   // the chime has died away by then

let context = null;
const audio = () => {
  if (context) return context;
  const Context = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Context) return null;
  try { context = new Context(); } catch { context = null; }
  return context;
};

const stroke = (ctx, when, level) => {
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(ctx.destination);
  PARTIALS.forEach(([ratio, amp, decay]) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = PITCH * ratio;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(amp, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    osc.connect(env);
    env.connect(out);
    osc.start(when);
    osc.stop(when + decay + 0.05);
  });
};

let resting = null;
const rest = (ctx) => {
  clearTimeout(resting);
  resting = setTimeout(() => { ctx.suspend().catch(() => {}); }, RING_MS);
};

// The first tap or key press on the desk wakes the audio, and it rests again at once
const WAKE_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
let listening = false;
const stopListening = () => {
  if (!listening) return;
  WAKE_EVENTS.forEach((type) => document.removeEventListener(type, wake, true));
  listening = false;
};
function wake() {
  const ctx = audio();
  if (!ctx) { stopListening(); return; }
  ctx.resume().then(() => { stopListening(); rest(ctx); }, () => {});
}

// A desk with the timer opens: listen for the tap that wakes the audio
export const primeTimerChime = () => {
  if (listening || context || typeof document === 'undefined') return;
  WAKE_EVENTS.forEach((type) => document.addEventListener(type, wake, { capture: true, passive: true }));
  listening = true;
};

// Time's up. A chime the browser holds back is dropped, never rung late.
export const playTimerChime = () => {
  // A page nobody has touched yet may not start audio; asking would only log a warning
  if (!context && typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const ctx = audio();
  if (!ctx) return;
  const asked = performance.now();
  ctx.resume().then(() => {
    if (performance.now() - asked > 500) { rest(ctx); return; }
    const start = ctx.currentTime + 0.02;
    STROKES.forEach((at, i) => stroke(ctx, start + at, i ? LEVEL * 0.8 : LEVEL));
    rest(ctx);
  }, () => {});
};
