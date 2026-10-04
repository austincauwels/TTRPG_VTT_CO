import { useEffect, useRef, useState } from 'react';

export const DELETE_UNDO_SECONDS = 10;

// Deleting a row of the roster book (docs/refactor/DELETION.md). The row goes once the
// server has deleted it, and a slip offers Undo for a few seconds (the server allows two
// minutes, so a slow connection still makes it). remove(id) and restore(id) are the
// store's actions; they resolve to { success, status }.
//   deleted: null | { id, name, until, undoing }
export const useDeleteUndo = ({ remove, restore, describe = (item) => item.name }) => {
  const [deleted, setDeleted] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef(null);

  const end = () => {
    clearTimeout(timer.current);
    timer.current = null;
    setDeleted(null);
  };

  const confirmDelete = async (item) => {
    const name = describe(item);
    setBusyId(item.id);
    setError('');
    const result = await remove(item.id);
    setBusyId(null);
    if (!result.success) {
      setError(result.status === 0
        ? 'Could not reach the server. Check your connection and try again.'
        : `${name} was not deleted. Try again in a moment.`);
      return;
    }
    clearTimeout(timer.current);
    setDeleted({ id: item.id, name, until: Date.now() + DELETE_UNDO_SECONDS * 1000, undoing: false });
    setNow(Date.now());
    timer.current = setTimeout(end, DELETE_UNDO_SECONDS * 1000);
  };

  const undo = async () => {
    if (!deleted || deleted.undoing) return;
    const { id, name } = deleted;
    setDeleted(d => d && { ...d, undoing: true });
    const result = await restore(id);
    if (result.success) { end(); return; }
    if (result.status === 404 || result.status === 409) {
      end();
      setError(`Too late to undo. ${name} stays deleted.`);
      return;
    }
    // Not reached the server: the slip stays while its time lasts
    setDeleted(d => d && { ...d, undoing: false });
    setError('Could not reach the server. Check your connection and try again.');
  };

  // The countdown on the Undo button
  useEffect(() => {
    if (!deleted) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [deleted?.id]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const secondsLeft = deleted ? Math.max(1, Math.ceil((deleted.until - now) / 1000)) : 0;
  return { deleted, busyId, error, confirmDelete, undo, secondsLeft };
};
