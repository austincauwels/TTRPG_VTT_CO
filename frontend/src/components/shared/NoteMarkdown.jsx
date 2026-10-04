import React from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// Notes written in Markdown (owner's round 4 item 20): field entries, private notes, the
// Lightkeeper's notes and, inline only, pass notes. Set as ink on paper in the writer's
// own pen and ink (the container's font and color; .md-note in index.css).
//
// Safe by construction:
// - no rehype-raw, so HTML in a note is shown as the text it is, never run;
// - react-markdown's default URL rule, so a javascript:, vbscript: or data: link has no
//   address and is drawn as plain text;
// - every link opens in a new tab with rel="noopener noreferrer";
// - pictures are never fetched: an image is replaced by its alt text.
// remark-breaks keeps a single line break a line break, so a note written before Markdown
// (plain lines, blank lines between paragraphs) looks as it did.

const safeUrl = (url) => defaultUrlTransform(url);

const Link = ({ node, href, children, ...rest }) => (
  href
    ? <a {...rest} href={href} target="_blank" rel="noopener noreferrer" className="md-link">{children}</a>
    : <span className="md-link-dead">{children}</span>
);

// A task list's box, drawn in ink like the sheet's marks (no emoji-prone glyph)
const TaskBox = ({ checked }) => (
  <span className="md-task-box" data-checked={checked ? 'true' : 'false'}>
    <svg aria-hidden="true" focusable="false" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.2 2.6c3.2-.5 6.4-.4 9.6-.2.4 3 .5 6 .2 9.2-3.1.4-6.3.3-9.6.1-.4-3-.5-6.1-.2-9.1Z" strokeWidth="1.3" />
      {checked && <path d="M4 7.4l2.2 2.3L10.6 3.6" strokeWidth="1.8" />}
    </svg>
    <span className="sr-only">{checked ? 'Done' : 'Not done'}</span>
  </span>
);

// A note's headings sit under the entry's own title (an h3), so they start at h4
const BLOCK_COMPONENTS = {
  a: Link,
  img: ({ alt }) => (alt ? <span className="md-img-alt">{alt}</span> : null),
  h1: ({ node, ...p }) => <h4 className="md-h1" {...p} />,
  h2: ({ node, ...p }) => <h5 className="md-h2" {...p} />,
  h3: ({ node, ...p }) => <h6 className="md-h3" {...p} />,
  h4: ({ node, ...p }) => <h6 className="md-h3" {...p} />,
  h5: ({ node, ...p }) => <h6 className="md-h3" {...p} />,
  h6: ({ node, ...p }) => <h6 className="md-h3" {...p} />,
  input: ({ node, type, checked }) => (type === 'checkbox' ? <TaskBox checked={!!checked} /> : null),
  table: ({ node, ...p }) => <div className="md-table-wrap"><table {...p} /></div>,
};

export function NoteMarkdown({ text, className = '', style }) {
  return (
    <div className={`md-note ${className}`} style={style}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={BLOCK_COMPONENTS}
        urlTransform={safeUrl}
      >
        {text || ''}
      </Markdown>
    </div>
  );
}

// Pass notes are one line, so only inline marks apply: bold, italic, strike, code and
// links. The block constructs are switched off in the parser (not unwrapped afterwards),
// so a note that starts with "- ", "# ", "> " or "1. " keeps those characters as written.
function remarkInlineOnly() {
  const data = this.data();
  const extensions = data.micromarkExtensions || (data.micromarkExtensions = []);
  extensions.push({
    disable: {
      null: ['blockQuote', 'codeFenced', 'codeIndented', 'definition', 'headingAtx', 'htmlFlow',
        'htmlText', 'list', 'setextUnderline', 'thematicBreak', 'labelStartImage', 'table',
        'gfmFootnoteDefinition', 'gfmFootnoteCall'],
    },
  });
}

const INLINE_ELEMENTS = ['p', 'strong', 'em', 'del', 'code', 'a', 'br'];
const INLINE_COMPONENTS = {
  a: Link,
  p: ({ children }) => <>{children}</>,
};

export function InlineMarkdown({ text }) {
  return (
    <span className="md-inline">
      <Markdown
        remarkPlugins={[remarkGfm, remarkInlineOnly]}
        allowedElements={INLINE_ELEMENTS}
        unwrapDisallowed
        components={INLINE_COMPONENTS}
        urlTransform={safeUrl}
      >
        {text || ''}
      </Markdown>
    </span>
  );
}
