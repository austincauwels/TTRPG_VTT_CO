import React, { useId } from 'react';
import { ConfirmAction } from '../shared/ConfirmAction';

const CONTROL = 'shrink-0 self-center ml-auto mr-1 max-sm:mb-1 min-h-[44px] min-w-[44px] px-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-colors';

// The Delete control at the end of a roster book row, with the shared two-step confirm.
// The row is a flex row that wraps: on a phone the control has a line of its own under the
// row, at the right, and the armed question and Keep go below it. A row that
// cannot be deleted gets the same control, unpressable, with its reason for screen
// readers and as a tooltip.
export const RowDelete = ({ name, question, onConfirm, busy = false, blockedReason = null }) => {
  const reasonId = useId();
  if (blockedReason) {
    return (
      <>
        <button
          type="button"
          aria-disabled="true"
          aria-label={`Delete ${name}`}
          aria-describedby={reasonId}
          title={blockedReason}
          onClick={(e) => e.preventDefault()}
          className={`${CONTROL} text-sepia/45 cursor-not-allowed`}
        >
          Delete
        </button>
        <span id={reasonId} className="sr-only">{blockedReason}</span>
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

// In place of a deleted row for a few seconds: what went, and Undo with its countdown.
export const DeletedSlip = ({ text, secondsLeft, undoing, onUndo }) => (
  <div role="status" className="flex flex-wrap items-center justify-between gap-2 border border-oxblood/40 bg-oxblood/5 pl-3 pr-1 py-1 rounded-sm">
    <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-40">{text}</p>
    <button
      type="button"
      onClick={onUndo}
      disabled={undoing}
      className="shrink-0 min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream disabled:opacity-60 disabled:cursor-wait rounded-sm transition-colors"
    >
      {undoing ? 'Undoing…' : <>Undo <span className="font-mono tabular-nums">{secondsLeft}s</span></>}
    </button>
  </div>
);

// What a delete or an undo could not do, above the list.
export const DeleteError = ({ text }) => (text
  ? <p role="alert" className="font-serif text-base text-oxblood leading-snug">{text}</p>
  : null);
