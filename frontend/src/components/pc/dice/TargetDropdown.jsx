import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// The menu renders in a portal on document.body and adds global listeners while open.
export function TargetDropdown({ value, onChange, options, darkMode = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

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
        className={`w-full flex items-center gap-2 bg-transparent px-0 py-0.5 text-left transition-colors border-b ${darkMode ? 'border-slate-500 hover:border-slate-300' : 'border-[#b8a070] hover:border-[#8b6030]'}`}
      >
        {selected?.inkColor ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: selected.inkColor }} />
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ${darkMode ? 'bg-slate-500/40 ring-white/10' : 'bg-[#a08060]/40 ring-black/10'}`} />
        )}
        <span className="font-mono text-sm uppercase tracking-wider flex-1" style={{ color: selected?.inkColor || (darkMode ? '#cbd5e1' : '#5a4030') }}>
          {selected?.label}
        </span>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-[#8b6040]/60'}`}>{open ? '▲' : '▼'}</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ ...menuStyle, background: darkMode ? '#1e293b' : '#f0e8d0' }}
          className={`border-t-0 shadow-[2px_4px_12px_rgba(0,0,0,0.4)] ${darkMode ? 'border border-slate-600' : 'border border-[#c8b080]'}`}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
                opt.value === value
                  ? (darkMode ? 'bg-slate-700' : 'bg-[#e0d0a8]/60')
                  : (darkMode ? 'hover:bg-slate-700/60' : 'hover:bg-[#e8dcc0]/50')
              }`}
            >
              {opt.inkColor ? (
                <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: opt.inkColor }} />
              ) : (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ${darkMode ? 'bg-slate-500/40 ring-white/10' : 'bg-[#a08060]/40 ring-black/10'}`} />
              )}
              <span className="font-mono text-sm uppercase tracking-wider" style={{ color: opt.inkColor || (darkMode ? '#cbd5e1' : '#5a4030') }}>
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
