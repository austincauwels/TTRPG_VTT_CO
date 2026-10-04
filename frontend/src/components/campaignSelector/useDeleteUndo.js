import { useEffect, useState } from 'react';

// How many deletes keep their Undo at once. A further delete drops the oldest slip (the
// server would still undo it; the roster book just stops offering it).
export const UNDO_STACK = 3;
// Taken off the server's window, so a press near the end still reaches the server in time.
const UNDO_MARGIN_MS = 5000;
// The server's window (vtt/deletion.py UNDO_SECONDS), for a receipt that lacks one.
const SERVER_WINDOW_MS = 120 * 1000;

const NETWORK = 'Could not reach the server. Check your connection and try again.';

// How long this delete can be undone: the server's window from its receipt (deleted_at
// and undo_until are both server times, so this tab's clock does not matter), less the
// margin.
const undoWindowMs = (receipt) => {
  const span = Date.parse(receipt?.undo_until) - Date.parse(receipt?.deleted_at);
  return (Number.isFinite(span) && span > 0 ? span : SERVER_WINDOW_MS) - UNDO_MARGIN_MS;
};

// Why a delete did not go through. A 409 carries the server's reason (an investigator
// that is in a campaign after all); trying again would not help, so that is what shows.
const deleteError = (name, result) => {
  if (result.status === 0) return NETWORK;
  if (result.status === 409 && result.detail) return `${name} was not deleted. ${result.detail}`;
  if (result.status === 404) return `${name} was already deleted, perhaps in another tab.`;
  return `${name} was not deleted. Try again in a moment.`;
};

// Deleting rows of the roster book (docs/refactor/DELETION.md). A row goes once the
// server has deleted it, and a slip offers Undo for as long as the server allows it.
// Each delete keeps its own slip, newest first, up to UNDO_STACK. remove(id) and
// restore(id) are the store's actions; they resolve to { success, status, detail } plus
// the server's receipt.
//   deleted: [{ id, name, until, undoing, secondsLeft }]
export const useDeleteUndo = ({ remove, restore, describe = (item) => item.name }) => {
  const [slips, setSlips] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const drop = (id) => setSlips(list => list.filter(s => s.id !== id));
  const mark = (id, undoing) => setSlips(list => list.map(s => (s.id === id ? { ...s, undoing } : s)));

  const confirmDelete = async (item) => {
    const name = describe(item);
    setBusyId(item.id);
    setError('');
    const result = await remove(item.id);
    setBusyId(null);
    if (!result.success) {
      setError(deleteError(name, result));
      return;
    }
    const at = Date.now();
    setNow(at);
    const slip = { id: item.id, name, until: at + undoWindowMs(result), undoing: false };
    setSlips(list => [slip, ...list.filter(s => s.id !== item.id)].slice(0, UNDO_STACK));
  };

  const undo = async (id) => {
    const slip = slips.find(s => s.id === id);
    if (!slip || slip.undoing) return;
    setError('');
    mark(id, true);
    const result = await restore(id);
    if (result.success) { drop(id); return; }
    if (result.status === 404 || result.status === 409) {
      drop(id);
      setError(`Too late to undo. ${slip.name} stays deleted.`);
      return;
    }
    // Not reached the server: the slip stays while its time lasts
    mark(id, false);
    setError(NETWORK);
  };

  // The countdowns; a slip goes when its time is up (unless its undo is on its way)
  const any = slips.length > 0;
  useEffect(() => {
    if (!any) return undefined;
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setSlips(list => (list.some(s => s.until <= t && !s.undoing)
        ? list.filter(s => s.until > t || s.undoing)
        : list));
    }, 500);
    return () => clearInterval(tick);
  }, [any]);

  const deleted = slips.map(s => ({ ...s, secondsLeft: Math.max(1, Math.ceil((s.until - now) / 1000)) }));
  return { deleted, busyId, error, confirmDelete, undo };
};
