import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SafeIcon } from '../../shared/SafeIcon';
import { BlankEntry } from '../../shared/PrintMarks';
import { CrossMark } from '../../shared/InkMarks';
import { useDialog } from '../../shared/useDialog';
import { INSIGNIA_OPTIONS, insigniaLabel } from '../../../game/circleFormation';
import { PORTRAIT_UNDO_SECONDS } from '../../pc/usePortraitChange';

const NOT_SENT = 'Not changed: the desk is not connected to the table. Try again in a moment.';

// The circle's insignia, stamped on the Lightkeeper's Circle page. Once the circle is sealed
// the Lightkeeper changes it as a player changes their portrait (issue #66.7): the stamp is a
// button with "Change" printed under it, a press opens the eight insignia of the formation
// papers, the one chosen is sent at once (update_circle), and for a few seconds Undo puts
// back the one it replaced. Before the seal the players vote for it, so it is only shown.
// onSave(key) sends the change and answers whether it went.
export const InsigniaStamp = ({ circle, onSave }) => {
  const insignia = circle?.insignia || '';
  const canChange = !!circle?.is_finalized;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState(null); // { to, until }: the insignia Undo puts back
  const [now, setNow] = useState(() => Date.now());

  // The countdown on Undo, and its end
  useEffect(() => {
    if (!undo) return undefined;
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= undo.until) setUndo(null);
    }, 250);
    return () => clearInterval(tick);
  }, [undo]);

  const choose = (key) => {
    setOpen(false);
    if (key === insignia) return;
    if (!onSave(key)) { setError(NOT_SENT); return; }
    setError('');
    setUndo({ to: insignia, until: Date.now() + PORTRAIT_UNDO_SECONDS * 1000 });
    setNow(Date.now());
  };
  const putBack = () => {
    if (!undo) return;
    const back = undo.to;
    setUndo(null);
    // A circle that had none keeps the one chosen: there is no insignia to put back
    if (back && !onSave(back)) setError(NOT_SENT);
  };

  const stamp = (
    <span className="w-16 h-16 rounded-full border-2 border-ink/70 flex items-center justify-center bg-parchment/40 relative shadow-inner transform -rotate-3">
      <span className="absolute inset-0 rounded-full border border-ink/20 m-1 border-dashed" />
      <SafeIcon name={insignia || 'GiCandleLight'} size={30} className="text-ink/85" />
    </span>
  );
  const name = insignia
    ? <span aria-hidden="true" className="font-serif text-xs italic text-sepia text-center">{insigniaLabel(insignia)}</span>
    : <span className="text-sepia text-xs"><BlankEntry label="None chosen" className="!w-14" /></span>;

  if (!canChange) {
    return (
      <>
        {/* Named only once one is chosen; the stamp's candle is the blank seal until then */}
        <span {...(insignia
          ? { role: 'img', 'aria-label': `Insignia: ${insigniaLabel(insignia)}`, title: insigniaLabel(insignia) }
          : { 'aria-hidden': true })}>
          {stamp}
        </span>
        {name}
      </>
    );
  }

  const secondsLeft = undo ? Math.max(1, Math.ceil((undo.until - now) / 1000)) : 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={insignia ? `Insignia: ${insigniaLabel(insignia)}. Change insignia` : 'Choose an insignia'}
        title={insignia ? insigniaLabel(insignia) : undefined}
        className="group flex flex-col items-center gap-1 rounded-sm px-1 pt-1 hover:bg-ink/5 transition-colors md:[@media(pointer:coarse)]:min-h-[44px]"
      >
        <span className="transition-transform duration-200 group-hover:scale-105">{stamp}</span>
        {name}
        <span aria-hidden="true" className="font-sans text-xs font-black uppercase tracking-widest text-oxblood group-hover:underline underline-offset-2">
          {insignia ? 'Change' : 'Choose'}
        </span>
      </button>
      {undo && (
        <button
          type="button"
          onClick={putBack}
          className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-2 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream rounded-sm transition-colors"
        >
          Undo <span className="font-mono tabular-nums">{secondsLeft}s</span>
        </button>
      )}
      {error && <p role="alert" className="max-w-[9rem] font-serif text-sm text-oxblood leading-snug text-center">{error}</p>}
      <p role="status" className="sr-only">{undo ? 'Insignia changed.' : ''}</p>
      {open && <InsigniaChooser current={insignia} onChoose={choose} onClose={() => setOpen(false)} />}
    </>
  );
};

// The eight insignia, as the formation papers offer them, on a slip over the dimmed desk
const InsigniaChooser = ({ current, onChoose, onClose }) => {
  const ref = useDialog({ open: true, onClose });
  const currentRef = useRef(null);
  // Into the chooser at the insignia the circle has
  useEffect(() => { currentRef.current?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="insignia-chooser-title"
        className="relative w-full max-w-md max-h-[calc(100dvh-32px)] overflow-y-auto bg-parchment text-ink border border-sepia/40 rounded-sm px-4 py-4 sm:px-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="insignia-chooser-title" className="font-sans text-sm font-black uppercase tracking-widest text-sepia">Insignia</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded text-sepia text-lg hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <CrossMark />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {INSIGNIA_OPTIONS.map((ins) => {
            const on = ins.key === current;
            return (
              <button
                key={ins.key}
                ref={on ? currentRef : undefined}
                type="button"
                onClick={() => onChoose(ins.key)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1.5 min-h-[44px] px-2 py-3 border-2 rounded-sm transition-colors ${
                  on ? 'border-oxblood bg-oxblood/5' : 'border-parchment-deep bg-cream/60 hover:border-sepia/60'}`}
              >
                <SafeIcon name={ins.key} size={32} className={on ? 'text-oxblood' : 'text-sepia'} />
                <span className="font-serif text-sm text-sepia text-center leading-tight">{ins.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};
