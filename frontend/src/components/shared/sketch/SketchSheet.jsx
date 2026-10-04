import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../useDialog';
import { loadSketchPad } from './loadSketchPad';

// The notebook's drawing sheet (owner's round 4 item 19): a sheet of her paper laid over
// the desk, opened by Sketch for a new drawing, or by the author's "Keep drawing" on a
// drawn sketch. This frame is in the main bundle; the drawing itself (SketchPad, with
// Excalidraw) arrives when the sheet opens.
//
// Escape and Cancel close it; once something is drawn, Escape does nothing and Cancel
// asks a second press, so a drawing is never lost by accident. A phone gets the whole
// screen; from sm it is a large sheet on the dimmed desk.

const SketchPad = lazy(loadSketchPad);

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

export function SketchSheet({ initialElements = null, loading = false, loadError = '', ink, inks, onSave, onCancel, onUploadPicture, saveLabel }) {
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
    <div className="fixed inset-0 z-[650] flex items-stretch sm:items-center justify-center sm:p-6" style={{ background: 'rgb(var(--c-night) / 0.82)' }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Field sketch"
        className="sketch-sheet relative w-full h-[100dvh] sm:h-[min(820px,calc(100dvh-48px))] sm:max-w-[1120px] bg-cream text-ink sm:rounded-sm sm:border sm:border-sepia/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden overscroll-contain"
      >
        <LoadBoundary fallback={(
          <Waiting onCancel={onCancel}>
            <p role="alert" className="font-serif text-lg text-oxblood max-w-md">The sketch sheet could not be opened. Check your connection and try again.</p>
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
              />
            </Suspense>
          )}
        </LoadBoundary>
      </div>
    </div>,
    document.body,
  );
}
