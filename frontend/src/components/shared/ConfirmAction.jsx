import React, { useEffect, useId, useRef, useState } from 'react';

// The app's one way to confirm a heavy action, modelled on "Reset drive and ability uses"
// on the GM's view of a sheet: the first press arms the button and shows, in visible
// text, what will happen; the second press does it. Escape, Cancel, moving focus away or
// pressing anywhere else puts it back.
export const useConfirmStep = () => {
  const [armed, setArmed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!armed) return undefined;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setArmed(false);
    };
    // Capture phase, and the key is marked handled, so Escape disarms the button without
    // also closing the dialog the button sits in (useDialog skips handled keys).
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); setArmed(false); } };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [armed]);

  const press = (action) => {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    action();
  };

  return { armed, press, disarm: () => setArmed(false), ref };
};

// Hint and Cancel colors for the two grounds the pattern sits on.
const TONES = {
  paper: { idle: 'text-sepia', armed: 'text-oxblood', cancel: 'text-sepia hover:text-ink border-sepia/40 hover:border-ink/50' },
  night: { idle: 'text-moonlight-steel', armed: 'text-parchment-deep', cancel: 'text-moonlight-steel hover:text-cream border-moonlight-steel/40 hover:border-moonlight-steel' },
};

// renderButton(armed, props) draws the button; spread props onto it (onClick,
// aria-describedby, disabled, type). idleHint is shown before the first press (optional);
// armedHint says what the second press does. The wrapper takes className, so a caller
// can use "contents" to let the button and the hint sit in its own flex row.
export const ConfirmAction = ({
  onConfirm, renderButton, idleHint, armedHint, cancelLabel = 'Cancel',
  tone = 'paper', disabled = false, className = '', hintClassName = '',
}) => {
  const { armed, press, disarm, ref } = useConfirmStep();
  const hintId = useId();
  const colors = TONES[tone] || TONES.paper;
  const hint = armed ? armedHint : idleHint;

  useEffect(() => { if (disabled) disarm(); }, [disabled]);

  return (
    <div
      ref={ref}
      className={className}
      onBlur={(e) => {
        // Focus left the button and its Cancel: put it back. (Safari does not focus a
        // pressed button, so a press there never blurs; the outside press covers it.)
        if (armed && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) disarm();
      }}
    >
      {renderButton(armed, {
        type: 'button',
        disabled,
        onClick: () => press(onConfirm),
        'aria-describedby': hint ? hintId : undefined,
      })}
      {(hint || armed) && (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${hintClassName}`}>
          {hint && (
            <p id={hintId} aria-live="polite" className={`font-serif italic text-base leading-snug ${armed ? colors.armed : colors.idle}`}>
              {hint}
            </p>
          )}
          {armed && (
            <button
              type="button"
              onClick={disarm}
              className={`shrink-0 min-h-[36px] px-3 font-sans text-xs font-bold uppercase tracking-widest border rounded transition-colors ${colors.cancel}`}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
