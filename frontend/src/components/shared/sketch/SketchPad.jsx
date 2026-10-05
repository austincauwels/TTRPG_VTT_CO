/*! The notebook's sketch sheet draws with Excalidraw (https://github.com/excalidraw/excalidraw),
    MIT License, Copyright (c) 2020 Excalidraw. The full notice is excalidraw/LICENSE.txt on this site. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ExcalidrawLib from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './sketchPad.css';
import { useConfirmStep } from '../ConfirmAction';
import { FormLine, PrinterMark } from '../PrintMarks';

// The drawing sheet itself, loaded only when a sketch is opened (loadSketchPad.js), so
// Excalidraw stays out of the main bundle. Excalidraw is the paper's canvas and nothing
// else: its own menus, library, help, hints and branding are hidden (sketchPad.css) and
// the sheet carries its own marks, all in the notebook's ink.
//
// Only the sheet's tools make elements (pen, line, arrow, box, ellipse, text; the eraser
// and select make none). A tool picked any other way (a key) goes back to the last of
// ours; pasted or dropped pictures are refused; the server keeps the same kinds only
// (backend vtt/sketch_scenes.py).

const { Excalidraw, exportToBlob } = ExcalidrawLib;
const CAPTURE_NOW = ExcalidrawLib.CaptureUpdateAction?.IMMEDIATELY;

const ELEMENT_TYPES = new Set(['freedraw', 'line', 'arrow', 'rectangle', 'ellipse', 'text']);
const SCENE_MAX = 1024 * 1024;  // bytes of UTF-8, as the server reads it
const NIBS = [{ width: 1, label: 'Fine nib' }, { width: 3, label: 'Broad nib' }];

// The scene as it is kept. Excalidraw writes a stroke's points and pen pressures with every
// decimal a number has; a tenth of a pixel and a hundredth of a pressure are finer than any
// pen draws, and keep a busy sheet well inside the limit. The picture is made from the
// drawing as it is on the sheet, before this.
const round = (value, places) => (typeof value === 'number' ? Number(value.toFixed(places)) : value);
const keptElement = (el) => ({
  ...el,
  ...(Array.isArray(el.points) ? { points: el.points.map(p => (Array.isArray(p) ? p.map(v => round(v, 1)) : p)) } : {}),
  ...(Array.isArray(el.pressures) ? { pressures: el.pressures.map(v => round(v, 2)) } : {}),
});
const sceneText = (elements) => JSON.stringify({ type: 'excalidraw', version: 2, elements: elements.map(keptElement) });
const sceneBytes = (text) => new Blob([text]).size;

const svg = { 'aria-hidden': true, focusable: 'false', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.6 };
const TOOLS = [
  { type: 'freedraw', label: 'Pen', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M15.5 3.8l4.7 4.7-9.6 9.6-5.6 1.3 1.3-5.6z" /><path d="M6.3 14l3.7 3.7M13.2 6.1l4.7 4.7" /><path d="M3.2 21c1.6-.9 3.2-1.1 4.8-.6" strokeWidth="1.3" /></svg>) },
  { type: 'line', label: 'Line', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M4.5 19.2C9.6 14.3 14.4 9.6 19.5 4.8" /></svg>) },
  { type: 'arrow', label: 'Arrow', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M4.5 19.5C9.5 14.6 14 10.2 18.8 5.3" /><path d="M11.8 5.1l7.1.1-.1 7" /></svg>) },
  { type: 'rectangle', label: 'Box', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M4.2 5.6c5.3-.5 10.4-.6 15.6-.2.3 4.4.4 8.7.1 13.1-5.2.4-10.4.4-15.6.1-.4-4.4-.4-8.7-.1-13Z" /></svg>) },
  { type: 'ellipse', label: 'Ellipse', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M12.2 5.2c4.7 0 8.3 3 8.3 6.8 0 3.9-3.8 6.9-8.6 6.8-4.6 0-8.3-3-8.3-6.9 0-3.8 3.9-6.7 8.6-6.7Z" /></svg>) },
  { type: 'text', label: 'Text', icon: (
    <svg {...svg} viewBox="0 0 24 24" strokeWidth="1.8"><path d="M5.5 6.5c4.3-.4 8.6-.4 13 0M12 6.4v12.2M9.3 18.7h5.4" /></svg>) },
  { type: 'eraser', label: 'Eraser', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M14.6 4.6l5 5-8.9 8.9H6.4l-2.6-2.6c-.6-.6-.6-1.5 0-2.1z" /><path d="M9.6 9.6l5 5M11 18.5h8" /></svg>) },
  { type: 'selection', label: 'Select', icon: (
    <svg {...svg} viewBox="0 0 24 24"><path d="M6 3.8l11.8 7.6-5.3 1.2 3.1 6.1-2.3 1.2-3.1-6.1-4 3.6z" /></svg>) },
];
const TOOL_TYPES = new Set(TOOLS.map(t => t.type));

const UndoMark = ({ flip }) => (
  <svg {...svg} viewBox="0 0 24 24" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M9 7.5L4.8 11.6 9 15.7" /><path d="M5.2 11.6h8.6c3.3 0 5.6 2.1 5.6 5 0 1-.3 1.9-.8 2.7" />
  </svg>
);

// An ink blot for a swatch: round, a little uneven, as a drop of ink is
const InkBlot = ({ color }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="w-5 h-5">
    <path d="M10.3 2.6c3.9.2 7 3 7.1 7 .2 4.1-3.1 7.6-7.3 7.7-4.2.1-7.6-3-7.6-7.2 0-4.3 3.4-7.7 7.8-7.5Z" fill={color} />
    <circle cx="16.6" cy="15.9" r="1" fill={color} />
  </svg>
);

const NibMark = ({ width }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M4 15.5c3.4-4.6 6.9-6.4 10.2-3.6 2.4 2 4.1 1.6 5.8-.9" strokeWidth={width === 1 ? 1.2 : 3.4} />
  </svg>
);

// 44 tall on a touch screen; 44 wide only from 400 across, so the eight tools fit one row
// on a 360 phone
const markBtn = (on) => `w-10 h-10 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(min-width:400px)]:w-11 shrink-0 flex items-center justify-center rounded-sm transition-colors ${
  on ? 'bg-ink text-cream' : 'text-sepia [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-ink/[0.06]'}`;

const UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false,
    saveAsImage: false, saveToActiveFile: false, toggleTheme: false,
  },
  tools: { image: false },
};

// The scene's own pop-ups (help, library, menus, link editor) never open on the sheet
const CLOSED_POPUPS = { openDialog: null, openSidebar: null, openMenu: null, openPopup: null, contextMenu: null, showHyperlinkPopup: false };
const anyPopupOpen = (s) => !!(s.openDialog || s.openSidebar || s.openMenu || s.openPopup || s.contextMenu || s.showHyperlinkPopup);

const signature = (elements) => elements.filter(e => !e.isDeleted).map(e => `${e.id}:${e.version}`).join('|');

/**
 * initialElements: the drawing to keep working on, or none for a new sheet.
 * ink: the writer's pen colour, the default stroke. inks: [{ color, name }] to choose from.
 * onSave(pngBlob, sceneJson): resolves to { ok } or { ok: false, error }. sceneJson is null
 * when the drawing was too large to keep and the picture is saved alone.
 * onCancel(), onUploadPicture() (a new sketch only), onDirtyChange(dirty).
 */
export default function SketchPad({ initialElements = null, ink, inks, onSave, onCancel, onUploadPicture, onDirtyChange, saveLabel = 'Save sketch', pictureOnlyLabel = 'Save picture only' }) {
  const [api, setApi] = useState(null);
  const [tool, setTool] = useState('freedraw');
  const [stroke, setStroke] = useState(ink);
  const [nib, setNib] = useState(NIBS[0].width);
  const [hasDrawing, setHasDrawing] = useState(!!initialElements?.length);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // The drawing was too large to keep: the picture alone can still be saved, until the
  // drawing changes (tooLargeAt holds its signature at the time)
  const [tooLarge, setTooLarge] = useState(false);
  const tooLargeAt = useRef(null);
  const wrapRef = useRef(null);
  const baseline = useRef(initialElements?.length ? null : '');
  const lastTool = useRef('freedraw');
  const cancelStep = useConfirmStep();
  const uploadStep = useConfirmStep();

  const initialData = useMemo(() => ({
    elements: initialElements || [],
    appState: {
      viewBackgroundColor: 'transparent',
      currentItemStrokeColor: ink,
      currentItemBackgroundColor: 'transparent',
      currentItemStrokeWidth: NIBS[0].width,
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      theme: 'light',
    },
    scrollToContent: !!initialElements?.length,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (api) api.setActiveTool({ type: 'freedraw' });
  }, [api]);

  const onChange = useCallback((elements, appState) => {
    // Changed since it opened: a new sheet once anything is on it; a drawing taken up again
    // once it differs from what was loaded (the first change that holds it is the baseline)
    const live = signature(elements);
    if (baseline.current === null && (!initialElements?.length || elements.some(e => !e.isDeleted))) baseline.current = live;
    setDirty(baseline.current !== null && live !== baseline.current);
    setHasDrawing(elements.some(e => !e.isDeleted && ELEMENT_TYPES.has(e.type)));
    // A changed drawing is measured again when it is saved
    if (tooLargeAt.current !== null && live !== tooLargeAt.current) {
      tooLargeAt.current = null;
      setTooLarge(false);
      setError('');
    }
    if (!api) return;
    const now = appState.activeTool?.type;
    if (now && !TOOL_TYPES.has(now)) {
      api.setActiveTool({ type: lastTool.current });
    } else if (now && now !== lastTool.current) {
      lastTool.current = now;
      setTool(now);
    }
    if (anyPopupOpen(appState)) api.updateScene({ appState: CLOSED_POPUPS });
  }, [api, initialElements]);

  const pickTool = (type) => {
    lastTool.current = type;
    setTool(type);
    api?.setActiveTool({ type });
  };

  // A colour or a nib applies to what comes next, and to what is selected
  const applyStyle = (appStatePatch, elementPatch) => {
    if (!api) return;
    const selected = api.getAppState().selectedElementIds || {};
    const scene = { appState: appStatePatch };
    if (Object.values(selected).some(Boolean)) {
      scene.elements = api.getSceneElementsIncludingDeleted().map(el => (selected[el.id] && !el.isDeleted
        ? { ...el, ...elementPatch, version: el.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
        : el));
      if (CAPTURE_NOW) scene.captureUpdate = CAPTURE_NOW;
    }
    api.updateScene(scene);
  };
  const pickInk = (color) => { setStroke(color); applyStyle({ currentItemStrokeColor: color }, { strokeColor: color }); };
  const pickNib = (width) => { setNib(width); applyStyle({ currentItemStrokeWidth: width }, { strokeWidth: width }); };

  // Excalidraw keeps undo to itself: press its own (hidden) buttons, or its keys
  const history = (redo) => {
    const root = wrapRef.current?.querySelector('.excalidraw');
    if (!root) return;
    const button = root.querySelector(redo
      ? '[data-testid="button-redo"], button[aria-label="Redo"]'
      : '[data-testid="button-undo"], button[aria-label="Undo"]');
    if (button) { button.click(); return; }
    root.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z', code: 'KeyZ', ctrlKey: true, metaKey: true, shiftKey: !!redo, bubbles: true, cancelable: true,
    }));
  };

  // pictureOnly: the drawing was too large to keep, so the picture goes without it (no
  // "Keep drawing" later). A drawing that fits again by then is kept after all.
  const save = async (pictureOnly = false) => {
    if (!api || saving) return;
    const elements = api.getSceneElements().filter(e => ELEMENT_TYPES.has(e.type));
    if (!elements.length) return;
    setSaving(true);
    setError('');
    try {
      const scene = sceneText(elements);
      const fits = sceneBytes(scene) <= SCENE_MAX;
      if (!fits && !pictureOnly) {
        tooLargeAt.current = signature(api.getSceneElements());
        setTooLarge(true);
        setError('This drawing is too large to keep for more drawing later.');
        return;
      }
      const png = await exportToBlob({
        elements,
        appState: { ...api.getAppState(), exportBackground: false, exportWithDarkMode: false },
        files: api.getFiles(),
        mimeType: 'image/png',
        exportPadding: 24,
        // As sharp as twice the screen, never wider or taller than 1600 pixels
        getDimensions: (w, h) => {
          const scale = Math.min(2, 1600 / Math.max(w, h, 1));
          return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
        },
      });
      const result = await onSave(png, fits ? scene : null);
      if (result && result.ok === false) setError(result.error || 'The sketch was not saved. Check your connection and try again; your drawing is still here.');
    } catch (e) {
      console.error('Sketch not saved:', e);
      setError('The sketch was not saved. Try again; your drawing is still here.');
    } finally {
      setSaving(false);
    }
  };

  // Pictures stay out of the drawing: pasted ones are refused here, dropped ones on the wrapper
  const onPaste = (data, event) => {
    if (event?.clipboardData?.files?.length) return false;
    if (data?.files && Object.keys(data.files).length) return false;
    if (data?.elements?.some(e => !ELEMENT_TYPES.has(e.type))) return false;
    return true;
  };
  const refuseFiles = (e) => {
    if (e.dataTransfer?.types?.includes?.('Files')) { e.preventDefault(); e.stopPropagation(); }
  };

  const cancel = () => (dirty ? cancelStep.press(onCancel) : onCancel());
  const upload = () => (hasDrawing ? uploadStep.press(onUploadPicture) : onUploadPicture());

  return (
    <div className="sketch-pad flex flex-col h-full min-h-0">
      {/* The sheet's head: leave, undo and redo, keep. Labels stay on one line: the head
          fits a 360 phone, and only a narrower one carries the keep button to a second line */}
      <div className="shrink-0 flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-b border-sepia/25">
        <div ref={cancelStep.ref} className="contents">
          <button
            type="button"
            onClick={cancel}
            className={`min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 whitespace-nowrap font-sans text-xs font-black uppercase tracking-widest rounded-sm border transition-colors ${
              cancelStep.armed ? 'bg-oxblood text-cream border-ink' : 'text-sepia border-sepia/45 hover:text-ink hover:border-ink/60'}`}
          >
            {cancelStep.armed ? 'Discard' : 'Cancel'}
          </button>
        </div>
        <div className="flex-1" />
        <button type="button" aria-label="Undo" title="Undo" onClick={() => history(false)} className={markBtn(false)}><UndoMark /></button>
        <button type="button" aria-label="Redo" title="Redo" onClick={() => history(true)} className={markBtn(false)}><UndoMark flip /></button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => save()}
          disabled={!api || !hasDrawing || saving}
          className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 sm:px-4 whitespace-nowrap font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded shadow-[1px_2px_4px_rgba(0,0,0,0.3)] hover:brightness-125 disabled:bg-ink/60 disabled:text-cream/40 disabled:shadow-none transition"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>

      {/* Tools, inks and nibs */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 sm:px-3 py-1.5 border-b border-sepia/20">
        <div role="toolbar" aria-label="Drawing tools" className="flex flex-wrap items-center gap-0.5">
          {TOOLS.map(t => (
            <button key={t.type} type="button" aria-label={t.label} title={t.label} aria-pressed={tool === t.type}
              onClick={() => pickTool(t.type)} className={markBtn(tool === t.type)}>
              <span className="w-6 h-6 block">{t.icon}</span>
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="hidden sm:block w-px h-6 bg-sepia/30" />
        <div role="toolbar" aria-label="Ink" className="flex items-center gap-0.5">
          {inks.map(i => (
            <button key={i.color} type="button" aria-label={i.name} title={i.name} aria-pressed={stroke === i.color}
              onClick={() => pickInk(i.color)}
              className={`w-9 h-9 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-11 md:[@media(pointer:coarse)]:w-11 shrink-0 flex items-center justify-center rounded-full transition ${
                stroke === i.color ? 'ring-2 ring-ink ring-offset-1 ring-offset-cream' : '[@media(hover:hover)]:hover:bg-ink/[0.06]'}`}>
              <InkBlot color={i.color} />
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="hidden sm:block w-px h-6 bg-sepia/30" />
        <div role="toolbar" aria-label="Nib" className="flex items-center gap-0.5">
          {NIBS.map(n => (
            <button key={n.width} type="button" aria-label={n.label} title={n.label} aria-pressed={nib === n.width}
              onClick={() => pickNib(n.width)} className={markBtn(nib === n.width)}>
              <NibMark width={n.width} />
            </button>
          ))}
        </div>
      </div>

      {/* The paper: Excalidraw's canvas is clear, so the sheet's own paper shows through */}
      <div ref={wrapRef} className="sketch-canvas relative flex-1 min-h-0" onDragOverCapture={refuseFiles} onDropCapture={refuseFiles}>
        <div className="absolute inset-0">
          <Excalidraw
            excalidrawAPI={setApi}
            initialData={initialData}
            onChange={onChange}
            onPaste={onPaste}
            onLinkOpen={(el, e) => e.preventDefault()}
            UIOptions={UI_OPTIONS}
            theme="light"
            langCode="en"
            aiEnabled={false}
            autoFocus
            renderTopRightUI={() => null}
            // Modes the hidden menus would be needed to leave again (Alt+R view mode, the
            // grid, zen mode) stay off, and a pasted video link stays text: an embedded
            // frame would load another site on the sheet and be missing from the picture
            viewModeEnabled={false}
            gridModeEnabled={false}
            zenModeEnabled={false}
            validateEmbeddable={false}
          />
        </div>
      </div>

      {/* The foot: another way in, what went wrong, and the form's small print. On a short
          screen only when it has something to say */}
      <div className={`shrink-0 ${onUploadPicture || error ? 'flex' : 'hidden framed:flex'} flex-wrap items-center gap-x-4 gap-y-1 px-2 sm:px-3 py-2 border-t border-sepia/25`}>
        {onUploadPicture && (
          <div ref={uploadStep.ref} className="contents">
            <button
              type="button"
              onClick={upload}
              className={`min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest rounded-sm border transition-colors ${
                uploadStep.armed ? 'bg-oxblood text-cream border-ink' : 'text-sepia border-sepia/45 hover:text-ink hover:border-ink/60'}`}
            >
              {uploadStep.armed ? 'Discard and upload' : 'Upload a picture'}
            </button>
          </div>
        )}
        {error && <p role="alert" className="font-serif text-base text-oxblood leading-snug min-w-0 flex-1 basis-48">{error}</p>}
        {tooLarge && (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] px-3 whitespace-nowrap font-sans text-xs font-black uppercase tracking-widest rounded-sm border text-oxblood border-oxblood/60 hover:bg-oxblood hover:text-cream disabled:opacity-50 transition-colors"
          >
            {pictureOnlyLabel}
          </button>
        )}
        <span className="ml-auto hidden framed:flex items-center gap-2" aria-hidden="true">
          <PrinterMark size={11} />
          <FormLine>Field register · Field sketch · Form C.O. 5</FormLine>
        </span>
      </div>
    </div>
  );
}
