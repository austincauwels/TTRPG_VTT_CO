import React, { useEffect } from 'react';

// The small row of formatting marks over a note's writing (owner's round 4 item 20): bold,
// italic, heading, list, quote and link, each inserting its Markdown into the plain
// textarea, and the Preview toggle that shows the note as it will read. Ctrl or Cmd with
// B, I or K does the same as the first two marks and the link while writing.
//
// Text goes in through the browser's own insertText, so Undo in the textarea takes a
// mark back out; where that is missing, setRangeText and an input event (which React
// reads as a change) do the same.

function replaceRange(el, start, end, text, selStart, selEnd) {
  el.focus();
  el.setSelectionRange(start, end);
  let inserted = false;
  try { inserted = document.execCommand('insertText', false, text); } catch { inserted = false; }
  if (!inserted) {
    el.setRangeText(text, start, end, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.setSelectionRange(selStart, selEnd);
}

// Wrap the selection in a pair of marks, or take the pair off when it is already there
function wrap(el, mark, placeholder) {
  const { value, selectionStart: s, selectionEnd: e } = el;
  const n = mark.length;
  const before = value.slice(Math.max(0, s - n), s);
  const after = value.slice(e, e + n);
  // "*" must not take a bold "**" for italic
  const lone = n > 1 || (value[s - n - 1] !== '*' && value[e + n] !== '*');
  if (s !== e && before === mark && after === mark && lone) {
    replaceRange(el, s - n, e + n, value.slice(s, e), s - n, e - n);
    return;
  }
  const inner = s === e ? placeholder : value.slice(s, e);
  replaceRange(el, s, e, `${mark}${inner}${mark}`, s + n, s + n + inner.length);
}

// Put a mark at the start of every line the selection touches, or take it off them all.
// A heading replaces any heading mark the line had.
function prefixLines(el, prefix, strip = null) {
  const { value, selectionStart: s, selectionEnd: e } = el;
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const endBreak = value.indexOf('\n', e > s && value[e - 1] === '\n' ? e - 1 : e);
  const lineEnd = endBreak === -1 ? value.length : endBreak;
  const lines = value.slice(lineStart, lineEnd).split('\n');
  const all = lines.every((l) => l.startsWith(prefix));
  const next = lines.map((l) => {
    if (all) return l.slice(prefix.length);
    const bare = strip ? l.replace(strip, '') : l;
    return `${prefix}${bare}`;
  }).join('\n');
  replaceRange(el, lineStart, lineEnd, next, lineStart, lineStart + next.length);
}

function link(el) {
  const { value, selectionStart: s, selectionEnd: e } = el;
  const words = value.slice(s, e);
  if (words) {
    const text = `[${words}](https://)`;
    const urlAt = s + words.length + 3;
    replaceRange(el, s, e, text, urlAt, urlAt + 'https://'.length);
  } else {
    replaceRange(el, s, e, '[](https://)', s + 1, s + 1);
  }
}

const MARKS = [
  { key: 'bold', label: 'Bold', run: (el) => wrap(el, '**', 'bold'), face: <span className="font-serif font-bold text-[19px] leading-none">B</span> },
  { key: 'italic', label: 'Italic', run: (el) => wrap(el, '*', 'italic'), face: <span className="font-serif italic text-[19px] leading-none">I</span> },
  { key: 'heading', label: 'Heading', run: (el) => prefixLines(el, '## ', /^#{1,6}\s+/), face: <span className="font-serif font-bold text-[17px] leading-none">H</span> },
  {
    key: 'list', label: 'List', run: (el) => prefixLines(el, '- '),
    face: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 16" className="w-5 h-4" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="3" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="3" cy="8.2" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12.9" r="1.3" fill="currentColor" stroke="none" />
        <path d="M7 3.6c3.4-.3 7-.2 10.6 0M7 8.3c3.1-.2 6.4-.2 9.6.1M7 13c3.5-.3 7-.2 10.4-.1" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: 'quote', label: 'Quote', run: (el) => prefixLines(el, '> '),
    face: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 16" className="w-5 h-4" fill="currentColor">
        <path d="M3.2 13.6c-.9 0-1.6-.8-1.6-2.4 0-3.6 2-6.8 5.1-8.4l.6.9C5.4 5 4.5 6.6 4.4 8.3c1.5 0 2.6 1.1 2.6 2.6 0 1.6-1.4 2.7-3.8 2.7Zm8.6 0c-.9 0-1.6-.8-1.6-2.4 0-3.6 2-6.8 5.1-8.4l.6.9C14 5 13.1 6.6 13 8.3c1.5 0 2.6 1.1 2.6 2.6 0 1.6-1.4 2.7-3.8 2.7Z" />
      </svg>
    ),
  },
  {
    key: 'link', label: 'Link', run: link,
    face: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 16" className="w-5 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6">
        <path d="M8.6 10.4 7 12a2.9 2.9 0 0 1-4.1-4.1L5.6 5.2a2.9 2.9 0 0 1 4.1 0" />
        <path d="M11.4 5.6 13 4a2.9 2.9 0 0 1 4.1 4.1l-2.7 2.7a2.9 2.9 0 0 1-4.1 0" />
        <path d="M7.6 9.2c1.6-.9 3.2-1.9 4.8-2.6" />
      </svg>
    ),
  },
];

const SHORTCUTS = { b: 'bold', i: 'italic', k: 'link' };

// targetRef: the textarea. preview: the Preview toggle's state (PreviewToggle below), kept
// by the caller so it can show the note in place of the textarea; the marks rest meanwhile.
// The two are separate pieces so each writing place can lay them out in its own room.
export function MarkdownMarks({ targetRef, preview, className = '', label = 'Formatting' }) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = SHORTCUTS[e.key.toLowerCase()];
      if (!key) return;
      e.preventDefault();
      MARKS.find((m) => m.key === key).run(el);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [targetRef, preview]);

  return (
    <div role="toolbar" aria-label={label} className={`md-marks flex items-center gap-0.5 ${className}`}>
      {MARKS.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-label={m.label}
          title={m.label}
          disabled={preview}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => targetRef.current && m.run(targetRef.current)}
          className="md-mark w-9 h-9 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 shrink-0 flex items-center justify-center rounded-sm text-sepia hover:text-ink hover:bg-ink/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          {m.face}
        </button>
      ))}
    </div>
  );
}

// Shows the note as it will read, in place of the textarea, and back
export function PreviewToggle({ preview, onPreview, className = '' }) {
  return (
    <button
      type="button"
      aria-pressed={!!preview}
      onClick={() => onPreview(!preview)}
      className={`shrink-0 min-h-[36px] [@media(pointer:coarse)]:min-h-[44px] px-2.5 rounded-sm border font-sans text-xs font-black uppercase tracking-widest transition-colors ${
        preview ? 'bg-ink text-cream border-ink' : 'text-sepia border-sepia/50 hover:text-ink hover:border-ink/60'} ${className}`}
    >
      Preview
    </button>
  );
}
