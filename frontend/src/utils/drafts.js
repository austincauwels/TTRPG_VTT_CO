// What an account has half-written in this browser: the Notebook's unsent writing
// (components/shared/NotebookView.jsx) and the creator's investigator in progress
// (components/CharacterCreator.jsx), both kept in localStorage under the account's id.
// An explicit Sign out clears them (#20); a session the server ended keeps them, so the
// writer finds them after signing in again. The Notebook also holds the writing in its
// page, and registers here to forget that too.
const forgetters = [];
export const onDraftsCleared = (fn) => { forgetters.push(fn); };

export const notebookDraftPrefix = (userId) => `candela-notebook-draft:${userId}:`;

export function clearAccountDrafts(userId) {
  if (userId == null) return;
  const notebook = notebookDraftPrefix(userId);
  const creator = `candela-creator-draft:${userId}`;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(notebook) || k === creator || k === `${creator}:portrait`)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch { /* storage blocked: nothing kept there to clear */ }
  forgetters.forEach((fn) => fn(userId));
}
