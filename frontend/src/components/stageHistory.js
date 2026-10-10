import { useEffect } from 'react';
import useGameStore from '../store/gameStore';

// The browser's Back and Forward around the chapter hub (playtest, browser-back-exits). The
// hub, the creator and the desks share one address, so each screen opened from the hub
// (the creator, a player's desk, the Lightkeeper's Desk) gets a history entry of its own
// over the hub's, tagged with its stage. Back, or a phone's back gesture, on one of them
// comes to the hub, and Forward opens it again. There is never more than one such entry:
// going from one of these screens straight to another (Create investigator on a desk, a
// rejoin from the creator) takes the entry over, and leaving for the hub any other way
// (Back to chapter hub, Escape in the creator, a save, a retired campaign, Sign out) steps
// back over it, so the history does not grow and Back from the hub leaves the site. A
// reload stays on the entry it is on and adds none. The account page and the emailed links
// keep entries of their own (account/accountAddress.js); AppRouter passes no stage while
// one of them shows.
const OWN_ENTRY = new Set(['CHARACTER_CREATION', 'DESK', 'GM_DASH']);

// The stage an entry was made for, or null for the hub's own. The creator's entries from
// before the desks had theirs say candelaCreator.
const entryStage = (state) => state?.candelaStage || (state?.candelaCreator ? 'CHARACTER_CREATION' : null);

// The current entry's state, tagged for stage
const tagged = (stage) => {
  const state = { ...(window.history.state || {}), candelaStage: stage };
  delete state.candelaCreator;
  return state;
};

// Whether Forward may open an entry's screen again. A desk needs its investigator, or the
// Lightkeeper's campaign, still in this browser: after a delete, a retired campaign or a
// sign-out it stays shut, and the page steps back to the hub's entry instead.
const canReopen = (stage, { accessSession, character, lastPlayedCampaign }) => {
  if (!accessSession) return false;
  if (stage === 'DESK') return character?.id != null && character.status !== 'pending';
  if (stage === 'GM_DASH') return lastPlayedCampaign?.type === 'gm';
  return stage === 'CHARACTER_CREATION';
};

const navigationType = () => {
  try { return window.performance?.getEntriesByType?.('navigation')?.[0]?.type; } catch { return undefined; }
};

// As the page loads, before the first screen draws (AppRouter calls it once, unless the
// page is the account page or an emailed link). This browser keeps the last screen shown,
// which need not be the one the entry the page loaded on was made for. Brought back by Back
// onto the hub's entry (after a reload on a desk, where Back loads the page again, or from
// another site), the page shows the hub, not the desk it kept, and a desk never opens and
// connects for a moment on the way. Brought back by Forward onto a desk's entry, it opens
// that desk again.
export const settleArrival = () => {
  if (typeof window === 'undefined') return;
  const store = useGameStore.getState();
  const entry = entryStage(window.history.state);
  if (OWN_ENTRY.has(store.stage) && !entry && navigationType() === 'back_forward') {
    useGameStore.setState({ stage: 'HOME' });
  } else if (store.stage === 'HOME' && entry && canReopen(entry, store)) {
    useGameStore.setState({ stage: entry });
  }
};

// The stage on show while useStageHistory is in charge, or null
let shown = null;
// Set while this page steps back over its own entry and waits for the popstate that says
// it landed; no other entry is pushed meanwhile. The timer stops the wait if the step goes
// nowhere (an entry with nothing under it), so the entries are kept again after it.
let stepping = null;

// Puts the entry right for the screen on show: its own entry for the creator or a desk,
// the hub's for anything else
const settle = () => {
  if (shown == null || stepping) return;
  const entry = entryStage(window.history.state);
  try {
    if (OWN_ENTRY.has(shown)) {
      if (!entry) window.history.pushState(tagged(shown), '');
      else if (entry !== shown) window.history.replaceState(tagged(shown), '');
    } else if (entry) {
      stepping = setTimeout(() => { stepping = null; }, 1500);
      window.history.back();
    }
  } catch { /* no history */ }
};

// Back and Forward, and the landing of this page's own step back
const onPopState = () => {
  if (stepping) {
    // Settled again, in case another screen opened before the step landed
    clearTimeout(stepping);
    stepping = null;
    settle();
    return;
  }
  if (shown == null) return;
  const store = useGameStore.getState();
  const entry = entryStage(window.history.state);
  if (OWN_ENTRY.has(shown) && !entry) store.setStage('HOME');
  else if (entry && entry !== shown && canReopen(entry, store)) store.setStage(entry);
  else settle();
};

// stage: the screen on show, or null while a page with an address of its own shows
export const useStageHistory = (stage) => {
  useEffect(() => {
    if (stage == null) return undefined;
    shown = stage;
    settle();
    window.addEventListener('popstate', onPopState);
    return () => {
      shown = null;
      window.removeEventListener('popstate', onPopState);
    };
  }, [stage]);
};
