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
  // Login and register run without a token; their 401 is a wrong password, not an expired session.
  if (response.status === 401 && token) onUnauthorized();
  return response;
};

// Close code the server uses when a WebSocket arrives without a valid token.
export const WS_CLOSE_UNAUTHENTICATED = 4401;
