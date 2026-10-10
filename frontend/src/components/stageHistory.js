import { useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { accountPageOpen, emailTokenFromAddress, undoTokenFromAddress } from './account/accountAddress';

// The browser's Back and Forward around the chapter hub (playtest, browser-back-exits). The
// hub, the creator and the desks share one address, so each screen opened from the hub
// (the creator, a player's desk, the Lightkeeper's Desk) gets a history entry of its own
// over the hub's, tagged with its stage. Back, or a phone's back gesture, on one of them
// comes to the hub, and Forward opens it again. There is never more than one such entry:
// going from one of these screens straight to another (Create investigator on a desk, a
// rejoin from the creator) takes the entry over, and leaving for the hub any other way
// (Back to chapter hub, Escape in the creator, a save, a retired campaign, Sign out) steps
// back over it, or makes it the hub's when an earlier page added it, so the history does
// not grow. A reload stays on the entry it is on and adds none. The account page and the
// emailed links keep entries of their own (account/accountAddress.js); AppRouter passes no
// stage while one of them shows.
const OWN_ENTRY = new Set(['CHARACTER_CREATION', 'DESK', 'GM_DASH']);

// This page's mark on the entries it adds. The hub's entry under one of them belongs to
// this page too, so stepping back to it is instant. Under an entry an earlier page added
// (before a reload, or before a phone put the tab away and loaded it again) lies that
// page's entry, and stepping back to it would load the whole site again: that entry
// becomes the hub's in place instead, and Back from the hub passes the older one once.
const PAGE = Math.random().toString(36).slice(2);

// The stage an entry was made for, or null for the hub's own. The creator's entries from
// before the desks had theirs say candelaCreator.
const entryStage = (state) => state?.candelaStage || (state?.candelaCreator ? 'CHARACTER_CREATION' : null);

// Which desk a screen is: the investigator's, or the Lightkeeper's campaign. Forward opens
// a desk again only for the one its entry was made for.
const channelOf = (stage, { character, lastPlayedCampaign }) => {
  if (stage === 'DESK') return character?.id ?? null;
  if (stage === 'GM_DASH') return lastPlayedCampaign?.type === 'gm' ? lastPlayedCampaign.campaignCode || null : null;
  return null;
};

// The current entry's state, tagged for stage; a new entry also carries this page's mark
const tagged = (stage, channel, isNew = false) => {
  const state = { ...(window.history.state || {}), candelaStage: stage, candelaFor: channel };
  if (isNew) state.candelaPage = PAGE;
  delete state.candelaCreator;
  return state;
};

// The current entry's state as the hub's own
const untagged = () => {
  const state = { ...(window.history.state || {}) };
  ['candelaStage', 'candelaFor', 'candelaPage', 'candelaCreator'].forEach((k) => delete state[k]);
  return state;
};

// Whether Forward may open an entry's screen again. A desk needs the same investigator, or
// the same campaign still in the Lightkeeper's ledger, in this browser: after a delete, a
// retired campaign or a sign-out it stays shut, and the page steps back to the hub's entry
// instead.
const canReopen = (state, store) => {
  const stage = entryStage(state);
  if (!store.accessSession || !stage) return false;
  if (stage === 'CHARACTER_CREATION') return true;
  const channel = channelOf(stage, store);
  if (channel == null || String(channel) !== String(state.candelaFor)) return false;
  if (stage === 'DESK') return store.character.status !== 'pending';
  return store.gmCampaigns.some((c) => c.campaign_code === channel);
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
  const state = window.history.state;
  const entry = entryStage(state);
  if (OWN_ENTRY.has(store.stage) && !entry && navigationType() === 'back_forward') {
    useGameStore.setState({ stage: 'HOME' });
  } else if (store.stage === 'HOME' && entry && canReopen(state, store)) {
    useGameStore.setState({ stage: entry });
  }
};

// The account page and the emailed links, which AppRouter shows over the stage
const onOwnAddress = () => accountPageOpen() || emailTokenFromAddress() !== null || undoTokenFromAddress() !== null;

// The stage on show while useStageHistory is in charge, or null
let shown = null;
// Set while this page steps back over its own entry and waits for the popstate that says
// it landed; no other entry is pushed meanwhile. The timer stops the wait if the step goes
// nowhere, so the entries are kept again after it.
let stepping = null;
// What the screen on show does in place of closing when Back would lose work (holdBack)
let held = null;

// Puts the entry right for the screen on show: its own entry for the creator or a desk,
// the hub's for anything else
const settle = () => {
  if (shown == null || stepping) return;
  const state = window.history.state;
  const entry = entryStage(state);
  try {
    if (OWN_ENTRY.has(shown)) {
      const channel = channelOf(shown, useGameStore.getState());
      if (!entry) window.history.pushState(tagged(shown, channel, true), '');
      else if (entry !== shown || state.candelaFor !== channel) window.history.replaceState(tagged(shown, channel), '');
    } else if (entry && state.candelaPage === PAGE) {
      stepping = setTimeout(() => { stepping = null; }, 1500);
      window.history.back();
    } else if (entry) {
      window.history.replaceState(untagged(), '');
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
  // Forward onto the account page: the screen under it stays as it is, for when it closes
  if (shown == null || onOwnAddress()) return;
  const store = useGameStore.getState();
  const state = window.history.state;
  const entry = entryStage(state);
  if (OWN_ENTRY.has(shown) && !entry) {
    if (held) {
      // The screen stays, on an entry of its own again, and asks about the work instead
      settle();
      held();
    } else {
      store.setStage('HOME');
    }
  } else if (entry && entry !== shown && canReopen(state, store)) store.setStage(entry);
  else settle();
};

// While the screen on show has work Back would lose (a drawing on the sketch sheet), Back
// keeps the screen and calls onHeld instead. Returns the function that lets Back go again.
export const holdBack = (onHeld) => {
  held = onHeld;
  return () => { if (held === onHeld) held = null; };
};

// stage: the screen on show, or null while a page with an address of its own shows
export const useStageHistory = (stage) => {
  // A desk's entry follows its investigator or campaign, should that change on the desk
  const channel = useGameStore((s) => (stage == null ? null : channelOf(stage, s)));
  useEffect(() => {
    if (stage == null) return undefined;
    shown = stage;
    settle();
    window.addEventListener('popstate', onPopState);
    return () => {
      shown = null;
      window.removeEventListener('popstate', onPopState);
    };
  }, [stage, channel]);
};
