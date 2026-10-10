import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../useDialog';
import { loadSketchPad } from './loadSketchPad';

// The notebook's drawing sheet (owner's round 4 item 19): a sheet of her paper laid over
// the desk, opened by Sketch for a new drawing, or by the author's "Keep drawing" on a
// drawn sketch. This frame is in the main bundle; the drawing itself (SketchPad, with
// Excalidraw) arrives when the sheet opens.
//
// Escape and Cancel close it; once something is drawn, Escape does nothing, the browser's
// Back keeps it (SketchPad) and Cancel asks a second press, so a drawing is never lost by
// accident. A phone, upright or held
// sideways, gets the whole screen; a screen at least 640 wide and over 500 tall (framed,
// tailwind.config.js) gets a large sheet on the dimmed desk.

// The drawing code, kept once it has come. A failed load is not kept, so the next opening
// of the sheet asks again: one lazy component for the whole page would keep the failure
// until a reload. After the site is updated, the drawing code an open page knows of is
// gone from the server and only a reload finds the new one (Chrome also keeps a script
// that failed to load as failed until a reload). The sheet says so and never reloads by
// itself, which would lose an entry being written.
let drawingCode = null;

// Vite's loader asks for the drawing code's stylesheet once per page and fires
// vite:preloadError when it fails. A later try asks for it again here; without it the
// sheet would open with Excalidraw's own menus showing and none of the sheet's look.
const failedStyles = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    const href = /Unable to preload CSS for (\S+)/.exec(event.payload?.message || '')?.[1];
    if (href) failedStyles.add(href);
  });
}
const loadStyle = (href) => new Promise((resolve, reject) => {
  document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { if (l.getAttribute('href') === href) l.remove(); });
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.onload = () => { failedStyles.delete(href); resolve(); };
  link.onerror = () => { link.remove(); reject(new Error(`Unable to load ${href}`)); };
  document.head.appendChild(link);
});

const loadDrawingCode = () => {
  if (!drawingCode) {
    drawingCode = Promise.all([...failedStyles].map(loadStyle))
      .then(loadSketchPad)
      .catch((error) => {
        drawingCode = null;
        throw error;
      });
  }
  return drawingCode;
};

class LoadBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Sketch sheet failed:', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// The sheet before its drawing code has come, or when it could not come
const Waiting = ({ onCancel, children }) => (
  <div className="flex flex-col h-full">
    <div className="shrink-0 flex items-center px-2 sm:px-3 py-2 border-b border-sepia/25">
      <button type="button" onClick={onCancel}
        className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest rounded-sm border text-sepia border-sepia/45 hover:text-ink hover:border-ink/60 transition-colors">
        Cancel
      </button>
    </div>
    <div className="sketch-canvas flex-1 flex items-center justify-center px-6 text-center">{children}</div>
  </div>
);

export function SketchSheet({ initialElements = null, loading = false, loadError = '', ink, inks, onSave, onCancel, onUploadPicture, saveLabel, pictureOnlyLabel }) {
  // Made for this opening of the sheet, so a load that failed before is tried again
  const [SketchPad] = useState(() => lazy(loadDrawingCode));
  const [dirty, setDirty] = useState(false);
  const ref = useDialog({ onClose: dirty ? undefined : onCancel });

  // The desk under the sheet holds still while it is open
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, []);

  // The canvas keeps Escape for itself (it ends a stroke or a selection), so with nothing
  // drawn the sheet takes it first and closes; not while words are being written on it
  useEffect(() => {
    if (dirty) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.activeElement?.closest?.('.excalidraw-textEditorContainer, .excalidraw-wysiwyg')) return;
      if (!ref.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [dirty, onCancel]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="fixed inset-0 z-[650] flex items-stretch framed:items-center justify-center framed:p-6" style={{ background: 'rgb(var(--c-night) / 0.82)' }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Field sketch"
        className="sketch-sheet relative w-full h-[100dvh] framed:h-[min(820px,calc(100dvh-48px))] framed:max-w-[1120px] bg-cream text-ink framed:rounded-sm framed:border framed:border-sepia/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden overscroll-contain"
      >
        <LoadBoundary fallback={(
          <Waiting onCancel={onCancel}>
            <p role="alert" className="font-serif text-lg text-oxblood max-w-md">The sketch sheet could not be opened. Reload the page to draw. Anything not yet added to the notebook is lost on a reload.</p>
          </Waiting>
        )}>
          {loading || loadError ? (
            <Waiting onCancel={onCancel}>
              {loadError
                ? <p role="alert" className="font-serif text-lg text-oxblood max-w-md">{loadError}</p>
                : <p className="font-serif italic text-lg text-sepia">Loading…</p>}
            </Waiting>
          ) : (
            <Suspense fallback={<Waiting onCancel={onCancel}><p className="font-serif italic text-lg text-sepia">Loading…</p></Waiting>}>
              <SketchPad
                initialElements={initialElements}
                ink={ink}
                inks={inks}
                onSave={onSave}
                onCancel={onCancel}
                onUploadPicture={onUploadPicture}
                onDirtyChange={setDirty}
                saveLabel={saveLabel}
                pictureOnlyLabel={pictureOnlyLabel}
              />
            </Suspense>
          )}
        </LoadBoundary>
      </div>
    </div>,
    document.body,
  );
}
