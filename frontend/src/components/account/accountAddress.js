// The account page has an address of its own, /account, so the browser's Back button leaves
// it and a reload stays on it. /confirm-email?token=... is the link in the email that
// changes the address (docs/refactor/AUTH.md). Both sit under the build's base: the preview
// is served from /preview/. AppRouter reads them with these helpers and redraws when
// watchAddress reports a change.
const BASE = import.meta.env.BASE_URL || '/';
const ACCOUNT_PATH = /\/account\/?$/;
const CONFIRM_EMAIL_PATH = /\/confirm-email\/?$/;
const ADDRESS_EVENT = 'candela:address';

export const accountHref = `${BASE.endsWith('/') ? BASE : `${BASE}/`}account`;

export const accountPageOpen = () => typeof window !== 'undefined' && ACCOUNT_PATH.test(window.location.pathname);

// The token of the email link, an empty string when the link has none, or null on any other page.
export const emailTokenFromAddress = () => {
  if (typeof window === 'undefined' || !CONFIRM_EMAIL_PATH.test(window.location.pathname)) return null;
  return new URLSearchParams(window.location.search).get('token') || '';
};

const announce = () => window.dispatchEvent(new Event(ADDRESS_EVENT));

const replaceAddress = (href) => {
  try { window.history.replaceState(null, '', href); } catch { /* no history */ }
  announce();
};

// From the account card: a history entry of its own, so Back returns to where it was opened.
export const openAccountPage = () => {
  try { window.history.pushState({ candelaAccount: true }, '', accountHref); } catch { /* no history */ }
  announce();
};

// Back to where the page was opened from. A page reached by a reload or a typed address
// has no entry of ours to go back over, so the app's own address takes its place.
export const leaveAccountPage = () => {
  if (window.history.state?.candelaAccount) {
    window.history.back();
    return;
  }
  replaceAddress(BASE);
};

// From the email link's page: the account page in its place, or the app.
export const showAccountPageInstead = () => replaceAddress(accountHref);
export const leaveEmailLink = () => replaceAddress(BASE);

// Calls onChange whenever the address may have changed (Back, Forward, or the helpers above).
export const watchAddress = (onChange) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener(ADDRESS_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(ADDRESS_EVENT, onChange);
  };
};
