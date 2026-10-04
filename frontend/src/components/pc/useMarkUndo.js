import { useEffect, useRef, useState } from 'react';

export const MARK_UNDO_SECONDS = 5;

export const MARK_NAME = { body: 'Body', brain: 'Brain', bleed: 'Bleed' };

// A mark the player takes is held here for five seconds before it goes to the server, so a
// mis-tap can be undone: the server has no message that removes a mark. Taking another mark
// sends the held one at once. Leaving the sheet or closing the page sends a held mark
// rather than dropping it, because the player did mean to take it.
export const useMarkUndo = (takeMark) => {
  const heldRef = useRef(null);          // { type, timer }
  const takeMarkRef = useRef(takeMark);
  takeMarkRef.current = takeMark;
  const [held, setHeld] = useState(null); // { type, until }
  const [now, setNow] = useState(() => Date.now());
  const [sendError, setSendError] = useState('');

  const send = () => {
    const h = heldRef.current;
    if (!h) return;
    clearTimeout(h.timer);
    heldRef.current = null;
    setHeld(null);
    const ok = takeMarkRef.current(h.type);
    setSendError(ok === false
      ? `The ${MARK_NAME[h.type]} mark was not taken: the desk is not connected to the table. Take it again once the connection is back.`
      : '');
  };

  const hold = (type) => {
    send();
    setSendError('');
    const until = Date.now() + MARK_UNDO_SECONDS * 1000;
    heldRef.current = { type, timer: setTimeout(send, MARK_UNDO_SECONDS * 1000) };
    setHeld({ type, until });
    setNow(Date.now());
  };

  const undo = () => {
    const h = heldRef.current;
    if (!h) return;
    clearTimeout(h.timer);
    heldRef.current = null;
    setHeld(null);
  };

  // The countdown on the Undo button
  useEffect(() => {
    if (!held) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [held]);

  useEffect(() => {
    window.addEventListener('pagehide', send);
    return () => {
      window.removeEventListener('pagehide', send);
      send();
    };
  }, []);

  const secondsLeft = held ? Math.max(1, Math.ceil((held.until - now) / 1000)) : 0;
  return { held, hold, undo, secondsLeft, sendError };
};
