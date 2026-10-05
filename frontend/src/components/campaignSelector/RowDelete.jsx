import React, { useEffect, useId, useState } from 'react';
import { ConfirmAction } from '../shared/ConfirmAction';

const CONTROL = 'shrink-0 self-center ml-auto mr-1 max-sm:mb-1 min-h-[44px] min-w-[44px] px-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-colors';
const SAY_MS = 5000;

// The Delete control at the end of a roster book row, with the shared two-step confirm.
// The row is a flex row that wraps: on a phone the control has a line of its own under the
// row, at the right, and the armed question and Keep go below it. A row that
// cannot be deleted gets the same control, unpressable, with its reason for screen
// readers and as a tooltip; pressed, it says the reason under the row for a few seconds,
// since a finger never sees a tooltip (iPad pass, 2026-10-05).
export const RowDelete = ({ name, question, onConfirm, busy = false, blockedReason = null }) => {
  const reasonId = useId();
  const [said, setSaid] = useState(false);
  useEffect(() => {
    if (!said) return undefined;
    const t = setTimeout(() => setSaid(false), SAY_MS);
    return () => clearTimeout(t);
  }, [said]);
  if (blockedReason) {
    return (
      <>
        <button
          type="button"
          aria-disabled="true"
          aria-label={`Delete ${name}`}
          aria-describedby={reasonId}
          title={blockedReason}
          onClick={(e) => { e.preventDefault(); setSaid(s => !s); }}
          className={`${CONTROL} text-sepia/45 cursor-not-allowed`}
        >
          Delete
        </button>
        <span id={reasonId} className="sr-only">{blockedReason}</span>
        {said && (
          <p aria-hidden="true" className="basis-full px-3 pb-2 text-right font-serif italic text-base leading-snug text-sepia">
            {blockedReason}
          </p>
        )}
      </>
    );
  }
  return (
    <ConfirmAction
      className="contents"
      hintClassName="basis-full px-3 pb-2"
      cancelSize="min-h-[44px]"
      cancelLabel="Keep"
      disabled={busy}
      onConfirm={onConfirm}
      armedHint={question}
      renderButton={(armed, props) => (
        <button
          {...props}
          aria-label={armed ? `Yes, delete ${name}` : `Delete ${name}`}
          className={`${CONTROL} disabled:opacity-60 disabled:cursor-wait ${armed
            ? 'bg-oxblood text-cream hover:brightness-125'
            : 'text-sepia hover:text-oxblood hover:bg-oxblood/5'}`}
        >
          {busy ? 'Deleting…' : armed ? 'Yes, delete' : 'Delete'}
        </button>
      )}
    />
  );
};

// 115 -> "1:55"
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// In place of a deleted row while the server still lets it be undone: what went, and
// Undo with its countdown. The countdown is hidden from screen readers, so the slip (a
// status) is read once and not on every tick; the button's name says what it undoes.
export const DeletedSlip = ({ name, secondsLeft, undoing, onUndo }) => (
  <div role="status" className="flex flex-wrap items-center justify-between gap-2 border border-oxblood/40 bg-oxblood/5 pl-3 pr-1 py-1 rounded-sm">
    <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-40">{name} deleted.</p>
    <button
      type="button"
      onClick={onUndo}
      disabled={undoing}
      aria-label={`Undo deleting ${name}`}
      className="shrink-0 min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream disabled:opacity-60 disabled:cursor-wait rounded-sm transition-colors"
    >
      {undoing ? 'Undoing…' : <>Undo <span aria-hidden="true" className="font-mono tabular-nums">{clock(secondsLeft)}</span></>}
    </button>
  </div>
);

// The slips of the recent deletes, newest first (useDeleteUndo keeps a few), each with
// its own Undo.
export const DeletedSlips = ({ deleted, onUndo }) => (deleted.length === 0 ? null : (
  <div className="space-y-1.5">
    {deleted.map(slip => (
      <DeletedSlip
        key={slip.id}
        name={slip.name}
        secondsLeft={slip.secondsLeft}
        undoing={slip.undoing}
        onUndo={() => onUndo(slip.id)}
      />
    ))}
  </div>
));

// What a delete or an undo could not do, above the list.
export const DeleteError = ({ text }) => (text
  ? <p role="alert" className="font-serif text-base text-oxblood leading-snug">{text}</p>
  : null);
