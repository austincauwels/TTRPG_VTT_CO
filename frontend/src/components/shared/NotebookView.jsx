import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../../store/gameStore';
import { ConfirmAction } from './ConfirmAction';
import { CameraIcon, PencilIcon } from './NotebookIcons';

const GM_PEN_FONT  = 'Caveat';
const GM_INK_COLOR = 'rgb(var(--c-ink))';

const PEN_FONTS = [
  'Caveat', 'Reenie Beenie', 'Kalam', 'Indie Flower', 'Patrick Hand',
  'Shadows Into Light', 'Zeyada', 'Sacramento', 'Homemade Apple', 'Alex Brush',
  'Cedarville Cursive', 'La Belle Aurore', 'Charm', 'Dawning of a New Day',
  'Gaegu', 'Grape Nuts', 'Moondance', 'Long Cang', 'Rock Salt', 'Gochi Hand',
];
const ENTRIES_PER_SIDE = 3;

const LINED_PAPER = {
  backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.07) 27px, rgba(0,0,0,0.07) 28px)',
  backgroundSize: '100% 28px',
  backgroundPosition: '0 4px',
};

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return isoStr; }
}

function pageFooter(left, right) {
  return (
    <div className="pt-4 border-t border-ink/10 flex justify-between items-center font-sans font-bold text-xs uppercase tracking-widest text-sepia">
      <span>{left}</span>
      <span className="font-bold">{right}</span>
    </div>
  );
}

// Renders a single notebook entry — supports field_log, sketch, photo, lightkeeper
function EntryCard({ entry, isLast }) {
  const eType = entry.entry_type || 'field_log';

  // Sketch: rendered with mix-blend-mode multiply, slight rotation
  if (eType === 'sketch' && entry.image_data) {
    return (
      <div className={`break-words ${isLast ? '' : 'pb-5 mb-5 border-b border-ink/10'}`}>
        <h3 className="leading-tight mb-1 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2rem' }}>
          {entry.title}
        </h3>
        <div className="relative mb-2" style={{ float: 'right', margin: '0 0 12px 16px' }}>
          <img
            src={entry.image_data}
            alt={entry.title}
            style={{
              maxWidth: 'min(180px, 45vw)',
              transform: 'rotate(-3deg)',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
        {entry.content && (
          <p className="text-[26px] leading-[2.8rem] whitespace-pre-wrap" style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
            {entry.content}
          </p>
        )}
        <div className="clear-both" />
        <div className="text-[18px] mt-2" style={{ fontFamily: entry.pen_font, color: entry.ink_color, opacity: 0.5 }}>
          — {entry.author_name} · {formatDate(entry.created_at)}
        </div>
      </div>
    );
  }

  // Photo: polaroid border with masking tape strip
  if (eType === 'photo' && entry.image_data) {
    return (
      <div className={`break-words ${isLast ? '' : 'pb-5 mb-5 border-b border-ink/10'}`}>
        <h3 className="leading-tight mb-1 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2rem' }}>
          {entry.title}
        </h3>
        <div className="relative" style={{ float: 'right', margin: '0 0 12px 16px' }}>
          {/* Masking tape strip */}
          <div style={{
            position: 'absolute', top: -10, left: '20%', right: '20%', height: 20,
            background: 'rgb(var(--c-parchment-deep) / 0.75)', transform: 'rotate(-1deg)',
            zIndex: 2, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
          <div style={{
            background: '#fff',
            padding: '8px 8px 28px',
            boxShadow: '2px 4px 14px rgba(0,0,0,0.35)',
            maxWidth: 'min(180px, 45vw)',
            transform: 'rotate(1.5deg)',
            position: 'relative',
            zIndex: 1,
          }}>
            <img src={entry.image_data} alt={entry.title} style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
        {entry.content && (
          <p className="text-[26px] leading-[2.8rem] whitespace-pre-wrap" style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
            {entry.content}
          </p>
        )}
        <div className="clear-both" />
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
        <p className="font-serif text-[26px] leading-[2.8rem] whitespace-pre-wrap text-ink/85">{entry.content}</p>
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
      <p className="text-[28px] leading-[3rem] whitespace-pre-wrap" style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
        {entry.content}
      </p>
    </div>
  );
}

// Ephemeral note — ripped paper aesthetic
function EphemeralNote({ entry, onDelete }) {
  return (
    <div
      className="relative"
      style={{
        background: 'rgb(var(--c-cream))',
        transform: `rotate(${(entry.id % 3 - 1) * 1.2}deg)`,
        boxShadow: '3px 5px 18px rgba(0,0,0,0.28)',
        padding: '20px 16px 28px',
        minHeight: 140,
        // torn top edge via clip-path
        clipPath: 'polygon(0% 4%, 8% 0%, 18% 3%, 28% 1%, 40% 4%, 52% 0%, 62% 3%, 74% 0%, 84% 3%, 93% 1%, 100% 3%, 100% 100%, 0% 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <p className="font-serif text-[22px] leading-[1.6] whitespace-pre-wrap break-words text-ink/80 pr-2" style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
        {entry.content || entry.title}
      </p>
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
  );
}

export const NotebookView = ({ isGM: isGMProp = null }) => {
  const {
    notebookEntries,
    character,
    accessSession,
    fetchNotebookEntries,
    submitNotebookEntry,
    updateNotebookEntry,
    deleteEphemeralNote,
    uploadNotebookImage,
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
      );
      setIsUploading(false);
      if (!result.success) {
        if (result.tooLarge) {
          setUploadError('That image is larger than 5 MB. Choose a smaller file, or a smaller copy of it.');
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
    if (result?.success) setEphemeralText('');
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
    };
    reader.readAsDataURL(file);
  };

  const clearPendingImage = () => {
    setPendingImageFile(null);
    setPendingImagePreview(null);
    setPendingImageType(null);
    setUploadError('');
  };

  const goToPrev = () => setCurrentSpread(s => Math.max(0, s - 1));
  const goToNext = () => setCurrentSpread(s => Math.min(totalSpreads, s + 1));

  const { left: leftEntries, right: rightEntries } = currentSpread > 0
    ? getSpreadEntries(currentSpread)
    : { left: [], right: [] };

  // Lightkeeper resources view (separate spread)
  const isLKView = showLKResources && isGM;

  return (
    <div
      className="bg-mahogany p-2 sm:p-6 rounded-sm shadow-[0_25px_55px_rgba(0,0,0,0.95)] border-[8px] sm:border-[14px] border-night relative min-h-[600px] sm:min-h-[850px] animate-fadeIn"
      style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }}
    >
      {/* Manila folder tabs */}
      <div className="flex items-end gap-1 relative z-10 pr-1 sm:pr-0" style={{ marginBottom: '-2px' }}>
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
        <div className="bg-cream rounded-sm border border-ink/20 p-4 sm:p-8 min-h-[500px] sm:min-h-[700px] relative z-10">
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-baseline justify-between mb-6 border-b border-ink/15 pb-3">
            <h2 className="font-serif font-black text-2xl sm:text-3xl uppercase text-ink">Private Field Notes</h2>
            <span className="font-sans font-bold text-xs text-sepia uppercase">Visible only to you</span>
          </div>

          {/* New ephemeral note */}
          <div className="mb-8 relative" style={{
            background: 'rgb(var(--c-cream))',
            clipPath: 'polygon(0% 4%, 8% 0%, 20% 3%, 35% 0%, 50% 4%, 65% 0%, 80% 3%, 92% 0%, 100% 3%, 100% 100%, 0% 100%)',
            padding: '24px 20px 20px',
            boxShadow: '3px 5px 18px rgba(0,0,0,0.2)',
            transform: 'rotate(-0.5deg)',
          }}>
            <textarea
              value={ephemeralText}
              onChange={e => setEphemeralText(e.target.value)}
              placeholder="Write a private note…"
              className="w-full bg-transparent border-none resize-none font-serif text-[24px] leading-[1.7] text-ink/80 min-h-[80px]"
              style={{ fontFamily: authorFont, color: authorColor }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleAddEphemeral(); } }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="font-sans font-bold text-xs text-sepia uppercase">Ctrl+Enter saves the note</span>
              <button
                onClick={handleAddEphemeral}
                disabled={!ephemeralText.trim() || isAddingEphemeral}
                className="min-h-[40px] font-sans font-black text-sm uppercase tracking-widest px-3 py-1 border border-ink/30 hover:bg-black/5 disabled:opacity-50 transition-all"
              >
                {isAddingEphemeral ? 'Saving…' : 'Pin Note →'}
              </button>
            </div>
            {ephemeralError && <p role="alert" className="mt-2 font-serif text-base text-oxblood">{ephemeralError}</p>}
          </div>
          {deleteError && <p role="alert" className="-mt-4 mb-6 font-serif text-base text-oxblood">{deleteError}</p>}

          {/* Existing ephemeral notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {ephemeralEntries.map(entry => (
              <EphemeralNote
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
          {ephemeralEntries.length === 0 && (
            <p className="font-serif text-xl italic text-sepia text-center mt-8">No private notes yet. Write one above; only you can see it.</p>
          )}
        </div>
      )}

      {/* ═══════════════ LIGHTKEEPER RESOURCES VIEW ═══════════════ */}
      {isLKView && (
        <div className="relative z-10">
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
                  <><span className="text-seal-green">✓</span> Saved</>
                )}
              </div>
            </div>

            {/* Continuous note area */}
            <div className="px-4 sm:px-8 py-4" style={LINED_PAPER}>
              <textarea
                value={lkContent}
                onChange={e => handleLKContentChange(e.target.value)}
                placeholder="Write Lightkeeper notes here…"
                className="w-full bg-transparent border-none resize-none text-[26px] leading-[3.5rem] font-serif text-ink placeholder-sepia/90"
                style={{ backgroundImage: 'none', minHeight: '700px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ FIELD NOTES VIEW ═══════════════ */}
      {!showEphemeral && !isLKView && (
        <div className="relative z-10">
          <div
            className="w-full grid grid-cols-1 lg:grid-cols-2 bg-cream text-ink relative shadow-inner border border-ink/30 overflow-hidden rounded-sm"
            style={{ minHeight: '800px' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }} />

            {/* LEFT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-4 pt-10 sm:p-8 lg:pr-10 relative flex flex-col h-full min-w-0 border-b lg:border-b-0 lg:border-r border-ink/20">
                <div className="absolute top-3 left-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">Section I</div>

                <header className="border-b-2 border-ink/80 pb-4 mb-5">
                  <h2 className="text-4xl sm:text-5xl leading-tight font-display tracking-[0.04em] text-ink uppercase">Field Notes</h2>
                  <p className="text-sm sm:text-base font-sans uppercase tracking-widest text-oxblood font-black mt-1">Table of Contents</p>
                </header>

                {authorKeys.length > 0 && (
                  <div className="mb-4">
                    <span className="block font-sans text-xs sm:text-sm font-black text-sepia uppercase tracking-widest mb-2">Filter by Author</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={activeFilter === null}
                        onClick={() => setSelectedAuthorFilter(null)}
                        className={`px-2.5 py-1.5 text-sm rounded-sm border transition-all font-sans font-black uppercase tracking-widest ${
                          activeFilter === null ? 'bg-ink text-cream border-ink' : 'bg-transparent text-sepia border-sepia/60'}`}
                      >All</button>
                      {authorKeys.map(name => {
                        const info = authorMap[name];
                        const isActive = activeFilter === name;
                        return (
                          <button key={name} type="button" aria-pressed={isActive} onClick={() => setSelectedAuthorFilter(name)}
                            className="px-2 py-1 text-[26px] rounded-sm border transition-all"
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

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredEntries.length === 0 ? (
                    <p className="text-2xl font-serif italic text-sepia mt-4">No entries yet. Write the first one on the facing page.</p>
                  ) : filteredEntries.map(entry => {
                    const canDelete = isGM
                      ? entry.author_type === 'gm'
                      : entry.author_name === authorName;
                    return (
                      <div key={entry.id}
                        className="w-full flex flex-wrap items-center gap-1 rounded-sm border border-black/[0.08] hover:bg-black/[0.03] transition-all group"
                        style={{ background: 'rgba(0,0,0,0.015)' }}
                      >
                        <button onClick={() => setCurrentSpread(entrySpread(entry))}
                          className="flex-1 min-w-0 text-left flex items-center justify-between px-3 py-2"
                        >
                          <span className="text-[22px] sm:text-[26px] leading-tight flex items-center gap-2 min-w-0 break-words"
                            style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
                            {entry.entry_type === 'sketch' && <PencilIcon size={16} className="text-sepia" />}
                            {entry.entry_type === 'photo' && <CameraIcon size={16} className="text-sepia" />}
                            {entry.title}
                          </span>
                          <span className="font-mono tabular-nums text-base text-sepia shrink-0 ml-2 group-hover:text-ink">
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
                                  : 'shrink-0 pr-3 min-h-[40px] font-sans text-lg text-sepia hover:text-oxblood transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'}
                              >{armed ? 'Yes, delete' : '×'}</button>
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* GM-only: Lightkeeper Resources link in TOC */}
                {isGM && (
                  <div className="mt-4 pt-3 border-t border-sepia/30">
                    <button onClick={() => { setShowLKResources(true); setShowEphemeral(false); }}
                      className="w-full text-left flex items-center justify-between px-2 py-1 rounded-sm hover:bg-sepia/10 transition-all"
                    >
                      <span className="font-serif text-2xl text-ink">Lightkeeper Resources</span>
                      <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood">GM only →</span>
                    </button>
                  </div>
                )}

                {pageFooter('', '')}
              </div>
            ) : (
              <div className="p-4 pt-10 sm:p-8 lg:pr-10 relative flex flex-col h-full min-w-0 border-b lg:border-b-0 lg:border-r border-ink/20">
                <div className="absolute top-3 left-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">
                  Field Notes, page {currentSpread}
                </div>
                <div className="flex-1 overflow-y-auto relative mt-6" style={LINED_PAPER}>
                  {leftEntries.length === 0
                    ? <p className="text-2xl font-serif italic text-sepia text-center mt-16">Nothing on this page.</p>
                    : leftEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === leftEntries.length - 1} />)}
                </div>
                {pageFooter(`Page ${currentSpread}`, '')}
              </div>
            )}

            {/* SPINE */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/35 to-black/15 pointer-events-none border-l border-r border-ink/5 z-20" />

            {/* RIGHT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-4 pt-10 sm:p-8 lg:pl-10 relative flex flex-col h-full min-w-0 bg-cream">
                <div className="absolute top-3 right-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">Section II</div>
                <header className="border-b-2 border-ink/80 pb-4 mb-5">
                  <h3 className="text-3xl sm:text-4xl leading-tight font-display tracking-[0.04em] text-ink uppercase">Log a Field Entry</h3>
                  <p className="text-base sm:text-lg font-serif italic text-sepia mt-0.5">
                    Everyone in the campaign can read it.
                  </p>
                </header>

                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="block font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-sepia mb-1">Entry Title</label>
                    <input type="text" value={newEntryTitle} onChange={e => setNewEntryTitle(e.target.value)}
                      placeholder="e.g. The lighthouse keeper's diary"
                      className="w-full px-0 py-1 bg-transparent border-b-2 border-ink/30 focus:border-ink/60 text-[32px]"
                      style={{ fontFamily: authorFont, color: authorColor }} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="block font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-sepia mb-1">What you found</label>
                    <div className="flex-1 relative">
                      <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.08) 27px, rgba(0,0,0,0.08) 28px)',
                        backgroundSize: '100% 28px', backgroundPosition: '0 32px',
                      }} />
                      <textarea value={newEntryContent} onChange={e => setNewEntryContent(e.target.value)}
                        placeholder="Write what happened, or what you noticed."
                        className="w-full h-full min-h-[180px] bg-transparent border-none resize-none text-[28px] leading-[3.5rem] relative z-10 pt-1"
                        style={{ fontFamily: authorFont, color: authorColor }} />
                    </div>
                  </div>

                  {/* Image upload — staged preview */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                      placeholder="Image caption (optional)"
                      className="flex-1 min-w-[10rem] bg-transparent border-b border-ink/20 focus:border-ink/40 text-lg font-serif text-ink placeholder-sepia/90 placeholder:italic py-0.5" />
                    <button onClick={() => sketchInputRef.current?.click()} disabled={isUploading || !!pendingImageFile}
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
                      <img src={pendingImagePreview} alt="preview" className="w-16 h-16 object-cover border border-ink/20 rounded-sm" style={{ mixBlendMode: pendingImageType === 'sketch' ? 'multiply' : 'normal' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-sepia truncate">{pendingImageFile?.name}</p>
                        <p className="font-serif italic text-sm text-sepia">This {pendingImageType} is saved with the entry.</p>
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
              <div className="p-4 pt-10 sm:p-8 lg:pl-10 relative flex flex-col h-full min-w-0 bg-cream">
                <div className="absolute top-3 right-3 font-sans font-bold text-sm text-sepia tracking-widest uppercase">Field Notes</div>
                <div className="flex-1 overflow-y-auto relative mt-6" style={LINED_PAPER}>
                  {rightEntries.length === 0
                    ? <div className="h-full flex flex-col items-center justify-center gap-4 opacity-[0.055] pointer-events-none select-none">
                        <div className="w-32 h-32 rounded-full border-4 border-ink flex flex-col items-center justify-center">
                          <span className="text-sm font-sans font-black tracking-widest uppercase text-ink">Candela</span>
                          <div className="text-7xl font-serif font-black text-ink my-1">✦</div>
                          <span className="text-sm font-sans font-black tracking-widest uppercase text-ink">Obscura</span>
                        </div>
                      </div>
                    : rightEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === rightEntries.length - 1} />)}
                </div>
                {pageFooter('', `Page ${currentSpread}`)}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1 sm:px-2">
            <button onClick={goToPrev} disabled={currentSpread === 0}
              className="font-sans font-black uppercase tracking-widest text-sm sm:text-base px-3 sm:px-5 py-2 min-h-[44px] text-parchment-deep border border-parchment-deep/30 rounded-sm hover:bg-cream/5 transition-all disabled:opacity-20">
              ← Previous
            </button>
            <span className="order-first sm:order-none basis-full sm:basis-auto text-center font-mono tabular-nums text-base sm:text-xl text-parchment-deep/80 tracking-wider sm:tracking-widest">
              {currentSpread === 0 ? 'TABLE OF CONTENTS' : `SPREAD ${currentSpread} OF ${totalSpreads}`}
            </span>
            <button onClick={goToNext} disabled={currentSpread >= totalSpreads}
              className="font-sans font-black uppercase tracking-widest text-sm sm:text-base px-3 sm:px-5 py-2 min-h-[44px] text-parchment-deep border border-parchment-deep/30 rounded-sm hover:bg-cream/5 transition-all disabled:opacity-20">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
