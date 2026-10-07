import { lazy } from 'react';

// A screen whose code is loaded the first time it is shown (React.lazy), so the sign-in
// slip does not wait for the desks, the creator and the hub. load is the dynamic import
// and name the screen's named export.
//
// After a deploy, a tab that was open before it asks for chunk files the new build no
// longer has (nginx answers them with index.html, which is not a script). A failed load
// therefore reloads the page once, which fetches the new build and returns to the same
// screen (the stage is saved in this browser). A second failure within a minute goes on to
// the error slip (AppErrorBoundary), so a server that is really down never reloads in a loop.
const RELOAD_KEY = 'candela-screen-reload';
const RELOAD_WINDOW_MS = 60 * 1000;

const reloadOnce = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // no session storage: no way to tell a loop, so let the slip show
  }
  window.location.reload();
  return true;
};

export const lazyScreen = (load, name) => {
  const loadScreen = () => load().then((module) => ({ default: module[name] }));
  const Screen = lazy(() => loadScreen().catch((error) => {
    if (reloadOnce()) return new Promise(() => {}); // the page is going away
    throw error;
  }));
  // Fetches the code ahead of time; a failure here is left for the real load to handle
  Screen.preload = () => { loadScreen().catch(() => {}); };
  return Screen;
};

// Runs fn when the browser is idle (or after a short wait where requestIdleCallback is
// missing, as in Safari), and returns a function that cancels it.
export const whenIdle = (fn) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 1500);
  return () => window.clearTimeout(id);
};
