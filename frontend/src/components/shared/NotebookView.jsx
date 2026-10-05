import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import useGameStore from '../../store/gameStore';
import { ConfirmAction } from './ConfirmAction';
import { CameraIcon, PencilIcon } from './NotebookIcons';
import { tiltFor } from './handPlaced';
import { FormLine, PrinterMark } from './PrintMarks';
import { pageKeyBlocked } from './a11y';
import { playPaperSound } from '../../game/rollSounds';
import { TickMark } from './InkMarks';
import { NoteMarkdown } from './NoteMarkdown';
import { MarkdownMarks, PreviewToggle } from './MarkdownMarks';
import { SketchSheet } from './sketch/SketchSheet';

const GM_PEN_FONT  = 'Caveat';
const GM_INK_COLOR = 'rgb(var(--c-ink))';

const PEN_FONTS = [
  'Caveat', 'Reenie Beenie', 'Kalam', 'Indie Flower', 'Patrick Hand',
  'Shadows Into Light', 'Zeyada', 'Sacramento', 'Homemade Apple', 'Alex Brush',
  'Cedarville Cursive', 'La Belle Aurore', 'Charm', 'Dawning of a New Day',
  'Gaegu', 'Grape Nuts', 'Moondance', 'Long Cang', 'Rock Salt', 'Gochi Hand',
];
const ENTRIES_PER_SIDE = 3;

// Her ink colours on the sketch sheet: the notebook's black ink and the five players' inks
// (backend engine.INK_COLORS). The writer's own pen comes first and is the stroke it starts with.
const SKETCH_INKS = [
  { color: '#1a1311', name: 'Black ink' },
  { color: '#8b1a1a', name: 'Red ink' },
  { color: '#4a1a8b', name: 'Violet ink' },
  { color: '#1a5a1a', name: 'Green ink' },
  { color: '#8b4a0a', name: 'Umber ink' },
  { color: '#1a3a6a', name: 'Blue ink' },
];

const LINED_PAPER = {
  backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.07) 27px, rgba(0,0,0,0.07) 28px)',
  backgroundSize: '100% 28px',
  backgroundPosition: '0 4px',
  // The ruling scrolls with the writing when a page holds more than it shows
  backgroundAttachment: 'local',
};

// The contents' lines: each entry is one line of this height, with this gap
const TOC_ROW = 40;
const TOC_GAP = 6;

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return isoStr; }
}

// The foot of a page: the page number, and the register's printed line between. A page
// with a turned-up corner keeps its number clear of the corner.
function pageFooter(left, right, clearCorners = '') {
  return (
    <div className={`pt-4 border-t border-ink/10 flex justify-between items-center gap-3 font-sans font-bold text-xs uppercase tracking-widest text-sepia ${clearCorners}`}>
      <span className="min-w-[4rem]">{left}</span>
      <span className="hidden sm:flex items-center gap-2" aria-hidden="true">
        <PrinterMark size={11} />
        <FormLine>Candela Obscura · Field register · Form C.O. 5</FormLine>
      </span>
      <span className="min-w-[4rem] text-right font-bold">{right}</span>
    </div>
  );
}

// A page's outer bottom corner, turned up: press it to turn the page. It lifts further under
// the pointer or the keyboard focus. 'next' is the right-hand corner, 'prev' the left-hand
// one (the same drawing, mirrored). The lamp is above left, so the curl's shadow always
// falls down and to the right.
function PageCorner({ side, onTurn, label }) {
  const next = side === 'next';
  const gradId = useId();
  return (
    <button
      type="button"
      onClick={onTurn}
      aria-label={label}
      title={label}
      className={`page-corner page-corner-${side} absolute bottom-0 ${next ? 'right-0' : 'left-0'} z-30 w-16 h-16 [outline-offset:-6px]`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="44" y1="44" x2="22" y2="22">
            <stop offset="0" stopColor="rgb(var(--c-cream))" />
            <stop offset="1" stopColor="rgb(var(--c-parchment-deep))" />
          </linearGradient>
        </defs>
        <g transform={next ? undefined : 'translate(64 0) scale(-1 1)'}>
          {/* The next leaf, where the corner has lifted off it */}
          <path d="M22 64 L64 22 L64 64 Z" fill="rgb(var(--c-parchment-deep))" />
          {/* The turned-up corner: the back of the same paper, with its shadow */}
          <path className="page-corner-flap" d="M22 64 L64 22 L22 22 Z" fill={`url(#${gradId})`}
            stroke="rgb(var(--c-ink) / 0.14)" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M33.5 30 L40 36.5 L33.5 43" fill="none" stroke="rgb(var(--c-oxblood))"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </button>
  );
}

// The ribbon marker sewn into the spine, left at the contents: pull it to go back there.
// It hangs from the top of the book on every page of entries.
function ContentsRibbon({ onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="contents-ribbon absolute top-0 z-30 right-4 lg:right-auto lg:left-[calc(50%-50px)]">
      <span className="contents-ribbon-band">
        <span className="contents-ribbon-label">Contents</span>
      </span>
    </button>
  );
}

// An engraved arrow, the kind printed at the foot of a contents page
const PrintArrow = ({ dir }) => (
  <svg viewBox="0 0 30 14" width="30" height="14" aria-hidden="true" focusable="false"
    style={dir === 'prev' ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M2 7h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 2l7 5-7 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 4v6M5 5v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

// How many contents lines fit the list as it is laid out now. The page has a fixed size, so
// this is fixed too; it is measured so a wrapped row of author names never pushes a line
// off the page.
function useLinesThatFit() {
  const [count, setCount] = useState(8);
  const observer = useRef(null);
  const ref = useCallback((node) => {
    if (observer.current) { observer.current.disconnect(); observer.current = null; }
    if (!node) return;
    const measure = () => {
      const fits = Math.floor((node.clientHeight + TOC_GAP) / (TOC_ROW + TOC_GAP));
      setCount(Math.max(3, fits));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(node);
    }
  }, []);
  return [ref, count];
}

// A sketch or a photograph lies across the whole page, as wide as the page allows inside
// its margins, at its own shape. A tall one is scaled down to about two thirds of the
// page's height (66cqh: the page from lg, where the page is a size container; below lg,
// where the page is as long as it needs, 66svh of the screen) and stays centred. Its width
// follows from its shape once it has loaded, so a photograph's white border hugs it.
const PICTURE_MAX_H = '66cqh';

function usePictureRatio() {
  const [ratio, setRatio] = useState(null);
  const read = useCallback((img) => {
    if (img && img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
  }, []);
  // A picture already in the cache may have loaded before React saw it
  const ref = useCallback((img) => { if (img && img.complete) read(img); }, [read]);
  return [ratio, ref, (e) => read(e.currentTarget)];
}

// The width that keeps a picture of this shape within the page and within the height cap;
// `extra` is a frame's own width (a photograph's border)
const pictureWidth = (ratio, extra = 0) => (ratio
  ? `min(100%, calc(${PICTURE_MAX_H} * ${ratio.toFixed(4)} + ${extra}px))`
  : undefined);

// Ink on the page: the drawing multiplies into the paper, a little crooked. The tilt is on
// the picture itself, since a transformed wrapper would cut the blend off from the paper.
function SketchPicture({ entry, onRedraw }) {
  const [ratio, ref, onLoad] = usePictureRatio();
  return (
    <div className="px-2 sm:px-4 pt-4 pb-1">
      <div className="mx-auto" style={{ width: pictureWidth(ratio), maxWidth: '100%' }}>
        <img
          ref={ref}
          onLoad={onLoad}
          src={entry.image_data}
          alt={entry.title}
          className="hand-placed block mx-auto"
          style={{
            '--tilt': `${tiltFor(entry.id, { min: 0.5, max: 1.2 })}deg`,
            width: ratio ? '100%' : 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: PICTURE_MAX_H,
            mixBlendMode: 'multiply',
          }}
        />
      </div>
      {onRedraw && (
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={onRedraw}
            aria-label={`Keep drawing ${entry.title}`}
            className="min-h-[36px] [@media(pointer:coarse)]:min-h-[44px] px-2 inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-xs font-black uppercase tracking-widest text-sepia hover:text-oxblood rounded-sm hover:bg-ink/[0.04] transition-colors"
          >
            <PencilIcon size={14} /> Keep drawing
          </button>
        </div>
      )}
    </div>
  );
}

// A print with a white border and a strip of masking tape across its head, a little crooked
function PhotoPicture({ entry }) {
  const [ratio, ref, onLoad] = usePictureRatio();
  return (
    <div className="px-3 sm:px-4 pt-5 pb-3">
      <div className="relative mx-auto" style={{ width: pictureWidth(ratio, 16), maxWidth: '100%' }}>
        {/* Masking tape strip */}
        <div style={{
          position: 'absolute', top: -10, left: '50%', width: 'clamp(72px, 34%, 170px)', height: 22,
          background: 'rgb(var(--c-parchment-deep) / 0.75)', transform: 'translateX(-50%) rotate(-1deg)',
          zIndex: 2, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
        <div
          className="hand-placed"
          style={{
            '--tilt': `${tiltFor(entry.id, { min: 0.4, max: 1 })}deg`,
            background: '#fff',
            padding: '8px 8px 28px',
            boxShadow: '2px 4px 10px rgba(0,0,0,0.35)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <img
            ref={ref}
            onLoad={onLoad}
            src={entry.image_data}
            alt={entry.title}
            className="block mx-auto"
            style={{ width: ratio ? '100%' : 'auto', height: 'auto', maxWidth: '100%', maxHeight: PICTURE_MAX_H }}
          />
        </div>
      </div>
    </div>
  );
}

// Renders a single notebook entry: a field log, sketch, photo or Lightkeeper entry.
// onRedraw: given for a drawn sketch its reader wrote, who can take it up again.
function EntryCard({ entry, isLast, onRedraw }) {
  const eType = entry.entry_type || 'field_log';

  // Sketch or photo: the picture across the page, then the title, the caption and the hand
  // under it (owner, 2026-10-05: never shrunk off to the side)
  if ((eType === 'sketch' || eType === 'photo') && entry.image_data) {
    return (
      <div className={`break-words ${isLast ? '' : 'pb-5 mb-5 border-b border-ink/10'}`}>
        {eType === 'sketch'
          ? <SketchPicture entry={entry} onRedraw={onRedraw} />
          : <PhotoPicture entry={entry} />}
        <h3 className="leading-tight mt-2 mb-1 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2rem' }}>
          {entry.title}
        </h3>
        {entry.content && (
          <NoteMarkdown text={entry.content} className="text-[26px] leading-[2.8rem]" style={{ fontFamily: entry.pen_font, color: entry.ink_color }} />
        )}
        <div className="text-[18px] mt-2" style={{ fontFamily: entry.pen_font, color: entry.ink_color, opacity: 0.5 }}>
          — {entry.author_name} · {formatDate(entry.created_at)}
        </div>
      </div>
    );
  }

  // Lightkeeper: letterhead style
  if (eType === 'lightkeeper') {
    return (
      <div className={`break-words ${isLast ? '' : 'pb-5 mb-5 border-b border-ink/10'}`}>
        <div className="border-b-2 border-ink/70 pb-2 mb-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-ink/70 flex items-center justify-center text-lg font-serif font-black">✦</div>
            <span className="font-serif italic text-sm sm:text-base text-sepia">From the Lightkeeper</span>
          </div>
          <span className="font-mono text-sm text-sepia">{formatDate(entry.created_at)}</span>
        </div>
        <h3 className="font-serif font-black text-[2rem] text-ink mb-2">{entry.title}</h3>
        <NoteMarkdown text={entry.content} className="font-serif text-[26px] leading-[2.8rem] text-ink/85" />
        <div className="mt-3 pt-2 border-t border-ink/10 font-sans font-bold text-sm text-sepia uppercase tracking-widest">
          {entry.author_name}, Lightkeeper
        </div>
      </div>
    );
  }

  // Standard field_log
  return (
    <div className={`break-words ${isLast ? '' : 'pb-5 mb-5 border-b border-ink/10'}`}>
      <h3 className="leading-tight mb-0.5 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2.3rem' }}>
        {entry.title}
      </h3>
      <div className="text-[20px] mb-3" style={{ fontFamily: entry.pen_font, color: entry.ink_color, opacity: 0.55 }}>
        — {entry.author_name} · {formatDate(entry.created_at)}
      </div>
      <NoteMarkdown text={entry.content} className="text-[28px] leading-[3rem]" style={{ fontFamily: entry.pen_font, color: entry.ink_color }} />
    </div>
  );
}

// A push pin seen from above, its round head in oxblood with the lamp's glint on it
const NotePin = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"
    className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
    <path d="M12.8 13.4l2.6 6.2" stroke="rgb(var(--c-sepia))" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="12" cy="11" r="7" style={{ fill: 'rgb(var(--c-oxblood))' }} />
    <circle cx="12" cy="11" r="7" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
    <circle cx="12.6" cy="11.7" r="4.2" fill="rgba(0,0,0,0.18)" />
    <path d="M8.4 9.2c.7-1.6 2-2.6 3.6-2.9" stroke="rgba(255,236,224,0.6)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </svg>
);

// A private note pinned to the page: torn along the top, a little crooked (fixed per
// note), with a pin through it. The shadow is a drop-shadow on the wrapper, so it follows
// the torn edge (a clip-path would cut off a box-shadow) and the pin casts one too.
function EphemeralNote({ entry, onDelete }) {
  return (
    <div
      className="pinned-note hand-placed relative pt-2"
      style={{ '--tilt': `${tiltFor(entry.id, { min: 0.6, max: 2 })}deg`, filter: 'drop-shadow(3px 6px 6px rgba(0,0,0,0.3))' }}
    >
    <NotePin />
    <div
      className="relative"
      style={{
        background: 'rgb(var(--c-cream))',
        padding: '22px 16px 28px',
        minHeight: 140,
        // torn top edge via clip-path
        clipPath: 'polygon(0% 4%, 8% 0%, 18% 3%, 28% 1%, 40% 4%, 52% 0%, 62% 3%, 74% 0%, 84% 3%, 93% 1%, 100% 3%, 100% 100%, 0% 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <NoteMarkdown text={entry.content || entry.title} className="font-serif text-[22px] leading-[1.6] break-words text-ink/80 pr-2" style={{ fontFamily: entry.pen_font, color: entry.ink_color }} />
      <ConfirmAction
        className="mt-3 mb-3 flex flex-wrap items-center gap-2"
        onConfirm={onDelete}
        cancelLabel="Keep"
        armedHint="Press again to delete this note for good."
        renderButton={(armed, props) => (
          <button
            {...props}
            aria-label={armed ? 'Yes, delete this private note' : 'Delete this private note'}
            className={`min-h-[36px] px-3 font-sans text-xs font-bold uppercase tracking-widest border rounded-sm transition-colors ${
              armed ? 'bg-oxblood text-cream border-ink' : 'text-sepia hover:text-oxblood border-sepia/30 hover:border-oxblood/50'
            }`}
          >
            {armed ? 'Yes, delete' : 'Delete'}
          </button>
        )}
      />
      <div className="absolute bottom-2 right-3 font-mono text-xs text-sepia">{formatDate(entry.created_at)}</div>
    </div>
    </div>
  );
}

// `fit`: on a desk that fits the screen (xl and up), the binder fills its column's height
// and the book takes what the tabs leave, instead of its fixed 800px spread.
export const NotebookView = ({ isGM: isGMProp = null, fit = false }) => {
  const {
    notebookEntries,
    character,
    accessSession,
    fetchNotebookEntries,
    submitNotebookEntry,
    updateNotebookEntry,
    deleteEphemeralNote,
    uploadNotebookImage,
    fetchSketchScene,
    redrawSketch,
    updatePenFont,
    notebookLoadError,
  } = useGameStore();

  const isGM      = isGMProp !== null ? isGMProp : accessSession?.role === 'GM';
  const campaignId = accessSession?.campaignId || character?.campaign_id;

  const [currentSpread, setCurrentSpread]               = useState(0);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState(null);
  const [newEntryTitle, setNewEntryTitle]               = useState('');
  const [newEntryContent, setNewEntryContent]           = useState('');
  const [isSubmitting, setIsSubmitting]                 = useState(false);
  const [submitError, setSubmitError]                   = useState('');
  // Ephemeral notes section
  const [showEphemeral, setShowEphemeral]               = useState(false);
  const [ephemeralText, setEphemeralText]               = useState('');
  const [isAddingEphemeral, setIsAddingEphemeral]       = useState(false);
  const [ephemeralError, setEphemeralError]             = useState('');
  const [deleteError, setDeleteError]                   = useState('');
  // Lightkeeper resources — single continuous note
  const [showLKResources, setShowLKResources]           = useState(false);
  const [lkContent, setLkContent]                       = useState('');
  const [lkSaveStatus, setLkSaveStatus]                 = useState('saved');
  const lkEntryId                                       = useRef(null);
  const lkSaveTimer                                     = useRef(null);
  // Image upload — staged, not auto-submitted
  const sketchInputRef  = useRef(null);
  const photoInputRef   = useRef(null);
  const [uploadCaption, setUploadCaption]               = useState('');
  const [isUploading, setIsUploading]                   = useState(false);
  const [pendingImageFile, setPendingImageFile]         = useState(null);
  const [pendingImagePreview, setPendingImagePreview]   = useState(null);
  const [pendingImageType, setPendingImageType]         = useState(null);
  const [uploadError, setUploadError]                   = useState('');
  // Markdown: each writing field has its marks and a Preview that shows the note in its place
  const entryTextRef     = useRef(null);
  const ephemeralTextRef = useRef(null);
  const lkTextRef        = useRef(null);
  const [entryPreview, setEntryPreview]                 = useState(false);
  const [ephemeralPreview, setEphemeralPreview]         = useState(false);
  const [lkPreview, setLkPreview]                       = useState(false);
  const idBase = useId();
  // The drawing sheet: { mode: 'new', elements } for the entry being written, or
  // { mode: 'redraw', entry, loading, error, elements } when the author takes a sketch up
  // again. A drawing made for a new entry waits, with its scene, beside the staged picture.
  const [sketchSheet, setSketchSheet]                   = useState(null);
  const [pendingScene, setPendingScene]                 = useState(null);

  useEffect(() => {
    if (campaignId) fetchNotebookEntries(campaignId);
  }, [campaignId]);

  // Split entries by type for display
  const fieldEntries      = notebookEntries.filter(e => !e.is_deleted && (e.entry_type === 'field_log' || e.entry_type === 'sketch' || e.entry_type === 'photo'));
  const ephemeralEntries  = notebookEntries.filter(e => !e.is_deleted && e.entry_type === 'ephemeral');
  const lkEntries         = notebookEntries.filter(e => !e.is_deleted && e.entry_type === 'lightkeeper');

  const perSpread    = ENTRIES_PER_SIDE * 2;
  const totalSpreads = Math.ceil(fieldEntries.length / perSpread) || 0;

  const getSpreadEntries = (spread) => {
    const start = (spread - 1) * perSpread;
    return {
      left:  fieldEntries.slice(start, start + ENTRIES_PER_SIDE),
      right: fieldEntries.slice(start + ENTRIES_PER_SIDE, start + perSpread),
    };
  };

  const entrySpread = (entry) => {
    const idx = fieldEntries.findIndex(e => e.id === entry.id);
    return idx === -1 ? 1 : Math.floor(idx / perSpread) + 1;
  };

  // Populate LK content from the single stored entry on load
  useEffect(() => {
    if (!isGM || lkEntries.length === 0) return;
    // Find the main entry (title 'lk_main') or fall back to the first one
    const main = lkEntries.find(e => e.title === 'lk_main') || lkEntries[0];
    if (main) {
      setLkContent(main.content || '');
      lkEntryId.current = main.id;
    }
  }, [lkEntries.length]);

  const authorMap = {};
  fieldEntries.forEach(e => {
    if (!authorMap[e.author_name]) {
      authorMap[e.author_name] = { pen_font: e.pen_font, ink_color: e.ink_color, author_type: e.author_type };
    }
  });
  const authorKeys = Object.keys(authorMap).sort((a, b) => {
    if (authorMap[a].author_type === 'gm') return -1;
    if (authorMap[b].author_type === 'gm') return 1;
    return a.localeCompare(b);
  });
  const activeFilter    = selectedAuthorFilter;
  const filteredEntries = activeFilter
    ? fieldEntries.filter(e => e.author_name === activeFilter)
    : fieldEntries;

  const authorFont  = isGM ? GM_PEN_FONT  : (character?.pen_font  || GM_PEN_FONT);
  const authorColor = isGM ? GM_INK_COLOR : (character?.ink_color || 'rgb(var(--c-oxblood))');
  const authorName  = isGM ? (accessSession?.name || 'Lightkeeper') : (character?.name || 'Unknown');

  const handleSubmitEntry = async () => {
    if (!newEntryTitle.trim() || (!newEntryContent.trim() && !pendingImageFile)) {
      setSubmitError('Give the entry a title, and write something or add an image.');
      return;
    }
    if (!campaignId) { setSubmitError('This notebook belongs to a campaign, and you are not in one. Join a campaign to write entries.'); return; }
    if (!isGM && !character?.name) { setSubmitError('Your investigator is still loading. Wait a moment, then try again.'); return; }
    setIsSubmitting(true);
    setSubmitError('');
    setUploadError('');

    let result;
    if (pendingImageFile) {
      setIsUploading(true);
      result = await uploadNotebookImage(
        campaignId, pendingImageFile,
        uploadCaption || newEntryTitle.trim() || (pendingImageType === 'sketch' ? 'Field Sketch' : 'Photograph'),
        newEntryContent.trim(),
        authorName, isGM ? 'gm' : 'player',
        pendingImageType,
        isGM ? null : character?.id,
        pendingImageType === 'sketch' ? pendingScene : null,
      );
      setIsUploading(false);
      if (!result.success) {
        if (result.tooLarge) {
          // The server takes pictures of up to 2 MB, and a drawing of up to 1 MB
          setUploadError(pendingScene && /drawing/i.test(result.detail || '')
            ? result.detail
            : 'That image is larger than 2 MB. Choose a smaller file, or a smaller copy of it.');
        } else {
          setSubmitError('The image did not upload, so the entry was not saved. Check your connection and try again.');
        }
        setIsSubmitting(false);
        return;
      }
      clearPendingImage();
    } else {
      result = await submitNotebookEntry(
        campaignId, newEntryTitle.trim(), newEntryContent.trim(),
        authorName, isGM ? 'gm' : 'player',
        isGM ? null : character?.id,
      );
    }

    setIsSubmitting(false);
    if (result.success && result.entry) {
      setNewEntryTitle('');
      setNewEntryContent('');
      setUploadCaption('');
      setEntryPreview(false);
      const newIdx = fieldEntries.length;
      setCurrentSpread(Math.floor(newIdx / perSpread) + 1);
    } else if (!result.tooLarge) {
      setSubmitError('The entry was not saved. Check your connection and try again; your text is still here.');
    }
  };

  const handleAddEphemeral = async () => {
    if (!ephemeralText.trim() || isAddingEphemeral) return;
    if (!campaignId) { setEphemeralError('Notes belong to a campaign, and you are not in one. Join a campaign to keep notes.'); return; }
    setIsAddingEphemeral(true);
    setEphemeralError('');
    const result = await submitNotebookEntry(
      campaignId, 'Private Note', ephemeralText.trim(),
      authorName, isGM ? 'gm' : 'player',
      isGM ? null : character?.id,
      'ephemeral', 'self',
    );
    setIsAddingEphemeral(false);
    if (result?.success) { setEphemeralText(''); setEphemeralPreview(false); }
    else setEphemeralError('The note was not saved. Check your connection and try again; your text is still here.');
  };

  const handleDelete = async (entryId) => {
    setDeleteError('');
    const ok = await deleteEphemeralNote(entryId);
    if (!ok) setDeleteError('That was not deleted. Check your connection and try again.');
  };

  const handleLKContentChange = (value) => {
    setLkContent(value);
    setLkSaveStatus('saving');
    clearTimeout(lkSaveTimer.current);
    lkSaveTimer.current = setTimeout(() => saveLkContent(value), 1200);
  };

  // The text stays in the page whatever happens; a failed save says so and offers a retry.
  const saveLkContent = async (value) => {
    if (!campaignId) return;
    setLkSaveStatus('saving');
    let ok;
    if (lkEntryId.current) {
      ok = (await updateNotebookEntry(lkEntryId.current, 'lk_main', value))?.success;
    } else {
      const result = await submitNotebookEntry(
        campaignId, 'lk_main', value,
        'Lightkeeper', 'gm',
        null, 'lightkeeper', 'gm_only',
      );
      if (result?.entry?.id) lkEntryId.current = result.entry.id;
      ok = result?.success;
    }
    setLkSaveStatus(ok ? 'saved' : 'error');
  };

  const handleStageImage = (file, type) => {
    if (!file) return;
    setUploadError('');
    const reader = new FileReader();
    reader.onload = e => {
      setPendingImageFile(file);
      setPendingImagePreview(e.target.result);
      setPendingImageType(type);
      setPendingScene(null);
    };
    reader.readAsDataURL(file);
  };

  const clearPendingImage = () => {
    setPendingImageFile(null);
    setPendingImagePreview(null);
    setPendingImageType(null);
    setPendingScene(null);
    setUploadError('');
  };

  // --- The drawing sheet ---------------------------------------------------------
  // Her ink colours, the writer's own pen first and the stroke it starts with
  const penInk = isGM ? SKETCH_INKS[0].color : (character?.ink_color || '#8b1a1a');
  const sketchInks = [
    SKETCH_INKS.find(i => i.color.toLowerCase() === penInk.toLowerCase()) || { color: penInk, name: 'Your ink' },
    ...SKETCH_INKS.filter(i => i.color.toLowerCase() !== penInk.toLowerCase()),
  ];

  // A drawn sketch can be taken up again by its author only (the server says the same)
  const canRedraw = (entry) => entry.entry_type === 'sketch' && entry.has_scene && (isGM
    ? entry.character_id == null && entry.author_type === 'gm'
    : entry.character_id != null && entry.character_id === character?.id);

  const openNewSketch = () => {
    let elements = null;
    try { elements = pendingScene ? JSON.parse(pendingScene).elements : null; } catch { elements = null; }
    setSketchSheet({ mode: 'new', elements });
  };

  const openRedraw = async (entry) => {
    setSketchSheet({ mode: 'redraw', entry, loading: true });
    const res = await fetchSketchScene(entry.id);
    setSketchSheet(s => (s?.entry?.id !== entry.id ? s : res.success
      ? { ...s, loading: false, elements: res.scene?.elements || [] }
      : { ...s, loading: false, error: 'The drawing could not be opened. Check your connection and try again.' }));
  };

  // A new drawing waits beside the entry, with its scene, until the entry is added. A
  // drawing too large to keep comes without one (scene null) and goes as a plain picture.
  const stageDrawing = (png, scene) => new Promise((resolve) => {
    if (png.size > 2 * 1024 * 1024) {
      resolve({ ok: false, error: 'The sketch is larger than 2 MB. Draw it smaller, or with fewer strokes.' });
      return;
    }
    const file = new File([png], 'sketch.png', { type: 'image/png' });
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadError('');
      setPendingImageFile(file);
      setPendingImagePreview(e.target.result);
      setPendingImageType('sketch');
      setPendingScene(scene);
      setSketchSheet(null);
      resolve({ ok: true });
    };
    reader.onerror = () => resolve({ ok: false, error: 'The sketch could not be kept. Try again.' });
    reader.readAsDataURL(file);
  });

  const saveRedraw = async (png, scene) => {
    const entry = sketchSheet?.entry;
    if (!entry) return { ok: false };
    const res = await redrawSketch(entry.id, png, scene);
    if (res.success) { setSketchSheet(null); return { ok: true }; }
    if (res.tooLarge) return { ok: false, error: res.detail && /drawing/i.test(res.detail) ? res.detail : 'The sketch is larger than 2 MB. Draw it smaller, or with fewer strokes.' };
    return { ok: false, error: 'The sketch was not saved. Check your connection and try again; your drawing is still here.' };
  };

  // "Upload a picture", the sheet's other way: the PNG picker, as Sketch was before
  const uploadInstead = () => {
    setSketchSheet(null);
    sketchInputRef.current?.click();
  };

  const goToPrev = () => setCurrentSpread(s => Math.max(0, s - 1));
  const goToNext = () => setCurrentSpread(s => Math.min(totalSpreads, s + 1));
  const goToContents = () => setCurrentSpread(0);

  // A deleted entry can leave the book open past its last page
  useEffect(() => {
    if (currentSpread > totalSpreads) setCurrentSpread(totalSpreads);
  }, [currentSpread, totalSpreads]);

  // A page turns whenever the spread changes (a corner, the ribbon, an arrow key, a contents
  // line, a new entry): a blank leaf lifts from the spine and turns over the new pages,
  // which are already there under it, and the paper sounds. Decorative and short; no leaf
  // under reduced motion (index.css).
  const [leaf, setLeaf] = useState(null); // { key, dir }
  const shownSpread = useRef(currentSpread);
  useEffect(() => {
    if (shownSpread.current === currentSpread) return;
    const dir = currentSpread > shownSpread.current ? 'forward' : 'back';
    shownSpread.current = currentSpread;
    setLeaf({ key: `${currentSpread}-${Date.now()}`, dir });
    playPaperSound();
    // Clear it even if the animation never ends here (another tab opened mid-turn)
    const done = setTimeout(() => setLeaf(null), 800);
    return () => clearTimeout(done);
  }, [currentSpread]);

  // The left and right arrow keys turn the pages while the field notes are open, unless
  // the key belongs to a field or another control
  const fieldNotesOpen = !showEphemeral && !(showLKResources && isGM);
  useEffect(() => {
    if (!fieldNotesOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (pageKeyBlocked(e)) return;
      if (e.key === 'ArrowLeft' && currentSpread > 0) { e.preventDefault(); goToPrev(); }
      if (e.key === 'ArrowRight' && currentSpread < totalSpreads) { e.preventDefault(); goToNext(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fieldNotesOpen, currentSpread, totalSpreads]);

  // The contents, a fixed number of lines to a page. The author filter narrows the list
  // first, and the contents start again at their first page.
  const [tocListRef, tocPerPage] = useLinesThatFit();
  const [tocPage, setTocPage] = useState(0);
  const [tocTurn, setTocTurn] = useState(null); // { key, dir }
  const tocPages = Math.max(1, Math.ceil(filteredEntries.length / tocPerPage));
  const shownTocPage = Math.min(tocPage, tocPages - 1);
  const tocLines = filteredEntries.slice(shownTocPage * tocPerPage, (shownTocPage + 1) * tocPerPage);
  useEffect(() => { setTocPage(0); }, [selectedAuthorFilter]);
  const turnToc = (delta) => {
    const nextPage = Math.min(tocPages - 1, Math.max(0, shownTocPage + delta));
    if (nextPage === shownTocPage) return;
    setTocPage(nextPage);
    setTocTurn({ key: `${nextPage}-${Date.now()}`, dir: delta > 0 ? 'forward' : 'back' });
    playPaperSound();
  };
  // An arrow in a corner of the contents' foot; with a single page of contents, an empty
  // place of the same size, so the foot never moves
  const tocTurnButton = (dir) => {
    if (tocPages < 2) return <span aria-hidden="true" className="w-11 h-11 shrink-0" />;
    const back = dir === 'prev';
    const disabled = back ? shownTocPage === 0 : shownTocPage >= tocPages - 1;
    return (
      <button
        type="button"
        onClick={() => turnToc(back ? -1 : 1)}
        disabled={disabled}
        aria-label={back ? 'Previous page of the contents' : 'Next page of the contents'}
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-sm text-sepia hover:text-oxblood hover:bg-ink/[0.04] disabled:opacity-25 disabled:pointer-events-none transition-colors"
      >
        <PrintArrow dir={dir} />
      </button>
    );
  };

  const { left: leftEntries, right: rightEntries } = currentSpread > 0
    ? getSpreadEntries(currentSpread)
    : { left: [], right: [] };

  // Lightkeeper resources view (separate spread)
  const isLKView = showLKResources && isGM;

  return (
    <div
      className={`bg-mahogany p-2 sm:p-6 rounded-sm shadow-[0_25px_55px_rgba(0,0,0,0.95)] border-[8px] sm:border-[14px] border-night relative min-h-[600px] sm:min-h-[850px] animate-fadeIn ${
        fit ? 'xl:h-full xl:min-h-0 xl:flex xl:flex-col xl:p-4 xl:border-[10px]' : ''}`}
      style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }}
    >
      {/* Manila folder tabs */}
      <div className="flex items-end gap-1 relative z-10 pr-1 sm:pr-0 xl:shrink-0" style={{ marginBottom: '-2px' }}>
        {[
          {
            label: 'Field Notes',
            active: !showEphemeral && !isLKView,
            onClick: () => { setShowEphemeral(false); setShowLKResources(false); },
            activeColor: 'rgb(var(--c-parchment))', activeText: 'rgb(var(--c-ink))', inactiveColor: 'rgb(var(--c-sepia) / 0.75)', inactiveText: 'rgb(var(--c-parchment-deep))',
          },
          {
            label: `Private Notes${ephemeralEntries.length > 0 ? ` (${ephemeralEntries.length})` : ''}`,
            active: showEphemeral,
            onClick: () => { setShowEphemeral(true); setShowLKResources(false); },
            activeColor: 'rgb(var(--c-parchment))', activeText: 'rgb(var(--c-ink))', inactiveColor: 'rgb(var(--c-sepia) / 0.75)', inactiveText: 'rgb(var(--c-parchment-deep))',
          },
          ...(isGM ? [{
            label: `Lightkeeper Resources${lkEntries.length > 0 ? ` (${lkEntries.length})` : ''}`,
            active: isLKView,
            onClick: () => { setShowLKResources(true); setShowEphemeral(false); },
            activeColor: 'rgb(var(--c-parchment))', activeText: 'rgb(var(--c-oxblood))', inactiveColor: 'rgb(var(--c-sepia) / 0.75)', inactiveText: 'rgb(var(--c-parchment-deep))',
          }] : []),
        ].map(tab => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={!!tab.active}
            onClick={tab.onClick}
            className="max-sm:flex-1 max-sm:min-w-0 leading-tight px-3 sm:px-[22px] font-sans text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all select-none"
            style={{
              clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)',
              background: tab.active ? tab.activeColor : tab.inactiveColor,
              color: tab.active ? tab.activeText : tab.inactiveText,
              paddingTop: tab.active ? 7 : 4,
              paddingBottom: tab.active ? 10 : 8,
              boxShadow: tab.active ? '0 -3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgb(var(--c-cream)/0.3)' : '0 -1px 3px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: tab.active ? 20 : 5,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* A failed load must not look like an empty notebook */}
      {notebookLoadError && (
        <div role="alert" className="relative z-20 mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-parchment border-2 border-oxblood rounded-sm px-4 py-3">
          <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-60">
            The notebook could not be loaded, so entries may be missing below.
          </p>
          <button
            onClick={() => campaignId && fetchNotebookEntries(campaignId)}
            className="shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded hover:brightness-125 transition"
          >
            Try again
          </button>
        </div>
      )}

      {/* ═══════════════ EPHEMERAL NOTES VIEW ═══════════════ */}
      {showEphemeral && (
        <div className={`bg-cream rounded-sm border border-ink/20 p-4 sm:p-8 min-h-[500px] sm:min-h-[700px] relative z-10 ${
          fit ? 'xl:flex-1 xl:min-h-0 xl:overflow-y-auto custom-scrollbar' : ''}`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-baseline justify-between mb-6 border-b border-ink/15 pb-3">
            <h2 className="font-hand font-bold text-3xl sm:text-4xl leading-tight text-ink">Private Field Notes</h2>
            <span className="font-sans font-bold text-xs text-sepia uppercase">Visible only to you</span>
          </div>

          {/* New ephemeral note */}
          <div className="mb-8 hand-placed" style={{ '--tilt': '-0.5deg', filter: 'drop-shadow(3px 5px 8px rgba(0,0,0,0.22))' }}>
          <div className="relative" style={{
            background: 'rgb(var(--c-cream))',
            clipPath: 'polygon(0% 4%, 8% 0%, 20% 3%, 35% 0%, 50% 4%, 65% 0%, 80% 3%, 92% 0%, 100% 3%, 100% 100%, 0% 100%)',
            padding: '24px 20px 20px',
          }}>
            {ephemeralPreview ? (
              <NoteMarkdown text={ephemeralText} className="font-serif text-[24px] leading-[1.7] text-ink/80 min-h-[80px] py-0.5"
                style={{ fontFamily: authorFont, color: authorColor }} />
            ) : (
              <textarea
                ref={ephemeralTextRef}
                value={ephemeralText}
                onChange={e => setEphemeralText(e.target.value)}
                placeholder="Private note"
                aria-label="Private note"
                className="w-full bg-transparent border-none resize-none font-serif text-[24px] leading-[1.7] text-ink/80 placeholder-sepia/90 min-h-[80px]"
                style={{ fontFamily: authorFont, color: authorColor }}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleAddEphemeral(); } }}
              />
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <MarkdownMarks targetRef={ephemeralTextRef} preview={ephemeralPreview} label="Private note formatting" className="-ml-1.5" />
              <PreviewToggle preview={ephemeralPreview} onPreview={setEphemeralPreview} />
              <button
                onClick={handleAddEphemeral}
                disabled={!ephemeralText.trim() || isAddingEphemeral}
                className="ml-auto min-h-[40px] font-sans font-black text-sm uppercase tracking-widest text-ink px-3 py-1 border border-ink/30 hover:bg-black/5 disabled:opacity-50 transition-all"
              >
                {isAddingEphemeral ? 'Saving…' : 'Pin note'}
              </button>
            </div>
            {ephemeralError && <p role="alert" className="mt-2 font-serif text-base text-oxblood">{ephemeralError}</p>}
          </div>
          </div>
          {deleteError && <p role="alert" className="-mt-4 mb-6 font-serif text-base text-oxblood">{deleteError}</p>}

          {/* Existing ephemeral notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8">
            {ephemeralEntries.map(entry => (
              <EphemeralNote
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ LIGHTKEEPER RESOURCES VIEW ═══════════════ */}
      {isLKView && (
        <div className={`relative z-10 ${fit ? 'xl:flex-1 xl:min-h-0 xl:overflow-y-auto custom-scrollbar' : ''}`}>
          <div
            className="w-full bg-cream text-ink relative shadow-inner border border-ink/30 rounded-sm"
            style={{ minHeight: '780px' }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 sm:px-8 pt-5 pb-3 border-b border-ink/10">
              <span className="font-sans font-bold text-xs text-sepia uppercase tracking-widest">Lightkeeper Resources</span>
              <div className="flex items-center gap-1.5 font-sans font-bold text-xs text-sepia uppercase tracking-wider">
                {lkSaveStatus === 'saving' ? (
                  <><span className="inline-block w-3 h-3 border-2 border-ink/30 border-t-ink/70 rounded-full animate-spin" /> Saving…</>
                ) : lkSaveStatus === 'error' ? (
                  <span role="alert" className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
                    <span className="font-serif text-base font-normal text-oxblood">Not saved. Your notes are still here.</span>
                    <button
                      onClick={() => saveLkContent(lkContent)}
                      className="min-h-[32px] px-2 font-sans text-xs font-black uppercase tracking-widest text-oxblood border border-oxblood/50 rounded-sm hover:bg-oxblood/10"
                    >Try again</button>
                  </span>
                ) : (
                  <><TickMark className="text-seal-green" /> Saved</>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-8 pt-2 flex flex-wrap items-center gap-2">
              <MarkdownMarks targetRef={lkTextRef} preview={lkPreview} label="Lightkeeper notes formatting" className="-ml-1.5" />
              <PreviewToggle preview={lkPreview} onPreview={setLkPreview} className="ml-auto" />
            </div>

            {/* Continuous note area */}
            <div className="px-4 sm:px-8 py-4" style={LINED_PAPER}>
              {lkPreview ? (
                <NoteMarkdown text={lkContent} className="text-[26px] leading-[3.5rem] font-serif text-ink py-0.5"
                  style={{ minHeight: '700px' }} />
              ) : (
                <textarea
                  ref={lkTextRef}
                  value={lkContent}
                  onChange={e => handleLKContentChange(e.target.value)}
                  aria-label="Lightkeeper notes"
                  className="w-full bg-transparent border-none resize-none text-[26px] leading-[3.5rem] font-serif text-ink placeholder-sepia/90"
                  style={{ backgroundImage: 'none', minHeight: '700px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ FIELD NOTES VIEW ═══════════════ */}
      {!showEphemeral && !isLKView && (
        <div className={`relative z-10 ${fit ? 'xl:flex-1 xl:min-h-0' : ''}`}>
          {/* The book is one size whatever it holds: from lg the spread has a fixed height and
              a long page scrolls inside itself; on phones the contents page has a fixed height.
              On a desk that fits the screen the spread is as tall as the binder allows. */}
          <div className={`w-full grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-1 lg:h-[800px] ${fit ? 'xl:h-full' : ''} bg-cream text-ink relative shadow-inner border border-ink/30 overflow-hidden rounded-sm`}>
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }} />
            {leaf && (
              <div key={leaf.key} aria-hidden="true" className={`page-leaf ${leaf.dir}`} onAnimationEnd={() => setLeaf(null)} />
            )}
            {currentSpread > 0 && <ContentsRibbon onOpen={goToContents} />}

            {/* LEFT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-4 pt-12 sm:p-8 sm:pt-14 lg:pr-10 relative flex flex-col h-[720px] lg:h-full min-h-0 min-w-0 border-b lg:border-b-0 lg:border-r border-ink/20">
                <div aria-hidden="true" className="absolute top-3 left-4 right-4 sm:left-5 sm:right-6 flex items-center gap-2 pb-1 border-b border-sepia/25">
                  <span className="print-small">Section I</span>
                  <span className="print-small ml-auto hidden sm:inline">Field register</span>
                </div>

                <header className="border-b-2 border-ink/80 pb-4 mb-5 shrink-0">
                  <h2 className="text-4xl sm:text-5xl leading-tight font-hand font-bold text-ink">Field Notes</h2>
                  <p className="text-sm sm:text-base font-sans uppercase tracking-widest text-oxblood font-black mt-1">Table of Contents</p>
                </header>

                {authorKeys.length > 0 && (
                  <div className="mb-4 shrink-0">
                    <span className="block font-sans text-xs sm:text-sm font-black text-sepia uppercase tracking-widest mb-2">Filter by Author</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={activeFilter === null}
                        onClick={() => setSelectedAuthorFilter(null)}
                        className={`px-2.5 py-1 text-sm rounded-sm border transition-all font-sans font-black uppercase tracking-widest ${
                          activeFilter === null ? 'bg-ink text-cream border-ink' : 'bg-transparent text-sepia border-sepia/60'}`}
                      >All</button>
                      {authorKeys.map(name => {
                        const info = authorMap[name];
                        const isActive = activeFilter === name;
                        return (
                          <button key={name} type="button" aria-pressed={isActive} onClick={() => setSelectedAuthorFilter(name)}
                            className="px-2 py-0.5 text-[22px] leading-snug rounded-sm border transition-all"
                            style={{
                              fontFamily: info.pen_font, color: isActive ? 'rgb(var(--c-cream))' : info.ink_color,
                              borderColor: info.ink_color, background: isActive ? info.ink_color : 'transparent',
                            }}
                          >{name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* One line per entry, title to page number along a dotted leader, as many
                    lines as the page holds; the corners at the foot turn the contents */}
                <ol
                  key={tocTurn?.key || 'contents'}
                  ref={tocListRef}
                  aria-label={tocPages > 1 ? `Contents, page ${shownTocPage + 1} of ${tocPages}` : 'Contents'}
                  className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col pr-1 ${tocTurn ? `toc-turn toc-turn-${tocTurn.dir}` : ''}`}
                  style={{ gap: TOC_GAP }}
                >
                  {tocLines.map(entry => {
                    const canDelete = isGM
                      ? entry.author_type === 'gm'
                      : entry.author_name === authorName;
                    return (
                      <li key={entry.id} className="group shrink-0 w-full flex flex-wrap items-center gap-x-1" style={{ minHeight: TOC_ROW }}>
                        <button onClick={() => setCurrentSpread(entrySpread(entry))}
                          className="flex-1 min-w-0 flex items-center gap-2 px-2 text-left rounded-sm hover:bg-ink/[0.04] transition-colors"
                          style={{ height: TOC_ROW }}
                        >
                          {entry.entry_type === 'sketch' && <PencilIcon size={16} className="text-sepia shrink-0" />}
                          {entry.entry_type === 'photo' && <CameraIcon size={16} className="text-sepia shrink-0" />}
                          <span className="min-w-0 truncate text-[20px] sm:text-[22px] leading-normal"
                            style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
                            {entry.title}
                          </span>
                          <span aria-hidden="true" className="flex-1 min-w-[0.75rem] sm:min-w-[1.5rem] self-end mb-3 border-b-2 border-dotted border-sepia/35" />
                          <span className="font-mono tabular-nums text-base text-sepia shrink-0 group-hover:text-ink">
                            p.{entry.page_number}
                          </span>
                        </button>
                        {canDelete && (
                          <ConfirmAction
                            className="contents"
                            hintClassName="basis-full px-3 pb-2"
                            onConfirm={() => handleDelete(entry.id)}
                            cancelLabel="Keep"
                            armedHint={`Press again to delete "${entry.title}" for everyone.`}
                            renderButton={(armed, props) => (
                              <button
                                {...props}
                                aria-label={armed ? `Yes, delete ${entry.title}` : `Delete ${entry.title}`}
                                className={armed
                                  ? 'shrink-0 mr-2 min-h-[36px] px-2 font-sans text-xs font-black uppercase tracking-widest bg-oxblood text-cream hover:brightness-125 transition rounded-sm'
                                  : 'shrink-0 w-9 min-h-[40px] font-sans text-lg text-sepia hover:text-oxblood transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'}
                              >{armed ? 'Yes, delete' : '×'}</button>
                            )}
                          />
                        )}
                        {!canDelete && <span aria-hidden="true" className="shrink-0 w-9" />}
                      </li>
                    );
                  })}
                </ol>

                {/* GM-only: Lightkeeper Resources link in TOC */}
                {isGM && (
                  <div className="mt-3 pt-2 border-t border-sepia/30 shrink-0">
                    <button onClick={() => { setShowLKResources(true); setShowEphemeral(false); }}
                      className="w-full text-left flex items-center justify-between px-2 py-1 rounded-sm hover:bg-sepia/10 transition-all"
                    >
                      <span className="font-serif text-2xl text-ink">Lightkeeper Resources</span>
                      <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood">Lightkeeper only →</span>
                    </button>
                  </div>
                )}

                {/* The contents' foot: an engraved arrow in each corner when there is more */}
                <div className="mt-2 pt-2 border-t border-ink/10 flex justify-between items-center gap-2 shrink-0 font-sans font-bold text-xs uppercase tracking-widest text-sepia">
                  {tocTurnButton('prev')}
                  <span className="hidden sm:flex items-center gap-2" aria-hidden="true">
                    <PrinterMark size={11} />
                    <FormLine>Candela Obscura · Field register · Form C.O. 5</FormLine>
                  </span>
                  <span className="flex items-center gap-1">
                    {tocPages > 1 && (
                      <span className="font-mono tabular-nums text-sm normal-case tracking-normal" aria-hidden="true">{shownTocPage + 1} / {tocPages}</span>
                    )}
                    {tocTurnButton('next')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 pt-28 sm:p-8 sm:pt-28 lg:pt-8 lg:pr-14 relative flex flex-col min-h-[360px] lg:min-h-0 lg:h-full min-w-0 border-b lg:border-b-0 lg:border-r border-ink/20">
                <div className="absolute top-3 left-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">
                  Field Notes, page {currentSpread}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative lg:mt-6 lg:[container-type:size]" style={LINED_PAPER}>
                  {leftEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === leftEntries.length - 1}
                    onRedraw={canRedraw(entry) ? () => openRedraw(entry) : undefined} />)}
                </div>
                {pageFooter(`Page ${currentSpread}`, '', 'lg:pl-10')}
              </div>
            )}

            {/* SPINE */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/35 to-black/15 pointer-events-none border-l border-r border-ink/5 z-20" />

            {/* RIGHT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-4 pt-12 pb-20 sm:p-8 sm:pt-14 sm:pb-20 lg:pl-10 relative flex flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto custom-scrollbar min-w-0 bg-cream">
                <div aria-hidden="true" className="absolute top-3 left-4 right-4 sm:left-6 sm:right-5 flex items-center gap-2 pb-1 border-b border-sepia/25">
                  <span className="print-small hidden sm:inline">Field register</span>
                  <span className="print-small ml-auto">Section II</span>
                </div>
                <header className="border-b-2 border-ink/80 pb-4 mb-5">
                  <h3 className="text-3xl sm:text-4xl leading-tight font-hand font-bold text-ink">Log a Field Entry</h3>
                  <p className="font-sans font-bold text-xs text-sepia uppercase tracking-widest mt-1.5">
                    Visible to everyone in the campaign
                  </p>
                </header>

                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="block font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-sepia mb-1">Entry Title</label>
                    <input type="text" value={newEntryTitle} onChange={e => setNewEntryTitle(e.target.value)}
                      className="w-full px-0 py-1 bg-transparent border-b-2 border-ink/30 focus:border-ink/60 text-[32px]"
                      style={{ fontFamily: authorFont, color: authorColor }} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    {/* On a phone the label and Preview share a line and the marks take the next */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                      <label htmlFor={`${idBase}-found`} className="order-1 flex-1 block font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-sepia">What you found</label>
                      <MarkdownMarks targetRef={entryTextRef} preview={entryPreview} label="Entry formatting"
                        className="order-3 basis-full -ml-1.5 sm:order-2 sm:basis-auto sm:ml-0" />
                      <PreviewToggle preview={entryPreview} onPreview={setEntryPreview} className="order-2 sm:order-3" />
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.08) 27px, rgba(0,0,0,0.08) 28px)',
                        backgroundSize: '100% 28px', backgroundPosition: '0 32px',
                      }} />
                      {entryPreview ? (
                        <NoteMarkdown text={newEntryContent} className="w-full h-full min-h-[180px] text-[28px] leading-[3.5rem] relative z-10 pt-1"
                          style={{ fontFamily: authorFont, color: authorColor }} />
                      ) : (
                        <textarea id={`${idBase}-found`} ref={entryTextRef} value={newEntryContent} onChange={e => setNewEntryContent(e.target.value)}
                          className="w-full h-full min-h-[180px] bg-transparent border-none resize-none text-[28px] leading-[3.5rem] relative z-10 pt-1"
                          style={{ fontFamily: authorFont, color: authorColor }} />
                      )}
                    </div>
                  </div>

                  {/* Image upload — staged preview */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                      placeholder="Caption (optional)"
                      className="flex-1 min-w-[10rem] bg-transparent border-b border-ink/20 focus:border-ink/40 text-lg font-serif text-ink placeholder-sepia/90 placeholder:italic py-0.5" />
                    <button onClick={openNewSketch} disabled={isUploading || !!pendingImageFile}
                      className="font-sans font-black uppercase tracking-widest text-sm px-3 py-1.5 border border-ink/40 hover:bg-black/5 transition-all disabled:opacity-30">
                      <span className="inline-flex items-center gap-1.5"><PencilIcon size={16} /> Sketch</span>
                    </button>
                    <button onClick={() => photoInputRef.current?.click()} disabled={isUploading || !!pendingImageFile}
                      className="font-sans font-black uppercase tracking-widest text-sm px-3 py-1.5 border border-ink/40 hover:bg-black/5 transition-all disabled:opacity-30">
                      <span className="inline-flex items-center gap-1.5"><CameraIcon size={16} /> Photo</span>
                    </button>
                    <input ref={sketchInputRef} type="file" accept="image/png" className="hidden"
                      onChange={e => { if (e.target.files[0]) handleStageImage(e.target.files[0], 'sketch'); e.target.value = ''; }} />
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files[0]) handleStageImage(e.target.files[0], 'photo'); e.target.value = ''; }} />
                  </div>

                  {pendingImagePreview && (
                    <div className="flex items-center gap-3 p-2 border border-ink/20 rounded-sm bg-black/[0.03]">
                      <img src={pendingImagePreview} alt="preview" className={`w-16 h-16 ${pendingScene ? 'object-contain' : 'object-cover'} border border-ink/20 rounded-sm`} style={{ mixBlendMode: pendingImageType === 'sketch' ? 'multiply' : 'normal' }} />
                      <div className="flex-1 min-w-0">
                        {pendingScene ? (
                          <button type="button" onClick={openNewSketch}
                            className="min-h-[40px] px-2 -ml-2 inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-xs font-black uppercase tracking-widest text-sepia hover:text-oxblood rounded-sm hover:bg-ink/[0.04] transition-colors">
                            <PencilIcon size={14} /> Keep drawing
                          </button>
                        ) : (
                          <p className="font-mono text-sm text-sepia truncate">{pendingImageFile?.name}</p>
                        )}
                      </div>
                      <button onClick={clearPendingImage} aria-label="Remove the image" className="min-w-[40px] min-h-[40px] text-sepia hover:text-oxblood font-black text-lg transition-colors">✕</button>
                    </div>
                  )}

                  {/* Font picker — player only */}
                  {!isGM && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-sm uppercase tracking-widest text-sepia">Handwriting</span>
                      <select
                        value={authorFont}
                        onChange={e => updatePenFont(e.target.value)}
                        className="bg-transparent border-b border-ink/25 focus:border-ink/50 text-[18px] py-0.5 flex-1 min-w-0"
                        style={{ fontFamily: authorFont, color: authorColor }}
                      >
                        {PEN_FONTS.map(f => (
                          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(submitError || uploadError) && (
                    <p role="alert" className="font-serif text-base text-oxblood">{uploadError || submitError}</p>
                  )}
                  {isUploading && <p className="font-serif italic text-base text-sepia">Uploading image…</p>}

                  <button onClick={handleSubmitEntry}
                    disabled={isSubmitting || isUploading || !newEntryTitle.trim() || (!newEntryContent.trim() && !pendingImageFile)}
                    className="font-sans font-black uppercase tracking-widest text-sm sm:text-base px-4 py-2 border-2 border-ink/60 hover:bg-black/5 transition-all disabled:opacity-30 self-end">
                    {isSubmitting || isUploading ? 'Saving…' : 'Add entry'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 pt-10 sm:p-8 lg:pl-10 relative flex flex-col min-h-[360px] lg:min-h-0 lg:h-full min-w-0 bg-cream">
                <div className="absolute top-3 right-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">Field Notes</div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative mt-6 lg:[container-type:size]" style={LINED_PAPER}>
                  {rightEntries.length === 0
                    ? <div className="h-full flex flex-col items-center justify-center gap-4 opacity-[0.055] pointer-events-none select-none">
                        <div className="w-32 h-32 rounded-full border-4 border-ink flex flex-col items-center justify-center">
                          <span className="text-sm font-sans font-black tracking-widest uppercase text-ink">Candela</span>
                          <div className="text-7xl font-serif font-black text-ink my-1">✦</div>
                          <span className="text-sm font-sans font-black tracking-widest uppercase text-ink">Obscura</span>
                        </div>
                      </div>
                    : rightEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === rightEntries.length - 1}
                        onRedraw={canRedraw(entry) ? () => openRedraw(entry) : undefined} />)}
                </div>
                {pageFooter('', `Page ${currentSpread} of ${totalSpreads}`, 'pl-10 lg:pl-0 pr-10')}
              </div>
            )}

            {/* The outer corners turn the pages: back from the left, on from the right */}
            {currentSpread > 0 && (
              <PageCorner side="prev" onTurn={goToPrev}
                label={currentSpread === 1 ? 'Turn back to the contents' : `Turn back to page ${currentSpread - 1}`} />
            )}
            {currentSpread < totalSpreads && (
              <PageCorner side="next" onTurn={goToNext} label={`Turn to page ${currentSpread + 1}`} />
            )}
          </div>
        </div>
      )}

      {sketchSheet && (
        <SketchSheet
          key={sketchSheet.mode === 'redraw' ? `redraw-${sketchSheet.entry.id}` : 'new'}
          initialElements={sketchSheet.elements || null}
          loading={!!sketchSheet.loading}
          loadError={sketchSheet.error || ''}
          ink={sketchInks[0].color}
          inks={sketchInks}
          onSave={sketchSheet.mode === 'redraw' ? saveRedraw : stageDrawing}
          onCancel={() => setSketchSheet(null)}
          onUploadPicture={sketchSheet.mode === 'new' && !pendingScene ? uploadInstead : undefined}
          saveLabel={sketchSheet.mode === 'redraw' ? 'Save sketch' : 'Add to entry'}
          pictureOnlyLabel={sketchSheet.mode === 'redraw' ? 'Save picture only' : 'Add picture only'}
        />
      )}
    </div>
  );
};
