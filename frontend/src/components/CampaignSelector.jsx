import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { apiUrl } from '../utils/api';

const PEN_FONTS = [
  'Reenie Beenie', 'Caveat', 'Shadows Into Light', 'Zeyada', 'Sacramento',
  'Homemade Apple', 'Alex Brush', 'Cedarville Cursive', 'La Belle Aurore',
  'Charm', 'Dawning of a New Day', 'Gaegu', 'Grape Nuts', 'Moondance',
  'Long Cang', 'Indie Flower', 'Kalam', 'Patrick Hand', 'Rock Salt', 'Gochi Hand'
];

export const CampaignSelector = () => {
  const {
    setStage, connect, logout, accessSession, character, characters, gmCampaigns,
    lastPlayedCampaign, joinCampaign, refreshCharacterStatus, fetchUserData,
    setLastPlayed, setLocalCharacter, rejoinInvite, setRejoinInvite,
  } = useGameStore();

  // Pamphlet / desk state
  const [showGMBack, setShowGMBack] = useState(false);
  const [gmCampaignName, setGmCampaignName] = useState('');
  const [gmCode, setGmCode] = useState('');

  // Book overlay state
  const [showBook, setShowBook] = useState(false);
  const [isClosingBook, setIsClosingBook] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  // Per-character inline join form state  { [charId]: { code, pen, error, loading } }
  const [joinForms, setJoinForms] = useState({});

  // Campaign creation state (right page of book)
  const [newCampName, setNewCampName] = useState('');
  const [newCampCode, setNewCampCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Fetch user data on mount so book covers show accurate counts without needing to open the book
  useEffect(() => {
    if (accessSession?.userId) {
      fetchUserData(accessSession.userId);
    }
  }, [accessSession?.userId]);

  // Auto-populate lastPlayedCampaign from the first active character/campaign so the last session
  // book unlocks as soon as the user has an active record — even before they manually re-enter
  useEffect(() => {
    if (!lastPlayedCampaign) {
      const firstActive = characters.find(c => c.status === 'active');
      if (firstActive) {
        setLastPlayed({
          type: 'player',
          characterId: firstActive.id,
          campaignName: firstActive.campaign_name || 'Active Campaign',
          campaignCode: '',
        });
      } else if (gmCampaigns.length > 0) {
        setLastPlayed({
          type: 'gm',
          campaignCode: gmCampaigns[0].campaign_code,
          campaignName: gmCampaigns[0].name,
          campaignId: gmCampaigns[0].id,
        });
      }
    }
  }, [characters, gmCampaigns]);

  const handleLogout = () => {
    logout();
    setStage('LOGIN');
  };

  const [gmEntryError, setGmEntryError] = useState('');
  const [isGmCreating, setIsGmCreating] = useState(false);

  const handleGMEntry = async (e) => {
    e.preventDefault();
    if (!gmCode.trim()) return;
    setGmEntryError('');
    setIsGmCreating(true);
    try {
      const res = await fetch(
        apiUrl(`/campaign/create?name=${encodeURIComponent((gmCampaignName || gmCode).trim())}&code=${encodeURIComponent(gmCode.trim())}&user_id=${accessSession?.userId || ''}`),
        { method: 'POST' }
      );
      if (res.ok) {
        const camp = await res.json();
        await fetchUserData(accessSession?.userId);
        enterAsGM({ campaign_code: camp.campaign_code, name: camp.name, id: camp.id });
      } else {
        const err = await res.json().catch(() => ({}));
        setGmEntryError(err.detail || 'Failed to create campaign.');
      }
    } catch {
      setGmEntryError('Network error — try again.');
    } finally {
      setIsGmCreating(false);
    }
  };

  const closeBook = () => {
    setIsClosingBook(true);
    setTimeout(() => { setShowBook(false); setIsClosingBook(false); }, 420);
  };

  const handleOpenRoster = async () => {
    setShowBook(true);
    setIsClosingBook(false);
    if (accessSession?.userId && characters.length === 0 && gmCampaigns.length === 0) {
      setIsLoadingBook(true);
      await fetchUserData(accessSession.userId);
      setIsLoadingBook(false);
    }
  };

  const refreshBook = async () => {
    if (!accessSession?.userId) return;
    setIsLoadingBook(true);
    await fetchUserData(accessSession.userId);
    setIsLoadingBook(false);
  };

  const enterAsPlayer = (char) => {
    setLocalCharacter({ id: char.id, name: char.name, status: char.status });
    connect(char.id);
    setLastPlayed({ type: 'player', characterId: char.id, campaignName: char.campaign_name || 'Active Campaign', campaignCode: char.campaign_code || '' });
    closeBook();
    setStage('DESK');
  };

  const enterAsGM = (camp) => {
    connect(camp.campaign_code);
    setLastPlayed({ type: 'gm', campaignCode: camp.campaign_code, campaignName: camp.name, campaignId: camp.id });
    closeBook();
    setStage('GM_DASH');
  };

  const handleLastPlayed = () => {
    if (!lastPlayedCampaign) return;
    if (lastPlayedCampaign.type === 'player') {
      setLocalCharacter({ id: lastPlayedCampaign.characterId, name: lastPlayedCampaign.campaignName });
      connect(lastPlayedCampaign.characterId);
      setStage('DESK');
    } else {
      const matchedCamp = gmCampaigns.find(c => c.campaign_code === lastPlayedCampaign.campaignCode);
      if (matchedCamp && !lastPlayedCampaign.campaignId) {
        setLastPlayed({ ...lastPlayedCampaign, campaignId: matchedCamp.id });
      }
      connect(lastPlayedCampaign.campaignCode);
      setStage('GM_DASH');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampName.trim() || !newCampCode.trim()) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const res = await fetch(
        apiUrl(`/campaign/create?name=${encodeURIComponent(newCampName.trim())}&code=${encodeURIComponent(newCampCode.trim())}&user_id=${accessSession?.userId || ''}`),
        { method: 'POST' }
      );
      if (res.ok) {
        const camp = await res.json();
        setNewCampName('');
        setNewCampCode('');
        await fetchUserData(accessSession?.userId);
        enterAsGM({ campaign_code: camp.campaign_code, name: camp.name, id: camp.id });
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.detail || 'Failed to create campaign.');
      }
    } catch (err) {
      setCreateError('Network error — try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinForChar = async (charId) => {
    const form = joinForms[charId] || {};
    if (!form.code?.trim()) return;
    setJoinForms(f => ({ ...f, [charId]: { ...f[charId], loading: true, error: '' } }));
    const result = await joinCampaign(charId, form.code.trim(), form.pen || 'Caveat');
    if (result.success) {
      await fetchUserData(accessSession?.userId);
      setJoinForms(f => ({ ...f, [charId]: { expanded: false, code: '', pen: 'Caveat', loading: false, error: '' } }));
    } else {
      setJoinForms(f => ({ ...f, [charId]: { ...f[charId], loading: false, error: result.detail || 'Invalid code.' } }));
    }
  };

  return (
    <div className="scene-container min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-black">

      {/* GM Rejoin Invite Banner */}
      {rejoinInvite && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-4 bg-[#1a0505] border border-[#8b1a1a] px-6 py-4 shadow-[0_4px_30px_rgba(139,26,26,0.5)] max-w-xl w-[calc(100%-2rem)]">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-[#8b4a4a] uppercase tracking-[0.2em] mb-0.5">Lightkeeper Invitation</p>
            <p className="text-[#c9b89a] font-serif text-base leading-snug truncate">
              You have been invited to rejoin <strong className="text-white">{rejoinInvite.campaign_name}</strong>
            </p>
          </div>
          <button
            onClick={() => setStage('CHARACTER_CREATION')}
            className="shrink-0 px-4 py-2 bg-[#8b1a1a] hover:bg-[#a82222] text-white font-sans font-black uppercase tracking-[0.15em] text-xs border border-[#5c0f0f] transition-colors"
          >
            Commission Investigator
          </button>
          <button
            onClick={() => setRejoinInvite(null)}
            className="shrink-0 text-[#8b1a1a] hover:text-[#c9b89a] font-mono text-lg leading-none transition-colors"
            aria-label="Dismiss invite"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* 1. DYNAMIC ASSET & STYLE INJECTION */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Alex+Brush&family=Caveat&family=Cedarville+Cursive&family=Charm&family=Dawning+of+a+New+Day&family=Gaegu&family=Gochi+Hand&family=Grape+Nuts&family=Homemade+Apple&family=Indie+Flower&family=Kalam&family=La+Belle+Aurore&family=Long+Cang&family=Moondance&family=Patrick+Hand&family=Reenie+Beenie&family=Rock+Salt&family=Sacramento&family=Shadows+Into+Light&family=Zeyada&display=swap');

        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-garamond { font-family: 'Cormorant Garamond', serif; }
        .font-mono-data { font-family: 'IBM Plex Mono', monospace; }
        .font-playfair { font-family: 'Playfair Display', serif; }

        @keyframes candleSharedGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); filter: blur(40px); }
          50% { opacity: 0.65; transform: scale(0.95); filter: blur(45px); }
          75% { opacity: 0.95; transform: scale(1.02); filter: blur(38px); }
        }

        @keyframes wickFlicker {
          0%, 100% { opacity: 0.9; transform: scale(1) translateX(0px); }
          25% { opacity: 0.7; transform: scale(0.9) translateX(-1px); }
          50% { opacity: 1; transform: scale(1.1) translateX(1px); }
        }

        .desk-surface {
        /* Rich deep-brown mahogany base */
        background-color: #2b170c;
        
        /* 
          1. Radial gradient creates the 'desk lamp' hotspot.
          2. Linear gradient darkens the bottom/edges for desk depth.
          3. The background-image property holds the wood texture, 
              rotated 90 degrees to force a horizontal grain flow.
        */
        background: 
          radial-gradient(circle at 50% 50%, rgba(60, 30, 10, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%),
          linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%),
          url('https://www.transparenttextures.com/patterns/dark-wood.png');
          
        /* Flip the texture pattern to horizontal */
        background-size: auto, auto, 400px 400px;
        background-blend-mode: overlay, multiply, normal;
        /* Rotate the pattern 90deg to ensure horizontal grain */
        transform: rotate(0deg); 
        /* Adding a subtle transform to the whole background container if needed */
      }

      /* To ensure the wood grain pattern itself is horizontal */
      .desk-surface::after {
        content: "";
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: url('https://www.transparenttextures.com/patterns/dark-wood.png');
        background-size: 400px 400px;
        transform: rotate(90deg);
        opacity: 0.3;
        z-index: -1;
      }

        /* Leather Tome Base Styles */
        .thick-book {
          position: relative;
          border-radius: 6px 14px 14px 6px;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
          cursor: pointer;
        }

        .leather-texture {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='4' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' filter='url(%23leather)'/%3E%3C/svg%3E");
          mix-blend-mode: multiply;
          opacity: 0.6;
          pointer-events: none;
          z-index: 1;
        }

        .thick-book::after {
          content: ''; position: absolute; left: 18px; top: 0; bottom: 0; width: 10px;
          background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(255,255,255,0.05), rgba(0,0,0,0.6));
          border-left: 1px solid rgba(0,0,0,0.9); border-right: 1px solid rgba(255,255,255,0.05);
          border-radius: 2px; z-index: 2;
        }

        .thick-book::before {
          content: ''; position: absolute; top: 5px; bottom: 5px; right: -16px; width: 16px;
          background: repeating-linear-gradient(to bottom, #d6c6b0, #d6c6b0 2px, #bfae95 2px, #bfae95 4px);
          border-radius: 0 8px 8px 0; border-right: 1px solid rgba(0,0,0,0.6);
          border-top: 1px solid rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.4);
          box-shadow: inset -5px 0 15px rgba(0,0,0,0.8); transform: translateZ(-2px); z-index: -1;
        }

        .embossed-gold { color: #c49d47; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.2), inset 0 0 2px rgba(0,0,0,0.5); }
        .embossed-silver { color: #a8a8a8; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.15); }
        .embossed-stamp { box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }

        /* Turn-of-the-Century Pamphlets */
        .pamphlet {
          background-color: #e6dfcc;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E");
          box-shadow: 4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(139, 115, 85, 0.4);
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
          position: absolute; 
        }

        /* Top-Fold Horizontal Newspaper Emulation */
        .newspaper-top-fold {
          background-color: #dcd2b8;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23dcd2b8' filter='url(%23paper)'/%3E%3C/svg%3E");
          box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -30px 40px -10px rgba(0,0,0,0.5);
          color: #2b251e;
          position: absolute;
          border-bottom: 2px solid rgba(0,0,0,0.3);
        }

        /* Simulating the fold dropping off the bottom */
        .newspaper-top-fold::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 15px;
          background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
          pointer-events: none; z-index: 10;
        }

        .aged-paper-img {
          mix-blend-mode: multiply;
          filter: grayscale(80%) sepia(40%) contrast(120%) brightness(95%);
        }

        /* ── Book open/close animation ── */
        @keyframes bookOpen {
          0%   { transform: perspective(1800px) scale(0.12) rotateX(58deg) translateY(130px); opacity: 0; }
          55%  { opacity: 1; }
          100% { transform: perspective(1800px) scale(1) rotateX(0deg) translateY(0); opacity: 1; }
        }
        @keyframes bookClose {
          0%   { transform: perspective(1800px) scale(1) rotateX(0deg) translateY(0); opacity: 1; }
          45%  { opacity: 1; }
          100% { transform: perspective(1800px) scale(0.12) rotateX(58deg) translateY(130px); opacity: 0; }
        }
        .roster-book { animation: bookOpen 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .roster-book.closing { animation: bookClose 0.4s cubic-bezier(0.36, 0, 0.66, 0) forwards; }

        .book-page {
          background-color: #f0e8d0;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 27px,
            rgba(90,58,40,0.08) 27px,
            rgba(90,58,40,0.08) 28px
          );
        }
        .book-page-right {
          background-color: #ede4c8;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 27px,
            rgba(60,40,20,0.07) 27px,
            rgba(60,40,20,0.07) 28px
          );
        }
      `}</style>

      {/* 2. DESK BACKGROUND */}
      <div className="absolute inset-0 desk-surface pointer-events-none z-0" />

      {/* 3. TIGHT CANDLE CLUSTER */}
      <div className="absolute top-[24%] left-[6%] w-[14vw] max-w-[220px] min-w-[120px] h-[200px] z-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32vw] h-[32vw] max-w-[500px] max-h-[500px] rounded-full mix-blend-screen bg-[radial-gradient(circle,rgba(240,140,50,0.13)_0%,rgba(200,80,20,0.03)_40%,transparent_65%)] animate-[candleSharedGlow_4s_infinite_alternate]" />

        {/* Candle 1 (Massive) — bottom-left anchor */}
        <div className="absolute bottom-[0%] left-[3%] w-[8vw] max-w-[128px] min-w-[64px] aspect-square rounded-full bg-gradient-to-br from-[#f2ead3] to-[#b3a48c] shadow-[10px_15px_25px_rgba(0,0,0,0.95)] border border-[#fff2d8]/30 flex items-center justify-center rotate-[-2deg]">
          <div className="absolute inset-[10%] rounded-full border border-[#8a7a63]/50 bg-gradient-to-tl from-[#b09e84] to-[#e6d9bf]" />
          <div className="relative w-3.5 h-3.5 rounded-full bg-[#ffeed0] shadow-[0_0_15px_6px_rgba(255,140,40,0.9)] animate-[wickFlicker_0.15s_infinite_alternate]" />
        </div>

        {/* Candle 2 (Medium) — upper-right of large */}
        <div className="absolute top-[4%] left-[52%] w-[5vw] max-w-[80px] min-w-[44px] aspect-square rounded-full bg-gradient-to-br from-[#e0d3ba] to-[#9c8e75] shadow-[15px_20px_30px_rgba(0,0,0,0.9)] border border-[#f5ead2]/20 flex items-center justify-center rotate-[4deg]">
          <div className="absolute inset-[10%] rounded-full border border-[#7a6a53]/60 bg-gradient-to-tl from-[#a08e74] to-[#d6c7ac]" />
          <div className="relative w-2.5 h-2.5 rounded-full bg-[#ffeed0] shadow-[0_0_12px_4px_rgba(255,130,30,0.8)] animate-[wickFlicker_0.2s_infinite_alternate-reverse]" />
        </div>

        {/* Candle 3 (Small) — lower-right, tucked in */}
        <div className="absolute top-[60%] right-[4%] w-[3.5vw] max-w-[56px] min-w-[32px] aspect-square rounded-full bg-gradient-to-br from-[#d1c2a3] to-[#8a7b62] shadow-[5px_10px_15px_rgba(0,0,0,0.8)] border border-[#e0d1b4]/20 flex items-center justify-center rotate-[-6deg]">
          <div className="absolute inset-[10%] rounded-full border border-[#6e5e48]/50 bg-gradient-to-tl from-[#9c896e] to-[#c7b799]" />
          <div className="relative w-2 h-2 rounded-full bg-[#ffeed0] shadow-[0_0_10px_3px_rgba(255,120,20,0.7)] animate-[wickFlicker_0.1s_infinite_alternate]" />
        </div>
      </div>

      {/* 4. MASSIVE SCATTERED CRYPTID IMAGES */}
        {/* Increased container size and adjusted positioning */}
        <div className="absolute bottom-[5%] left-[10%] w-[850px] h-[750px] pointer-events-none z-10">
          
          {/* Cryptid Sheet 1 (Bottom Left) - Scaled Up */}
          <div className="absolute bottom-[10%] left-[5%] w-[320px] aspect-[1/1.4] bg-[#e6d8bc] rotate-[-12deg] shadow-[4px_6px_15px_rgba(0,0,0,0.9)] border border-[#c4b599] p-2 flex flex-col">
            <div className="w-full h-full border border-[#5c4a35]/40 relative overflow-hidden bg-[#d9cdb4]">
              {/* Ensure object-cover fills the container */}
              <img src="/images/cryp1.jpg" alt="Field Sketch 1" className="w-full h-full object-cover aged-paper-img scale-100" />
            </div>
          </div>

          {/* Cryptid Sheet 2 (Center Massive) - Scaled Up */}
          <div className="absolute bottom-[20%] left-[32%] w-[400px] aspect-[4/5] bg-[#dbcdb2] rotate-[8deg] shadow-[5px_8px_20px_rgba(0,0,0,0.95)] border border-[#d1c2a3] p-2 flex flex-col">
            <div className="w-full h-full border border-[#5c4a35]/30 relative overflow-hidden bg-[#ebdcc2]">
              <img src="/images/cryp2.webp" alt="Field Sketch 2" className="w-full h-full object-cover aged-paper-img scale-105" />
            </div>
          </div>

          {/* Cryptid Sheet 3 (Right Under Book) - Scaled Up */}
          <div className="absolute bottom-[5%] left-[60%] w-[330px] aspect-[1/1.3] bg-[#cfc0a3] rotate-[22deg] shadow-[6px_12px_25px_rgba(0,0,0,0.98)] border border-[#b8a98d] p-3 flex flex-col">
            <div className="w-full h-full border-2 border-double border-[#5c4a35]/50 relative overflow-hidden bg-[#e0d3ba]">
              <img src="/images/cryp3.jpg" alt="Field Sketch 3" className="w-full h-full object-cover aged-paper-img" />
            </div>
          </div>
        </div>

      {/* 5. EXACT GM OPERATIONS HEADER */}
      <div className="relative z-50 w-full">
        <div className="absolute top-4 right-6 z-50">
          <button 
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#3b82f6] hover:text-white transition-colors border border-transparent hover:border-[#3b82f6]/50 px-2 py-1"
          >
            [ Return to Login ]
          </button>
        </div>
        
        <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
          <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
          <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Chapter Hub Terminal</h2>
        </header>
      </div>

      {/* 6. PHYSICAL DESK LAYOUT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto flex items-center justify-center gap-12 p-12 z-30 perspective-[1500px]">
        
        {/* LEFT AREA: MASSIVE LEATHER TOMES */}
        <div className="flex gap-6 items-center justify-center w-[50%] ml-4 z-30">
          
          {/* TOME I: YOUR CHARACTERS (Dark Forest Green Leather) */}
          <div
            onClick={handleOpenRoster}
            className="thick-book group w-[28vw] max-w-[400px] aspect-[1/1.4] bg-[#0b1f12] p-6 shadow-[15px_25px_40px_rgba(0,0,0,0.95),inset_8px_0_20px_rgba(0,0,0,0.9),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[-3deg] -translate-y-4 hover:-translate-y-6 cursor-pointer"
          >
            <div className="leather-texture" />
            <div className="absolute inset-6 border-2 border-black/40 embossed-stamp pointer-events-none rounded-sm z-10" />
            <div className="absolute inset-8 border border-black/30 embossed-stamp pointer-events-none rounded-sm z-10" />

            <div className="z-20 flex flex-col items-center text-center px-4 relative w-full">
              <span className="font-mono-data text-[18px] font-bold tracking-[0.4em] text-[#c49d47]/70 mb-4 uppercase drop-shadow-md">
                Dossier Vol. I
              </span>
              <h2 className="font-playfair text-4xl md:text-5xl font-black embossed-gold tracking-wider leading-[1.1] mb-2">
                Active<br/>Register
              </h2>
              <div className="w-12 h-[1px] bg-[#c49d47]/30 my-4 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
              <>
                <p className="font-garamond text-[#a8a8a8] text-[28px] italic tracking-wide max-w-[80%] leading-relaxed drop-shadow-md">
                  List of your current investigators and campaigns.
                </p>
                <div className="w-full text-left space-y-2 mt-3">
                  {characters.filter(c => c.status === 'active').length > 0 && (
                    <div className="flex items-center gap-2 pl-1">
                      <span className="text-emerald-400 text-xl">●</span>
                      <span className="font-garamond text-2xl italic text-[#fdfaf4]/75">
                        {characters.filter(c => c.status === 'active').length} Profile{characters.filter(c => c.status === 'active').length !== 1 ? 's' : ''} Recorded
                      </span>
                    </div>
                  )}
                  {characters.filter(c => c.status === 'pending').length > 0 && (
                    <div className="flex items-center gap-2 pl-1">
                      <span className="text-[#c49d47]/70 text-xl">◌</span>
                      <span className="font-garamond text-2xl italic text-[#c49d47]/60">
                        {characters.filter(c => c.status === 'pending').length} Awaiting Approval
                      </span>
                    </div>
                  )}
                  {gmCampaigns.length > 0 && (
                    <div className="flex items-center gap-2 pl-1">
                      <span className="text-[#c49d47] text-xl">▶</span>
                      <span className="font-garamond text-2xl italic text-[#c49d47]/75">
                        {gmCampaigns.length} Investigation{gmCampaigns.length !== 1 ? 's' : ''} Recorded
                      </span>
                    </div>
                  )}
                  {characters.length === 0 && gmCampaigns.length === 0 && (
                    <span className="font-mono-data text-base font-bold tracking-[0.3em] uppercase text-[#c49d47]/40">
                      ○ No Records
                    </span>
                  )}
                </div>
              </>
            </div>
          </div>

          {/* TOME II: LAST SESSION */}
          {lastPlayedCampaign ? (
            <div
              onClick={handleLastPlayed}
              className="thick-book group w-[30vw] max-w-[440px] aspect-[1/1.3] bg-[#1e0624] p-6 shadow-[20px_30px_50px_rgba(0,0,0,0.98),inset_10px_0_25px_rgba(0,0,0,0.95),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[2deg] translate-y-6 translate-x-4 hover:-translate-y-1 hover:rotate-[1deg] cursor-pointer"
            >
              <div className="leather-texture" />
              <div className="absolute inset-5 border-[3px] border-[#c49d47]/40 embossed-stamp pointer-events-none rounded z-10" />
              <div className="z-20 flex flex-col items-center text-center relative">
                <span className="font-mono-data text-xl font-bold tracking-[0.5em] text-[#c49d47]/60 mb-6 uppercase drop-shadow-md">
                  {lastPlayedCampaign.type === 'gm' ? 'List of Campaigns' : 'Campaign Log'}
                </span>
                <h2 className="font-playfair italic font-bold text-4xl md:text-5xl embossed-gold tracking-tight leading-[1.1] mb-4 group-hover:text-[#e8c678] transition-colors">
                  {lastPlayedCampaign.campaignName || 'Last Session'}
                </h2>
                <div className="flex items-center gap-3 my-4">
                  <div className="w-6 h-[1px] bg-[#c49d47]/30" />
                  <svg className="w-5 h-5 text-[#c49d47]/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2l2 4h-4l2-4zm-3 4h6v14H9V6zm1.5 3h3M10.5 12h3M10.5 15h3M5 21h14" />
                  </svg>
                  <div className="w-6 h-[1px] bg-[#c49d47]/30" />
                </div>
                <p className="font-garamond text-[#c49d47]/80 text-[26px] tracking-wider max-w-[70%] leading-relaxed drop-shadow-md uppercase mt-2">
                  {lastPlayedCampaign.type === 'gm'
                    ? "Resume command of your active investigation."
                    : "Resume your circle's ongoing assignment."}
                </p>
              </div>
            </div>
          ) : (
            <div className="thick-book w-[30vw] max-w-[440px] aspect-[1/1.3] bg-[#120614] p-6 shadow-[20px_30px_50px_rgba(0,0,0,0.98),inset_10px_0_25px_rgba(0,0,0,0.95),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[2deg] translate-y-6 translate-x-4 cursor-not-allowed">
              <div className="leather-texture" />
              <div className="absolute inset-5 border-[3px] border-[#c49d47]/20 embossed-stamp pointer-events-none rounded z-10" />

              <div className="z-20 flex flex-col items-center text-center relative w-full" style={{ marginBottom: '60px' }}>
                <span className="font-mono-data text-xl font-bold tracking-[0.5em] text-[#c49d47]/50 mb-4 uppercase drop-shadow-md">Campaign Log</span>
                <h2 className="font-playfair italic font-bold text-5xl md:text-6xl embossed-gold tracking-tight leading-[1.05]">
                  Last<br/>Session
                </h2>
              </div>

              {/* Leather strap with brass lock */}
              <div className="absolute inset-x-0 z-30" style={{ top: '44%', height: '38px' }}>
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(to bottom, #7a5228 0%, #3e2410 30%, #4a2c14 55%, #3e2410 72%, #7a5228 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.07), inset 0 -3px 7px rgba(0,0,0,0.75), 0 5px 14px rgba(0,0,0,0.7)',
                  borderTop: '2px solid rgba(15,8,3,0.92)',
                  borderBottom: '2px solid rgba(15,8,3,0.92)',
                }} />
                <div className="absolute inset-x-3" style={{ top: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
                <div className="absolute inset-x-3" style={{ bottom: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 40 }}>
                  <svg width="42" height="56" viewBox="0 0 42 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 24V14C12 8.48 16.48 4 22 4C27.52 4 32 8.48 32 14V24" stroke="#1a0e04" strokeWidth="7" strokeLinecap="round" fill="none"/>
                    <path d="M12 24V14C12 8.48 16.48 4 22 4C27.52 4 32 8.48 32 14V24" stroke="#c49d47" strokeWidth="4" strokeLinecap="round" fill="none"/>
                    <path d="M12 24V14C12 8.48 16.48 4 22 4" stroke="rgba(255,220,120,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <rect x="5" y="23" width="34" height="30" rx="4" fill="rgba(0,0,0,0.55)" transform="translate(1.5,2.5)"/>
                    <rect x="5" y="23" width="34" height="30" rx="4" fill="url(#brassGrad)"/>
                    <rect x="5" y="23" width="34" height="30" rx="4" stroke="#1a0e04" strokeWidth="1.5"/>
                    <rect x="6" y="24" width="32" height="5" rx="2" fill="rgba(255,255,255,0.1)"/>
                    <rect x="5" y="23" width="5" height="30" rx="4" fill="rgba(0,0,0,0.2)"/>
                    <circle cx="22" cy="35" r="5" fill="rgba(10,5,2,0.9)"/>
                    <rect x="20" y="38" width="4" height="9" rx="2" fill="rgba(10,5,2,0.9)"/>
                    <defs>
                      <linearGradient id="brassGrad" x1="5" y1="23" x2="39" y2="53" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c49d47"/>
                        <stop offset="35%" stopColor="#7a5c18"/>
                        <stop offset="70%" stopColor="#9a7828"/>
                        <stop offset="100%" stopColor="#5a4010"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="z-20 absolute bottom-7 flex flex-col items-center gap-2 w-full px-6">
                <p className="font-garamond text-[#c49d47]/55 text-2xl tracking-wider text-center leading-relaxed uppercase">
                  No Recent Sessions
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT AREA: SHIFTED MESSY DESK PAMPHLETS & NEWSPAPER */}
        {/* We use a wider container to ensure everything stays far right and avoids books */}
        <div className="relative w-[50%] min-w-[550px] h-[600px] perspective-[1200px] flex items-center">
          
          {/* THE HALCYON HERALD NEWSPAPER (Top-Fold Horizontal Layout) */}
          <div className="newspaper-top-fold w-[960px] h-[700px] p-7 rotate-[-8deg] top-[-40px] left-[-100px] flex flex-col overflow-hidden">
            
            {/* Elaborate Broadsheet Header */}
            <div className="border-b-[4px] border-double border-[#2b251e] pb-2 mb-3 text-center relative z-20">
              <h1 className="font-cinzel text-[42px] font-black tracking-tight text-[#1f1b15] scale-y-[1.1] mb-1">THE HALCYON HERALD</h1>
              <div className="flex justify-between items-center font-mono-data text-[8px] uppercase tracking-widest font-bold border-t border-[#2b251e] pt-1.5">
                <span>Vol. XCIV, No. 212</span>
                <span>The Fairelands</span>
                <span>Two Pence</span>
              </div>
            </div>
            
            {/* Horizontal Layout - Main Headline spans across top */}
            <div className="border-b-[2px] border-[#2b251e] pb-2 mb-3 text-center z-20">
              <h2 className="font-playfair text-3xl font-black leading-none uppercase tracking-wide text-[#1a1611]">
                TERROR IN THE SIDLE!
              </h2>
              <h3 className="font-garamond text-[15px] italic font-semibold mt-1 text-[#3b3227]">
                Authorities Baffled by Midnight Disappearances
              </h3>
            </div>

            {/* 3-Column Text Layout with Expanded Content */}
            <div className="columns-3 gap-6 font-garamond text-[14.5px] leading-[1.65] text-justify opacity-90 z-20 h-full overflow-hidden">
              <p className="mb-4">
                <span className="text-5xl float-left mr-2 mt-1 leading-none font-cinzel font-bold text-[#1f1b15]">C</span>itizens are strongly urged to remain indoors after nightfall following a staggering series of inexplicable vanishings in the lower wards. The constabulary maintains that there is no cause for mass hysteria. Commissioner Vane stated this morning that the disappearances are likely linked to "migratory patterns of the transient population" and strictly advised the public against spreading sensationalist rumors that might incite unrest.
              </p>
              <p className="mb-4">
                "It took him right out of the alley," claims one docker, visibly shaken, his hands trembling as he gestured toward the dense fog blanketing the canal. "No sound, no struggle. Just swallowed by the damp. One moment he was lighting his pipe, the next, the fog just... closed over him. There was a smell, too—like ozone and wet earth."
              </p>
              <p className="mb-4">
                Officials at the Periphery decline to comment on rumors of occult involvement, citing an ongoing municipal investigation into local infrastructure collapse. Whispers among the working class point to phenomena long dismissed by the aristocracy, suggesting that the very stones of Newfaire are waking up to claim their due.
              </p>
              <p className="mb-4">
                Unconfirmed reports from Southward suggest a similar pattern of events occurred exactly a century prior. Historians at the Antiquarian Society were unavailable for comment, though archived journals unearthed by independent researchers note a "culling of the unworthy" during that frozen, blood-stained winter of 1826.
              </p>
              <p className="mb-4">
                In unrelated news, the Briarbank tram line remains closed following yesterday's "structural anomaly." Passengers are advised to seek alternative routes until further notice, as repair crews refuse to descend into the tunnels after dark, citing "unnatural vibrations" emanating from the bedrock itself.
              </p>
              <p className="mb-4">
                The city council has scheduled a emergency hearing for Tuesday to address the plummeting morale. Attendance is mandatory for all district representatives, though several have already fled to their estates in the High Country.
              </p>

              {/* Robust Advertisement Module */}
              <div className="border-2 border-[#2b251e] p-4 text-center shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] break-inside-avoid mt-2 bg-[#d2c7ac]">
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[#2b251e]" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[#2b251e]" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[#2b251e]" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[#2b251e]" />
                
                <h4 className="font-playfair font-black text-lg mb-1 uppercase leading-none mt-1">Dr. West's</h4>
                <h5 className="font-cinzel text-[10px] font-bold mb-3 border-b border-[#2b251e]/40 pb-1 mx-2">Tincture for Hysteria</h5>
                <p className="font-garamond text-xs leading-tight italic opacity-90 px-1">
                  Calms the frayed nerves of the weary traveler. Restores the essential humors of the blood. Erases dreadful visions of the Unseen. Only available at the apothecary of the Periphery. Beware of cheap imitations!
                </p>
              </div>
            </div>
          </div>

         
          {/* PAMPHLET I: NEW CHARACTER (Turn-of-the-Century Victorian Style) */}
          <div
            onClick={() => setStage('CHARACTER_CREATION')}
            className="pamphlet w-[210px] h-[390px] rotate-[-2deg] bottom-[40px] left-[40px] hover:-translate-y-3 hover:-translate-x-2 hover:rotate-[-3deg] z-30 p-2"
          >
            {/* Ornate Inner Border */}
            <div className="w-full h-full border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-center text-[#ddd7cf] bg-[rgb(95,114,103)]">
              
              <div className="w-full text-center border-b border-[#3a3228]/40 pb-2 mb-3">
                <span className="font-mono-data text-base font-bold uppercase tracking-[0.3em] opacity-80">
                  Registry Form
                </span>
                <div className="font-garamond text-2xl italic tracking-wider opacity-90 mt-1">
                  No. CO-102
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
                <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
                  Blank
                </h3>
                <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-4 text-[rgb(212,208,202)]">
                  Intake
                </h3>
                
                {/* Vintage Divider */}
                <div className="flex items-center gap-1 my-2 opacity-70">
                  <div className="w-6 h-[1px] bg-[#3a3228]" />
                  <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
                  <div className="w-6 h-[1px] bg-[#3a3228]" />
                </div>

                <p className="font-garamond text-2xl leading-relaxed italic px-2 mt-4 opacity-90 font-medium">
                  Create your Investigator
                </p>
              </div>

              <div className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center">
                 <span className="font-cinzel text-xl font-bold tracking-widest">Join Today</span>
              </div>
            </div>
          </div>

          {/* PAMPHLET II: GM OPERATIONS — flips to entry form */}
          <div
            className={`absolute w-[220px] h-[380px] rotate-[2deg] top-[100px] right-[200px] z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${!showGMBack ? 'hover:-translate-y-4 hover:translate-x-4 hover:rotate-[4deg] cursor-pointer' : 'cursor-default'}`}
            style={{ perspective: '1200px' }}
            onClick={!showGMBack ? () => setShowGMBack(true) : undefined}
          >
            <div
              className="w-full h-full"
              style={{
                position: 'relative',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: showGMBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* FRONT FACE — matches Blank Intake style */}
              <div
                className="absolute inset-0 border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-center text-[#ddd7cf]"
                style={{
                  backfaceVisibility: 'hidden',
                  backgroundColor: 'rgb(95,114,103)',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E\")",
                  boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(60,80,60,0.4)',
                }}
              >
                <div className="w-full text-center border-b border-[#3a3228]/40 pb-2 mb-3">
                  <span className="font-mono-data text-base font-bold uppercase tracking-[0.3em] opacity-80">Operations Form</span>
                  <div className="font-garamond text-2xl italic tracking-wider opacity-90 mt-1">No. LK-001</div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
                  <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
                    Lightkeeper
                  </h3>
                  <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-4 text-[rgb(212,208,202)]">
                    Access
                  </h3>
                  <div className="flex items-center gap-1 my-2 opacity-70">
                    <div className="w-6 h-[1px] bg-[#3a3228]" />
                    <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
                    <div className="w-6 h-[1px] bg-[#3a3228]" />
                  </div>
                  <p className="font-garamond text-2xl leading-relaxed italic px-2 mt-4 opacity-90 font-medium">
                    Take command of your own circle.
                  </p>
                </div>

                <div className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center">
                  <span className="font-cinzel text-xl font-bold tracking-widest">Light the Way</span>
                </div>
              </div>

              {/* BACK FACE — campaign entry form */}
              <div
                className="absolute inset-0 border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-start text-[#ddd7cf]"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  backgroundColor: 'rgb(95,114,103)',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E\")",
                  boxShadow: '4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(60,80,60,0.4)',
                }}
              >
                <div className="w-full border-b border-[#3a3228]/40 pb-2 mb-4">
                </div>

                <form onSubmit={handleGMEntry} className="flex-1 flex flex-col gap-4 w-full justify-center">
                  <div className="flex flex-col gap-1">
                    <label className="font-cinzel text-[18px] font-bold tracking-widest uppercase text-[#ddd7cf]/70">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={gmCampaignName}
                      onChange={e => setGmCampaignName(e.target.value)}
                      placeholder="e.g. The Fairelands"
                      onClick={e => e.stopPropagation()}
                      className="bg-[#4a5e50]/60 border border-[#3a3228]/70 px-2 py-1.5 font-garamond text-2xl text-[#ddd7cf] placeholder-[#ddd7cf]/35 outline-none focus:border-[#c49d47]/50 w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-cinzel text-[18px] font-bold tracking-widest uppercase text-[#ddd7cf]/70">
                      Entry Cipher
                    </label>
                    <input
                      type="text"
                      value={gmCode}
                      onChange={e => setGmCode(e.target.value)}
                      placeholder="e.g. fairelands-01"
                      onClick={e => e.stopPropagation()}
                      className="bg-[#4a5e50]/60 border border-[#3a3228]/70 px-2 py-1.5 font-garamond text-2xl text-[#ddd7cf] placeholder-[#ddd7cf]/35 outline-none focus:border-[#c49d47]/50 w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!gmCode.trim() || isGmCreating}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 bg-[#3a2810] text-[#c49d47] font-cinzel text-xl font-bold tracking-widest uppercase px-3 py-2 border border-[#c49d47]/30 hover:bg-[#4a3820] hover:border-[#c49d47]/60 transition-colors disabled:opacity-40"
                  >
                    {isGmCreating ? 'Creating...' : 'Enter Operations'}
                  </button>
                  {gmEntryError && (
                    <p className="font-mono text-xs text-red-400/80 text-center mt-1">{gmEntryError}</p>
                  )}
                </form>

                <button
                  onClick={e => { e.stopPropagation(); setShowGMBack(false); }}
                  className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center font-cinzel text-[18px] font-bold tracking-widest opacity-55 hover:opacity-90 transition-opacity"
                >
                  ← Return
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* FOREGROUND ATMOSPHERICS */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-80 z-50 mix-blend-overlay" />

      {/* BOOK OVERLAY */}
      {showBook && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={closeBook}
        >
          <div
            className={`roster-book${isClosingBook ? ' closing' : ''} relative flex`}
            style={{
              width: '90vw', maxWidth: 1100, height: '85vh',
              borderRadius: '4px 12px 12px 4px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.98), 0 0 0 2px rgba(0,0,0,0.9)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Book spine */}
            <div style={{
              width: 28, flexShrink: 0,
              background: 'linear-gradient(to right, #1a0a02, #3a1e08, #2a1205)',
              borderRadius: '4px 0 0 4px',
              boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.6)',
              borderRight: '2px solid rgba(0,0,0,0.8)',
            }} />

            {/* LEFT PAGE: Player Registry */}
            <div className="book-page flex flex-col overflow-hidden" style={{ flex: 1, borderRight: '2px solid rgba(90,58,40,0.25)' }}>
              <div className="px-7 pt-6 pb-3 shrink-0" style={{ borderBottom: '2px solid rgba(90,58,40,0.18)' }}>
                <p className="font-mono-data text-[18px] tracking-[0.4em] text-[#5a3a28]/60 uppercase mb-1">List of Investigators</p>
                <h2 className="font-cinzel text-4xl font-black text-[#8b1a1a]">Player Registry</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-7 py-4 space-y-5">
                {isLoadingBook ? (
                  <p className="font-garamond text-[32px] italic text-[#5a3a28]/50">Retrieving dossiers…</p>
                ) : (
                  <>
                    {/* Active characters */}
                    {characters.filter(c => c.status === 'active').length > 0 && (
                      <div>
                        <p className="font-mono-data text-[18px] tracking-[0.35em] uppercase mb-2 text-emerald-700">Active Campaigns</p>
                        <div className="space-y-1.5">
                          {characters.filter(c => c.status === 'active').map(char => (
                            <button
                              key={char.id}
                              onClick={() => enterAsPlayer(char)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5a3a28]/10 transition-colors text-left group"
                              style={{ border: '1px solid rgba(90,58,40,0.15)' }}
                            >
                              <span className="text-emerald-600 text-xl shrink-0">●</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-garamond font-bold text-xl text-[#2b1a0e] group-hover:text-[#8b1a1a] transition-colors truncate">{char.name}</p>
                                {char.campaign_name && (
                                  <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#5a3a28]/50 truncate">{char.campaign_name}</p>
                                )}
                              </div>
                              <span className="font-mono-data text-base text-emerald-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Enter →</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending characters */}
                    {characters.filter(c => c.status === 'pending').length > 0 && (
                      <div>
                        <p className="font-mono-data text-[18px] tracking-[0.35em] uppercase mb-2 text-[#7a5a18]">Awaiting Lightkeeper Approval</p>
                        <div className="space-y-1.5">
                          {characters.filter(c => c.status === 'pending').map(char => (
                            <div key={char.id} className="flex items-center gap-3 px-3 py-2.5"
                              style={{ border: '1px solid rgba(196,157,71,0.2)', background: 'rgba(196,157,71,0.04)' }}>
                              <span className="text-[#c49d47]/60 text-xl shrink-0">◌</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-garamond font-bold text-xl text-[#2b1a0e]/70 truncate">{char.name}</p>
                                {char.campaign_name && (
                                  <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#5a3a28]/40 truncate">{char.campaign_name}</p>
                                )}
                              </div>
                              <button
                                onClick={refreshBook}
                                disabled={isLoadingBook}
                                className="font-mono-data text-base tracking-[0.2em] uppercase text-[#3b82f6]/60 hover:text-[#3b82f6] transition-colors shrink-0"
                                style={{ border: '1px solid rgba(59,130,246,0.2)', padding: '4px 12px' }}
                              >
                                {isLoadingBook ? '…' : 'Refresh'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unaffiliated characters with inline join form */}
                    {characters.filter(c => c.status === 'unaffiliated').length > 0 && (
                      <div>
                        <p className="font-mono-data text-[18px] tracking-[0.35em] uppercase mb-2 text-[#5a3a28]/50">Unaffiliated Investigators</p>
                        <div className="space-y-2">
                          {characters.filter(c => c.status === 'unaffiliated').map(char => {
                            const form = joinForms[char.id] || {};
                            return (
                              <div key={char.id} style={{ border: '1px solid rgba(90,58,40,0.12)', background: 'rgba(255,255,255,0.015)' }}>
                                <button
                                  onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], expanded: !form.expanded } }))}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5a3a28]/06 transition-colors text-left"
                                >
                                  <span className="text-[#5a3a28]/40 text-xl shrink-0">○</span>
                                  <p className="font-garamond font-bold text-xl text-[#2b1a0e]/50 flex-1 truncate">{char.name}</p>
                                  <span className="font-mono-data text-base text-[#5a3a28]/40">{form.expanded ? '▲' : '▼ Join'}</span>
                                </button>
                                {form.expanded && (
                                  <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(90,58,40,0.1)' }}>
                                    <input
                                      type="text"
                                      value={form.code || ''}
                                      onChange={e => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], code: e.target.value } }))}
                                      placeholder="Campaign Cipher…"
                                      className="w-full bg-white/60 border border-[#5a3a28]/30 px-2 py-1.5 font-garamond text-[28px] text-[#2b1a0e] placeholder-[#5a3a28]/30 outline-none focus:border-[#8b1a1a]/50 mt-2"
                                    />
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], dropdownOpen: !form.dropdownOpen } }))}
                                        className="w-full bg-white/60 border border-[#5a3a28]/30 px-3 py-2 flex items-center justify-between hover:bg-white/80 transition-colors"
                                        style={{ borderColor: form.dropdownOpen ? 'rgba(139,26,26,0.5)' : undefined }}
                                      >
                                        <span className="text-[28px] text-[#2b1a0e]" style={{ fontFamily: form.pen || 'Caveat' }}>
                                          {form.pen || 'Caveat'}
                                        </span>
                                        <span className="text-base text-[#5a3a28]/50 ml-2 shrink-0">{form.dropdownOpen ? '▲' : '▼'}</span>
                                      </button>
                                      {form.dropdownOpen && (
                                        <div className="border border-[#5a3a28]/30 border-t-0 max-h-52 overflow-y-auto"
                                          style={{ background: '#f7f0de' }}>
                                          {PEN_FONTS.map(font => (
                                            <button
                                              key={font}
                                              type="button"
                                              onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], pen: font, dropdownOpen: false } }))}
                                              className="w-full px-3 py-2 text-left hover:bg-[#5a3a28]/12 transition-colors"
                                              style={{
                                                fontFamily: font,
                                                fontSize: '22px',
                                                color: '#2b1a0e',
                                                background: (form.pen || 'Caveat') === font ? 'rgba(90,58,40,0.12)' : undefined,
                                                borderBottom: '1px solid rgba(90,58,40,0.08)',
                                              }}
                                            >
                                              {font}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {form.error && <p className="font-mono-data text-[18px] text-red-700">{form.error}</p>}
                                    <button
                                      onClick={() => handleJoinForChar(char.id)}
                                      disabled={form.loading || !form.code?.trim()}
                                      className="w-full bg-[#8b1a1a] text-[#fdf8f0] font-cinzel text-[18px] font-bold tracking-widest uppercase px-3 py-1.5 hover:bg-[#a82222] transition-colors disabled:opacity-40"
                                    >
                                      {form.loading ? 'Joining…' : 'Join Circle'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {characters.length === 0 && (
                      <p className="font-garamond text-[28px] italic text-[#5a3a28]/40">No investigators Registered.</p>
                    )}
                  </>
                )}
              </div>

              <div className="px-7 py-4 shrink-0" style={{ borderTop: '2px solid rgba(90,58,40,0.12)' }}>
                <button
                  onClick={() => { closeBook(); setStage('CHARACTER_CREATION'); }}
                  className="w-full font-cinzel text-xl font-bold tracking-widest uppercase text-[#8b1a1a] hover:text-[#c42222] transition-colors py-2 hover:bg-[#8b1a1a]/05"
                  style={{ border: '1px solid rgba(139,26,26,0.25)' }}
                >
                  + Register New Investigator
                </button>
              </div>
            </div>

            {/* RIGHT PAGE: Lightkeeper Ledger */}
            <div className="book-page-right flex flex-col overflow-hidden" style={{ flex: 1, borderRadius: '0 12px 12px 0' }}>
              <div className="px-7 pt-6 pb-3 shrink-0 flex items-start justify-between" style={{ borderBottom: '2px solid rgba(60,40,20,0.18)' }}>
                <div>
                  <p className="font-mono-data text-[18px] tracking-[0.4em] text-[#3c2814]/60 uppercase mb-1">List of Campaigns</p>
                  <h2 className="font-cinzel text-4xl font-black text-[#7a5a18]">Lightkeeper Ledger</h2>
                </div>
                <button
                  onClick={closeBook}
                  className="font-mono-data text-xl tracking-[0.3em] uppercase text-[#3c2814]/40 hover:text-[#3c2814] transition-colors mt-1 px-3 py-1"
                  style={{ border: '1px solid rgba(60,40,20,0.2)' }}
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-7 py-4 space-y-5">
                {/* Active GM campaigns */}
                {gmCampaigns.length > 0 && (
                  <div>
                    <p className="font-mono-data text-[18px] tracking-[0.35em] uppercase mb-2 text-[#7a5a18]/70">Active Investigations</p>
                    <div className="space-y-1.5">
                      {gmCampaigns.map(camp => (
                        <button
                          key={camp.id}
                          onClick={() => enterAsGM(camp)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3c2814]/08 transition-colors text-left group"
                          style={{ border: '1px solid rgba(60,40,20,0.15)' }}
                        >
                          <span className="text-[#c49d47]/70 text-xl shrink-0">▶</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-garamond font-bold text-xl text-[#2b1a0e] group-hover:text-[#7a5a18] transition-colors truncate">{camp.name}</p>
                            <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#3c2814]/40 truncate">{camp.campaign_code}</p>
                          </div>
                          <span className="font-mono-data text-base text-[#c49d47]/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {gmCampaigns.length === 0 && !isLoadingBook && (
                  <p className="font-garamond text-[28px] italic text-[#3c2814]/40">No active investigations found.</p>
                )}
              </div>

              {/* Expandable registration form */}
              {showRegisterForm && (
                <div className="px-7 py-4 shrink-0" style={{ borderTop: '1px solid rgba(60,40,20,0.15)', background: 'rgba(60,40,20,0.04)' }}>
                  <form onSubmit={async (e) => { await handleCreateCampaign(e); if (!createError) setShowRegisterForm(false); }} className="space-y-3">
                    <div>
                      <label className="font-cinzel text-base font-bold tracking-widest uppercase text-[#3c2814]/50 block mb-1">Investigation Name</label>
                      <input type="text" value={newCampName} onChange={e => setNewCampName(e.target.value)}
                        placeholder="e.g. The Fairelands"
                        className="w-full bg-white/50 border border-[#3c2814]/25 px-3 py-2 font-garamond text-[28px] text-[#2b1a0e] placeholder-[#3c2814]/30 outline-none focus:border-[#7a5a18]/50" />
                    </div>
                    <div>
                      <label className="font-cinzel text-base font-bold tracking-widest uppercase text-[#3c2814]/50 block mb-1">Access Cipher</label>
                      <input type="text" value={newCampCode} onChange={e => setNewCampCode(e.target.value)}
                        placeholder="e.g. fairelands-01"
                        className="w-full bg-white/50 border border-[#3c2814]/25 px-3 py-2 font-garamond text-[28px] text-[#2b1a0e] placeholder-[#3c2814]/30 outline-none focus:border-[#7a5a18]/50" />
                    </div>
                    {createError && <p className="font-mono-data text-[18px] text-red-700">{createError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={isCreating || !newCampName.trim() || !newCampCode.trim()}
                        className="flex-1 bg-[#3c2814] text-[#c49d47] font-cinzel text-[18px] font-bold tracking-widest uppercase px-3 py-2 hover:bg-[#5a3a1a] transition-colors disabled:opacity-40"
                        style={{ border: '1px solid rgba(196,157,71,0.3)' }}>
                        {isCreating ? 'Registering…' : 'Confirm Registration'}
                      </button>
                      <button type="button" onClick={() => setShowRegisterForm(false)}
                        className="px-4 py-2 font-cinzel text-base tracking-widest uppercase text-[#3c2814]/50 hover:text-[#3c2814] transition-colors"
                        style={{ border: '1px solid rgba(60,40,20,0.2)' }}>
                        ✕
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="px-7 py-4 shrink-0" style={{ borderTop: '2px solid rgba(60,40,20,0.12)' }}>
                <button
                  onClick={() => setShowRegisterForm(r => !r)}
                  className="w-full font-cinzel text-xl font-bold tracking-widest uppercase text-[#7a5a18] hover:text-[#a07830] transition-colors py-2 hover:bg-[#7a5a18]/05"
                  style={{ border: '1px solid rgba(122,90,24,0.25)' }}
                >
                  {showRegisterForm ? '− Collapse Form' : '+ Register Investigation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};