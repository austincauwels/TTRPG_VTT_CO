import useGameStore from './gameStore';

// ── When each circle reached this desk ────────────────────────────────────────────
// The hourglass's timer (components/shared/TensionTimer.jsx) counts down from the time
// left a circle carries, as the server sent it, and the moment the circle arrived here
// (performance.now, never the desk's own clock). The moment is taken here, as the circle
// lands in the store: main.jsx loads this file with the page, and the timer's own code
// loads later with the desk, often after the socket's first frames are in. A circle the
// page found saved from an earlier visit gets no moment, since nothing says how old it
// is: the timer waits for the server's.
//
// The server sends a socket's first frames together as it opens, the character and then
// the circle (backend vtt/ws/endpoint.py). Handling the character redraws the desk before
// the circle's frame is read, a tenth or a fifth of a second later on a computer, so the
// first circle on each socket takes the moment that socket's first frame was read.

const arrivals = new WeakMap();
const firstFrames = new WeakMap(); // socket -> { at, used }

const watchSocket = (socket) => {
  if (!socket || firstFrames.has(socket)) return;
  const first = { at: null, used: false };
  firstFrames.set(socket, first);
  // Capturing, so it runs before the store's onmessage and the redraw that sets off
  socket.addEventListener('message', () => { first.at = performance.now(); }, { capture: true, once: true });
};

useGameStore.subscribe((state, prev) => {
  if (state.socket !== prev.socket) watchSocket(state.socket);
  const { circle } = state;
  if (!circle || circle === prev.circle || typeof circle !== 'object') return;
  if (useGameStore.persist?.hasHydrated && !useGameStore.persist.hasHydrated()) return;
  const first = state.socket ? firstFrames.get(state.socket) : null;
  let at = performance.now();
  if (first && !first.used) {
    first.used = true;
    if (first.at != null) at = first.at;
  }
  arrivals.set(circle, at);
});

// When this circle arrived (performance.now()), or undefined for one saved from before
export const arrivedAt = (circle) => (circle && typeof circle === 'object' ? arrivals.get(circle) : undefined);
