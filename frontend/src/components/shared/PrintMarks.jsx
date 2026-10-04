import React from 'react';

// Printed form furniture on the paper objects: registry and serial numbers, form numbers,
// small-print edge lines, printer's registration marks, rubber date stamps, ruled boxes and
// watermarks (owner's request, Robert Gater, 2026-10-04), so the papers read as forms that
// came off a press. Every piece is decoration: aria-hidden, low in contrast on purpose,
// never an instruction, never over a control, and it takes no clicks. The styles are the
// .print-* rules in index.css.

// A fixed number per key (FNV-1a), so a sheet keeps its registry number across reloads.
export const serialFor = (key, digits = 5) => {
  const s = String(key ?? '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 10 ** digits).padStart(digits, '0');
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// A date the way a rubber date stamp prints it: "4 OCT 2026". Empty for a bad date.
export const stampDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Oversized faint print behind a strip or a sheet ("REGISTRY FILE // NO. 00843-CO").
// misprint (owner's round 3 item 17) sets it the way a careless press would: a few degrees
// off level, off register, its ink uneven, with a faint second impression beside the first.
// The second impression is drawn from data-print, so misprint needs its text as a string.
export const Watermark = ({ children, misprint = false, className = '', style }) => (
  <span aria-hidden="true" className={`print-watermark ${misprint ? 'print-misprint' : ''} ${className}`}
    data-print={misprint && typeof children === 'string' ? children : undefined} style={style}>{children}</span>
);

// A form number or a printer's line in small capitals ("Form C.O. 7 · Investigator record").
export const FormLine = ({ children, className = '' }) => (
  <span aria-hidden="true" className={`print-small ${className}`}>{children}</span>
);

// A serial number struck by a numbering machine in red ink ("No. 00412").
export const SerialNo = ({ value, className = '' }) => (
  <span aria-hidden="true" className={`print-serial ${className}`}>No.&nbsp;{value}</span>
);

// A printer's registration mark, as in the margin of a proof: a small circle and cross.
export const PrinterMark = ({ size = 14, className = '' }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width={size} height={size}
    className={`print-mark ${className}`}>
    <circle cx="8" cy="8" r="4.3" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M8 0.6V15.4M0.6 8H15.4" stroke="currentColor" strokeWidth="0.9" />
  </svg>
);

// A small-print line along one edge of the paper, repeated until the edge is full.
export const EdgeLine = ({ text, vertical = false, className = '' }) => (
  <span aria-hidden="true" className={`print-edge ${vertical ? 'print-edge-vertical' : ''} ${className}`}>
    {`${text}  ·  `.repeat(14)}
  </span>
);

// A rubber stamp in worn ink, a little crooked: a word, and under it a date or a time.
// tone: 'oxblood' (dispatched), 'green' (filed, sent), 'sepia' (locked, closed).
export const DateStamp = ({ label, date, tone = 'oxblood', tilt = -2, className = '' }) => (
  <span aria-hidden="true" data-tone={tone}
    className={`ink-stamp print-stamp ${className}`} style={{ '--tilt': `${tilt}deg` }}>
    <span className="print-stamp-label">{label}</span>
    {date && <span className="print-stamp-date">{date}</span>}
  </span>
);

// A ruled box in the margin of a form, printed and left blank ("For office use").
export const RuledBox = ({ label, lines = 2, className = '' }) => (
  <span aria-hidden="true" className={`print-box ${className}`}>
    <span className="print-small block">{label}</span>
    {Array.from({ length: lines }).map((_, i) => <span key={i} className="print-box-line" />)}
  </span>
);

// Printed fields left blank on a form: a small label and a dotted line to write on
// ("Name .......").
export const BlankFields = ({ labels, className = '' }) => (
  <span aria-hidden="true" className={`flex flex-col gap-1.5 w-full pointer-events-none select-none ${className}`}>
    {labels.map(label => (
      <span key={label} className="flex items-end gap-1.5">
        <span className="print-small shrink-0">{label}</span>
        <span className="flex-1 border-b border-dotted border-sepia/50 mb-[3px]" />
      </span>
    ))}
  </span>
);

// A blank on a form where nothing has been entered: a short dotted rule, no words.
// Screen readers hear `label` ("Not chosen") so the state is not lost to them.
export const BlankEntry = ({ label, className = '' }) => (
  <span className={`print-blank ${className}`}>
    {label && <span className="sr-only">{label}</span>}
  </span>
);

// A question card printed with its label and left blank: dotted lines to write on, in
// place of a sentence saying nothing has been chosen.
export const BlankQuestionCard = ({ label = 'Circle question', srText = 'Not chosen', lines = 2, className = 'mb-5' }) => (
  <div className={`bg-cream/60 border border-dashed border-sepia/40 px-4 pt-3 pb-4 rounded-sm ${className}`}>
    <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia block">{label}</span>
    {Array.from({ length: lines }).map((_, i) => (
      <span key={i} aria-hidden="true" className="block h-7 border-b border-dotted border-sepia/45" />
    ))}
    <span className="sr-only">{srText}</span>
  </div>
);

// Empty rows of a register page, ruled and not yet written in (a ledger with no entries)
export const BlankRows = ({ rows = 3, label, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <span key={i} aria-hidden="true" className="flex items-end h-14 px-3 pb-3"
        style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
        <span className="flex-1 border-b border-dotted border-sepia/35" />
      </span>
    ))}
    {label && <span className="sr-only">{label}</span>}
  </div>
);

// The dashed outline where a stamp has not been pressed yet (a report not filed). The
// stamp itself is a DateStamp, set in the same spot once there is something to stamp.
export const EmptyStamp = ({ label, tilt = -2, className = '' }) => (
  <span className={`print-stamp-empty ${className}`} style={{ '--tilt': `${tilt}deg` }}>
    {label && <span className="sr-only">{label}</span>}
  </span>
);
