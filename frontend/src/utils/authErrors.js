// Plain-language messages and rules for the login screen. The server's detail strings
// come from backend/vtt/routers/auth.py and the request models in backend/vtt/schemas.py.
// A message we do not recognise is shown as the server wrote it.

// The server's rules for a new account (check_new_username and RegisterRequest), shown
// before submit. Only the length is checked here; the server checks the characters.
export const USERNAME_RULE = '2 to 32 characters: letters, digits, spaces, dots, dashes or underscores.';
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_RULE = `At least ${PASSWORD_MIN_LENGTH} characters.`;

const KNOWN = [
  [/^invalid credentials/i, 'That username and password do not match.'],
  [/identification is already claimed/i, 'That username is already taken. Choose another one.'],
  [/correspondence address is already registered/i, 'An account with that email address already exists. Sign in to it instead.'],
  [/username must be 2.32/i, 'A username needs 2 to 32 characters.'],
  [/username contains invalid characters/i, 'A username can only use letters, digits, spaces, dots, dashes and underscores.'],
  [/password must be at least 8/i, `A password needs at least ${PASSWORD_MIN_LENGTH} characters.`],
  [/^password too long/i, 'That password is too long.'],
  [/^username too long/i, 'That username is too long.'],
  [/^email too long/i, 'That email address is too long.'],
];

export const authErrorText = (detail) => {
  const text = String(detail || '').replace(/^Value error, /, '');
  const hit = KNOWN.find(([re]) => re.test(text));
  return hit ? hit[1] : text;
};

// Checks run before a new account is sent; each returns a message or ''.
const length = (value) => [...value].length;

export const usernameProblem = (username) => {
  if (!username.trim()) return 'Choose a username.';
  const n = length(username);
  return n < 2 || n > 32 ? 'A username needs 2 to 32 characters.' : '';
};

export const newPasswordProblem = (password) => {
  if (length(password) < PASSWORD_MIN_LENGTH) return `A password needs at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (length(password) > PASSWORD_MAX_LENGTH) return `A password can have at most ${PASSWORD_MAX_LENGTH} characters.`;
  return '';
};

export const emailProblem = (email) => {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  return /^[^\s@]+@[^\s@]+$/.test(value) ? '' : 'That does not look like an email address. Check it and try again.';
};
