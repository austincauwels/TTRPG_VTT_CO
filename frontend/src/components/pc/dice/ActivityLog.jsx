import React, { useRef, useEffect } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { rulebookLogText } from '../../../game/outcomes';
import { FormLine, PrinterMark } from '../../shared/PrintMarks';

// ── Fallback styles when no ink_color is present (cream-paper log) ───────────
// Rolls carry the seal green, danger the oxblood, chat the sepia hairline and field
// notes a gold rule; the text itself stays readable ink.
const LOG_BORDER_CLASS = {
  roll:   'border-seal-green/60',
  chat:   'border-sepia/60',
  danger: 'border-oxblood/60',
  field:  'border-candle-gold',
};
const LOG_TEXT_CLASS = {
  roll:   'text-ink/90',
  chat:   'text-ink/90',
  danger: 'text-oxblood',
  field:  'text-ink/80',
};
const LOG_TAG_CLASS = {
  roll:   'text-seal-green',
  chat:   'text-sepia',
  danger: 'text-oxblood',
  field:  'text-sepia',
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
  // Players' own chat stays as written; the server's lines use the rulebook's names
  const text = entry.type === 'chat' ? entry.text : rulebookLogText(entry.text);

  // environment type: bold all-caps, no ink override
  if (entry.type === 'environment') {
    return (
      <p className="animate-fadeIn border-l-2 border-oxblood/70 pl-2 font-sans font-black text-sm uppercase tracking-wider text-oxblood not-italic">
        <span className="font-mono tabular-nums font-bold text-xs tracking-tight mr-1.5">
          [{entry.time}]
        </span>
        {text}
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
      className={`animate-fadeIn border-l-2 pl-2 italic ${!useInk ? (LOG_TEXT_CLASS[entry.type] ?? LOG_TEXT_CLASS.field) : 'text-ink/80'} ${!useInk ? (LOG_BORDER_CLASS[entry.type] ?? LOG_BORDER_CLASS.field) : ''}`}
      style={borderStyle}
    >
      <span
        className={`font-mono tabular-nums font-bold text-xs tracking-tight mr-1.5 not-italic ${!useInk ? (LOG_TAG_CLASS[entry.type] ?? LOG_TAG_CLASS.field) : ''}`}
        style={tagStyle}
      >
        [{entry.time}]
      </span>
      <span style={textStyle}>{text}</span>
    </p>
  );
}

// The blank rows of the ledger: ruled every 28px, with the time column's red rule
const LEDGER_ROWS = {
  backgroundImage:
    'linear-gradient(to right, transparent 3.85rem, rgb(var(--c-oxblood) / 0.22) 3.85rem, rgb(var(--c-oxblood) / 0.22) calc(3.85rem + 1px), transparent calc(3.85rem + 1px)), ' +
    'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgb(var(--c-sepia) / 0.2) 27px, rgb(var(--c-sepia) / 0.2) 28px)',
};

// `gm` sets the heading in the GM desk's moonlit chrome; the log paper stays warm.
export const ActivityLog = ({ logEntries, gm = false }) => {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  return (
  <div className="font-sans">
    <h3 className={`text-sm font-sans font-black uppercase tracking-widest border-b pb-2 mb-3 flex items-center gap-2 ${gm ? 'text-moonlight-steel border-moonlight-steel/25' : 'text-parchment-deep border-parchment-deep/25'}`}>
      <SafeIcon name="GiScrollUnfurled" size={18} /> Activity Log
    </h3>
    <div
      ref={logContainerRef}
      className="h-[240px] 2xl:h-[320px] overflow-y-auto flex flex-col gap-3 [&>*]:shrink-0 text-base font-serif leading-normal px-3 py-2 custom-scrollbar"
      style={{
        background: 'rgb(var(--c-cream))',
        boxShadow:
          'inset 0 14px 22px -12px rgb(var(--c-sepia) / 0.55), ' +
          'inset 0 -14px 22px -12px rgb(var(--c-sepia) / 0.55), ' +
          'inset 8px 0 16px -12px rgb(var(--c-sepia) / 0.35), ' +
          'inset -8px 0 16px -12px rgb(var(--c-sepia) / 0.35)',
      }}
    >
      {/* The sheet's printed head; an empty log is just the blank sheet */}
      <div className="flex items-center justify-between gap-2 border-b border-sepia/25 pb-1" aria-hidden="true">
        <FormLine>Form C.O. 9 · Table log</FormLine>
        <PrinterMark size={12} />
      </div>
      {logEntries.map((entry, i) => <LogEntry key={i} entry={entry} />)}
      <div aria-hidden="true" className="!shrink !grow basis-0 min-h-0 -mx-1 pointer-events-none" style={LEDGER_ROWS} />
    </div>
  </div>
  );
};
