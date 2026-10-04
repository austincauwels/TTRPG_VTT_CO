import React, { useRef, useEffect } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';

// ── Fallback styles when no ink_color is present (white-background log) ───────
const LOG_BORDER_CLASS = {
  roll:   'border-emerald-600/60',
  chat:   'border-blue-500/60',
  danger: 'border-red-600/60',
  field:  'border-[#b8860b]/60',
};
const LOG_TEXT_CLASS = {
  roll:   'text-black/80',
  chat:   'text-blue-900/80',
  danger: 'text-red-700',
  field:  'text-black/70',
};
const LOG_TAG_CLASS = {
  roll:   'text-emerald-700',
  chat:   'text-blue-600',
  danger: 'text-red-600',
  field:  'text-[#8b6914]',
};

function hex80(hex) {
  // Append 80 (50% alpha) to a hex color for a muted border
  if (!hex || !hex.startsWith('#')) return null;
  return hex + '80';
}

function hexCC(hex) {
  // 80% alpha for text
  if (!hex || !hex.startsWith('#')) return null;
  return hex + 'cc';
}

function LogEntry({ entry }) {
  // environment type: bold all-caps, no ink override
  if (entry.type === 'environment') {
    return (
      <p className="animate-fadeIn border-l-2 border-red-700/70 pl-2 font-sans font-black text-sm uppercase tracking-wider text-red-800 not-italic">
        <span className="font-mono font-black text-xs uppercase tracking-tight mr-1.5">
          [{entry.time}]
        </span>
        {entry.text}
      </p>
    );
  }

  // danger type always uses red regardless of ink_color
  const useInk = entry.inkColor && entry.type !== 'danger';

  const borderStyle = useInk ? { borderLeftColor: hex80(entry.inkColor) } : {};
  const textStyle   = useInk ? { color: hexCC(entry.inkColor) } : {};
  const tagStyle    = useInk ? { color: entry.inkColor } : {};

  return (
    <p
      className={`animate-fadeIn border-l-2 pl-2 italic ${!useInk ? (LOG_TEXT_CLASS[entry.type] ?? LOG_TEXT_CLASS.field) : 'text-black/80'} ${!useInk ? (LOG_BORDER_CLASS[entry.type] ?? LOG_BORDER_CLASS.field) : ''}`}
      style={borderStyle}
    >
      <span
        className={`font-sans font-black text-xs uppercase tracking-tight mr-1.5 not-italic ${!useInk ? (LOG_TAG_CLASS[entry.type] ?? LOG_TAG_CLASS.field) : ''}`}
        style={tagStyle}
      >
        [{entry.time}]
      </span>
      <span style={textStyle}>{entry.text}</span>
    </p>
  );
}

export const ActivityLog = ({ logEntries }) => {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  return (
  <div className="font-sans">
    <h3 className="text-sm font-sans font-black uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-2 mb-3 flex items-center gap-2">
      <SafeIcon name="GiScroll" size={18} /> Activity Log
    </h3>
    <div
      ref={logContainerRef}
      className="h-[240px] overflow-y-auto space-y-3 text-base font-serif leading-normal px-3 py-2 custom-scrollbar"
      style={{
        background: '#fefefc',
        boxShadow:
          'inset 0 14px 22px -12px rgba(80,40,10,0.55), ' +
          'inset 0 -14px 22px -12px rgba(80,40,10,0.55), ' +
          'inset 8px 0 16px -12px rgba(80,40,10,0.35), ' +
          'inset -8px 0 16px -12px rgba(80,40,10,0.35)',
      }}
    >
      {logEntries.length === 0 ? (
        <p className="text-black/20 italic text-center pt-6">No activity recorded yet.</p>
      ) : (
        logEntries.map((entry, i) => <LogEntry key={i} entry={entry} />)
      )}
    </div>
  </div>
  );
};
