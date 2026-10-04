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
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      // Validation errors, such as "Value error, Username must be 2–32 characters"
      return detail.map((d) => String(d.msg || '').replace(/^Value error, /, '')).join(' ');
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
