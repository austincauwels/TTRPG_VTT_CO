import React, { useId, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// The menu renders in a portal on document.body and adds global listeners while open.
// The dropdown always sits on the paper memo, so it is drawn as paper in both modes;
// darkMode is still accepted from PassNotes and no longer changes the look.
export function TargetDropdown({ value, onChange, options, darkMode = false, labelledBy }) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const listId = `${buttonId}-list`;
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // What the person can see: the visual viewport when there is one (a tablet's keyboard or a
    // page zoomed in makes it smaller than the layout viewport and moves it)
    const vv = window.visualViewport;
    const seenTop = vv ? vv.offsetTop : 0;
    const seenBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    // On a desk that fits the screen the pad lies at the foot of the window, where the
    // page cannot scroll: there the list opens upward from the field instead, when the
    // room above is the greater
    const below = seenBottom - rect.bottom;
    const above = rect.top - seenTop;
    const rowH = window.matchMedia?.('(pointer: coarse)').matches ? 44 : 36;
    const wanted = Math.min(options.length * rowH + 6, 320);
    const upward = below < wanted && above > below;
    setMenuStyle({
      position: 'fixed',
      ...(upward ? { bottom: window.innerHeight - rect.top } : { top: rect.bottom }),
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, (upward ? above : below) - 8),
      overflowY: 'auto',
      zIndex: 9999,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const handler = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('scroll', updateMenuPosition);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition);
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  // On open, focus goes to the selected option; the arrows move between options
  useEffect(() => {
    if (!open) return;
    const opts = menuRef.current?.querySelectorAll('[role="option"]');
    const idx = Math.max(0, options.findIndex(o => o.value === value));
    opts?.[idx]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeToTrigger = () => { setOpen(false); triggerRef.current?.querySelector('button')?.focus(); };
  const onMenuKey = (e) => {
    const opts = Array.from(menuRef.current?.querySelectorAll('[role="option"]') || []);
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(0, i - 1)]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); opts[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeToTrigger(); }
    else if (e.key === 'Tab') { setOpen(false); triggerRef.current?.querySelector('button')?.focus(); }
  };

  // min-w-0: the field shrinks with its pad, so a long name never pushes the page wider
  // than the screen (at 1024 wide that 2px overflow aborted WebKit, iPad pass 2026-10-05)
  return (
    <div ref={triggerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); }
          else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }}
        id={buttonId}
        aria-labelledby={labelledBy ? `${labelledBy} ${buttonId}` : undefined}
        className="w-full flex items-center gap-2 bg-transparent px-0 py-0.5 [@media(pointer:coarse)]:min-h-[44px] text-left transition-colors border-b border-sepia/40 hover:border-sepia"
      >
        {selected?.inkColor ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: selected.inkColor }} />
        ) : (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 bg-sepia/40 ring-ink/10" />
        )}
        <span className="font-serif font-bold text-base flex-1 truncate" style={{ color: selected?.inkColor || 'rgb(var(--c-sepia))' }}>
          {selected?.label}
        </span>
        <span aria-hidden="true" className="text-xs text-sepia">{open ? '▲' : '▼'}</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          id={listId}
          onKeyDown={onMenuKey}
          role="listbox"
          aria-labelledby={labelledBy}
          style={{ ...menuStyle, background: 'rgb(var(--c-parchment))' }}
          className="border border-t-0 border-sepia/40 shadow-[2px_4px_12px_rgba(0,0,0,0.4)]"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              tabIndex={-1}
              onClick={() => { onChange(opt.value); closeToTrigger(); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 [@media(pointer:coarse)]:min-h-[44px] transition-colors ${
                opt.value === value
                  ? 'bg-parchment-deep/70'
                  : 'hover:bg-parchment-deep/40'
              }`}
            >
              {opt.inkColor ? (
                <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: opt.inkColor }} />
              ) : (
                <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 bg-sepia/40 ring-ink/10" />
              )}
              <span className="font-serif font-bold text-base text-left" style={{ color: opt.inkColor || 'rgb(var(--c-sepia))' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
