import { authErrorText } from './authErrors';

export const apiUrl = (path) => `${import.meta.env.VITE_API_URL || ''}${path}`;

// Every API call goes through apiFetch, which sends the login token as
// "Authorization: Bearer <token>". The store registers how to read the token and
// what to do when the server answers 401 (the token is missing, expired or no
// longer valid): configureApiAuth({ getToken, onUnauthorized }).
let getToken = () => null;
let onUnauthorized = () => {};

export const configureApiAuth = (handlers) => {
  getToken = handlers.getToken;
  onUnauthorized = handlers.onUnauthorized;
};

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  // The sign-in calls run without a token; their 401 is a wrong password, not an expired session.
  if (response.status === 401 && token) onUnauthorized();
  return response;
};

// Close code the server uses when a WebSocket arrives without a valid token.
export const WS_CLOSE_UNAUTHENTICATED = 4401;

// ==========================================
// SIGN IN WITH GOOGLE (docs/refactor/AUTH.md)
// ==========================================
// These run on the login screen, before there is a session. Each resolves to the
// response body, or throws an Error whose message can be shown to the player as is
// (error.status holds the HTTP status).

const authErrorMessage = async (response) => {
  if (response.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  try {
    const { detail } = await response.json();
    if (typeof detail === 'string') return authErrorText(detail);
    if (Array.isArray(detail) && detail.length) {
      // Validation errors, such as "Value error, Username must be 2–32 characters"
      return detail.map((d) => authErrorText(d.msg)).join(' ');
    }
  } catch {
    // not JSON
  }
  return 'Something went wrong. Please try again.';
};

const postAuth = async (path, body) => {
  let response;
  try {
    response = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('The server could not be reached. Please check your connection and try again.');
  }
  if (!response.ok) {
    const error = new Error(await authErrorMessage(response));
    error.status = response.status;
    throw error;
  }
  return response.json();
};

// Password sign-in and registration, the fallback to Google. The same requests the
// login screen always sent; a 403 means the server has turned password login off.
export const signInWithPassword = (username, password) =>
  postAuth('/api/auth/login', { username, password });

export const registerWithPassword = (username, email, password) =>
  postAuth('/api/auth/register', { username, email, password });

// Which ways of signing in the server allows: { google, password_login }, or null
// when that cannot be read (the login screen then offers both).
export const fetchAuthConfig = async () => {
  try {
    const response = await apiFetch('/api/auth/config');
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

// The credential is the ID token Google Identity Services hands the page. The answer
// is a session (the same as a password login) or, for a Google account that belongs
// to no user yet, { needs_account: true, link_token, suggested_name, email }.
export const signInWithGoogle = (credential) => postAuth('/api/auth/google', { credential });

// The two ways on from needs_account. Both answer with a session.
export const linkGoogleAccount = (linkToken, username, password) =>
  postAuth('/api/auth/google/link', { link_token: linkToken, username, password });

export const createGoogleAccount = (linkToken, username) =>
  postAuth('/api/auth/google/create', { link_token: linkToken, username });

// ==========================================
// THE SIGNED-IN USER'S ACCOUNT (docs/refactor/AUTH.md)
// ==========================================

// { userId, name, email, googleLinked } for the signed-in user, or null when it cannot
// be read. The account menu offers "Link Google account" while googleLinked is false.
export const fetchAccount = async () => {
  try {
    const response = await apiFetch('/api/auth/me');
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

// Links the Google account of a credential from Google Identity Services to the
// signed-in user. The server asks for proof beyond the session: the account's current
// password, or a Google account whose email is the account's email (then the password
// can be left out). Resolves to the updated account ({ ..., googleLinked: true }); the
// session and the password stay as they are. Throws like the sign-in calls: 403 when
// the password is wrong or is needed (the message says which), 409 when this account
// or that Google account is linked already, 400 when Google refused.
export const linkGoogleToAccount = (credential, password) =>
  postAuth('/api/auth/me/google', password ? { credential, password } : { credential });

// ==========================================
// PASSWORD RESET BY EMAIL (docs/refactor/AUTH.md)
// ==========================================

// Asks for a reset email. Resolves to { ok: true } whether or not an account uses the
// address, so the page shows the same text either way.
export const requestPasswordReset = async (email) => {
  try {
    return await postAuth('/api/auth/password-reset', { email });
  } catch (error) {
    // Limited per address (3 an hour) as well as per connection.
    if (error.status === 429) error.message = 'Too many reset emails have been asked for. Please try again in an hour.';
    throw error;
  }
};

// Sets the new password with the token from the emailed link (/reset-password?token=...).
// Resolves to a session, the same as a password login; every earlier session has ended.
// Throws with status 400 when the link has expired or has been used.
export const confirmPasswordReset = (token, password) =>
  postAuth('/api/auth/password-reset/confirm', { token, password });

// ==========================================
// PORTRAITS
// ==========================================

// The largest picture the server takes as a portrait (backend/vtt/portraits.py), in
// bytes, as File.size counts them. Forge takes the same pictures.
export const PORTRAIT_MAX_BYTES = 10 * 1024 * 1024;

// Sets a character's portrait to a data URL (FileReader.readAsDataURL of the picture),
// or clears it with null. Allowed for the owner and for the campaign's GM. Resolves to
// the character as the WebSocket sends it; throws an Error with .status (413 too large,
// 422 not a picture, 403 not allowed) and a message that can be shown as is.
export const setCharacterPortrait = async (characterId, profilePic) => {
  let response;
  try {
    response = await apiFetch(`/api/investigators/${characterId}/portrait`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_pic: profilePic ?? null }),
    });
  } catch {
    throw new Error('The server could not be reached. Please check your connection and try again.');
  }
  if (!response.ok) {
    const error = new Error(response.status === 413
      ? 'The portrait is too large. Choose a picture of at most 10 MB.'
      : await authErrorMessage(response));
    error.status = response.status;
    throw error;
  }
  return response.json();
};
