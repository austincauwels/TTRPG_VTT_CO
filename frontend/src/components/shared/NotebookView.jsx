import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../../store/gameStore';

const GM_PEN_FONT  = 'Caveat';
const GM_INK_COLOR = '#1a1a1a';

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
    <div className="pt-4 border-t border-black/10 flex justify-between items-center font-mono text-[18px] text-black/40">
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
      <div className={isLast ? '' : 'pb-5 mb-5 border-b border-black/10'}>
        <h3 className="leading-tight mb-1 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2rem' }}>
          {entry.title}
        </h3>
        <div className="relative mb-2" style={{ float: 'right', margin: '0 0 12px 16px' }}>
          <img
            src={entry.image_data}
            alt={entry.title}
            style={{
              maxWidth: 180,
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
      <div className={isLast ? '' : 'pb-5 mb-5 border-b border-black/10'}>
        <h3 className="leading-tight mb-1 font-normal" style={{ fontFamily: entry.pen_font, color: entry.ink_color, fontSize: '2rem' }}>
          {entry.title}
        </h3>
        <div className="relative" style={{ float: 'right', margin: '0 0 12px 16px' }}>
          {/* Masking tape strip */}
          <div style={{
            position: 'absolute', top: -10, left: '20%', right: '20%', height: 20,
            background: 'rgba(210,192,140,0.7)', transform: 'rotate(-1deg)',
            zIndex: 2, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
          <div style={{
            background: '#fff',
            padding: '8px 8px 28px',
            boxShadow: '2px 4px 14px rgba(0,0,0,0.35)',
            maxWidth: 180,
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
      <div className={isLast ? '' : 'pb-5 mb-5 border-b border-black/10'}>
        <div className="border-b-2 border-black/70 pb-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black/70 flex items-center justify-center text-lg font-serif font-black">✦</div>
            <span className="font-sans font-black text-[14px] uppercase tracking-[0.3em] text-black/70">Candela Obscura — Lightkeeper Correspondence</span>
          </div>
          <span className="font-mono text-[14px] text-black/30">{formatDate(entry.created_at)}</span>
        </div>
        <h3 className="font-serif font-black text-[2rem] text-black mb-2">{entry.title}</h3>
        <p className="font-serif text-[26px] leading-[2.8rem] whitespace-pre-wrap text-black/85">{entry.content}</p>
        <div className="mt-3 pt-2 border-t border-black/10 font-mono text-[14px] text-black/40 uppercase tracking-widest">
          {entry.author_name} — Lightkeeper
        </div>
      </div>
    );
  }

  // Standard field_log
  return (
    <div className={isLast ? '' : 'pb-5 mb-5 border-b border-black/10'}>
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
  const [editing, setEditing] = useState(false);
  return (
    <div
      className="relative"
      style={{
        background: '#fffde7',
        transform: `rotate(${(entry.id % 3 - 1) * 1.2}deg)`,
        boxShadow: '3px 5px 18px rgba(0,0,0,0.28)',
        padding: '20px 16px 28px',
        minHeight: 140,
        // torn top edge via clip-path
        clipPath: 'polygon(0% 4%, 8% 0%, 18% 3%, 28% 1%, 40% 4%, 52% 0%, 62% 3%, 74% 0%, 84% 3%, 93% 1%, 100% 3%, 100% 100%, 0% 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-black/30 hover:text-red-500 transition-colors text-sm font-black"
        title="Delete note"
      >✕</button>
      <p className="font-serif text-[22px] leading-[1.6] whitespace-pre-wrap text-black/80" style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
        {entry.content || entry.title}
      </p>
      <div className="absolute bottom-2 right-3 font-mono text-[12px] text-black/25">{formatDate(entry.created_at)}</div>
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
  const authorColor = isGM ? GM_INK_COLOR : (character?.ink_color || '#8b1a1a');
  const authorName  = isGM ? (accessSession?.name || 'Lightkeeper') : (character?.name || 'Unknown');

  const handleSubmitEntry = async () => {
    if (!newEntryTitle.trim() || (!newEntryContent.trim() && !pendingImageFile)) {
      setSubmitError('A title and content are required.');
      return;
    }
    if (!campaignId) { setSubmitError('No active campaign found.'); return; }
    if (!isGM && !character?.name) { setSubmitError('Character not loaded yet — please wait.'); return; }
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
          setUploadError('Image is too large. Please use a smaller file (under 5 MB).');
        } else {
          setSubmitError('Failed to upload image. Please try again.');
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
      setSubmitError('Failed to log entry. Please try again.');
    }
  };

  const handleAddEphemeral = async () => {
    if (!ephemeralText.trim() || !campaignId) return;
    setIsAddingEphemeral(true);
    await submitNotebookEntry(
      campaignId, 'Private Note', ephemeralText.trim(),
      authorName, isGM ? 'gm' : 'player',
      isGM ? null : character?.id,
      'ephemeral', 'self',
    );
    setEphemeralText('');
    setIsAddingEphemeral(false);
  };

  const handleLKContentChange = (value) => {
    setLkContent(value);
    setLkSaveStatus('saving');
    clearTimeout(lkSaveTimer.current);
    lkSaveTimer.current = setTimeout(async () => {
      if (!campaignId) return;
      if (lkEntryId.current) {
        await updateNotebookEntry(lkEntryId.current, 'lk_main', value);
      } else {
        const result = await submitNotebookEntry(
          campaignId, 'lk_main', value,
          'Lightkeeper', 'gm',
          null, 'lightkeeper', 'gm_only',
        );
        if (result?.entry?.id) {
          lkEntryId.current = result.entry.id;
        }
      }
      setLkSaveStatus('saved');
    }, 1200);
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
      className="bg-[#2a1a13] p-4 sm:p-6 rounded-sm shadow-[0_25px_55px_rgba(0,0,0,0.95)] border-[14px] border-[#1c110c] relative min-h-[850px] animate-fadeIn"
      style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }}
    >
      {/* Manila folder tabs */}
      <div className="flex items-end gap-1 relative z-10" style={{ marginBottom: '-2px' }}>
        {[
          {
            label: 'Field Notes',
            active: !showEphemeral && !isLKView,
            onClick: () => { setShowEphemeral(false); setShowLKResources(false); },
            activeColor: '#f0e6be', activeText: '#1a1005', inactiveColor: 'rgba(90,65,25,0.65)', inactiveText: 'rgba(240,220,160,0.55)',
          },
          {
            label: `Private Notes${ephemeralEntries.length > 0 ? ` (${ephemeralEntries.length})` : ''}`,
            active: showEphemeral,
            onClick: () => { setShowEphemeral(true); setShowLKResources(false); },
            activeColor: '#f0e6be', activeText: '#1a1005', inactiveColor: 'rgba(90,65,25,0.65)', inactiveText: 'rgba(240,220,160,0.55)',
          },
          ...(isGM ? [{
            label: `Lightkeeper Resources${lkEntries.length > 0 ? ` (${lkEntries.length})` : ''}`,
            active: isLKView,
            onClick: () => { setShowLKResources(true); setShowEphemeral(false); },
            activeColor: '#d4af37', activeText: '#1a1000', inactiveColor: 'rgba(80,60,10,0.65)', inactiveText: 'rgba(212,175,55,0.55)',
          }] : []),
        ].map(tab => (
          <button
            key={tab.label}
            onClick={tab.onClick}
            className="font-mono text-[11px] font-black uppercase tracking-widest transition-all select-none"
            style={{
              clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)',
              background: tab.active ? tab.activeColor : tab.inactiveColor,
              color: tab.active ? tab.activeText : tab.inactiveText,
              padding: tab.active ? '7px 22px 10px' : '4px 22px 8px',
              boxShadow: tab.active ? '0 -3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : '0 -1px 3px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: tab.active ? 20 : 5,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ EPHEMERAL NOTES VIEW ═══════════════ */}
      {showEphemeral && (
        <div className="bg-[#fdfaf2] rounded-sm border border-black/20 p-8 min-h-[700px] relative z-10">
          <div className="flex items-center justify-between mb-6 border-b border-black/15 pb-3">
            <h2 className="font-serif font-black text-3xl uppercase text-black">Private Field Notes</h2>
            <span className="font-mono text-[11px] text-black/30 uppercase">Visible only to you</span>
          </div>

          {/* New ephemeral note */}
          <div className="mb-8 relative" style={{
            background: '#fffde7',
            clipPath: 'polygon(0% 4%, 8% 0%, 20% 3%, 35% 0%, 50% 4%, 65% 0%, 80% 3%, 92% 0%, 100% 3%, 100% 100%, 0% 100%)',
            padding: '24px 20px 20px',
            boxShadow: '3px 5px 18px rgba(0,0,0,0.2)',
            transform: 'rotate(-0.5deg)',
          }}>
            <textarea
              value={ephemeralText}
              onChange={e => setEphemeralText(e.target.value)}
              placeholder="Write a private note…"
              className="w-full bg-transparent border-none outline-none resize-none font-serif text-[24px] leading-[1.7] text-black/80 min-h-[80px]"
              style={{ fontFamily: authorFont, color: authorColor }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleAddEphemeral(); } }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="font-mono text-[11px] text-black/25 uppercase">Ctrl+Enter to save</span>
              <button
                onClick={handleAddEphemeral}
                disabled={!ephemeralText.trim() || isAddingEphemeral}
                className="font-sans font-black text-[14px] uppercase tracking-widest px-3 py-1 border border-black/30 hover:bg-black/5 disabled:opacity-30 transition-all"
              >
                Pin Note →
              </button>
            </div>
          </div>

          {/* Existing ephemeral notes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {ephemeralEntries.map(entry => (
              <EphemeralNote
                key={entry.id}
                entry={entry}
                onDelete={() => deleteEphemeralNote(entry.id)}
              />
            ))}
          </div>
          {ephemeralEntries.length === 0 && (
            <p className="font-serif text-[22px] italic text-black/25 text-center mt-8">No private notes yet.</p>
          )}
        </div>
      )}

      {/* ═══════════════ LIGHTKEEPER RESOURCES VIEW ═══════════════ */}
      {isLKView && (
        <div className="relative z-10">
          <div
            className="w-full bg-[#fdfaf2] text-black relative shadow-inner border border-black/30 rounded-sm"
            style={{ minHeight: '780px' }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 pt-5 pb-3 border-b border-black/10">
              <span className="font-mono text-[11px] text-black/30 uppercase tracking-widest">Lightkeeper Resources</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-black/40 uppercase tracking-wider">
                {lkSaveStatus === 'saving' ? (
                  <><span className="inline-block w-3 h-3 border-2 border-black/30 border-t-black/70 rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><span className="text-emerald-700">✓</span> Saved</>
                )}
              </div>
            </div>

            {/* Continuous note area */}
            <div className="px-8 py-4" style={LINED_PAPER}>
              <textarea
                value={lkContent}
                onChange={e => handleLKContentChange(e.target.value)}
                placeholder="Write Lightkeeper notes here…"
                className="w-full bg-transparent border-none outline-none resize-none text-[26px] leading-[3.5rem] font-serif text-black placeholder-black/15"
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
            className="w-full grid grid-cols-1 lg:grid-cols-2 bg-[#fdfaf2] text-black relative shadow-inner border border-black/30 overflow-hidden rounded-sm"
            style={{ minHeight: '800px' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }} />

            {/* LEFT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-8 lg:pr-10 relative flex flex-col h-full border-b lg:border-b-0 lg:border-r border-black/20">
                <div className="absolute top-3 left-3 font-mono text-[14px] text-black/30 tracking-widest uppercase">Section I</div>

                <header className="border-b-2 border-black/80 pb-4 mb-5">
                  <h2 className="text-[48px] font-serif font-black tracking-tight text-black uppercase">Field Notes</h2>
                  <p className="text-[20px] font-mono uppercase tracking-widest text-[#721c15] font-black mt-1">Table of Contents</p>
                </header>

                {authorKeys.length > 0 && (
                  <div className="mb-4">
                    <span className="block font-sans text-[18px] font-black text-black/40 uppercase tracking-widest mb-2">Filter by Author</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedAuthorFilter(null)}
                        className="px-2 py-1 text-[20px] rounded-sm border transition-all font-mono font-black uppercase tracking-widest"
                        style={{
                          color: activeFilter === null ? '#fff' : '#555',
                          borderColor: '#888',
                          background: activeFilter === null ? '#555' : 'transparent',
                          opacity: activeFilter === null ? 1 : 0.6,
                        }}
                      >All</button>
                      {authorKeys.map(name => {
                        const info = authorMap[name];
                        const isActive = activeFilter === name;
                        return (
                          <button key={name} onClick={() => setSelectedAuthorFilter(name)}
                            className="px-2 py-1 text-[26px] rounded-sm border transition-all"
                            style={{
                              fontFamily: info.pen_font, color: isActive ? '#fff' : info.ink_color,
                              borderColor: info.ink_color, background: isActive ? info.ink_color : 'transparent', opacity: isActive ? 1 : 0.7,
                            }}
                          >{name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredEntries.length === 0 ? (
                    <p className="text-[28px] font-serif italic text-black/40 mt-4">No entries recorded yet.</p>
                  ) : filteredEntries.map(entry => (
                    <button key={entry.id} onClick={() => setCurrentSpread(entrySpread(entry))}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-sm border border-black/[0.08] hover:bg-black/[0.03] transition-all group"
                      style={{ background: 'rgba(0,0,0,0.015)' }}
                    >
                      <span className="text-[26px] leading-tight flex items-center gap-2"
                        style={{ fontFamily: entry.pen_font, color: entry.ink_color }}>
                        {entry.entry_type === 'sketch' && <span className="text-[14px]">✏</span>}
                        {entry.entry_type === 'photo' && <span className="text-[14px]">📷</span>}
                        {entry.title}
                      </span>
                      <span className="font-mono text-[18px] text-black/35 shrink-0 ml-2 group-hover:text-black/60">
                        p.{entry.page_number}
                      </span>
                    </button>
                  ))}
                </div>

                {/* GM-only: Lightkeeper Resources link in TOC */}
                {isGM && (
                  <div className="mt-4 pt-3 border-t border-[#d4af37]/30">
                    <button onClick={() => { setShowLKResources(true); setShowEphemeral(false); setLkSpreadIdx(0); }}
                      className="w-full text-left flex items-center justify-between px-2 py-1 rounded-sm hover:bg-[#d4af37]/10 transition-all"
                    >
                      <span className="font-serif text-[24px] text-black/70">Lightkeeper Resources</span>
                      <span className="font-mono text-[14px] text-[#d4af37]/50">Restricted →</span>
                    </button>
                  </div>
                )}

                {pageFooter('CLASSIFIED', 'DO NOT DISTRIBUTE')}
              </div>
            ) : (
              <div className="p-8 lg:pr-10 relative flex flex-col h-full border-b lg:border-b-0 lg:border-r border-black/20">
                <div className="absolute top-3 left-3 font-mono text-[14px] text-black/30 tracking-widest uppercase">
                  Field Notes // Spread {currentSpread}
                </div>
                <div className="flex-1 overflow-y-auto relative mt-6" style={LINED_PAPER}>
                  {leftEntries.length === 0
                    ? <p className="text-[28px] font-serif italic text-black/25 text-center mt-16">— No Records Found —</p>
                    : leftEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === leftEntries.length - 1} />)}
                </div>
                {pageFooter(`SPREAD ${currentSpread}`, '')}
              </div>
            )}

            {/* SPINE */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/35 to-black/15 pointer-events-none border-l border-r border-black/5 z-20" />

            {/* RIGHT PAGE */}
            {currentSpread === 0 ? (
              <div className="p-8 lg:pl-10 relative flex flex-col h-full bg-[#faf5e8]">
                <div className="absolute top-3 right-3 font-mono text-[14px] text-black/30 tracking-widest uppercase">Section II</div>
                <header className="border-b-2 border-black/80 pb-4 mb-5">
                  <h3 className="text-[36px] font-serif font-black tracking-tight text-black uppercase">Log a Field Entry</h3>
                  <p className="text-[18px] font-mono uppercase tracking-wider text-black/40 mt-0.5">
                    Record your observations for archival.
                  </p>
                </header>

                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="block font-mono text-[18px] font-black uppercase tracking-widest text-black/50 mb-1">Entry Title</label>
                    <input type="text" value={newEntryTitle} onChange={e => setNewEntryTitle(e.target.value)}
                      placeholder="Name this record..."
                      className="w-full px-0 py-1 bg-transparent border-b-2 border-black/30 focus:border-black/60 outline-none text-[32px]"
                      style={{ fontFamily: authorFont, color: authorColor }} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="block font-mono text-[18px] font-black uppercase tracking-widest text-black/50 mb-1">Field Observations</label>
                    <div className="flex-1 relative">
                      <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.08) 27px, rgba(0,0,0,0.08) 28px)',
                        backgroundSize: '100% 28px', backgroundPosition: '0 32px',
                      }} />
                      <textarea value={newEntryContent} onChange={e => setNewEntryContent(e.target.value)}
                        placeholder="Record your observations here..."
                        className="w-full h-full min-h-[180px] bg-transparent border-none outline-none resize-none text-[28px] leading-[3.5rem] relative z-10 pt-1"
                        style={{ fontFamily: authorFont, color: authorColor }} />
                    </div>
                  </div>

                  {/* Image upload — staged preview */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                      placeholder="Image caption (optional)"
                      className="flex-1 bg-transparent border-b border-black/20 focus:border-black/40 outline-none text-[18px] font-serif text-black/60 py-0.5" />
                    <button onClick={() => sketchInputRef.current?.click()} disabled={isUploading || !!pendingImageFile}
                      className="font-sans font-black uppercase tracking-widest text-[14px] px-3 py-1.5 border border-black/40 hover:bg-black/5 transition-all disabled:opacity-30">
                      ✏ Sketch
                    </button>
                    <button onClick={() => photoInputRef.current?.click()} disabled={isUploading || !!pendingImageFile}
                      className="font-sans font-black uppercase tracking-widest text-[14px] px-3 py-1.5 border border-black/40 hover:bg-black/5 transition-all disabled:opacity-30">
                      📷 Photo
                    </button>
                    <input ref={sketchInputRef} type="file" accept="image/png" className="hidden"
                      onChange={e => { if (e.target.files[0]) handleStageImage(e.target.files[0], 'sketch'); e.target.value = ''; }} />
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files[0]) handleStageImage(e.target.files[0], 'photo'); e.target.value = ''; }} />
                  </div>

                  {pendingImagePreview && (
                    <div className="flex items-center gap-3 p-2 border border-black/20 rounded-sm bg-black/[0.03]">
                      <img src={pendingImagePreview} alt="preview" className="w-16 h-16 object-cover border border-black/20 rounded-sm" style={{ mixBlendMode: pendingImageType === 'sketch' ? 'multiply' : 'normal' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[14px] text-black/60 truncate">{pendingImageFile?.name}</p>
                        <p className="font-mono text-[12px] text-black/35 uppercase">{pendingImageType} staged — will submit with entry</p>
                      </div>
                      <button onClick={clearPendingImage} className="text-black/30 hover:text-red-600 font-black text-lg transition-colors">✕</button>
                    </div>
                  )}

                  {/* Font picker — player only */}
                  {!isGM && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] uppercase tracking-widest text-black/40">Pen Style</span>
                      <select
                        value={authorFont}
                        onChange={e => updatePenFont(e.target.value)}
                        className="bg-transparent border-b border-black/25 focus:border-black/50 outline-none text-[18px] py-0.5 flex-1"
                        style={{ fontFamily: authorFont, color: authorColor }}
                      >
                        {PEN_FONTS.map(f => (
                          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(submitError || uploadError) && (
                    <p className="font-mono text-[18px] text-[#721c15] tracking-wide">{uploadError || submitError}</p>
                  )}
                  {isUploading && <p className="font-mono text-[16px] text-black/40">Uploading image…</p>}

                  <button onClick={handleSubmitEntry}
                    disabled={isSubmitting || isUploading || !newEntryTitle.trim() || (!newEntryContent.trim() && !pendingImageFile)}
                    className="font-sans font-black uppercase tracking-widest text-[22px] px-4 py-2 border-2 border-black/60 hover:bg-black/5 transition-all disabled:opacity-30 self-end">
                    {isSubmitting || isUploading ? 'Sealing…' : 'Seal & Submit →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 lg:pl-10 relative flex flex-col h-full bg-[#faf5e8]">
                <div className="absolute top-3 right-3 font-mono text-[14px] text-black/30 tracking-widest uppercase">Field Notes</div>
                <div className="flex-1 overflow-y-auto relative mt-6" style={LINED_PAPER}>
                  {rightEntries.length === 0
                    ? <div className="h-full flex flex-col items-center justify-center gap-4 opacity-[0.055] pointer-events-none select-none">
                        <div className="w-32 h-32 rounded-full border-4 border-black flex flex-col items-center justify-center">
                          <span className="text-[14px] font-sans font-black tracking-[0.35em] uppercase text-black">Candela</span>
                          <div className="text-7xl font-serif font-black text-black my-1">✦</div>
                          <span className="text-[14px] font-sans font-black tracking-[0.35em] uppercase text-black">Obscura</span>
                        </div>
                      </div>
                    : rightEntries.map((entry, i) => <EntryCard key={entry.id} entry={entry} isLast={i === rightEntries.length - 1} />)}
                </div>
                {pageFooter('', `VERSO ${currentSpread}`)}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 px-2">
            <button onClick={goToPrev} disabled={currentSpread === 0}
              className="font-sans font-black uppercase tracking-widest text-[22px] px-5 py-2 text-[#e4d5b0] border border-[#e4d5b0]/30 rounded-sm hover:bg-white/5 transition-all disabled:opacity-20">
              ← Previous
            </button>
            <span className="font-mono text-[22px] text-[#e4d5b0]/60 tracking-widest">
              {currentSpread === 0 ? 'TABLE OF CONTENTS' : `SPREAD ${currentSpread} OF ${totalSpreads}`}
            </span>
            <button onClick={goToNext} disabled={currentSpread >= totalSpreads}
              className="font-sans font-black uppercase tracking-widest text-[22px] px-5 py-2 text-[#e4d5b0] border border-[#e4d5b0]/30 rounded-sm hover:bg-white/5 transition-all disabled:opacity-20">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
