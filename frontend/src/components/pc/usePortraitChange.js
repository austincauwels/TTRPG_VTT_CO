import { useEffect, useRef, useState } from 'react';
import { portraitDataUrl, setCharacterPortrait } from '../../utils/api';

export const PORTRAIT_UNDO_SECONDS = 8;

// Changing the photo on the player's own sheet (owner's round 3 item 15). The picked
// picture is shrunk in the browser to fit the server's limit (portraitDataUrl) and sent at
// once, so the GM and the circle see it; for a few seconds after, Undo puts back the photo
// it replaced. While it is being sent the new photo already shows on the sheet.
//   phase: null | 'preparing' | 'saving' | 'changed' (Undo offered) | 'undoing'
export const usePortraitChange = ({ characterId, current, onSaved }) => {
  const [phase, setPhase] = useState(null);
  const [preview, setPreview] = useState(undefined); // the photo on its way to the server
  const [error, setError] = useState('');
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const undoTo = useRef(undefined); // the photo before the last change: a data URL or null
  const timer = useRef(null);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  const endUndo = () => {
    clearTimeout(timer.current);
    timer.current = null;
    undoTo.current = undefined;
  };

  const send = async (pic) => savedRef.current?.(await setCharacterPortrait(characterId, pic));

  const change = async (file) => {
    if (!file || characterId == null || phase === 'preparing' || phase === 'saving' || phase === 'undoing') return;
    const before = current ?? null;
    endUndo();
    setError('');
    setPhase('preparing');
    let picture;
    try {
      picture = await portraitDataUrl(file);
    } catch (err) {
      setPhase(null);
      setError(err.message);
      return;
    }
    setPreview(picture);
    setPhase('saving');
    try {
      await send(picture);
    } catch (err) {
      setPreview(undefined);
      setPhase(null);
      setError(err.message);
      return;
    }
    setPreview(undefined);
    undoTo.current = before;
    setUntil(Date.now() + PORTRAIT_UNDO_SECONDS * 1000);
    setNow(Date.now());
    setPhase('changed');
    timer.current = setTimeout(() => { undoTo.current = undefined; setPhase(null); }, PORTRAIT_UNDO_SECONDS * 1000);
  };

  const undo = async () => {
    if (phase !== 'changed' || undoTo.current === undefined) return;
    const back = undoTo.current;
    endUndo();
    setPhase('undoing');
    setPreview(back);
    try {
      await send(back);
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setPreview(undefined);
    setPhase(null);
  };

  // The countdown on the Undo button
  useEffect(() => {
    if (phase !== 'changed') return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    phase,
    error,
    shown: preview !== undefined ? preview : (current ?? null),
    busy: phase === 'preparing' || phase === 'saving' || phase === 'undoing',
    secondsLeft: phase === 'changed' ? Math.max(1, Math.ceil((until - now) / 1000)) : 0,
    change,
    undo,
  };
};
