import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// The menu renders in a portal on document.body and adds global listeners while open.
// The dropdown always sits on the paper memo, so it is drawn as paper in both modes;
// darkMode is still accepted from PassNotes and no longer changes the look.
export function TargetDropdown({ value, onChange, options, darkMode = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // On a desk that fits the screen the pad lies at the foot of the window, where the
    // page cannot scroll: there the list opens upward from the field instead
    const below = window.innerHeight - rect.bottom;
    const wanted = Math.min(options.length * 36 + 6, 320);
    const upward = below < wanted && rect.top > below;
    setMenuStyle({
      position: 'fixed',
      ...(upward ? { bottom: window.innerHeight - rect.top } : { top: rect.bottom }),
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, (upward ? rect.top : below) - 8),
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
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  return (
    <div ref={triggerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 bg-transparent px-0 py-0.5 text-left transition-colors border-b border-sepia/40 hover:border-sepia"
      >
        {selected?.inkColor ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: selected.inkColor }} />
        ) : (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 bg-sepia/40 ring-ink/10" />
        )}
        <span className="font-serif font-bold text-base flex-1 truncate" style={{ color: selected?.inkColor || 'rgb(var(--c-sepia))' }}>
          {selected?.label}
        </span>
        <span className="text-xs text-sepia">{open ? '▲' : '▼'}</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ ...menuStyle, background: 'rgb(var(--c-parchment))' }}
          className="border border-t-0 border-sepia/40 shadow-[2px_4px_12px_rgba(0,0,0,0.4)]"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
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
